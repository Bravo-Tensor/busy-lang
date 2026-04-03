import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { loadWorkspaceAutomationIR } from '../commands/automation-ir.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '__fixtures__', 'automation-ir');

const GENERIC_DOC = `---
Name: Lead Intake
Type: [Document]
Description: Processes inbound lead events.
Triggers:
  - event_type: gmail.message.received
    operation: ProcessIncomingLead
---

# Operations

## ProcessIncomingLead

### Inputs
- message

### Steps
1. Validate [LeadRecord]
2. Queue [RespondToLead]
`;

const TOOL_DOC = `---
Name: Gmail Tool
Type: [Tool]
Description: Gmail helper tool definitions.
Provider: composio
Triggers:
  - event_type: gmail.message.received
    operation: RouteInboundMessage
---

# Operations

## RouteInboundMessage

### Steps
1. Call [send_email]

# Tools

## send_email
Send an email.

### Inputs
- to
- subject

### Outputs
- message_id

### Providers
#### composio
Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  subject: subject
`;

const PLAYBOOK_DOC = `---
Name: Daily Digest
Type: [Playbook]
Description: Sends a daily digest.
Triggers:
  - schedule: "0 6 * * *"
    operation: DailyReport
---

# Imports
[Lead Intake]:./lead-intake.busy.md

# Operations

## DailyReport

### Steps
1. Summarize yesterday
`;

function setupFixtures() {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'lead-intake.busy.md'), GENERIC_DOC);
  writeFileSync(join(FIXTURES_DIR, 'gmail-tool.busy.md'), TOOL_DOC);
  writeFileSync(join(FIXTURES_DIR, 'daily-digest.busy.md'), PLAYBOOK_DOC);
}

function cleanFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

describe('loadWorkspaceAutomationIR', () => {
  beforeAll(() => {
    setupFixtures();
  });

  afterAll(() => {
    cleanFixtures();
  });

  it('exports all documents with operations, triggers, and tools', async () => {
    const ir = await loadWorkspaceAutomationIR(FIXTURES_DIR);

    expect(ir.workspace).toBe('automation-ir');
    expect(ir.stats.documents).toBe(3);
    expect(ir.stats.operations).toBe(3);
    expect(ir.stats.triggers).toBe(3);
    expect(ir.stats.tools).toBe(1);
    expect(ir.stats.documentsByKind).toEqual({
      document: 1,
      playbook: 1,
      tool: 1,
    });

    const genericDoc = ir.documents.find((document) => document.name === 'Lead Intake');
    expect(genericDoc?.kind).toBe('document');
    expect(genericDoc?.triggers[0]?.eventType).toBe('gmail.message.received');
    expect(genericDoc?.operations[0]?.name).toBe('ProcessIncomingLead');

    const toolDoc = ir.documents.find((document) => document.name === 'Gmail Tool');
    expect(toolDoc?.kind).toBe('tool');
    expect(toolDoc?.metadata.provider).toBe('composio');
    expect(toolDoc?.tools?.[0]?.providers?.composio?.action).toBe('GMAIL_SEND_EMAIL');

    const playbookDoc = ir.documents.find((document) => document.name === 'Daily Digest');
    expect(playbookDoc?.kind).toBe('playbook');
    expect(playbookDoc?.triggers[0]?.schedule).toBe('0 6 * * *');
  });

  it('optionally includes the dependency graph summary', async () => {
    const ir = await loadWorkspaceAutomationIR(FIXTURES_DIR, { includeGraph: true });

    expect(ir.dependencyGraph?.stats.documents).toBe(3);
    expect(ir.dependencyGraph?.edges.some((edge) => edge.from === 'daily-digest' && edge.to === 'lead-intake')).toBe(true);
  });
});
