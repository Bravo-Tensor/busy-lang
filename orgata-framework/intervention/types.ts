// Intervention system types and interfaces

import { Context } from '../types.js';

export interface InterventionState {
  currentStep: string;
  stepIndex: number;
  context: Context;
  currentData: any;
  availableCheckpoints: Checkpoint[];
  executionHistory: ExecutionStep[];
  error?: Error;
  operationSetInfo?: {
    processName: string;
    availableOperations: string[];
    currentOperationIndex: number;
    totalOperations: number;
  };
}

export interface InterventionAction {
  type: 'retry' | 'next' | 'back' | 'edit_state' | 'resume_auto' | 'abort' | 'jump_to_operation';
  targetCheckpoint?: string;
  targetOperation?: string;
  modifiedContext?: Context;
  modifiedData?: any;
}

export interface Checkpoint {
  id: string;
  stepId: string;
  stepIndex: number;
  timestamp: Date;
  contextState: any;
  currentData: any;
  description: string;
}

export interface ExecutionStep {
  stepId: string;
  stepIndex: number;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  error?: Error;
  checkpointIds: string[];
}

export interface InterventionInterface {
  // Show current state and get human decision - pure UI
  showInterventionMenu(state: InterventionState): Promise<InterventionAction>;
  
  // Let human edit context state - pure UI  
  editContextState(context: Context, currentData: any): Promise<{ context: Context; data: any }>;
  
  // Show status messages - pure UI
  showStatus(message: string): void;
  
  // Called when interface is set up
  initialize?(): void;
  
  // Called when interface is torn down
  cleanup?(): void;
}