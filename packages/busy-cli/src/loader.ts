import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { parseSource } from './parser.js';
import { getAllSections } from './parsers/sections.js';
import { extractLinksFromSection } from './parsers/links.js';
import { resolveImportTarget } from './parsers/imports.js';
import { debug } from './utils/logger.js';
import type { ParsedDocument, BusyDocument, Playbook, View, Config, ConceptBase, Repo, Section, File, LocalDef, Operation, ImportDef, Edge } from './types/schema.js';
type AnyDocument = ParsedDocument;

/** Index canonical parsed documents; no independent document lowering occurs here. */
export async function loadRepo(globs: string[]): Promise<Repo> {
  const paths = (await fg(globs, { absolute: true, onlyFiles: true })).sort();
  const sources = await Promise.all(paths.map(async filePath => ({ filePath, ...parseSource(await readFile(filePath, 'utf8'), filePath) })));
  const fileMap = new Map<string, { docId: string; path: string }>();
  for (const { filePath, document } of sources) {
    fileMap.set(filePath, { docId: document.docId, path: filePath });
    fileMap.set(path.basename(filePath), { docId: document.docId, path: filePath });
    fileMap.set(path.basename(filePath).replace(/\.busy\.md$/, ''), { docId: document.docId, path: filePath });
  }
  const docs: AnyDocument[] = sources.map(source => source.document);
  const files: File[] = [];
  const allSections = new Map<string, Section>();
  const allOperations = new Map<string, Operation>();
  const allLocaldefs = new Map<string, LocalDef>();
  const allImports: ImportDef[] = [];
  const allEdges: Edge[] = [];
  const docParts = new Map<string, { sections: Section[] }>();
  for (const { filePath, document: doc, markdown, sections } of sources) {
    files.push({ docId: doc.docId, name: doc.name, path: filePath, sections });
    docParts.set(doc.docId, { sections });
    for (const section of getAllSections(sections)) allSections.set(section.id, section);
    for (const op of doc.operations) allOperations.set(op.id, op);
    for (const def of doc.localdefs) allLocaldefs.set(def.id, def);
    const symbols: Record<string, { docId?: string; slug?: string }> = {};
    for (const imp of doc.imports) {
      const resolved = resolveImportTarget(imp.target, fileMap);
      symbols[imp.label] = resolved;
      if (resolved.docId) {
        imp.resolved = resolved.slug ? `${resolved.docId}#${resolved.slug}` : resolved.docId;
        allEdges.push({ from: doc.docId, to: imp.resolved, role: 'imports' });
      }
      allImports.push(imp);
    }
    for (const section of getAllSections(sections)) allEdges.push(...extractLinksFromSection(section, section.content, symbols, fileMap, markdown));
    for (const def of doc.localdefs) for (const parent of def.extends) {
      const resolved = resolveSymbol(parent, doc.docId, allLocaldefs, docs, symbols);
      if (resolved) allEdges.push({ from: def.id, to: resolved, role: 'extends' });
    }
  }
  // Inherit operations from parent documents
  inheritOperations(docs, allOperations);

  // Build concepts array (includes all documents as ConceptBase)
  const concepts: ConceptBase[] = docs.map((doc) => ({
    kind: doc.kind,
    id: doc.id,
    docId: doc.docId,
    slug: doc.slug,
    name: doc.name,
    content: doc.content,
    types: doc.types,
    extends: doc.extends,
    sectionRef: doc.sectionRef,
    children: [], // ConceptBase has children for hierarchy
  }));

  // Build byId index
  const byId: Record<string, Section | LocalDef | Operation | ConceptBase> = {};

  for (const concept of concepts) {
    byId[concept.id] = concept;
  }

  for (const [id, section] of allSections) {
    byId[id] = section;
  }

  for (const [id, localdef] of allLocaldefs) {
    byId[id] = localdef;
  }

  for (const [id, operation] of allOperations) {
    byId[id] = operation;
  }

  // Reclassify edges based on target type
  // Links to operations should be 'calls', links to defs/concepts should be 'ref'
  for (const edge of allEdges) {
    if (edge.role === 'ref') {
      const target = byId[edge.to];
      if (target && target.kind === 'operation') {
        edge.role = 'calls';
      }
    }
  }

  // Build byFile index
  const byFile: Record<string, { concept: AnyDocument; bySlug: Record<string, Section> }> = {};

  for (const doc of docs) {
    const bySlug: Record<string, Section> = {};
    const parts = docParts.get(doc.docId);

    if (parts) {
      for (const section of getAllSections(parts.sections)) {
        bySlug[section.slug] = section;
      }
    }

    byFile[doc.docId] = { concept: doc, bySlug };
  }

  const repo: Repo = {
    files,
    concepts,
    localdefs: Object.fromEntries(allLocaldefs),
    operations: Object.fromEntries(allOperations),
    imports: allImports,
    byId,
    byFile,
    edges: allEdges,
  };

  debug.parser(
    'Loaded repo: %d docs, %d concepts, %d localdefs, %d operations, %d imports, %d edges',
    docs.length,
    concepts.length,
    allLocaldefs.size,
    allOperations.size,
    allImports.length,
    allEdges.length
  );

  return repo;
}

