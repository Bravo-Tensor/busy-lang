# Orgata Framework Architecture Design

**Created**: July 2025  
**Status**: Implementation Complete ✅  
**Scope**: Transform Orgata IDE from code generation to React-like framework architecture

## Overview

Transform the Orgata system from a YAML-string-generation approach to a true framework architecture where BUSY files compile to TypeScript code that leverages the Orgata Framework APIs. This creates a React-like developer experience for business processes.

## Core Design Philosophy

**"Facilitate, Never Constrain"** - The framework must provide helpful structure while maintaining complete user flexibility through AI-powered escape hatches and intelligent exception handling.

### Key Principles

1. **Never Rewrite History**: Always maintain complete audit trail of process execution
2. **Forward-Only Updates**: Go back to original step and move forward through subsequent steps
3. **Universal Skip Capability**: Allow skipping any step with manual data provision
4. **Exception Analysis**: Use AI to analyze consequences of non-standard processing
5. **Complete Audit Trail**: Track all deviations with clear reasoning and impact assessment

## Current State Analysis

### Problems with Current Approach

Looking at the existing `BusyGeneratorService`, the system is essentially a string manipulation engine:

```typescript
// Current problematic pattern
const processData = {
  metadata: { version: '1.0.0', created: new Date().toISOString() },
  process: { name: processName, steps: [...] }
};

return {
  id: this.generateId(),
  type: 'create', 
  filePath: `${basePath}/L0/processes/${processFileName}.busy`,
  changes: [{ operation: 'add', path: '/', newValue: yaml.stringify(processData) }]
};
```

This approach:
- ❌ Generates boilerplate YAML strings
- ❌ Provides no type safety or IDE support  
- ❌ Makes customization difficult
- ❌ Creates maintenance burden
- ❌ Limits extensibility

## Framework Architecture

### Core Framework Components

```typescript
// @orgata/framework - Core framework package

abstract class Process extends EventEmitter {
  constructor(config: ProcessConfig);
  abstract execute(context: ProcessContext): Promise<ProcessResult>;
  
  // Framework-provided functionality
  addStep(step: Step): void;
  setTimeline(duration: string): void;
  getCurrentStep(): Step;
  goToStep(stepId: string): void;
  skipStep(stepId: string, reason: string, manualData?: any): void;
}

abstract class Step {
  abstract execute(context: StepContext): Promise<StepResult>;
  
  // Framework handles: validation, logging, state management
  validate(input: any): ValidationResult;
  createAuditEntry(action: string, data: any): AuditEntry;
}

// Three specialized step types matching BUSY specification
class HumanStep extends Step {
  model: FormModel;           // Generated from BUSY description
  view: ComponentDefinition;  // UI components and validation
}

class AgentStep extends Step {
  prompt: AgentPrompt;        // Generated from BUSY description  
  context: AgentContext;      // AI context and constraints
}

class AlgorithmStep extends Step {
  implementation: Function;   // Generated code from BUSY description
}
```

### Process State Management

#### Immutable History with Forward-Only Updates

```typescript
class ProcessState {
  readonly history: ProcessEvent[];           // Immutable event log
  readonly currentStep: number;
  readonly stepData: Map<string, StepData>;   // Current state
  readonly exceptions: ProcessException[];    // All deviations tracked
  
  // Never modify history - always append new events
  updateStepData(stepId: string, data: any, reason: string): ProcessState {
    const event = new StepDataUpdateEvent(stepId, data, reason, new Date());
    return this.appendEvent(event);
  }
  
  // Go back by replaying history to that point, then continuing forward
  goBackToStep(stepId: string, reason: string): ProcessState {
    const replayPoint = this.findStepInHistory(stepId);
    const event = new StepNavigationEvent('back', stepId, reason, new Date());
    return this.replayToPoint(replayPoint).appendEvent(event);
  }
  
  // Skip step but allow manual data provision
  skipStep(stepId: string, reason: string, manualData?: any): ProcessState {
    const skipEvent = new StepSkipEvent(stepId, reason, manualData, new Date());
    return this.appendEvent(skipEvent);
  }
}
```

