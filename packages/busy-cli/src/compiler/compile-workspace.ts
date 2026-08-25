import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { compileBusyDocument } from './compile-document.js';
import type {
  BusyDiagnostic,
  BusyDocumentIR,
  BusySectionIR,
  BusyStepIR,
  BusyWorkspaceIR,
  CompileBusyWorkspaceOptions,
} from './types.js';

export async function compileBusyWorkspace(
  workspaceRoot: string,
  options: CompileBusyWorkspaceOptions = {},
): Promise<BusyWorkspaceIR> {
  const root = path.resolve(workspaceRoot);
  const filePaths = await fg('**/*.busy.md', {
    absolute: true,
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    ignore: ['**/.git/**', '**/node_modules/**'],
  });
  const compiled: BusyDocumentIR[] = [];
  for (const filePath of filePaths.sort()) {
    compiled.push(compileBusyDocument({
      content: await readFile(filePath, 'utf8'),
      path: toPosix(path.relative(root, filePath)),
    }));
  }

  const byPath = new Map(compiled.map((document) => [document.path, document]));
  const diagnostics: BusyDiagnostic[] = compiled.flatMap((document) => document.diagnostics);
  const documents = compiled.map((document) => resolveDocumentImports(
    document,
    root,
    byPath,
    diagnostics,
  ));
  diagnostics.push(...findCircularImports(documents));
  const stats = documents.reduce((acc, document) => {
    acc.documents += 1;
    acc.operations += document.operations.length;
    acc.steps += document.operations.reduce(
      (total, operation) => total + countSteps(operation.steps),
      0,
    );
    acc.triggers += document.triggers.length + document.operations.reduce(
      (total, operation) => total + operation.triggers.length,
      0,
    );
    acc.emits += document.operations.reduce(
      (total, operation) => total + operation.emits.length,
      0,
    );
    acc.checklistItems += document.operations.reduce(
      (total, operation) => total + operation.checklist.length,
      0,
    );
    acc.documentsByKind[document.kind] = (acc.documentsByKind[document.kind] ?? 0) + 1;
    return acc;
  }, {
    documents: 0,
    operations: 0,
    steps: 0,
    triggers: 0,
    emits: 0,
    checklistItems: 0,
    documentsByKind: {} as Record<string, number>,
  });

  const result: BusyWorkspaceIR = Object.freeze({
    schema: 'busy.semantic-ir/v1',
    workspace: path.basename(root),
    root,
    documents: Object.freeze(documents),
    diagnostics: Object.freeze(diagnostics),
    stats: Object.freeze({
      ...stats,
      documentsByKind: Object.freeze({ ...stats.documentsByKind }),
    }),
  });

  if (options.strict && diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
    const summary = diagnostics
      .filter((diagnostic) => diagnostic.severity === 'error')
      .slice(0, 10)
      .map((diagnostic) => `${diagnostic.span.path}:${diagnostic.span.startLine} ${diagnostic.message}`)
      .join('\n');
    throw new Error(`BUSY semantic compilation failed:\n${summary}`);
  }

  return result;
}

function resolveDocumentImports(
  document: BusyDocumentIR,
  root: string,
  byPath: ReadonlyMap<string, BusyDocumentIR>,
  diagnostics: BusyDiagnostic[],
): BusyDocumentIR {
  const imports = document.imports.map((item) => {
    if (/^[a-z]+:\/\//i.test(item.target)) {
      return Object.freeze({ ...item, targetKind: 'remote' as const });
    }
    const directPath = toPosix(path.relative(
      root,
      path.resolve(root, path.dirname(document.path), item.target),
    ));
    const resolvedPath = resolveInstalledPackagePath(document.path, directPath, root, byPath);
    const target = byPath.get(resolvedPath);
    if (!target && !existsSync(path.join(root, resolvedPath))) {
      diagnostics.push({
        code: 'unresolved-import',
        severity: 'error',
        message: `Import ${item.name} does not resolve to ${resolvedPath}.`,
        span: item.span,
      });
      return item;
    }
    if (target && item.anchor && !hasAnchor(target.sections, item.anchor)) {
      diagnostics.push({
        code: 'unresolved-anchor',
        severity: 'error',
        message: `Import ${item.name} references missing anchor #${item.anchor} in ${resolvedPath}.`,
        span: item.span,
      });
    }
    return Object.freeze({
      ...item,
      resolvedPath,
      targetKind: target ? 'busy-document' as const : 'resource' as const,
      ...(target ? { resolvedDocumentId: target.id } : {}),
    });
  });
  return Object.freeze({ ...document, imports: Object.freeze(imports) });
}

