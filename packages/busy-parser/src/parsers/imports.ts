import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import type { Root, Definition } from 'mdast';
import { ImportDef, DocId } from '../types/schema.js';
import { debug } from '../utils/logger.js';

/**
 * Extract reference-style imports from markdown content
 */
export function extractImports(
  content: string,
  docId: DocId
): { imports: ImportDef[]; symbols: Record<string, { docId?: string; slug?: string }> } {
  debug.imports('Extracting imports for %s', docId);

  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']);

  const tree = processor.parse(content) as Root;

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
      description: undefined,
      types: [],
      extends: [],
      tags: [],
      attrs: {},
      path: '', // Will be set from resolved target
      lineStart: 0,
      lineEnd: 0,
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

/**
 * Resolve an import target to {docId, slug}
 */
export function resolveImportTarget(
  target: string,
  currentDocId: DocId,
  fileMap: Map<string, { docId: string; path: string }>
): { docId?: string; slug?: string } {
  // Parse target: "./file.md", "../core/file.md", or "./file.md#slug"
  const match = target.match(/^\.{1,2}\/(.+?)(#(.+))?$/);

  if (!match) {
    debug.imports('Invalid import target: %s', target);
    return {};
  }

  const [, filePath, , slug] = match;

  // Try multiple resolution strategies:
  // 1. Full relative path
  // 2. Just the basename
  // 3. Basename with different extensions

  let fileInfo = fileMap.get(filePath);

  if (!fileInfo) {
    // Try just the basename
    const basename = filePath.split('/').pop() || filePath;
    fileInfo = fileMap.get(basename);
  }

  if (!fileInfo) {
    debug.imports('File not found in map: %s', filePath);
    return { slug };
  }

  return {
    docId: fileInfo.docId,
    slug,
  };
}
