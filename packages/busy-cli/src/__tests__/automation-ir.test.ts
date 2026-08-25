import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { loadWorkspaceAutomationIR } from '../commands/automation-ir.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '__fixtures__', 'automation-ir');

const MODEL_DOC = `---
Name: Story State
Type: [Model]
Description: Durable development-story state.
---

# Fields

| Field | Type | Meaning |
|---|---|---|
| story_id | string | Stable issue identifier |
| phase | string | Current development phase |

# Lifecycle

design -> execute -> fit -> complete
`;

const PLAYBOOK_DOC = `---
Name: Story Delivery
Type: [Playbook]
Description: Evidence-gated development delivery.
audience: operators
Triggers:
  - schedule: "0 6 * * *"
    operation: ExecuteStory
---

# [Imports]

[Story State]:./story-state.busy.md#fields

# [Operations]

## ExecuteStory

Deliver one approved story without skipping proof.

### [Input][Input Section]
- \`story_id\` — issue to deliver
- \`approval\` (optional) — current human approval evidence

### [Triggers]
event_type: linear.issue.approved
queue_when_paused: true

### [Emits]
- event_type: StoryImplemented
  when: implementation and focused checks complete
- event_type: StoryBlocked
  when: required evidence is unavailable

### [Steps][Steps Section]

#### Step 1: Inspect current state
- **[Condition]:** Story is not already complete.
- **[Role Context]:** [Implementer]
- Invoke [LoadStory] and inspect the repository.

#### Step 2: Implement and prove
- Invoke [RunFocusedChecks].

##### Step 2a: Recover from failure
- **[Condition]:** Focused checks fail.
- Invoke [DiagnoseFailure].

### [Output][Output Section]
- \`result\` — implementation result and evidence

### [Checklist][Checklist Section]
- [ ] Required approval was present
- [ ] Focused checks produced observable evidence
`;

const TOOL_DOC = `---
Name: Development Tool
Type: [Tool]
Description: Boundary operations used by development playbooks.
Provider: local
---

# Operations

## RunFocusedChecks

### Input
- \`command\` — command to run

### Steps
1. Run the command and capture stdout, stderr, and exit status.

### Output
- \`exit_code\` — process exit status
`;

function setupFixtures() {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'story-state.busy.md'), MODEL_DOC);
  writeFileSync(join(FIXTURES_DIR, 'story-delivery.busy.md'), PLAYBOOK_DOC);
  writeFileSync(join(FIXTURES_DIR, 'development-tool.busy.md'), TOOL_DOC);
}

function cleanFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

describe('loadWorkspaceAutomationIR', () => {
  beforeAll(setupFixtures);
  afterAll(cleanFixtures);

  it('compiles the semantic structure used by real BUSY playbooks', async () => {
    const ir = await loadWorkspaceAutomationIR(FIXTURES_DIR, { strict: true });

    expect(ir.schema).toBe('busy.semantic-ir/v1');
    expect(ir.workspace).toBe('automation-ir');
    expect(ir.stats.documents).toBe(3);
    expect(ir.stats.operations).toBe(2);
    expect(ir.stats.steps).toBe(4);
    expect(ir.stats.triggers).toBe(2);
    expect(ir.stats.emits).toBe(2);
    expect(ir.stats.checklistItems).toBe(2);
    expect(ir.stats.documentsByKind).toEqual({
      tool: 1,
      playbook: 1,
      model: 1,
    });

    const playbook = ir.documents.find((document) => document.kind === 'playbook')!;
    expect(playbook.metadata.attributes.audience).toBe('operators');
    expect(playbook.imports[0]?.resolvedDocumentId).toBe('story-state');
    expect(playbook.operations[0]?.inputs.map((field) => field.name)).toEqual([
      'story_id',
      'approval',
    ]);
    expect(playbook.operations[0]?.inputs[1]?.required).toBe(false);
    expect(playbook.operations[0]?.outputs[0]?.name).toBe('result');
    expect(playbook.operations[0]?.triggers[0]?.eventType).toBe('linear.issue.approved');
    expect(playbook.operations[0]?.emits.map((emit) => emit.eventType)).toEqual([
      'StoryImplemented',
      'StoryBlocked',
    ]);
    expect(playbook.operations[0]?.steps[0]?.conditions[0]?.expression).toBe(
      'Story is not already complete.',
    );
    expect(playbook.operations[0]?.steps[0]?.roleContexts[0]?.role).toContain('Implementer');
    expect(playbook.operations[0]?.steps[1]?.children[0]?.ordinal).toBe('2a');
    expect(playbook.operations[0]?.checklist[0]?.span.startLine).toBeGreaterThan(1);

    const model = ir.documents.find((document) => document.kind === 'model')!;
    expect(model.model?.fields.map((field) => field.name)).toEqual(['story_id', 'phase']);
    expect(model.model?.lifecycle?.content).toContain('design -> execute');
  });

  it('optionally includes the legacy dependency graph during migration', async () => {
    const ir = await loadWorkspaceAutomationIR(FIXTURES_DIR, { includeGraph: true });
    expect(ir.dependencyGraph?.stats.documents).toBe(3);
    expect(ir.dependencyGraph?.edges.some((edge) =>
      edge.from === 'story-delivery' && edge.to === 'story-state'
    )).toBe(true);
  });

  it('rejects unresolved imports in strict mode', async () => {
    writeFileSync(join(FIXTURES_DIR, 'broken.busy.md'), `---
Name: Broken
Type: [Document]
Description: Broken import fixture.
---
# Imports
[Missing]:./missing.busy.md
`);
    await expect(loadWorkspaceAutomationIR(FIXTURES_DIR, { strict: true }))
      .rejects.toThrow('does not resolve');
    rmSync(join(FIXTURES_DIR, 'broken.busy.md'));
  });
});
