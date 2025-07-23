/**
 * Base Process class for Orgata Framework
 * 
 * Implements the core process execution logic with complete flexibility,
 * immutable state management, and intelligent override capabilities.
 * 
 * Based on design specification:
 * - Framework Architecture: ../../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 * - API Specification: ../../design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md
 */

import { EventEmitter } from 'eventemitter3';
import { ProcessStatus } from '../types';
import type {
  ProcessConfig,
  ProcessContext,
  ProcessResult,
  StepResult,
  ValidationResult,
  OverrideRequest,
  OverrideResult,
  AuditEntry
} from '../types';
import type { Step } from './Step';
import { ProcessState } from '../state/ProcessState';

export abstract class Process extends EventEmitter {
  readonly id: string;
  readonly name: string;
  readonly config: ProcessConfig;
  protected steps: Map<string, Step>;
  protected state: ProcessState;
  protected stepOrder: string[];

  constructor(config: ProcessConfig) {
    super();
    
    this.id = this.generateId();
    this.name = config.name;
    this.config = config;
    this.steps = new Map();
    this.stepOrder = [];
    
    // Initialize with empty state
    this.state = ProcessState.create(this.id);
  }

  // =============================================================================
  // Abstract Methods (must be implemented by subclasses)
  // =============================================================================

  /**
   * Main execution entry point - implemented by generated process classes
   */
  abstract execute(context: ProcessContext): Promise<ProcessResult>;

  // =============================================================================
  // Step Management
  // =============================================================================

  /**
   * Add a step to the process
   */
  addStep(step: Step): void {
    if (this.steps.has(step.id)) {
      throw new Error(`Step with id '${step.id}' already exists`);
    }
    
    this.steps.set(step.id, step);
    this.stepOrder.push(step.id);
    
    this.emit('step:added', step);
  }

  /**
   * Remove a step from the process
   */
  removeStep(stepId: string): void {
    if (!this.steps.has(stepId)) {
      throw new Error(`Step with id '${stepId}' not found`);
    }
    
    this.steps.delete(stepId);
    this.stepOrder = this.stepOrder.filter(id => id !== stepId);
    
    this.emit('step:removed', stepId);
  }

  /**
   * Get a specific step by ID
   */
  getStep(stepId: string): Step | undefined {
    return this.steps.get(stepId);
  }

  /**
   * Get all steps in order
   */
  getSteps(): Step[] {
    return this.stepOrder.map(id => this.steps.get(id)!).filter(Boolean);
  }

  /**
   * Get step IDs in execution order
   */
  getStepOrder(): string[] {
    return [...this.stepOrder];
  }

  // =============================================================================
  // Process Lifecycle Management
  // =============================================================================

  /**
   * Start process execution
   */
  async start(initialContext?: ProcessContext): Promise<void> {
    if (this.state.status !== ProcessStatus.NOT_STARTED) {
      throw new Error(`Process cannot be started. Current status: ${this.state.status}`);
    }

    this.state = this.state.withStatus(ProcessStatus.RUNNING);
    
    if (this.stepOrder.length > 0) {
      this.state = this.state.withCurrentStep(this.stepOrder[0]);
    }

    this.emit('process:started', { 
      processId: this.id, 
      context: initialContext,
      timestamp: new Date()
    });
  }

  /**
   * Pause process execution
   */
  pause(reason?: string): void {
    if (this.state.status !== ProcessStatus.RUNNING) {
      throw new Error(`Process cannot be paused. Current status: ${this.state.status}`);
    }

    this.state = this.state.withStatus(ProcessStatus.PAUSED);
    
    this.emit('process:paused', { 
      processId: this.id, 
      reason,
      timestamp: new Date()
    });
  }

  /**
   * Resume process execution
   */
  async resume(): Promise<void> {
    if (this.state.status !== ProcessStatus.PAUSED) {
      throw new Error(`Process cannot be resumed. Current status: ${this.state.status}`);
    }

    this.state = this.state.withStatus(ProcessStatus.RUNNING);
    
    this.emit('process:resumed', { 
      processId: this.id,
      timestamp: new Date()
    });
  }

  /**
   * Stop process execution
   */
  stop(reason?: string): void {
    if (this.state.status === ProcessStatus.COMPLETED || 
        this.state.status === ProcessStatus.CANCELLED) {
      return; // Already stopped
    }

    this.state = this.state.withStatus(ProcessStatus.CANCELLED);
    
    this.emit('process:stopped', { 
      processId: this.id, 
      reason,
      timestamp: new Date()
    });
  }

