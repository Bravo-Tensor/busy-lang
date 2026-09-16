import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateLocalLinks } from '../validation/local-links.js';
const file = '/workspace/doc.busy.md';
describe('direct local links', () => {
  it('resolves both daily check-in operations', () => {
    expect(validateLocalLinks('[prepareDailyCheckInAgenda](#preparedailycheckinagenda)\n[runDailyCheckInMeeting](#rundailycheckinmeeting)\n## prepareDailyCheckInAgenda\n## runDailyCheckInMeeting', file)).toEqual([]);
  });
  it.each(['missing', 'Target'])('rejects missing or mis-cased anchor %s', anchor => {
    expect(validateLocalLinks(`[Go](#${anchor})\n## target`, file)).toEqual([expect.stringContaining('Line 1: local link anchor not found')]);
  });
  it('resolves reference definitions and duplicate slugs', () => {
    expect(validateLocalLinks('[Go]: #repeat-1\n[Go]\n## repeat\n## repeat', file)).toEqual([]);
  });
  it('checks relative files and encoded paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'busy-links-'));
    try {
      writeFileSync(join(dir, 'other file.md'), '## target');
      const source = join(dir, 'doc.busy.md');
      expect(validateLocalLinks('[Go](other%20file.md#target)', source)).toEqual([]);
      expect(validateLocalLinks('[Go]: other%20file.md#missing', source)).toHaveLength(1);
      expect(validateLocalLinks('[Go](absent.md)', source)).toHaveLength(1);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('ignores code links and does not treat code headings as anchors', () => {
    expect(validateLocalLinks('```md\n[bad](#missing)\n```\n~~~md\n[bad](absent.md)\n~~~\n\n    [bad](#missing)', file)).toEqual([]);
    expect(validateLocalLinks('[bad](#example)\n```md\n## example\n```', file)).toHaveLength(1);
  });
  it('excludes external and dynamic destinations', () => {
    expect(validateLocalLinks('[web](https://example.com/#missing)\n[email](mailto:a@example.com)\n[dynamic]({{agenda_url}})', file)).toEqual([]);
  });
});
