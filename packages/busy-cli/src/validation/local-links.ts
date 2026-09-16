import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import type { Root } from 'mdast';

const parse = (content: string) => unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content) as Root;
function text(node: any): string {
  if (node.type === 'html') return '';
  return typeof node.value === 'string' ? node.value : (node.children || []).map(text).join('');
}
function anchors(content: string): Set<string> {
  const slugger = new GithubSlugger();
  const result = new Set<string>();
  visit(parse(content), 'heading', node => { result.add(slugger.slug(text(node))); });
  return result;
}

/** Check direct local Markdown links and reference definitions, not transitive imports or code. */
export function validateLocalLinks(content: string, filePath: string): string[] {
  const errors: string[] = [];
  const cache = new Map<string, Set<string>>([[resolve(filePath), anchors(content)]]);
  visit(parse(content), node => {
    if (node.type !== 'link' && node.type !== 'definition') return;
    const url = node.url;
    if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.includes('{{')) return;
    try {
      const hash = url.indexOf('#');
      const pathPart = (hash < 0 ? url : url.slice(0, hash)).split('?')[0];
      const target = pathPart ? resolve(dirname(filePath), decodeURIComponent(pathPart)) : resolve(filePath);
      const fragment = hash < 0 ? '' : decodeURIComponent(url.slice(hash + 1));
      if (!cache.has(target) && !existsSync(target)) {
        errors.push(`Line ${node.position?.start.line}: local link target not found (${url})`);
        return;
      }
      if (!fragment || !/\.md$/i.test(target)) return;
      if (!cache.has(target)) cache.set(target, anchors(readFileSync(target, 'utf8')));
      if (!cache.get(target)!.has(fragment)) errors.push(`Line ${node.position?.start.line}: local link anchor not found (${url})`);
    } catch (error) {
      errors.push(`Line ${node.position?.start.line}: cannot validate local link (${url}): ${error instanceof Error ? error.message : error}`);
    }
  });
  return errors;
}
