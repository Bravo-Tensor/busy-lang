import { asMarkdown, parseMarkdown, type MarkdownSource } from './parsers/markdown.js';
import { parseSections } from './parsers/sections.js';
/**
 * Main Parser Module - busy-python compatible document parsing
 *
 * This module provides the main entry points for parsing BUSY documents:
 * - parseDocument: Parse a markdown string into a BusyDocument or ToolDocument
 * - resolveImports: Resolve import references in a document
 */

import { resolve, dirname } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  NewBusyDocument as BusyDocument,  // Use new schema types for busy-python compat
  ToolDocument,
  Metadata,
  MetadataSchema,
  Section,
} from './types/schema.js';
import { parseImports } from './parsers/imports.js';
import { parseOperations } from './parsers/operations.js';
import { parseTriggers } from './parsers/triggers.js';
import { parseTools } from './parsers/tools.js';
import { parseYamlFrontmatterBlock } from './parsers/yaml-frontmatter.js';

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
export function parseDocument(content: string, source?: MarkdownSource, suppliedSections?: Section[]): BusyDocument | ToolDocument {
  // Trim leading whitespace before the opening frontmatter delimiter
  const trimmedContent = content.trimStart();

  // Extract frontmatter - only parse the first block to avoid "multiple documents" error
  // when the body contains --- horizontal rules
  const frontmatterMatch = trimmedContent.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('Missing or empty frontmatter');
  }
  const frontmatterOnly = frontmatterMatch[0];
  const data = parseYamlFrontmatterBlock(frontmatterOnly);

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
  const markdown = source ?? asMarkdown(content);
  const sections = suppliedSections ?? parseSections(content, metadata.name, '', markdown);
  const operations = parseOperations(content, markdown, sections);

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
 * Resolve local imports, validating real Markdown heading anchors.
 * Cache parsed files while using a separate recursion stack for cycles.
 * Missing targets/anchors remain warnings for compatibility.
 */
export function resolveImports(
  document: BusyDocument | ToolDocument,
  basePath: string,
  visited: Set<string> = new Set()
): Record<string, BusyDocument | ToolDocument> {
  const cache = new Map<string, { document: BusyDocument | ToolDocument; anchors: Set<string> }>();
  const expanded = new Set<string>();
  const resolved: Record<string, BusyDocument | ToolDocument> = {};
  const stack = new Set(visited);

  function walk(doc: BusyDocument | ToolDocument, path: string): void {
    const current = resolve(path);
    stack.add(current);
    for (const imp of doc.imports) {
      const importPath = resolve(dirname(current), imp.path);
      if (!existsSync(importPath)) {
        console.warn(`⚠ Import not found: ${imp.path} (resolved to ${importPath})`);
        continue;
      }
      try {
        let entry = cache.get(importPath);
        if (!entry) {
          const content = readFileSync(importPath, 'utf-8');
          entry = { document: parseDocument(content), anchors: headingAnchors(content) };
          cache.set(importPath, entry);
        }
        if (imp.anchor && !entry.anchors.has(imp.anchor.toLowerCase())) {
          console.warn(`⚠ Anchor '${imp.anchor}' not found in ${imp.path}`);
        }
        // Every alias is resolved and checked, even when its file was cached.
        resolved[imp.conceptName] = entry.document;
        if (stack.has(importPath)) {
          console.warn(`⚠ Circular import skipped: ${imp.path} (from ${current})`);
          continue;
        }
        if (!expanded.has(importPath)) walk(entry.document, importPath);
      } catch (e) {
        console.warn(`⚠ Failed to resolve nested imports in ${imp.path}: ${e}`);
      }
    }
    stack.delete(current);
    expanded.add(current);
  }
  walk(document, basePath);
  return resolved;
}

function headingAnchors(content: string): Set<string> {
  return parseMarkdown(content).anchors;
}