/**
 * Cached BUSY packages retain imports written from their original package root.
 * Resolve nested `.libraries/<dependency>` and sibling dependency paths against
 * the consuming workspace's installed `.libraries` directory.
 */
function resolveInstalledPackagePath(
  sourcePath: string,
  directPath: string,
  root: string,
  byPath: ReadonlyMap<string, BusyDocumentIR>,
): string {
  const exists = (candidate: string) =>
    byPath.has(candidate) || existsSync(path.join(root, candidate));
  if (exists(directPath)) return directPath;
  const nestedMarker = '/.libraries/';
  const nestedAt = directPath.lastIndexOf(nestedMarker);
  if (nestedAt >= 0) {
    const candidate = `.libraries/${directPath.slice(nestedAt + nestedMarker.length)}`;
    if (exists(candidate)) return candidate;
  }
  const sourceMatch = sourcePath.match(/^\.libraries\/([^/]+)\//);
  if (sourceMatch) {
    const prefix = `.libraries/${sourceMatch[1]}/`;
    if (directPath.startsWith(prefix)) {
      const candidate = `.libraries/${directPath.slice(prefix.length)}`;
      if (exists(candidate)) return candidate;
    }
  }
  return directPath;
}

function hasAnchor(sections: readonly BusySectionIR[], anchor: string): boolean {
  const normalized = slugify(anchor);
  return sections.some((section) =>
    section.id.endsWith(`#${normalized}`) || hasAnchor(section.children, anchor)
  );
}

function findCircularImports(documents: readonly BusyDocumentIR[]): BusyDiagnostic[] {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const indexById = new Map<string, number>();
  const lowLinkById = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let nextIndex = 0;

  const connect = (id: string) => {
    indexById.set(id, nextIndex);
    lowLinkById.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);

    const document = byId.get(id);
    const targets = document?.imports.flatMap((item) =>
      item.resolvedDocumentId ? [item.resolvedDocumentId] : []
    ) ?? [];
    for (const target of targets) {
      if (!indexById.has(target)) {
        connect(target);
        lowLinkById.set(id, Math.min(lowLinkById.get(id)!, lowLinkById.get(target)!));
      } else if (onStack.has(target)) {
        lowLinkById.set(id, Math.min(lowLinkById.get(id)!, indexById.get(target)!));
      }
    }

    if (lowLinkById.get(id) === indexById.get(id)) {
      const component: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== id);
      components.push(component);
    }
  };

  for (const document of documents) {
    if (!indexById.has(document.id)) connect(document.id);
  }

  return components.flatMap((component) => {
    const selfLoop = component.length === 1 && byId.get(component[0]!)?.imports.some(
      (item) => item.resolvedDocumentId === component[0],
    );
    if (component.length < 2 && !selfLoop) return [];
    const ordered = [...component].sort();
    const document = byId.get(ordered[0]!)!;
    return [{
      code: 'circular-import',
      severity: 'warning' as const,
      message: `Circular import component: ${ordered.join(', ')}.`,
      span: document.imports[0]?.span ?? {
        path: document.path,
        startLine: 1,
        endLine: 1,
      },
    }];
  });
}

function countSteps(steps: readonly BusyStepIR[]): number {
  return steps.reduce((total, step) => total + 1 + countSteps(step.children), 0);
}

function slugify(value: string): string {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
