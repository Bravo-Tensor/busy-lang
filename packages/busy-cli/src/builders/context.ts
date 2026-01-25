import { Repo, ContextPayload, Section, LocalDef, Operation, ConceptBase } from '../types/schema.js';
import { debug, warn } from '../utils/logger.js';

export interface BuildOpts {
  includeChildren?: boolean;
  maxDefChars?: number;
}

/**
 * Build minimal execution context for an operation
 */
export function buildContext(
  repo: Repo,
  opRef: string,
  opts: BuildOpts = {}
): ContextPayload {
  debug.context('Building context for operation: %s', opRef);

  const { includeChildren = false, maxDefChars } = opts;

  // 1. Seed: resolve opRef to a Section or Operation
  const opNode = repo.byId[opRef] as Section | Operation | undefined;

  if (!opNode || (opNode.kind !== 'section' && opNode.kind !== 'operation')) {
    throw new Error(`Operation not found: ${opRef}`);
  }

  // Get the full Operation object
  let operation: Operation;
  if (opNode.kind === 'operation') {
    operation = opNode;
  } else {
    // If it's a section, we need to find the operation or throw
    throw new Error(`Expected operation but got section: ${opRef}`);
  }

  // 2. Collect outgoing edges from the operation section
  const edges = repo.edges.filter((edge) => {
    if (edge.from === opNode.id) {
      return true;
    }

    // Optionally include edges from child sections
    if (includeChildren) {
      return edge.from.startsWith(`${opNode.docId}#`);
    }

    return false;
  });

  debug.context('Found %d outgoing edges', edges.length);

  // 3. Calls (just array of concept IDs)
  const calls: string[] = [];

  for (const edge of edges) {
    if (edge.role === 'calls') {
      calls.push(edge.to);
    }
  }

  debug.context('Found %d calls', calls.length);

  // 4. Symbols
  // Get the document's import symbol table
  const fileInfo = repo.byFile[opNode.docId];
  const docImports = repo.imports.filter((imp) => imp.docId === opNode.docId);

  const symbols: Record<string, { docId?: string; slug?: string }> = {};

  for (const imp of docImports) {
    if (imp.resolved) {
      // Parse ConceptId string back to { docId, slug }
      const parts = imp.resolved.split('#');
      symbols[imp.label] = {
        docId: parts[0],
        slug: parts[1],
      };
    }
  }

  const payload: ContextPayload = {
    operation,
    calls,
    symbols,
  };

  debug.context('Context built successfully');

  return payload;
}

/**
 * Trim content to max characters, preserving structure
 */
function trimContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  // Try to preserve headings and code fences
  const lines = content.split('\n');
  let result = '';
  let charCount = 0;

  for (const line of lines) {
    if (charCount + line.length > maxChars) {
      result += '\n\n[... trimmed ...]';
      break;
    }

    result += line + '\n';
    charCount += line.length + 1;
  }

  return result.trim();
}

/**
 * Lookup helpers
 */
export function get(
  repo: Repo,
  ref: string
): Section | LocalDef | Operation | ConceptBase | undefined {
  return repo.byId[ref];
}

export function parentsOf(repo: Repo, nameOrRef: string): string[] {
  const edges = repo.edges.filter(
    (edge) => edge.from === nameOrRef && edge.role === 'extends'
  );
  return edges.map((edge) => edge.to);
}

export function childrenOf(repo: Repo, nameOrRef: string): string[] {
  const edges = repo.edges.filter(
    (edge) => edge.to === nameOrRef && edge.role === 'extends'
  );
  return edges.map((edge) => edge.from);
}

/**
 * Context for a specific concept
 */
export interface ConceptContext {
  concept: Section | LocalDef | Operation | ConceptBase;
  // Outgoing edges grouped by role
  calls: string[];        // concepts this concept calls
  extends: string[];      // concepts this concept extends
  imports: string[];      // concepts this concept imports
  refs: string[];         // concepts this concept references
  // Incoming edges grouped by role
  calledBy: string[];     // concepts that call this concept
  extendedBy: string[];   // concepts that extend this concept
  importedBy: string[];   // concepts that import this concept
  referencedBy: string[]; // concepts that reference this concept
  // All edges for advanced usage
  allEdges: {
    outgoing: Array<{ to: string; role: string }>;
    incoming: Array<{ from: string; role: string }>;
  };
  // Content dictionary for imported and referenced concepts
  contentMap: Record<string, string>; // conceptId -> content
}

