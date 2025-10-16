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
