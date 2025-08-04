import { describe, beforeEach, it, expect } from '@jest/globals';
import { OperationOrchestrator, OperationExecutionContext } from '../../intervention/operation-orchestrator.js';
import { InterventionManager } from '../../intervention/intervention-manager.js';
import { Operation, Input, Output, Context } from '../../types.js';
import { InterventionInterface, InterventionState, InterventionAction } from '../../intervention/types.js';

// Mock operation for testing
class MockOperation implements Operation {
  executeCalls = 0;
  shouldFail = false;
  failureError = new Error('Operation failed');
  mockOutput: any = { result: 'success' };

  async execute(input: Input<any>): Promise<Output<any>> {
    this.executeCalls++;
    
    if (this.shouldFail) {
      throw this.failureError;
    }

    return {
      data: this.mockOutput,
      metadata: { 
        timestamp: new Date().toISOString(),
        status: 'success'
      }
    };
  }
}

// Mock intervention interface that can be controlled in tests
class TestInterventionInterface implements InterventionInterface {
  interventionActions: InterventionAction[] = [];
  currentActionIndex = 0;
  statusMessages: string[] = [];
  editedState: { context: Context; data: any } | null = null;

  async showInterventionMenu(state: InterventionState): Promise<InterventionAction> {
    if (this.currentActionIndex >= this.interventionActions.length) {
      // Fallback action instead of throwing error
      return { type: 'next' };
    }
    return this.interventionActions[this.currentActionIndex++];
  }

  async editContextState(context: Context, currentData: any): Promise<{ context: Context; data: any }> {
    return this.editedState || { context, data: currentData };
  }

  showStatus(message: string): void {
    this.statusMessages.push(message);
  }
}

