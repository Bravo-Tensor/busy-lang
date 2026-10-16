import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { validateDocument } from '../validation/index.js';
import { generateRun } from '../runner/compiler.js';
import { BusyRunner } from '../runner/store.js';

const library = resolve(import.meta.dirname, '../../../../busy');
const scratch: string[] = [];
afterEach(() => scratch.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

describe('shipped core runner compatibility', () => {
  it('strictly validates every shipped core document', () => {
    const core = join(library, 'core');
    const errors = readdirSync(core).filter(name => name.endsWith('.busy.md')).flatMap(name => {
      const file = join(core, name);
      return validateDocument(readFileSync(file, 'utf8'), file).findings
        .filter(finding => finding.severity === 'error').map(finding => `${name}: ${finding.message}`);
    });
    expect(errors).toEqual([]);
  });

  it('compiles and starts through real View, Config and Personality dependencies', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'busy-core-compat-')); scratch.push(dir);
    cpSync(library, join(dir, 'busy'), { recursive: true });
    const file = join(dir, 'inspect-core.busy.md');
    writeFileSync(file, `---
Name: Inspect Core
Type: [Document]
---
# Imports
[Document]: ./busy/core/document.busy.md
[View]: ./busy/core/view.busy.md
[Config]: ./busy/core/config.busy.md
[Personality]: ./busy/core/personality.busy.md
# Setup
Read [View], [Config] and [Personality] before inspecting their contracts.
# Operations
## inspectCore
### Input
### Steps
1. Inspect the supplied core contracts.
### Output
Return the inspected result.
### Checklist
- The contracts were inspected.
`);
    let requests = 0;
    const result = await generateRun(file, { entry: 'inspectCore', cacheDir: join(dir, 'compiled'),
      transport: async () => {
        requests++;
        const sources = ['setup', 'steps/1', 'output', 'checklist'];
        return { model: 'offline-regression', draft: { issue: null, entry: 'inspectCore', operations: [{
          name: 'inspectCore', inputs: [], outputs: [], steps: sources.map((source, index) => ({
            id: `step${index}`, sourceId: `inspectCore/${source}`, context: [], definitions: [], tools: [],
            returnValues: [], routes: [], next: index + 1 < sources.length ? `step${index + 1}` : null,
          })),
        }] } };
      } });
    expect(requests).toBe(1);
    expect(result.program.sources['busy/core/view.busy.md']).toContain('## Data Source');
    expect(result.program.sources['busy/core/config.busy.md']).toContain('## Fields Section');
    const runner = await BusyRunner.open(':memory:');
    try {
      const first = runner.start(result.program, {});
      expect(first.status).toBe('waiting');
      expect(first.pointer?.source.section).toBe('Setup');
      expect(first.packet?.context.definitions).toHaveProperty('View');
      expect(first.packet?.context.definitions).toHaveProperty('Config');
      expect(first.packet?.context.definitions).toHaveProperty('Personality');
      runner.cancel(first.runId, 'Source/compile/start regression only; no caller work performed');
      expect(runner.receipt(first.runId)).toMatchObject({ status: 'cancelled', exchanges: 0 });
    } finally { runner.close(); }
  });
});
