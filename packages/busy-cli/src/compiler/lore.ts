import { createHash } from 'node:crypto';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Link, LinkReference, Parent, Root, Text } from 'mdast';
import type { Repo, View, BusyDocument, Config, Playbook } from '../types/schema.js';
import type {
  LoreCompilerConfig,
  SiteManifest,
  PageIR,
  ActionIR,
  DataSourceIR,
  NavigationItemIR,
} from '../types/lore-compiler.js';

const DEFAULT_COMPILER_VERSION = 'lore-ir-v1';

export function compileLoreSite(
  repo: Repo,
  workspaceRoot: string,
  config: LoreCompilerConfig = {}
): SiteManifest {
  const compilerVersion = config.compilerVersion ?? DEFAULT_COMPILER_VERSION;
  const siteId = path.basename(path.resolve(workspaceRoot));

  const fileByDocId = new Map(repo.files.map((file) => [file.docId, file] as const));
  const fileByAbsolutePath = new Map(repo.files.map((file) => [path.resolve(file.path), file] as const));

  const renderableViews = Object.values(repo.byFile)
    .map((entry) => entry.concept)
    .filter((concept): concept is View => concept.kind === 'view' && typeof concept.display === 'string' && concept.display.trim().length > 0)
    .sort((a, b) => a.name.localeCompare(b.name) || a.docId.localeCompare(b.docId));

  const pageSeeds = renderableViews.map((view) => {
    const file = fileByDocId.get(view.docId);
    if (!file) {
      throw new Error(`Missing file for renderable view ${view.docId}`);
    }

    const relativePath = toPosix(path.relative(workspaceRoot, file.path));
    const pageId = stripBusyExtension(relativePath);
    const route = `/${pageId}`;

    return {
      view,
      file,
      pageId,
      route,
      sourcePath: relativePath,
    };
  }).sort((a, b) => a.pageId.localeCompare(b.pageId));

  const pageRouteByDocId = new Map(pageSeeds.map((seed) => [seed.view.docId, seed.route] as const));

  const pages: PageIR[] = pageSeeds.map((seed) => {
    const requiredPermissions = [...(config.permissions?.pages?.[seed.pageId] ?? [])].sort();
    const dataSources = extractDataSources(repo, seed.view, seed.pageId, config);
    const actions = extractActions(repo, seed.view, seed.pageId, seed.route, seed.file.path, pageRouteByDocId, fileByAbsolutePath, config);

    return {
      pageId: seed.pageId,
      route: seed.route,
      title: seed.view.name,
      navLabel: config.navigation?.labels?.[seed.pageId] ?? seed.view.name,
      sourceDocId: seed.view.docId,
      sourcePath: seed.sourcePath,
      renderable: true,
      displaySource: seed.view.display!,
      requiredPermissions,
      dataSources,
      actions,
    };
  });

  const navigation = buildNavigation(pages, config);

  return {
    siteId,
    workspaceRoot,
    compilerVersion,
    sourceHash: buildSourceHash(repo, workspaceRoot, compilerVersion, config),
    permissionModelRef: config.permissionModelRef,
    pages,
    navigation,
  };
}

function extractDataSources(
  repo: Repo,
  view: View,
  pageId: string,
  config: LoreCompilerConfig
): DataSourceIR[] {
  const sources: DataSourceIR[] = [];

  for (const imp of view.imports) {
    const docId = toRootDocId(imp.resolved);
    if (!docId) continue;

    const imported = repo.byFile[docId]?.concept;
    if (!imported) continue;

    const kind = classifyDataSource(imported);
    if (!kind) continue;

    const id = `${pageId}:${slugify(imp.label)}`;
    sources.push({
      id,
      sourceName: imp.label,
      sourceDocId: imported.docId,
      sourceDocName: imported.name,
      kind,
      requiredPermissions: [...(config.permissions?.dataSources?.[id] ?? [])].sort(),
    });
  }

  return sources.sort(compareDataSources);
}

function classifyDataSource(concept: BusyDocument | View | Config | Playbook): DataSourceIR['kind'] | undefined {
  if (concept.kind === 'view') return 'view';
  if (concept.kind === 'config') return 'config';
  if (concept.kind === 'document' && concept.types.some((type) => type.toLowerCase() === 'model')) {
    return 'model';
  }
  return undefined;
}

function extractActions(
  repo: Repo,
  view: View,
  pageId: string,
  currentRoute: string,
  currentFilePath: string,
  pageRouteByDocId: Map<string, string>,
  fileByAbsolutePath: Map<string, { docId: string; path: string; name: string; sections: unknown[] }>,
  config: LoreCompilerConfig
): ActionIR[] {
  const actions: ActionIR[] = [];

  for (const linkAction of extractDisplayLinkActions(view.display!, currentFilePath, currentRoute, fileByAbsolutePath, pageRouteByDocId)) {
    actions.push({
      ...linkAction,
      requiredPermissions: [...(config.permissions?.actions?.[linkAction.id] ?? [])].sort(),
    });
  }

  const operationActions = view.operations
    .filter((operation) => operation.name !== 'renderView')
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const operation of operationActions) {
    const id = `${pageId}:${operation.name}`;
    actions.push({
      id,
      kind: 'run_operation',
      label: operation.name,
      target: operation.name,
      requiredPermissions: [...(config.permissions?.actions?.[id] ?? [])].sort(),
    });
  }

  return dedupeActions(actions);
}

