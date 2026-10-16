import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compileRun } from '../runner/program.js';
import { BusyRunner, type RunExchange } from '../runner/store.js';
import type { Interpretation, Values } from '../runner/schema.js';
import { loadResolvedRepo } from '../loader.js';
import { buildContext, getConceptContext } from '../builders/context.js';

const sample = resolve(import.meta.dirname, '../../examples/runner');
const doc = (name: string, body: string, type = 'Document') => `---\nName: ${name}\nType: [${type}]\nDescription: Test fixture.\n---\n${body}\n`;
function response(sense: RunExchange): Values {
  switch (sense.pointer!.step) {
    case 'setup': return { ready: true, limits: 'Test values only' };
    case 'validate': return { validation: { status: 'invalid', errors: ['Owner is blank'], evidence: 'Read the returned document' } };
    case 'decide': return { decision: 'repairDocument' };
    case 'repair': return { document: { path: 'sample/brief.md', body: 'Owner: Test caller' }, repairReceipt: 'Changed the returned document value only' };
    case 'revalidate': return { validation: { status: 'valid', errors: [], evidence: 'Owner: Test caller' } };
    case 'repairChecklist': return { repairChecklist: [{ item: 'Scope', satisfied: true, evidence: 'In-memory only' }] };
    case 'checklist': return { checklist: [{ item: 'Ready', satisfied: false, evidence: 'Caller retains judgment' }] };
    case 'handoff': return { handoff: 'Caller-reported result' };
    default: throw new Error('Unexpected step');
  }
}

