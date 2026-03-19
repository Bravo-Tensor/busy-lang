import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadRepo } from '../loader.js';
import type { EdgeRole, Repo } from '../types/schema.js';

export type GraphFormat = 'json' | 'tree' | 'dot';

export interface GraphNode {
  id: string;
  docId: string;
  type: string;
  kind: string;
  name: string;
  path: string;
  imports: number;
  importedBy: number;
  orphan: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  role: EdgeRole;
}

export interface MostImportedNode {
  id: string;
  name: string;
  count: number;
}

export interface GraphStats {
  documents: number;
  edges: number;
  importEdges: number;
  types: Record<string, number>;
  kinds: Record<string, number>;
  orphans: number;
  mostImported: MostImportedNode[];
  circularImports: string[][];
}

export interface WorkspaceGraph {
  workspace: string;
  root: string;
  stats: GraphStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function loadWorkspaceGraph(
  workspaceRoot: string,
  filter?: string
): Promise<WorkspaceGraph> {
  const globs = [path.join(workspaceRoot, '**/*.busy.md')];
  const librariesRoot = path.join(workspaceRoot, '.libraries');

  if (existsSync(librariesRoot)) {
    globs.push(path.join(librariesRoot, '**/*.busy.md'));
  }

  const repo = await loadRepo(globs);
  return buildWorkspaceGraph(repo, workspaceRoot, filter);
}

export function buildWorkspaceGraph(
  repo: Repo,
  workspaceRoot: string,
  filter?: string
): WorkspaceGraph {
  const workspace = path.basename(path.resolve(workspaceRoot));
  const nodeEntries = repo.files.map((file) => {
    const concept = repo.byFile[file.docId]?.concept;
    if (!concept) {
      throw new Error(`Missing concept for file ${file.docId}`);
    }

    const relPath = toPosix(path.relative(workspaceRoot, file.path));
    const node: GraphNode = {
      id: stripBusyExtension(relPath),
      docId: file.docId,
      type: getDisplayType(concept.kind, concept.types),
      kind: concept.kind,
      name: concept.name,
      path: relPath,
      imports: 0,
      importedBy: 0,
      orphan: false,
    };

    return [file.docId, node] as const;
  });

  const nodeByDocId = new Map<string, GraphNode>(nodeEntries);

  let edges = normalizeDocumentEdges(repo, nodeByDocId);
  let nodes = Array.from(nodeByDocId.values());

  if (filter) {
    const normalizedFilter = filter.trim().toLowerCase();
    const allowed = new Set(
      nodes
        .filter((node) =>
          node.type.toLowerCase() === normalizedFilter || node.kind.toLowerCase() === normalizedFilter
        )
        .map((node) => node.id)
    );

    nodes = nodes.filter((node) => allowed.has(node.id));
    edges = edges.filter((edge) => allowed.has(edge.from) && allowed.has(edge.to));
  }

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  for (const node of nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, 0);
  }

  for (const edge of edges) {
    outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }

