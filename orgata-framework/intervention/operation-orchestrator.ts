// Operation orchestrator for intervention-aware operation execution

import { Operation, Input, Output, Context } from '../types.js';
import { InterventionManager } from './intervention-manager.js';
import { InterventionAction } from './types.js';

export interface OperationExecutionContext {
  operationSet: Map<string, Operation>;
  operationNames: string[];
  sharedContext: Context;
  processName: string;
}

export interface ExecutionState {
  currentOperationIndex: number;
  currentOperationName: string;
  currentInput: Input<any>;
  completedOperations: string[];
  availableOperations: string[];
}

export class OperationOrchestrator {
  constructor(private interventionManager: InterventionManager) {}

  /**
   * Execute a single operation with full intervention support
   */
  async executeOperationWithIntervention(
    operation: Operation,
    input: Input<any>,
    stepIndex: number,
    stepName: string,
    context: Context,
    executionContext: OperationExecutionContext
  ): Promise<{
    output: Output<any>;
    shouldContinue: boolean;
    nextOperation?: string;
    nextOperationIndex?: number;
  }> {
    // Start step tracking
    this.interventionManager.startStep(stepName, stepIndex);

    // BEFORE checkpoint
    const beforeCheckpointId = this.interventionManager.createCheckpoint(
      stepName,
      stepIndex,
      context,
      input.data,
      `Before ${stepName}`
    );
    this.interventionManager.addCheckpointToCurrentStep(beforeCheckpointId);

    // Check for intervention request
    if (this.interventionManager.checkForIntervention() || this.interventionManager.isManualMode()) {
      const action = await this.handleInterventionWithJumping(
        stepName,
        stepIndex,
        context,
        input.data,
        executionContext
      );

      const result = await this.processInterventionAction(action, stepIndex, input, executionContext);
      if (result.shouldReturn) {
        return {
          output: result.output || input as Output<any>,
          shouldContinue: false
        };
      }
      if (result.jumpToOperation) {
        return {
          output: result.newInput || input as Output<any>,
          shouldContinue: true,
          nextOperation: result.jumpToOperation,
          nextOperationIndex: result.jumpToOperationIndex
        };
      }
      if (result.newInput) {
        input = result.newInput;
      }
    }

    try {
      // Execute the operation
      const output = await operation.execute(input);

      // AFTER checkpoint
      const afterCheckpointId = this.interventionManager.createCheckpoint(
        stepName,
        stepIndex,
        context,
        output.data,
        `After ${stepName}`
      );
      this.interventionManager.addCheckpointToCurrentStep(afterCheckpointId);

      // Mark step as completed
      this.interventionManager.completeStep(true);

      // If in manual mode, pause after execution
      if (this.interventionManager.isManualMode()) {
        const action = await this.handleInterventionWithJumping(
          `After ${stepName}`,
          stepIndex,
          context,
          output.data,
          executionContext
        );

        const result = await this.processInterventionAction(action, stepIndex, output, executionContext);
        if (result.shouldReturn) {
          return {
            output: result.output || output,
            shouldContinue: false
          };
        }
        if (result.jumpToOperation) {
          return {
            output: result.newInput || output,
            shouldContinue: true,
            nextOperation: result.jumpToOperation,
            nextOperationIndex: result.jumpToOperationIndex
          };
        }
      }

      return {
        output,
        shouldContinue: true
      };

    } catch (error) {
      // Mark step as failed
      this.interventionManager.completeStep(false, error as Error);

      // Auto-enter manual mode on failure
      this.interventionManager.enterManualMode();
      
      const action = await this.handleInterventionWithJumping(
        stepName,
        stepIndex,
        context,
        input.data,
        executionContext,
        error as Error
      );

      const result = await this.processInterventionAction(action, stepIndex, input, executionContext, error as Error);
      if (result.shouldReturn) {
        return {
          output: result.output || input as Output<any>,
          shouldContinue: false
        };
      }
      if (result.jumpToOperation) {
        return {
          output: result.newInput || input as Output<any>,
          shouldContinue: true,
          nextOperation: result.jumpToOperation,
          nextOperationIndex: result.jumpToOperationIndex
        };
      }
      
      // If no intervention handled it, re-throw
      if (!result.errorHandled) {
        throw error;
      }

      return {
        output: result.newInput || input as Output<any>,
        shouldContinue: true
      };
    }
  }

