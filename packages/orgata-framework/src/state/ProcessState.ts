/**
 * Immutable ProcessState with Event Sourcing for Orgata Framework
 * 
 * Implements the core "never rewrite history" principle with event-sourced
 * state management and complete audit trail capabilities.
 * 
 * Based on design specification:
 * - Framework Architecture: ../../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 * - Implementation Plan: ../../design-docs/008-orgata-framework/IMPLEMENTATION_PLAN.md
 */

import { produce, immerable } from 'immer';
import { ProcessStatus } from '../types';
import type {
  ProcessEvent,
  ProcessException,
  StepData,
  AuditEntry,
  ValidationResult,
  DataRequirement
} from '../types';
import { ProcessEventBase } from '../types';

// =============================================================================
// Core ProcessState Class (Immutable)
// =============================================================================

export class ProcessState {
  [immerable] = true;
  readonly processId: string;
  readonly currentStepId: string | null;
  readonly status: ProcessStatus;
  readonly stepData: ReadonlyMap<string, StepData>;
  readonly history: readonly ProcessEvent[];
  readonly exceptions: readonly ProcessException[];
  readonly startedAt: Date;
  readonly lastUpdatedAt: Date;

  private constructor(
    processId: string,
    currentStepId: string | null = null,
    status: ProcessStatus = ProcessStatus.NOT_STARTED,
    stepData: ReadonlyMap<string, StepData> = new Map(),
    history: readonly ProcessEvent[] = [],
    exceptions: readonly ProcessException[] = [],
    startedAt: Date = new Date(),
    lastUpdatedAt: Date = new Date()
  ) {
    this.processId = processId;
    this.currentStepId = currentStepId;
    this.status = status;
    this.stepData = stepData;
    this.history = history;
    this.exceptions = exceptions;
    this.startedAt = startedAt;
    this.lastUpdatedAt = lastUpdatedAt;
  }

  // =============================================================================
  // Factory Methods
  // =============================================================================

  /**
   * Create new ProcessState
   */
  static create(processId: string): ProcessState {
    const now = new Date();
    return new ProcessState(processId, null, ProcessStatus.NOT_STARTED, new Map(), [], [], now, now);
  }

  // =============================================================================
  // State Queries
  // =============================================================================

  /**
   * Get step data by ID
   */
  getStepData(stepId: string): StepData | undefined {
    return this.stepData.get(stepId);
  }

  /**
   * Get step history for specific step
   */
  getStepHistory(stepId: string): ProcessEvent[] {
    return this.history.filter(event => 
      'stepId' in event && event.stepId === stepId
    );
  }

  /**
   * Check if step is completed
   */
  isStepCompleted(stepId: string): boolean {
    const stepData = this.stepData.get(stepId);
    return stepData?.validated === true;
  }

  /**
   * Check if step is skipped
   */
  isStepSkipped(stepId: string): boolean {
    return this.history.some(event => 
      event.type === 'step_skipped' && 
      'stepId' in event && 
      event.stepId === stepId
    );
  }

  /**
   * Get complete audit trail
   */
  getAuditTrail(): AuditEntry[] {
    return this.history.map(event => this.eventToAuditEntry(event));
  }

  // =============================================================================
  // Navigation Helpers
  // =============================================================================

  /**
   * Check if can navigate to specific step
   */
  canGoToStep(stepId: string): boolean {
    // Framework philosophy: maximum flexibility
    // Users can always navigate to any step
    return true;
  }

  /**
   * Check if can skip specific step
   */
  canSkipStep(stepId: string): boolean {
    // Framework philosophy: users can always skip steps
    return true;
  }

  /**
   * Get next step (implementation dependent on step order)
   */
  getNextStep(): string | null {
    // This would be implemented based on process definition
    return null;
  }

  /**
   * Get previous step (implementation dependent on step order)
   */
  getPreviousStep(): string | null {
    // This would be implemented based on process definition
    return null;
  }

  // =============================================================================
  // Validation
  // =============================================================================

