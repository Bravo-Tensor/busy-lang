import { FrontMatter, FrontMatterSchema, ConceptBase } from '../types/schema.js';
import { normalizeDocId, getBasename } from '../utils/slugify.js';
import { debug, warn } from '../utils/logger.js';
import { extractYamlFrontmatter } from './yaml-frontmatter.js';

export interface ParsedFrontMatter {
  frontmatter: FrontMatter;
  content: string;
  docId: string;
  kind: ConceptBase['kind'];
  types: string[];
  extends: string[];
}

/**
 * Parse front-matter from markdown content
 */
export function parseFrontMatter(
  fileContent: string,
  filePath: string
): ParsedFrontMatter {
  const parsed = extractYamlFrontmatter(fileContent.trimStart());
  if (!parsed) throw new Error('Missing or empty frontmatter');
  const frontmatter = FrontMatterSchema.parse(parsed.data);
  const content = parsed.content;

  // Normalize docId from Name or filename
  const docId = frontmatter.Name
    ? normalizeDocId(frontmatter.Name)
    : normalizeDocId(getBasename(filePath));

  // Normalize types - strip markdown link brackets like [Document] -> Document
  const types = (frontmatter.Type ?? []).map(stripMarkdownBrackets);

  // Infer kind from types
  const kind = inferKind(types);

  // Normalize extends - also strip brackets
  const extendsFromFm = (frontmatter.Extends ?? []).map(stripMarkdownBrackets);
  const extendsFromTypes = inferExtendsFromTypes(types);
  const extends_ = Array.from(new Set([...extendsFromFm, ...extendsFromTypes]));

  // Normalize tags
  const tags = (frontmatter.Tags ?? []).map(stripMarkdownBrackets);

  debug.frontmatter(
    'Parsed: docId=%s, kind=%s, types=%o, extends=%o',
    docId,
    kind,
    types,
    extends_
  );

  return {
    frontmatter: {
      ...frontmatter,
      Type: types,
      Extends: extends_,
      Tags: tags,
    },
    content,
    docId,
    kind,
    types,
    extends: extends_,
  };
}

/**
 * Strip markdown link brackets from a string
 * [Document] -> Document
 * [[Document]] -> Document
 */
function stripMarkdownBrackets(str: string): string {
  return str.replace(/^\[+|\]+$/g, '');
}

/**
 * Infer kind from types array
 */
function inferKind(types: string[]): ConceptBase['kind'] {
  const typesLower = types.map((t) => t.toLowerCase());

  if (typesLower.includes('document')) return 'document';
  if (typesLower.includes('operation')) return 'operation';
  if (typesLower.includes('checklist')) return 'checklist';
  if (typesLower.includes('tool')) return 'tool';
  if (typesLower.includes('playbook')) return 'playbook';

  return 'concept';
}

/**
 * Infer extends from types
 * All Type references should be included in extends
 */
function inferExtendsFromTypes(types: string[]): string[] {
  // All types are also extends - they define what this concept is based on
  return types;
}
