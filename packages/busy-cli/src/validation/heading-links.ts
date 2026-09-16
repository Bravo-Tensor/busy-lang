import { asMarkdown, type MarkdownSource } from '../parsers/markdown.js';
import { dirname, resolve } from 'node:path';
import { visit } from 'unist-util-visit';
import type { Heading, Link, LinkReference } from 'mdast';

/** Inspect links in actual heading nodes, never body references or code examples. */
export function validateHeadingLinks(content: string | MarkdownSource, filePath: string): string[] {
  const source = asMarkdown(content);
  const tree = source.tree;
  const definitions = source.definitions;
  const errors: string[] = [];
  visit(tree, 'heading', (heading: Heading) => {
    const anchor = source.headings.get(heading);
    visit(heading, (node) => {
      let url: string | undefined;
      if (node.type === 'link') url = (node as Link).url;
      if (node.type === 'linkReference') url = definitions.get((node as LinkReference).identifier.toUpperCase());
      if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return;
      const hash = url.indexOf('#');
      if (hash < 0) return;
      try {
        const target = resolve(dirname(filePath), decodeURIComponent(url.slice(0, hash).split('?')[0]) || filePath);
        if (target === resolve(filePath) && decodeURIComponent(url.slice(hash + 1)) === anchor) {
          errors.push(`Line ${heading.position?.start.line}: heading links to itself (${url})`);
        }
      } catch {
        // Malformed URL encoding is not evidence of a self-reference.
      }
    });
  });
  return errors;
}
