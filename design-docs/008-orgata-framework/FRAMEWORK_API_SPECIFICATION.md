# Orgata Framework API Specification

**Created**: July 2025  
**Status**: Design Phase  
**Scope**: Complete API specification for @orgata/framework package

## Overview

Comprehensive API specification for the Orgata Framework, designed to provide a React-like experience for business process development with complete flexibility and intelligent override capabilities.

## Core API Structure

### Base Classes

#### Process Class

```typescript
abstract class Process extends EventEmitter {
  readonly id: string;
  readonly name: string;
  readonly config: ProcessConfig;
  protected steps: Map<string, Step>;
  protected state: ProcessState;
  
  constructor(config: ProcessConfig);
  
  // Core lifecycle methods
  abstract execute(context: ProcessContext): Promise<ProcessResult>;
  
  // Step management
  addStep(step: Step): void;
  removeStep(stepId: string): void;
  getStep(stepId: string): Step | undefined;
  getSteps(): Step[];
  
  // Navigation and control
  start(initialContext?: ProcessContext): Promise<void>;
  pause(reason?: string): void;
  resume(): Promise<void>;
  stop(reason?: string): void;
  
  // Flexible navigation
  goToStep(stepId: string, reason?: string): Promise<void>;
  skipStep(stepId: string, reason: string, manualData?: any): Promise<void>;
  goBack(steps?: number): Promise<void>;
  
  // State management
  getCurrentStep(): Step | null;
  getState(): ProcessState;
  getAuditTrail(): AuditEntry[];
  
  // Override and flexibility
  requestOverride(request: OverrideRequest): Promise<OverrideResult>;
  validateManualData(stepId: string, data: any): ValidationResult;
  
  // Events (extends EventEmitter)
  // emit('step:start', step, context)
  // emit('step:complete', step, result)
  // emit('step:skip', step, reason, manualData)
  // emit('process:pause', reason)
  // emit('exception', exception)
}

interface ProcessConfig {
  name: string;
  description?: string;
  layer: 'L0' | 'L1' | 'L2';
  estimatedDuration?: string;
  metadata?: Record<string, any>;
  validation?: ProcessValidation;
  permissions?: ProcessPermissions;
}
```

#### Step Class Hierarchy

```typescript
abstract class Step {
  readonly id: string;
  readonly name: string;
  readonly type: StepType;
  readonly config: StepConfig;
  
  constructor(config: StepConfig);
  
  // Core execution
  abstract execute(context: StepContext): Promise<StepResult>;
  
  // Validation and preparation
  validate(input: any): ValidationResult;
  prepareContext(processContext: ProcessContext): StepContext;
  
  // Flexibility and overrides
  canSkip(reason: string): boolean;
  getRequiredInputs(): InputRequirement[];
  acceptManualData(data: any): boolean;
  
  // Audit and tracking
  createAuditEntry(action: string, data: any): AuditEntry;
}

// Specialized step types
class HumanStep extends Step {
  readonly model: FormModel;
  readonly view: ComponentDefinition;
  readonly validation: ValidationRules;
  
  constructor(config: HumanStepConfig);
  
  // UI-specific methods
  renderUI(context: StepContext): Promise<UIComponent>;
  handleUserInput(input: UserInput): Promise<StepResult>;
  generateAlternativeUI(constraints?: UIConstraints): ComponentDefinition;
}

class AgentStep extends Step {
  readonly prompt: AgentPrompt;
  readonly context: AgentContext;
  readonly constraints: AgentConstraints;
  
  constructor(config: AgentStepConfig);
  
  // AI-specific methods
  buildPrompt(context: StepContext): string;
  executeAgent(prompt: string, context: AgentContext): Promise<AgentResponse>;
  validateAgentOutput(output: AgentResponse): ValidationResult;
}

class AlgorithmStep extends Step {
  readonly implementation: AlgorithmImplementation;
  readonly parameters: AlgorithmParameters;
  
  constructor(config: AlgorithmStepConfig);
  
  // Algorithm-specific methods
  executeAlgorithm(input: AlgorithmInput): Promise<AlgorithmOutput>;
  validateAlgorithmResult(result: AlgorithmOutput): ValidationResult;
}
```

### State Management

#### ProcessState

```typescript
class ProcessState {
  readonly processId: string;
  readonly currentStepId: string | null;
  readonly status: ProcessStatus;
  readonly stepData: ReadonlyMap<string, StepData>;
  readonly history: readonly ProcessEvent[];
  readonly exceptions: readonly ProcessException[];
  readonly startedAt: Date;
  readonly lastUpdatedAt: Date;
  
  // State queries
  getStepData(stepId: string): StepData | undefined;
  getStepHistory(stepId: string): ProcessEvent[];
  isStepCompleted(stepId: string): boolean;
  isStepSkipped(stepId: string): boolean;
  
  // State transitions (return new immutable state)
  withStepData(stepId: string, data: StepData): ProcessState;
  withCurrentStep(stepId: string): ProcessState;
  withException(exception: ProcessException): ProcessState;
  withStatus(status: ProcessStatus): ProcessState;
  
  // Navigation helpers
  canGoToStep(stepId: string): boolean;
  canSkipStep(stepId: string): boolean;
  getNextStep(): string | null;
  getPreviousStep(): string | null;
  
  // Validation
  validateStepData(stepId: string, data: any): ValidationResult;
  checkDataRequirements(stepId: string): DataRequirement[];
}

enum ProcessStatus {
  NOT_STARTED = 'not_started',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

#### Event Sourcing

```typescript
abstract class ProcessEvent {
  readonly id: string;
  readonly processId: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly type: string;
  
