import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { visit } from 'unist-util-visit';
import { buildContext, getConceptContext } from '../builders/context.js';
import { getAllSections } from '../parsers/sections.js';
import { resolveImportTarget } from '../parsers/imports.js';
import { canonical, contextText, hash, instruction, isToolReference, loadRunSource, lowerRun, sectionName, type RunProgram } from './program.js';
import { interpretationSchema, type Interpretation, type PreparedStep, type ReplySchema } from './schema.js';
import { checkBindings } from './checks.js';
import { compilerPrompt } from './prompt.js';

const version = 5;
export const defaultCompilerModel = 'openai/gpt-6-luna';
export interface CompilationOptions {
  entry: string; model?: string; keyFile?: string; cacheDir?: string; refresh?: boolean;
  /** Injectable transport for offline testing. Production uses OpenRouter, without HTTP retries. */
  transport?: (request: ProviderRequest) => Promise<ProviderResult>;
}
export interface ProviderRequest { model: string; messages: { role: 'system' | 'user' | 'assistant'; content: string }[]; schema: unknown }
export interface ProviderResult { draft: unknown; model: string; usage?: unknown }
export interface CompilationResult { program: RunProgram; cacheHit: boolean; artifactFile: string }
export class CompilationFailure extends Error {
  constructor(public readonly stage: 'source' | 'provider' | 'interpretation' | 'source-clarification', public readonly diagnostics: string[], public readonly evidenceFile?: string) {
    super(diagnostics.join('; ')); this.name = 'CompilationFailure';
  }
  toJSON() { return { stage: this.stage, diagnostics: this.diagnostics, evidenceFile: this.evidenceFile,
    review: 'Compare the source, interpretation and available data. If source intent needs changing, stop and recommend clarification to the author; compilation never edits BUSY sources.' }; }
}

const draftStep = z.object({
  id: z.string(), sourceId: z.string(), context: z.array(z.string()), definitions: z.array(z.string()), tools: z.array(z.string()),
  returnValues: z.array(z.object({ name: z.string(), type: z.enum(['string', 'boolean', 'number', 'strings']), options: z.array(z.string()) }).strict()),
  next: z.string().nullable(), routes: z.array(z.object({ decision: z.string(), call: z.string().nullable(), next: z.string().nullable() }).strict()),
}).strict();
const draftShape = z.object({ issue: z.string().nullable(), entry: z.string(), operations: z.array(z.object({
  name: z.string(), inputs: z.array(z.string()), outputs: z.array(z.string()), steps: z.array(draftStep).nonempty(),
}).strict()) }).strict();
type Draft = z.infer<typeof draftShape>;
export interface CompilationCatalog {
  entry: string;
  availableOperations: { name: string; ref: string; inputs: string[]; outputs: string[]; definitions: Record<string, string>; tools: Record<string, string> }[];
  sourceCatalog: { id: string; owner: string; source: PreparedStep['source']; text: string; requiredDefinitions: string[]; requiredTools: string[] }[];
  contextCatalog: Record<string, string>;
}

