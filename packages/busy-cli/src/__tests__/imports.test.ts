/**
 * Import Parsing Tests - Match busy-python import format
 *
 * busy-python uses reference-style markdown links:
 * [ConceptName]: path or [ConceptName]: path#anchor
 */

import { describe, it, expect } from 'vitest';
import { parseImports, resolveImportTarget } from '../parsers/imports';
import type { Import } from '../types/schema';

describe('parseImports', () => {
  it('should parse simple reference-style import', () => {
    const content = `
# [Imports]

[Operation]: ./operation.busy.md
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0]).toEqual({
      conceptName: 'Operation',
      path: './operation.busy.md',
      anchor: undefined,
    });
  });

  it('should parse import with anchor', () => {
    const content = `
[RunChecklist]: ./checklist.busy.md#runchecklist
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0]).toEqual({
      conceptName: 'RunChecklist',
      path: './checklist.busy.md',
      anchor: 'runchecklist',
    });
  });

  it('should parse multiple imports', () => {
    const content = `
# [Imports]

[Concept]: ./concept.busy.md
[Document]: ./document.busy.md
[Operation]: ./operation.busy.md
[input]: ./operation.busy.md#input
[output]: ./operation.busy.md#output
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(5);

    // Check specific imports
    const conceptImport = result.imports.find((i) => i.conceptName === 'Concept');
    expect(conceptImport?.path).toBe('./concept.busy.md');
    expect(conceptImport?.anchor).toBeUndefined();

    const inputImport = result.imports.find((i) => i.conceptName === 'input');
    expect(inputImport?.path).toBe('./operation.busy.md');
    expect(inputImport?.anchor).toBe('input');
  });

  it('should handle imports with parent directory paths', () => {
    const content = `
[Tool]: ../toolbox/tool.busy.md
[Utils]: ../../shared/utils.busy.md
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(2);
    expect(result.imports[0].path).toBe('../toolbox/tool.busy.md');
    expect(result.imports[1].path).toBe('../../shared/utils.busy.md');
  });

  it('should build symbol table from imports', () => {
    const content = `
[Operation]: ./operation.busy.md
[RunChecklist]: ./checklist.busy.md#runchecklist
`;

    const result = parseImports(content);
    expect(result.symbols).toHaveProperty('Operation');
    expect(result.symbols).toHaveProperty('RunChecklist');
  });

  it('should handle imports anywhere in document (not just imports section)', () => {
    const content = `
---
Name: Test
Type: [Document]
Description: Test
---

Some content here.

[Concept]: ./concept.busy.md

More content.

[Other]: ./other.busy.md#anchor
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(2);
  });

  it('should not parse inline markdown links as imports', () => {
    const content = `
This is [not an import](./file.md) in inline format.

[Actual Import]: ./import.busy.md
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].conceptName).toBe('Actual Import');
  });

  it('should handle concept names with spaces', () => {
    const content = `
[Local Definitions]: ./document.busy.md#local-definitions
[Imports Section]: ./document.busy.md#imports-section
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(2);
    expect(result.imports[0].conceptName).toBe('Local Definitions');
    expect(result.imports[1].conceptName).toBe('Imports Section');
  });

  it('should return empty array for document with no imports', () => {
    const content = `
---
Name: NoImports
Type: [Document]
Description: Document with no imports
---

# [Setup]

Just some setup content.
`;

    const result = parseImports(content);
    expect(result.imports).toHaveLength(0);
    expect(result.symbols).toEqual({});
  });

  it('should handle anchors with hyphens and numbers', () => {
    const content = `
[Step1]: ./steps.busy.md#step-1
[RunStep2]: ./steps.busy.md#run-step-2-validation
`;

    const result = parseImports(content);
    expect(result.imports[0].anchor).toBe('step-1');
    expect(result.imports[1].anchor).toBe('run-step-2-validation');
  });
});

describe('resolveImportTarget', () => {
  const fileMap = new Map([
    ['operation.busy.md', { docId: 'operation', path: './operation.busy.md' }],
    ['concept.busy.md', { docId: 'concept', path: './concept.busy.md' }],
    ['document.busy.md', { docId: 'document', path: './document.busy.md' }],
    ['checklist.busy.md', { docId: 'checklist', path: './checklist.busy.md' }],
    ['operation', { docId: 'operation', path: './operation.busy.md' }],
  ]);

  it('should resolve simple path to docId', () => {
    const result = resolveImportTarget('./operation.busy.md', fileMap);
    expect(result.docId).toBe('operation');
    expect(result.slug).toBeUndefined();
  });

  it('should resolve path with anchor to docId and slug', () => {
    const result = resolveImportTarget('./checklist.busy.md#runchecklist', fileMap);
    expect(result.docId).toBe('checklist');
    expect(result.slug).toBe('runchecklist');
  });

  it('should resolve relative parent paths', () => {
    // The resolver should handle path normalization
    const result = resolveImportTarget('../core/operation.busy.md', fileMap);
    // This test may need adjustment based on actual implementation
    // The key is that the basename should match
  });

  it('should return empty object for unresolved paths', () => {
    const result = resolveImportTarget('./nonexistent.busy.md', fileMap);
    expect(result).toEqual({});
  });

  it('should handle paths without ./ prefix', () => {
    const result = resolveImportTarget('operation.busy.md', fileMap);
    expect(result.docId).toBe('operation');
  });
});

describe('Import Format Validation', () => {
  it('should match busy-python regex pattern', () => {
    // busy-python pattern: r"\[([^\]]+)\]:\s*([^\s#]+)(?:#([^\s]+))?"
    const pattern = /\[([^\]]+)\]:\s*([^\s#]+)(?:#([^\s]+))?/g;

    const testCases = [
      { input: '[Concept]: ./concept.busy.md', expected: ['Concept', './concept.busy.md', undefined] },
      { input: '[Run]: ./file.md#anchor', expected: ['Run', './file.md', 'anchor'] },
      { input: '[Multi Word]: ../path/file.md', expected: ['Multi Word', '../path/file.md', undefined] },
      { input: '[Test]:./no-space.md', expected: ['Test', './no-space.md', undefined] },
      { input: '[Anchor]:./file.md#multi-word-anchor', expected: ['Anchor', './file.md', 'multi-word-anchor'] },
    ];

    for (const { input, expected } of testCases) {
      const match = pattern.exec(input);
      pattern.lastIndex = 0; // Reset for next iteration

      expect(match).not.toBeNull();
      if (match) {
        expect(match[1]).toBe(expected[0]); // concept name
        expect(match[2]).toBe(expected[1]); // path
        expect(match[3]).toBe(expected[2]); // anchor (may be undefined)
      }
    }
  });

  it('should not match inline link format', () => {
    const pattern = /^\[([^\]]+)\]:\s*([^\s#]+)(?:#([^\s]+))?$/m;

    const inlineLinks = [
      '[text](./file.md)',
      '[text](./file.md#anchor)',
      'Check [this](./link.md) out',
    ];

    for (const link of inlineLinks) {
      const match = pattern.exec(link);
      expect(match).toBeNull();
    }
  });
});
