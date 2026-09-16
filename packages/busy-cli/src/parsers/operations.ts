import { asMarkdown, type MarkdownSource } from './markdown.js';
import { Section, Operation, DocId, Step, Checklist } from '../types/schema.js';
import { getAllSections, getSectionExtends, parseSections } from './sections.js';
import { debug } from '../utils/logger.js';

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
 *
 * @param content - Full markdown document content
 * @returns Array of NewOperation objects
 */
export function operationSections(sections: Section[]): Section[] {
  const declared = new Set<Section>();
  for (const section of sections) {
    if (section.depth === 1 && /^(?:core )?operations(?: section)?$/i.test(section.title.replace(/^\[|\]$/g, ''))) {
      for (const child of section.children) if (child.depth === 2) declared.add(child);
    }
  }
  for (const section of getAllSections(sections)) {
    if (section.depth === 2 && getSectionExtends(section.id).some(type => type.toLowerCase() === 'operation')) declared.add(section);
  }
  return [...declared];
}

export function parseOperations(content: string, source?: MarkdownSource, suppliedSections?: Section[]): Operation[] {
  const markdown = source ?? asMarkdown(content);
  return extractOperations(suppliedSections ?? parseSections(content, 'document', '', markdown), 'document', '');
}

/**
 * Extract Operations from sections
 */
export function extractOperations(
  sections: Section[],
  docId: DocId,
  filePath: string
): Operation[] {
  debug.localdefs('Extracting operations for %s', docId);

  const operations: Operation[] = [];
  for (const child of operationSections(sections)) {
    const operation = createOperation(child, docId, filePath);

    operations.push(operation);
  }

  debug.localdefs('Extracted %d operations', operations.length);

  return operations;
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

  const child = (names: string[]) => section.children.find(c => names.includes(c.title.replace(/^\[|\]$/g, '').toLowerCase()));
  const stepSection = child(['steps']);
  const checklistSection = child(['checklist']);
  const inputSection = child(['input', 'inputs']);
  const outputSection = child(['output', 'outputs']);
  const steps = parseSteps(stepSection?.content ?? section.content);
  const checklist = checklistSection ? parseChecklist('### Checklist\n' + checklistSection.content) ?? undefined : undefined;
  const inputs = inputSection ? parseInputsOutputs('### Inputs\n' + inputSection.content, 'Inputs') : [];
  const outputs = outputSection ? parseInputsOutputs('### Outputs\n' + outputSection.content, 'Outputs') : [];

  // Get extends from section heading (e.g., ## [ValidateInput][SomeType])
  const extends_ = getSectionExtends(section.id);

  return {
    kind: 'operation',
    id,
    docId,
    slug,
    name: section.title.replace(/^\[([^\]]+)\]$/, '$1'),
    content: section.content,
    types: [],
    extends: extends_,
    sectionRef: section.id, // sectionRef uses # for section references
    inputs,
    outputs,
    steps,
    checklist,
  };
}