  abstract apply(state: ProcessState): ProcessState;
}

class StepStartedEvent extends ProcessEvent {
  readonly stepId: string;
  readonly context: StepContext;
}

class StepCompletedEvent extends ProcessEvent {
  readonly stepId: string;
  readonly result: StepResult;
  readonly duration: number;
}

class StepSkippedEvent extends ProcessEvent {
  readonly stepId: string;
  readonly reason: string;
  readonly manualData?: any;
}

class DataUpdatedEvent extends ProcessEvent {
  readonly stepId: string;
  readonly field: string;
  readonly oldValue: any;
  readonly newValue: any;
  readonly reason: string;
}

class ExceptionEvent extends ProcessEvent {
  readonly exception: ProcessException;
  readonly context: ExceptionContext;
}
```

### Flexibility and Override System

#### FlexibilityAgent

```typescript
class FlexibilityAgent {
  // Main override request handler
  async handleOverrideRequest(
    request: OverrideRequest,
    process: Process,
    context: ProcessContext
  ): Promise<OverrideResult>;
  
  // Specific override capabilities
  async generateAlternativeUI(
    step: HumanStep,
    constraints: UIConstraints,
    userRequirements: string
  ): Promise<ComponentDefinition>;
  
  async analyzeSkipConsequences(
    stepId: string,
    process: Process,
    manualData?: any
  ): Promise<ConsequenceAnalysis>;
  
  async suggestDataAlternatives(
    requiredData: DataRequirement[],
    availableData: any
  ): Promise<DataSuggestion[]>;
  
  // Learning and improvement
  async analyzeExceptionPatterns(
    exceptions: ProcessException[]
  ): Promise<ProcessImprovement[]>;
  
  async generateProcessOptimizations(
    process: Process,
    auditTrail: AuditEntry[]
  ): Promise<ProcessOptimization[]>;
}

interface OverrideRequest {
  type: OverrideType;
  stepId: string;
  userMessage: string;
  currentContext: ProcessContext;
  proposedChange?: any;
}

enum OverrideType {
  SKIP_STEP = 'skip_step',
  MODIFY_UI = 'modify_ui', 
  CHANGE_DATA = 'change_data',
  ALTER_FLOW = 'alter_flow',
  BYPASS_VALIDATION = 'bypass_validation'
}

interface OverrideResult {
  approved: boolean;
  implementation: OverrideImplementation;
  consequences: ConsequenceAnalysis;
  auditEntry: AuditEntry;
  alternatives?: OverrideAlternative[];
}
```

### Data Models and Types

#### Core Interfaces

```typescript
interface ProcessContext {
  processId: string;
  userId: string;
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  businessContext: BusinessContext;
  permissions: UserPermissions;
  preferences: UserPreferences;
}

interface StepContext extends ProcessContext {
  stepId: string;
  stepType: StepType;
  inputData: any;
  previousStepResults: Map<string, StepResult>;
  requiredOutputs: OutputRequirement[];
  validationRules: ValidationRule[];
}

interface StepResult {
  success: boolean;
  data: any;
  metadata: StepMetadata;
  nextStepId?: string;
  errors?: StepError[];
  warnings?: StepWarning[];
}

interface ProcessException {
  id: string;
  type: ExceptionType;
  stepId: string;
  timestamp: Date;
  userId: string;
  reason: string;
  impact: ExceptionImpact;
  resolution?: ExceptionResolution;
  auditTrail: AuditEntry[];
}

enum ExceptionType {
  STEP_SKIPPED = 'step_skipped',
  VALIDATION_OVERRIDDEN = 'validation_overridden',
  MANUAL_DATA_PROVIDED = 'manual_data_provided',
  FLOW_MODIFIED = 'flow_modified',
  UI_BYPASSED = 'ui_bypassed'
}
```

#### UI and Form Models

```typescript
interface FormModel {
  fields: FormField[];
  layout: LayoutConfig;
  validation: ValidationConfig;
  metadata: FormMetadata;
}

interface FormField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  validation: FieldValidation[];
  defaultValue?: any;
  options?: FieldOption[];
  conditionalLogic?: ConditionalLogic;
}

enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  NUMBER = 'number',
  DATE = 'date',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE_UPLOAD = 'file_upload',
  CURRENCY = 'currency',
  PHONE = 'phone',
  URL = 'url',
  JSON = 'json',
  CUSTOM = 'custom'
}