#### Exception Handling and Consequence Analysis

```typescript
class ProcessException {
  readonly id: string;
  readonly type: 'step_skip' | 'manual_data' | 'validation_override' | 'flow_modification';
  readonly stepId: string;
  readonly reason: string;
  readonly timestamp: Date;
  readonly userContext: UserContext;
  readonly impact: ExceptionImpact;        // Analyzed by AI
  readonly mitigation?: ExceptionMitigation;
}

class ExceptionAnalyzer {
  // Future phase - AI-powered consequence analysis
  async analyzeSkipConsequences(
    skippedStep: Step, 
    processDefinition: Process,
    currentState: ProcessState
  ): Promise<ConsequenceAnalysis> {
    return {
      missingData: string[];              // What data won't be available
      affectedSteps: string[];            // Which downstream steps might fail
      riskLevel: 'low' | 'medium' | 'high';
      suggestedMitigations: string[];     // How to minimize impact
      dataRequirements: DataRequirement[]; // What manual data could substitute
    };
  }
}
```

### Content Generation from BUSY Descriptions

The compiler analyzes verbose BUSY step descriptions to generate appropriate implementations:

```typescript
// BUSY file example:
/*
step:
  id: client-interview
  type: human
  description: |
    Conduct detailed interview with client to understand their business goals,
    current challenges, timeline constraints, and budget expectations. 
    Gather contact information for key stakeholders and decision makers.
    Document any special requirements or preferences.
*/

// Generated HumanStep:
class ClientInterviewStep extends HumanStep {
  constructor() {
    super({
      model: {
        fields: [
          { name: 'businessGoals', type: 'textarea', required: true },
          { name: 'currentChallenges', type: 'textarea', required: true },
          { name: 'timelineConstraints', type: 'date-range', required: false },
          { name: 'budgetExpectations', type: 'currency', required: true },
          { name: 'stakeholders', type: 'contact-list', required: true },
          { name: 'specialRequirements', type: 'textarea', required: false }
        ]
      },
      view: {
        layout: 'interview-form',
        validation: 'real-time',
        helpText: 'Generated from BUSY description'
      }
    });
  }
}
```

### Flexible Override System

#### Conversational Bypass Capabilities

```typescript
class FlexibilityAgent {
  // Handle user requests to bypass constraints
  async handleOverrideRequest(
    userMessage: string, 
    currentStep: Step, 
    processState: ProcessState
  ): Promise<OverrideStrategy> {
    
    // Examples:
    // "This form is too restrictive" → Generate flexible alternative UI
    // "Skip this, I already have the email" → Skip with manual data
    // "Go back and change the client name" → Navigate back and replay forward
    
    const intent = await this.analyzeIntent(userMessage);
    const strategy = await this.generateStrategy(intent, currentStep);
    
    return {
      type: strategy.type,
      implementation: strategy.implementation,
      auditReason: strategy.reasoning,
      consequenceAnalysis: await this.analyzeConsequences(strategy)
    };
  }
  
  // Generate alternative UIs when standard forms are too restrictive
  generateFlexibleUI(constraints: UIConstraints, userRequirements: string): ComponentDefinition {
    // Could generate:
    // - JSON editor for complex data
    // - Free-form text with AI parsing
    // - Multi-step wizard for complex processes
    // - Custom form with dynamic fields
  }
}
```

#### Skip with Manual Data Provision

```typescript
// User: "Skip the client interview step, I already have their email: john@example.com"
const skipResult = processState.skipStep('client-interview', 'Already have contact info', {
  contactEmail: 'john@example.com',
  source: 'manual_input',
  confidence: 'user_provided'
});

// System validates if this data is sufficient for downstream steps
const validation = await this.validateSkipData(skipResult.manualData, 'client-interview');
if (!validation.sufficient) {
  // Warn user about potential issues but still allow the skip
  this.notifyUser(`Warning: Skipping may cause issues in steps: ${validation.affectedSteps.join(', ')}`);
}
```