/**
 * Get comprehensive context for any concept by ID
 * Returns all relationships (calls, extends, imports, refs) both outgoing and incoming
 */
export function getConceptContext(
  repo: Repo,
  conceptId: string
): ConceptContext {
  debug.context('Building concept context for: %s', conceptId);

  // 1. Get the concept
  const concept = repo.byId[conceptId];
  if (!concept) {
    throw new Error(`Concept not found: ${conceptId}`);
  }

  // 2. Get all outgoing edges
  // For operations and localdefs, also include edges from their parent section and document
  let edgeSources = [conceptId];

  if (concept.kind === 'operation' || concept.kind === 'localdef') {
    // Add the section
    if ('sectionRef' in concept && concept.sectionRef) {
      edgeSources.push(concept.sectionRef);
    }
    // Add the document
    if ('docId' in concept && concept.docId) {
      edgeSources.push(concept.docId);
    }
  }

  const outgoingEdges = repo.edges.filter((edge) => edgeSources.includes(edge.from));

  // 3. Get all incoming edges
  const incomingEdges = repo.edges.filter((edge) => edge.to === conceptId);

  // 4. Group outgoing edges by role
  const calls = outgoingEdges
    .filter((e) => e.role === 'calls')
    .map((e) => e.to);

  const extendsEdges = outgoingEdges
    .filter((e) => e.role === 'extends')
    .map((e) => e.to);

  const importsEdges = outgoingEdges
    .filter((e) => e.role === 'imports')
    .map((e) => e.to);

  const refs = outgoingEdges
    .filter((e) => e.role === 'ref')
    .map((e) => e.to);

  // 5. Group incoming edges by role
  const calledBy = incomingEdges
    .filter((e) => e.role === 'calls')
    .map((e) => e.from);

  const extendedBy = incomingEdges
    .filter((e) => e.role === 'extends')
    .map((e) => e.from);

  const importedBy = incomingEdges
    .filter((e) => e.role === 'imports')
    .map((e) => e.from);

  const referencedBy = incomingEdges
    .filter((e) => e.role === 'ref')
    .map((e) => e.from);

  debug.context(
    'Found: %d calls, %d extends, %d imports, %d refs (outgoing)',
    calls.length,
    extendsEdges.length,
    importsEdges.length,
    refs.length
  );

  debug.context(
    'Found: %d calledBy, %d extendedBy, %d importedBy, %d referencedBy (incoming)',
    calledBy.length,
    extendedBy.length,
    importedBy.length,
    referencedBy.length
  );

  // 6. Build content map for imports and refs
  const contentMap: Record<string, string> = {};
  const contentConceptIds = new Set([...importsEdges, ...refs]);

  for (const id of contentConceptIds) {
    const relatedConcept = repo.byId[id];
    if (relatedConcept && 'content' in relatedConcept) {
      contentMap[id] = relatedConcept.content;
    }
  }

  debug.context('Built content map with %d entries', Object.keys(contentMap).length);

  return {
    concept,
    calls,
    extends: extendsEdges,
    imports: importsEdges,
    refs,
    calledBy,
    extendedBy,
    importedBy,
    referencedBy,
    allEdges: {
      outgoing: outgoingEdges.map((e) => ({ to: e.to, role: e.role })),
      incoming: incomingEdges.map((e) => ({ from: e.from, role: e.role })),
    },
    contentMap,
  };
}

/**
 * Write context to JSON file
 */
export async function writeContext(
  file: string,
  ctx: ContextPayload
): Promise<void> {
  const { writeFile } = await import('fs/promises');
  await writeFile(file, JSON.stringify(ctx, null, 2), 'utf-8');
  debug.context('Context written to %s', file);
}
