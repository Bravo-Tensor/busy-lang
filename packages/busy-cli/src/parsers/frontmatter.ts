import matter from 'gray-matter';
import { FrontMatter, FrontMatterSchema, ConceptBase } from '../types/schema.js';
import { normalizeDocId, getBasename } from '../utils/slugify.js';
import { debug, warn } from '../utils/logger.js';

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
  let data: any;
  let content: string;

  // Extract only the first frontmatter block to avoid "multiple documents" error
  // when the body contains --- horizontal rules
  const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try {
      const parsed = matter(frontmatterMatch[0]);
      data = parsed.data;
      content = fileContent.slice(frontmatterMatch[0].length);
    } catch (err) {
      warn(`Failed to parse YAML frontmatter in ${filePath}: ${err}`, { file: filePath });
      data = {};
      content = fileContent;
    }
  } else {
    // No frontmatter found
    data = {};
    content = fileContent;
  }

  debug.frontmatter('Parsing frontmatter for %s', filePath);

  // Validate frontmatter
  let frontmatter: FrontMatter;
  try {
    frontmatter = FrontMatterSchema.parse(data);
  } catch (err) {
    warn(`Invalid frontmatter schema in ${filePath}`, { file: filePath });
    // Provide defaults if validation fails
    frontmatter = {
      Name: getBasename(filePath),
      Type: [],
      Description: undefined,
      Tags: [],
      Extends: [],
    };
  }

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
