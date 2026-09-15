import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDocument } from '../parser';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('canonical Tool action format', () => {
  it('parses provider contracts without introducing Playbook operations', () => {
    const source = read('./fixtures/tool-action-contract.busy.md');
    const document = parseDocument(source);
    expect(document.operations).toHaveLength(0);
    expect(source).not.toMatch(/### \[Steps\]/);
    expect('tools' in document).toBe(true);
    if (!('tools' in document)) throw new Error('Expected a Tool document');
    expect(document.tools).toHaveLength(1);
    expect(document.tools[0]).toMatchObject({
      name: 'fetch_record',
      inputs: ['record_id: Stable synthetic record identifier.'],
      outputs: ['record: Matching synthetic record.'],
      providers: { example: { action: 'records.get', parameters: { record_id: 'id' } } },
    });
  });

  it('keeps the canonical Tool example compatible with the parser', () => {
    const source = read('../../../../busy/core/tool.busy.md');
    const section = source.split('## Tool action document structure')[1]?.split('# [Local Definitions]')[0];
    const example = section?.match(/```markdown\n([\s\S]*?)```/)?.[1];
    expect(example).toBeTruthy();
    const document = parseDocument(`---\nName: Example\nType: [Tool]\nDescription: Synthetic contract.\n---\n${example}`);
    expect('tools' in document && document.tools[0]?.name).toBe('fetch_record');
    expect(document.operations).toHaveLength(0);
  });
});
