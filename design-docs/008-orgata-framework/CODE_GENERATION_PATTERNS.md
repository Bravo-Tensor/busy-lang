# Code Generation Patterns for Orgata Framework

**Created**: July 2025  
**Status**: Implementation Specification  
**Scope**: Templates and patterns for generating TypeScript framework code from BUSY files

## Overview

This document defines the specific patterns and templates used to transform BUSY file definitions into clean, readable TypeScript code that leverages the Orgata Framework APIs.

## Generation Pipeline

```
BUSY AST → Content Analysis → Template Selection → Code Generation → Post-Processing
```

### Content Analysis Phase

The compiler analyzes BUSY descriptions to extract semantic information for code generation:

```typescript
interface ContentAnalysis {
  stepType: 'human' | 'agent' | 'algorithm';
  dataRequirements: DataRequirement[];
  uiComponents: UIComponentHint[];
  businessLogic: BusinessLogicHint[];
  validationRules: ValidationRule[];
  complexity: 'simple' | 'moderate' | 'complex';
}

class ContentAnalyzer {
  analyzeStepDescription(description: string): ContentAnalysis {
    // Use LLM or rule-based system to extract:
    // - Required input fields from description
    // - Suggested UI components
    // - Business rules and validation
    // - Complexity indicators
  }
}
```

## Process Generation Templates

### Main Process Class Template

```handlebars
{{>file-header}}
import { Process, ProcessConfig, ProcessContext, ProcessResult } from '@orgata/framework';
{{#each stepImports}}
import { {{className}} } from './steps/{{fileName}}';
{{/each}}

/**
 * {{description}}
 * 
 * Generated from: {{busyFilePath}}
 * Layer: {{layer}}
 * Estimated Duration: {{estimatedDuration}}
 */
export class {{className}}Process extends Process {
  constructor() {
    super({
      name: "{{name}}",
      layer: "{{layer}}",
      estimatedDuration: "{{estimatedDuration}}",
      description: "{{description}}",
      metadata: {
        generatedFrom: "{{busyFilePath}}",
        generatedAt: "{{generatedAt}}",
        busyVersion: "{{busyVersion}}"
      }
    });
    
    // Steps defined in BUSY file
    {{#each steps}}
    this.addStep(new {{className}}());
    {{/each}}
  }
  
  async execute(context: ProcessContext): Promise<ProcessResult> {
    // Framework handles step-by-step execution
    return await this.executeSteps(context);
  }
  
  {{#if hasCustomLogic}}
  // Custom business logic methods (modify as needed)
  {{#each customMethods}}
  {{>custom-method}}
  {{/each}}
  {{/if}}
}
```

## Step Generation Templates

### HumanStep Template

