import { readFile } from 'fs/promises';
import fg from 'fast-glob';
import path from 'path';
import {
  Repo,
  BusyDocument,
  ConceptBase,
  LocalDef,
  Operation,
  ImportDef,
  Edge,
  Section,
} from './types/schema.js';
import { parseFrontMatter } from './parsers/frontmatter.js';
import { parseSections, getAllSections } from './parsers/sections.js';
import { extractLocalDefs } from './parsers/localdefs.js';
import { extractOperations } from './parsers/operations.js';
import { extractImports, resolveImportTarget } from './parsers/imports.js';
import { extractLinksFromSection } from './parsers/links.js';
import { debug, warn } from './utils/logger.js';

/**
 * Load and index a workspace from glob patterns
 */
export async function loadRepo(globs: string[]): Promise<Repo> {
  debug.parser('Loading repo from globs: %o', globs);

  // Find all markdown files
  const files = await fg(globs, {
    absolute: true,
    onlyFiles: true,
  });

  debug.parser('Found %d files', files.length);

  // Sort files for determinism
  files.sort();

  // Build file map for resolution
  const fileMap = new Map<string, { docId: string; path: string }>();

  // First pass: parse frontmatter to build file map
  const fileContents = new Map<string, string>();

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8');
    fileContents.set(filePath, content);

    const { docId } = parseFrontMatter(content, filePath);

    // Store multiple variants for resolution:
    // - Full basename: "document.busy.md"
    // - Without .busy: "document.md" (for imports that reference old extension)
    // - Just name: "document"
    const basename = path.basename(filePath);
    const withoutBusy = basename.replace('.busy.md', '.md');
    const nameOnly = basename.replace(/\.busy\.md$/, '').replace(/\.md$/, '');

    fileMap.set(basename, { docId, path: filePath });
    if (withoutBusy !== basename) {
      fileMap.set(withoutBusy, { docId, path: filePath });
    }
    fileMap.set(nameOnly, { docId, path: filePath });
  }

  // Second pass: parse documents
  const docs: BusyDocument[] = [];
  const allLocaldefs = new Map<string, LocalDef>();
  const allOperations = new Map<string, Operation>();
  const allImports: ImportDef[] = [];
  const allEdges: Edge[] = [];
  const allSections = new Map<string, Section>();

  for (const filePath of files) {
    const content = fileContents.get(filePath)!;

    // Parse frontmatter
    const { frontmatter, content: mdContent, docId, kind, types, extends: extends_ } =
      parseFrontMatter(content, filePath);

    // Count lines
    const lines = content.split('\n');
    const lineStart = 1;
    const lineEnd = lines.length;

    // Parse sections
    const sections = parseSections(mdContent, docId, filePath);

    // Create document
    const doc: BusyDocument = {
      kind: 'document', // All top-level files are documents
      id: docId,
      docId,
      slug: docId.toLowerCase(),
      name: frontmatter.Name,
      description: frontmatter.Description,
      types,
      extends: extends_,
      tags: frontmatter.Tags ?? [],
      attrs: frontmatter as Record<string, unknown>,
      path: filePath,
      lineStart,
      lineEnd,
      sections,
    };

    docs.push(doc);

    // Index all sections
    for (const section of getAllSections(sections)) {
      allSections.set(section.id, section);
    }

    // Extract local definitions
    const localdefs = extractLocalDefs(sections, docId, filePath);
    for (const localdef of localdefs) {
      allLocaldefs.set(localdef.id, localdef);
    }

    // Extract operations
    const operations = extractOperations(sections, docId, filePath);
    for (const operation of operations) {
      allOperations.set(operation.id, operation);
    }

    // Extract imports
    const { imports, symbols } = extractImports(content, docId);

    // Resolve imports
    for (const importDef of imports) {
      const resolved = resolveImportTarget(importDef.target, docId, fileMap);
      importDef.resolved = resolved;

      // Update symbol table
      if (symbols[importDef.label]) {
        symbols[importDef.label] = resolved;
      }

      // Create import edge
      if (resolved.docId) {
        const targetId = resolved.slug
          ? `${resolved.docId}#${resolved.slug}`
          : resolved.docId;

        allEdges.push({
          from: docId,
          to: targetId,
          role: 'imports',
        });
      }

      allImports.push(importDef);
    }

    // Extract links and create edges
    for (const section of getAllSections(sections)) {
      const linkEdges = extractLinksFromSection(
        section,
        section.content,
        symbols,
        fileMap
      );
      allEdges.push(...linkEdges);
    }

    // Create extends edges for local definitions
    for (const localdef of localdefs) {
      for (const parent of localdef.extends) {
        const resolvedParent = resolveSymbol(parent, docId, allLocaldefs, docs, symbols);
        if (resolvedParent) {
          allEdges.push({
            from: localdef.id,
            to: resolvedParent,
            role: 'extends',
          });
        } else {
          warn(`Unresolved extends: ${parent} in ${localdef.id}`, {
            file: filePath,
            line: localdef.lineStart,
          });
        }
      }
    }
  }

  // Inherit operations from parent documents
  inheritOperations(docs, allOperations);

  // Build concepts array (includes all documents)
  const concepts: ConceptBase[] = docs.map((doc) => ({
    kind: doc.kind,
    id: doc.id,
    docId: doc.docId,
    slug: doc.slug,
    name: doc.name,
    description: doc.description,
    types: doc.types,
    extends: doc.extends,
    tags: doc.tags,
    attrs: doc.attrs,
    path: doc.path,
    lineStart: doc.lineStart,
    lineEnd: doc.lineEnd,
  }));

  // Build byId index
  const byId: Record<string, Section | LocalDef | Operation | ConceptBase> = {};

  for (const doc of docs) {
    byId[doc.id] = doc;
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

  // Build byDoc index
  const byDoc: Record<string, { doc: BusyDocument; bySlug: Record<string, Section> }> = {};

  for (const doc of docs) {
    const bySlug: Record<string, Section> = {};

    for (const section of getAllSections(doc.sections)) {
      bySlug[section.slug] = section;
    }

    byDoc[doc.docId] = { doc, bySlug };
  }

  const repo: Repo = {
    docs,
    concepts,
    localdefs: Object.fromEntries(allLocaldefs),
    operations: Object.fromEntries(allOperations),
    imports: allImports,
    byId,
    byDoc,
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
  docs: BusyDocument[],
  allOperations: Map<string, Operation>
): void {
  // Build doc lookup by name
  const docByName = new Map<string, BusyDocument>();
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
              id: `${doc.docId}#${op.slug}`,
              docId: doc.docId,
              path: doc.path,
            };
            allOperations.set(inheritedOp.id, inheritedOp);
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
  docs: BusyDocument[],
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
