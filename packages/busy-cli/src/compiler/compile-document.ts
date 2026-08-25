import { createHash } from 'node:crypto';
import path from 'node:path';
import * as yaml from 'js-yaml';
import type { Heading, Node, Root } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { extractYamlFrontmatter } from '../parsers/yaml-frontmatter.js';
import type {
  BusyChecklistItemIR,
  BusyConditionIR,
  BusyDiagnostic,
  BusyDocumentIR,
  BusyDocumentKind,
  BusyEmitIR,
  BusyFieldIR,
  BusyImportIR,
  BusyMetadataIR,
  BusyModelIR,
  BusyOperationIR,
  BusyRoleContextIR,
  BusySectionIR,
  BusySourceSpan,
  BusyStepIR,
  BusyTriggerIR,
} from './types.js';

interface HeadingRecord {
  readonly depth: number;
  readonly title: string;
  readonly annotations: readonly string[];
  readonly startLine: number;
  readonly headingEndLine: number;
}

interface SectionNode extends BusySectionIR {
  readonly directContent: string;
  readonly children: readonly SectionNode[];
}

const SEMANTIC_REFERENCES = new Set([
  'checklist',
  'checklist section',
  'condition',
  'emits',
  'emits section',
  'input',
  'input section',
  'operation',
  'output',
  'output section',
  'private operation',
  'role context',
  'sequence step',
  'steps',
  'steps section',
  'trigger',
  'triggers',
  'triggers section',
]);

export interface CompileBusyDocumentInput {
  readonly content: string;
  /** Workspace-relative POSIX path. */
  readonly path: string;
}

export function compileBusyDocument(input: CompileBusyDocumentInput): BusyDocumentIR {
  const lines = input.content.split(/\r?\n/);
  const diagnostics: BusyDiagnostic[] = [];
  const frontmatter = extractFrontmatter(input, diagnostics);
  const metadata = compileMetadata(frontmatter, input.path, diagnostics);
  const id = stripBusyExtension(input.path);
  const headings = extractHeadings(input.content, lines);
  const sections = buildSections(id, input.path, headings, lines);
  const imports = compileImports(sections, input.path);
  const operations = compileOperations(sections, id, input.path, lines);
  const documentTriggers = [
    ...compileFrontmatterTriggers(frontmatter.Triggers, input.path),
    ...compileDocumentTriggerSections(sections),
  ];
  const kind = inferKind(metadata.typeLabels);
  const model = kind === 'model' ? compileModel(sections) : undefined;

  if (operations.length === 0 && kind === 'playbook') {
    diagnostics.push({
      code: 'playbook-without-operations',
      severity: 'warning',
      message: `Playbook ${metadata.name} has no compiled operations.`,
      span: span(input.path, 1, Math.max(1, lines.length)),
    });
  }

  return Object.freeze({
    id,
    path: input.path,
    sourceHash: createHash('sha256').update(input.content).digest('hex'),
    kind,
    metadata,
    imports: Object.freeze(imports),
    setup: findSection(sections, 'setup'),
    sections: Object.freeze(sections),
    operations: Object.freeze(operations),
    triggers: Object.freeze(documentTriggers),
    ...(model ? { model } : {}),
    diagnostics: Object.freeze(diagnostics),
  });
}

function extractFrontmatter(
  input: CompileBusyDocumentInput,
  diagnostics: BusyDiagnostic[],
): Record<string, unknown> {
  try {
    const extracted = extractYamlFrontmatter(input.content);
    if (extracted) return extracted.data;
  } catch (error) {
    diagnostics.push({
      code: 'invalid-frontmatter',
      severity: 'error',
      message: `Invalid YAML frontmatter: ${String(error)}`,
      span: span(input.path, 1, 1),
    });
    return {};
  }
  diagnostics.push({
    code: 'missing-frontmatter',
    severity: 'error',
    message: 'BUSY documents require YAML frontmatter.',
    span: span(input.path, 1, 1),
  });
  return {};
}

