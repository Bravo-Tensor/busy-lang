import { dirname, resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import type { Root, Heading, Definition, Link, LinkReference } from 'mdast';

function headingText(node: any): string {
  if (node.type === 'html') return '';
  if (typeof node.value === 'string') return node.value;
  if (node.type === 'image') return node.alt || '';
  return (node.children || []).map(headingText).join('');
}

/** Inspect links in actual heading nodes, never body references or code examples. */
export function validateHeadingLinks(content: string, filePath: string): string[] {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content) as Root;
  const definitions = new Map<string, string>();
  visit(tree, 'definition', (node: Definition) => {
    const key = node.identifier.toUpperCase();
    if (!definitions.has(key)) definitions.set(key, node.url);
  });
  const slugger = new GithubSlugger();
  const errors: string[] = [];
  visit(tree, 'heading', (heading: Heading) => {
    const anchor = slugger.slug(headingText(heading));
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
