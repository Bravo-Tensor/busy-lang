import { readFile } from 'fs/promises';
import fg from 'fast-glob';
import path from 'path';
import {
  Repo,
  BusyDocument,
  Playbook,
  ConceptBase,
  LocalDef,
  Operation,
  ImportDef,
  Edge,
  Section,
  File,
} from './types/schema.js';
import { parseFrontMatter } from './parsers/frontmatter.js';
import { parseSections, getAllSections, findSection } from './parsers/sections.js';
import { extractLocalDefs } from './parsers/localdefs.js';
import { extractOperations } from './parsers/operations.js';
import { extractImports, legacyResolveImportTarget } from './parsers/imports.js';
import { extractLinksFromSection } from './parsers/links.js';
import { debug, warn } from './utils/logger.js';

/**
 * Load and index a workspace from glob patterns
 */
export async function loadRepo(globs: string[]): Promise<Repo> {
  debug.parser('Loading repo from globs: %o', globs);

  // Find all markdown files
  const filePaths = await fg(globs, {
    absolute: true,
    onlyFiles: true,
  });

  debug.parser('Found %d files', filePaths.length);

  // Sort files for determinism
  filePaths.sort();

  // Build file map for resolution
  const fileMap = new Map<string, { docId: string; path: string }>();

  // First pass: parse frontmatter to build file map
  const fileContents = new Map<string, string>();

  for (const filePath of filePaths) {
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
  const files: File[] = []; // Lightweight file representations
  const docs: (BusyDocument | Playbook)[] = []; // Full concept definitions
  const allLocaldefs = new Map<string, LocalDef>();
  const allOperations = new Map<string, Operation>();
  const allImports: ImportDef[] = [];
  const allEdges: Edge[] = [];
  const allSections = new Map<string, Section>();

  // Store document parts temporarily before building final docs
  const docParts = new Map<string, {
    filePath: string;
    content: string;
    frontmatter: any;
    docId: string;
    types: string[];
    extends: string[];
    sections: Section[];
    localdefs: LocalDef[];
    operations: Operation[];
    setup: any;
    imports: ImportDef[];
    symbols: Record<string, { docId?: string; slug?: string }>;
  }>();

  for (const filePath of filePaths) {
    const content = fileContents.get(filePath)!;

    // Parse frontmatter
    const { frontmatter, content: mdContent, docId, kind, types, extends: extends_ } =
      parseFrontMatter(content, filePath);

    // Parse sections
    const sections = parseSections(mdContent, docId, filePath);

    // Create file representation (lightweight - just sections)
    files.push({
      docId,
      path: filePath,
      name: frontmatter.Name,
      sections,
    });

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

    // Extract setup (if present)
    const setupSection = findSection(sections, 'setup');
    const setup = setupSection ? {
      kind: 'setup' as const,
      id: `${docId}::setup`, // Use :: for concept IDs
      docId,
      slug: 'setup',
      name: 'Setup',
      content: setupSection.content,
      types: [],
      extends: [],
      sectionRef: setupSection.id, // sectionRef uses # for section references
    } : undefined;

    // Extract imports
    const { imports, symbols } = extractImports(content, docId);

    // Store document parts
    docParts.set(docId, {
      filePath,
      content,
      frontmatter,
      docId,
      types,
      extends: extends_,
      sections,
      localdefs,
      operations,
      setup,
      imports,
      symbols,
    });

    // Resolve imports
    for (const importDef of imports) {
      const resolved = legacyResolveImportTarget(importDef.target, docId, fileMap);

      // Store resolved as ConceptId (string) per schema
      if (resolved.docId) {
        const resolvedId = resolved.slug
          ? `${resolved.docId}#${resolved.slug}`
          : resolved.docId;
        importDef.resolved = resolvedId;

        // Create import edge
        allEdges.push({
          from: docId,
          to: resolvedId,
          role: 'imports',
        });
      }

      // Update symbol table (keeps object format for easy lookup)
      if (symbols[importDef.label]) {
        symbols[importDef.label] = resolved;
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
          warn(`Unresolved extends: ${parent} in ${localdef.id}`);
        }
      }
    }
  }

  // Build final document structures with inline arrays
  for (const [docId, parts] of docParts) {
    const isPlaybook = parts.types.some((t) => t.toLowerCase() === 'playbook');

    if (isPlaybook) {
      // Extract sequence from ExecutePlaybook operation
      const sequence = extractPlaybookSequence(parts.sections);

      const doc: Playbook = {
        kind: 'playbook',
        id: parts.docId,
        docId: parts.docId,
        slug: parts.docId.toLowerCase(),
        name: parts.frontmatter.Name,
        content: parts.content,
        types: parts.types,
        extends: parts.extends,
        sectionRef: `${parts.docId}#`, // Root reference
        imports: parts.imports,
        localdefs: parts.localdefs,
        setup: parts.setup!,
        operations: parts.operations,
        sequence,
      };
      docs.push(doc);
    } else {
      const doc: BusyDocument = {
        kind: 'document',
        id: parts.docId,
        docId: parts.docId,
        slug: parts.docId.toLowerCase(),
        name: parts.frontmatter.Name,
        content: parts.content,
        types: parts.types,
        extends: parts.extends,
        sectionRef: `${parts.docId}#`, // Root reference
        imports: parts.imports,
        localdefs: parts.localdefs,
        setup: parts.setup!,
        operations: parts.operations,
      };
      docs.push(doc);
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
  const byFile: Record<string, { concept: BusyDocument | Playbook; bySlug: Record<string, Section> }> = {};

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
  docs: (BusyDocument | Playbook)[],
  allOperations: Map<string, Operation>
): void {
  // Build doc lookup by name
  const docByName = new Map<string, BusyDocument | Playbook>();
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
  docs: (BusyDocument | Playbook)[],
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
 * Extract sequence of operations from a playbook's ExecutePlaybook operation
 * Looks for sections with "Step" in the title and extracts Target metadata
 */
function extractPlaybookSequence(sections: Section[]): string[] {
  const sequence: string[] = [];

  // Find ExecutePlaybook operation in the Operations section
  const allSecs = getAllSections(sections);
  const executePlaybook = allSecs.find(
    (sec) => sec.title.toLowerCase() === 'executeplaybook'
  );

  if (!executePlaybook) {
    return sequence;
  }

  // Look for child sections that are steps (contain "step" in title, case-insensitive)
  for (const child of executePlaybook.children) {
    if (child.title.toLowerCase().includes('step')) {
      // Extract Target field from content
      // Pattern: - **Target:** `OperationName`
      const targetMatch = child.content.match(/^\s*-\s*\*\*Target:\*\*\s*`([^`]+)`/m);
      if (targetMatch) {
        sequence.push(targetMatch[1]);
        debug.parser('Found playbook sequence step: %s -> %s', child.title, targetMatch[1]);
      }
    }
  }

  return sequence;
}
