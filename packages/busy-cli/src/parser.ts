import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { ParsedDocument, Section } from './types/schema.js';
import { parseMarkdown, type MarkdownSource } from './parsers/markdown.js';
import { parseFrontMatter } from './parsers/frontmatter.js';
import { parseSections, getAllSections, findSection } from './parsers/sections.js';
import { extractOperations } from './parsers/operations.js';
import { extractLocalDefs } from './parsers/localdefs.js';
import { extractImports } from './parsers/imports.js';
import { parseTriggers } from './parsers/triggers.js';
import { parseTools } from './parsers/tools.js';
import { debug } from './utils/logger.js';

export interface ParsedSource { document: ParsedDocument; markdown: MarkdownSource; sections: Section[] }

/** One source-to-BUSY lowering for CLI, validation, and workspace graph indexing. */
export function parseSource(content: string, filePath = 'document.busy.md'): ParsedSource {
  const { frontmatter, docId, types, extends: parents } = parseFrontMatter(content, filePath);
  const markdown = parseMarkdown(content);
  const sections = parseSections(content, docId, filePath, markdown);
  const { imports } = extractImports(content, docId, markdown);
  const operations = extractOperations(sections, docId, filePath);
  const localdefs = extractLocalDefs(sections, docId, filePath);
  const setupSection = findSection(sections, 'setup');
  const setup = setupSection ? { kind: 'setup' as const, id: `${docId}::setup`, docId, slug: 'setup', name: 'Setup', content: setupSection.content, types: [], extends: [], sectionRef: setupSection.id } : undefined;
  const meta = Object.fromEntries(Object.entries(frontmatter).filter(([key]) => !['Name', 'Type', 'Extends', 'Description', 'Tags', 'Params'].includes(key)));
  const base = { id: docId, docId, slug: docId.toLowerCase(), name: frontmatter.Name, description: frontmatter.Description,
    content, types, extends: parents, sectionRef: `${docId}#`, imports, localdefs, setup, operations,
    triggers: parseTriggers(content), tools: types.some(t => t.toLowerCase() === 'tool') ? parseTools(content) : [],
    ...(Object.keys(meta).length ? { meta } : {}) };
  const labels = types.map(type => type.toLowerCase());
  let document: ParsedDocument;
  if (labels.includes('tool')) document = { ...base, kind: 'tool' };
  else if (labels.includes('playbook')) document = { ...base, kind: 'playbook', sequence: extractPlaybookSequence(sections) };
  else if (labels.includes('view')) {
    const display = findSection(sections, 'display');
    document = { ...base, kind: 'view', display: display ? getSectionFullContent(display) : undefined, params: parseViewParams(frontmatter.Params) };
  } else if (labels.includes('config')) document = { ...base, kind: 'config' };
  else document = { ...base, kind: 'document' };
  return { document, markdown, sections };
}
export function parseDocument(content: string, filePath = 'document.busy.md'): ParsedDocument {
  return parseSource(content, filePath).document;
}

export function resolveImports(
  document: ParsedDocument,
  basePath: string,
  visited: Set<string> = new Set()
): Record<string, ParsedDocument> {
  const cache = new Map<string, { document: ParsedDocument; anchors: Set<string> }>();
  const expanded = new Set<string>();
  const resolved: Record<string, ParsedDocument> = {};
  const stack = new Set(visited);

  function walk(doc: ParsedDocument, path: string): void {
    const current = resolve(path);
    stack.add(current);
    for (const imp of doc.imports) {
      const hash = imp.target.indexOf('#');
      const targetPath = hash < 0 ? imp.target : imp.target.slice(0, hash);
      const fragment = hash < 0 ? '' : imp.target.slice(hash + 1);
      if (/^[a-z][a-z0-9+.-]*:/i.test(targetPath) || targetPath.includes('{{')) continue;
      const importPath = targetPath ? resolve(dirname(current), decodeURIComponent(targetPath.split('?')[0])) : current;
      if (!existsSync(importPath)) {
        console.warn(`⚠ Import not found: ${targetPath} (resolved to ${importPath})`);
        continue;
      }
      try {
        let entry = cache.get(importPath);
        if (!entry) {
          const content = readFileSync(importPath, 'utf-8');
          entry = { document: parseDocument(content, importPath), anchors: parseMarkdown(content).anchors };
          cache.set(importPath, entry);
        }
        if (fragment && !entry.anchors.has(fragment)) {
          console.warn(`⚠ Anchor '${fragment}' not found in ${targetPath}`);
        }
        // Every alias is resolved and checked, even when its file was cached.
        resolved[imp.label] = entry.document;
        if (stack.has(importPath)) {
          console.warn(`⚠ Circular import skipped: ${targetPath} (from ${current})`);
          continue;
        }
        if (!expanded.has(importPath)) walk(entry.document, importPath);
      } catch (e) {
        console.warn(`⚠ Failed to resolve nested imports in ${targetPath}: ${e}`);
      }
    }
    stack.delete(current);
    expanded.add(current);
  }
  walk(document, basePath);
  return resolved;
}