```handlebars
{{>file-header}}
import { HumanStep, HumanStepConfig, StepContext, StepResult, FieldType } from '@orgata/framework';

/**
 * {{description}}
 * 
 * {{#if generatedFields}}
 * Generated fields based on description analysis:
 * {{#each generatedFields}}
 * - {{name}}: {{description}}
 * {{/each}}
 * {{/if}}
 */
export class {{className}}Step extends HumanStep {
  constructor() {
    super({
      id: '{{id}}',
      name: '{{name}}',
      description: '{{description}}',
      model: {
        fields: [
          {{#each fields}}
          {
            id: '{{id}}',
            name: '{{name}}',
            type: FieldType.{{type}},
            label: '{{label}}',
            placeholder: '{{placeholder}}',
            helpText: '{{helpText}}',
            required: {{required}},
            {{#if validation}}
            validation: [
              {{#each validation}}
              { type: '{{type}}', {{#if value}}value: {{value}}, {{/if}}message: '{{message}}' }{{#unless @last}},{{/unless}}
              {{/each}}
            ],
            {{/if}}
            {{#if options}}
            options: [
              {{#each options}}
              { value: '{{value}}', label: '{{label}}' }{{#unless @last}},{{/unless}}
              {{/each}}
            ],
            {{/if}}
            {{#if defaultValue}}
            defaultValue: {{jsonValue defaultValue}},
            {{/if}}
            {{#if conditionalLogic}}
            conditionalLogic: {{jsonValue conditionalLogic}},
            {{/if}}
          }{{#unless @last}},{{/unless}}
          {{/each}}
        ],
        layout: {
          type: '{{layout.type}}',
          columns: {{layout.columns}},
          sections: {{jsonValue layout.sections}}
        },
        validation: {
          strategy: '{{validation.strategy}}',
          showErrorsOn: '{{validation.showErrorsOn}}'
        }
      },
      view: {
        component: '{{view.component}}',
        styling: {{jsonValue view.styling}},
        behavior: {{jsonValue view.behavior}}
      }
    });
  }
  
  async execute(context: StepContext): Promise<StepResult> {
    // Framework handles UI rendering and data collection
    const userInput = await this.collectUserInput(context);
    
    {{#if hasValidation}}
    // Custom validation (modify as needed)
    const validationResult = this.validateInput(userInput);
    if (!validationResult.valid) {
      return {
        success: false,
        errors: validationResult.errors,
        data: userInput
      };
    }
    {{/if}}
    
    {{#if hasBusinessLogic}}
    // Custom business logic (implement as needed)
    const processedData = await this.processBusinessLogic(userInput, context);
    {{else}}
    const processedData = userInput;
    {{/if}}
    
    return {
      success: true,
      data: processedData,
      metadata: {
        completedAt: new Date(),
        userAgent: context.userAgent,
        duration: this.calculateDuration(context.startTime)
      }{{#if hasNextStep}},
      nextStepId: this.determineNextStep(processedData){{/if}}
    };
  }
  
  {{#if hasValidation}}
  private validateInput(input: any): ValidationResult {
    // TODO: Implement custom validation logic
    return { valid: true, errors: [] };
  }
  {{/if}}
  
  {{#if hasBusinessLogic}}
  private async processBusinessLogic(input: any, context: StepContext): Promise<any> {
    // TODO: Implement business logic based on BUSY description:
    // {{description}}
    return input;
  }
  {{/if}}
  
  {{#if hasNextStep}}
  private determineNextStep(data: any): string | undefined {
    // TODO: Implement conditional flow logic
    return undefined;
  }
  {{/if}}
}
```

### AgentStep Template

```handlebars
{{>file-header}}
import { AgentStep, AgentStepConfig, StepContext, StepResult } from '@orgata/framework';

/**
 * {{description}}
 * 
 * AI Agent Task: {{agentTask}}
 * Expected Output: {{expectedOutput}}
 */
export class {{className}}Step extends AgentStep {
  constructor() {
    super({
      id: '{{id}}',
      name: '{{name}}',
      description: '{{description}}',
      prompt: {
        systemPrompt: `{{systemPrompt}}`,
        userPrompt: `{{userPrompt}}`,
        context: {
          businessDomain: '{{businessDomain}}',
          expectedFormat: '{{expectedFormat}}',
          qualityCriteria: {{jsonValue qualityCriteria}}
        },
        constraints: {
          maxTokens: {{maxTokens}},
          temperature: {{temperature}},
          requireStructuredOutput: {{requireStructuredOutput}}
        }
      },
      context: {
        availableData: {{jsonValue availableData}},
        requiredOutputs: {{jsonValue requiredOutputs}},
        businessRules: {{jsonValue businessRules}}
      }
    });
  }
  
  async execute(context: StepContext): Promise<StepResult> {
    // Build prompt with current context
    const enrichedPrompt = await this.buildContextualPrompt(context);
    
    // Execute AI agent
    const agentResponse = await this.executeAgent(enrichedPrompt, this.context);
    
    // Validate and process response
    const validationResult = this.validateAgentOutput(agentResponse);
    if (!validationResult.valid) {
      return {
        success: false,
        errors: validationResult.errors,
        data: agentResponse,
        metadata: {
          requiresHumanReview: true,
          confidence: agentResponse.confidence
        }
      };
    }
    
    {{#if hasPostProcessing}}
    // Post-process agent output (modify as needed)
    const processedData = await this.postProcessOutput(agentResponse, context);
    {{else}}
    const processedData = agentResponse.structuredData || agentResponse.content;
    {{/if}}
    
    return {
      success: true,
      data: processedData,
      metadata: {
        agentConfidence: agentResponse.confidence,
        reasoning: agentResponse.reasoning,
        completedAt: new Date(),
        requiresReview: agentResponse.confidence < 0.8
      }
    };
  }
  
  private async buildContextualPrompt(context: StepContext): string {
    // Build prompt with available context data
    const contextData = this.extractRelevantContext(context);
    
    return this.prompt.userPrompt
      .replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        return contextData[key] || match;
      });
  }
  
  private extractRelevantContext(context: StepContext): Record<string, any> {
    // TODO: Extract relevant data from previous steps
    // Based on BUSY description: {{description}}
    
    return {
      {{#each contextMappings}}
      {{key}}: context.previousStepResults.get('{{sourceStep}}')?.data?.{{sourceField}} || 'Not available',
      {{/each}}
      processContext: context.businessContext
    };
  }
  
  {{#if hasPostProcessing}}
  private async postProcessOutput(response: AgentResponse, context: StepContext): Promise<any> {
    // TODO: Implement post-processing logic
    return response.structuredData;
  }
  {{/if}}
}
```

