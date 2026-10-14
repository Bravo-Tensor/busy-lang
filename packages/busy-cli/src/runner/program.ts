import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { loadResolvedRepo, type RepoSource } from '../loader.js';
import { buildContext, getConceptContext } from '../builders/context.js';
import { getAllSections } from '../parsers/sections.js';
import { validateDocument } from '../validation/index.js';
import type { ContextPayload, Operation, Repo, Section } from '../types/schema.js';
import { interpretationSchema, type Interpretation, type PreparedStep } from './schema.js';

export interface RunStep extends Omit<PreparedStep, 'source' | 'definitions' | 'tools'> {
  instruction: string;
  source: { file: string; section: string; operation?: string; item?: number; start: number; end: number };
  definitions: Record<string, string>;
  tools: Record<string, string>;
}
export interface RunProgram {
  version: 1;
  id: string;
  sourceHash: string;
  interpretationHash: string;
  entryFile: string;
  interpretationFile: string;
  sources: Record<string, string>;
  interpretation: Interpretation;
  entry: string;
  operations: Record<string, { inputs: string[]; outputs: string[]; steps: RunStep[] }>;
  compilation?: { key: string; model: string; promptHash: string; evidenceFile: string };
}
export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
export const sectionName = (title: string): string => title.replace(/^\[|\]$/g, '').toLowerCase();

export function isToolReference(repo: Repo, ref: string): boolean {
  const resolved = getConceptContext(repo, ref).concept;
  return resolved.kind === 'tool' || repo.byFile[resolved.docId]?.concept.kind === 'tool';
}

function operation(repo: Repo, docId: string, reference: string): Operation {
  const local = repo.byFile[docId].concept.operations.find(op => op.name === reference || op.id === reference);
  if (local) return local;
  const imported = repo.imports.find(i => i.docId === docId && i.label === reference)?.resolved;
  const found = Object.values(repo.operations).find(op => op.id === reference || op.sectionRef === imported);
  if (!found) throw new Error(`Operation not found: ${reference}`);
  // Resolve inherited behavior through its defining operation for now, rather than guessing scope.
  if (!found.sectionRef.startsWith(`${found.docId}#`)) throw new Error(`Use the defining operation for inherited reference: ${reference}`);
  return found;
}

/** Source selection uses the canonical section tree and Markdown AST; it does not parse BUSY prose. */
export function instruction(sources: RepoSource[], op: Operation, reference: PreparedStep['source'], base: string): Pick<RunStep, 'instruction' | 'source'> {
  const owner = sources.find(s => s.document.docId === op.docId)!;
  let sections = owner.sections;
  if (sectionName(reference.section) !== 'setup') {
    const selected = reference.operation ? owner.document.operations.find(o => o.name === reference.operation) : op;
    if (!selected) throw new Error(`Source operation not found: ${reference.operation}`);
    sections = getAllSections(owner.sections).find(s => s.id === selected.sectionRef)?.children ?? [];
  }
  const section = sections.find(s => sectionName(s.title) === sectionName(reference.section));
  if (!section) throw new Error(`Source section not found: ${op.name}/${reference.section}`);
  let start = section.lineStart + 1;
  let end = Math.max(...getAllSections([section]).map(s => s.lineEnd));
  const content = owner.document.content;
  let text = content.split('\n').slice(start - 1, end).join('\n').trim();
  if (reference.item !== undefined) {
    const list = owner.markdown.tree.children.find(node => node.type === 'list' && node.ordered && node.position!.start.line > section.lineStart && node.position!.end.line <= end);
    const item = list?.type === 'list' ? list.children[reference.item - 1] : undefined;
    if (!item?.position) throw new Error(`Source item not found: ${op.name}/${reference.section}/${reference.item}`);
    start = item.position.start.line;
    end = item.position.end.line;
    text = content.slice(item.position.start.offset, item.position.end.offset).replace(/^\d+[.)]\s+/, '').trim();
  }
  if (!text) throw new Error(`Empty instruction: ${op.name}/${reference.section}`);
  return { instruction: text, source: { ...reference, file: relative(base, owner.filePath), start, end } };
}