function getSectionFullContent(section: Section): string {
  let content = section.content;
  for (const child of section.children) {
    const prefix = '#'.repeat(child.depth);
    content += `\n${prefix} ${child.title}\n${getSectionFullContent(child)}`;
  }
  return content.trim();
}

/**
 * Parse Params frontmatter value into typed ViewParam array.
 *
 * Accepts YAML-parsed arrays like:
 *   Params:
 *     - prospect: object (required)
 *     - show_hook: boolean
 *
 * Each entry can be:
 *   - A string like "name: type (required)" or "name: type"
 *   - An object like { name: "prospect", type: "object", required: true }
 */
function parseViewParams(raw: unknown): { name: string; type: string; required: boolean }[] {
  if (!Array.isArray(raw)) return [];

  const params: { name: string; type: string; required: boolean }[] = [];

  for (const entry of raw) {
    if (typeof entry === 'string') {
      // Parse "name: type (required)" or "name: type" or just "name"
      const match = entry.match(/^\s*([\w-]+)\s*(?::\s*(\w+))?\s*(?:\(([^)]*)\))?\s*$/);
      if (match) {
        const name = match[1];
        const type = match[2] ?? 'string';
        const modifiers = (match[3] ?? '').toLowerCase();
        params.push({ name, type, required: modifiers.includes('required') });
      }
    } else if (entry && typeof entry === 'object') {
      // YAML parsed as object — e.g. { prospect: "object (required)" }
      for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
        if (typeof value === 'string') {
          const match = value.match(/^\s*(\w+)?\s*(?:\(([^)]*)\))?\s*$/);
          const type = match?.[1] ?? 'string';
          const modifiers = (match?.[2] ?? '').toLowerCase();
          params.push({ name: key, type, required: modifiers.includes('required') });
        } else if (typeof value === 'object' && value !== null) {
          const v = value as Record<string, unknown>;
          params.push({
            name: v.name as string ?? key,
            type: (v.type as string) ?? 'string',
            required: (v.required as boolean) ?? false,
          });
        }
      }
    }
  }

  return params;
}

/**
 * Extract sequence of operations from a playbook's ExecutePlaybook operation
 * Looks for sections with "Step" in the title and extracts Target metadata
 */
function extractPlaybookSequence(sections: Section[]): string[] {
  const sequence: string[] = [];

  // Find ExecutePlaybook operation in the Operations section
  const allSecs = getAllSections(sections);
  const executePlaybook = allSecs.find(
    (sec) => sec.title.toLowerCase() === 'executeplaybook'
  );

  if (!executePlaybook) {
    return sequence;
  }

  // Look for child sections that are steps (contain "step" in title, case-insensitive)
  for (const child of executePlaybook.children) {
    if (child.title.toLowerCase().includes('step')) {
      // Extract Target field from content
      // Pattern: - **Target:** `OperationName`
      const targetMatch = child.content.match(/^\s*-\s*\*\*Target:\*\*\s*`([^`]+)`/m);
      if (targetMatch) {
        sequence.push(targetMatch[1]);
        debug.parser('Found playbook sequence step: %s -> %s', child.title, targetMatch[1]);
      }
    }
  }

  return sequence;
}
