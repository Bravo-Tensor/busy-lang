import { afterEach, beforeEach, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BusyRunner } from '../runner/store.js';
import { compileRun } from '../runner/program.js';

let dir: string;
let runner: BusyRunner;
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'busy-failure-'));
  cpSync(resolve(import.meta.dirname, '../../examples/runner'), dir, { recursive: true });
  writeFileSync(join(dir, 'publish.busy.md'), '---\nName: Publish\nType: [Document]\nDescription: Caller-owned publication.\n---\n# Operations\n## publish\n### Steps\n1. Publish the report to the authorized target.\n');
  writeFileSync(join(dir, 'publish.runner.json'), JSON.stringify({ version: 1, entry: 'publish', operations: {
    publish: { inputs: ['target'], outputs: [], steps: [{ id: 'publish',
      source: { operation: 'publish', section: 'Steps', item: 1 }, context: ['target'],
      respondWith: { type: 'object', properties: { workNotes: { type: 'string' } }, required: ['workNotes'], additionalProperties: false }, next: null }] },
  } }));
  runner = await BusyRunner.open(join(dir, 'runs.sqlite'));
});
afterEach(() => { runner.close(); rmSync(dir, { recursive: true, force: true }); });

it('fails a notes-only authored packet without fabricating success or advancing', async () => {
  const first = runner.start(await compileRun(join(dir, 'publish.busy.md')), { target: 'review/report' });
  expect(first.packet!.failWith.required).toContain('reason');
  const before = runner.inspect(first.runId);
  const failed = runner.fail(first.runId, first.token!, {
    reason: 'Publication cannot proceed under the current authority.',
    evidence: ['local/report.md'], partialEffects: ['Prepared a local report; nothing published.'],
  });
  expect(failed.status).toBe('failed');
  expect(failed.pointer).toEqual(first.pointer);
  expect(failed.token).not.toBe(first.token);
  expect(failed.failure).toMatchObject({ inputs: before.inputs, stack: before.stack,
    caller: null, partialEffects: ['Prepared a local report; nothing published.'] });
  expect(runner.inspect(first.runId).stack).toEqual(before.stack);
  expect(() => runner.emit(first.runId, failed.token!, { workNotes: 'Publish later' })).toThrow('failed');
  expect(runner.history(first.runId).filter(e => ['emit', 'return', 'completed'].includes(e.type))).toEqual([]);
  expect(runner.receipt(first.runId)).toMatchObject({ status: 'failed', exchanges: 0, failure: failed.failure });
});

it('requires explicit tokened recovery, preserves history across processes and retries the same step', async () => {
  const first = runner.start(await compileRun(join(dir, 'publish.busy.md')), { target: 'review/report' });
  const failed = runner.fail(first.runId, first.token!, { reason: 'Target needs correction', partialEffects: ['Local report retained'] });
  runner.close(); runner = await BusyRunner.open(join(dir, 'runs.sqlite'));
  expect(runner.sense(first.runId)).toEqual(failed);
  const history = runner.history(first.runId);
  for (const [token, values] of [[first.token!, {}], [failed.token!, { undeclared: true }]]) {
    expect(() => runner.resume(first.runId, token as string, values)).toThrow();
    expect(runner.sense(first.runId)).toEqual(failed);
    expect(runner.history(first.runId)).toEqual(history);
  }
  const retried = runner.resume(first.runId, failed.token!, { target: 'review/corrected-report' });
  expect(retried).toMatchObject({ status: 'waiting', pointer: first.pointer });
  expect(retried.packet!.context.target).toBe('review/corrected-report');
  expect(retried.token).not.toBe(failed.token);
  expect(() => runner.emit(first.runId, first.token!, { workNotes: 'old reply' })).toThrow('Stale reply');
  expect(() => runner.resume(first.runId, failed.token!, {})).toThrow('waiting');
  expect(runner.emit(first.runId, retried.token!, { workNotes: 'Caller reports publication receipt review/corrected-report.' }).status).toBe('completed');
  expect(runner.history(first.runId).slice(0, history.length)).toEqual(history);
  expect(runner.history(first.runId).filter(e => e.type === 'resumed')).toHaveLength(1);
  expect(runner.inspect(first.runId).inputs).toEqual({ target: 'review/report' });
});

