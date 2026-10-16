import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir, unlink, symlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { prepareRun, checkPreparedRun, createCursorDraft } from '../runner/preparation.js';
import { buildCompilationCatalog } from '../runner/compiler.js';
import { loadRunSource } from '../runner/program.js';
import { resolveGuidanceClosure, checkGuidanceClosure, type GuidancePolicy } from '../runner/guidance.js';
import { fingerprintFiles, checkFileFingerprint } from '../runner/identity.js';

const dirs: string[] = [];
const temp = async () => { const dir = await mkdtemp(join(tmpdir(), 'busy-offline-')); dirs.push(dir); return dir; };
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
const real = resolve(import.meta.dirname, '../../examples/runner/real');
const cli = resolve(import.meta.dirname, '../../dist/cli/index.js');
describe('offline preparation and source identity', () => {
  it('prepares an actual Tool-bearing source and includes shared checklist after its work', async () => {
    const dir = await temp(); await cp(real, dir, { recursive: true });
    const file = join(dir, 'tool-roundtrip.busy.md');
    await writeFile(file, await readFile(file, 'utf8') + '\n# [Checklist]\n\n- Verify the shared result.\n');
    const program = await prepareRun(file, { entry: 'roundTrip' });
    expect(program.interpretationFile).toBe(join(dir, 'tool-roundtrip.runner.json'));
    const steps = program.operations.roundTrip.steps;
    expect(steps.at(-1)!.source.section).toBe('Checklist');
    expect(steps.at(-1)!.source.operation).toBeUndefined();
    expect(steps.some(s => Object.keys(s.tools).length > 0)).toBe(true);
    await writeFile(program.interpretationFile, JSON.stringify(program.interpretation));
    expect((await checkPreparedRun(file)).id).toBe(program.id);
    const catalog = buildCompilationCatalog(file, 'roundTrip', await loadRunSource(file));
    const raw = createCursorDraft(catalog) as { operations: { steps: { sourceId: string }[] }[] };
    raw.operations[0].steps = raw.operations[0].steps.filter(s => s.sourceId !== 'roundTrip/document-checklist');
    await expect(prepareRun(file, { entry: 'roundTrip', draft: raw })).rejects.toThrow('Uncovered instruction');
  });
  it('exposes offline prepare/check through the real CLI without creating a run database', async () => {
    const dir = await temp(); await cp(real, dir, { recursive: true });
    const file = join(dir, 'tool-roundtrip.busy.md');
    const call = (args: string[]) => JSON.parse(execFileSync(process.execPath, [cli, 'run', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    const prepared = call(['prepare', file, '--entry', 'roundTrip']);
    expect(prepared.interpretationFile).toBe(join(dir, 'tool-roundtrip.runner.json'));
    expect(call(['check', file]).programId).toBe(prepared.programId);
    await expect(readFile(join(dir, '.busy/runs.sqlite'))).rejects.toThrow();
  });
  it('detects changed, missing and newly available local guidance with cycles and reference links', async () => {
    const dir = await temp(); await mkdir(join(dir, 'docs'));
    await writeFile(join(dir, 'docs/a.md'), '[next][b]\n\n[b]: b.md\n[remote](https://example.test/x.md)\n[future](future.md)\n');
    await writeFile(join(dir, 'docs/b.md'), '[cycle](a.md)\n');
    const policy: GuidancePolicy = { version: 1, roots: ['docs/'], pinnedLeaves: [], excluded: [], maxDocuments: 10 };
    const snapshot = await resolveGuidanceClosure(dir, ['docs/a.md'], policy);
    expect(snapshot.files).toHaveLength(3);
    await checkGuidanceClosure(dir, snapshot);
    const original = await readFile(join(dir, 'docs/b.md'));
    await writeFile(join(dir, 'docs/b.md'), 'Changed policy.\n');
    await expect(checkGuidanceClosure(dir, snapshot)).rejects.toThrow('closure changed');
    await unlink(join(dir, 'docs/b.md'));
    await expect(checkGuidanceClosure(dir, snapshot)).rejects.toThrow('closure changed');
    await writeFile(join(dir, 'docs/b.md'), original);
    await writeFile(join(dir, 'docs/future.md'), 'Now available.\n');
    await expect(checkGuidanceClosure(dir, snapshot)).rejects.toThrow('closure changed');
  });
  it('uses directory boundaries rather than shared path prefixes for guidance', async () => {
    const dir = await temp();
    for (const folder of ['docs', 'docs-old', 'docs/generated', 'docs/generated-notes']) await mkdir(join(dir, folder), { recursive: true });
    await writeFile(join(dir, 'docs/start.md'), '[outside](../docs-old/a.md)\n[generated](generated/a.md)\n[notes](generated-notes/a.md)\n');
    await writeFile(join(dir, 'docs/generated-notes/a.md'), 'Included guidance.');
    const snapshot = await resolveGuidanceClosure(dir, ['docs/start.md'], { version: 1, roots: ['docs'], pinnedLeaves: [], excluded: ['docs/generated'] });
    expect(snapshot.files.map(f => f.source)).toEqual(['docs/generated-notes/a.md', 'docs/start.md']);
    expect(snapshot.links.find(l => l.target === 'docs-old/a.md')!.disposition).toBe('outside-guidance-boundary');
    expect(snapshot.links.find(l => l.target === 'docs/generated/a.md')!.disposition).toBe('generated-artifact');
  });
  it('rejects fingerprint symlinks outside the selected root', async () => {
    const dir = await temp(), outside = await temp();
    await writeFile(join(outside, 'outside.md'), 'Outside root.');
    await symlink(join(outside, 'outside.md'), join(dir, 'linked.md'));
    await expect(fingerprintFiles(dir, ['linked.md'])).rejects.toThrow('symlink escapes root');
  });
  it('rejects stale file fingerprints and files outside the selected root', async () => {
    const dir = await temp(); await writeFile(join(dir, 'source.md'), 'Initial source.\n');
    const snapshot = await fingerprintFiles(dir, ['source.md']); await checkFileFingerprint(dir, snapshot);
    await writeFile(join(dir, 'source.md'), 'Changed source.\n');
    await expect(checkFileFingerprint(dir, snapshot)).rejects.toThrow('fingerprint changed');
    await expect(fingerprintFiles(dir, ['../outside.md'])).rejects.toThrow('escapes root');
  });
});
