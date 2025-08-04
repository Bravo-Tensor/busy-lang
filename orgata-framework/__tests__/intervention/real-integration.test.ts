// Integration tests using real Context implementation
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { TestContext } from './test-context.js';
import { Operation, Input, Output } from '../../types.js';
import { DataInput, DataOutput } from '../../input-output.js';
import { InterventionManager } from '../../intervention/intervention-manager.js';
import { InterventionInterface, InterventionState, InterventionAction } from '../../intervention/types.js';

// Test operations using real Input/Output implementations
class TestValidationOperation implements Operation {
  name = 'validate-order';
  description = 'Validates order data';
  inputSchema = { type: 'object', required: ['orderId'] };
  outputSchema = { type: 'object' };
  
  async execute(input: Input<any>): Promise<Output<any>> {
    if (!input.data.orderId) {
      throw new Error('Order ID is required');
    }
    
    return new DataOutput({
      ...input.data,
      validated: true,
      validatedAt: new Date().toISOString()
    }, this.outputSchema);
  }

  getImplementation() {
    return {
      execute: async (input: any) => ({
        ...input,
        validated: true,
        validatedAt: new Date().toISOString()
      })
    };
  }
}

class TestProcessOperation implements Operation {
  name = 'process-order';
  description = 'Processes order';
  inputSchema = { type: 'object' };
  outputSchema = { type: 'object' };
  shouldFail = false;
  
  async execute(input: Input<any>): Promise<Output<any>> {
    if (this.shouldFail) {
      throw new Error('Processing failed');
    }
    
    return new DataOutput({
      ...input.data,
      processed: true,
      processedAt: new Date().toISOString()
    }, this.outputSchema);
  }

  getImplementation() {
    return {
      execute: async (input: any) => {
        if (this.shouldFail) {
          throw new Error('Processing failed');
        }
        return {
          ...input,
          processed: true,
          processedAt: new Date().toISOString()
        };
      }
    };
  }
}

// Scripted intervention interface for predictable testing
class TestInterventionInterface implements InterventionInterface {
  private actions: InterventionAction[] = [];
  private actionIndex = 0;
  public capturedStates: InterventionState[] = [];
  public statusMessages: string[] = [];

  setActions(actions: InterventionAction[]) {
    this.actions = actions;
    this.actionIndex = 0;
  }

  async showInterventionMenu(state: InterventionState): Promise<InterventionAction> {
    this.capturedStates.push(state);
    
    if (this.actionIndex >= this.actions.length) {
      return { type: 'next' }; // Fallback
    }
    
    return this.actions[this.actionIndex++];
  }

  async editContextState(context: any, currentData: any): Promise<{ context: any; data: any }> {
    return {
      context,
      data: { ...currentData, edited: true }
    };
  }

  showStatus(message: string): void {
    this.statusMessages.push(message);
  }

  reset() {
    this.capturedStates = [];
    this.statusMessages = [];
    this.actionIndex = 0;
  }
}

