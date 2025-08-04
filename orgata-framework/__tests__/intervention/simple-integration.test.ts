import { OperationOrchestrator } from '../../intervention/operation-orchestrator.js';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { InterventionManager } from '../../intervention/intervention-manager.js';
import { InterventionInterface, InterventionState, InterventionAction } from '../../intervention/types.js';
import { Operation, Input, Output, Context, JsonSchema, ValidationResult } from '../../types.js';

// Simple mock implementations
class SimpleInput<T> implements Input<T> {
  constructor(
    public readonly data: T,
    public readonly schema: JsonSchema = { type: 'object' }
  ) {}

  validate(): ValidationResult {
    return { isValid: true, errors: [] };
  }

  serialize(): string {
    return JSON.stringify(this.data);
  }
}

class SimpleOutput<T> implements Output<T> {
  constructor(
    public readonly data: T,
    public readonly schema: JsonSchema = { type: 'object' }
  ) {}

  validate(): ValidationResult {
    return { isValid: true, errors: [] };
  }

  serialize(): string {
    return JSON.stringify(this.data);
  }
}

// Test operation with proper interface implementation
class TestOperation implements Operation {
  name = 'test-operation';
  description = 'Test operation for intervention testing';
  inputSchema: JsonSchema = { type: 'object' };
  outputSchema: JsonSchema = { type: 'object' };
  shouldFail = false;

  async execute(input: Input<any>): Promise<Output<any>> {
    if (this.shouldFail) {
      throw new Error('Test operation failed');
    }

    return new SimpleOutput({
      ...input.data,
      processed: true,
      timestamp: new Date().toISOString()
    });
  }

  getImplementation() {
    return {
      execute: async (input: any) => ({
        ...input,
        processed: true
      })
    };
  }
}

// Mock intervention interface for testing
class MockInterventionInterface implements InterventionInterface {
  actions: InterventionAction[] = [];
  actionIndex = 0;

  async showInterventionMenu(state: InterventionState): Promise<InterventionAction> {
    if (this.actionIndex >= this.actions.length) {
      return { type: 'next' }; // Default action
    }
    return this.actions[this.actionIndex++];
  }

  async editContextState(context: Context, currentData: any): Promise<{ context: Context; data: any }> {
    return { context, data: { ...currentData, edited: true } };
  }

  showStatus(message: string): void {
    // Mock implementation
  }
}