### Audit Trail and Exception Tracking

#### Comprehensive Event Logging

```typescript
class ProcessAuditTrail {
  readonly events: ProcessEvent[];
  
  // All actions create audit entries
  recordStepExecution(stepId: string, result: StepResult): void;
  recordStepSkip(stepId: string, reason: string, manualData?: any): void;
  recordDataOverride(stepId: string, field: string, oldValue: any, newValue: any, reason: string): void;
  recordValidationOverride(stepId: string, validationRule: string, reason: string): void;
  recordAgentIntervention(stepId: string, userRequest: string, agentAction: string): void;
  
  // Exception analysis and improvement opportunities
  generateExceptionReport(): ExceptionReport {
    return {
      totalExceptions: this.events.filter(e => e.type === 'exception').length,
      commonSkips: this.getMostSkippedSteps(),
      improvementOpportunities: this.identifyProcessImprovements(),
      userFrustrationPoints: this.identifyConstraintIssues()
    };
  }
}
```

## Compilation Pipeline

### New Compilation Flow

```
BUSY Files → AST Analysis → Framework Code Generation → TypeScript Output
```

Instead of generating YAML configuration files, generate executable TypeScript:

```typescript
// Generated from client-onboarding.busy
import { Process, HumanStep, AgentStep, AlgorithmStep } from '@orgata/framework';

export class ClientOnboardingProcess extends Process {
  constructor() {
    super({
      name: "Client Onboarding",
      layer: "L0", 
      estimatedDuration: "3 days"
    });
    
    // Steps generated from BUSY definitions
    this.addStep(new InitialContactStep());
    this.addStep(new NeedsAssessmentStep());
    this.addStep(new ProposalGenerationStep());
    this.addStep(new ContractFinalizationStep());
  }
}

// Generated HumanStep with rich UI from BUSY description
class NeedsAssessmentStep extends HumanStep {
  constructor() {
    super({
      // UI model generated from verbose BUSY description
      model: {/* detailed form model */},
      view: {/* responsive UI components */}
    });
  }
  
  async execute(context: StepContext): Promise<StepResult> {
    // Framework handles: UI rendering, validation, state management
    const userInput = await this.presentUI(context);
    
    // Custom business logic can be added here
    const enrichedData = await this.enrichClientData(userInput);
    
    return {
      data: enrichedData,
      nextStep: this.determineNextStep(enrichedData)
    };
  }
}
```

## Benefits and Implications

### Developer Experience
- ✅ **Type Safety**: Full TypeScript support with autocomplete and debugging
- ✅ **Readable Code**: Generated code is human-readable and modifiable
- ✅ **Framework Power**: Infrastructure concerns handled by framework
- ✅ **Flexibility**: Can override or extend any generated code

### Business User Experience  
- ✅ **Never Trapped**: Always able to bypass constraints through AI agent
- ✅ **Complete Control**: Can skip, go back, or modify any step
- ✅ **Intelligent Assistance**: AI analyzes consequences and suggests alternatives
- ✅ **Learning System**: Process improves based on exception patterns

### System Benefits
- ✅ **Maintainability**: Framework evolution benefits all processes
- ✅ **Auditability**: Complete trail of all decisions and exceptions
- ✅ **Scalability**: Framework patterns scale from simple to complex organizations
- ✅ **Extensibility**: Easy to add new step types and capabilities

## Next Steps

This document will be iteratively refined as we work through the detailed design questions around state management, AI integration, and the flexibility mechanisms.

Key areas to elaborate:
1. Detailed framework API specifications
2. Code generation templates and patterns  
3. AI agent integration points and capabilities
4. Exception analysis and learning algorithms
5. Bidirectional sync with knit integration