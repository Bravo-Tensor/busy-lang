import { Section, LegacyOperation, DocId, Step, Checklist, NewOperation } from '../types/schema.js';
import { getAllSections, findSection, getSectionExtends } from './sections.js';
import { debug } from '../utils/logger.js';

const OPERATIONS_SECTION_ALIASES = [
  'operations',
  'operations-section',
];

// =============================================================================
// NEW PARSER FUNCTIONS - busy-python compatible
// =============================================================================

/**
 * Parse numbered steps from markdown content
 * Returns Step objects with stepNumber, instruction, and operationReferences
 *
 * @param content - Markdown content to parse
 * @returns Array of Step objects
 */
export function parseSteps(content: string): Step[] {
  const steps: Step[] = [];

  // Find Steps section if present
  const stepsMatch = content.match(/###\s*\[?Steps\]?\s*\n([\s\S]*?)(?=\n###|\n##|$)/i);
  const textToParse = stepsMatch ? stepsMatch[1] : content;

  // Split content by lines and process
  const lines = textToParse.split('\n');
  let currentStepNumber = 0;
  let currentInstruction = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for numbered step start: "1. instruction"
    const stepMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);

    if (stepMatch) {
      // Save previous step if exists
      if (currentStepNumber > 0 && currentInstruction) {
        steps.push(createStepObject(currentStepNumber, currentInstruction));
      }

      currentStepNumber = parseInt(stepMatch[1], 10);
      currentInstruction = stepMatch[2];
    } else if (currentStepNumber > 0 && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
      // Continuation of current step (indented or regular text)
      currentInstruction += ' ' + trimmed;
    }
  }

  // Add final step
  if (currentStepNumber > 0 && currentInstruction) {
    steps.push(createStepObject(currentStepNumber, currentInstruction));
  }

  return steps;
}

/**
 * Helper to create a Step object with operation references extracted
 */
function createStepObject(stepNumber: number, instruction: string): Step {
  instruction = instruction.trim();

  // Extract operation references: [OperationName]
  const operationReferences: string[] = [];
  const refPattern = /\[([^\]]+)\]/g;
  let refMatch;
  while ((refMatch = refPattern.exec(instruction)) !== null) {
    // Skip if it looks like a markdown link [text](url)
    const afterBracket = instruction.slice(refMatch.index + refMatch[0].length);
    if (!afterBracket.startsWith('(')) {
      operationReferences.push(refMatch[1]);
    }
  }

  return {
    stepNumber,
    instruction,
    operationReferences: operationReferences.length > 0 ? operationReferences : undefined,
  };
}

/**
 * Parse checklist items from markdown content
 * Returns Checklist object with items array, or null if no checklist found
 *
 * @param content - Markdown content to parse
 * @returns Checklist object or null
 */
export function parseChecklist(content: string): Checklist | null {
  // Find Checklist section
  const checklistMatch = content.match(/###\s*\[?Checklist\]?\s*\n([\s\S]*?)(?=\n###|\n##|$)/i);

  if (!checklistMatch) {
    return null;
  }

  const checklistContent = checklistMatch[1];
  const items: string[] = [];

  // Split by lines and process bullet items
  const lines = checklistContent.split('\n');
  let currentItem = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for bullet item start (- or *)
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (bulletMatch) {
      // Save previous item if exists
      if (currentItem) {
        items.push(currentItem.trim());
      }
      currentItem = bulletMatch[1];
    } else if (currentItem && trimmed && !trimmed.startsWith('#')) {
      // Continuation of current item
      currentItem += ' ' + trimmed;
    }
  }

  // Add final item
  if (currentItem) {
    items.push(currentItem.trim());
  }

  if (items.length === 0) {
    return null;
  }

  return { items };
}

/**
 * Parse inputs/outputs from an operation section
 */
function parseInputsOutputs(content: string, sectionName: string): string[] {
  const pattern = new RegExp(
    `###\\s*\\[?${sectionName}\\]?\\s*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`,
    'i'
  );
  const match = content.match(pattern);

  if (!match) {
    return [];
  }

  const items: string[] = [];
  const lines = match[1].split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
    }
  }

  return items;
}

/**
 * Parse operations from markdown content
 * Returns array of Operation objects matching busy-python format
 *
 * @param content - Full markdown document content
 * @returns Array of NewOperation objects
 */
export function parseOperations(content: string): NewOperation[] {
  const operations: NewOperation[] = [];

  // Find Operations section - handle both with and without brackets
  // Match # Operations or # [Operations]
  const operationsMatch = content.match(
    /^#\s*\[?Operations\]?\s*$/im
  );

  if (!operationsMatch) {
    return [];
  }

  // Get content after Operations heading until next top-level section or end
  const startIndex = operationsMatch.index! + operationsMatch[0].length;
  const restContent = content.slice(startIndex);

  // Find next top-level heading (# not ##)
  const nextH1Match = restContent.match(/\n#\s+[^\#]/);
  const operationsContent = nextH1Match
    ? restContent.slice(0, nextH1Match.index)
    : restContent;

  // Split by ## headings to find individual operations
  // Use a simpler approach: split by ## and process each part
  const parts = operationsContent.split(/\n(?=##\s+)/);

  for (const part of parts) {
    if (!part.trim()) continue;

    // Match operation heading: ## OperationName or ## [OperationName][Type]
    const headingMatch = part.match(/^##\s+(?:\[([^\]]+)\](?:\[[^\]]*\])?|([^\n]+))\s*\n?([\s\S]*)$/);

    if (headingMatch) {
      const name = (headingMatch[1] || headingMatch[2]).trim();
      const opContent = headingMatch[3] || '';

      const steps = parseSteps(opContent);
      const checklist = parseChecklist(opContent);
      const inputs = parseInputsOutputs(opContent, 'Inputs');
      const outputs = parseInputsOutputs(opContent, 'Outputs');

      operations.push({
        name,
        inputs,
        outputs,
        steps,
        checklist: checklist || undefined,
      });
    }
  }

  return operations;
}

// =============================================================================
// LEGACY FUNCTIONS - kept for backward compatibility
// =============================================================================

// Type alias for backward compatibility
type Operation = LegacyOperation;

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

    // Skip empty operations (just reference headers with no content)
    // These are placeholders that should be inherited from parent documents
    if (operation.content.trim().length === 0 &&
        operation.steps.length === 0 &&
        operation.checklist.length === 0 &&
        child.children.length === 0) {
      debug.localdefs('Skipping empty operation: %s (likely a reference header)', operation.name);
      continue;
    }

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
  const id = `${docId}::${slug}`; // Use :: for concept IDs

  // Parse steps and checklist from content
  const { steps, checklist } = parseOperationContent(section);

  // Get extends from section heading (e.g., ## [ValidateInput][SomeType])
  const extends_ = getSectionExtends(section.id);

  return {
    kind: 'operation',
    id,
    docId,
    slug,
    name: section.title,
    content: section.content,
    types: [],
    extends: extends_,
    sectionRef: section.id, // sectionRef uses # for section references
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
} {
  const steps: string[] = [];
  const checklist: string[] = [];

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

  return { steps, checklist };
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