  // =============================================================================
  // Flexible Navigation (Core Framework Feature)
  // =============================================================================

  /**
   * Navigate to a specific step
   * Maintains immutable history - never rewrites past
   */
  async goToStep(stepId: string, reason?: string): Promise<void> {
    if (!this.steps.has(stepId)) {
      throw new Error(`Step '${stepId}' not found`);
    }

    if (!this.state.canGoToStep(stepId)) {
      throw new Error(`Cannot navigate to step '${stepId}' in current state`);
    }

    // Create navigation event (preserves history)
    this.state = this.state.withStepNavigation(stepId, reason || 'User navigation');
    
    this.emit('step:navigation', {
      fromStep: this.state.currentStepId,
      toStep: stepId,
      reason,
      timestamp: new Date()
    });
  }

  /**
   * Skip a step with optional manual data provision
   * Core flexibility feature - users can always skip steps
   */
  async skipStep(stepId: string, reason: string, manualData?: any): Promise<void> {
    if (!this.steps.has(stepId)) {
      throw new Error(`Step '${stepId}' not found`);
    }

    const step = this.steps.get(stepId)!;
    
    // Validate manual data if provided
    if (manualData) {
      const validation = this.validateManualData(stepId, manualData);
      if (!validation.valid) {
        this.emit('validation:warnings', {
          stepId,
          warnings: validation.errors,
          proceedAnyway: true
        });
      }
    }

    // Create skip event with manual data
    this.state = this.state.withStepSkip(stepId, reason, manualData);
    
    this.emit('step:skip', {
      stepId,
      reason,
      manualData,
      timestamp: new Date()
    });

    // Move to next step if this was current step
    if (this.state.currentStepId === stepId) {
      const nextStepId = this.getNextStepId(stepId);
      if (nextStepId) {
        this.state = this.state.withCurrentStep(nextStepId);
      }
    }
  }

  /**
   * Go back to previous steps
   * Replays history forward from that point
   */
  async goBack(steps: number = 1): Promise<void> {
    if (steps < 1) {
      throw new Error('Steps must be positive number');
    }

    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex < steps) {
      throw new Error('Cannot go back further than process start');
    }

    const targetIndex = currentIndex - steps;
    const targetStepId = this.stepOrder[targetIndex];
    
