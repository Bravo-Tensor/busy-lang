import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseMarkdown } from '../parsers/markdown.js';
import { parseSections, getAllSections } from '../parsers/sections.js';
import { parseDocument } from '../parser.js';
import { loadRepo } from '../loader.js';
import { validateOperationNames } from '../validation/operation-names.js';
import { validateDocument } from '../validation/index.js';
import { RepoSchema } from '../types/schema.js';
import { validateLocalLinks } from '../validation/local-links.js';

const content = `---
Name: Daily Check-in
Type: [Playbook]
Description: Architecture regression.
---
[Operations]: ./document.busy.md#operations-section
[Operation]: ./operation.busy.md
# [Operations]
## [prepareDailyCheckInAgenda][Operation]
### Steps
1. Prepare the agenda.
## [runDailyCheckInMeeting](./operation.busy.md)
### Steps
1. Meet.
[Prepare](#preparedailycheckinagenda)
\`\`\`markdown
## BogusOperation
[broken](#absent)
\`\`\`
# Display
## Repeat
## Repeat
`;
describe('shared Markdown to BUSY architecture', () => {
  it.each(['Document', 'Playbook', 'View', 'Config', 'Tool'])('uses identical %s entities in parsing, validation, and graph loading', async type => {
    const dir = mkdtempSync(join(tmpdir(), 'busy-canonical-'));
    try {
      const file = join(dir, 'test.busy.md');
      const input = `---\nName: Canonical\nType: [${type}]\nDescription: One model.\n---\n# Setup\nContext.\n# Local Definitions\n## Example\nDefinition.\n# Operations\n## doWork\n### Input\n- value\n### Steps\n1. Work.\n### Output\n- result`;
      writeFileSync(file, input);
      const document = parseDocument(input, file);
      expect(validateDocument(input, file).document).toEqual(document);
      const repo = await loadRepo([file]);
      expect(repo.byFile[document.docId].concept).toEqual(document);
      expect(repo.operations[document.operations[0].id]).toEqual(document.operations[0]);
      expect(RepoSchema.safeParse(repo).success).toBe(true);
      expect(document.operations[0].inputs).toEqual(['value']);
      expect(document.operations[0].outputs).toEqual(['result']);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('gives document parsing, graph loading, and validation the same declarations', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'busy-architecture-'));
    try {
      const file = join(dir, 'daily.busy.md'); writeFileSync(file, content);
      const markdown = parseMarkdown(content);
      const document = parseDocument(content, file);
      const repo = await loadRepo([file]);
      const names = ['prepareDailyCheckInAgenda', 'runDailyCheckInMeeting'];
      expect(document.operations.map(op => op.name)).toEqual(names);
      expect(Object.values(repo.operations).map(op => op.name)).toEqual(names);
      expect(validateOperationNames(markdown)).toEqual([]);
      expect(Object.values(repo.byFile)[0].bySlug['repeat-1']).toBeDefined();
      expect(repo.edges.some(edge => edge.to.endsWith('#preparedailycheckinagenda'))).toBe(true);
      expect(repo.edges.some(edge => edge.to.endsWith('#absent'))).toBe(false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('uses the same duplicate heading anchors for source validation and graph sections', () => {
    const source = parseMarkdown('# Start\n## Repeat\n## Repeat\n[Go](#repeat-1)');
    const sections = parseSections(source.content, 'doc', '/doc.md', source);
    expect(getAllSections(sections).map(section => section.slug)).toEqual([...source.anchors]);
    expect(validateLocalLinks(source, '/doc.md')).toEqual([]);
  });
  it('ignores a fenced Operations section in document parsing', () => {
    expect(parseDocument('---\nName: Example\nType: [Document]\nDescription: Example.\n---\n```md\n# Operations\n## Fake\n```').operations).toEqual([]);
  });
});