function compileMetadata(
  data: Record<string, unknown>,
  filePath: string,
  diagnostics: BusyDiagnostic[],
): BusyMetadataIR {
  const name = typeof data.Name === 'string' ? data.Name.trim() : '';
  const description = typeof data.Description === 'string'
    ? data.Description.trim()
    : '';
  const typeLabels = normalizeTypeLabels(data.Type);

  for (const [field, value] of [
    ['Name', name],
    ['Description', description],
  ] as const) {
    if (!value) {
      diagnostics.push({
        code: `missing-${field.toLowerCase()}`,
        severity: 'error',
        message: `Frontmatter field ${field} is required.`,
        span: span(filePath, 1, 1),
      });
    }
  }
  if (typeLabels.length === 0) {
    diagnostics.push({
      code: 'missing-type',
      severity: 'error',
      message: 'Frontmatter field Type is required.',
      span: span(filePath, 1, 1),
    });
  }

  return Object.freeze({
    name: name || path.basename(filePath),
    description,
    typeLabels: Object.freeze(typeLabels),
    attributes: Object.freeze({ ...data }),
  });
}

function normalizeTypeLabels(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values.flatMap((item) => typeof item === 'string'
    ? item.replace(/^\[+|\]+$/g, '').split(',').map((part) => part.trim()).filter(Boolean)
    : []);
}

function inferKind(typeLabels: readonly string[]): BusyDocumentKind {
  const labels = typeLabels.map((label) => label.toLowerCase());
  const kinds: BusyDocumentKind[] = [
    'checklist', 'config', 'model', 'package', 'playbook', 'prompt', 'role',
    'tool', 'view', 'workspace', 'document', 'concept',
  ];
  return kinds.find((kind) => labels.includes(kind)) ?? 'document';
}

function extractHeadings(content: string, lines: readonly string[]): HeadingRecord[] {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content) as Root;
  const headings: HeadingRecord[] = [];
  visit(tree, 'heading', (node: Heading) => {
    const startLine = node.position?.start.line ?? 1;
    const headingEndLine = node.position?.end.line ?? startLine;
    const raw = lines[startLine - 1] ?? '';
    const syntax = parseHeadingSyntax(raw, node);
    headings.push({
      depth: node.depth,
      title: syntax.title,
      annotations: syntax.annotations,
      startLine,
      headingEndLine,
    });
  });
  return headings;
}

function parseHeadingSyntax(raw: string, node: Heading): {
  title: string;
  annotations: readonly string[];
} {
  const body = raw.replace(/^\s*#{1,6}\s+/, '').trim();
  const bracketed = [...body.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]!.trim());
  if (body.startsWith('[') && bracketed.length > 0) {
    return {
      title: bracketed[0]!,
      annotations: Object.freeze(bracketed.slice(1)),
    };
  }
  return { title: nodeText(node).trim() || body, annotations: Object.freeze([]) };
}

function nodeText(node: Node): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => nodeText(child as Node)).join('');
  }
  return '';
}

function buildSections(
  documentId: string,
  filePath: string,
  headings: readonly HeadingRecord[],
  lines: readonly string[],
): SectionNode[] {
  const nodes: Array<SectionNode & { mutableChildren: SectionNode[] }> = [];
  const roots: Array<SectionNode & { mutableChildren: SectionNode[] }> = [];
  const stack: Array<SectionNode & { mutableChildren: SectionNode[] }> = [];

  headings.forEach((heading, index) => {
    const nextBoundary = headings.slice(index + 1).find((candidate) => candidate.depth <= heading.depth);
    const endLine = (nextBoundary?.startLine ?? lines.length + 1) - 1;
    const nextHeading = headings[index + 1];
    const directEnd = nextHeading && nextHeading.depth > heading.depth
      ? nextHeading.startLine - 1
      : endLine;
    const id = `${documentId}#${slugify(heading.title)}`;
    const mutableChildren: SectionNode[] = [];
    const node = {
      id,
      title: heading.title,
      annotations: Object.freeze([...heading.annotations]),
      depth: heading.depth,
      content: sliceLines(lines, heading.headingEndLine + 1, endLine),
      directContent: sliceLines(lines, heading.headingEndLine + 1, directEnd),
      children: mutableChildren,
      mutableChildren,
      span: span(filePath, heading.startLine, Math.max(heading.startLine, endLine)),
    };

    while (stack.length > 0 && stack[stack.length - 1]!.depth >= heading.depth) stack.pop();
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1]!.mutableChildren.push(node);
    stack.push(node);
    nodes.push(node);
  });

  return roots.map(freezeSection);
}

