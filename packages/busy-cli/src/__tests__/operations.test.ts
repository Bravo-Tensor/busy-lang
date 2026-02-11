/**
 * Operations Parsing Tests - Match busy-python Operation model
 *
 * Operations in busy-python have:
 * - name: string
 * - inputs: list[str]
 * - outputs: list[str]
 * - steps: list[Step] where Step has stepNumber, instruction, operationReferences
 * - checklist: Optional[Checklist] with items list
 */

import { describe, it, expect } from 'vitest';
import { parseOperations, parseSteps, parseChecklist } from '../parsers/operations';
import type { Operation, Step } from '../types/schema';

describe('parseSteps', () => {
  it('should parse numbered steps with step numbers', () => {
    const content = `
### [Steps]
1. Parse the document frontmatter
2. Resolve all imports
3. Execute the setup section
`;

    const steps = parseSteps(content);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({
      stepNumber: 1,
      instruction: 'Parse the document frontmatter',
      operationReferences: undefined, // undefined when no references (matches busy-python Optional)
    });
    expect(steps[1].stepNumber).toBe(2);
    expect(steps[2].stepNumber).toBe(3);
  });

  it('should extract operation references from step text', () => {
    const content = `
### [Steps]
1. Run [ValidateInput] to check data
2. Execute [ProcessData] and then [SaveResults]
3. Call [SendNotification] on completion
`;

    const steps = parseSteps(content);
    expect(steps[0].operationReferences).toEqual(['ValidateInput']);
    expect(steps[1].operationReferences).toEqual(['ProcessData', 'SaveResults']);
    expect(steps[2].operationReferences).toEqual(['SendNotification']);
  });

  it('should handle multi-line step instructions', () => {
    const content = `
### [Steps]
1. First step that continues
   on the next line with more detail
2. Second step is single line
`;

    const steps = parseSteps(content);
    expect(steps).toHaveLength(2);
    expect(steps[0].instruction).toContain('continues');
    expect(steps[0].instruction).toContain('more detail');
  });

  it('should handle steps without Steps heading (just numbered list)', () => {
    const content = `
## OperationName

1. Do first thing
2. Do second thing
3. Do third thing
`;

    const steps = parseSteps(content);
    expect(steps).toHaveLength(3);
  });

  it('should return empty array for content with no steps', () => {
    const content = `
## OperationName

Just some description without steps.
`;

    const steps = parseSteps(content);
    expect(steps).toHaveLength(0);
  });

  it('should not include checklist items as steps', () => {
    const content = `
### [Steps]
1. Execute task

### [Checklist]
- Task completed
- Output verified
`;

    const steps = parseSteps(content);
    expect(steps).toHaveLength(1);
    expect(steps[0].instruction).toBe('Execute task');
  });

  it('should handle operation references with various formats', () => {
    const content = `
### [Steps]
1. Run [Simple]
2. Execute [Multi Word Operation]
3. Call [run-with-dashes]
4. Use [CamelCase123]
`;

    const steps = parseSteps(content);
    expect(steps[0].operationReferences).toEqual(['Simple']);
    expect(steps[1].operationReferences).toEqual(['Multi Word Operation']);
    expect(steps[2].operationReferences).toEqual(['run-with-dashes']);
    expect(steps[3].operationReferences).toEqual(['CamelCase123']);
  });
});

describe('parseChecklist', () => {
  it('should parse checklist items from bullet list', () => {
    const content = `
### [Checklist]
- Input validated
- Processing complete
- Output written
`;

    const checklist = parseChecklist(content);
    expect(checklist).not.toBeNull();
    expect(checklist?.items).toHaveLength(3);
    expect(checklist?.items).toEqual([
      'Input validated',
      'Processing complete',
      'Output written',
    ]);
  });

  it('should handle checklist with asterisk bullets', () => {
    const content = `
### [Checklist]
* First item
* Second item
`;

    const checklist = parseChecklist(content);
    expect(checklist?.items).toHaveLength(2);
  });

  it('should return null for content without checklist', () => {
    const content = `
### [Steps]
1. Do something
`;

    const checklist = parseChecklist(content);
    expect(checklist).toBeNull();
  });

  it('should handle checklist without bracket notation', () => {
    const content = `
### Checklist
- Item one
- Item two
`;

    const checklist = parseChecklist(content);
    expect(checklist?.items).toHaveLength(2);
  });

  it('should handle multi-line checklist items', () => {
    const content = `
### [Checklist]
- First item that continues
  on the next line
- Second item
`;

    const checklist = parseChecklist(content);
    expect(checklist?.items).toHaveLength(2);
    expect(checklist?.items[0]).toContain('continues');
  });
});

