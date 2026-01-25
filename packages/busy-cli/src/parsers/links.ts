import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import type { Root, Link, LinkReference } from 'mdast';
import { Section, Edge, EdgeRole } from '../types/schema.js';
import { debug } from '../utils/logger.js';


/**
 * Extract links from a section and create edges
 */
export function extractLinksFromSection(
  section: Section,
  content: string,
  symbols: Record<string, { docId?: string; slug?: string }>,
  fileMap: Map<string, { docId: string; path: string }>
): Edge[] {
  debug.links('Extracting links from section %s', section.id);

  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']);

  const tree = processor.parse(content) as Root;

  const edges: Edge[] = [];

  // Visit link nodes
  visit(tree, 'link', (node: Link) => {
    const href = node.url;

    const resolved = resolveLink(href, section.docId, fileMap);

    if (resolved) {
      // Temporarily mark as 'ref', will be reclassified in loader
      edges.push({
        from: section.id,
        to: resolved,
        role: 'ref',
      });
    }
  });

  // Visit link reference nodes
  visit(tree, 'linkReference', (node: LinkReference) => {
    const label = node.label ?? node.identifier;

    // Resolve via symbol table
    const symbol = symbols[label];
    if (symbol) {
      let resolved: string | undefined;

      if (symbol.docId && symbol.slug) {
        resolved = `${symbol.docId}#${symbol.slug}`;
      } else if (symbol.docId) {
        resolved = symbol.docId;
      }

      if (resolved) {
        // Temporarily mark as 'ref', will be reclassified in loader
        edges.push({
          from: section.id,
          to: resolved,
          role: 'ref',
        });
      }
    }
  });

  debug.links('Found %d edges from section', edges.length);

  return edges;
}

/**
 * Resolve a link href to a node ID
 */
function resolveLink(
  href: string,
  currentDocId: string,
  fileMap: Map<string, { docId: string; path: string }>
): string | undefined {
  // Handle internal anchors: #slug
  if (href.startsWith('#')) {
    const slug = href.slice(1);
    return `${currentDocId}#${slug}`;
  }

  // Handle relative file links: ./file.md or ./file.md#slug
  const match = href.match(/^\.\/(.+?)(#(.+))?$/);
  if (match) {
    const [, filePath, , slug] = match;

    const fileInfo = fileMap.get(filePath);
    if (!fileInfo) {
      debug.links('File not found: %s', filePath);
      return undefined;
    }

    if (slug) {
      return `${fileInfo.docId}#${slug}`;
    }

    return fileInfo.docId;
  }

  // External link - return as-is or skip
  return href.startsWith('http') ? href : undefined;
}