function freezeSection(section: SectionNode & { mutableChildren?: SectionNode[] }): SectionNode {
  const children = (section.mutableChildren ?? section.children).map((child) => freezeSection(child));
  return Object.freeze({
    id: section.id,
    title: section.title,
    annotations: section.annotations,
    depth: section.depth,
    content: section.content,
    directContent: section.directContent,
    children: Object.freeze(children),
    span: section.span,
  });
}

function compileImports(sections: readonly SectionNode[], filePath: string): BusyImportIR[] {
  const importsSection = findSection(sections, 'imports');
  if (!importsSection) return [];
  const imports: BusyImportIR[] = [];
  const startLine = importsSection.span.startLine + 1;
  importsSection.content.split('\n').forEach((line, offset) => {
    const match = line.match(/^\s*\[([^\]]+)\]:\s*<?([^\s>]+)>?\s*$/);
    if (!match) return;
    const rawTarget = match[2]!;
    const hashAt = rawTarget.indexOf('#');
    imports.push(Object.freeze({
      name: match[1]!.trim(),
      target: hashAt >= 0 ? rawTarget.slice(0, hashAt) : rawTarget,
      ...(hashAt >= 0 ? { anchor: rawTarget.slice(hashAt + 1) } : {}),
      span: span(filePath, startLine + offset, startLine + offset),
    }));
  });
  return imports;
}

function compileOperations(
  sections: readonly SectionNode[],
  documentId: string,
  filePath: string,
  lines: readonly string[],
): BusyOperationIR[] {
  const operationsSection = findSection(sections, 'operations');
  if (!operationsSection) return [];
  return operationsSection.children.map((operation) => compileOperation(
    operation,
    documentId,
    filePath,
    lines,
  ));
}

function compileOperation(
  operation: SectionNode,
  documentId: string,
  filePath: string,
  lines: readonly string[],
): BusyOperationIR {
  const inputs = findSemanticChild(operation, ['input', 'inputs']);
  const outputs = findSemanticChild(operation, ['output', 'outputs']);
  const steps = findSemanticChild(operation, ['steps']);
  const checklist = findSemanticChild(operation, ['checklist']);
  const triggers = findSemanticChild(operation, ['trigger', 'triggers']);
  const emits = findSemanticChild(operation, ['emit', 'emits']);
  const operationId = `${documentId}::${slugify(operation.title)}`;
  return Object.freeze({
    id: operationId,
    name: operation.title,
    private: operation.title.startsWith('_') || hasSemanticName(operation, 'private operation'),
    description: operation.directContent.trim(),
    inputs: Object.freeze(inputs ? parseFields(inputs) : []),
    outputs: Object.freeze(outputs ? parseFields(outputs) : []),
    triggers: Object.freeze(triggers ? parseTriggerSection(triggers) : []),
    emits: Object.freeze(emits ? parseEmitSection(emits) : []),
    steps: Object.freeze(steps ? parseSteps(steps, operationId, filePath, lines) : []),
    checklist: Object.freeze(checklist ? parseChecklist(checklist, operationId) : []),
    span: operation.span,
  });
}