  /**
   * Validate step data against requirements
   */
  validateStepData(stepId: string, data: any): ValidationResult {
    // Basic validation - can be extended
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Check data requirements for step
   */
  checkDataRequirements(stepId: string): DataRequirement[] {
    // TODO: Implement based on step definitions
    return [];
  }

  // =============================================================================
  // Immutable State Transitions
  // =============================================================================

  /**
   * Create new state with step data
   */
  withStepData(stepId: string, data: StepData): ProcessState {
    const event = new StepDataEvent(
      this.generateEventId(),
      this.processId,
      new Date(),
      stepId,
      data
    );

    return this.applyEvent(event);
  }

  /**
   * Create new state with current step
   */
  withCurrentStep(stepId: string): ProcessState {
    const event = new StepNavigationEvent(
      this.generateEventId(),
      this.processId,
      new Date(),
      stepId,
      'navigation'
    );

    return this.applyEvent(event);
  }

  /**
   * Create new state with step navigation
   */
  withStepNavigation(stepId: string, reason: string): ProcessState {
    const event = new StepNavigationEvent(
      this.generateEventId(),
      this.processId,
      new Date(),
      stepId,
      reason
    );

    return this.applyEvent(event);
  }

  /**
   * Create new state with step skip
   */
  withStepSkip(stepId: string, reason: string, manualData?: any): ProcessState {
    const event = new StepSkippedEvent(
      this.generateEventId(),
      this.processId,
      new Date(),
      stepId,
      reason,
      manualData
    );

    return this.applyEvent(event);
  }

  /**
   * Create new state with exception
   */
  withException(exception: ProcessException): ProcessState {
    const event = new ExceptionEvent(
      this.generateEventId(),
      this.processId,
      new Date(),
      exception
    );

    return this.applyEvent(event);
  }

  /**
   * Create new state with status
   */
  withStatus(status: ProcessStatus): ProcessState {
    const event = new StatusChangeEvent(
      this.generateEventId(),
      this.processId,
      new Date(),
      status
    );

    return this.applyEvent(event);
  }

  // =============================================================================
  // Event Sourcing Implementation
  // =============================================================================

  /**
   * Apply event to create new immutable state
   */
  private applyEvent(event: ProcessEvent): ProcessState {
    const newHistory = [...this.history, event];
    
    return produce(this, draft => {
      // Apply event-specific changes
      if (event instanceof StepDataEvent) {
        draft.stepData.set(event.stepId, event.data);
      } else if (event instanceof StepNavigationEvent) {
        draft.currentStepId = event.stepId;
      } else if (event instanceof StatusChangeEvent) {
        draft.status = event.status;
      } else if (event instanceof ExceptionEvent) {
        draft.exceptions.push(event.exception);
      }
      
      draft.history = newHistory;
      draft.lastUpdatedAt = event.timestamp;
    });
  }

  /**
   * Convert event to audit entry
   */
  private eventToAuditEntry(event: ProcessEvent): AuditEntry {
    return {
      id: event.id,
      timestamp: event.timestamp,
      processId: event.processId,
      stepId: 'stepId' in event ? (event as any).stepId : undefined,
      userId: event.userId || 'system',
      action: {
        type: event.type,
        description: this.getEventDescription(event),
        automated: true
      },
      details: {
        before: null,
        after: this.getEventData(event),
        metadata: { eventType: event.type }
      },
      impact: {
        scope: 'step',
        severity: 'info',
        categories: [event.type]
      }
    };
  }

  private getEventDescription(event: ProcessEvent): string {
    switch (event.type) {
      case 'step_data':
        return `Step data updated`;
      case 'step_navigation':
        return `Navigated to step`;
      case 'step_skipped':
        return `Step skipped`;
      case 'status_change':
        return `Process status changed`;
      case 'exception':
        return `Exception occurred`;
      default:
        return `Process event: ${event.type}`;
    }
  }

  private getEventData(event: ProcessEvent): any {
    if (event instanceof StepDataEvent) {
      return event.data;
    } else if (event instanceof StepNavigationEvent) {
      return { stepId: event.stepId, reason: event.reason };
    } else if (event instanceof StepSkippedEvent) {
      return { stepId: event.stepId, reason: event.reason, manualData: event.manualData };
    } else if (event instanceof StatusChangeEvent) {
      return { status: event.status };
    } else if (event instanceof ExceptionEvent) {
      return event.exception;
    }
    return null;
  }

  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// =============================================================================
// Process Event Implementations
// =============================================================================

export class StepDataEvent extends ProcessEventBase {
  readonly id: string;
  readonly processId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly type = 'step_data';
  readonly stepId: string;
  readonly data: StepData;

  constructor(
    id: string,
    processId: string,
    timestamp: Date,
    stepId: string,
    data: StepData,
    userId?: string
  ) {
    super();
    this.id = id;
    this.processId = processId;
    this.timestamp = timestamp;
    this.stepId = stepId;
    this.data = data;
    this.userId = userId;
  }

  apply(state: ProcessState): ProcessState {
    return state.withStepData(this.stepId, this.data);
  }
}

export class StepNavigationEvent extends ProcessEventBase {
  readonly id: string;
  readonly processId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly type = 'step_navigation';
  readonly stepId: string;
  readonly reason: string;
  readonly data: { stepId: string; reason: string };

  constructor(
    id: string,
    processId: string,
    timestamp: Date,
    stepId: string,
    reason: string,
    userId?: string
  ) {
    super();
    this.id = id;
    this.processId = processId;
    this.timestamp = timestamp;
    this.stepId = stepId;
    this.reason = reason;
    this.userId = userId;
    this.data = { stepId, reason };
  }

  apply(state: ProcessState): ProcessState {
    return state.withCurrentStep(this.stepId);
  }
}

export class StepSkippedEvent extends ProcessEventBase {
  readonly id: string;
  readonly processId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly type = 'step_skipped';
  readonly stepId: string;
  readonly reason: string;
  readonly manualData?: any;
  readonly data: { stepId: string; reason: string; manualData?: any };

  constructor(
    id: string,
    processId: string,
    timestamp: Date,
    stepId: string,
    reason: string,
    manualData?: any,
    userId?: string
  ) {
    super();
    this.id = id;
    this.processId = processId;
    this.timestamp = timestamp;
    this.stepId = stepId;
    this.reason = reason;
    this.manualData = manualData;
    this.userId = userId;
    this.data = { stepId, reason, manualData };
  }

  apply(state: ProcessState): ProcessState {
    // Create exception record for the skip
    const exception: ProcessException = {
      id: this.id,
      type: 'STEP_SKIPPED' as any,
      stepId: this.stepId,
      timestamp: this.timestamp,
      userId: this.userId || 'unknown',
      reason: this.reason,
      impact: {
        severity: 'low',
        affectedSteps: [],
        estimatedDelay: 0,
        riskFactors: ['manual_data_provided']
      },
      auditTrail: []
    };

    return state.withException(exception);
  }
}

export class StatusChangeEvent extends ProcessEventBase {
  readonly id: string;
  readonly processId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly type = 'status_change';
  readonly status: ProcessStatus;
  readonly data: { status: ProcessStatus };

  constructor(
    id: string,
    processId: string,
    timestamp: Date,
    status: ProcessStatus,
    userId?: string
  ) {
    super();
    this.id = id;
    this.processId = processId;
    this.timestamp = timestamp;
    this.status = status;
    this.userId = userId;
    this.data = { status };
  }

  apply(state: ProcessState): ProcessState {
    return state.withStatus(this.status);
  }
}

export class ExceptionEvent extends ProcessEventBase {
  readonly id: string;
  readonly processId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly type = 'exception';
  readonly exception: ProcessException;
  readonly data: { exception: ProcessException };

  constructor(
    id: string,
    processId: string,
    timestamp: Date,
    exception: ProcessException,
    userId?: string
  ) {
    super();
    this.id = id;
    this.processId = processId;
    this.timestamp = timestamp;
    this.exception = exception;
    this.userId = userId;
    this.data = { exception };
  }

  apply(state: ProcessState): ProcessState {
    return state.withException(this.exception);
  }
}