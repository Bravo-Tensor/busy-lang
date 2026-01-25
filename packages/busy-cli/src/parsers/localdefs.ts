import { Section, LocalDef, DocId } from '../types/schema.js';
import { createSlug } from '../utils/slugify.js';
import { findSection, getAllSections, getSectionExtends } from './sections.js';
import { debug } from '../utils/logger.js';

const LOCAL_DEFS_ALIASES = [
  'local definitions',
  'definitions',
  'glossary',
  'local-definitions-section',
];

/**
 * Extract Local Definitions from sections
 */
export function extractLocalDefs(
  sections: Section[],
  docId: DocId,
  filePath: string
): LocalDef[] {
  debug.localdefs('Extracting local definitions for %s', docId);

  // Find the Local Definitions section
  const localDefsSection = findLocalDefinitionsSection(sections);

  if (!localDefsSection) {
    debug.localdefs('No Local Definitions section found');
    return [];
  }

  debug.localdefs(
    'Found Local Definitions section: %s',
    localDefsSection.title
  );

  // Extract all subheadings as LocalDefs
  const localdefs: LocalDef[] = [];

  for (const child of getAllSections(localDefsSection.children)) {
    const localdef = createLocalDef(child, docId, filePath);
    localdefs.push(localdef);
  }

  debug.localdefs('Extracted %d local definitions', localdefs.length);

  return localdefs;
}

/**
 * Find the Local Definitions section (case-insensitive)
 */
function findLocalDefinitionsSection(sections: Section[]): Section | undefined {
  for (const alias of LOCAL_DEFS_ALIASES) {
    const section = findSection(sections, alias);
    if (section) {
      return section;
    }
  }
  return undefined;
}

/**
 * Create a LocalDef from a section
 */
function createLocalDef(
  section: Section,
  docId: DocId,
  filePath: string
): LocalDef {
  const slug = section.slug;
  const id = `${docId}::${slug}`;

  // Parse extends from content
  const { extends: extendsFromContent } = parseLocalDefAttrs(section.content);

  // Get extends from section heading (e.g., ## [MyDef][Type])
  const extendsFromHeading = getSectionExtends(section.id);

  // Combine both sources of extends
  const extends_ = Array.from(new Set([...extendsFromContent, ...extendsFromHeading]));

  return {
    kind: 'localdef',
    id,
    docId,
    slug,
    name: section.title,
    content: section.content,
    types: [],
    extends: extends_,
    sectionRef: section.id,
  };
}

/**
 * Parse attributes from local def content
 * Looks for:
 * 1. Fenced blocks with "yaml busy" or "json busy"
 * 2. Inline patterns like "Extends: [...]" or "_Extends:_"
 */
function parseLocalDefAttrs(content: string): {
  attrs: Record<string, unknown>;
  extends: string[];
} {
  const attrs: Record<string, unknown> = {};
  let extends_: string[] = [];

  // Check for fenced blocks first
  const yamlBusyMatch = content.match(/```(?:yaml|json)\s+busy\s*\n([\s\S]*?)```/);
  if (yamlBusyMatch) {
    try {
      // Simple parsing - just look for key: value pairs
      const block = yamlBusyMatch[1];
      const lines = block.split('\n');

      for (const line of lines) {
        const match = line.match(/^\s*(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          // Try to parse as JSON
          try {
            attrs[key] = JSON.parse(value);
          } catch {
            attrs[key] = value.trim();
          }
        }
      }

      if (attrs.Extends) {
        extends_ = Array.isArray(attrs.Extends)
          ? attrs.Extends
          : [attrs.Extends];
      }
    } catch (err) {
      debug.localdefs('Failed to parse fenced block: %s', err);
    }
  }

  // Look for inline Extends patterns
  const extendsPatterns = [
    /^Extends:\s*\[(.*?)\]/im,
    /^_Extends:_\s*\[(.*?)\]/im,
    /^Extends:\s*(.+)$/im,
  ];

  for (const pattern of extendsPatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = match[1].trim();
      // Parse as comma-separated list or JSON array
      try {
        const parsed = JSON.parse(`[${value}]`);
        extends_ = [...extends_, ...parsed];
      } catch {
        // Try comma-separated
        extends_ = [
          ...extends_,
          ...value.split(',').map((s) => s.trim().replace(/['"]/g, '')),
        ];
      }
      break;
    }
  }

  return { attrs, extends: Array.from(new Set(extends_)) };
}
