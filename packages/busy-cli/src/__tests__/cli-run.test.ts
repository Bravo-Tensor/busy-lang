import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { RunExchange } from '../runner/store.js';
import { generateRun } from '../runner/compiler.js';

const root = resolve(import.meta.dirname, '../..');
const cli = join(root, 'dist/cli/index.js');
const require = createRequire(import.meta.url);

describe('busy run CLI', () => {
  let dir: string;
  let db: string;
  beforeAll(() => {
    execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', join(root, 'tsconfig.json')], { cwd: root, timeout: 20_000 });
  });
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'busy-run-cli-'));
    cpSync(join(root, 'examples/runner'), dir, { recursive: true });
    db = join(dir, 'runs.sqlite');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const raw = (args: string[], input?: string) => spawnSync(process.execPath, [cli, 'run', '--db', db, ...args], { encoding: 'utf8', cwd: dir, input, timeout: 10_000 });
  const invoke = (args: string[], input?: string): any => {
    const result = raw(args, input);
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout);
  };
  const start = (): RunExchange => invoke(['start', 'review.busy.md', '--inputs', 'inputs.json']);

  it('runs entirely through separate CLI processes with JSON output and stdin replies', () => {
    let current = start();
    const id = current.runId;
    for (const reply of [
      { ready: true, limits: 'CLI test only' },
      { validation: { status: 'invalid', errors: ['Owner missing'], evidence: 'Observed blank owner' } },
      { decision: 'continue' },
      { checklist: [{ item: 'Ready', satisfied: false, evidence: 'Failure is reported' }] },
      { handoff: 'Owner remains unresolved' },
    ]) {
      expect(Object.keys(current).sort()).toEqual(['packet', 'pointer', 'runId', 'status', 'token']);
      expect(invoke(['sense', id])).toEqual(current);
      current = invoke(['emit', id, current.token!, '-'], JSON.stringify(reply));
    }
    expect(Object.keys(current).sort()).toEqual(['result', 'runId', 'status']);
    expect(current.status).toBe('completed');
    expect(current.result!.validation).toMatchObject({ status: 'invalid' });
    expect(invoke(['sense', id])).toEqual(current);
    const inspect = invoke(['inspect', id]);
    expect(inspect.stack).toEqual([]);
    expect(Object.keys(inspect.program.sources)).toEqual(['document-tool.busy.md', 'review.busy.md']);
    expect(invoke(['history', id])).toEqual(inspect.history);
    expect(invoke(['receipt', id])).toMatchObject({ exchanges: 5, status: 'completed' });
    expect(invoke(['list'])).toHaveLength(1);
  });

  it('reports bad replies on stderr, accepts @file and rejects a stale token without advancing', () => {
    const current = start();
    const before = invoke(['history', current.runId]);
    for (const reply of ['not-json', '{}']) {
      const bad = raw(['emit', current.runId, current.token!, reply]);
      expect(bad.status).toBe(1);
      expect(bad.stdout).toBe('');
      expect(bad.stderr.length).toBeGreaterThan(0);
      expect(invoke(['sense', current.runId])).toEqual(current);
      expect(invoke(['history', current.runId])).toEqual(before);
    }
    writeFileSync(join(dir, 'reply.json'), '{"ready":true,"limits":"Test only"}');
    const next = invoke(['emit', current.runId, current.token!, '@reply.json']);
    expect(next.pointer.step).toBe('validate');
    const stale = raw(['emit', current.runId, current.token!, '@reply.json']);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('Stale reply');
    expect(invoke(['sense', current.runId])).toEqual(next);
  });

  it('reports failure and explicitly resumes through separate processes without advancing', () => {
    const first = start();
    const before = invoke(['history', first.runId]);
    expect(raw(['fail', first.runId, first.token!, '{"reason":" "}']).status).toBe(1);
    expect(invoke(['history', first.runId])).toEqual(before);
    const failed = invoke(['fail', first.runId, first.token!, '-'], JSON.stringify({
      reason: 'Workspace permission is missing', partialEffects: ['Local inspection only'], evidence: ['local/readback.json'],
    }));
    expect(failed).toMatchObject({ status: 'failed', pointer: first.pointer });
    expect(failed.recoveryGuidance).toContain('next authorized repair action');
    expect(failed.recoveryGuidance).toContain('no new authority or automatic retry');
    expect(invoke(['sense', first.runId])).toEqual(failed);
    expect(raw(['emit', first.runId, failed.token, '{"ready":true,"limits":"later"}']).status).toBe(1);
    expect(raw(['resume', first.runId, first.token!]).status).toBe(1);
    expect(raw(['resume', first.runId, failed.token, '--values', '-'], '{"unknown":true}').status).toBe(1);
    expect(invoke(['sense', first.runId])).toEqual(failed);
    const resumed = invoke(['resume', first.runId, failed.token]);
    expect(resumed).toMatchObject({ status: 'waiting', pointer: first.pointer });
    expect(resumed).not.toHaveProperty('recoveryGuidance');
    expect(resumed.token).not.toBe(failed.token);
    const next = invoke(['emit', first.runId, resumed.token, '{"ready":true,"limits":"permission resolved"}']);
    expect(next.pointer.step).toBe('validate');
    expect(invoke(['history', first.runId]).filter((e: { type: string }) => e.type === 'failed')).toHaveLength(1);
  });

  it('accepts only one of two processes competing to reply to the same sense', async () => {
    const first = start();
    const compete = (caller: string) => promisify(execFile)(process.execPath, [
      cli, 'run', '--db', db, 'emit', first.runId, first.token!, JSON.stringify({ ready: true, limits: caller }),
    ], { cwd: dir, encoding: 'utf8', timeout: 10_000 });
    const results = await Promise.allSettled([compete('caller A'), compete('caller B')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.stderr).toContain('Stale reply');
    expect(invoke(['history', first.runId]).filter((event: { type: string }) => event.type === 'emit')).toHaveLength(1);
    expect(invoke(['sense', first.runId]).pointer.step).toBe('validate');
  });

  it('cancels and restarts from pinned sources even after the original files disappear', () => {
    const first = start();
    expect(invoke(['cancel', first.runId, 'Unexpected context'])).toEqual({ runId: first.runId, status: 'cancelled' });
    rmSync(join(dir, 'review.busy.md'));
    rmSync(join(dir, 'document-tool.busy.md'));
    const next = invoke(['restart', first.runId]);
    expect(next.runId).not.toBe(first.runId);
    expect(next.pointer.step).toBe('setup');
    expect(invoke(['inspect', next.runId]).restartedFrom).toBe(first.runId);
    expect(invoke(['history', first.runId]).some((e: { type: string }) => e.type === 'cancelled')).toBe(true);
  });

  it('loads edited sources explicitly and leaves the prior run intact after invalid restart', () => {
    const first = start();
    const old = invoke(['inspect', first.runId]);
    const text = readFileSync(join(dir, 'review.busy.md'), 'utf8');
    writeFileSync(join(dir, 'review.busy.md'), text + '\n[Missing]: ./not-here.busy.md\n');
    expect(raw(['restart', first.runId, '--file', 'review.busy.md']).status).toBe(1);
    expect(invoke(['inspect', first.runId])).toEqual(old);
    writeFileSync(join(dir, 'review.busy.md'), text.replace('Confirm the workspace', 'Reconfirm the workspace'));
    const next = invoke(['restart', first.runId, '--file', 'review.busy.md']);
    expect(next.packet.context.instruction).toContain('Reconfirm the workspace');
    expect(invoke(['inspect', next.runId]).program.sourceHash).not.toBe(old.program.sourceHash);
    expect(invoke(['inspect', first.runId]).program.sourceHash).toBe(old.program.sourceHash);
  });

  it('keeps normal CLI commands and help independent of SQLite initialization', () => {
    for (const args of [['--help'], ['run', '--help'], ['parse', join(dir, 'review.busy.md')]]) {
      const output = spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
      expect(output.status).toBe(0);
      expect(output.stderr).not.toContain('SQLite');
    }
    expect(raw(['start', 'review.busy.md']).status).not.toBe(0);
  });

  it('compiles from cache, exports accepted IR and starts it through the existing CLI without a key', async () => {
    const source = join(dir, 'real/tool-roundtrip.busy.md');
    const draft = JSON.parse(readFileSync(join(dir, 'real/tools.draft.json'), 'utf8'));
    const compiled = await generateRun(source, { entry: 'roundTrip', cacheDir: join(dir, '.busy/compiled'),
      transport: async () => ({ draft, model: 'offline-test' }) });
    const output = invoke(['compile', source, '--entry', 'roundTrip', '--key-file', 'nonexistent-secret.txt', '--out', 'exported.runner.json']);
    expect(output).toMatchObject({ cacheHit: true, programId: compiled.program.id });
    expect(readFileSync(join(dir, 'exported.runner.json'), 'utf8')).toContain('roundTrip');
    writeFileSync(join(dir, 'tool-inputs.json'), JSON.stringify({ source_path: 'input/a.md', output_path: 'output/b.md' }));
    const current = invoke(['start', source, '--entry', 'roundTrip', '--inputs', 'tool-inputs.json', '--key-file', 'nonexistent-secret.txt']);
    expect(current.packet.context.tools).toHaveProperty('File Tool');
    expect(current.packet.context.tools).toHaveProperty('Logging Tool');
    expect(invoke(['inspect', current.runId]).program.compilation.key).toBe(compiled.program.compilation!.key);
    const restarted = invoke(['restart', current.runId, '--file', source, '--entry', 'roundTrip']);
    expect(invoke(['inspect', restarted.runId]).program.id).toBe(compiled.program.id);
    expect(raw(['compile', source, '--entry', 'roundTrip', '--out', source]).status).toBe(1);
  });
});