function parseFields(section: SectionNode): BusyFieldIR[] {
  const table = parseFieldTable(section);
  if (table.length > 0) return table;
  const fields: BusyFieldIR[] = [];
  section.content.split('\n').forEach((line, index) => {
    const raw = line.trim();
    const bullet = raw.match(/^[-*]\s+(?:\[[ xX]\]\s+)?(.+)$/)?.[1];
    if (!bullet) return;
    const nameMatch = bullet.match(/^`([^`]+)`(?:\s*\((optional|required)\))?\s*(?:—|-|:)\s*(.*)$/i)
      ?? bullet.match(/^([^:—]+?)(?:\s*\((optional|required)\))?\s*(?:—|:)\s*(.*)$/i);
    if (!nameMatch) return;
    const name = nameMatch[1]!.trim();
    const qualifier = nameMatch[2]?.toLowerCase();
    fields.push(Object.freeze({
      name,
      description: (nameMatch[3] ?? '').trim(),
      required: qualifier !== 'optional' && !/\boptional\b/i.test(bullet),
      raw,
      span: span(section.span.path, section.span.startLine + 1 + index, section.span.startLine + 1 + index),
    }));
  });
  return fields;
}

function parseFieldTable(section: SectionNode): BusyFieldIR[] {
  const rows = section.content.split('\n').filter((line) => /^\s*\|/.test(line));
  if (rows.length < 3) return [];
  const headers = splitTableRow(rows[0]!).map((value) => value.toLowerCase());
  const nameAt = headers.findIndex((header) => ['field', 'name'].includes(header));
  if (nameAt < 0) return [];
  const typeAt = headers.indexOf('type');
  const descriptionAt = headers.findIndex((header) => ['meaning', 'description'].includes(header));
  return rows.slice(2).flatMap((row, index) => {
    const values = splitTableRow(row);
    const name = values[nameAt]?.replace(/`/g, '').trim();
    if (!name || /^[-:]+$/.test(name)) return [];
    const raw = row.trim();
    return [Object.freeze({
      name,
      description: descriptionAt >= 0 ? values[descriptionAt]?.trim() ?? '' : '',
      ...(typeAt >= 0 && values[typeAt]?.trim() ? { type: values[typeAt]!.trim() } : {}),
      required: !/\boptional\b/i.test(raw),
      raw,
      span: span(section.span.path, section.span.startLine + 3 + index, section.span.startLine + 3 + index),
    })];
  });
}

function splitTableRow(row: string): string[] {
  return row.trim().replace(/^\||\|$/g, '').split('|').map((value) => value.trim());
}

function parseSteps(
  section: SectionNode,
  operationId: string,
  filePath: string,
  lines: readonly string[],
): BusyStepIR[] {
  const headingSteps = section.children.filter((child) => /^step\s+/i.test(child.title));
  if (headingSteps.length > 0) {
    return headingSteps.map((step) => compileHeadingStep(step, operationId, filePath));
  }
  const result: BusyStepIR[] = [];
  const sectionLines = section.content.split('\n');
  let current: { ordinal: string; text: string[]; line: number } | undefined;
  const flush = () => {
    if (!current) return;
    const instruction = current.text.join('\n').trim();
    const stepSpan = span(filePath, current.line, Math.max(current.line, current.line + current.text.length - 1));
    result.push(Object.freeze({
      id: `${operationId}::step-${slugify(current.ordinal)}`,
      ordinal: current.ordinal,
      instruction,
      calls: Object.freeze(extractCalls(instruction)),
      conditions: Object.freeze(extractConditions(instruction, stepSpan)),
      roleContexts: Object.freeze(extractRoles(instruction, stepSpan)),
      children: Object.freeze([]),
      span: stepSpan,
    }));
    current = undefined;
  };

  sectionLines.forEach((line, index) => {
    const match = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
    if (match) {
      flush();
      current = {
        ordinal: match[1]!,
        text: [match[2]!],
        line: section.span.startLine + 1 + index,
      };
    } else if (current) {
      current.text.push(line.trimEnd());
    }
  });
  flush();
  void lines;
  return result;
}

