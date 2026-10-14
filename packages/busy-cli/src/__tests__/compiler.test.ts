import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildCompilationCatalog, checkCoverage, generateRun, lowerConstrainedDraft, type ProviderRequest } from '../runner/compiler.js';
import { loadRunSource, lowerRun } from '../runner/program.js';
import type { ReplySchema, Values } from '../runner/schema.js';
import { checkBindings } from '../runner/checks.js';
import { BusyRunner } from '../runner/store.js';

const real = resolve(import.meta.dirname, '../../examples/runner/real');
const value = (name: string) => ({ name, type: 'string', options: [] });
function toolDraft() {
  const step = (id: string, sourceId: string, context: string[], returnValues: unknown[], next: string | null, tools: string[] = []) =>
    ({ id, sourceId: `roundTrip/${sourceId}`, context, returnValues, next, definitions: [], tools, routes: [] });
  return { issue: null, entry: 'roundTrip', operations: [{ name: 'roundTrip', inputs: ['source_path', 'output_path'], outputs: ['writtenPath', 'logId'], steps: [
    step('setup', 'setup', ['source_path', 'output_path'], [], 'read', ['File Tool', 'Logging Tool']),
    step('read', 'steps/1', ['source_path'], [value('content')], 'write', ['File Tool']),
    step('write', 'steps/2', ['content', 'output_path'], [value('writtenPath')], 'log', ['File Tool']),
    step('log', 'steps/3', ['writtenPath'], [value('logId')], 'output', ['Logging Tool']),
    step('output', 'output', ['writtenPath', 'logId'], [], 'checklist'),
    { ...step('checklist', 'checklist', ['writtenPath', 'logId'], [], null), routes: [{ decision: 'pass', call: null, next: null }, { decision: 'retry', call: null, next: 'read' }] },
  ] }] };
}