/** Build a finite catalog from the existing BUSY model and Markdown AST. Fenced examples aren't declarations. */
export function buildCompilationCatalog(file: string, entry: string, loaded: Awaited<ReturnType<typeof loadRunSource>>): CompilationCatalog {
  const { repo, sources } = loaded;
  const fileMap = new Map(sources.map(s => [s.filePath, { docId: s.document.docId, path: s.filePath }]));
  const root = sources.find(s => s.filePath === resolve(file))!;
  const result: CompilationCatalog = { entry, availableOperations: [], sourceCatalog: [], contextCatalog: {} };
  const defining = sources.flatMap(s => s.document.operations.filter(o => o.sectionRef.startsWith(`${s.document.docId}#`)));
  // Keep local operations and graph-referenced callees available, without expanding parent Setup behavior.
  const available = new Set(root.document.operations.filter(o => o.sectionRef.startsWith(`${root.document.docId}#`)).map(o => o.id));
  const todo = [...available];
  while (todo.length) {
    const id = todo.pop()!;
    const op = defining.find(o => o.id === id)!;
    const owner = sources.find(s => s.document.docId === op.docId)!;
    const section = getAllSections(owner.sections).find(s => s.id === op.sectionRef)!;
    const refs = new Set([op.id, ...getAllSections([section]).map(s => s.id)]);
    for (const edge of repo.edges.filter(e => refs.has(e.from))) {
      const callee = defining.find(o => o.id === edge.to || o.sectionRef === edge.to);
      if (callee && !available.has(callee.id)) { available.add(callee.id); todo.push(callee.id); }
    }
  }
  const used = new Set<string>();
  for (const owner of sources) for (const op of owner.document.operations) {
    if (!op.sectionRef.startsWith(`${owner.document.docId}#`) || !available.has(op.id)) continue;
    const sections = getAllSections(owner.sections).find(s => s.id === op.sectionRef)?.children ?? [];
    if (!sections.some(s => sectionName(s.title) === 'steps')) continue; // Provider actions remain caller context.
    const name = used.has(op.name) ? `${op.name}_${hash(op.id).slice(0, 8)}` : op.name;
    used.add(name);
    const context = buildContext(repo, op.id, { includeChildren: true });
    const definitions: Record<string, string> = {};
    const tools: Record<string, string> = {};
    const labels = new Set([...Object.keys(context.symbols), ...owner.document.localdefs.map(d => d.name)]);
    for (const label of labels) {
      const local = owner.document.localdefs.find(d => d.name === label);
      const symbol = context.symbols[label];
      const ref = local?.id ?? `${symbol.docId}${symbol.slug ? `#${symbol.slug}` : ''}`;
      const isTool = isToolReference(repo, ref);
      (isTool ? tools : definitions)[label] = ref;
      result.contextCatalog[ref] = contextText(repo, context, label, isTool);
    }
    // Inline links use canonical IDs; reference links keep the existing BUSY symbol labels.
    for (const edge of repo.edges.filter(e => e.from.startsWith(`${owner.document.docId}#`))) {
      if (!Object.hasOwn(repo.byId, edge.to) || Object.values(definitions).includes(edge.to) || Object.values(tools).includes(edge.to)) continue;
      const isTool = isToolReference(repo, edge.to);
      (isTool ? tools : definitions)[edge.to] = edge.to;
      result.contextCatalog[edge.to] = contextText(repo, context, edge.to, isTool);
    }
    result.availableOperations.push({ name, ref: op.id, inputs: op.inputs, outputs: op.outputs, definitions, tools });
    const add = (id: string, source: PreparedStep['source']) => {
      const selected = instruction(sources, op, source, dirname(resolve(file)));
      const refs = new Set<string>();
      visit(owner.markdown.tree, node => {
        if (!node.position || node.position.start.line < selected.source.start || node.position.end.line > selected.source.end) return;
        if (node.type === 'linkReference') {
          const label = Object.keys({ ...definitions, ...tools }).find(l => l.toLowerCase() === (node.label ?? node.identifier).toLowerCase());
          if (label) refs.add(label);
        } else if (node.type === 'link') {
          const resolved = resolveImportTarget(node.url, fileMap, owner.filePath);
          const ref = resolved.docId ? `${resolved.docId}${resolved.slug ? `#${resolved.slug}` : ''}` : '';
          const label = Object.entries({ ...definitions, ...tools }).find(([, id]) => id === ref)?.[0];
          if (label) refs.add(label);
        }
      });
      if (id === 'setup') owner.document.localdefs.forEach(d => refs.add(d.name));
      result.sourceCatalog.push({ id: `${name}/${id}`, owner: name, source, text: selected.instruction,
        requiredDefinitions: [...refs].filter(l => Object.hasOwn(definitions, l)), requiredTools: [...refs].filter(l => Object.hasOwn(tools, l)) });
    };
    if (owner.sections.some(s => sectionName(s.title) === 'setup')) add('setup', { section: 'Setup' });
    if (owner.sections.some(s => sectionName(s.title) === 'checklist')) add('document-checklist', { section: 'Checklist' });
    for (const section of sections) {
      const title = sectionName(section.title) === 'outputs' ? 'output' : sectionName(section.title);
      if (!['steps', 'output', 'checklist'].includes(title)) continue;
      const end = Math.max(...getAllSections([section]).map(s => s.lineEnd));
      const list = owner.markdown.tree.children.find(n => n.type === 'list' && n.ordered && n.position!.start.line > section.lineStart && n.position!.end.line <= end);
      if (title === 'steps' && list?.type === 'list') list.children.forEach((_, i) => add(`steps/${i + 1}`, { operation: op.name, section: 'Steps', item: i + 1 }));
      else add(title, { operation: op.name, section: section.title });
    }
  }
  if (!root.document.operations.some(op => op.name === entry && op.sectionRef.startsWith(`${root.document.docId}#`)) || !result.availableOperations.some(o => o.name === entry && o.ref.startsWith(`${root.document.docId}::`))) throw new Error(`Entry must name a defining operation in ${file}: ${entry}`);
  return result;
}