it('exposes a nested failure to the caller while preserving both frames and partial values', async () => {
  const inputs = JSON.parse(readFileSync(join(dir, 'inputs.json'), 'utf8'));
  let current = runner.start(await compileRun(join(dir, 'review.busy.md')), inputs);
  current = runner.emit(current.runId, current.token!, { ready: true, limits: 'test' });
  current = runner.emit(current.runId, current.token!, { validation: { status: 'invalid', errors: ['Owner'], evidence: 'fixture' } });
  current = runner.emit(current.runId, current.token!, { decision: 'repairDocument' });
  const before = runner.inspect(current.runId);
  const failed = runner.fail(current.runId, current.token!, { reason: 'Repair requires an owner', partialEffects: ['Draft edit only'] });
  expect(failed.failure!.caller).toEqual({ operation: 'reviewDocument', step: 'checklist' });
  expect(failed.failure!.stack.map(f => f.operation)).toEqual(['reviewDocument', 'repairDocument']);
  expect(runner.inspect(current.runId).stack).toEqual(before.stack);
  expect(runner.history(current.runId).some(e => e.type === 'return')).toBe(false);
  const retried = runner.resume(current.runId, failed.token!, { document: { path: 'sample/brief.md', body: 'Corrected input' } });
  expect(retried.pointer).toEqual(current.pointer);
  expect(retried.packet!.context.document).toMatchObject({ body: 'Corrected input' });
  expect(runner.inspect(current.runId).stack[0]).toEqual(before.stack[0]);
});

it('rejects malformed or stale failures atomically and only accepts one reporter', async () => {
  const first = runner.start(await compileRun(join(dir, 'publish.busy.md')), { target: 'report' });
  const before = runner.inspect(first.runId);
  for (const report of [{}, { reason: ' ' }, { reason: 'blocked', success: true }, { reason: 'blocked', partialEffects: [false] }]) {
    expect(() => runner.fail(first.runId, first.token!, report)).toThrow();
    expect(runner.inspect(first.runId)).toEqual(before);
  }
  const other = await BusyRunner.open(join(dir, 'runs.sqlite'));
  try {
    runner.fail(first.runId, first.token!, { reason: 'blocked' });
    expect(() => other.fail(first.runId, first.token!, { reason: 'duplicate' })).toThrow('failed');
    expect(other.history(first.runId).filter(e => e.type === 'failed')).toHaveLength(1);
  } finally { other.close(); }
});

it('retains failure and pinned sources when explicitly restarting an edited operation', async () => {
  const file = join(dir, 'publish.busy.md');
  const program = await compileRun(file);
  const first = runner.start(program, { target: 'report' });
  runner.fail(first.runId, first.token!, { reason: 'Source needs author clarification' });
  const old = runner.inspect(first.runId);
  writeFileSync(file, readFileSync(file, 'utf8').replace('Publish the report', 'Publish the reviewed report'));
  const next = runner.start(await compileRun(file), { target: 'report' }, first.runId);
  expect(next.runId).not.toBe(first.runId);
  expect(runner.inspect(next.runId).restartedFrom).toBe(first.runId);
  expect(runner.inspect(first.runId)).toMatchObject({ status: 'failed', failure: old.failure, stack: old.stack, program });
  expect(runner.history(first.runId).slice(0, old.history.length)).toEqual(old.history);
  expect(runner.inspect(next.runId).program.sourceHash).not.toBe(program.sourceHash);
});

it('offers failure to existing saved runs without changing their authored reply or token', async () => {
  const first = runner.start(await compileRun(join(dir, 'publish.busy.md')), { target: 'report' });
  runner.close();
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(join(dir, 'runs.sqlite'));
  const row = db.prepare('SELECT state FROM runs WHERE id = ?').get(first.runId)!;
  const old = JSON.parse(row.state as string);
  delete old.current.packet.failWith;
  db.prepare('UPDATE runs SET state = ? WHERE id = ?').run(JSON.stringify(old), first.runId);
  db.close();
  runner = await BusyRunner.open(join(dir, 'runs.sqlite'));
  const current = runner.sense(first.runId);
  expect(current.token).toBe(first.token);
  expect(current.packet!.respondWith).toEqual(first.packet!.respondWith);
  // Exposed schema metadata must not be able to mutate runtime validation.
  current.packet!.failWith.required = [];
  expect(() => runner.fail(first.runId, first.token!, {})).toThrow('reason');
  runner.fail(first.runId, first.token!, { reason: 'Cannot follow this instruction' });
  expect(runner.cancel(first.runId, 'Ask the author to clarify').status).toBe('cancelled');
  expect(runner.receipt(first.runId)).toHaveProperty('failure');
});