function extractDisplayLinkActions(
  display: string,
  currentFilePath: string,
  currentRoute: string,
  fileByAbsolutePath: Map<string, { docId: string; path: string; name: string; sections: unknown[] }>,
  pageRouteByDocId: Map<string, string>
): ActionIR[] {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(display) as Root;
  const actions: ActionIR[] = [];

  visit(tree, 'link', (node: Link) => {
    const label = getNodeText(node).trim();
    const action = resolveLinkAction(node.url, label, currentFilePath, currentRoute, fileByAbsolutePath, pageRouteByDocId);
    if (action) actions.push(action);
  });

  visit(tree, 'linkReference', (_node: LinkReference) => {
    // Reference-style links are intentionally not compiled yet because the Display
    // section is extracted independently from import/link definition blocks. Those
    // can be added later once a site-wide symbol table is threaded into the compiler.
  });

  return actions;
}

function resolveLinkAction(
  href: string,
  label: string,
  currentFilePath: string,
  currentRoute: string,
  fileByAbsolutePath: Map<string, { docId: string; path: string; name: string; sections: unknown[] }>,
  pageRouteByDocId: Map<string, string>
): ActionIR | undefined {
  if (!label) return undefined;

  if (href.startsWith('#')) {
    const target = `${currentRoute}#${href.slice(1)}`;
    return {
      id: `navigate:${target}`,
      kind: 'navigate',
      label,
      target,
      requiredPermissions: [],
    };
  }

  if (/^https?:\/\//.test(href)) {
    return {
      id: `external:${href}`,
      kind: 'open_external',
      label,
      target: href,
      requiredPermissions: [],
    };
  }

  if (href.startsWith('./') || href.startsWith('../')) {
    const [relativeFile, anchor] = href.split('#');
    const absolute = path.resolve(path.dirname(currentFilePath), relativeFile);
    const targetFile = fileByAbsolutePath.get(absolute);
    if (!targetFile) return undefined;

    const route = pageRouteByDocId.get(targetFile.docId);
    if (!route) return undefined;

    const target = anchor ? `${route}#${anchor}` : route;
    return {
      id: `navigate:${target}`,
      kind: 'navigate',
      label,
      target,
      requiredPermissions: [],
    };
  }

  return undefined;
}

function buildNavigation(pages: PageIR[], config: LoreCompilerConfig): SiteManifest['navigation'] {
  const homePageId = config.navigation?.homePageId;
  const sidebar = pages
    .map((page) => ({
      pageId: page.pageId,
      route: page.route,
      title: page.navLabel,
      group: config.navigation?.groups?.[page.pageId] ?? inferGroup(page.sourcePath),
      order: config.navigation?.order?.[page.pageId] ?? 1000,
      requiredPermissions: [...page.requiredPermissions],
    }))
    .sort((a, b) => compareNavigation(a, b, homePageId));

  return {
    homePageId,
    sidebar,
    sitemap: [...sidebar],
  };
}

function inferGroup(sourcePath: string): string {
  const segments = sourcePath.split('/');
  return segments.length > 1 ? segments[0] : 'root';
}

function dedupeActions(actions: ActionIR[]): ActionIR[] {
  const deduped = new Map<string, ActionIR>();
  for (const action of actions) {
    deduped.set(`${action.kind}|${action.label}|${action.target}`, action);
  }
  return [...deduped.values()];
}

function compareDataSources(a: DataSourceIR, b: DataSourceIR): number {
  const order = (kind: DataSourceIR['kind']) => ({ view: 0, model: 1, config: 2 }[kind]);
  return order(a.kind) - order(b.kind) || a.sourceName.localeCompare(b.sourceName);
}

function compareNavigation(a: NavigationItemIR, b: NavigationItemIR, homePageId?: string): number {
  if (homePageId) {
    if (a.pageId === homePageId && b.pageId !== homePageId) return -1;
    if (b.pageId === homePageId && a.pageId !== homePageId) return 1;
  }

  return a.order - b.order || a.route.localeCompare(b.route) || a.group.localeCompare(b.group);
}

function buildSourceHash(
  repo: Repo,
  workspaceRoot: string,
  compilerVersion: string,
  config: LoreCompilerConfig
): string {
  const sources = repo.files
    .map((file) => ({
      docId: file.docId,
      path: toPosix(path.relative(workspaceRoot, file.path)),
      content: repo.byFile[file.docId]?.concept.content ?? '',
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const payload = stableStringify({ compilerVersion, config, sources });
  return createHash('sha256').update(payload).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function toRootDocId(value?: string): string | undefined {
  if (!value) return undefined;
  const hashIndex = value.indexOf('#');
  const conceptIndex = value.indexOf('::');

  let end = value.length;
  if (hashIndex >= 0) end = Math.min(end, hashIndex);
  if (conceptIndex >= 0) end = Math.min(end, conceptIndex);
  return value.slice(0, end);
}

function stripBusyExtension(relPath: string): string {
  return relPath.replace(/\.busy\.md$/, '').replace(/\.md$/, '');
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function slugify(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getNodeText(node: Parent): string {
  return (node.children ?? [])
    .map((child) => {
      if ('value' in child) {
        return (child as Text).value;
      }
      if ('children' in child) {
        return getNodeText(child as Parent);
      }
      return '';
    })
    .join('');
}