export function constrainedDraftSchema(catalog: CompilationCatalog): unknown {
  const object = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
  const array = (items: unknown) => ({ type: 'array', items });
  const string = { type: 'string' };
  const nullable = (schema: unknown) => ({ anyOf: [schema, { type: 'null' }] });
  const choice = (values: string[]) => values.length ? { type: 'string', enum: [...new Set(values)] } : string;
  const names = catalog.availableOperations.map(o => o.name);
  const labels = (values: string[]) => ({ ...array(choice(values)), ...(values.length ? {} : { maxItems: 0 }) });
  return object({ issue: nullable(string), entry: choice([catalog.entry]), operations: array({ anyOf: catalog.availableOperations.map(op => object({
    name: choice([op.name]), inputs: array(string), outputs: array(string), steps: array(object({
      id: string, sourceId: choice(catalog.sourceCatalog.filter(s => s.owner === op.name).map(s => s.id)), context: array(string),
      definitions: labels(Object.keys(op.definitions)),
      tools: labels(Object.keys(op.tools)),
      returnValues: array(object({ name: string, type: choice(['string', 'boolean', 'number', 'strings']), options: array(string) })),
      next: nullable(string), routes: array(object({ decision: string, call: nullable(choice(names)), next: nullable(string) })),
    })),
  })) }) });
}