describe('parseOperations', () => {
  it('should parse operation with all sections', () => {
    const content = `
# [Operations]

## EvaluateDocument

Load and evaluate a BUSY document.

### [Inputs]
- document_path: Path to the document
- context: Execution context

### [Outputs]
- parsed_document: The parsed document object
- errors: List of any errors

### [Steps]
1. Parse frontmatter
2. Resolve imports
3. Execute setup

### [Checklist]
- Frontmatter valid
- Imports resolved
- Setup complete
`;

    const operations = parseOperations(content);
    expect(operations).toHaveLength(1);

    const op = operations[0];
    expect(op.name).toBe('EvaluateDocument');
    expect(op.inputs).toHaveLength(2);
    expect(op.inputs[0]).toBe('document_path: Path to the document');
    expect(op.outputs).toHaveLength(2);
    expect(op.steps).toHaveLength(3);
    expect(op.steps[0].stepNumber).toBe(1);
    expect(op.checklist?.items).toHaveLength(3);
  });

  it('should parse multiple operations', () => {
    const content = `
# [Operations]

## FirstOperation

### [Steps]
1. Do first thing

## SecondOperation

### [Steps]
1. Do second thing

## ThirdOperation

### [Steps]
1. Do third thing
`;

    const operations = parseOperations(content);
    expect(operations).toHaveLength(3);
    expect(operations.map((o) => o.name)).toEqual([
      'FirstOperation',
      'SecondOperation',
      'ThirdOperation',
    ]);
  });

  it('should handle operation without inputs/outputs', () => {
    const content = `
# [Operations]

## SimpleOp

### [Steps]
1. Just do it
`;

    const operations = parseOperations(content);
    expect(operations).toHaveLength(1);
    expect(operations[0].inputs).toEqual([]);
    expect(operations[0].outputs).toEqual([]);
  });

  it('should handle operation without checklist', () => {
    const content = `
# [Operations]

## NoChecklist

### [Steps]
1. Do something
2. Do something else
`;

    const operations = parseOperations(content);
    expect(operations).toHaveLength(1);
    expect(operations[0].checklist).toBeUndefined();
  });

  it('should parse inputs and outputs as string arrays', () => {
    const content = `
# [Operations]

## ProcessData

### [Inputs]
- data: The input data to process
- options: Processing options (optional)

### [Outputs]
- result: Processed result
- metadata: Processing metadata
`;

    const operations = parseOperations(content);
    const op = operations[0];

    expect(op.inputs).toEqual([
      'data: The input data to process',
      'options: Processing options (optional)',
    ]);
    expect(op.outputs).toEqual([
      'result: Processed result',
      'metadata: Processing metadata',
    ]);
  });

  it('should handle Operations section without bracket notation', () => {
    const content = `
# Operations

## TestOp

### Steps
1. Test step
`;

    const operations = parseOperations(content);
    expect(operations).toHaveLength(1);
  });

  it('should return empty array for document without Operations section', () => {
    const content = `
# [Setup]

Just setup content.

# [Local Definitions]

## SomeDef

Definition content.
`;

    const operations = parseOperations(content);
    expect(operations).toHaveLength(0);
  });

  it('should extract operation references from all steps', () => {
    const content = `
# [Operations]

## Orchestrator

### [Steps]
1. First run [ValidateInput]
2. Then execute [ProcessData] with [Transform]
3. Finally call [SaveOutput]
`;

    const operations = parseOperations(content);
    const op = operations[0];

    expect(op.steps[0].operationReferences).toEqual(['ValidateInput']);
    expect(op.steps[1].operationReferences).toEqual(['ProcessData', 'Transform']);
    expect(op.steps[2].operationReferences).toEqual(['SaveOutput']);
  });

  it('should handle operation names with spaces (using bracket notation)', () => {
    const content = `
# [Operations]

## [Run Full Analysis]

### [Steps]
1. Analyze data
`;

    const operations = parseOperations(content);
    expect(operations).toHaveLength(1);
    // Should extract "Run Full Analysis" as the name
    expect(operations[0].name).toBe('Run Full Analysis');
  });
});

describe('Operation Step Number Validation', () => {
  it('should ensure step numbers are sequential starting from 1', () => {
    const content = `
### [Steps]
1. First
2. Second
3. Third
`;

    const steps = parseSteps(content);
    expect(steps.map((s) => s.stepNumber)).toEqual([1, 2, 3]);
  });

  it('should handle non-sequential step numbers (preserve original)', () => {
    const content = `
### [Steps]
1. First
3. Third (skipped 2)
5. Fifth
`;

    const steps = parseSteps(content);
    // Should preserve the actual numbers from the document
    expect(steps.map((s) => s.stepNumber)).toEqual([1, 3, 5]);
  });
});
