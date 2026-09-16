import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import type { Root, Heading, Nodes } from 'mdast';

export function markdownText(node: Nodes): string {
  if (node.type === 'html') return '';
  if (node.type === 'image') return node.alt || '';
  if ('value' in node) return node.value;
  return 'children' in node ? node.children.map(markdownText).join('') : '';
}
export interface MarkdownSource {
  content: string;
  tree: Root;
  definitions: Map<string, string>;
  headings: Map<Heading, string>;
  anchors: Set<string>;
}
export function parseMarkdown(content: string): MarkdownSource {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content) as Root;
  const definitions = new Map<string, string>();
  visit(tree, 'definition', node => {
    const key = node.identifier.toUpperCase();
    if (!definitions.has(key)) definitions.set(key, node.url);
  });
  const slugger = new GithubSlugger();
  const headings = new Map<Heading, string>();
  visit(tree, 'heading', node => { headings.set(node, slugger.slug(markdownText(node))); });
  return { content, tree, definitions, headings, anchors: new Set(headings.values()) };
}
export function asMarkdown(source: string | MarkdownSource): MarkdownSource {
  return typeof source === 'string' ? parseMarkdown(source) : source;
}
export function linkDestination(node: Nodes, source: MarkdownSource): string | undefined {
  if (node.type === 'link' || node.type === 'definition') return node.url;
  if (node.type === 'linkReference') return source.definitions.get(node.identifier.toUpperCase());
  return undefined;
}
