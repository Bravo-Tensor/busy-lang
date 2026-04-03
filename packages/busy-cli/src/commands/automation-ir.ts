import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { parseDocument } from '../parser.js';
import { loadWorkspaceGraph, type WorkspaceGraph } from './graph.js';
import type {
  Import,
  Metadata,
  NewOperation,
  Tool,
  Trigger,
} from '../types/schema.js';

export interface WorkspaceAutomationDocument {
  id: string;
  path: string;
  name: string;
  kind: 'document' | 'playbook' | 'view' | 'config' | 'tool';
  metadata: Metadata;
  typeLabels: string[];
  imports: Import[];
  operations: NewOperation[];
  triggers: Trigger[];
  tools?: Tool[];
}

export interface WorkspaceAutomationStats {
  documents: number;
  operations: number;
  triggers: number;
  tools: number;
  documentsByKind: Record<string, number>;
}

export interface WorkspaceAutomationIR {
  workspace: string;
  root: string;
  stats: WorkspaceAutomationStats;
  documents: WorkspaceAutomationDocument[];
  dependencyGraph?: WorkspaceGraph;
}

export interface LoadWorkspaceAutomationIROptions {
  includeGraph?: boolean;
}

export async function loadWorkspaceAutomationIR(
  workspaceRoot: string,
  options: LoadWorkspaceAutomationIROptions = {},
): Promise<WorkspaceAutomationIR> {
  const normalizedRoot = path.resolve(workspaceRoot);
  const filePaths = await discoverWorkspaceBusyFiles(normalizedRoot);
  const documents: WorkspaceAutomationDocument[] = [];

  for (const filePath of filePaths) {
    const content = await readFile(filePath, 'utf-8');
    const parsed = parseDocument(content);
    const typeLabels = extractTypeLabels(parsed.metadata.type);
    const kind = inferDocumentKind(typeLabels);

    documents.push({
      id: stripBusyExtension(toPosix(path.relative(normalizedRoot, filePath))),
      path: toPosix(path.relative(normalizedRoot, filePath)),
      name: parsed.metadata.name,
      kind,
      metadata: parsed.metadata,
      typeLabels,
      imports: parsed.imports,
      operations: parsed.operations,
      triggers: parsed.triggers,
      ...('tools' in parsed ? { tools: parsed.tools } : {}),
    });
  }

  documents.sort((a, b) => a.path.localeCompare(b.path));

  const stats = documents.reduce<WorkspaceAutomationStats>((acc, document) => {
    acc.documents += 1;
    acc.operations += document.operations.length;
    acc.triggers += document.triggers.length;
    acc.tools += document.tools?.length ?? 0;
    acc.documentsByKind[document.kind] = (acc.documentsByKind[document.kind] ?? 0) + 1;
    return acc;
  }, {
    documents: 0,
    operations: 0,
    triggers: 0,
    tools: 0,
    documentsByKind: {},
  });

  return {
    workspace: path.basename(normalizedRoot),
    root: normalizedRoot,
    stats,
    documents,
    ...(options.includeGraph ? { dependencyGraph: await loadWorkspaceGraph(normalizedRoot) } : {}),
  };
}

async function discoverWorkspaceBusyFiles(workspaceRoot: string): Promise<string[]> {
  const globs = [path.join(workspaceRoot, '**/*.busy.md')];
  const librariesRoot = path.join(workspaceRoot, '.libraries');

  if (existsSync(librariesRoot)) {
    globs.push(path.join(librariesRoot, '**/*.busy.md'));
  }

  const filePaths = await fg(globs, {
    absolute: true,
    onlyFiles: true,
  });

  return filePaths.sort();
}

function extractTypeLabels(type: string): string[] {
  return type
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function inferDocumentKind(typeLabels: string[]): WorkspaceAutomationDocument['kind'] {
  const normalized = typeLabels.map((value) => value.toLowerCase());
  if (normalized.includes('tool')) return 'tool';
  if (normalized.includes('view')) return 'view';
  if (normalized.includes('playbook')) return 'playbook';
  if (normalized.includes('config')) return 'config';
  return 'document';
}

function stripBusyExtension(relPath: string): string {
  return relPath.replace(/\.busy\.md$/, '').replace(/\.md$/, '');
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