describe('constrained BUSY compilation', () => {
  let dir: string, file: string, cacheDir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'busy-compile-')); cpSync(real, dir, { recursive: true });
    file = join(dir, 'tool-roundtrip.busy.md'); cacheDir = join(dir, 'cache');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const options = () => ({ entry: 'roundTrip', cacheDir });

  it('validates real dependencies and retains Local Definitions, Tool providers, nested content and fences', async () => {
    for (const [path, entry] of [['busy/base/busy-assistant.busy.md', 'createDocument'], ['busy/base/workspace-agent.busy.md', 'assumeWorkspaceRole'], ['tool-roundtrip.busy.md', 'roundTrip']]) {
      const source = join(dir, path), loaded = await loadRunSource(source);
      const catalog = buildCompilationCatalog(source, entry, loaded);
      const op = catalog.availableOperations.find(o => o.name === entry)!;
      if (entry === 'assumeWorkspaceRole') expect(catalog.contextCatalog[op.definitions.Principles]).toContain('I log all execution steps to trace.log');
      if (entry === 'roundTrip') {
        expect(catalog.availableOperations.some(o => o.name === 'readFile' || o.name === 'logInfo')).toBe(false);
        expect(catalog.contextCatalog[op.tools['File Tool']]).toContain('RUNTIME_WRITE_FILE');
        expect(catalog.contextCatalog[op.tools['File Tool']]).toContain('Cannot write to `.libraries/`');
        expect(catalog.contextCatalog[op.tools['Logging Tool']]).toContain('| **warning** |');
        expect(catalog.contextCatalog[op.tools['Logging Tool']]).toContain('```yaml');
      }
    }
  });

  it('repairs once, retains diagnostics and serves the accepted cache without a provider or key', async () => {
    const transport = vi.fn(async (_request: ProviderRequest) => ({ draft: toolDraft(), model: 'test' }));
    transport.mockImplementationOnce(async () => { const bad = toolDraft(); bad.operations[0].steps[1].context.push('undefinedBinding'); return { draft: bad, model: 'test' }; });
    const result = await generateRun(file, { ...options(), transport });
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[1][0].messages.at(-1)!.content).toContain('undefinedBinding');
    const evidence = JSON.parse(readFileSync(result.program.compilation!.evidenceFile, 'utf8'));
    expect(evidence.attempts.map((a: { accepted: boolean }) => a.accepted)).toEqual([false, true]);
    expect(evidence.snapshots['tool-roundtrip.busy.md']).toBe(readFileSync(file, 'utf8'));
    const cached = await generateRun(file, { ...options(), transport: async () => { throw new Error('must not call'); } });
    expect(cached.cacheHit).toBe(true); expect(cached.program).toEqual(result.program);
    const tool = join(dir, 'busy/toolbox/file-tool.busy.md');
    writeFileSync(tool, readFileSync(tool, 'utf8') + '\nExtra fixture constraint.\n');
    const changed = await generateRun(file, { ...options(), transport });
    expect(changed.program.sourceHash).not.toBe(result.program.sourceHash);
    expect(changed.artifactFile).not.toBe(result.artifactFile);
    const model = await generateRun(file, { ...options(), model: 'another-model', transport });
    expect(model.artifactFile).not.toBe(changed.artifactFile);
    const refreshed = await generateRun(file, { ...options(), transport, refresh: true });
    expect(refreshed.artifactFile).toBe(changed.artifactFile);
    expect(refreshed.program.compilation!.evidenceFile).not.toBe(changed.program.compilation!.evidenceFile);
  });

  it('stops on source ambiguity without repair or source edits and preserves recovery evidence', async () => {
    const before = readFileSync(file, 'utf8');
    const transport = vi.fn(async () => ({ draft: { ...toolDraft(), issue: 'Clarify which destination is authoritative.' }, model: 'test' }));
    const failure = await generateRun(file, { ...options(), transport }).catch(e => e);
    expect(failure.stage).toBe('source-clarification'); expect(transport).toHaveBeenCalledTimes(1);
    expect(failure.toJSON().review).toContain('stop and recommend clarification');
    const evidence = JSON.parse(readFileSync(failure.evidenceFile, 'utf8'));
    expect(evidence.attempts[0].draft.issue).toContain('destination');
    expect(evidence.snapshots['tool-roundtrip.busy.md']).toBe(before);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('bounds structural repair and never retries provider failures or invalid sources', async () => {
    const failed = vi.fn(async () => { throw new Error('HTTP 429'); });
    await expect(generateRun(file, { ...options(), transport: failed })).rejects.toMatchObject({ stage: 'provider' });
    expect(failed).toHaveBeenCalledTimes(1);
    const bad = vi.fn(async () => { const draft = toolDraft(); draft.operations[0].steps[0].sourceId = 'made-up'; return { draft, model: 'test' }; });
    await expect(generateRun(file, { ...options(), transport: bad })).rejects.toMatchObject({ stage: 'interpretation' });
    expect(bad).toHaveBeenCalledTimes(2);
    writeFileSync(file, readFileSync(file, 'utf8') + '\n[Absent]: ./missing.busy.md\n');
    await expect(generateRun(file, { ...options(), transport: failed })).rejects.toMatchObject({ stage: 'source' });
    expect(failed).toHaveBeenCalledTimes(1);
  });

  it('rejects scope leaks, omitted instructions and context undefined on a loop first visit', async () => {
    const catalog = buildCompilationCatalog(file, 'roundTrip', await loadRunSource(file));
    const scoped = toolDraft(); scoped.operations[0].steps[1].definitions.push('Persona');
    expect(() => lowerConstrainedDraft(catalog, scoped)).toThrow('definition not in scope');
    const omitted = toolDraft(); omitted.operations[0].steps.splice(2, 1);
    expect(checkCoverage(catalog, lowerConstrainedDraft(catalog, omitted)).join('\n')).toContain('Uncovered instruction');
    const loop = toolDraft(); loop.operations[0].steps[1].context.push('writtenPath');
    expect(checkBindings(lowerConstrainedDraft(catalog, loop)).join('\n')).toContain('context writtenPath is not defined on every path');
  });

  it('supplies directly referenced Tools and inline parent context even when the draft omits them', async () => {
    const catalog = buildCompilationCatalog(file, 'roundTrip', await loadRunSource(file));
    const draft = toolDraft(); draft.operations[0].steps[1].tools = [];
    expect(lowerConstrainedDraft(catalog, draft).operations.roundTrip.steps[1].tools).toContain('File Tool');
    const role = join(dir, 'busy/base/workspace-agent.busy.md');
    const roleCatalog = buildCompilationCatalog(role, 'assumeWorkspaceRole', await loadRunSource(role));
    const setup = roleCatalog.sourceCatalog.find(s => s.id === 'assumeWorkspaceRole/setup')!;
    expect(setup.requiredDefinitions).toContain('role#executerole');
    expect(roleCatalog.contextCatalog['role#executerole']).toContain('Assume Persona');
    expect(setup.requiredDefinitions).toContain('Principles');
  });

  it('retains bracketed Setup headings and anchored Tool aliases as complete caller contracts', async () => {
    let content = readFileSync(file, 'utf8').replace(/^# \[Setup\]\([^\n]*\)/m, '# [Setup]');
    content = content.replace('file-tool.busy.md\n', 'file-tool.busy.md#readfile\n');
    writeFileSync(file, content);
    const catalog = buildCompilationCatalog(file, 'roundTrip', await loadRunSource(file));
    const op = catalog.availableOperations.find(o => o.name === 'roundTrip')!;
    expect(catalog.sourceCatalog.find(s => s.id === 'roundTrip/setup')!.text).toContain('Confirm the caller');
    expect(op.tools['File Tool']).toBe('file_tool#readfile');
    expect(op.definitions).not.toHaveProperty('File Tool');
    const contract = readFileSync(join(dir, 'busy/toolbox/file-tool.busy.md'), 'utf8');
    expect(catalog.contextCatalog[op.tools['File Tool']]).toBe(contract);
    const program = await lowerRun(file, lowerConstrainedDraft(catalog, toolDraft()), 'offline-test');
    expect(program.operations.roundTrip.steps[1].tools['File Tool']).toBe(contract);
    expect(catalog.availableOperations.some(o => o.name === 'readFile')).toBe(false);
  });

  it('pins inline-only BUSY context without importing provider assets or fenced templates', async () => {
    const model = join(dir, 'index-model.busy.md');
    writeFileSync(model, '---\nName: Inline Index Model\nType: [Document]\nDescription: Source-backed inline context.\n---\n\n# Local Definitions\n## Identity\nKeep a stable identity.\n');
    writeFileSync(file, readFileSync(file, 'utf8').replace('Confirm the caller', 'Read the [index model](index-model.busy.md#identity). Manually review [external basis](https://example.com/basis.busy.md). Confirm the caller') + '\n```markdown\n[Example](missing-example.busy.md)\n```\n');
    const loaded = await loadRunSource(file);
    expect(loaded.sources.map(s => s.filePath)).toContain(model);
    const catalog = buildCompilationCatalog(file, 'roundTrip', loaded);
    const setup = catalog.sourceCatalog.find(s => s.id === 'roundTrip/setup')!;
    expect(setup.requiredDefinitions).toContain('inline_index_model#identity');
    expect(setup.text).toContain('https://example.com/basis.busy.md');
    expect(catalog.contextCatalog['inline_index_model#identity']).toContain('Keep a stable identity.');
    const first = await generateRun(file, { ...options(), transport: async () => ({ draft: toolDraft(), model: 'test' }) });
    writeFileSync(model, readFileSync(model, 'utf8') + '\nRevised identity evidence.\n');
    const revised = await generateRun(file, { ...options(), transport: async () => ({ draft: toolDraft(), model: 'test' }) });
    expect(revised.program.sourceHash).not.toBe(first.program.sourceHash);
    expect(revised.program.operations.roundTrip.steps[0].definitions['inline_index_model#identity']).toContain('Revised identity evidence.');
  });

  it('presents real Tool contracts but lets the caller perform every operation', async () => {
    const result = await generateRun(file, { ...options(), transport: async () => ({ draft: toolDraft(), model: 'test' }) });
    const runner = await BusyRunner.open(':memory:');
    try {
      let current = runner.start(result.program, { source_path: 'input/a.md', output_path: 'output/b.md' });
      expect(current.packet!.context.tools).toHaveProperty('File Tool');
      expect(current.packet!.context.tools).toHaveProperty('Logging Tool');
      for (const reply of [{}, { content: '# Caller content' }, { writtenPath: 'output/b.md' }, { logId: 'caller-log-1' }, {}, { decision: 'pass' }]) current = runner.emit(current.runId, current.token!, reply);
      expect(current.status).toBe('completed'); expect(current.result).toEqual({ writtenPath: 'output/b.md', logId: 'caller-log-1' });
      expect(runner.history(current.runId).some(e => e.type === 'call')).toBe(false);
      expect(runner.inspect(current.runId).program.compilation).toEqual(result.program.compilation);
      expect(() => readFileSync(join(dir, 'output/b.md'))).toThrow();
    } finally { runner.close(); }
  });

  it('drives the accepted real validate/fix draft through two repairs and a third clean validation', async () => {
    const source = join(dir, 'busy/base/busy-assistant.busy.md');
    const catalog = buildCompilationCatalog(source, 'createDocument', await loadRunSource(source));
    const draft = JSON.parse(readFileSync(join(dir, 'loop.draft.json'), 'utf8'));
    const plan = lowerConstrainedDraft(catalog, draft);
    expect(checkCoverage(catalog, plan)).toEqual([]); expect(checkBindings(plan)).toEqual([]);
    const program = await lowerRun(source, plan, 'accepted-live-draft');
    const scalar = (schema: ReplySchema): any => schema.type === 'string' ? schema.enum?.[0] ?? 'Synthetic caller evidence' : schema.type === 'boolean' ? true : schema.type === 'number' ? 1 : schema.type === 'array' ? [] : Object.fromEntries(Object.entries(schema.properties!).map(([k, v]) => [k, scalar(v)]));
    const runner = await BusyRunner.open(':memory:');
    try {
      let current = runner.start(program, Object.fromEntries(program.operations.createDocument.inputs.map(name => [name, 'Synthetic starting input'])));
      let validations = 0, exchanges = 0, repaired = 'Draft zero';
      const tokens: string[] = [];
      while (current.status === 'waiting' && exchanges++ < 250) {
        const step = program.operations[current.pointer!.operation].steps.find(s => s.id === current.pointer!.step)!;
        const reply = scalar(current.packet!.respondWith) as Values;
        if (current.pointer!.operation === 'createDocument') {
          if (Object.values(step.routes ?? {}).some(route => route.call === 'validateDocument')) {
            validations++; tokens.push(current.token!);
            expect(current.packet!.context.draft).toBe(repaired);
          }
          if (step.source.section === 'Steps' && step.source.item === 5) {
            const decision = current.packet!.respondWith.properties!.decision;
            if (decision) {
              expect(Object.keys(current.packet!.context).some(key => key.includes('validation') || key === 'report')).toBe(true);
              reply.decision = decision.enum!.find(choice => validations < 3 ? choice.includes('fail') : choice.includes('pass'))!;
              const route = step.routes![reply.decision as string];
              const next = program.operations.createDocument.steps.find(s => s.id === route.next);
              if (validations < 3 && next?.source.item === 4) repaired = `Draft repair ${validations}`;
            } else {
              expect(current.packet!.respondWith.properties).toHaveProperty('draft');
              repaired = `Draft repair ${validations}`;
            }
          }
        }
        for (const key of Object.keys(reply)) {
          if (['draft', 'document', 'target_doc'].includes(key)) reply[key] = repaired;
          if (['validation_report', 'report'].includes(key)) reply[key] = validations < 3 ? 'invalid: synthetic gap' : 'valid: synthetic evidence';
          if (key === 'validation_passed') reply[key] = validations >= 3;
        }
        if (current.pointer!.operation === 'runChecklist' && reply.decision) reply.decision = current.packet!.respondWith.properties!.decision.enum!.find(choice => !choice.includes('fail'))!;
        current = runner.emit(current.runId, current.token!, reply);
      }
      expect(current.status).toBe('completed'); expect(validations).toBe(3);
      expect(new Set(tokens).size).toBe(3); expect(current.result!.document).toBe('Draft repair 2');
      expect(runner.history(current.runId).filter(e => e.type === 'call' && e.operation === 'validateDocument')).toHaveLength(3);
    } finally { runner.close(); }
  });

  it('runs the accepted Local Definitions draft with source-backed role context', async () => {
    const source = join(dir, 'busy/base/workspace-agent.busy.md');
    const catalog = buildCompilationCatalog(source, 'assumeWorkspaceRole', await loadRunSource(source));
    const plan = lowerConstrainedDraft(catalog, JSON.parse(readFileSync(join(dir, 'locals.draft.json'), 'utf8')));
    expect(checkCoverage(catalog, plan)).toEqual([]); expect(checkBindings(plan)).toEqual([]);
    const program = await lowerRun(source, plan, 'accepted-live-draft');
    const runner = await BusyRunner.open(':memory:');
    try {
      const current = runner.start(program, { role_path: 'input/role.md' });
      expect(current.packet!.context.role_path).toBe('input/role.md');
      const definitions = current.packet!.context.definitions as Record<string, string>;
      expect(definitions.Persona).toContain('workspace executor');
      expect(definitions.Principles).toContain('trace.log');
      expect(definitions['role#executerole']).toContain('Assume Persona');
      runner.cancel(current.runId, 'Caller requests source/IR review');
      expect(runner.inspect(current.runId).program.sources).toHaveProperty('workspace-agent.busy.md');
    } finally { runner.close(); }
  });
});
