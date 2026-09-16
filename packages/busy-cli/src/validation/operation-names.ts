import { asMarkdown, type MarkdownSource } from '../parsers/markdown.js';
import { parseSections } from '../parsers/sections.js';
import { operationSections } from '../parsers/operations.js';
import type { Section } from '../types/schema.js';

/** Check BUSY declarations discovered by the same lowering used by the graph loader. */
export function validateOperationNames(content: string | MarkdownSource, sections?: Section[]): string[] {
  const source = asMarkdown(content);
  return operationSections(sections ?? parseSections(source.content, 'document', '', source)).flatMap(section => {
    const name = section.title.replace(/^\[([^\]]+)\]$/, '$1').trim();
    return /^[a-z][a-zA-Z0-9]*$/.test(name) ? [] : [
      `Line ${section.lineStart}: Operation "${name}" must use lower camelCase (start lowercase; letters and digits only)`,
    ];
  });
}