### AlgorithmStep Template

```handlebars
{{>file-header}}
import { AlgorithmStep, AlgorithmStepConfig, StepContext, StepResult } from '@orgata/framework';

/**
 * {{description}}
 * 
 * Algorithm: {{algorithmType}}
 * Inputs: {{inputs}}
 * Outputs: {{outputs}}
 */
export class {{className}}Step extends AlgorithmStep {
  constructor() {
    super({
      id: '{{id}}',
      name: '{{name}}',
      description: '{{description}}',
      parameters: {
        {{#each parameters}}
        {{name}}: {{jsonValue value}},
        {{/each}}
      },
      implementation: {
        type: '{{implementationType}}',
        config: {{jsonValue implementationConfig}}
      }
    });
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
          errors: inputValidation.errors,
          data: algorithmInput
        };
      }
      
      // Execute algorithm
      const result = await this.executeAlgorithm(algorithmInput);
      
      // Validate outputs
      const outputValidation = this.validateOutputs(result);
      if (!outputValidation.valid) {
        return {
          success: false,
          errors: outputValidation.errors,
          data: result,
          metadata: { requiresManualReview: true }
        };
      }
      
      return {
        success: true,
        data: result,
        metadata: {
          algorithmVersion: '{{algorithmVersion}}',
          executionTime: this.getExecutionTime(),
          completedAt: new Date()
        }
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [{ message: error.message, code: 'ALGORITHM_ERROR' }],
        data: null,
        metadata: { 
          requiresManualIntervention: true,
          error: error.toString()
        }
      };
    }
  }
  
  private extractInputs(context: StepContext): AlgorithmInput {
    // TODO: Extract algorithm inputs from context
    // Based on BUSY description: {{description}}
    
    return {
      {{#each inputMappings}}
      {{name}}: context.previousStepResults.get('{{sourceStep}}')?.data?.{{sourceField}},
      {{/each}}
      {{#each staticInputs}}
      {{name}}: {{jsonValue value}},
      {{/each}}
    };
  }
  
  private async executeAlgorithm(input: AlgorithmInput): Promise<AlgorithmOutput> {
    // TODO: Implement algorithm based on BUSY description:
    // {{description}}
    
    {{#if algorithmHints}}
    // Algorithm hints from description analysis:
    {{#each algorithmHints}}
    // - {{.}}
    {{/each}}
    {{/if}}
    
    throw new Error('Algorithm implementation required');
  }
  
  private validateInputs(input: AlgorithmInput): ValidationResult {
    const errors: ValidationError[] = [];
    
    {{#each requiredInputs}}
    if (!input.{{name}}) {
      errors.push({ field: '{{name}}', message: '{{name}} is required for {{../../name}}' });
    }
    {{/each}}
    
    {{#each inputValidations}}
    if (input.{{field}} && {{condition}}) {
      errors.push({ field: '{{field}}', message: '{{message}}' });
    }
    {{/each}}
    
    return { valid: errors.length === 0, errors };
  }
  
  private validateOutputs(output: AlgorithmOutput): ValidationResult {
    // TODO: Validate algorithm outputs
    return { valid: true, errors: [] };
  }
}
```

## Supporting File Templates

### Index File Template

