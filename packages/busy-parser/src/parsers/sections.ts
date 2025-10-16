import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import type { Root, Heading, Node } from 'mdast';
import { Section, DocId } from '../types/schema.js';
import { createSlug } from '../utils/slugify.js';
import { debug } from '../utils/logger.js';

interface HeadingInfo {
  depth: number;
  title: string;
  slug: string;
  lineStart: number;
  lineEnd: number;
  extends: string[];
}

/**
 * Parse markdown content into a section tree
 */
export function parseSections(
  content: string,
  docId: DocId,
  filePath: string
): Section[] {
  debug.sections('Parsing sections for %s', docId);

  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']);

  const tree = processor.parse(content) as Root;

  // Extract headings with their positions
  const headings: HeadingInfo[] = [];

  visit(tree, 'heading', (node: Heading) => {
    const { title, extends: extendsArr } = parseHeadingNode(node);
    const slug = createSlug(title);
    const lineStart = node.position?.start.line ?? 0;
    const lineEnd = node.position?.end.line ?? 0;

    if (extendsArr.length > 0) {
      debug.sections('Parsed heading: "%s" extends %o', title, extendsArr);
    }

    headings.push({
      depth: node.depth,
      title,
      slug,
      lineStart,
      lineEnd,
      extends: extendsArr,
    });
  });

  // Build section tree and populate extends map
  const sections = buildSectionTree(headings, content, docId, filePath);

  debug.sections('Found %d top-level sections', sections.length);

  return sections;
}

/**
 * Get extends information for a section by ID
 * This is stored separately since Section schema doesn't include extends
 */
const sectionExtendsMap = new Map<string, string[]>();

export function getSectionExtends(sectionId: string): string[] {
  return sectionExtendsMap.get(sectionId) ?? [];
}

/**
 * Extract plain text from a node
 */
function extractTextFromNode(node: Node): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(extractTextFromNode).join('');
  }
  return '';
}

/**
 * Parse heading node to extract title and extends information
 * Patterns:
 * - [Title][Type] -> title="Title", extends=["Type"]
 * - [Title][Type1][Type2] -> title="Title", extends=["Type1", "Type2"]
 * - Regular Title -> title="Regular Title", extends=[]
 *
 * When [Type] is a defined reference link (like [Operation]:./operation.md),
 * markdown parses [Title][Type] as a linkReference node with:
 * - children: [text node with "Title"]
 * - label: "Type"
 * - referenceType: "full"
 */
function parseHeadingNode(node: Heading): { title: string; extends: string[] } {
  const children = node.children || [];

  // Check for linkReference pattern: [Title][Type]
  if (children.length === 1 && children[0].type === 'linkReference') {
    const linkRef = children[0] as any;
    if (linkRef.referenceType === 'full' && linkRef.label) {
      // This is [Title][Type] where Type is a defined reference
      const title = extractTextFromNode(linkRef);
      const extends_ = [linkRef.label];
      return { title, extends: extends_ };
    }
  }

  // Fallback: extract plain text
  const rawTitle = extractTextFromNode(node);
  return { title: rawTitle, extends: [] };
}

/**
 * Build a hierarchical section tree from flat headings
 */
function buildSectionTree(
  headings: HeadingInfo[],
  content: string,
  docId: DocId,
  filePath: string
): Section[] {
  if (headings.length === 0) {
    return [];
  }

  const lines = content.split('\n');
  const sections: Section[] = [];
  const stack: Section[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];

    // Determine content boundaries
    const contentStart = heading.lineEnd;
    const contentEnd = nextHeading
      ? nextHeading.lineStart - 1
      : lines.length;

    // Extract content for this section
    const sectionContent = lines
      .slice(contentStart, contentEnd)
      .join('\n')
      .trim();

    // Create section
    const section: Section = {
      kind: 'section',
      id: `${docId}#${heading.slug}`,
      docId,
      slug: heading.slug,
      title: heading.title,
      depth: heading.depth,
      path: filePath,
      lineStart: heading.lineStart,
      lineEnd: contentEnd,
      content: sectionContent,
      children: [],
    };

    // Store extends metadata separately (not in Section schema)
    if (heading.extends.length > 0) {
      sectionExtendsMap.set(section.id, heading.extends);
    }

    // Find parent and add to tree
    while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level section
      sections.push(section);
    } else {
      // Child section
      stack[stack.length - 1].children.push(section);
    }

    stack.push(section);
  }

  return sections;
}

/**
 * Find a section by name/slug (case-insensitive)
 */
export function findSection(
  sections: Section[],
  nameOrSlug: string
): Section | undefined {
  const target = nameOrSlug.toLowerCase();

  for (const section of sections) {
    if (
      section.title.toLowerCase() === target ||
      section.slug.toLowerCase() === target
    ) {
      return section;
    }

    // Search recursively
    const found = findSection(section.children, nameOrSlug);
    if (found) {
      return found;
    }
  }

  return undefined;
}

/**
 * Get all sections recursively (flatten tree)
 */
export function getAllSections(sections: Section[]): Section[] {
  const result: Section[] = [];

  for (const section of sections) {
    result.push(section);
    result.push(...getAllSections(section.children));
  }

  return result;
}
