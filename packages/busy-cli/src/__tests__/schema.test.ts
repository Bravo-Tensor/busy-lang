/**
 * Schema Tests - Define expected data models matching busy-python
 *
 * These tests define the API contract for BUSY document parsing.
 * The schemas should match busy-python's Pydantic models as the source of truth.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import schemas - use New* schemas for busy-python compatible types
import {
  MetadataSchema,
  ImportSchema,
  LocalDefinitionSchema,
  StepSchema,
  ChecklistSchema,
  TriggerSchema,
  NewOperationSchema as OperationSchema,  // Use new schema for busy-python compat
  ToolSchema,
  NewBusyDocumentSchema as BusyDocumentSchema,  // Use new schema for busy-python compat
  ToolDocumentSchema,
} from '../types/schema';

describe('Schema: Metadata', () => {
  it('should require name, type, and description', () => {
    const validMetadata = {
      name: 'TestDocument',
      type: '[Document]',
      description: 'A test document',
    };

    const result = MetadataSchema.safeParse(validMetadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('TestDocument');
      expect(result.data.type).toBe('[Document]');
      expect(result.data.description).toBe('A test document');
    }
  });

  it('should accept optional provider field', () => {
    const metadataWithProvider = {
      name: 'GmailTool',
      type: '[Tool]',
      description: 'Gmail integration tool',
      provider: 'composio',
    };

    const result = MetadataSchema.safeParse(metadataWithProvider);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('composio');
    }
  });

  it('should reject metadata without required fields', () => {
    const missingName = {
      type: '[Document]',
      description: 'Missing name',
    };

    const result = MetadataSchema.safeParse(missingName);
    expect(result.success).toBe(false);
  });

  it('should reject empty name or description', () => {
    const emptyName = {
      name: '',
      type: '[Document]',
      description: 'Valid description',
    };

    const result = MetadataSchema.safeParse(emptyName);
    expect(result.success).toBe(false);
  });

  it('should NOT have Extends or Tags fields (removed from busy-python)', () => {
    const metadataWithExtends = {
      name: 'Test',
      type: '[Document]',
      description: 'Test',
      extends: ['Parent'], // This should be ignored or rejected
      tags: ['tag1'], // This should be ignored or rejected
    };

    const result = MetadataSchema.safeParse(metadataWithExtends);
    // Should parse but not include extends/tags in the result
    if (result.success) {
      expect(result.data).not.toHaveProperty('extends');
      expect(result.data).not.toHaveProperty('tags');
    }
  });
});

describe('Schema: Import', () => {
  it('should parse import with concept name and path', () => {
    const validImport = {
      conceptName: 'Operation',
      path: './operation.busy.md',
    };

    const result = ImportSchema.safeParse(validImport);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conceptName).toBe('Operation');
      expect(result.data.path).toBe('./operation.busy.md');
      expect(result.data.anchor).toBeUndefined();
    }
  });

  it('should parse import with anchor', () => {
    const importWithAnchor = {
      conceptName: 'RunChecklist',
      path: './checklist.busy.md',
      anchor: 'runchecklist',
    };

    const result = ImportSchema.safeParse(importWithAnchor);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.anchor).toBe('runchecklist');
    }
  });

  it('should require concept name and path', () => {
    const missingPath = {
      conceptName: 'Test',
    };

    const result = ImportSchema.safeParse(missingPath);
    expect(result.success).toBe(false);
  });
});

describe('Schema: LocalDefinition', () => {
  it('should parse local definition with name and content', () => {
    const validDef = {
      name: 'Capability',
      content: 'A system feature or function that can be invoked.',
    };

    const result = LocalDefinitionSchema.safeParse(validDef);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Capability');
      expect(result.data.content).toBe('A system feature or function that can be invoked.');
    }
  });

  it('should allow empty content', () => {
    const emptyContent = {
      name: 'Placeholder',
      content: '',
    };

    const result = LocalDefinitionSchema.safeParse(emptyContent);
    expect(result.success).toBe(true);
  });
});

describe('Schema: Step', () => {
  it('should parse step with number and instruction', () => {
    const validStep = {
      stepNumber: 1,
      instruction: 'Parse the document frontmatter',
    };

    const result = StepSchema.safeParse(validStep);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stepNumber).toBe(1);
      expect(result.data.instruction).toBe('Parse the document frontmatter');
    }
  });

  it('should parse step with operation references', () => {
    const stepWithRefs = {
      stepNumber: 2,
      instruction: 'Execute [ValidateInput] then run [ProcessData]',
      operationReferences: ['ValidateInput', 'ProcessData'],
    };

    const result = StepSchema.safeParse(stepWithRefs);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operationReferences).toEqual(['ValidateInput', 'ProcessData']);
    }
  });

  it('should require step number >= 1', () => {
    const invalidStep = {
      stepNumber: 0,
      instruction: 'Invalid step',
    };

    const result = StepSchema.safeParse(invalidStep);
    expect(result.success).toBe(false);
  });

  it('should require non-empty instruction', () => {
    const emptyInstruction = {
      stepNumber: 1,
      instruction: '',
    };

    const result = StepSchema.safeParse(emptyInstruction);
    expect(result.success).toBe(false);
  });
});

describe('Schema: Checklist', () => {
  it('should parse checklist with items', () => {
    const validChecklist = {
      items: ['Input validated', 'Output generated', 'Logs written'],
    };

    const result = ChecklistSchema.safeParse(validChecklist);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(3);
    }
  });

  it('should allow empty checklist', () => {
    const emptyChecklist = {
      items: [],
    };

    const result = ChecklistSchema.safeParse(emptyChecklist);
    expect(result.success).toBe(true);
  });
});

describe('Schema: Trigger', () => {
  it('should parse time-based alarm trigger', () => {
    const alarmTrigger = {
      rawText: 'Set alarm for 6am each morning to run DailyReview',
      triggerType: 'alarm',
      schedule: '0 6 * * *',
      operation: 'DailyReview',
    };

    const result = TriggerSchema.safeParse(alarmTrigger);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggerType).toBe('alarm');
      expect(result.data.schedule).toBe('0 6 * * *');
      expect(result.data.operation).toBe('DailyReview');
    }
  });

  it('should parse event-based trigger', () => {
    const eventTrigger = {
      rawText: 'When gmail.message.received from *@lead.com, run ProcessLead',
      triggerType: 'event',
      eventType: 'gmail.message.received',
      filter: { from: '*@lead.com' },
      operation: 'ProcessLead',
    };

    const result = TriggerSchema.safeParse(eventTrigger);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggerType).toBe('event');
      expect(result.data.eventType).toBe('gmail.message.received');
      expect(result.data.filter).toEqual({ from: '*@lead.com' });
    }
  });

  it('should have queueWhenPaused default to true', () => {
    const trigger = {
      rawText: 'When event, run Op',
      triggerType: 'event',
      eventType: 'test.event',
      operation: 'Op',
    };

    const result = TriggerSchema.safeParse(trigger);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.queueWhenPaused).toBe(true);
    }
  });
});

describe('Schema: Operation', () => {
  it('should parse operation with all fields', () => {
    const validOperation = {
      name: 'ExecuteTask',
      inputs: ['task_name: Name of the task', 'context: Execution context'],
      outputs: ['result: The computed result'],
      steps: [
        { stepNumber: 1, instruction: 'Validate inputs' },
        { stepNumber: 2, instruction: 'Execute task' },
      ],
      checklist: { items: ['Input validated', 'Task executed'] },
    };

    const result = OperationSchema.safeParse(validOperation);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('ExecuteTask');
      expect(result.data.inputs).toHaveLength(2);
      expect(result.data.outputs).toHaveLength(1);
      expect(result.data.steps).toHaveLength(2);
      expect(result.data.checklist?.items).toHaveLength(2);
    }
  });

  it('should allow operation with empty inputs/outputs/steps', () => {
    const minimalOperation = {
      name: 'SimpleOp',
      inputs: [],
      outputs: [],
      steps: [],
    };

    const result = OperationSchema.safeParse(minimalOperation);
    expect(result.success).toBe(true);
  });

  it('should allow optional checklist', () => {
    const noChecklist = {
      name: 'NoChecklist',
      inputs: [],
      outputs: [],
      steps: [{ stepNumber: 1, instruction: 'Do something' }],
    };

    const result = OperationSchema.safeParse(noChecklist);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.checklist).toBeUndefined();
    }
  });
});

describe('Schema: Tool', () => {
  it('should parse tool with all fields', () => {
    const validTool = {
      name: 'send_email',
      description: 'Send an email to recipients',
      inputs: ['to: Recipient email', 'subject: Email subject', 'body: Email content'],
      outputs: ['message_id: Sent message ID'],
      examples: ['send_email(to="user@example.com", subject="Hi", body="Hello")'],
      providers: {
        composio: {
          action: 'GMAIL_SEND_EMAIL',
          parameters: { to: 'to', subject: 'subject', body: 'body' },
        },
      },
    };

    const result = ToolSchema.safeParse(validTool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('send_email');
      expect(result.data.providers?.composio?.action).toBe('GMAIL_SEND_EMAIL');
    }
  });

  it('should allow tool without providers', () => {
    const toolNoProviders = {
      name: 'local_tool',
      description: 'A local tool without external providers',
      inputs: ['data: Input data'],
      outputs: ['result: Output result'],
    };

    const result = ToolSchema.safeParse(toolNoProviders);
    expect(result.success).toBe(true);
  });
});

describe('Schema: BusyDocument', () => {
  it('should parse complete document structure', () => {
    const validDocument = {
      metadata: {
        name: 'TestDocument',
        type: '[Document]',
        description: 'A test document',
      },
      imports: [
        { conceptName: 'Concept', path: './concept.busy.md' },
      ],
      definitions: [
        { name: 'LocalDef', content: 'A local definition' },
      ],
      setup: 'Initialize the document context.',
      operations: [
        {
          name: 'TestOp',
          inputs: [],
          outputs: [],
          steps: [{ stepNumber: 1, instruction: 'Do something' }],
        },
      ],
      triggers: [],
    };

    const result = BusyDocumentSchema.safeParse(validDocument);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.name).toBe('TestDocument');
      expect(result.data.imports).toHaveLength(1);
      expect(result.data.definitions).toHaveLength(1);
      expect(result.data.setup).toBe('Initialize the document context.');
      expect(result.data.operations).toHaveLength(1);
    }
  });

  it('should allow optional setup', () => {
    const noSetup = {
      metadata: {
        name: 'NoSetup',
        type: '[Document]',
        description: 'Document without setup',
      },
      imports: [],
      definitions: [],
      operations: [],
      triggers: [],
    };

    const result = BusyDocumentSchema.safeParse(noSetup);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.setup).toBeUndefined();
    }
  });
});

describe('Schema: ToolDocument', () => {
  it('should parse tool document with tools array', () => {
    const validToolDoc = {
      metadata: {
        name: 'GmailTools',
        type: '[Tool]',
        description: 'Gmail integration tools',
        provider: 'composio',
      },
      imports: [],
      definitions: [],
      operations: [],
      triggers: [],
      tools: [
        {
          name: 'send_email',
          description: 'Send an email',
          inputs: ['to: Recipient'],
          outputs: ['message_id: Message ID'],
          providers: {
            composio: { action: 'GMAIL_SEND_EMAIL', parameters: { to: 'to' } },
          },
        },
      ],
    };

    const result = ToolDocumentSchema.safeParse(validToolDoc);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tools).toHaveLength(1);
      expect(result.data.metadata.provider).toBe('composio');
    }
  });
});
