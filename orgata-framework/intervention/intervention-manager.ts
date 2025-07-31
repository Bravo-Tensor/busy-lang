// Core intervention manager - always-on infrastructure service

import { Context } from '../types.js';
import { CheckpointManager } from './checkpoint-manager.js';
import { 
  InterventionInterface, 
  InterventionState, 
  InterventionAction, 
  ExecutionStep 
} from './types.js';

export class InterventionManager {
  private static instance: InterventionManager;
  
  private interventionRequested = false;
  private manualMode = false;
  private checkpointManager = new CheckpointManager();
  private interventionInterface?: InterventionInterface;
  private executionHistory: ExecutionStep[] = [];
  private currentStep?: ExecutionStep;

  private constructor() {}

  static getInstance(): InterventionManager {
    if (!this.instance) {
      this.instance = new InterventionManager();
    }
    return this.instance;
  }

  // Set the UI interface (CLI, Web, API, etc.)
  setInterface(interventionInterface: InterventionInterface) {
    if (this.interventionInterface?.cleanup) {
      this.interventionInterface.cleanup();
    }
    
    this.interventionInterface = interventionInterface;
    
    if (interventionInterface.initialize) {
      interventionInterface.initialize();
    }
  }

  // Called by interface implementations when user wants to intervene
  requestIntervention() {
    this.interventionRequested = true;
    this.interventionInterface?.showStatus('🚨 Intervention requested - will pause at next checkpoint...');
  }

  // Called by framework - checks if intervention was requested
  checkForIntervention(): boolean {
    const requested = this.interventionRequested;
    this.interventionRequested = false;
    return requested;
  }

  // Handle intervention with full state
  async handleIntervention(
    stepId: string,
    stepIndex: number, 
    context: Context, 
    currentData: any,
    error?: Error
  ): Promise<InterventionAction> {
    this.manualMode = true;
    
    if (!this.interventionInterface) {
      throw new Error('No intervention interface configured');
    }

    const state: InterventionState = {
      currentStep: stepId,
      stepIndex,
      context,
      currentData,
      availableCheckpoints: this.checkpointManager.getAllCheckpoints(),
      executionHistory: this.executionHistory,
      error
    };

    return await this.interventionInterface.showInterventionMenu(state);
  }

  // Create checkpoint before/after operations
  createCheckpoint(
    stepId: string, 
    stepIndex: number,
    context: Context, 
    currentData: any, 
    description: string
  ): string {
    return this.checkpointManager.createCheckpoint(
      stepId, 
      stepIndex,
      context, 
      currentData, 
      description
    );
  }

  // Restore from checkpoint
  restoreCheckpoint(checkpointId: string): { context: any; data: any } | null {
    return this.checkpointManager.restoreCheckpoint(checkpointId);
  }

  // Find previous checkpoint for "back" functionality
  findPreviousCheckpoint(currentStepIndex: number) {
    return this.checkpointManager.findPreviousCheckpoint(currentStepIndex);
  }

  // Manual mode management
  isManualMode(): boolean {
    return this.manualMode;
  }

  exitManualMode() {
    this.manualMode = false;
    this.interventionInterface?.showStatus('🔄 Resuming automatic execution...');
  }

  enterManualMode() {
    this.manualMode = true;
    this.interventionInterface?.showStatus('🛑 Entering manual mode - step-by-step execution');
  }

  // Execution tracking
  startStep(stepId: string, stepIndex: number) {
    this.currentStep = {
      stepId,
      stepIndex,
      startTime: new Date(),
      status: 'running',
      checkpointIds: []
    };
  }

  completeStep(success: boolean, error?: Error) {
    if (this.currentStep) {
      this.currentStep.endTime = new Date();
      this.currentStep.status = success ? 'completed' : 'failed';
      if (error) {
        this.currentStep.error = error;
      }
      
      this.executionHistory.push(this.currentStep);
      this.currentStep = undefined;

      // Keep history manageable
      if (this.executionHistory.length > 100) {
        this.executionHistory.shift();
      }
    }
  }

  addCheckpointToCurrentStep(checkpointId: string) {
    if (this.currentStep) {
      this.currentStep.checkpointIds.push(checkpointId);
    }
  }

  // Reset for new process execution
  reset() {
    this.manualMode = false;
    this.interventionRequested = false;
    this.checkpointManager.clear();
    this.executionHistory = [];
    this.currentStep = undefined;
  }

  // Get current execution statistics
  getExecutionStats() {
    return {
      totalSteps: this.executionHistory.length + (this.currentStep ? 1 : 0),
      completedSteps: this.executionHistory.filter(s => s.status === 'completed').length,
      failedSteps: this.executionHistory.filter(s => s.status === 'failed').length,
      isManualMode: this.manualMode,
      totalCheckpoints: this.checkpointManager.getAllCheckpoints().length
    };
  }
}