  private async handleInterventionWithJumping(
    stepName: string,
    stepIndex: number,
    context: Context,
    currentData: any,
    executionContext: OperationExecutionContext,
    error?: Error
  ): Promise<InterventionAction> {
    // Enhanced intervention state with operation set information
    const state = {
      currentStep: stepName,
      stepIndex,
      context,
      currentData,
      availableCheckpoints: this.interventionManager['checkpointManager'].getAllCheckpoints(),
      executionHistory: this.interventionManager['executionHistory'],
      error,
      // Enhanced with operation set context
      operationSetInfo: {
        processName: executionContext.processName,
        availableOperations: executionContext.operationNames,
        currentOperationIndex: stepIndex,
        totalOperations: executionContext.operationNames.length
      }
    };

    return await this.interventionManager.handleIntervention(
      stepName,
      stepIndex,
      context,
      currentData,
      error
    );
  }

  private async processInterventionAction(
    action: InterventionAction,
    currentStepIndex: number,
    currentInput: Input<any>,
    executionContext: OperationExecutionContext,
    error?: Error
  ): Promise<{
    shouldReturn: boolean;
    output?: Output<any>;
    newInput?: Input<any>;
    errorHandled?: boolean;
    jumpToOperation?: string;
    jumpToOperationIndex?: number;
  }> {
    switch (action.type) {
      case 'retry':
        return { 
          shouldReturn: false, 
          errorHandled: true,
          jumpToOperation: executionContext.operationNames[currentStepIndex],
          jumpToOperationIndex: currentStepIndex
        };

      case 'next':
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < executionContext.operationNames.length) {
          return { 
            shouldReturn: false, 
            errorHandled: true,
            jumpToOperation: executionContext.operationNames[nextIndex],
            jumpToOperationIndex: nextIndex
          };
        }
        return { shouldReturn: true, errorHandled: true };

      case 'back':
        if (action.targetCheckpoint) {
          const restored = this.interventionManager.restoreCheckpoint(action.targetCheckpoint);
          if (restored) {
            const checkpoint = this.interventionManager.findPreviousCheckpoint(currentStepIndex);
            if (checkpoint) {
              const restoredInput = {
                ...currentInput,
                data: restored.data
              } as Input<any>;
              
              return { 
                shouldReturn: false, 
                newInput: restoredInput,
                errorHandled: true,
                jumpToOperation: checkpoint.stepId,
                jumpToOperationIndex: checkpoint.stepIndex
              };
            }
          }
        }
        return { shouldReturn: false, errorHandled: true };

      case 'edit_state':
        if (action.modifiedData !== undefined) {
          const modifiedInput = {
            ...currentInput,
            data: action.modifiedData
          } as Input<any>;
          return { shouldReturn: false, newInput: modifiedInput, errorHandled: true };
        }
        return { shouldReturn: false, errorHandled: true };

      case 'resume_auto':
        this.interventionManager.exitManualMode();
        return { shouldReturn: false, errorHandled: true };

      case 'abort':
        throw new Error('Process aborted by user intervention');

      // NEW: Jump to specific operation
      case 'jump_to_operation':
        if (action.targetOperation) {
          const targetIndex = executionContext.operationNames.indexOf(action.targetOperation);
          if (targetIndex >= 0) {
            return {
              shouldReturn: false,
              errorHandled: true,
              jumpToOperation: action.targetOperation,
              jumpToOperationIndex: targetIndex
            };
          }
        }
        return { shouldReturn: false, errorHandled: true };

      default:
        return { shouldReturn: false, errorHandled: false };
    }
  }

  /**
   * Create execution state for operation set introspection
   */
  createExecutionState(
    currentIndex: number,
    currentInput: Input<any>,
    executionContext: OperationExecutionContext
  ): ExecutionState {
    return {
      currentOperationIndex: currentIndex,
      currentOperationName: executionContext.operationNames[currentIndex] || 'unknown',
      currentInput,
      completedOperations: executionContext.operationNames.slice(0, currentIndex),
      availableOperations: executionContext.operationNames
    };
  }
}