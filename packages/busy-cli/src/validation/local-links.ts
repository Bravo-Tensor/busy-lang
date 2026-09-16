import { asMarkdown, parseMarkdown, type MarkdownSource } from '../parsers/markdown.js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { visit } from 'unist-util-visit';

/** Check direct local Markdown links and reference definitions, not transitive imports or code. */
export function validateLocalLinks(content: string | MarkdownSource, filePath: string): string[] {
  const source = asMarkdown(content);
  const errors: string[] = [];
  const cache = new Map<string, Set<string>>([[resolve(filePath), source.anchors]]);
  visit(source.tree, node => {
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
      if (!cache.has(target)) cache.set(target, parseMarkdown(readFileSync(target, 'utf8')).anchors);
      if (!cache.get(target)!.has(fragment)) errors.push(`Line ${node.position?.start.line}: local link anchor not found (${url})`);
    } catch (error) {
      errors.push(`Line ${node.position?.start.line}: cannot validate local link (${url}): ${error instanceof Error ? error.message : error}`);
    }
  });
  return errors;
}