function compileHeadingStep(
  section: SectionNode,
  operationId: string,
  filePath: string,
): BusyStepIR {
  const match = section.title.match(/^Step\s+([^:]+)(?::\s*(.*))?$/i);
  const ordinal = match?.[1]?.trim();
  const title = match?.[2]?.trim();
  const instruction = [title, section.directContent.trim()].filter(Boolean).join('\n').trim();
  const idSuffix = slugify(ordinal || title || `${section.span.startLine}`);
  return Object.freeze({
    id: `${operationId}::step-${idSuffix}`,
    ...(ordinal ? { ordinal } : {}),
    ...(title ? { title } : {}),
    instruction,
    calls: Object.freeze(extractCalls(`${section.title}\n${section.directContent}`)),
    conditions: Object.freeze(extractConditions(section.directContent, section.span)),
    roleContexts: Object.freeze(extractRoles(section.directContent, section.span)),
    children: Object.freeze(section.children
      .filter((child) => /^step\s+/i.test(child.title))
      .map((child) => compileHeadingStep(child, operationId, filePath))),
    span: span(filePath, section.span.startLine, section.span.endLine),
  });
}

function extractConditions(text: string, source: BusySourceSpan): BusyConditionIR[] {
  return text.split('\n').flatMap((line, index) => {
    const match = line.match(/\[Condition\]\s*:?\*{0,2}\s*(.+)$/i)
      ?? line.match(/\bCondition\s*:\s*(.+)$/i);
    if (!match) return [];
    return [Object.freeze({
      expression: match[1]!.replace(/^\*{1,2}|\*{1,2}$/g, '').trim(),
      span: span(source.path, source.startLine + index, source.startLine + index),
    })];
  });
}

function extractRoles(text: string, source: BusySourceSpan): BusyRoleContextIR[] {
  return text.split('\n').flatMap((line, index) => {
    const match = line.match(/\[Role Context\]\s*:?\*{0,2}\s*(.+)$/i)
      ?? line.match(/\bRole\s*:\s*(.+)$/i);
    if (!match) return [];
    return [Object.freeze({
      role: match[1]!.replace(/^\*{1,2}|\*{1,2}$/g, '').trim(),
      span: span(source.path, source.startLine + index, source.startLine + index),
    })];
  });
}

function extractCalls(text: string): string[] {
  const calls = [...text.matchAll(/\[([^\]]+)\]/g)]
    .map((match) => match[1]!.trim())
    .filter((name) => !SEMANTIC_REFERENCES.has(name.toLowerCase()));
  return [...new Set(calls)];
}

function parseChecklist(section: SectionNode, operationId: string): BusyChecklistItemIR[] {
  return section.content.split('\n').flatMap((line, index) => {
    const match = line.trim().match(/^[-*]\s+(?:\[([ xX])\]\s+)?(.+)$/);
    if (!match) return [];
    const text = match[2]!.trim();
    const itemSpan = span(section.span.path, section.span.startLine + 1 + index, section.span.startLine + 1 + index);
    return [Object.freeze({
      id: `${operationId}::check-${slugify(text)}-${index + 1}`,
      text,
      ...(match[1] ? { checked: match[1].toLowerCase() === 'x' } : {}),
      span: itemSpan,
    })];
  });
}

function parseTriggerSection(section: SectionNode): BusyTriggerIR[] {
  return structuredDeclarations(section).map((declaration) => triggerFromConfig(
    declaration.config,
    declaration.raw,
    section.span,
  ));
}

function parseEmitSection(section: SectionNode): BusyEmitIR[] {
  return structuredDeclarations(section).flatMap((declaration) => {
    const eventType = stringValue(declaration.config.event_type ?? declaration.config.eventType);
    if (!eventType) return [];
    return [Object.freeze({
      eventType,
      ...(stringValue(declaration.config.when) ? { when: stringValue(declaration.config.when) } : {}),
      ...(stringValue(declaration.config.payload) ? { payload: stringValue(declaration.config.payload) } : {}),
      ...(stringValue(declaration.config.correlation) ? { correlation: stringValue(declaration.config.correlation) } : {}),
      config: Object.freeze({ ...declaration.config }),
      raw: declaration.raw,
      span: section.span,
    })];
  });
}