export function lowerConstrainedDraft(catalog: CompilationCatalog, raw: unknown): Interpretation {
  const draft: Draft = draftShape.parse(raw);
  if (draft.issue !== null) throw new CompilationFailure('source-clarification', [draft.issue || 'Source clarification required']);
  if (draft.entry !== catalog.entry) throw new Error(`Entry must be ${catalog.entry}`);
  const operations: Interpretation['operations'] = {};
  for (const op of draft.operations) {
    const owner = catalog.availableOperations.find(o => o.name === op.name);
    if (!owner || Object.hasOwn(operations, op.name)) throw new Error(`Unknown or duplicate operation ${op.name}`);
    const steps = op.steps.map(step => {
      const source = catalog.sourceCatalog.find(s => s.id === step.sourceId && s.owner === op.name);
      if (!source) throw new Error(`Source ${step.sourceId} is not owned by ${op.name}`);
      for (const label of step.definitions) if (!Object.hasOwn(owner.definitions, label)) throw new Error(`${op.name}/${step.id}: definition not in scope: ${label}`);
      for (const label of step.tools) if (!Object.hasOwn(owner.tools, label)) throw new Error(`${op.name}/${step.id}: Tool not in scope: ${label}`);
      const properties: Record<string, ReplySchema> = {};
      for (const field of step.returnValues) {
        if (['decision', 'constructor', 'prototype', '__proto__'].includes(field.name) || Object.hasOwn(properties, field.name)) throw new Error(`Reserved or duplicate return field ${field.name}`);
        if (field.type !== 'string' && field.options.length) throw new Error(`${field.name}: only strings have options`);
        properties[field.name] = field.type === 'strings' ? { type: 'array', items: { type: 'string' } } : { type: field.type, ...(field.options.length ? { enum: field.options } : {}) };
      }
      const routes: NonNullable<PreparedStep['routes']> = {};
      for (const route of step.routes) {
        if (Object.hasOwn(routes, route.decision) || ['__proto__', 'constructor', 'prototype'].includes(route.decision)) throw new Error(`Reserved or duplicate decision ${route.decision}`);
        routes[route.decision] = { ...(route.call ? { call: route.call } : {}), next: route.next };
      }
      if (step.routes.length && step.next !== null) throw new Error(`${op.name}/${step.id}: routed steps require next:null`);
      if (step.routes.length) properties.decision = { type: 'string', enum: Object.keys(routes) };
      return { id: step.id, source: source.source, context: step.context,
        definitions: [...new Set([...source.requiredDefinitions, ...step.definitions])], tools: [...new Set([...source.requiredTools, ...step.tools])],
        respondWith: { type: 'object' as const, properties, required: Object.keys(properties), additionalProperties: false as const },
        ...(step.routes.length ? { routes } : { next: step.next }) };
    });
    operations[op.name] = { ref: owner.ref, inputs: op.inputs, outputs: op.outputs, steps: steps as [PreparedStep, ...PreparedStep[]] };
  }
  const plan = interpretationSchema.parse({ version: 1, entry: draft.entry, operations });
  for (const operation of Object.values(plan.operations)) {
    // The first exchange sees invocation inputs, and a call's continuation sees its returned values.
    // Must-analysis below still rejects merges where those values aren't available on every path.
    operation.steps[0].context = [...new Set([...operation.inputs, ...operation.steps[0].context])];
    for (const step of operation.steps) for (const route of Object.values(step.routes ?? {})) {
      if (!route.call || route.next === null || !plan.operations[route.call]) continue;
      const resume = operation.steps.find(s => s.id === route.next);
      if (resume) resume.context = [...new Set([...resume.context, ...plan.operations[route.call].outputs])];
    }
  }
  return plan;
}

export function checkCoverage(catalog: CompilationCatalog, plan: Interpretation): string[] {
  return Object.entries(plan.operations).flatMap(([name, operation]) => catalog.sourceCatalog
    .filter(s => s.owner === name && !operation.steps.some(step => JSON.stringify(step.source) === JSON.stringify(s.source)))
    .map(s => `Uncovered instruction: ${s.id}`));
}

