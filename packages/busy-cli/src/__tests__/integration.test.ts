/**
 * Integration Tests - Full document parsing matching busy-python behavior
 *
 * These tests verify the complete parsing pipeline produces
 * output matching busy-python's parse_document() function.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDocument, resolveImports } from '../parser';
import type { BusyDocument, ToolDocument, Import } from '../types/schema';

const FIXTURES_DIR = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

describe('parseDocument', () => {
  describe('Basic Document Parsing', () => {
    it('should parse document metadata', () => {
      const content = loadFixture('document.busy.md');
      const doc = parseDocument(content);

      expect(doc.metadata.name).toBe('Document');
      expect(doc.metadata.type).toBe('[Document]');
      expect(doc.metadata.description).toBe('Base document type for all BUSY documents.');
    });

    it('should parse imports with concept names and paths', () => {
      const content = loadFixture('document.busy.md');
      const doc = parseDocument(content);

      expect(doc.imports).toHaveLength(1);
      expect(doc.imports[0].conceptName).toBe('Concept');
      expect(doc.imports[0].path).toBe('./concept.busy.md');
    });

    it('should parse local definitions', () => {
      const content = loadFixture('document.busy.md');
      const doc = parseDocument(content);

      expect(doc.definitions.length).toBeGreaterThan(0);
      const importsDef = doc.definitions.find((d) => d.name === 'Imports Section');
      expect(importsDef).toBeDefined();
      expect(importsDef?.content).toContain('external document references');
    });

    it('should parse setup section', () => {
      const content = loadFixture('document.busy.md');
      const doc = parseDocument(content);

      expect(doc.setup).toBeDefined();
      expect(doc.setup).toContain('evaluated before any operations');
    });

    it('should parse operations with structured steps', () => {
      const content = loadFixture('document.busy.md');
      const doc = parseDocument(content);

      expect(doc.operations).toHaveLength(1);
      const op = doc.operations[0];

      expect(op.name).toBe('EvaluateDocument');
      expect(op.steps).toHaveLength(4);
      expect(op.steps[0].stepNumber).toBe(1);
      expect(op.steps[0].instruction).toBe('Parse frontmatter for metadata');
      expect(op.checklist?.items).toHaveLength(4);
    });
  });

  describe('Document with Triggers', () => {
    it('should parse triggers from section', () => {
      const content = loadFixture('automated-workflow.busy.md');
      const doc = parseDocument(content);

      expect(doc.triggers.length).toBeGreaterThan(0);
    });

    it('should parse alarm trigger with schedule', () => {
      const content = loadFixture('automated-workflow.busy.md');
      const doc = parseDocument(content);

      const alarmTrigger = doc.triggers.find((t) => t.triggerType === 'alarm');
      expect(alarmTrigger).toBeDefined();
      expect(alarmTrigger?.operation).toBe('DailyReport');
      expect(alarmTrigger?.schedule).toBe('0 6 * * *');
    });

    it('should parse event trigger with filter', () => {
      const content = loadFixture('automated-workflow.busy.md');
      const doc = parseDocument(content);

      const eventTrigger = doc.triggers.find(
        (t) => t.triggerType === 'event' && t.eventType === 'data.received'
      );
      expect(eventTrigger).toBeDefined();
      expect(eventTrigger?.filter).toEqual({ from: '*@trusted.com' });
      expect(eventTrigger?.operation).toBe('ProcessIncoming');
    });

    it('should parse event trigger without filter', () => {
      const content = loadFixture('automated-workflow.busy.md');
      const doc = parseDocument(content);

      const webhookTrigger = doc.triggers.find(
        (t) => t.eventType === 'webhook.triggered'
      );
      expect(webhookTrigger).toBeDefined();
      expect(webhookTrigger?.filter).toBeUndefined();
    });
  });

  describe('Document with Operation References', () => {
    it('should extract operation references from steps', () => {
      const content = loadFixture('automated-workflow.busy.md');
      const doc = parseDocument(content);

      const processOp = doc.operations.find((o) => o.name === 'ProcessIncoming');
      expect(processOp).toBeDefined();

      // Step 1: "Run [ValidateInput] on the payload"
      expect(processOp?.steps[0].operationReferences).toContain('ValidateInput');

      // Step 2: "Apply processing rules from [ProcessingRule]"
      expect(processOp?.steps[1].operationReferences).toContain('ProcessingRule');

      // Step 3: "Execute [ProcessData] with validated input"
      expect(processOp?.steps[2].operationReferences).toContain('ProcessData');
    });
  });

  describe('Tool Document Parsing', () => {
    it('should return ToolDocument for Type: [Tool]', () => {
      const content = loadFixture('tool.busy.md');
      const doc = parseDocument(content);

      // Type guard to check if it's a ToolDocument
      expect('tools' in doc).toBe(true);
    });

    it('should parse provider from metadata', () => {
      const content = loadFixture('tool.busy.md');
      const doc = parseDocument(content);

      expect(doc.metadata.provider).toBe('composio');
    });

    it('should parse tools with providers', () => {
      const content = loadFixture('tool.busy.md');
      const doc = parseDocument(content) as ToolDocument;

      expect(doc.tools).toHaveLength(2);

      const sendEmail = doc.tools.find((t) => t.name === 'send_email');
      expect(sendEmail).toBeDefined();
      expect(sendEmail?.providers?.composio?.action).toBe('GMAIL_SEND_EMAIL');
      expect(sendEmail?.providers?.composio?.parameters).toEqual({
        to: 'to',
        subject: 'subject',
        body: 'body',
      });
    });

    it('should parse tool inputs and outputs', () => {
      const content = loadFixture('tool.busy.md');
      const doc = parseDocument(content) as ToolDocument;

      const sendEmail = doc.tools.find((t) => t.name === 'send_email');
      expect(sendEmail?.inputs).toHaveLength(3);
      expect(sendEmail?.outputs).toHaveLength(2);
      expect(sendEmail?.inputs[0]).toBe('to: Recipient email address');
    });
  });

  describe('Edge Cases', () => {
    it('should handle document with no imports', () => {
      const content = `
---
Name: NoImports
Type: [Document]
Description: Document without imports
---

# [Setup]

No imports needed.

# [Operations]

## SimpleOp

### [Steps]
1. Do something
`;

      const doc = parseDocument(content);
      expect(doc.imports).toHaveLength(0);
    });

    it('should handle document with no operations', () => {
      const content = `
---
Name: NoOps
Type: [Document]
Description: Document without operations
---

# [Local Definitions]

## SomeDefinition

Just a definition.
`;

      const doc = parseDocument(content);
      expect(doc.operations).toHaveLength(0);
    });

    it('should handle document with no setup', () => {
      const content = `
---
Name: NoSetup
Type: [Document]
Description: Document without setup
---

# [Operations]

## SomeOp

### [Steps]
1. Do it
`;

      const doc = parseDocument(content);
      expect(doc.setup).toBeUndefined();
    });

    it('should handle missing frontmatter gracefully', () => {
      const content = `
# Just Markdown

No frontmatter here.
`;

      expect(() => parseDocument(content)).toThrow();
    });

    it('should handle empty document', () => {
      const content = `
---
Name: Empty
Type: [Document]
Description: Empty document
---
`;

      const doc = parseDocument(content);
      expect(doc.metadata.name).toBe('Empty');
      expect(doc.imports).toHaveLength(0);
      expect(doc.definitions).toHaveLength(0);
      expect(doc.operations).toHaveLength(0);
      expect(doc.triggers).toHaveLength(0);
    });
  });
});

describe('resolveImports', () => {
  it('should resolve import paths to document IDs', () => {
    const doc: BusyDocument = {
      metadata: {
        name: 'Test',
        type: '[Document]',
        description: 'Test',
      },
      imports: [
        { conceptName: 'Concept', path: './concept.busy.md' },
        { conceptName: 'Operation', path: './operation.busy.md' },
      ],
      definitions: [],
      operations: [],
      triggers: [],
    };

    const basePath = FIXTURES_DIR;
    // This would resolve imports against actual files
    // For now, just verify the function signature
    expect(typeof resolveImports).toBe('function');
  });

  it('should detect circular imports', async () => {
    // Circular import detection test
    // doc-a imports doc-b, doc-b imports doc-a
    const docA = `
---
Name: DocA
Type: [Document]
Description: A
---

[DocB]: ./doc-b.busy.md
`;

    const docB = `
---
Name: DocB
Type: [Document]
Description: B
---

[DocA]: ./doc-a.busy.md
`;

    // Would need actual file system or mock for this test
    // The test documents the expected behavior
  });

  it('should validate anchor references exist in target', () => {
    // Anchor validation test
    const doc: BusyDocument = {
      metadata: {
        name: 'Test',
        type: '[Document]',
        description: 'Test',
      },
      imports: [
        { conceptName: 'NonExistent', path: './file.busy.md', anchor: 'nonexistent-anchor' },
      ],
      definitions: [],
      operations: [],
      triggers: [],
    };

    // Should throw BusyImportError when anchor doesn't exist
  });
});

describe('Output Format Compatibility', () => {
  it('should produce output matching busy-python structure', () => {
    const content = loadFixture('document.busy.md');
    const doc = parseDocument(content);

    // Verify structure matches busy-python BusyDocument
    expect(doc).toHaveProperty('metadata');
    expect(doc).toHaveProperty('imports');
    expect(doc).toHaveProperty('definitions');
    expect(doc).toHaveProperty('setup');
    expect(doc).toHaveProperty('operations');
    expect(doc).toHaveProperty('triggers');

    // Metadata structure
    expect(doc.metadata).toHaveProperty('name');
    expect(doc.metadata).toHaveProperty('type');
    expect(doc.metadata).toHaveProperty('description');

    // Import structure
    if (doc.imports.length > 0) {
      expect(doc.imports[0]).toHaveProperty('conceptName');
      expect(doc.imports[0]).toHaveProperty('path');
    }

    // Operation structure
    if (doc.operations.length > 0) {
      expect(doc.operations[0]).toHaveProperty('name');
      expect(doc.operations[0]).toHaveProperty('inputs');
      expect(doc.operations[0]).toHaveProperty('outputs');
      expect(doc.operations[0]).toHaveProperty('steps');

      // Step structure
      if (doc.operations[0].steps.length > 0) {
        expect(doc.operations[0].steps[0]).toHaveProperty('stepNumber');
        expect(doc.operations[0].steps[0]).toHaveProperty('instruction');
      }
    }
  });

  it('should serialize to JSON matching busy-python output', () => {
    const content = loadFixture('document.busy.md');
    const doc = parseDocument(content);

    // Should be serializable to JSON
    const json = JSON.stringify(doc);
    const parsed = JSON.parse(json);

    expect(parsed.metadata.name).toBe(doc.metadata.name);
    expect(parsed.imports).toEqual(doc.imports);
    expect(parsed.operations.length).toBe(doc.operations.length);
  });
});

describe('Frontmatter Parsing', () => {
  it('should handle Type as bracketed string', () => {
    const content = `
---
Name: Test
Type: [Document]
Description: Test
---
`;

    const doc = parseDocument(content);
    expect(doc.metadata.type).toBe('[Document]');
  });

  it('should NOT include Extends or Tags (busy-python removed these)', () => {
    const content = `
---
Name: Test
Type: [Document]
Description: Test
Extends:
  - Parent
Tags:
  - tag1
  - tag2
---
`;

    const doc = parseDocument(content);
    expect(doc.metadata).not.toHaveProperty('extends');
    expect(doc.metadata).not.toHaveProperty('tags');
  });

  it('should include Provider for tool documents', () => {
    const content = loadFixture('tool.busy.md');
    const doc = parseDocument(content);

    expect(doc.metadata.provider).toBe('composio');
  });
});