describe('Real Context Integration Tests', () => {
  let context: TestContext;
  let interventionManager: InterventionManager;
  let testInterface: TestInterventionInterface;
  let validationOp: TestValidationOperation;
  let processOp: TestProcessOperation;

  beforeEach(() => {
    // Create real test context
    context = TestContext.createWithInterventions();
    
    // Setup intervention system
    interventionManager = context.infrastructure.interventionManager;
    testInterface = new TestInterventionInterface();
    interventionManager.setInterface(testInterface);
    
    // Create operations
    validationOp = new TestValidationOperation();
    processOp = new TestProcessOperation();
    processOp.shouldFail = false;
    
    // Add operations as capabilities
    context.capabilities.set('validate-order', validationOp);
    context.capabilities.set('process-order', processOp);
  });

  afterEach(() => {
    context.reset();
    testInterface.reset();
  });

  describe('Normal execution flow', () => {
    it('should execute operations without intervention', async () => {
      const input = new DataInput(
        { orderId: 'ORD-001', amount: 100 },
        { type: 'object', required: ['orderId'] }
      );

      // Execute validation
      const validationResult = await context.sendInput(validationOp, input);
      expect(validationResult.data.validated).toBe(true);
      expect(validationResult.data.orderId).toBe('ORD-001');

      // Execute processing with validation result
      const processInput = new DataInput(validationResult.data, { type: 'object' });
      const processResult = await context.sendInput(processOp, processInput);
      
      expect(processResult.data.processed).toBe(true);
      expect(processResult.data.validated).toBe(true);
    });

    it('should track execution in context', async () => {
      const input = new DataInput(
        { orderId: 'ORD-002', amount: 200 },
        { type: 'object' }
      );

      await context.sendInput(validationOp, input);
      
      const operationHistory = context.getOperationHistory();
      expect(operationHistory).toContain('start');
      expect(operationHistory).toContain('complete');
      
      const executionTrace = context.getExecutionTrace();
      expect(executionTrace).toHaveLength(1);
      expect(executionTrace[0].operationName).toBe('validate-order');
      expect(executionTrace[0].status).toBe('success');
    });
  });

  describe('Error handling with interventions', () => {
    it('should trigger intervention on operation failure', async () => {
      processOp.shouldFail = true;
      testInterface.setActions([{ type: 'abort' }]);

      const input = new DataInput(
        { orderId: 'ORD-003', processed: false },
        { type: 'object' }
      );

      await expect(context.sendInputWithInterventions(processOp, input))
        .rejects.toThrow('Process aborted by user intervention');

      // Should have captured error state
      expect(testInterface.capturedStates).toHaveLength(1);
      expect(testInterface.capturedStates[0].error?.message).toBe('Processing failed');
      expect(testInterface.capturedStates[0].currentStep).toBe('process-order');
    });

    it('should handle retry intervention', async () => {
      let failCount = 0;
      const originalExecute = processOp.execute.bind(processOp);
      processOp.execute = async (input: Input<any>) => {
        if (failCount === 0) {
          failCount++;
          throw new Error('First attempt failed');
        }
        return originalExecute(input);
      };

      testInterface.setActions([
        { type: 'retry' },
        { type: 'resume_auto' }
      ]);

      const input = new DataInput(
        { orderId: 'ORD-004', amount: 400 },
        { type: 'object' }
      );

      // First execution should fail, trigger intervention, then retry should succeed
      const result = await context.sendInputWithInterventions(processOp, input);
      
      // The retry action should eventually succeed
      expect(result.data).toBeDefined();
      // Should have captured the error state that triggered intervention
      expect(testInterface.capturedStates.length).toBeGreaterThan(0);
      const errorState = testInterface.capturedStates.find(state => state.error);
      expect(errorState).toBeDefined();
      expect(errorState!.error?.message).toBe('First attempt failed');
    });
  });

  describe('Manual mode execution', () => {
    it('should pause execution in manual mode', async () => {
      interventionManager.enterManualMode();
      testInterface.setActions([
        { type: 'resume_auto' } // Resume auto mode immediately
      ]);

      const input = new DataInput(
        { orderId: 'ORD-005', amount: 500 },
        { type: 'object' }
      );

      const result = await context.sendInputWithInterventions(validationOp, input);
      
      expect(result.data).toBeDefined();
      // Manual mode creates before/after checkpoints, so multiple intervention points
      expect(testInterface.capturedStates.length).toBeGreaterThan(0);
      expect(interventionManager.isManualMode()).toBe(false); // Should have resumed auto
    });
  });

  describe('Checkpoint management', () => {
    it('should create and restore checkpoints', async () => {
      const originalData = { orderId: 'ORD-006', amount: 600 };
      
      // Create a checkpoint
      const checkpointId = interventionManager.createCheckpoint(
        'validate-order',
        0,
        context as any,
        originalData,
        'Before validation'
      );

      // Modify data
      const modifiedData = { ...originalData, modified: true };

      // Restore checkpoint
      const restored = interventionManager.restoreCheckpoint(checkpointId);
      
      expect(restored).toBeDefined();
      expect(restored!.data).toEqual(originalData);
      expect(restored!.data.modified).toBeUndefined();
    });

    it('should handle back intervention with checkpoint restoration', async () => {
      // Create checkpoint
      const checkpointId = interventionManager.createCheckpoint(
        'validate-order',
        0,
        context as any,
        { orderId: 'ORD-007', amount: 700 },
        'Before validation'
      );

      testInterface.setActions([
        { type: 'back', targetCheckpoint: checkpointId }
      ]);

      interventionManager.requestIntervention();

      const input = new DataInput(
        { orderId: 'ORD-007', amount: 700, modified: true },
        { type: 'object' }
      );

      const result = await context.sendInputWithInterventions(validationOp, input);
      
      // Should have intervention state captured (orchestrator creates multiple checkpoints)
      expect(testInterface.capturedStates.length).toBeGreaterThan(0);
      // The original checkpoint should be available
      const state = testInterface.capturedStates[0];
      expect(state.availableCheckpoints.length).toBeGreaterThan(0);
      const originalCheckpoint = state.availableCheckpoints.find(cp => cp.id === checkpointId);
      expect(originalCheckpoint).toBeDefined();
    });
  });

  describe('Context introspection', () => {
    it('should provide execution statistics', async () => {
      const input = new DataInput(
        { orderId: 'ORD-008', amount: 800 },
        { type: 'object' }
      );

      await context.sendInputWithInterventions(validationOp, input);
      await context.sendInputWithInterventions(processOp, input);

      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBeGreaterThan(0);
      expect(stats.completedSteps).toBeGreaterThan(0);
      expect(stats.failedSteps).toBe(0);

      // Execution stats are tracked by InterventionManager when using orchestrator
      expect(stats.totalCheckpoints).toBeGreaterThan(0);
      
      // Operations were executed successfully  
      expect(stats.totalSteps).toBe(2); // Two operations executed
      expect(stats.completedSteps).toBe(2); // Both completed successfully
    });

    it('should track error history', async () => {
      processOp.shouldFail = true;

      const input = new DataInput(
        { orderId: 'ORD-009', amount: 900 },
        { type: 'object' }
      );

      // Set up interface to abort on error so we can catch it
      testInterface.setActions([{ type: 'abort' }]);

      try {
        await context.sendInputWithInterventions(processOp, input);
        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        // Expected - should abort due to intervention
        expect((error as Error).message).toContain('aborted');
      }

      // Check that error was captured in intervention states
      expect(testInterface.capturedStates.length).toBeGreaterThan(0);
      const errorState = testInterface.capturedStates.find(state => state.error);
      expect(errorState).toBeDefined();
      expect(errorState!.error?.message).toBe('Processing failed');
    });
  });

  describe('Context lifecycle', () => {
    it('should create child contexts for operations', async () => {
      const input = new DataInput(
        { orderId: 'ORD-010', amount: 1000 },
        { type: 'object' }
      );

      const childContext = context.getContextForOperation(validationOp);
      
      expect(childContext).not.toBe(context);
      expect(childContext.executionDepth).toBe(context.executionDepth + 1);
      expect(childContext.infrastructure).toBe(context.infrastructure);
    });

    it('should spawn contexts with modifications', async () => {
      const extraCapabilities = new Map();
      extraCapabilities.set('extra-op', processOp);

      const spawnedContext = context.spawn({ 
        capabilities: extraCapabilities,
        metadata: { spawnReason: 'testing' }
      });

      expect(spawnedContext.capabilities.has('extra-op')).toBe(true);
      expect(spawnedContext.capabilities.has('validate-order')).toBe(true);
      expect(spawnedContext.executionDepth).toBe(context.executionDepth + 1);
    });
  });
});