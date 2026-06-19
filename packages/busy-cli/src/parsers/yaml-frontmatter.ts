import * as yaml from 'js-yaml';

export type FrontmatterData = Record<string, unknown>;

export interface ExtractedYamlFrontmatter {
  data: FrontmatterData;
  content: string;
  block: string;
  yaml: string;
}

const FRONTMATTER_BLOCK = /^---\n([\s\S]*?)\n---/;

function asFrontmatterData(value: unknown): FrontmatterData {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as FrontmatterData;
  }
  return {};
}

/**
 * Parse a YAML frontmatter block using js-yaml@4.
 *
 * The input may be either the complete delimiter-wrapped block or only the YAML body.
 * Only mapping values are returned as frontmatter data; empty or scalar YAML resolves
 * to an empty object, matching the defensive behavior expected by BUSY parsers.
 */
export function parseYamlFrontmatterBlock(blockOrYaml: string): FrontmatterData {
  const match = blockOrYaml.match(FRONTMATTER_BLOCK);
  const yamlSource = match ? match[1] : blockOrYaml;
  return asFrontmatterData(yaml.load(yamlSource) ?? {});
}

/**
 * Extract and parse the first YAML frontmatter block from a markdown document.
 *
 * BUSY documents may contain `---` horizontal rules or YAML examples in the body, so
 * callers intentionally parse only the first delimiter-wrapped block.
 */
export function extractYamlFrontmatter(content: string): ExtractedYamlFrontmatter | null {
  const match = content.match(FRONTMATTER_BLOCK);
  if (!match) {
    return null;
  }

  const block = match[0];
  const yamlSource = match[1];

  return {
    data: parseYamlFrontmatterBlock(yamlSource),
    content: content.slice(block.length),
    block,
    yaml: yamlSource,
  };
}

/**
 * Serialize frontmatter with js-yaml@4 for code paths that need to write BUSY docs.
 */
export function stringifyYamlFrontmatter(data: FrontmatterData, content = ''): string {
  const serialized = yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  }).trimEnd();

  return `---\n${serialized}\n---${content ? `\n${content}` : ''}`;
}