    await this.goToStep(targetStepId, `Go back ${steps} step(s)`);
  }

  // =============================================================================
  // State Management and Queries
  // =============================================================================

  /**
   * Get current step
   */
  getCurrentStep(): Step | null {
    if (!this.state.currentStepId) {
      return null;
    }
    return this.steps.get(this.state.currentStepId) || null;
  }

  /**
   * Get current process state (immutable)
   */
  getState(): ProcessState {
    return this.state;
  }

  /**
   * Get complete audit trail
   */
  getAuditTrail(): AuditEntry[] {
    return this.state.getAuditTrail();
  }

  /**
   * Check if process is currently running
   */
  isRunning(): boolean {
    return this.state.status === ProcessStatus.RUNNING;
  }

  /**
   * Check if process is completed
   */
  isCompleted(): boolean {
    return this.state.status === ProcessStatus.COMPLETED;
  }

  /**
   * Get completion percentage (0-100)
   */
  getCompletionPercentage(): number {
    const totalSteps = this.stepOrder.length;
    if (totalSteps === 0) return 100;
    
    const completedSteps = this.stepOrder.filter(stepId => 
      this.state.isStepCompleted(stepId)
    ).length;
    
    return Math.round((completedSteps / totalSteps) * 100);
  }

  // =============================================================================
  // Override and Flexibility System
  // =============================================================================

  /**
   * Handle override requests (delegated to FlexibilityAgent)
   * TODO: Implement FlexibilityAgent as specified in design docs
   */
  async requestOverride(request: OverrideRequest): Promise<OverrideResult> {
    // This will be implemented when we add the FlexibilityAgent
    // For now, return a basic response
    return {
      approved: false,
      implementation: {
        type: 'not_implemented',
        changes: {},
        instructions: 'Override system not yet implemented'
      },
      consequences: {
        riskLevel: 'low',
        missingData: [],
        affectedSteps: [],
        suggestedMitigations: [],
        dataRequirements: []
      },
      auditEntry: {
        id: this.generateId(),
        timestamp: new Date(),
        processId: this.id,
        stepId: request.stepId,
        userId: request.currentContext.userId,
        action: {
          type: 'override_request',
          description: request.userMessage,
          automated: false
        },
        details: {
          before: null,
          after: null,
          metadata: { request }
        },
        impact: {
          scope: 'step',
          severity: 'info',
          categories: ['override']
        }
      }
    };
  }

  /**
   * Validate manual data for step skipping
   */
  validateManualData(stepId: string, data: any): ValidationResult {
    const step = this.steps.get(stepId);
    if (!step) {
      return {
        valid: false,
        errors: [{
          code: 'STEP_NOT_FOUND',
          message: `Step '${stepId}' not found`,
          severity: 'error'
        }]
      };
    }

    // Delegate to step's validation logic
    return step.validate(data);
  }

  // =============================================================================
  // Process Execution Helpers
  // =============================================================================

  /**
   * Execute all steps in sequence (framework-provided implementation)
   * Used by generated process classes
   */
  protected async executeSteps(context: ProcessContext): Promise<ProcessResult> {
    const startTime = new Date();
    const completedSteps: string[] = [];
    const exceptions: any[] = [];
    
    try {
      await this.start(context);
      
      for (const stepId of this.stepOrder) {
        if (this.state.isStepSkipped(stepId)) {
          continue; // Skip this step
        }
        
        const step = this.steps.get(stepId)!;
        
        try {
          this.emit('step:start', { stepId, step, context });
          
          const stepContext = this.buildStepContext(stepId, context);
          const result = await step.execute(stepContext);
          
          if (result.success) {
            this.state = this.state.withStepData(stepId, {
              stepId,
              data: result.data,
              timestamp: new Date(),
              source: 'user',
              validated: true
            });
            
            completedSteps.push(stepId);
            this.emit('step:complete', { stepId, step, result });
          } else {
            this.emit('step:error', { stepId, step, result });
            throw new Error(`Step '${stepId}' failed: ${result.errors?.map(e => e.message).join(', ')}`);
          }
          
        } catch (error) {
          this.emit('step:exception', { stepId, step, error });
          exceptions.push({
            stepId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
          
          // For now, stop on error - could be made configurable
          break;
        }
      }
      
      this.state = this.state.withStatus(ProcessStatus.COMPLETED);
      
      return {
        success: exceptions.length === 0,
        processId: this.id,
        completedSteps,
        finalData: this.collectFinalData(),
        metadata: {
          startedAt: startTime,
          completedAt: new Date(),
          duration: Date.now() - startTime.getTime(),
          executionMode: 'sequential',
          version: '1.0.0'
        },
        auditTrail: this.getAuditTrail(),
        exceptions: exceptions.length > 0 ? exceptions : undefined
      };
      
    } catch (error) {
      this.state = this.state.withStatus(ProcessStatus.FAILED);
      
      return {
        success: false,
        processId: this.id,
        completedSteps,
        finalData: this.collectFinalData(),
        metadata: {
          startedAt: startTime,
          completedAt: new Date(),
          duration: Date.now() - startTime.getTime(),
          executionMode: 'sequential',
          version: '1.0.0'
        },
        auditTrail: this.getAuditTrail(),
        exceptions: [
          ...exceptions,
          {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          }
        ]
      };
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private buildStepContext(stepId: string, processContext: ProcessContext): any {
    const step = this.steps.get(stepId)!;
    
    return {
      ...processContext,
      stepId,
      stepType: step.type,
      inputData: this.state.getStepData(stepId)?.data || {},
      previousStepResults: this.state.stepData,
      requiredOutputs: [], // TODO: Extract from step definition
      validationRules: [], // TODO: Extract from step definition  
      startTime: new Date()
    };
  }

  private collectFinalData(): any {
    const finalData: Record<string, any> = {};
    
    for (const [stepId, stepData] of this.state.stepData) {
      if (stepData.validated) {
        finalData[stepId] = stepData.data;
      }
    }
    
    return finalData;
  }

  private getCurrentStepIndex(): number {
    if (!this.state.currentStepId) {
      return -1;
    }
    return this.stepOrder.indexOf(this.state.currentStepId);
  }

  private getNextStepId(currentStepId: string): string | null {
    const currentIndex = this.stepOrder.indexOf(currentStepId);
    if (currentIndex < 0 || currentIndex >= this.stepOrder.length - 1) {
      return null;
    }
    return this.stepOrder[currentIndex + 1];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}