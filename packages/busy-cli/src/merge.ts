import { Repo, File, ConceptBase, LocalDef, Operation, ImportDef, Edge, Section } from './types/schema.js';
import { debug } from './utils/logger.js';

/**
 * Merge multiple repos into a single repo
 * Later repos override earlier ones when there are conflicts
 */
export function mergeRepos(...repos: Repo[]): Repo {
  if (repos.length === 0) {
    throw new Error('At least one repo is required');
  }

  if (repos.length === 1) {
    return repos[0];
  }

  debug.parser('Merging %d repos', repos.length);

  const merged: Repo = {
    files: [],
    concepts: [],
    localdefs: {},
    operations: {},
    imports: [],
    byId: {},
    byFile: {},
    edges: [],
  };

  // Merge files (later repos override)
  const filesByDocId = new Map<string, File>();
  for (const repo of repos) {
    for (const file of repo.files) {
      filesByDocId.set(file.docId, file);
    }
  }
  merged.files = Array.from(filesByDocId.values());

  // Merge concepts (later repos override)
  const conceptsById = new Map<string, ConceptBase>();
  for (const repo of repos) {
    for (const concept of repo.concepts) {
      conceptsById.set(concept.id, concept);
    }
  }
  merged.concepts = Array.from(conceptsById.values());

  // Merge localdefs (later repos override)
  for (const repo of repos) {
    Object.assign(merged.localdefs, repo.localdefs);
  }

  // Merge operations (later repos override)
  for (const repo of repos) {
    Object.assign(merged.operations, repo.operations);
  }

  // Merge imports (append all, handle duplicates by ID)
  const importsByDocId = new Map<string, Map<string, ImportDef>>();
  for (const repo of repos) {
    for (const imp of repo.imports) {
      if (!importsByDocId.has(imp.docId)) {
        importsByDocId.set(imp.docId, new Map());
      }
      importsByDocId.get(imp.docId)!.set(imp.id, imp);
    }
  }
  for (const docImports of importsByDocId.values()) {
    merged.imports.push(...docImports.values());
  }

  // Merge byId (later repos override)
  for (const repo of repos) {
    Object.assign(merged.byId, repo.byId);
  }

  // Merge byFile (later repos override)
  for (const repo of repos) {
    Object.assign(merged.byFile, repo.byFile);
  }

  // Merge edges (append all, deduplicate)
  const edgeSet = new Set<string>();
  for (const repo of repos) {
    for (const edge of repo.edges) {
      const key = `${edge.from}→${edge.to}:${edge.role}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        merged.edges.push(edge);
      }
    }
  }

  debug.parser(
    'Merged repo: %d files, %d concepts, %d localdefs, %d operations, %d imports, %d edges',
    merged.files.length,
    merged.concepts.length,
    Object.keys(merged.localdefs).length,
    Object.keys(merged.operations).length,
    merged.imports.length,
    merged.edges.length
  );

  return merged;
}

/**
 * Extend a base repo with additional files
 * This is a convenience wrapper around mergeRepos
 */
export function extendRepo(baseRepo: Repo, extensionRepo: Repo): Repo {
  debug.parser('Extending base repo with extension');
  return mergeRepos(baseRepo, extensionRepo);
}

/**
 * Load a repo from JSON and validate it against the schema
 */
export function loadRepoFromJSON(json: string): Repo {
  const data = JSON.parse(json);
  // Basic validation - could use Zod here but keeping it simple for now
  if (!data.files || !data.concepts) {
    throw new Error('Invalid repo JSON: missing required fields');
  }
  return data as Repo;
}
