import createDebug from 'debug';

export const debug = {
  parser: createDebug('busy:parser'),
  frontmatter: createDebug('busy:frontmatter'),
  sections: createDebug('busy:sections'),
  localdefs: createDebug('busy:localdefs'),
  imports: createDebug('busy:imports'),
  links: createDebug('busy:links'),
  context: createDebug('busy:context'),
};

export function warn(message: string, context?: { file?: string; line?: number }) {
  const location = context?.file
    ? `${context.file}${context.line ? `:${context.line}` : ''}`
    : '';
  console.warn(`[WARN] ${location ? `${location}: ` : ''}${message}`);
}

export function error(message: string, context?: { file?: string; line?: number }) {
  const location = context?.file
    ? `${context.file}${context.line ? `:${context.line}` : ''}`
    : '';
  console.error(`[ERROR] ${location ? `${location}: ` : ''}${message}`);
}
