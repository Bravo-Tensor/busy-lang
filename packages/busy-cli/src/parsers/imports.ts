import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import type { Root, Definition } from 'mdast';
import { ImportDef, DocId, Import } from '../types/schema.js';
import { debug } from '../utils/logger.js';

// =============================================================================
// NEW PARSER FUNCTIONS - busy-python compatible
// =============================================================================

/**
 * Parse reference-style imports from markdown content
 * Matches busy-python format: [ConceptName]: path/to/file.md[#anchor]
 *
 * @returns Object with imports array and symbols table
 */
export function parseImports(
  content: string
): { imports: Import[]; symbols: Record<string, { docId?: string; slug?: string }> } {
  const imports: Import[] = [];
  const symbols: Record<string, { docId?: string; slug?: string }> = {};

  // Regex pattern matching busy-python: r"\[([^\]]+)\]:\s*([^\s#]+)(?:#([^\s]+))?"
  const importPattern = /^\[([^\]]+)\]:\s*([^\s#]+)(?:#([^\s]+))?$/gm;

  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const [, conceptName, path, anchor] = match;

    const importDef: Import = {
      conceptName,
      path,
      anchor: anchor || undefined,
    };

    imports.push(importDef);

    // Add to symbol table for later resolution
    symbols[conceptName] = {
      docId: undefined,
      slug: anchor || undefined,
    };
  }

  return { imports, symbols };
}

/**
 * Resolve an import path to docId and optional slug
 * Used for import resolution against a file map
 */
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

// =============================================================================
// LEGACY FUNCTIONS - kept for backward compatibility
// =============================================================================

/**
 * Extract reference-style imports from markdown content (LEGACY)
 * Returns ImportDef objects for graph-based representation
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

/**
 * Resolve an import target to {docId, slug} (LEGACY)
 * This version requires currentDocId parameter for backward compatibility
 */
export function legacyResolveImportTarget(
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