```handlebars
{{>file-header}}
// Generated process exports
export { {{className}}Process } from './{{fileName}}Process';

// Generated step exports
{{#each steps}}
export { {{className}} } from './steps/{{fileName}}';
{{/each}}

// Generated types
export * from './types';

// Process metadata
export const PROCESS_METADATA = {
  name: '{{processName}}',
  version: '{{version}}',
  generatedAt: '{{generatedAt}}',
  busySource: '{{busyFilePath}}'
};
```

### Types File Template

```handlebars
{{>file-header}}
// Generated types for {{processName}}

{{#each customTypes}}
export interface {{name}} {
  {{#each properties}}
  {{name}}{{#unless required}}?{{/unless}}: {{type}};
  {{/each}}
}

{{/each}}

{{#each enums}}
export enum {{name}} {
  {{#each values}}
  {{key}} = '{{value}}'{{#unless @last}},{{/unless}}
  {{/each}}
}

{{/each}}

// Step data interfaces
{{#each steps}}
export interface {{className}}Data {
  {{#each dataFields}}
  {{name}}{{#unless required}}?{{/unless}}: {{type}};
  {{/each}}
}

{{/each}}
```

## Content Analysis Rules

### Field Extraction Rules

```typescript
const FIELD_EXTRACTION_RULES = [
  {
    pattern: /collect|gather|obtain.*?(email|contact)/i,
    generates: { type: 'email', name: 'contactEmail', required: true }
  },
  {
    pattern: /budget|cost|price|amount/i,
    generates: { type: 'currency', name: 'budget', required: true }
  },
  {
    pattern: /deadline|due date|timeline|completion date/i,
    generates: { type: 'date', name: 'deadline', required: false }
  },
  {
    pattern: /description|notes|comments|details/i,
    generates: { type: 'textarea', name: 'description', required: false }
  },
  {
    pattern: /phone|telephone|mobile/i,
    generates: { type: 'phone', name: 'phoneNumber', required: false }
  },
  {
    pattern: /website|url|link/i,
    generates: { type: 'url', name: 'website', required: false }
  }
];
```

### UI Component Hints

```typescript
const UI_COMPONENT_RULES = [
  {
    condition: 'fieldCount <= 3',
    suggests: 'single-column-form'
  },
  {
    condition: 'fieldCount > 6',
    suggests: 'multi-step-wizard'
  },
  {
    condition: 'hasFileUpload',
    suggests: 'drag-drop-form'
  },
  {
    condition: 'hasComplexData',
    suggests: 'tabbed-form'
  }
];
```

### Business Logic Extraction

```typescript
const BUSINESS_LOGIC_PATTERNS = [
  {
    pattern: /calculate|compute|determine/i,
    type: 'calculation',
    generates: 'algorithm_step'
  },
  {
    pattern: /analyze|evaluate|assess/i,
    type: 'analysis',
    generates: 'agent_step'
  },
  {
    pattern: /review|approve|validate/i,
    type: 'approval',
    generates: 'human_step'
  },
  {
    pattern: /generate|create|produce/i,
    type: 'generation',
    generates: 'agent_step'
  }
];
```

## Post-Processing

### Code Formatting

```typescript
class CodeFormatter {
  formatGeneratedCode(code: string): string {
    // Apply Prettier formatting
    // Add consistent imports
    // Organize code structure
    // Add helpful comments
  }
  
  addImports(code: string, dependencies: string[]): string {
    // Add necessary framework imports
    // Sort imports alphabetically
    // Remove unused imports
  }
  
  addDocumentation(code: string, metadata: GenerationMetadata): string {
    // Add JSDoc comments
    // Include generation metadata
    // Add TODO comments for implementation
  }
}
```

### Quality Validation

```typescript
class GeneratedCodeValidator {
  validateTypeScript(code: string): ValidationResult {
    // Check TypeScript compilation
    // Validate framework API usage
    // Ensure type safety
  }
  
  validateFrameworkUsage(code: string): ValidationResult {
    // Verify correct framework patterns
    // Check required method implementations
    // Validate configuration objects
  }
}
```

This comprehensive set of patterns and templates provides the foundation for generating clean, maintainable TypeScript code from BUSY file definitions while preserving the flexibility and intelligent override capabilities of the Orgata Framework.