/**
 * Inherit operations from parent documents
 * Inherits from:
 * 1. Documents in the 'extends' array (explicit extension)
 * 2. Documents in the 'types' array (implicit type-based inheritance)
 */
function inheritOperations(
  docs: AnyDocument[],
  allOperations: Map<string, Operation>
): void {
  // Build doc lookup by name
  const docByName = new Map<string, ParsedDocument>();
  for (const doc of docs) {
    docByName.set(doc.name, doc);
  }

  // Process each document
  for (const doc of docs) {
    // Collect parent names from both extends and types
    const parentNames = [...doc.extends, ...doc.types];

    if (parentNames.length === 0) continue;

    // Get operations currently in this document
    const existingOps = new Set<string>();
    for (const [id, op] of allOperations) {
      if (op.docId === doc.docId) {
        existingOps.add(op.slug);
      }
    }

    // Inherit from parent documents
    for (const parentName of parentNames) {
      const parentDoc = docByName.get(parentName);
      if (!parentDoc) {
        debug.parser('Parent document not found: %s', parentName);
        continue;
      }

      // Find all operations in parent document
      for (const [id, op] of allOperations) {
        if (op.docId === parentDoc.docId) {
          // If operation not overridden in child, inherit it
          if (!existingOps.has(op.slug)) {
            const inheritedOp: Operation = {
              ...op,
              id: `${doc.docId}::${op.slug}`, // Use :: for concept IDs
              docId: doc.docId,
            };
            allOperations.set(inheritedOp.id, inheritedOp);
            doc.operations.push(inheritedOp);
            existingOps.add(op.slug);
            debug.parser(
              'Inherited operation %s from %s to %s',
              op.name,
              parentDoc.name,
              doc.name
            );
          }
        }
      }
    }
  }
}

/**
 * Resolve a symbol (name or label) to a node ID
 */
function resolveSymbol(
  nameOrLabel: string,
  currentDocId: string,
  localdefs: Map<string, LocalDef>,
  docs: AnyDocument[],
  symbols: Record<string, { docId?: string; slug?: string }>
): string | undefined {
  // 1. Check for LocalDef in same doc
  const localdefId = `${currentDocId}::${nameOrLabel.toLowerCase()}`;
  if (localdefs.has(localdefId)) {
    return localdefId;
  }

  // 2. Check for Concept/Doc by Name
  const doc = docs.find((d) => d.name === nameOrLabel);
  if (doc) {
    return doc.docId;
  }

  // 3. Check import symbol table
  const symbol = symbols[nameOrLabel];
  if (symbol?.docId) {
    return symbol.slug ? `${symbol.docId}#${symbol.slug}` : symbol.docId;
  }

  return undefined;
}

/**
 * Get the full content of a section including all nested children.
 * Reconstructs the original markdown by walking the section tree.
 */
