import { describe, beforeEach, it, expect } from '@jest/globals';
import { SimpleProcess } from '../../operation.js';
import { Operation, Input, Output, Context } from '../../types.js';
import { InterventionManager } from '../../intervention/intervention-manager.js';
import { InterventionInterface, InterventionState, InterventionAction } from '../../intervention/types.js';

// Mock infrastructure for testing
class MockInfrastructure {
  interventionManager = InterventionManager.getInstance();
}

// Mock context for testing
class MockContext implements Context {
  executionId = 'test-execution-' + Math.random().toString(36).substr(2, 9);
  currentLayer = 'L0';
  sharedState: Record<string, any> = {};
  layerSpecific: Record<string, any> = {};
  capabilities = new Map<string, any>();
  infrastructure = new MockInfrastructure();

  spawn(config: any): Context {
    const child = new MockContext();
    child.currentLayer = this.currentLayer;
    child.sharedState = { ...this.sharedState, ...config.metadata };
    child.layerSpecific = { ...this.layerSpecific };
    child.infrastructure = this.infrastructure;
    return child;
  }
}

// Test operations that simulate a business process
class ValidationOperation implements Operation {
  name = 'validate';
  description = 'Validates order data';
  inputSchema = {};
  outputSchema = {};
  
  async execute(input: Input<any>): Promise<Output<any>> {
    if (!input.data.orderId) {
      throw new Error('Order ID is required');
    }
    
    return {
      data: {
        ...input.data,
        validated: true,
        validatedAt: new Date().toISOString()
      },
      metadata: { status: 'validated' }
    };
  }
}

class CalculatePriceOperation implements Operation {
  name = 'calculatePrice';
  description = 'Calculates order price';
  inputSchema = {};
  outputSchema = {};
  
  async execute(input: Input<any>): Promise<Output<any>> {
    const price = input.data.quantity * input.data.unitPrice;
    const tax = price * 0.1;
    
    return {
      data: {
        ...input.data,
        price,
        tax,
        total: price + tax
      },
      metadata: { status: 'priced' }
    };
  }
}

class ProcessPaymentOperation implements Operation {
  name = 'processPayment';
  description = 'Processes payment';
  inputSchema = {};
  outputSchema = {};
  failureCount = 0;
  
  async execute(input: Input<any>): Promise<Output<any>> {
    // Simulate payment failure on first attempt
    if (this.failureCount === 0) {
      this.failureCount++;
      throw new Error('Payment gateway timeout');
    }
    
    return {
      data: {
        ...input.data,
        paymentId: 'PAY-' + Math.random().toString(36).substr(2, 9),
        paymentStatus: 'completed'
      },
      metadata: { status: 'paid' }
    };
  }
}

// Scripted intervention interface for testing
class ScriptedInterventionInterface implements InterventionInterface {
  private script: InterventionAction[] = [];
  private scriptIndex = 0;
  statusMessages: string[] = [];
  states: InterventionState[] = [];

  setScript(actions: InterventionAction[]) {
    this.script = actions;
    this.scriptIndex = 0;
  }

  async showInterventionMenu(state: InterventionState): Promise<InterventionAction> {
    this.states.push(state);
    
    if (this.scriptIndex >= this.script.length) {
      // Fallback action instead of throwing error
      return { type: 'next' };
    }
    
    return this.script[this.scriptIndex++];
  }

  async editContextState(context: Context, currentData: any): Promise<{ context: Context; data: any }> {
    // For testing, just modify the data
    return {
      context,
      data: { ...currentData, edited: true }
    };
  }

  showStatus(message: string): void {
    this.statusMessages.push(message);
  }
}