export function contextText(repo: Repo, context: ContextPayload, label: string, tool: boolean): string {
  const local = repo.byFile[context.operation.docId].concept.localdefs.find(def => def.name === label || def.id === label);
  const symbol = context.symbols[label];
  const ref = local?.id ?? (symbol?.docId ? `${symbol.docId}${symbol.slug ? `#${symbol.slug}` : ''}` : label);
  const resolved = getConceptContext(repo, ref).concept;
  // An action anchor identifies the Tool's contract, including its Setup and provider binding.
  const owner = repo.byFile[resolved.docId]?.concept;
  if (tool && owner?.kind === 'tool') return owner.content;
  if (tool && resolved.kind !== 'tool') throw new Error(`Expected a BUSY Tool: ${label}`);
  if (!('content' in resolved) || typeof resolved.content !== 'string') throw new Error(`No context content for ${label}`);
  // Keep subordinate definition sections, which the section model stores separately.
  if (resolved.kind === 'section' || resolved.kind === 'localdef') {
    const render = (section: Section): string => [section.content, ...section.children.map(child => `${'#'.repeat(child.depth)} ${child.title}\n${render(child)}`)].join('\n').trim();
    const section = resolved.kind === 'section' ? resolved : repo.files.flatMap(file => getAllSections(file.sections)).find(section => section.id === resolved.sectionRef);
    if (section) return render(section);
  }
  return resolved.content;
}

/** Lower a prepared interpretation against BUSY's resolved, canonical source model. No model calls. */
export async function compileRun(file: string, preparedFile?: string): Promise<RunProgram> {
  const entryFile = resolve(file);
  const interpretationFile = resolve(preparedFile ?? entryFile.replace(/(?:\.busy)?\.md$/, '.runner.json'));
  let raw: unknown;
  try { raw = JSON.parse(await readFile(interpretationFile, 'utf8')); }
  catch (error) { throw new Error(`Read prepared interpretation ${interpretationFile}: ${error instanceof Error ? error.message : error}. Use busy run compile FILE --entry OPERATION to generate an interpretation.`); }
  return lowerRun(entryFile, raw, interpretationFile);
}

export async function loadRunSource(file: string): Promise<Awaited<ReturnType<typeof loadResolvedRepo>>> {
  const loaded = await loadResolvedRepo(resolve(file));
  for (const source of loaded.sources) {
    const errors = validateDocument(source.document.content, source.filePath).findings.filter(f => f.severity === 'error');
    if (errors.length) throw new Error(`Invalid BUSY source ${source.filePath}: ${errors.map(f => f.message).join('; ')}`);
  }
  return loaded;
}

/** Both hand-authored and generated interpretations use the same lowering path. */
export async function lowerRun(file: string, raw: unknown, interpretationFile: string, loaded?: Awaited<ReturnType<typeof loadRunSource>>): Promise<RunProgram> {
  const entryFile = resolve(file);
  const plan = interpretationSchema.parse(raw);
  if (!Object.hasOwn(plan.operations, plan.entry)) throw new Error(`Unknown entry operation: ${plan.entry}`);
  const { repo, sources } = loaded ?? await loadRunSource(entryFile);
  const entry = sources.find(source => source.filePath === entryFile)!;
  const base = dirname(entryFile);
  const snapshots = Object.fromEntries(sources.map(source => [relative(base, source.filePath), source.document.content]).sort(([a], [b]) => a.localeCompare(b)));
  const operations: RunProgram['operations'] = {};
  for (const [name, prepared] of Object.entries(plan.operations)) {
    const op = operation(repo, entry.document.docId, prepared.ref ?? name);
    if (!op.sectionRef.startsWith(`${op.docId}#`)) throw new Error(`Use the defining operation for inherited reference: ${name}`);
    const context = buildContext(repo, op.id, { includeChildren: true });
    const ids = prepared.steps.map(step => step.id);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate step id in ${name}`);
    const steps = prepared.steps.map(step => {
      if (step.respondWith.type !== 'object') throw new Error(`${name}/${step.id}: reply must be an object`);
      if (step.routes) {
        if (Object.hasOwn(step, 'next')) throw new Error('A step cannot have both routes and next');
        const choices = step.respondWith.properties?.decision?.enum;
        if (!choices || !step.respondWith.required?.includes('decision') || new Set(choices).size !== choices.length || choices.length !== Object.keys(step.routes).length || choices.some(choice => !Object.hasOwn(step.routes!, choice))) throw new Error(`${name}/${step.id}: each decision needs exactly one route`);
      } else if (!Object.hasOwn(step, 'next')) throw new Error(`${name}/${step.id}: next or routes is required`);
      for (const route of step.routes ? Object.values(step.routes) : [{ next: step.next! }]) {
        if (route.next !== null && !ids.includes(route.next)) throw new Error(`${name}/${step.id}: unknown next step ${route.next}`);
        if ('call' in route && route.call && !Object.hasOwn(plan.operations, route.call)) throw new Error(`Unknown call: ${route.call}`);
      }
      return {
        ...step, ...instruction(sources, context.operation, step.source, base),
        definitions: Object.fromEntries((step.definitions ?? []).map(label => [label, contextText(repo, context, label, false)])),
        tools: Object.fromEntries((step.tools ?? []).map(label => [label, contextText(repo, context, label, true)])),
      };
    });
    operations[name] = { inputs: prepared.inputs, outputs: prepared.outputs, steps };
  }
  const sourceHash = hash(canonical(snapshots));
  const interpretationHash = hash(canonical(plan));
  return {
    version: 1, id: hash(canonical({ sourceHash, interpretationHash, entryFile, operations, compiler: 1 })), sourceHash, interpretationHash,
    entryFile, interpretationFile, sources: snapshots, interpretation: plan, entry: plan.entry, operations,
  };
}
