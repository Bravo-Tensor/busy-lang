import { Section, Operation, DocId } from '../types/schema.js';
import { getAllSections, findSection } from './sections.js';
import { debug } from '../utils/logger.js';

const OPERATIONS_SECTION_ALIASES = [
  'operations',
  'operations-section',
];

/**
 * Extract Operations from sections
 */
export function extractOperations(
  sections: Section[],
  docId: DocId,
  filePath: string
): Operation[] {
  debug.localdefs('Extracting operations for %s', docId);

  // Find the Operations section
  const operationsSection = findOperationsSection(sections);

  if (!operationsSection) {
    debug.localdefs('No Operations section found');
    return [];
  }

  debug.localdefs('Found Operations section: %s', operationsSection.title);

  // Extract all direct children as Operations
  const operations: Operation[] = [];

  for (const child of operationsSection.children) {
    const operation = createOperation(child, docId, filePath);
    operations.push(operation);
  }

  debug.localdefs('Extracted %d operations', operations.length);

  return operations;
}

/**
 * Find the Operations section (case-insensitive)
 */
function findOperationsSection(sections: Section[]): Section | undefined {
  for (const alias of OPERATIONS_SECTION_ALIASES) {
    const section = findSection(sections, alias);
    if (section) {
      return section;
    }
  }
  return undefined;
}

/**
 * Create an Operation from a section
 */
function createOperation(
  section: Section,
  docId: DocId,
  filePath: string
): Operation {
  const slug = section.slug;
  const id = `${docId}#${slug}`;

  // Parse steps and checklist from content
  const { steps, checklist, attrs } = parseOperationContent(section);

  return {
    kind: 'operation',
    id,
    docId,
    slug,
    name: section.title,
    description: attrs.Description as string | undefined,
    types: [],
    extends: section.extends,
    tags: section.tags,
    attrs,
    path: filePath,
    lineStart: section.lineStart,
    lineEnd: section.lineEnd,
    depth: section.depth,
    content: section.content,
    steps,
    checklist,
  };
}

/**
 * Parse operation content for steps and checklist
 */
function parseOperationContent(section: Section): {
  steps: string[];
  checklist: string[];
  attrs: Record<string, unknown>;
} {
  const steps: string[] = [];
  const checklist: string[] = [];
  const attrs: Record<string, unknown> = {};

  // Look for Steps subsection
  const stepsSection = section.children.find(
    (child) => child.title.toLowerCase() === 'steps'
  );

  if (stepsSection) {
    steps.push(...extractListItems(stepsSection.content));
  } else {
    // Try to find numbered lists in main content
    steps.push(...extractListItems(section.content));
  }

  // Look for Checklist subsection
  const checklistSection = section.children.find(
    (child) => child.title.toLowerCase() === 'checklist'
  );

  if (checklistSection) {
    checklist.push(...extractListItems(checklistSection.content));
  }

  return { steps, checklist, attrs };
}

/**
 * Extract list items from markdown content
 * Handles both ordered (1. 2. 3.) and unordered (- *) lists
 */
function extractListItems(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  let inList = false;
  let currentItem = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this is a list item
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (orderedMatch || unorderedMatch) {
      // Save previous item if any
      if (currentItem) {
        items.push(currentItem.trim());
      }

      // Start new item
      currentItem = (orderedMatch?.[1] || unorderedMatch?.[1] || '').trim();
      inList = true;
    } else if (inList && trimmed && !trimmed.startsWith('#')) {
      // Continuation of current item
      currentItem += ' ' + trimmed;
    } else if (inList && !trimmed) {
      // Empty line might end the list
      if (currentItem) {
        items.push(currentItem.trim());
        currentItem = '';
      }
      inList = false;
    }
  }

  // Add final item
  if (currentItem) {
    items.push(currentItem.trim());
  }

  return items;
}
