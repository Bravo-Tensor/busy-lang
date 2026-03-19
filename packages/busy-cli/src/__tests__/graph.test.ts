import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { loadRepo } from '../loader.js';
import { buildWorkspaceGraph, formatGraph } from '../commands/graph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '__fixtures__', 'graph');

const MODEL_DOC = `---
Name: Prospect
Type: [Model]
Description: Prospect model
---

# Imports
`;

const VIEW_DOC = `---
Name: Prospect Pipeline
Type: [View]
Description: Prospect dashboard
---

# Imports
[Prospect]:./prospect.busy.md

# Display
Dashboard
`;

const PLAYBOOK_DOC = `---
Name: Prospect Review
Type: [Playbook]
Description: Review a prospect
---

# Imports
[Prospect]:./prospect.busy.md
`;

const CONFIG_DOC = `---
Name: App Config
Type: [Config]
Description: App configuration
---

# Imports
`;

const CYCLE_A_DOC = `---
Name: Cycle A
Type: [Document]
Description: Cycle A
---

# Imports
[CycleB]:./cycle-b.busy.md
`;

const CYCLE_B_DOC = `---
Name: Cycle B
Type: [Document]
Description: Cycle B
---

# Imports
[CycleA]:./cycle-a.busy.md
`;

const SELF_CYCLE_DOC = `---
Name: Self Cycle
Type: [Document]
Description: Self-referencing type-style doc
---

# Imports
[SelfCycle]:./self-cycle.busy.md
`;

function setupFixtures() {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'prospect.busy.md'), MODEL_DOC);
  writeFileSync(join(FIXTURES_DIR, 'prospect-pipeline.busy.md'), VIEW_DOC);
  writeFileSync(join(FIXTURES_DIR, 'prospect-review.busy.md'), PLAYBOOK_DOC);
  writeFileSync(join(FIXTURES_DIR, 'app-config.busy.md'), CONFIG_DOC);
  writeFileSync(join(FIXTURES_DIR, 'cycle-a.busy.md'), CYCLE_A_DOC);
  writeFileSync(join(FIXTURES_DIR, 'cycle-b.busy.md'), CYCLE_B_DOC);
  writeFileSync(join(FIXTURES_DIR, 'self-cycle.busy.md'), SELF_CYCLE_DOC);
}

function cleanFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

describe('busy graph command helpers', () => {
  beforeAll(() => {
    setupFixtures();
  });

  afterAll(() => {
    cleanFixtures();
  });

  it('builds workspace graph with nodes, edges, and stats', async () => {
    const repo = await loadRepo([join(FIXTURES_DIR, '*.busy.md')]);
    const graph = buildWorkspaceGraph(repo, FIXTURES_DIR);

    expect(graph.workspace).toBe('graph');
    expect(graph.stats.documents).toBe(7);
    expect(graph.stats.importEdges).toBe(5);
    expect(graph.stats.types.Model).toBe(1);
    expect(graph.stats.types.View).toBe(1);
    expect(graph.stats.types.Playbook).toBe(1);
    expect(graph.stats.types.Config).toBe(1);
    expect(graph.nodes.find((node) => node.name === 'Prospect')?.importedBy).toBe(2);
  });

  it('filters graph by type', async () => {
    const repo = await loadRepo([join(FIXTURES_DIR, '*.busy.md')]);
    const graph = buildWorkspaceGraph(repo, FIXTURES_DIR, 'Model');

    expect(graph.stats.documents).toBe(1);
    expect(graph.nodes[0].name).toBe('Prospect');
    expect(graph.edges).toHaveLength(0);
  });

  it('detects circular imports but ignores 1-node self-cycles', async () => {
    const repo = await loadRepo([join(FIXTURES_DIR, '*.busy.md')]);
    const graph = buildWorkspaceGraph(repo, FIXTURES_DIR);

    expect(graph.stats.circularImports).toContainEqual(['cycle-a', 'cycle-b']);
    expect(graph.stats.circularImports).not.toContainEqual(['self-cycle']);
  });

  it('formats tree output', async () => {
    const repo = await loadRepo([join(FIXTURES_DIR, '*.busy.md')]);
    const graph = buildWorkspaceGraph(repo, FIXTURES_DIR);
    const output = formatGraph(graph, 'tree');

    expect(output).toContain('graph (7 documents');
    expect(output).toContain('[Model] Prospect');
    expect(output).toContain('[View] Prospect Pipeline');
  });

  it('formats DOT output', async () => {
    const repo = await loadRepo([join(FIXTURES_DIR, '*.busy.md')]);
    const graph = buildWorkspaceGraph(repo, FIXTURES_DIR);
    const output = formatGraph(graph, 'dot');

    expect(output).toContain('digraph busy');
    expect(output).toContain('prospect-pipeline');
    expect(output).toContain('prospect');
    expect(output).toContain('imports');
  });
});
