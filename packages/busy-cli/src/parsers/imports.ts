import { visit } from 'unist-util-visit';
import type { Definition } from 'mdast';
import { ImportDef, DocId } from '../types/schema.js';
import { debug } from '../utils/logger.js';
import { asMarkdown, type MarkdownSource } from './markdown.js';

export function extractImports(
  content: string,
  docId: DocId,
  source?: MarkdownSource
): { imports: ImportDef[]; symbols: Record<string, { docId?: string; slug?: string }> } {
  debug.imports('Extracting imports for %s', docId);

  const tree = (source ?? asMarkdown(content)).tree;

  const imports: ImportDef[] = [];
  const symbols: Record<string, { docId?: string; slug?: string }> = {};

  // Visit definition nodes (reference-style links)
  visit(tree, 'definition', (node: Definition) => {
    const label = node.label ?? node.identifier;
    const target = node.url;

    debug.imports('Found import: [%s]: %s', label, target);

    const importDef: ImportDef = {
      kind: 'importdef',
      id: `${docId}::import::${label}`,
      docId,
      slug: label.toLowerCase(),
      name: label,
      content: '', // Imports don't have content
      types: [],
      extends: [],
      sectionRef: '', // Imports don't belong to a section
      label,
      target,
      resolved: undefined, // Will be resolved later
    };

    imports.push(importDef);

    // Add to symbol table (will be fully resolved later)
    symbols[label] = {
      docId: undefined,
      slug: undefined,
    };
  });

  debug.imports('Found %d imports', imports.length);

  return { imports, symbols };
}

export function resolveImportTarget(
  target: string,
  fileMap: Map<string, { docId: string; path: string }>
): { docId?: string; slug?: string } {
  // Parse target: "file.md", "./file.md", "../core/file.md", or "file.md#slug"
  const hashIndex = target.indexOf('#');
  let filePath = target;
  let slug: string | undefined;

  if (hashIndex !== -1) {
    filePath = target.slice(0, hashIndex);
    slug = target.slice(hashIndex + 1);
  }

  // Remove leading ./ if present
  filePath = filePath.replace(/^\.\//, '');

  // Try multiple resolution strategies:
  // 1. Full path as provided
  let fileInfo = fileMap.get(filePath);

  // 2. Try just the basename
  if (!fileInfo) {
    const basename = filePath.split('/').pop() || filePath;
    fileInfo = fileMap.get(basename);
  }

  // 3. Try without extension
  if (!fileInfo) {
    const basename = filePath.split('/').pop() || filePath;
    const withoutExt = basename.replace(/\.busy\.md$/, '').replace(/\.md$/, '');
    fileInfo = fileMap.get(withoutExt);
  }

  if (!fileInfo) {
    return slug ? { slug } : {};
  }

  return {
    docId: fileInfo.docId,
    slug,
  };
}