interface ComponentDefinition {
  type: ComponentType;
  props: ComponentProps;
  children?: ComponentDefinition[];
  styling?: ComponentStyling;
  behavior?: ComponentBehavior;
}
```

#### AI Agent Models

```typescript
interface AgentPrompt {
  systemPrompt: string;
  userPrompt: string;
  context: PromptContext;
  constraints: PromptConstraints;
  examples?: PromptExample[];
}

interface AgentContext {
  processContext: ProcessContext;
  stepContext: StepContext;
  businessData: BusinessData;
  previousResults: AgentResult[];
  availableTools: AgentTool[];
}

interface AgentResponse {
  content: string;
  confidence: number;
  reasoning: string;
  structuredData?: any;
  suggestedActions?: SuggestedAction[];
  requiresHumanReview: boolean;
}
```

## Usage Examples

### Basic Process Definition

```typescript
// Generated from BUSY file
export class ClientOnboardingProcess extends Process {
  constructor() {
    super({
      name: "Client Onboarding",
      layer: "L0",
      estimatedDuration: "3 days",
      description: "Complete client onboarding workflow"
    });
    
    this.addStep(new InitialContactStep());
    this.addStep(new NeedsAssessmentStep());
    this.addStep(new ProposalGenerationStep());
    this.addStep(new ContractFinalizationStep());
  }
  
  async execute(context: ProcessContext): Promise<ProcessResult> {
    // Framework handles step-by-step execution
    return await this.executeSteps(context);
  }
}
```

### Human Step Implementation

```typescript
class NeedsAssessmentStep extends HumanStep {
  constructor() {
    super({
      id: 'needs-assessment',
      name: 'Client Needs Assessment',
      model: {
        fields: [
          {
            id: 'business_goals',
            type: FieldType.TEXTAREA,
            label: 'Business Goals',
            required: true,
            helpText: 'What are the client\'s primary business objectives?'
          },
          {
            id: 'budget_range',
            type: FieldType.CURRENCY,
            label: 'Budget Range',
            required: true,
            validation: [{ type: 'min', value: 1000, message: 'Minimum budget is $1,000' }]
          },
          {
            id: 'timeline',
            type: FieldType.DATE,
            label: 'Target Completion Date',
            required: false
          }
        ]
      }
    });
  }
  
  async execute(context: StepContext): Promise<StepResult> {
    // Framework handles UI rendering and data collection
    const userInput = await this.collectUserInput(context);
    
    // Custom business logic
    const assessmentScore = this.calculateAssessmentScore(userInput);
    
    return {
      success: true,
      data: {
        ...userInput,
        assessmentScore,
        recommendedNextStep: this.determineNextStep(assessmentScore)
      },
      metadata: {
        completedAt: new Date(),
        duration: context.stepDuration
      }
    };
  }
  
  private calculateAssessmentScore(input: any): number {
    // Custom scoring logic
    return 85;
  }
}
```

### Flexible Override Examples

```typescript
// User requests to skip a step
const skipResult = await process.skipStep(
  'client-interview', 
  'Client provided information via email',
  {
    contactEmail: 'client@example.com',
    businessType: 'consulting',
    urgency: 'high'
  }
);

// Agent analyzes consequences
const analysis = await flexibilityAgent.analyzeSkipConsequences(
  'client-interview',
  process,
  skipResult.manualData
);

console.log(`Risk Level: ${analysis.riskLevel}`);
console.log(`Missing Data: ${analysis.missingData.join(', ')}`);
console.log(`Affected Steps: ${analysis.affectedSteps.join(', ')}`);

// User requests alternative UI
const alternativeUI = await flexibilityAgent.generateAlternativeUI(
  needsAssessmentStep,
  { allowFreeForm: true, skipValidation: false },
  "I need to enter complex requirements that don't fit in predefined fields"
);
```

## Framework Utilities

### Validation System

```typescript
class ValidationEngine {
  validateStep(step: Step, input: any): ValidationResult;
  validateProcess(process: Process, state: ProcessState): ValidationResult;
  createCustomValidator(rule: ValidationRule): Validator;
  overrideValidation(stepId: string, reason: string): ValidationOverride;
}

interface ValidationRule {
  type: ValidationType;
  field?: string;
  condition: ValidationCondition;
  message: string;
  severity: 'error' | 'warning' | 'info';
}
```

### Audit and Logging

```typescript
class AuditLogger {
  logStepExecution(step: Step, context: StepContext, result: StepResult): void;
  logException(exception: ProcessException): void;
  logOverride(override: OverrideRequest, result: OverrideResult): void;
  generateReport(processId: string, timeRange?: TimeRange): AuditReport;
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  processId: string;
  stepId?: string;
  userId: string;
  action: AuditAction;
  details: AuditDetails;
  impact: AuditImpact;
}
```

This API specification provides a comprehensive foundation for implementing the Orgata Framework with complete flexibility and intelligent override capabilities while maintaining type safety and developer experience.