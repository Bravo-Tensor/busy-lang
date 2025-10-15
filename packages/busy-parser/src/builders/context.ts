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

  const operation = {
    ref: opRef,
    title: opNode.kind === 'operation' ? opNode.name : opNode.title,
    content: opNode.content,
    attrs: opNode.attrs,
    ...(opNode.kind === 'operation' && {
      steps: opNode.steps,
      checklist: opNode.checklist,
    }),
  };

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

  // 3. Defs closure
  const includedDefIds = new Set<string>();
  const defsToProcess: string[] = [];

  // Find all LocalDef refs
  for (const edge of edges) {
    if (edge.role === 'ref') {
      const target = repo.byId[edge.to];
      if (target && target.kind === 'localdef') {
        includedDefIds.add(target.id);
        defsToProcess.push(target.id);
      }
    }
  }

  // Traverse extends edges transitively
  while (defsToProcess.length > 0) {
    const defId = defsToProcess.pop()!;
    const def = repo.localdefs[defId];

    if (!def) continue;

    // Find extends edges from this def
    const extendsEdges = repo.edges.filter(
      (edge) => edge.from === defId && edge.role === 'extends'
    );

    for (const edge of extendsEdges) {
      if (!includedDefIds.has(edge.to)) {
        includedDefIds.add(edge.to);
        defsToProcess.push(edge.to);
      }
    }
  }

  // Build defs array with topological order (parents before children)
  const defsArray: Array<Pick<LocalDef, 'id' | 'name' | 'content' | 'extends'>> = [];
  const processed = new Set<string>();

  function addDefWithParents(defId: string) {
    if (processed.has(defId)) return;

    const def = repo.localdefs[defId];
    if (!def) return;

    // Add parents first
    const extendsEdges = repo.edges.filter(
      (edge) => edge.from === defId && edge.role === 'extends'
    );

    for (const edge of extendsEdges) {
      addDefWithParents(edge.to);
    }

    // Add this def
    let content = def.content;

    if (maxDefChars && content.length > maxDefChars) {
      content = trimContent(content, maxDefChars);
    }

    defsArray.push({
      id: def.id,
      name: def.name,
      content,
      extends: def.extends,
    });

    processed.add(defId);
  }

  for (const defId of includedDefIds) {
    addDefWithParents(defId);
  }

  debug.context('Included %d definitions', defsArray.length);

  // 4. Calls
  const calls: Array<{ ref: string; title?: string }> = [];

  for (const edge of edges) {
    if (edge.role === 'calls') {
      const target = repo.byId[edge.to];
      if (target) {
        // Accept both sections and operations as call targets
        const title = target.kind === 'operation' ? target.name :
                      target.kind === 'section' ? target.title : undefined;
        calls.push({
          ref: edge.to,
          title,
        });
      }
    }
  }

  debug.context('Found %d calls', calls.length);

  // 5. Symbols
  // Get the document's import symbol table
  const docInfo = repo.byDoc[opNode.docId];
  const docImports = repo.imports.filter((imp) => imp.docId === opNode.docId);

  const symbols: Record<string, { docId?: string; slug?: string }> = {};

  for (const imp of docImports) {
    if (imp.resolved) {
      symbols[imp.label] = imp.resolved;
    }
  }

  const payload: ContextPayload = {
    operation,
    defs: defsArray,
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
