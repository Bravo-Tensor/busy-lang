import { describe, expect, it } from 'vitest';
import { validateDocument } from '../index.js';
const header = '---\nName: Test\nType: [Playbook]\nDescription: Validation test.\n---\n';
const file = '/workspace/test.busy.md';
describe('document validation pipeline', () => {
  it('aggregates independent errors and warnings with check identifiers', () => {
    const result = validateDocument(header + '# Operations\n## [BadName](#badname)\n[missing](#absent)', file);
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'heading-links', severity: 'error' }),
      expect.objectContaining({ check: 'operation-names', severity: 'error' }),
      expect.objectContaining({ check: 'local-links', severity: 'error' }),
      expect.objectContaining({ check: 'operation-steps', severity: 'warning' }),
      expect.objectContaining({ check: 'operation-imports', severity: 'warning' }),
    ]));
  });
  it('returns the parsed document and no findings for valid content', () => {
    const result = validateDocument(header + '# Setup\nNo setup required.', file, { resolveImports: true });
    expect(result.document.name).toBe('Test');
    expect(result.findings).toEqual([]);
    expect(result.resolvedImports).toEqual({});
  });
  it('preserves parse failures before running checks', () => {
    expect(() => validateDocument('not a BUSY document', file)).toThrow();
  });
});
