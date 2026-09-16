import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import type { Root, RootContent, Definition } from 'mdast';

function text(node: any): string {
  if (node.type === 'html') return '';
  return typeof node.value === 'string' ? node.value : (node.children || []).map(text).join('');
}

/** Validate declarations, never headings embedded in code, quotes, or template output. */
export function validateOperationNames(content: string): string[] {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content) as Root;
  const definitions = new Map<string, string>();
  visit(tree, 'definition', (node: Definition) => {
    const key = node.identifier.toUpperCase();
    if (!definitions.has(key)) definitions.set(key, node.url);
  });
  const errors: string[] = [];
  let inOperations = false;
  for (const node of tree.children as RootContent[]) {
    if (node.type !== 'heading') continue;
    const name = text(node).replace(/^\[([^\]]+)\]$/, '$1').trim();
    if (node.depth === 1) {
      inOperations = /^(?:core )?operations(?: section)?$/i.test(name);
      continue;
    }
    if (node.depth !== 2) continue;
    let typedOperation = false;
    visit(node, child => {
      const url = child.type === 'link' ? child.url : child.type === 'linkReference'
        ? definitions.get(child.identifier.toUpperCase()) : undefined;
      if (url && /(?:^|\/)operation\.busy\.md(?:#operation)?$/.test(url)) typedOperation = true;
    });
    if ((inOperations || typedOperation) && !/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      errors.push(`Line ${node.position?.start.line}: Operation "${name}" must use lower camelCase (start lowercase; letters and digits only)`);
    }
  }
  return errors;
}