describe('caller-executed runner', () => {
  let dir: string;
  let runner: BusyRunner;
  let inputs: Values;
  const source = () => join(dir, 'review.busy.md');
  const planFile = () => join(dir, 'review.runner.json');
  const editPlan = (edit: (plan: Interpretation) => void) => {
    const plan = JSON.parse(readFileSync(planFile(), 'utf8')) as Interpretation;
    edit(plan); writeFileSync(planFile(), JSON.stringify(plan));
  };
  const emit = (sense: RunExchange, reply: Values = response(sense)) => runner.emit(sense.runId, sense.token!, reply);
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'busy-runner-'));
    cpSync(sample, dir, { recursive: true });
    inputs = JSON.parse(readFileSync(join(dir, 'inputs.json'), 'utf8')) as Values;
    runner = await BusyRunner.open(join(dir, 'runs.sqlite'));
  });
  afterEach(() => { runner.close(); rmSync(dir, { recursive: true, force: true }); });

  it('uses canonical source spans, operation context, imported tools and definitions', async () => {
    const program = await compileRun(source());
    const { repo } = await loadResolvedRepo(source());
    const op = Object.values(repo.operations).find(op => op.name === 'repairDocument')!;
    const context = buildContext(repo, op.id);
    const toolId = context.symbols['Document Tool'].docId!;
    expect(program.operations.repairDocument.steps[0].tools['Document Tool'])
      .toBe((getConceptContext(repo, toolId).concept as { content: string }).content);
    let sense = runner.start(program, inputs);
    expect(Object.keys(sense.packet!)).toEqual(['context', 'respondWith']);
    expect(sense.packet!.context.instruction).toContain('Confirm the workspace');
    sense = emit(sense);
    expect(sense.packet!.context.instruction).toContain('- Report unknown when evidence is insufficient');
    expect(sense.packet!.context.definitions).toHaveProperty('Ready brief');
    const line = readFileSync(source(), 'utf8').split('\n')[sense.pointer!.source.start - 1];
    expect(line).toMatch(/^1\. Validate/);
  });

  it('follows the caller decision even when validation fails and checklists report false', async () => {
    let sense = runner.start(await compileRun(source()), inputs);
    sense = emit(emit(sense));
    sense = emit(sense, { decision: 'continue' });
    expect(sense.pointer!.step).toBe('checklist');
    sense = emit(emit(sense));
    expect(sense.status).toBe('completed');
    expect(sense.result!.validation).toMatchObject({ status: 'invalid' });
    expect(sense.result!.checklist).toEqual([{ item: 'Ready', satisfied: false, evidence: 'Caller retains judgment' }]);
    expect(runner.history(sense.runId).some(e => e.type === 'call')).toBe(false);
  });

  it('pushes a child frame, isolates inputs, returns updated values and receipts, and pops the frame', async () => {
    let sense = runner.start(await compileRun(source()), inputs);
    sense = emit(emit(emit(sense)));
    expect(runner.inspect(sense.runId).stack.map(f => f.operation)).toEqual(['reviewDocument', 'repairDocument']);
    expect(runner.inspect(sense.runId).stack[1].values).not.toHaveProperty('ready');
    sense = emit(sense);
    expect(runner.inspect(sense.runId).stack[0].values.document).toEqual(inputs.document);
    sense = emit(emit(sense));
    expect(runner.inspect(sense.runId).stack).toHaveLength(1);
    expect(sense.packet!.context.validation).toMatchObject({ status: 'valid' });
    while (sense.status === 'waiting') sense = emit(sense);
    const history = runner.history(sense.runId);
    expect(history.filter(e => e.type === 'return').map(e => e.operation)).toEqual(['repairDocument', 'reviewDocument']);
    expect(runner.receipt(sense.runId).exchanges).toBe(8);
    for (const emitted of history.filter(e => e.type === 'emit')) {
      expect(history.filter(e => e.type === 'sense' && e.token === emitted.token)).toHaveLength(1);
    }
  });

  it('supports a caller-controlled loop back to the original validation with a fresh token', async () => {
    editPlan(plan => { plan.operations.reviewDocument.steps[2].routes!.repairDocument.next = 'validate'; });
    let sense = runner.start(await compileRun(source()), inputs);
    sense = emit(sense);
    const firstValidation = sense;
    sense = emit(emit(emit(emit(emit(sense)))));
    expect(sense.pointer!.step).toBe('validate');
    expect(sense.packet!.context.document).toMatchObject({ body: 'Owner: Test caller' });
    expect(sense.token).not.toBe(firstValidation.token);
    expect(runner.inspect(sense.runId).stack).toHaveLength(1);
    sense = emit(sense, { validation: { status: 'valid', errors: [], evidence: 'Owner is now supplied' } });
    sense = emit(sense, { decision: 'continue' });
    expect(emit(emit(sense)).status).toBe('completed');
  });

  it('rejects malformed and stale replies and rolls back transitions with missing next context', async () => {
    const sense = runner.start(await compileRun(source()), inputs);
    const before = runner.inspect(sense.runId);
    for (const bad of [{}, { ready: 'yes', limits: '' }, { ready: true, limits: '', extra: true }]) {
      expect(() => emit(sense, bad as Values)).toThrow();
      expect(runner.inspect(sense.runId)).toEqual(before);
    }
    const next = emit(sense);
    expect(() => emit(sense)).toThrow('Stale reply');
    expect(runner.sense(sense.runId)).toEqual(next);
    editPlan(plan => { plan.operations.reviewDocument.steps[1].context.push('missing'); });
    const broken = runner.start(await compileRun(source()), inputs);
    expect(() => emit(broken)).toThrow('Missing context value: missing');
    expect(runner.sense(broken.runId)).toEqual(broken);
    expect(runner.history(broken.runId).filter(e => e.type === 'emit')).toHaveLength(0);
  });

  it('resumes after reopening SQLite and rejects a second writer with the old token', async () => {
    const first = runner.start(await compileRun(source()), inputs);
    runner.close(); runner = await BusyRunner.open(join(dir, 'runs.sqlite'));
    expect(runner.sense(first.runId)).toEqual(first);
    const other = await BusyRunner.open(join(dir, 'runs.sqlite'));
    try {
      const next = emit(first);
      expect(() => other.emit(first.runId, first.token!, response(first))).toThrow('Stale reply');
      expect(other.sense(first.runId)).toEqual(next);
    } finally { other.close(); }
  });

  it('keeps source versions and history after cancel and edited restart, including changed dependencies', async () => {
    const original = await compileRun(source());
    const first = runner.start(original, inputs);
    runner.cancel(first.runId, 'The next sense is not cogent with my observations');
    expect(() => emit(first)).toThrow('cancelled');
    writeFileSync(join(dir, 'document-tool.busy.md'), readFileSync(join(dir, 'document-tool.busy.md'), 'utf8') + '\nNew caller constraint.\n');
    const edited = await compileRun(source());
    expect(edited.sourceHash).not.toBe(original.sourceHash);
    expect(edited.interpretationHash).toBe(original.interpretationHash);
    const restarted = runner.start(edited, inputs, first.runId);
    expect(runner.inspect(restarted.runId).restartedFrom).toBe(first.runId);
    expect(runner.inspect(first.runId).program).toEqual(original);
    expect(runner.history(first.runId).at(-1)).toMatchObject({ type: 'restarted', newRunId: restarted.runId });
  });

  it('pins transitive dependencies and resolves nested relative imports and anchored definitions', async () => {
    mkdirSync(join(dir, 'shared'));
    writeFileSync(join(dir, 'shared', 'rules.busy.md'), doc('Shared rules', '# Local Definitions\n## Ready brief\nImported criterion.\n### Evidence\nRetain this child section.'));
    const tool = join(dir, 'document-tool.busy.md');
    writeFileSync(tool, readFileSync(tool, 'utf8') + '\n[Rules]: ./shared/rules.busy.md#ready-brief\n');
    writeFileSync(source(), readFileSync(source(), 'utf8') + '\n[Shared Ready]: ./shared/rules.busy.md#ready-brief\n');
    editPlan(plan => { plan.operations.reviewDocument.steps[1].definitions = ['Shared Ready']; });
    const compiled = await compileRun(source());
    expect(Object.keys(compiled.sources)).toEqual(['document-tool.busy.md', 'review.busy.md', 'shared/rules.busy.md']);
    expect(compiled.operations.reviewDocument.steps[1].definitions['Shared Ready']).toContain('Retain this child section.');
    expect((await compileRun(source())).id).toBe(compiled.id);
  });

  it('resolves identically named files by their importing directory, not the last basename alias', async () => {
    mkdirSync(join(dir, 'a')); mkdirSync(join(dir, 'b'));
    writeFileSync(join(dir, 'a', 'rules.busy.md'), doc('Rules A', '# Local Definitions\n## Criterion\nRule A.'));
    writeFileSync(join(dir, 'b', 'rules.busy.md'), doc('Rules B', '# Local Definitions\n## Criterion\nRule B.'));
    writeFileSync(source(), readFileSync(source(), 'utf8') + '\n[Rule A]: ./a/rules.busy.md#criterion\n[Rule B]: ./b/rules.busy.md#criterion\n');
    editPlan(plan => { plan.operations.reviewDocument.steps[1].definitions = ['Rule A', 'Rule B']; });
    const program = await compileRun(source());
    expect(program.operations.reviewDocument.steps[1].definitions).toEqual({ 'Rule A': 'Rule A.', 'Rule B': 'Rule B.' });
  });

  it('retains nested content in local definitions and rejects unsupported reply schemas', async () => {
    writeFileSync(source(), readFileSync(source(), 'utf8').replace('# Operations', '### Owner evidence\nCaller supplies the owner.\n\n# Operations'));
    expect((await compileRun(source())).operations.reviewDocument.steps[1].definitions['Ready brief']).toContain('Caller supplies the owner.');
    const plan = JSON.parse(readFileSync(planFile(), 'utf8'));
    plan.operations.reviewDocument.steps[0].respondWith.oneOf = [];
    writeFileSync(planFile(), JSON.stringify(plan));
    await expect(compileRun(source())).rejects.toThrow();
  });

  it('supports an imported operation through its resolved import alias and context', async () => {
    writeFileSync(join(dir, 'worker.busy.md'), doc('Worker', '# Operations\n## repairDocument\n### Steps\n1. Return the revised document.'));
    writeFileSync(source(), readFileSync(source(), 'utf8') + '\n[External Repair]: ./worker.busy.md#repairdocument\n');
    editPlan(plan => {
      const op = plan.operations.repairDocument;
      op.ref = 'External Repair'; op.outputs = ['document', 'repairReceipt'];
      op.steps = [{ ...op.steps[0], definitions: [], tools: [], next: null }];
    });
    let sense = runner.start(await compileRun(source()), inputs);
    sense = emit(emit(emit(sense)));
    expect(sense.pointer!.source.file).toBe('worker.busy.md');
    expect(sense.packet!.context.instruction).toBe('Return the revised document.');
    expect(emit(sense).pointer!.step).toBe('checklist');
  });

  it('fails on unpinnable imports, invalid anchors, ambiguous documents and invalid IR before starting', async () => {
    const original = readFileSync(source(), 'utf8');
    for (const target of ['./missing.busy.md', './document-tool.busy.md#missing', 'https://example.com/remote.busy.md', '{{dynamic}}/tool.busy.md']) {
      writeFileSync(source(), original + `\n[Missing]: ${target}\n`);
      await expect(compileRun(source())).rejects.toThrow();
    }
    writeFileSync(join(dir, 'duplicate.busy.md'), original);
    writeFileSync(source(), original + '\n[Duplicate]: ./duplicate.busy.md\n');
    await expect(compileRun(source())).rejects.toThrow('Ambiguous document id');
    writeFileSync(source(), original);
    editPlan(plan => { plan.operations.reviewDocument.steps[0].next = 'absent'; });
    await expect(compileRun(source())).rejects.toThrow('unknown next step');
    expect(runner.list()).toEqual([]);
  });
});