async function openRouter(request: ProviderRequest, keyFile?: string): Promise<ProviderResult> {
  const key = (process.env.OPENROUTER_API_KEY ?? (keyFile ? await readFile(resolve(keyFile), 'utf8') : '')).trim();
  if (!key) throw new Error('Set OPENROUTER_API_KEY or pass --key-file. A cache hit needs no key.');
  const body = JSON.stringify({ model: request.model, messages: request.messages,
    response_format: { type: 'json_schema', json_schema: { name: 'busy_draft', strict: true, schema: request.schema } },
    reasoning: { effort: 'low' }, max_tokens: 12000, provider: { allow_fallbacks: false, require_parameters: true } });
  if (Buffer.byteLength(body) > 300000) throw new Error('Compilation request exceeds 300 KB; narrow the source dependencies.');
  let response: Response;
  try { response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', redirect: 'error',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60000) }); }
  catch { throw new Error('OpenRouter request failed or timed out; no HTTP retry was made.'); }
  if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}; no HTTP retry was made.`);
  const text = await response.text();
  if (text.includes(key)) throw new Error('Provider returned credential material; response discarded.');
  const result = JSON.parse(text);
  if (result.choices?.[0]?.finish_reason !== 'stop') throw new Error('Provider did not return a complete draft.');
  return { draft: JSON.parse(result.choices[0].message.content), model: result.model, usage: result.usage };
}

async function save(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temporary, file);
}

/** One constrained generation and at most one structural repair. Never writes source or executes instructions. */
export async function generateRun(file: string, options: CompilationOptions): Promise<CompilationResult> {
  const entryFile = resolve(file);
  let loaded: Awaited<ReturnType<typeof loadRunSource>>, catalog: CompilationCatalog;
  try { loaded = await loadRunSource(entryFile); catalog = buildCompilationCatalog(entryFile, options.entry, loaded); }
  catch (error) { throw new CompilationFailure('source', [error instanceof Error ? error.message : String(error)]); }
  const snapshots = Object.fromEntries(loaded.sources.map(s => [relative(dirname(entryFile), s.filePath), s.document.content]).sort(([a], [b]) => a.localeCompare(b)));
  const model = options.model ?? defaultCompilerModel;
  const promptHash = hash(compilerPrompt);
  const schema = constrainedDraftSchema(catalog);
  const key = hash(canonical({ version, entryFile, entry: options.entry, snapshots, model, promptHash, schema }));
  const artifactFile = resolve(options.cacheDir ?? '.busy/compiled', `${key}.json`);
  if (!options.refresh) {
    try {
      const cached = JSON.parse(await readFile(artifactFile, 'utf8'));
      // Re-lower against current validated sources; cached packets are never blindly trusted.
      const program = await lowerRun(entryFile, cached.program.interpretation, artifactFile, loaded);
      if (cached.key !== key || cached.program.id !== program.id) throw new Error('Invalid compiler cache; use --refresh to replace it');
      return { program: { ...program, compilation: cached.program.compilation }, cacheHit: true, artifactFile };
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const evidenceFile = resolve(dirname(artifactFile), `${key}.${randomUUID()}.attempts.json`);
  const evidence: { key: string; entryFile: string; snapshots: typeof snapshots; catalog: CompilationCatalog; model: string; promptHash: string; prompt: string; attempts: unknown[] } =
    { key, entryFile, snapshots, catalog, model, promptHash, prompt: compilerPrompt, attempts: [] };
  await save(evidenceFile, evidence);
  const messages: ProviderRequest['messages'] = [{ role: 'system', content: compilerPrompt }, { role: 'user', content: JSON.stringify(catalog) }];
  const transport = options.transport ?? ((request: ProviderRequest) => openRouter(request, options.keyFile));
  for (let attempt = 0; attempt < 2; attempt++) {
    let result: ProviderResult;
    try { result = await transport({ model, messages: [...messages], schema }); }
    catch (error) {
      const diagnostics = [error instanceof Error ? error.message : String(error)];
      evidence.attempts.push({ stage: 'provider', diagnostics }); await save(evidenceFile, evidence);
      throw new CompilationFailure('provider', diagnostics, evidenceFile);
    }
    let diagnostics: string[];
    try {
      const plan = lowerConstrainedDraft(catalog, result.draft);
      const program = await lowerRun(entryFile, plan, artifactFile, loaded);
      diagnostics = [...checkCoverage(catalog, plan), ...checkBindings(plan)];
      if (diagnostics.length) throw new Error(diagnostics.join('; '));
      evidence.attempts.push({ ...result, diagnostics: [], accepted: true }); await save(evidenceFile, evidence);
      program.compilation = { key, model, promptHash, evidenceFile };
      await save(artifactFile, { version, key, program });
      return { program, cacheHit: false, artifactFile };
    } catch (error) {
      diagnostics = error instanceof z.ZodError ? error.issues.map(i => `${i.path.join('.')}: ${i.message}`) : [error instanceof Error ? error.message : String(error)];
      evidence.attempts.push({ ...result, diagnostics, accepted: false }); await save(evidenceFile, evidence);
      if (error instanceof CompilationFailure || attempt === 1) throw new CompilationFailure(error instanceof CompilationFailure ? error.stage : 'interpretation', diagnostics, evidenceFile);
    }
    messages.push({ role: 'assistant', content: JSON.stringify(result.draft) }, { role: 'user', content: `Repair the draft once using these structural diagnostics. Preserve source intent. Return the full constrained draft; set issue if source clarification is necessary.\n${JSON.stringify(diagnostics)}` });
  }
  throw new Error('Unreachable compilation state');
}
