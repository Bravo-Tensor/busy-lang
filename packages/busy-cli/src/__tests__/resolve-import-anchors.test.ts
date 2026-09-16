import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDocument, resolveImports } from '../parser';

const doc = (body: string, type = 'Model') => `---\nName: Test\nType: [${type}]\nDescription: Synthetic.\n---\n${body}`;

describe('import heading validation', () => {
  let dir: string;
  let warnings: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'busy-anchors-'));
    warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { warnings.mockRestore(); rmSync(dir, { recursive: true, force: true }); });
  const resolve = (body: string, dir: string) => resolveImports(parseDocument(doc(body)), join(dir, 'root.busy.md'));

  it('resolves ordinary, linked, duplicate and Tool headings, including repeated aliases', () => {
    writeFileSync(join(dir, 'target.busy.md'), doc('# Fields\n# [Setup](./core.md)\n# Fields\n# [Tools]\n## QueryFunnelEvents\n', 'Tool'));
    const result = resolve('[Fields]: ./target.busy.md#fields\n[Setup]: ./target.busy.md#setup\n[Again]: ./target.busy.md#fields-1\n[Query]: ./target.busy.md#queryfunnelevents', dir);
    expect(Object.keys(result)).toEqual(['Fields', 'Setup', 'Again', 'Query']);
    expect(warnings).not.toHaveBeenCalled();
  });

  it('rejects missing anchors and headings inside code blocks, even on cached files', () => {
    writeFileSync(join(dir, 'target.busy.md'), doc('# Fields\n```md\n# Fake\n```'));
    resolve('[Valid]: ./target.busy.md#fields\n[Missing]: ./target.busy.md#absent\n[Fake]: ./target.busy.md#fake', dir);
    expect(warnings.mock.calls.flat().join('\n')).toContain("Anchor 'absent' not found");
    expect(warnings.mock.calls.flat().join('\n')).toContain("Anchor 'fake' not found");
    expect(warnings.mock.calls.flat().join('\n')).not.toContain('Circular');
  });

  it('distinguishes diamond reuse from a real recursion cycle', () => {
    writeFileSync(join(dir, 'shared.busy.md'), doc('# Fields'));
    writeFileSync(join(dir, 'a.busy.md'), doc('[AField]: ./shared.busy.md#fields'));
    writeFileSync(join(dir, 'b.busy.md'), doc('[BField]: ./shared.busy.md#fields'));
    const result = resolve('[A]: ./a.busy.md\n[B]: ./b.busy.md', dir);
    expect(result.AField).toBe(result.BField);
    expect(warnings).not.toHaveBeenCalled();
    writeFileSync(join(dir, 'a.busy.md'), doc('[B]: ./b.busy.md'));
    writeFileSync(join(dir, 'b.busy.md'), doc('[A]: ./a.busy.md'));
    resolve('[A]: ./a.busy.md', dir);
    expect(warnings.mock.calls.flat().join('\n')).toContain('Circular import skipped');
  });
});