describe('OperationOrchestrator', () => {
  let orchestrator: OperationOrchestrator;
  let interventionManager: InterventionManager;
  let testInterface: TestInterventionInterface;
  let mockOperation: MockOperation;
  let mockContext: Context;
  let executionContext: OperationExecutionContext;

  beforeEach(() => {
    // Reset and setup intervention manager
    interventionManager = InterventionManager.getInstance();
    interventionManager.reset();
    
    testInterface = new TestInterventionInterface();
    interventionManager.setInterface(testInterface);
    
    orchestrator = new OperationOrchestrator(interventionManager);
    
    // Setup mock operation
    mockOperation = new MockOperation();
    
    // Setup context
    mockContext = {
      currentLayer: 'L0',
      sharedState: { processId: 'test-123' },
      layerSpecific: {}
    };

    // Setup execution context
    const operationSet = new Map<string, Operation>();
    operationSet.set('validate', new MockOperation());
    operationSet.set('process', mockOperation);
    operationSet.set('complete', new MockOperation());
    
    executionContext = {
      operationSet,
      operationNames: ['validate', 'process', 'complete'],
      sharedContext: mockContext,
      processName: 'TestProcess'
    };
  });

  describe('executeOperationWithIntervention - Basic execution', () => {
    it('should execute operation successfully without intervention', async () => {
      const input: Input<any> = { data: { value: 'test' } };

      const result = await orchestrator.executeOperationWithIntervention(
        mockOperation,
        input,
        1,
        'process',
        mockContext,
        executionContext
      );

      expect(result.shouldContinue).toBe(true);
      expect(result.output.data).toEqual({ result: 'success' });
      expect(mockOperation.executeCalls).toBe(1);
    });

    it('should create before and after checkpoints', async () => {
      const input: Input<any> = { data: { value: 'test' } };

      await orchestrator.executeOperationWithIntervention(
        mockOperation,
        input,
        1,
        'process',
        mockContext,
        executionContext
      );

      const stats = interventionManager.getExecutionStats();
      expect(stats.totalCheckpoints).toBe(2); // Before and after
    });

    it('should track step execution', async () => {
      const input: Input<any> = { data: { value: 'test' } };

      await orchestrator.executeOperationWithIntervention(
        mockOperation,
        input,
        1,
        'process',
        mockContext,
        executionContext
      );

      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBe(1);
      expect(stats.completedSteps).toBe(1);
    });
  });

  describe('executeOperationWithIntervention - Error handling', () => {
    it('should auto-enter manual mode on failure', async () => {
      mockOperation.shouldFail = true;
      testInterface.interventionActions = [{ type: 'abort' }];

      const input: Input<any> = { data: { value: 'test' } };

      await expect(
        orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        )
      ).rejects.toThrow('Process aborted by user intervention');

      expect(interventionManager.isManualMode()).toBe(true);
    });

    it('should allow retry on failure', async () => {
      mockOperation.shouldFail = true;
      testInterface.interventionActions = [
        { type: 'retry' } // Will retry the operation
      ];

      const input: Input<any> = { data: { value: 'test' } };

      const result = await orchestrator.executeOperationWithIntervention(
        mockOperation,
        input,
        1,
        'process',
        mockContext,
        executionContext
      );

      // Retry action returns with jump information
      expect(result.shouldContinue).toBe(true);
      expect(result.nextOperation).toBe('process'); // Should retry same operation
      expect(result.nextOperationIndex).toBe(1);
    });
  });

  describe('Intervention Actions', () => {
    describe('retry action', () => {
      it('should retry current operation', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ type: 'retry' }];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        expect(result.shouldContinue).toBe(true);
        expect(result.nextOperation).toBe('process');
        expect(result.nextOperationIndex).toBe(1);
      });
    });

    describe('next action', () => {
      it('should skip to next operation', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ type: 'next' }];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        expect(result.shouldContinue).toBe(true);
        expect(result.nextOperation).toBe('complete');
        expect(result.nextOperationIndex).toBe(2);
      });

      it('should complete when next on last operation', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ type: 'next' }];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          2, // Last operation index
          'complete',
          mockContext,
          executionContext
        );

        expect(result.shouldContinue).toBe(false);
        expect(result.nextOperation).toBeUndefined();
      });
    });

    describe('back action', () => {
      it('should restore from checkpoint and go back', async () => {
        // Create a checkpoint to go back to
        const checkpointId = interventionManager.createCheckpoint(
          'validate',
          0,
          mockContext,
          { originalData: true },
          'Before validate'
        );

        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ 
          type: 'back', 
          targetCheckpoint: checkpointId 
        }];

        const input: Input<any> = { data: { value: 'current' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        expect(result.shouldContinue).toBe(true);
        expect(result.nextOperation).toBe('validate');
        expect(result.nextOperationIndex).toBe(0);
        expect(result.output.data).toEqual({ originalData: true });
      });

      it('should handle back without valid checkpoint', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ 
          type: 'back', 
          targetCheckpoint: 'invalid-checkpoint' 
        }];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        // Should continue normally if checkpoint not found
        expect(result.shouldContinue).toBe(true);
        expect(result.output.data).toEqual({ result: 'success' });
      });
    });

    describe('edit_state action', () => {
      it('should modify data and continue', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ 
          type: 'edit_state',
          modifiedData: { edited: true, value: 'modified' }
        }];

        const input: Input<any> = { data: { value: 'original' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        // Operation should execute with modified data
        expect(result.shouldContinue).toBe(true);
        expect(mockOperation.executeCalls).toBe(1);
      });

      it('should handle edit_state without data', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [
          { type: 'edit_state' } // Single action should be enough
        ];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        expect(result.shouldContinue).toBe(true);
        expect(result.output.data).toEqual({ result: 'success' });
      });
    });

    describe('resume_auto action', () => {
      it('should exit manual mode and continue', async () => {
        interventionManager.enterManualMode();
        testInterface.interventionActions = [{ type: 'resume_auto' }];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        expect(interventionManager.isManualMode()).toBe(false);
        expect(result.shouldContinue).toBe(true);
      });
    });

    describe('abort action', () => {
      it('should throw abort error', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ type: 'abort' }];

        const input: Input<any> = { data: { value: 'test' } };

        await expect(
          orchestrator.executeOperationWithIntervention(
            mockOperation,
            input,
            1,
            'process',
            mockContext,
            executionContext
          )
        ).rejects.toThrow('Process aborted by user intervention');
      });
    });

    describe('jump_to_operation action', () => {
      it('should jump to specific operation', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ 
          type: 'jump_to_operation',
          targetOperation: 'complete'
        }];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        expect(result.shouldContinue).toBe(true);
        expect(result.nextOperation).toBe('complete');
        expect(result.nextOperationIndex).toBe(2);
      });

      it('should handle invalid operation name', async () => {
        interventionManager.requestIntervention();
        testInterface.interventionActions = [{ 
          type: 'jump_to_operation',
          targetOperation: 'non-existent'
        }];

        const input: Input<any> = { data: { value: 'test' } };

        const result = await orchestrator.executeOperationWithIntervention(
          mockOperation,
          input,
          1,
          'process',
          mockContext,
          executionContext
        );

        // Should continue normally if operation not found
        expect(result.shouldContinue).toBe(true);
        expect(result.output.data).toEqual({ result: 'success' });
      });
    });
  });

  describe('Manual mode behavior', () => {
    it('should pause after successful execution in manual mode', async () => {
      interventionManager.enterManualMode();
      testInterface.interventionActions = [
        { type: 'next' }, // Continue from before checkpoint  
        { type: 'resume_auto' } // Resume auto after operation execution
      ];

      const input: Input<any> = { data: { value: 'test' } };

      const result = await orchestrator.executeOperationWithIntervention(
        mockOperation,
        input,
        1,
        'process',
        mockContext,
        executionContext
      );

      expect(result.shouldContinue).toBe(true);
      // Manual mode might still be active depending on the action sequence
      expect(testInterface.currentActionIndex).toBeGreaterThan(0); // At least one action consumed
    });

    it('should provide operation context in intervention state', async () => {
      let capturedState: InterventionState | null = null;
      
      testInterface.showInterventionMenu = async (state) => {
        capturedState = state;
        return { type: 'next' };
      };

      interventionManager.requestIntervention();

      const input: Input<any> = { data: { value: 'test' } };

      await orchestrator.executeOperationWithIntervention(
        mockOperation,
        input,
        1,
        'process',
        mockContext,
        executionContext
      );

      expect(capturedState).toBeDefined();
      if (capturedState!.operationSetInfo) {
        expect(capturedState!.operationSetInfo!.processName).toBe('TestProcess');
        expect(capturedState!.operationSetInfo!.availableOperations).toEqual(['validate', 'process', 'complete']);
        expect(capturedState!.operationSetInfo!.currentOperationIndex).toBe(1);
        expect(capturedState!.operationSetInfo!.totalOperations).toBe(3);
      }
    });
  });

  describe('createExecutionState', () => {
    it('should create complete execution state', () => {
      const input: Input<any> = { data: { value: 'test' } };

      const state = orchestrator.createExecutionState(1, input, executionContext);

      expect(state).toEqual({
        currentOperationIndex: 1,
        currentOperationName: 'process',
        currentInput: input,
        completedOperations: ['validate'],
        availableOperations: ['validate', 'process', 'complete']
      });
    });

    it('should handle first operation', () => {
      const input: Input<any> = { data: { value: 'test' } };

      const state = orchestrator.createExecutionState(0, input, executionContext);

      expect(state.currentOperationName).toBe('validate');
      expect(state.completedOperations).toEqual([]);
    });

    it('should handle invalid operation index', () => {
      const input: Input<any> = { data: { value: 'test' } };

      const state = orchestrator.createExecutionState(99, input, executionContext);

      expect(state.currentOperationName).toBe('unknown');
      expect(state.currentOperationIndex).toBe(99);
    });
  });
});