function structuredDeclarations(section: SectionNode): Array<{
  config: Record<string, unknown>;
  raw: string;
}> {
  const fenced = [...section.content.matchAll(/```(?:ya?ml)?\s*\n([\s\S]*?)```/gi)]
    .map((match) => match[1]!.trim());
  const sources = fenced.length > 0 ? fenced : [section.content.trim()];
  return sources.flatMap((source) => {
    if (!source) return [];
    try {
      const parsed = yaml.load(source);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      return values.flatMap((value) => isRecord(value)
        ? [{ config: value, raw: source }]
        : []);
    } catch {
      return [];
    }
  });
}

function compileFrontmatterTriggers(value: unknown, filePath: string): BusyTriggerIR[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => isRecord(item)
    ? [triggerFromConfig(item, JSON.stringify(item), span(filePath, 1, 1))]
    : []);
}

function compileDocumentTriggerSections(sections: readonly SectionNode[]): BusyTriggerIR[] {
  return sections
    .filter((section) => ['trigger', 'triggers'].includes(normalizeSemanticName(section.title)))
    .flatMap(parseTriggerSection);
}

function triggerFromConfig(
  config: Record<string, unknown>,
  raw: string,
  source: BusySourceSpan,
): BusyTriggerIR {
  const queue = config.queue_when_paused ?? config.queueWhenPaused;
  return Object.freeze({
    ...(stringValue(config.event_type ?? config.eventType) ? {
      eventType: stringValue(config.event_type ?? config.eventType),
    } : {}),
    ...(stringValue(config.schedule ?? config.cron) ? {
      schedule: stringValue(config.schedule ?? config.cron),
    } : {}),
    ...(stringValue(config.operation) ? { operation: stringValue(config.operation) } : {}),
    ...(typeof queue === 'boolean' ? { queueWhenPaused: queue } : {}),
    config: Object.freeze({ ...config }),
    raw,
    span: source,
  });
}

function compileModel(sections: readonly SectionNode[]): BusyModelIR {
  const fields = findSection(sections, 'fields') ?? findSection(sections, 'field contract');
  return Object.freeze({
    identity: findSection(sections, 'identity'),
    fields: Object.freeze(fields ? parseFields(fields) : []),
    lifecycle: findSection(sections, 'lifecycle'),
    rules: findSection(sections, 'rules'),
    relationships: findSection(sections, 'relationships'),
    persistence: findSection(sections, 'persistence'),
  });
}

function findSemanticChild(section: SectionNode, names: readonly string[]): SectionNode | undefined {
  return section.children.find((child) => names.some((name) => hasSemanticName(child, name)));
}

function hasSemanticName(section: SectionNode, expected: string): boolean {
  const target = normalizeSemanticName(expected);
  return [section.title, ...section.annotations]
    .map(normalizeSemanticName)
    .includes(target);
}

function normalizeSemanticName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+section$/, '').replace(/s$/, '');
}

function findSection(sections: readonly SectionNode[], name: string): SectionNode | undefined {
  const target = normalizeSemanticName(name);
  for (const section of sections) {
    if (normalizeSemanticName(section.title) === target) return section;
    const nested = findSection(section.children, name);
    if (nested) return nested;
  }
  return undefined;
}

function stripBusyExtension(filePath: string): string {
  return filePath.replace(/\.busy\.md$/i, '').replace(/\.md$/i, '');
}

function slugify(value: string): string {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed';
}

function sliceLines(lines: readonly string[], startLine: number, endLine: number): string {
  if (endLine < startLine) return '';
  return lines.slice(Math.max(0, startLine - 1), Math.max(0, endLine)).join('\n').trim();
}

function span(filePath: string, startLine: number, endLine: number): BusySourceSpan {
  return Object.freeze({ path: filePath, startLine, endLine });
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
