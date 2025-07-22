/**
 * Base Step class and specialized step implementations for Orgata Framework
 * 
 * Implements the three core step types (Human, Agent, Algorithm) with
 * complete flexibility and override capabilities.
 * 
 * Based on design specification:
 * - Framework Architecture: ../../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 * - API Specification: ../../design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md
 */

import type {
  StepConfig,
  HumanStepConfig,
  AgentStepConfig,
  AlgorithmStepConfig,
  StepContext,
  StepResult,
  StepType,
  ValidationResult,
  InputRequirement,
  AuditEntry,
  FormModel,
  ComponentDefinition,
  ValidationRules,
  AgentPrompt,
  AgentContext,
  AgentConstraints,
  AgentResponse,
  AlgorithmImplementation,
  AlgorithmParameters,
  AlgorithmInput,
  AlgorithmOutput
} from '../types';

// =============================================================================
// Base Step Class
// =============================================================================

export abstract class Step {
  readonly id: string;
  readonly name: string;
  readonly type: StepType;
  readonly config: StepConfig;

  constructor(config: StepConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  // =============================================================================
  // Abstract Methods (must be implemented by subclasses)
  // =============================================================================

  /**
   * Execute the step with given context
   */
  abstract execute(context: StepContext): Promise<StepResult>;

  // =============================================================================
  // Validation and Preparation
  // =============================================================================

  /**
   * Validate step input data
   */
  validate(input: any): ValidationResult {
    // Base validation - override in subclasses for specific validation
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Prepare step context from process context
   */
  prepareContext(processContext: any): StepContext {
    return {
      ...processContext,
      stepId: this.id,
      stepType: this.type,
      inputData: {},
      previousStepResults: new Map(),
      requiredOutputs: this.getRequiredOutputs(),
      validationRules: this.getValidationRules(),
      startTime: new Date()
    };
  }

  // =============================================================================
  // Flexibility and Override Support
  // =============================================================================

  /**
   * Check if this step can be skipped with given reason
   */
  canSkip(reason: string): boolean {
    // Default: all steps can be skipped (framework philosophy: never constrain)
    return true;
  }

  /**
   * Get required inputs for this step
   */
  getRequiredInputs(): InputRequirement[] {
    // Override in subclasses to specify required inputs
    return [];
  }

  /**
   * Check if manual data can substitute for step execution
   */
  acceptManualData(data: any): boolean {
    // Default: accept manual data if it contains required fields
    const requiredInputs = this.getRequiredInputs();
    return requiredInputs.every(input => 
      !input.required || (data && data[input.name] !== undefined)
    );
  }

  // =============================================================================
  // Audit and Tracking
  // =============================================================================

  /**
   * Create audit entry for step actions
   */
  createAuditEntry(action: string, data: any): AuditEntry {
    return {
      id: this.generateId(),
      timestamp: new Date(),
      processId: '', // Will be filled by Process
      stepId: this.id,
      userId: '', // Will be filled from context
      action: {
        type: action,
        description: `Step ${this.name}: ${action}`,
        automated: false
      },
      details: {
        before: null,
        after: data,
        metadata: {
          stepType: this.type,
          stepName: this.name
        }
      },
      impact: {
        scope: 'step',
        severity: 'info',
        categories: ['step_execution']
      }
    };
  }

  // =============================================================================
  // Protected Helper Methods
  // =============================================================================

  protected getRequiredOutputs(): any[] {
    // Override in subclasses
    return [];
  }

  protected getValidationRules(): any[] {
    // Override in subclasses
    return [];
  }

  protected generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  protected calculateDuration(startTime: Date): number {
    return Date.now() - startTime.getTime();
  }
}

// =============================================================================
// Human Step - UI-based user interaction
// =============================================================================

export class HumanStep extends Step {
  readonly model: FormModel;
  readonly view: ComponentDefinition;
  readonly validation: ValidationRules;

  constructor(config: HumanStepConfig) {
    super(config);
    this.model = config.model;
    this.view = config.view;
    this.validation = config.validation || { fields: {}, custom: [] };
  }

  async execute(context: StepContext): Promise<StepResult> {
    try {
      // Framework will handle UI rendering and data collection
      const userInput = await this.collectUserInput(context);
      
      // Validate user input
      const validationResult = this.validateInput(userInput);
      if (!validationResult.valid) {
        return {
          success: false,
          data: userInput,
          metadata: {
            completedAt: new Date(),
            duration: this.calculateDuration(context.startTime)
          },
          errors: validationResult.errors
        };
      }

      // Process the validated input
      const processedData = await this.processUserInput(userInput, context);

      return {
        success: true,
        data: processedData,
        metadata: {
          completedAt: new Date(),
          userAgent: context.userAgent,
          duration: this.calculateDuration(context.startTime)
        }
      };

    } catch (error) {
      return {
        success: false,
        data: null,
        metadata: {
          completedAt: new Date(),
          duration: this.calculateDuration(context.startTime)
        },
        errors: [{
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          severity: 'error'
        }]
      };
    }
  }

  // =============================================================================
  // UI-specific Methods
  // =============================================================================

  /**
   * Render UI and collect user input
   * This will be implemented by the framework's UI rendering system
   */
  protected async collectUserInput(context: StepContext): Promise<any> {
    // Placeholder - actual implementation will depend on UI framework integration
    // For now, return empty object
    return {};
  }

  /**
   * Generate alternative UI when standard form is too restrictive
   */
  generateAlternativeUI(constraints?: any): ComponentDefinition {
    // Return a more flexible UI component
    return {
      type: 'flexible-form',
      props: {
        allowFreeForm: true,
        originalModel: this.model,
        constraints
      },
      styling: {
        className: 'alternative-ui'
      },
      behavior: {
        validation: {
          realTime: false,
          debounceMs: 500,
          showErrors: true
        }
      }
    };
  }

  /**
   * Validate user input against form model and custom rules
   */
  protected validateInput(input: any): ValidationResult {
    const errors: any[] = [];

    // Validate required fields
    for (const field of this.model.fields) {
      if (field.required && (!input || input[field.name] === undefined || input[field.name] === '')) {
        errors.push({
          field: field.name,
          code: 'REQUIRED_FIELD',
          message: `${field.label} is required`,
          severity: 'error'
        });
      }

      // Validate field-specific rules
      if (input && input[field.name] !== undefined) {
        for (const validation of field.validation) {
          if (!this.validateFieldValue(input[field.name], validation)) {
            errors.push({
              field: field.name,
              code: validation.type.toUpperCase(),
              message: validation.message,
              severity: 'error'
            });
          }
        }
      }
    }

    // Apply custom validation rules
    for (const rule of this.validation.custom) {
      // TODO: Implement custom validation logic
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process user input (override for custom business logic)
   */
  protected async processUserInput(input: any, context: StepContext): Promise<any> {
    // Default: return input as-is
    // Override in generated step classes for custom processing
    return input;
  }

  private validateFieldValue(value: any, validation: any): boolean {
    switch (validation.type) {
      case 'min':
        return typeof value === 'number' ? value >= validation.value : value.length >= validation.value;
      case 'max':
        return typeof value === 'number' ? value <= validation.value : value.length <= validation.value;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'pattern':
        return new RegExp(validation.value).test(value);
      default:
        return true;
    }
  }
}

// =============================================================================
// Agent Step - AI-powered processing
// =============================================================================

export class AgentStep extends Step {
  readonly prompt: AgentPrompt;
  readonly context: AgentContext;
  readonly constraints: AgentConstraints;

  constructor(config: AgentStepConfig) {
    super(config);
    this.prompt = config.prompt;
    this.context = config.context;
    this.constraints = config.constraints || {
      timeout: 30000,
      retryAttempts: 3,
      fallbackToHuman: true
    };
  }

  async execute(context: StepContext): Promise<StepResult> {
    try {
      // Build contextual prompt
      const enrichedPrompt = await this.buildContextualPrompt(context);
      
      // Execute AI agent
      const agentResponse = await this.executeAgent(enrichedPrompt, this.context);
      
      // Validate agent output
      const validationResult = this.validateAgentOutput(agentResponse);
      if (!validationResult.valid) {
        return {
          success: false,
          data: agentResponse,
          metadata: {
            completedAt: new Date(),
            duration: this.calculateDuration(context.startTime),
            requiresHumanReview: true,
            confidence: agentResponse.confidence
          },
          errors: validationResult.errors
        };
      }

      // Post-process agent output
      const processedData = await this.postProcessOutput(agentResponse, context);

      return {
        success: true,
        data: processedData,
        metadata: {
          agentConfidence: agentResponse.confidence,
          reasoning: agentResponse.reasoning,
          completedAt: new Date(),
          duration: this.calculateDuration(context.startTime),
          requiresReview: agentResponse.confidence < 0.8
        }
      };

    } catch (error) {
      return {
        success: false,
        data: null,
        metadata: {
          completedAt: new Date(),
          duration: this.calculateDuration(context.startTime),
          requiresHumanReview: true
        },
        errors: [{
          code: 'AGENT_ERROR',
          message: error instanceof Error ? error.message : String(error),
          severity: 'error'
        }]
      };
    }
  }

  // =============================================================================
  // AI-specific Methods
  // =============================================================================

  /**
   * Build prompt with current context data
   */
  protected async buildContextualPrompt(context: StepContext): Promise<string> {
    const contextData = this.extractRelevantContext(context);
    
    return this.prompt.userPrompt.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      return contextData[key] || match;
    });
  }

  /**
   * Execute AI agent (placeholder - will integrate with actual AI service)
   */
  protected async executeAgent(prompt: string, agentContext: AgentContext): Promise<AgentResponse> {
    // Placeholder implementation
    // This will be replaced with actual AI service integration
    return {
      content: 'AI agent response placeholder',
      confidence: 0.85,
      reasoning: 'This is a placeholder response',
      structuredData: {},
      suggestedActions: [],
      requiresHumanReview: false
    };
  }

  /**
   * Validate agent output
   */
  protected validateAgentOutput(output: AgentResponse): ValidationResult {
    const errors: any[] = [];

    if (!output.content && !output.structuredData) {
      errors.push({
        code: 'NO_OUTPUT',
        message: 'Agent produced no usable output',
        severity: 'error'
      });
    }

    if (output.confidence < 0.1) {
      errors.push({
        code: 'LOW_CONFIDENCE',
        message: 'Agent confidence is too low',
        severity: 'warning'
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Extract relevant context from previous steps
   */
  protected extractRelevantContext(context: StepContext): Record<string, any> {
    // TODO: Implement intelligent context extraction
    return {
      processContext: context.businessContext
    };
  }

  /**
   * Post-process agent output (override for custom logic)
   */
  protected async postProcessOutput(response: AgentResponse, context: StepContext): Promise<any> {
    // Default: return structured data or parsed content
    return response.structuredData || response.content;
  }
}

// =============================================================================
// Algorithm Step - Code-based processing
// =============================================================================

export class AlgorithmStep extends Step {
  readonly implementation: AlgorithmImplementation;
  readonly parameters: AlgorithmParameters;

  constructor(config: AlgorithmStepConfig) {
    super(config);
    this.implementation = config.implementation;
    this.parameters = config.parameters || {};
  }

  async execute(context: StepContext): Promise<StepResult> {
    try {
      // Extract required inputs
      const algorithmInput = this.extractInputs(context);
      
      // Validate inputs
      const inputValidation = this.validateInputs(algorithmInput);
      if (!inputValidation.valid) {
        return {
          success: false,
          data: algorithmInput,
          metadata: {
            completedAt: new Date(),
            duration: this.calculateDuration(context.startTime)
          },
          errors: inputValidation.errors
        };
      }

      // Execute algorithm
      const result = await this.executeAlgorithm(algorithmInput);
      
      // Validate outputs
      const outputValidation = this.validateOutputs(result);
      if (!outputValidation.valid) {
        return {
          success: false,
          data: result,
          metadata: {
            completedAt: new Date(),
            duration: this.calculateDuration(context.startTime),
            requiresManualReview: true
          },
          errors: outputValidation.errors
        };
      }

      return {
        success: true,
        data: result,
        metadata: {
          algorithmVersion: this.implementation.version,
          executionTime: this.calculateDuration(context.startTime),
          completedAt: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        data: null,
        metadata: {
          completedAt: new Date(),
          duration: this.calculateDuration(context.startTime),
          requiresManualIntervention: true,
          error: error instanceof Error ? error.message : String(error)
        },
        errors: [{
          code: 'ALGORITHM_ERROR',
          message: error instanceof Error ? error.message : String(error),
          severity: 'error'
        }]
      };
    }
  }

  // =============================================================================
  // Algorithm-specific Methods
  // =============================================================================

  /**
   * Extract algorithm inputs from context
   */
  protected extractInputs(context: StepContext): AlgorithmInput {
    // TODO: Implement based on step configuration
    // For now, return basic context data
    return {
      stepContext: context.inputData,
      parameters: this.parameters
    };
  }

  /**
   * Execute the algorithm (override in generated classes)
   */
  protected async executeAlgorithm(input: AlgorithmInput): Promise<AlgorithmOutput> {
    // Default implementation - override in generated step classes
    throw new Error('Algorithm implementation required');
  }

  /**
   * Validate algorithm inputs
   */
  protected validateInputs(input: AlgorithmInput): ValidationResult {
    // Basic validation - override for specific requirements
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * Validate algorithm outputs
   */
  protected validateOutputs(output: AlgorithmOutput): ValidationResult {
    // Basic validation - override for specific requirements
    return {
      valid: true,
      errors: []
    };
  }
}