  nodes = nodes
    .map((node) => ({
      ...node,
      imports: outgoing.get(node.id) ?? 0,
      importedBy: incoming.get(node.id) ?? 0,
      orphan: (outgoing.get(node.id) ?? 0) === 0 && (incoming.get(node.id) ?? 0) === 0,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const types: Record<string, number> = {};
  const kinds: Record<string, number> = {};

  for (const node of nodes) {
    types[node.type] = (types[node.type] ?? 0) + 1;
    kinds[node.kind] = (kinds[node.kind] ?? 0) + 1;
  }

  const importEdges = edges.filter((edge) => edge.role === 'imports');
  const mostImported = [...nodes]
    .sort((a, b) => b.importedBy - a.importedBy || a.path.localeCompare(b.path))
    .slice(0, 5)
    .map((node) => ({ id: node.id, name: node.name, count: node.importedBy }));

  return {
    workspace,
    root: workspaceRoot,
    stats: {
      documents: nodes.length,
      edges: edges.length,
      importEdges: importEdges.length,
      types,
      kinds,
      orphans: nodes.filter((node) => node.orphan).length,
      mostImported,
      circularImports: findImportCycles(nodes, importEdges),
    },
    nodes,
    edges,
  };
}

export function formatGraph(graph: WorkspaceGraph, format: GraphFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(graph, null, 2);
    case 'tree':
      return formatTree(graph);
    case 'dot':
      return formatDot(graph);
    default:
      throw new Error(`Unsupported graph format: ${format satisfies never}`);
  }
}

function normalizeDocumentEdges(repo: Repo, nodeByDocId: Map<string, GraphNode>): GraphEdge[] {
  const deduped = new Map<string, GraphEdge>();

  for (const edge of repo.edges) {
    const fromDocId = toRootDocId(edge.from);
    const toDocId = toRootDocId(edge.to);

    if (!nodeByDocId.has(fromDocId) || !nodeByDocId.has(toDocId)) {
      continue;
    }

    const from = nodeByDocId.get(fromDocId)!.id;
    const to = nodeByDocId.get(toDocId)!.id;
    const key = `${from}|${to}|${edge.role}`;

    if (!deduped.has(key)) {
      deduped.set(key, { from, to, role: edge.role });
    }
  }

  return Array.from(deduped.values()).sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.role.localeCompare(b.role)
  );
}

function toRootDocId(id: string): string {
  const hashIndex = id.indexOf('#');
  const conceptIndex = id.indexOf('::');

  let end = id.length;
  if (hashIndex >= 0) end = Math.min(end, hashIndex);
  if (conceptIndex >= 0) end = Math.min(end, conceptIndex);

  return id.slice(0, end);
}

function getDisplayType(kind: string, types: string[]): string {
  if (kind !== 'document') {
    return capitalize(kind);
  }

  const specificType = types.find((type) => type.toLowerCase() !== 'document') ?? types[0] ?? 'document';
  return capitalize(specificType);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripBusyExtension(relPath: string): string {
  return relPath.replace(/\.busy\.md$/, '').replace(/\.md$/, '');
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function findImportCycles(nodes: GraphNode[], importEdges: GraphEdge[]): string[][] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of importEdges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from)!.push(edge.to);
    }
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort();
  }

  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const cycles = new Map<string, string[]>();

  function dfs(nodeId: string) {
    visited.add(nodeId);
    active.add(nodeId);
    stack.push(nodeId);

    for (const next of adjacency.get(nodeId) ?? []) {
      if (!visited.has(next)) {
        dfs(next);
        continue;
      }

      if (active.has(next)) {
        const start = stack.indexOf(next);
        const cycle = stack.slice(start);
        const canonical = canonicalizeCycle(cycle);
        cycles.set(canonical.join(' -> '), canonical);
      }
    }

    stack.pop();
    active.delete(nodeId);
  }

  for (const node of [...nodeIds].sort()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return Array.from(cycles.values()).sort((a, b) => a.join('|').localeCompare(b.join('|')));
}

function canonicalizeCycle(cycle: string[]): string[] {
  if (cycle.length <= 1) {
    return cycle;
  }

  let best = cycle;
  for (let i = 1; i < cycle.length; i++) {
    const rotated = cycle.slice(i).concat(cycle.slice(0, i));
    if (rotated.join('\u0000') < best.join('\u0000')) {
      best = rotated;
    }
  }

  return best;
}

function formatTree(graph: WorkspaceGraph): string {
  type TreeDir = {
    name: string;
    dirs: Map<string, TreeDir>;
    files: GraphNode[];
  };

  const root: TreeDir = { name: graph.workspace, dirs: new Map(), files: [] };

  for (const node of graph.nodes) {
    const segments = node.path.split('/');
    let current = root;

    for (const segment of segments.slice(0, -1)) {
      let child = current.dirs.get(segment);
      if (!child) {
        child = { name: segment, dirs: new Map(), files: [] };
        current.dirs.set(segment, child);
      }
      current = child;
    }

    current.files.push(node);
  }

  const lines = [
    `${graph.workspace} (${graph.stats.documents} documents, ${graph.stats.edges} edges)`,
  ];

  const countDocs = (dir: TreeDir): number => {
    let count = dir.files.length;
    for (const child of dir.dirs.values()) {
      count += countDocs(child);
    }
    return count;
  };

  const renderDir = (dir: TreeDir, prefix: string) => {
    const dirEntries = [...dir.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
    const fileEntries = [...dir.files].sort((a, b) => a.path.localeCompare(b.path));
    const entries: Array<{ type: 'dir'; value: TreeDir } | { type: 'file'; value: GraphNode }> = [
      ...dirEntries.map((value) => ({ type: 'dir' as const, value })),
      ...fileEntries.map((value) => ({ type: 'file' as const, value })),
    ];

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      if (entry.type === 'dir') {
        lines.push(`${prefix}${connector}${entry.value.name}/ (${countDocs(entry.value)} docs)`);
        renderDir(entry.value, childPrefix);
      } else {
        const node = entry.value;
        lines.push(
          `${prefix}${connector}[${node.type}] ${node.name} (${node.importedBy} importers, ${node.imports} imports)`
        );
      }
    });
  };

  renderDir(root, '');
  return lines.join('\n');
}

function formatDot(graph: WorkspaceGraph): string {
  const lines = [
    'digraph busy {',
    '  rankdir=LR;',
    '  node [shape=box, style="rounded"];',
  ];

  for (const node of graph.nodes) {
    lines.push(`  "${escapeDot(node.id)}" [label="${escapeDot(`[${node.type}] ${node.name}`)}"];`);
  }

  for (const edge of graph.edges) {
    lines.push(
      `  "${escapeDot(edge.from)}" -> "${escapeDot(edge.to)}" [label="${escapeDot(edge.role)}"];`
    );
  }

  lines.push('}');
  return lines.join('\n');
}

function escapeDot(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