describe('Simple Intervention Integration Tests', () => {
  let orchestrator: OperationOrchestrator;
  let interventionManager: InterventionManager;
  let mockInterface: MockInterventionInterface;
  let testOperation: TestOperation;

  beforeEach(() => {
    interventionManager = InterventionManager.getInstance();
    interventionManager.reset();
    
    mockInterface = new MockInterventionInterface();
    interventionManager.setInterface(mockInterface);
    
    orchestrator = new OperationOrchestrator(interventionManager);
    testOperation = new TestOperation();
  });

  describe('Basic Intervention Actions', () => {
    it('should handle retry action', async () => {
      mockInterface.actions = [{ type: 'retry' }];
      interventionManager.requestIntervention();

      const input = new SimpleInput({ test: 'data' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation]]),
        operationNames: ['test'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      const result = await orchestrator.executeOperationWithIntervention(
        testOperation,
        input,
        0,
        'test',
        mockContext,
        executionContext
      );

      expect(result.shouldContinue).toBe(true);
      expect(result.nextOperation).toBe('test');
      expect(result.nextOperationIndex).toBe(0);
    });

    it('should handle next action', async () => {
      mockInterface.actions = [{ type: 'next' }];
      interventionManager.requestIntervention();

      const input = new SimpleInput({ test: 'data' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation], ['next', testOperation]]),
        operationNames: ['test', 'next'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      const result = await orchestrator.executeOperationWithIntervention(
        testOperation,
        input,
        0,
        'test',
        mockContext,
        executionContext
      );

      expect(result.shouldContinue).toBe(true);
      expect(result.nextOperation).toBe('next');
      expect(result.nextOperationIndex).toBe(1);
    });

    it('should handle abort action', async () => {
      mockInterface.actions = [{ type: 'abort' }];
      interventionManager.requestIntervention();

      const input = new SimpleInput({ test: 'data' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation]]),
        operationNames: ['test'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      await expect(
        orchestrator.executeOperationWithIntervention(
          testOperation,
          input,
          0,
          'test',
          mockContext,
          executionContext
        )
      ).rejects.toThrow('Process aborted by user intervention');
    });

    it('should handle edit_state action', async () => {
      mockInterface.actions = [{ 
        type: 'edit_state',
        modifiedData: { test: 'modified', newField: 'added' }
      }];
      interventionManager.requestIntervention();

      const input = new SimpleInput({ test: 'original' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation]]),
        operationNames: ['test'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      const result = await orchestrator.executeOperationWithIntervention(
        testOperation,
        input,
        0,
        'test',
        mockContext,
        executionContext
      );

      // edit_state action should execute the operation and return the result
      // shouldContinue depends on whether this is the last operation
      expect(result.output.data.processed).toBe(true);
      // Data should include the modified values
      expect(result.output.data.test).toBeDefined();
      expect(result.output.data.newField).toBeDefined();
    });

    it('should handle resume_auto action', async () => {
      interventionManager.enterManualMode();
      mockInterface.actions = [{ type: 'resume_auto' }];

      const input = new SimpleInput({ test: 'data' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation]]),
        operationNames: ['test'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      const result = await orchestrator.executeOperationWithIntervention(
        testOperation,
        input,
        0,
        'test',
        mockContext,
        executionContext
      );

      expect(result.shouldContinue).toBe(true);
      expect(interventionManager.isManualMode()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should auto-enter manual mode on operation failure', async () => {
      testOperation.shouldFail = true;
      mockInterface.actions = [{ type: 'abort' }];

      const input = new SimpleInput({ test: 'data' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation]]),
        operationNames: ['test'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      await expect(
        orchestrator.executeOperationWithIntervention(
          testOperation,
          input,
          0,
          'test',
          mockContext,
          executionContext
        )
      ).rejects.toThrow('Process aborted by user intervention');

      expect(interventionManager.isManualMode()).toBe(true);
    });
  });

  describe('Checkpoint Management', () => {
    it('should create checkpoints before and after operation execution', async () => {
      const input = new SimpleInput({ test: 'data' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation]]),
        operationNames: ['test'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      await orchestrator.executeOperationWithIntervention(
        testOperation,
        input,
        0,
        'test',
        mockContext,
        executionContext
      );

      const stats = interventionManager.getExecutionStats();
      expect(stats.totalCheckpoints).toBe(2); // Before and after
      expect(stats.totalSteps).toBe(1);
      expect(stats.completedSteps).toBe(1);
    });
  });

  describe('Manual Mode', () => {
    it('should pause at each step in manual mode', async () => {
      interventionManager.enterManualMode();
      mockInterface.actions = [
        { type: 'resume_auto' } // Resume auto mode from the pause
      ];

      const input = new SimpleInput({ test: 'data' });
      const mockContext = {} as Context;
      const executionContext = {
        operationSet: new Map([['test', testOperation]]),
        operationNames: ['test'],
        sharedContext: mockContext,
        processName: 'TestProcess'
      };

      const result = await orchestrator.executeOperationWithIntervention(
        testOperation,
        input,
        0,
        'test',
        mockContext,
        executionContext
      );

      // In manual mode, after resume_auto, the operation should complete
      expect(result.output.data).toBeDefined();
      expect(result.output.data.processed).toBe(true);
      expect(interventionManager.isManualMode()).toBe(false); // Should exit manual mode
      expect(mockInterface.actionIndex).toBe(1); // One action used
    });
  });
});