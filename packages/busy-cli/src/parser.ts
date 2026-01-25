/**
 * Main Parser Module - busy-python compatible document parsing
 *
 * This module provides the main entry points for parsing BUSY documents:
 * - parseDocument: Parse a markdown string into a BusyDocument or ToolDocument
 * - resolveImports: Resolve import references in a document
 */

import matter from 'gray-matter';
import { resolve, dirname } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  NewBusyDocument as BusyDocument,  // Use new schema types for busy-python compat
  ToolDocument,
  Metadata,
  MetadataSchema,
} from './types/schema.js';
import { parseImports } from './parsers/imports.js';
import { parseOperations } from './parsers/operations.js';
import { parseTriggers } from './parsers/triggers.js';
import { parseTools } from './parsers/tools.js';

/**
 * Parse local definitions from markdown content
 */
function parseLocalDefinitions(content: string): Array<{ name: string; content: string }> {
  const definitions: Array<{ name: string; content: string }> = [];

  // Find Local Definitions section
  const localDefsMatch = content.match(/^#\s*\[?Local\s*Definitions\]?\s*$/im);

  if (!localDefsMatch) {
    return definitions;
  }

  // Get content after Local Definitions heading
  const startIndex = localDefsMatch.index! + localDefsMatch[0].length;
  const restContent = content.slice(startIndex);

  // Find next top-level heading
  const nextH1Match = restContent.match(/\n#\s+[^\#]/);
  const defsContent = nextH1Match
    ? restContent.slice(0, nextH1Match.index)
    : restContent;

  // Split by ## headings
  const parts = defsContent.split(/\n(?=##\s+)/);

  for (const part of parts) {
    if (!part.trim()) continue;

    // Match definition heading: ## DefinitionName
    const headingMatch = part.match(/^##\s+([^\n]+)\s*\n?([\s\S]*)/);

    if (headingMatch) {
      const name = headingMatch[1].trim();
      const defContent = (headingMatch[2] || '').trim();

      definitions.push({
        name,
        content: defContent,
      });
    }
  }

  return definitions;
}

/**
 * Parse setup section from markdown content
 */
function parseSetup(content: string): string | undefined {
  // Find Setup section
  const setupMatch = content.match(/^#\s*\[?Setup\]?\s*$/im);

  if (!setupMatch) {
    return undefined;
  }

  // Get content after Setup heading
  const startIndex = setupMatch.index! + setupMatch[0].length;
  const restContent = content.slice(startIndex);

  // Find next top-level heading
  const nextH1Match = restContent.match(/\n#\s+[^\#]/);
  const setupContent = nextH1Match
    ? restContent.slice(0, nextH1Match.index)
    : restContent;

  const trimmed = setupContent.trim();
  return trimmed || undefined;
}

/**
 * Parse metadata from frontmatter
 */
function parseMetadata(data: Record<string, any>): Metadata {
  // Normalize Type field - YAML might parse [Document] as array
  let type = data.Type;
  if (Array.isArray(type)) {
    type = `[${type.join(', ')}]`;
  } else if (typeof type === 'string' && !type.startsWith('[')) {
    type = `[${type}]`;
  }

  const metadata: Metadata = {
    name: data.Name || '',
    type: type || '[Document]',
    description: data.Description || '',
  };

  // Add provider if present (for tool documents)
  if (data.Provider) {
    metadata.provider = data.Provider;
  }

  // Validate
  const result = MetadataSchema.safeParse(metadata);
  if (!result.success) {
    throw new Error(`Invalid metadata: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Parse a BUSY markdown document
 *
 * @param content - The markdown content to parse
 * @returns BusyDocument or ToolDocument (if Type is [Tool])
 * @throws Error if frontmatter is missing or invalid
 */
export function parseDocument(content: string): BusyDocument | ToolDocument {
  // Trim leading whitespace for gray-matter
  const trimmedContent = content.trimStart();

  // Extract frontmatter - only parse the first block to avoid "multiple documents" error
  // when the body contains --- horizontal rules
  const frontmatterMatch = trimmedContent.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('Missing or empty frontmatter');
  }
  const frontmatterOnly = frontmatterMatch[0];
  const { data } = matter(frontmatterOnly);

  if (!data || Object.keys(data).length === 0) {
    throw new Error('Missing or empty frontmatter');
  }

  // Parse metadata
  const metadata = parseMetadata(data);

  // Parse imports
  const { imports } = parseImports(trimmedContent);

  // Parse local definitions
  const definitions = parseLocalDefinitions(trimmedContent);

  // Parse setup
  const setup = parseSetup(trimmedContent);

  // Parse operations
  const operations = parseOperations(trimmedContent);

  // Parse triggers
  const triggers = parseTriggers(trimmedContent);

  // Check if this is a tool document
  const isToolDocument = metadata.type.toLowerCase().includes('tool');

  if (isToolDocument) {
    // Parse tools section
    const tools = parseTools(trimmedContent);

    const toolDoc: ToolDocument = {
      metadata,
      imports,
      definitions,
      setup,
      operations,
      triggers,
      tools,
    };

    return toolDoc;
  }

  const doc: BusyDocument = {
    metadata,
    imports,
    definitions,
    setup,
    operations,
    triggers,
  };

  return doc;
}

/**
 * Resolve imports in a document to their parsed documents
 *
 * @param document - The document with imports to resolve
 * @param basePath - Base path for resolving relative imports
 * @param visited - Set of visited paths (for circular import detection)
 * @returns Record mapping concept names to their resolved documents
 * @throws Error if circular import detected or file not found
 */
export function resolveImports(
  document: BusyDocument | ToolDocument,
  basePath: string,
  visited: Set<string> = new Set()
): Record<string, BusyDocument | ToolDocument> {
  const resolved: Record<string, BusyDocument | ToolDocument> = {};

  for (const imp of document.imports) {
    // Resolve the import path
    const importPath = resolve(dirname(basePath), imp.path);

    // Check for circular imports
    if (visited.has(importPath)) {
      throw new Error(`Circular import detected: ${importPath}`);
    }

    // Check if file exists
    if (!existsSync(importPath)) {
      throw new Error(`Import not found: ${imp.path} (resolved to ${importPath})`);
    }

    // Mark as visited
    visited.add(importPath);

    try {
      // Read and parse the imported document
      const importContent = readFileSync(importPath, 'utf-8');
      const importedDoc = parseDocument(importContent);

      // Validate anchor if specified
      if (imp.anchor) {
        // Check if anchor exists in operations or definitions
        const hasOperation = importedDoc.operations.some(
          (op) => op.name.toLowerCase() === imp.anchor!.toLowerCase() ||
                  slugify(op.name) === imp.anchor!.toLowerCase()
        );
        const hasDefinition = importedDoc.definitions.some(
          (def) => def.name.toLowerCase() === imp.anchor!.toLowerCase() ||
                   slugify(def.name) === imp.anchor!.toLowerCase()
        );

        if (!hasOperation && !hasDefinition) {
          throw new Error(`Anchor '${imp.anchor}' not found in ${imp.path}`);
        }
      }

      // Store resolved document
      resolved[imp.conceptName] = importedDoc;

      // Recursively resolve imports in the imported document
      const nestedResolved = resolveImports(importedDoc, importPath, visited);
      Object.assign(resolved, nestedResolved);
    } finally {
      // Remove from visited after processing (allow same doc in different branches)
      visited.delete(importPath);
    }
  }

  return resolved;
}

/**
 * Simple slugify function for anchor matching
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}