describe.skip('Intervention System Integration', () => {
  let process: SimpleProcess;
  let interventionManager: InterventionManager;
  let scriptedInterface: ScriptedInterventionInterface;
  let context: Context;
  let paymentOperation: ProcessPaymentOperation;

  beforeEach(() => {
    // Setup context
    context = new MockContext();
    context.sharedState = { processId: 'order-123' };
    
    // Setup intervention system
    interventionManager = context.infrastructure.interventionManager;
    interventionManager.reset();
    
    scriptedInterface = new ScriptedInterventionInterface();
    interventionManager.setInterface(scriptedInterface);
    
    // Setup operations
    const validationOp = new ValidationOperation();
    const calculationOp = new CalculatePriceOperation();
    paymentOperation = new ProcessPaymentOperation();
    paymentOperation.failureCount = 0; // Reset for each test
    
    // Create process with proper structure
    process = new SimpleProcess(
      'OrderProcessing',
      'Processes customer orders',
      {}, // input schema
      {}, // output schema
      ['validate', 'calculatePrice', 'processPayment'], // step names
      [validationOp, calculationOp, paymentOperation], // operations
      context // parent context
    );
  });

  describe('Normal execution flow', () => {
    it('should execute all operations without intervention', async () => {
      const input: Input<any> = {
        data: {
          orderId: 'ORD-001',
          quantity: 2,
          unitPrice: 50
        }
      };

      const result = await process.execute(input);

      expect(result.data.validated).toBe(true);
      expect(result.data.total).toBe(110); // 100 + 10% tax
      expect(result.data.paymentStatus).toBe('completed');
      expect(result.data.paymentId).toBeDefined();
    });
  });

  describe('Error handling with retry', () => {
    it('should allow retry on payment failure', async () => {
      // Script the intervention: retry when payment fails
      scriptedInterface.setScript([
        { type: 'retry' }, // Retry payment
        { type: 'resume_auto' } // Continue automatically after success
      ]);

      const input: Input<any> = {
        data: {
          orderId: 'ORD-002',
          quantity: 1,
          unitPrice: 100
        }
      };

      const result = await process.execute(input);

      // Should succeed after retry
      expect(result.data.paymentStatus).toBe('completed');
      expect(interventionManager.isManualMode()).toBe(false);
      
      // Check that intervention was triggered
      expect(scriptedInterface.states).toHaveLength(1);
      expect(scriptedInterface.states[0].error?.message).toBe('Payment gateway timeout');
    });
  });

  describe('Skip operation on validation failure', () => {
    it('should skip to next operation when validation fails', async () => {
      // Script: skip validation, edit data to add missing orderId, continue
      scriptedInterface.setScript([
        { type: 'next' }, // Skip failed validation
        { 
          type: 'edit_state',
          modifiedData: {
            orderId: 'ORD-MANUAL',
            quantity: 1,
            unitPrice: 50,
            validated: false // Not validated
          }
        },
        { type: 'resume_auto' }
      ]);

      const input: Input<any> = {
        data: {
          // Missing orderId - will fail validation
          quantity: 1,
          unitPrice: 50
        }
      };

      const result = await process.execute(input);

      // Should have processed with manual orderId, skipping validation
      expect(result.data.orderId).toBe('ORD-MANUAL');
      expect(result.data.validated).toBe(false); // Skipped validation
      expect(result.data.total).toBe(55); // Still calculated price
    });
  });

  describe('Jump to specific operation', () => {
    it('should jump directly to payment operation', async () => {
      // Script: jump directly to payment, skipping validation and pricing
      scriptedInterface.setScript([
        { 
          type: 'jump_to_operation',
          targetOperation: 'processPayment'
        },
        { type: 'retry' }, // Payment will fail first time
        { type: 'resume_auto' }
      ]);

      // Request intervention before starting
      interventionManager.requestIntervention();

      const input: Input<any> = {
        data: {
          orderId: 'ORD-003',
          quantity: 2,
          unitPrice: 75,
          // Manually set price data since we're skipping calculation
          total: 165
        }
      };

      const result = await process.execute(input);

      // Should have payment info but no validation or calculated price
      expect(result.data.paymentStatus).toBe('completed');
      expect(result.data.validated).toBeUndefined(); // Skipped
      expect(result.data.price).toBeUndefined(); // Skipped calculation
    });
  });

  describe('Go back to previous checkpoint', () => {
    it('should restore checkpoint and re-execute from there', async () => {
      let checkpointId: string | null = null;

      // Custom interface to capture checkpoint ID
      class CheckpointCapturingInterface extends ScriptedInterventionInterface {
        async showInterventionMenu(state: InterventionState): Promise<InterventionAction> {
          // Capture checkpoint from first operation
          if (state.availableCheckpoints.length > 0 && !checkpointId) {
            checkpointId = state.availableCheckpoints[0].id;
          }
          
          return super.showInterventionMenu(state);
        }
      }

      const capturingInterface = new CheckpointCapturingInterface();
      interventionManager.setInterface(capturingInterface);

      // Script: let it run to payment, then go back to start
      capturingInterface.setScript([
        { type: 'abort' } // Will be replaced dynamically
      ]);

      // Override script after we have checkpoint
      const originalShowMenu = capturingInterface.showInterventionMenu.bind(capturingInterface);
      capturingInterface.showInterventionMenu = async (state) => {
        if (state.currentStep === 'processPayment' && checkpointId) {
          // Go back to first checkpoint
          return { type: 'back', targetCheckpoint: checkpointId };
        }
        return originalShowMenu(state);
      };

      // Enter manual mode to pause at payment
      interventionManager.enterManualMode();

      const input: Input<any> = {
        data: {
          orderId: 'ORD-004',
          quantity: 3,
          unitPrice: 30
        }
      };

      // Will go back when reaching payment, need to handle the loop
      capturingInterface.setScript([
        { type: 'next' }, // After validate
        { type: 'next' }, // After calculate  
        { type: 'back', targetCheckpoint: 'will-be-set' }, // At payment, go back
        { type: 'abort' } // Abort to end the test
      ]);

      await expect(process.execute(input)).rejects.toThrow('Process aborted');

      // Should have gone through operations multiple times
      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBeGreaterThan(3); // Executed some steps twice
    });
  });

  describe('Abort operation', () => {
    it('should abort process cleanly', async () => {
      scriptedInterface.setScript([
        { type: 'abort' }
      ]);

      interventionManager.requestIntervention();

      const input: Input<any> = {
        data: {
          orderId: 'ORD-005',
          quantity: 1,
          unitPrice: 100
        }
      };

      await expect(process.execute(input)).rejects.toThrow('Process aborted by user intervention');
      
      // Check execution was tracked
      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBe(1); // Only validation executed
    });
  });

  describe('Manual mode step-by-step execution', () => {
    it('should pause at each step in manual mode', async () => {
      // Enter manual mode
      interventionManager.enterManualMode();

      // Script each step
      scriptedInterface.setScript([
        { type: 'next' }, // Continue after validation (before)
        { type: 'next' }, // Continue after validation (after)
        { type: 'next' }, // Continue after price calculation (before)
        { type: 'next' }, // Continue after price calculation (after)
        { type: 'next' }, // Continue after payment (before)
        { type: 'resume_auto' } // Resume auto mode after payment
      ]);

      const input: Input<any> = {
        data: {
          orderId: 'ORD-006',
          quantity: 4,
          unitPrice: 25
        }
      };

      const result = await process.execute(input);

      // All operations should complete
      expect(result.data.validated).toBe(true);
      expect(result.data.total).toBe(110);
      expect(result.data.paymentStatus).toBe('completed');

      // Should have paused at each checkpoint
      expect(scriptedInterface.states).toHaveLength(6);
      expect(interventionManager.isManualMode()).toBe(false); // Resumed auto
    });
  });

  describe('Edit state during execution', () => {
    it('should allow modifying data mid-process', async () => {
      scriptedInterface.setScript([
        { type: 'next' }, // Continue after validation
        { 
          type: 'edit_state',
          modifiedData: {
            orderId: 'ORD-007',
            quantity: 10, // Change quantity
            unitPrice: 20, // Change price
            validated: true,
            validatedAt: new Date().toISOString()
          }
        },
        { type: 'resume_auto' }
      ]);

      interventionManager.enterManualMode();

      const input: Input<any> = {
        data: {
          orderId: 'ORD-007',
          quantity: 1,
          unitPrice: 100
        }
      };

      const result = await process.execute(input);

      // Should use edited values for calculation
      expect(result.data.quantity).toBe(10);
      expect(result.data.unitPrice).toBe(20);
      expect(result.data.total).toBe(220); // 10 * 20 + 10% tax
    });
  });

  describe('Execution statistics', () => {
    it('should track comprehensive execution metrics', async () => {
      scriptedInterface.setScript([
        { type: 'retry' }, // Retry payment
        { type: 'resume_auto' }
      ]);

      const input: Input<any> = {
        data: {
          orderId: 'ORD-008',
          quantity: 5,
          unitPrice: 40
        }
      };

      await process.execute(input);

      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBe(4); // validate, calculate, payment (failed), payment (retry)
      expect(stats.completedSteps).toBe(3); // All but the failed payment
      expect(stats.failedSteps).toBe(1); // First payment attempt
      expect(stats.totalCheckpoints).toBeGreaterThan(0);
      expect(stats.isManualMode).toBe(false);
    });
  });
});