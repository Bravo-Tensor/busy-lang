#!/usr/bin/env npx tsx

/**
 * Test script to demonstrate Orgata Framework code generation
 * 
 * This script takes a BUSY file and generates TypeScript framework code
 * using the new Orgata Framework approach instead of YAML output.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { BusyCompiler } from './compiler/src/index.js';

// Simple content analyzer for demo purposes
class SimpleContentAnalyzer {
  analyzeStepType(step: any): 'human' | 'agent' | 'algorithm' {
    // Use execution_type from BUSY file if available
    if (step.execution_type === 'human') return 'human';
    if (step.execution_type === 'algorithmic') return 'algorithm';
    
    // Infer from description patterns
    const description = step.description.toLowerCase();
    
    if (description.includes('assess') || description.includes('analyze') || description.includes('qualify')) {
      return step.execution_type === 'human' ? 'human' : 'agent';
    }
    
    if (description.includes('generate') || description.includes('process') || description.includes('send')) {
      return 'algorithm';
    }
    
    return step.execution_type === 'human' ? 'human' : 'algorithm';
  }
  
  extractFields(step: any): any[] {
    const fields: any[] = [];
    
    // Extract fields based on step type and description
    if (step.name === 'qualify_lead') {
      fields.push(
        { name: 'qualificationScore', type: 'NUMBER', label: 'Qualification Score (1-10)', required: true },
        { name: 'budgetMatch', type: 'CHECKBOX', label: 'Budget matches requirements', required: true },
        { name: 'timelineFeasible', type: 'CHECKBOX', label: 'Timeline is feasible', required: true },
        { name: 'styleAlignment', type: 'CHECKBOX', label: 'Style alignment confirmed', required: true },
        { name: 'nextAction', type: 'SELECT', label: 'Next Action', required: true, 
          options: [
            { value: 'send_portfolio', label: 'Send Portfolio & Pricing' },
            { value: 'schedule_consultation', label: 'Schedule Consultation' },
            { value: 'nurture', label: 'Add to Nurture Campaign' },
            { value: 'disqualify', label: 'Politely Decline' }
          ]
        },
        { name: 'notes', type: 'TEXTAREA', label: 'Qualification Notes', required: false }
      );
    }
    
    if (step.name === 'conduct_consultation') {
      fields.push(
        { name: 'eventType', type: 'SELECT', label: 'Event Type', required: true,
          options: [
            { value: 'wedding', label: 'Wedding' },
            { value: 'engagement', label: 'Engagement' },
            { value: 'portrait', label: 'Portrait Session' },
            { value: 'family', label: 'Family Photos' },
            { value: 'corporate', label: 'Corporate Event' }
          ]
        },
        { name: 'eventDate', type: 'DATE', label: 'Event Date', required: true },
        { name: 'budget', type: 'CURRENCY', label: 'Client Budget', required: true },
        { name: 'guestCount', type: 'NUMBER', label: 'Expected Guest Count', required: false },
        { name: 'venue', type: 'TEXT', label: 'Venue/Location', required: true },
        { name: 'consultationOutcome', type: 'SELECT', label: 'Consultation Outcome', required: true,
          options: [
            { value: 'booking_confirmed', label: 'Booking Confirmed' },
            { value: 'follow_up_needed', label: 'Follow-up Required' },
            { value: 'price_objection', label: 'Price Objection' },
            { value: 'not_a_fit', label: 'Not a Good Fit' }
          ]
        },
        { name: 'consultationNotes', type: 'TEXTAREA', label: 'Consultation Notes', required: false }
      );
    }
    
    return fields;
  }
}

// Simple template renderer
class SimpleTemplateRenderer {
  renderProcessClass(processName: string, steps: any[]): string {
    const className = this.toPascalCase(processName);
    
    return `/**
 * ${processName} Process
 * 
 * Generated from: inquiry-to-booking.busy
 * Layer: L0
 * 
 * 🔗 Design Source: design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 */

import { Process, ProcessConfig, ProcessContext, ProcessResult } from '@orgata/framework';
${steps.map(step => `import { ${this.toPascalCase(step.name)}Step } from './steps/${this.toKebabCase(step.name)}-step';`).join('\n')}

export class ${className}Process extends Process {
  constructor() {
    super({
      name: "${processName}",
      description: "End-to-end process from initial inquiry to confirmed booking",
      layer: "L0",
      estimatedDuration: "2-3 hours",
      metadata: {
        generatedFrom: "inquiry-to-booking.busy",
        generatedAt: "${new Date().toISOString()}",
        busyVersion: "1.0.0"
      }
    });
    
    // Add all steps in sequence
${steps.map(step => `    this.addStep(new ${this.toPascalCase(step.name)}Step());`).join('\n')}
  }
  
  async execute(context: ProcessContext): Promise<ProcessResult> {
    // Framework handles step-by-step execution with complete flexibility
    // Users can skip steps, go back, or provide manual data at any point
    return await this.executeSteps(context);
  }
}`;
  }
  
  renderHumanStep(step: any, fields: any[]): string {
    const className = this.toPascalCase(step.name);
    
    return `/**
 * ${step.name} - ${step.description}
 * 
 * Human interaction step with flexible UI and complete override capabilities.
 * 
 * 🔗 Design Source: design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md
 */

import { HumanStep, HumanStepConfig, StepContext, StepResult, FieldType } from '@orgata/framework';

export class ${className}Step extends HumanStep {
  constructor() {
    super({
      id: '${step.name}',
      name: '${step.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}',
      description: '${step.description}',
      type: 'human',
      model: {
        fields: [
${fields.map(field => this.renderField(field)).join(',\n')}
        ],
        layout: {
          type: 'single-column',
          columns: 1
        },
        validation: {
          strategy: 'on-blur',
          showErrorsOn: 'after-interaction'
        },
        metadata: {
          version: '1.0.0',
          generatedFrom: 'inquiry-to-booking.busy'
        }
      },
      view: {
        type: 'form',
        props: {
          allowFreeForm: true,  // Framework philosophy: never constrain
          showSkipOption: true,
          enableManualDataEntry: true
        },
        styling: {
          className: 'orgata-human-step-form'
        },
        behavior: {
          validation: {
            realTime: false,
            debounceMs: 500,
            showErrors: true
          }
        }
      }
    });
  }
  
  async execute(context: StepContext): Promise<StepResult> {
    // Framework handles UI rendering and data collection
    // Users can always skip this step or provide manual data
    return await super.execute(context);
  }
  
  // Override to add custom business logic if needed
  protected async processUserInput(input: any, context: StepContext): Promise<any> {
    // Add any custom processing for ${step.name}
    // TODO: Implement business logic based on: ${step.description}
    
    return input;
  }
}`;
  }
  
  renderAlgorithmStep(step: any): string {
    const className = this.toPascalCase(step.name);
    
    return `/**
 * ${step.name} - ${step.description}
 * 
 * Algorithm step with automated processing and manual override capability.
 * 
 * 🔗 Design Source: design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md
 */

import { AlgorithmStep, AlgorithmStepConfig, StepContext, StepResult, AlgorithmInput, AlgorithmOutput } from '@orgata/framework';

export class ${className}Step extends AlgorithmStep {
  constructor() {
    super({
      id: '${step.name}',
      name: '${step.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}',
      description: '${step.description}',
      type: 'algorithm',
      implementation: {
        type: '${step.algorithm || 'custom'}',
        version: '1.0.0',
        config: {
          // Algorithm configuration
          timeout: 30000,
          retryAttempts: 3
        }
      },
      parameters: {
        // Add algorithm parameters here
      }
    });
  }
  
  async execute(context: StepContext): Promise<StepResult> {
    // Framework provides complete flexibility - users can skip or provide manual data
    return await super.execute(context);
  }
  
  protected async executeAlgorithm(input: AlgorithmInput): Promise<AlgorithmOutput> {
    // TODO: Implement algorithm for: ${step.description}
    // 
    // Algorithm type: ${step.algorithm || 'custom'}
    // Estimated duration: ${step.estimated_duration || 'unknown'}
    //
    // Framework ensures users can always override this with manual data
    
    throw new Error('Algorithm implementation required for ${step.name}');
  }
  
  protected extractInputs(context: StepContext): AlgorithmInput {
    // Extract required inputs from previous steps
    return {
      // TODO: Map inputs based on step requirements
      stepContext: context.inputData,
      parameters: this.parameters
    };
  }
}`;
  }
  
  renderAgentStep(step: any): string {
    const className = this.toPascalCase(step.name);
    
    return `/**
 * ${step.name} - ${step.description}
 * 
 * AI Agent step with intelligent processing and human review capability.
 * 
 * 🔗 Design Source: design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md
 */

import { AgentStep, AgentStepConfig, StepContext, StepResult, AgentResponse } from '@orgata/framework';

export class ${className}Step extends AgentStep {
  constructor() {
    super({
      id: '${step.name}',
      name: '${step.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}',
      description: '${step.description}',
      type: 'agent',
      prompt: {
        systemPrompt: \`You are an expert assistant helping with ${step.description.toLowerCase()}. 
        Provide thorough analysis and actionable recommendations.\`,
        userPrompt: \`Please ${step.description.toLowerCase()} based on the provided context: {{context}}\`,
        context: {
          businessDomain: 'photography',
          expectedFormat: 'structured_data',
          qualityCriteria: ['accuracy', 'completeness', 'actionability']
        },
        constraints: {
          maxTokens: 1000,
          temperature: 0.3,
          requireStructuredOutput: true
        }
      },
      context: {
        // Agent context configuration
      },
      constraints: {
        timeout: 30000,
        retryAttempts: 3,
        fallbackToHuman: true  // Framework philosophy: always provide escape hatch
      }
    });
  }
  
  async execute(context: StepContext): Promise<StepResult> {
    // Framework provides flexibility - users can skip or override AI results
    return await super.execute(context);
  }
  
  protected async buildContextualPrompt(context: StepContext): Promise<string> {
    // Build prompt with relevant context from previous steps
    const contextData = this.extractRelevantContext(context);
    
    return this.prompt.userPrompt.replace(/\\{\\{([^}]+)\\}\\}/g, (match, key) => {
      return contextData[key] || match;
    });
  }
  
  protected extractRelevantContext(context: StepContext): Record<string, any> {
    // TODO: Extract relevant data for ${step.description}
    return {
      context: JSON.stringify(context.inputData),
      businessContext: context.businessContext
    };
  }
}`;
  }
  
  private renderField(field: any): string {
    const options = field.options ? `\n            options: [\n${field.options.map((opt: any) => `              { value: '${opt.value}', label: '${opt.label}' }`).join(',\n')}\n            ],` : '';
    
    return `          {
            id: '${field.name}',
            name: '${field.name}',
            type: FieldType.${field.type},
            label: '${field.label}',
            required: ${field.required},${options}
            validation: []
          }`;
  }
  
  private toPascalCase(str: string): string {
    return str.replace(/(^|[_-])([a-z])/g, (match, sep, letter) => letter.toUpperCase());
  }
  
  private toKebabCase(str: string): string {
    return str.replace(/_/g, '-').toLowerCase();
  }
}

async function generateFrameworkCode() {
  console.log('🚀 Testing Orgata Framework Code Generation\n');
  
  try {
    // Step 1: Parse BUSY file with existing compiler
    console.log('📖 Parsing BUSY file...');
    const compiler = new BusyCompiler();
    const busyFilePath = './examples/solo-photography-business/L0/client-operations/playbooks/inquiry-to-booking.busy';
    
    const result = await compiler.compile(busyFilePath);
    const busyFile = result.buildResult.busyFiles[0];
    
    if (!busyFile) {
      throw new Error('Failed to parse BUSY file');
    }
    
    console.log(`✅ Parsed: ${busyFile.ast.playbook.name}\n`);
    
    // Step 2: Analyze content for framework generation
    console.log('🔍 Analyzing content for framework generation...');
    const analyzer = new SimpleContentAnalyzer();
    const renderer = new SimpleTemplateRenderer();
    
    const steps = busyFile.ast.playbook.steps.map((step: any) => ({
      ...step,
      stepType: analyzer.analyzeStepType(step),
      fields: analyzer.extractFields(step)
    }));
    
    console.log('Steps analyzed:');
    steps.forEach((step: any) => {
      console.log(`  - ${step.name}: ${step.stepType} step`);
    });
    console.log('');
    
    // Step 3: Generate TypeScript framework code
    console.log('⚡ Generating TypeScript framework code...\n');
    
    const outputDir = './generated-framework-code';
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(path.join(outputDir, 'steps'), { recursive: true });
    
    // Generate main process class
    const processCode = renderer.renderProcessClass(
      busyFile.ast.playbook.name,
      steps
    );
    await fs.writeFile(
      path.join(outputDir, 'inquiry-to-booking-process.ts'),
      processCode
    );
    console.log('✅ Generated: inquiry-to-booking-process.ts');
    
    // Generate step files
    for (const step of steps) {
      let stepCode: string;
      
      switch (step.stepType) {
        case 'human':
          stepCode = renderer.renderHumanStep(step, step.fields);
          break;
        case 'algorithm':
          stepCode = renderer.renderAlgorithmStep(step);
          break;
        case 'agent':
          stepCode = renderer.renderAgentStep(step);
          break;
        default:
          continue;
      }
      
      const fileName = `${step.name.replace(/_/g, '-')}-step.ts`;
      await fs.writeFile(path.join(outputDir, 'steps', fileName), stepCode);
      console.log(`✅ Generated: steps/${fileName}`);
    }
    
    // Generate index file
    const indexCode = `/**
 * Inquiry to Booking Process - Generated Framework Code
 * 
 * 🔗 Design Source: design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 */

export { InquiryToBookingProcess } from './inquiry-to-booking-process';
export * from './steps/acknowledge-inquiry-step';
export * from './steps/qualify-lead-step';
export * from './steps/send-portfolio-and-pricing-step';
export * from './steps/schedule-consultation-step';
export * from './steps/conduct-consultation-step';
export * from './steps/process-booking-step';

// Process metadata
export const PROCESS_METADATA = {
  name: 'inquiry-to-booking',
  version: '1.0.0',
  generatedAt: '${new Date().toISOString()}',
  busySource: 'inquiry-to-booking.busy',
  framework: '@orgata/framework'
};`;
    
    await fs.writeFile(path.join(outputDir, 'index.ts'), indexCode);
    console.log('✅ Generated: index.ts');
    
    // Generate README
    const readmeCode = `# Inquiry to Booking Process

Generated TypeScript framework code from \`inquiry-to-booking.busy\`.

## Overview

This process implements the complete customer journey from initial inquiry to confirmed booking using the Orgata Framework.

## Framework Features Demonstrated

- **Complete Flexibility**: Users can skip any step or provide manual data
- **Immutable State**: All changes tracked with event sourcing
- **Intelligent UI**: Generated forms with field validation
- **AI Integration**: Agent steps for intelligent processing
- **Algorithm Steps**: Automated processing with manual override

## Usage

\`\`\`typescript
import { InquiryToBookingProcess } from './';
import { ProcessContext } from '@orgata/framework';

const process = new InquiryToBookingProcess();

const context: ProcessContext = {
  processId: 'inquiry-001',
  userId: 'photographer-1',
  sessionId: 'session-123',
  environment: 'production',
  businessContext: {
    industry: 'photography',
    businessSize: 'solo',
    organizationId: 'solo-photo-biz'
  },
  permissions: {
    canSkipSteps: true,
    canOverrideValidation: true,
    canModifyProcess: false,
    canViewAuditTrail: true
  }
};

const result = await process.execute(context);
\`\`\`

## Generated Files

- \`inquiry-to-booking-process.ts\` - Main process class
- \`steps/\` - Individual step implementations
- \`index.ts\` - Module exports

## Framework Philosophy

This code follows the Orgata Framework principle of **"Facilitate, Never Constrain"**:

- Users can skip any step and provide manual data
- Complete audit trail of all actions
- Flexible UI that adapts to user needs
- AI assistance with human oversight
- Never rewrite history - only forward progression

Generated on: ${new Date().toISOString()}
`;
    
    await fs.writeFile(path.join(outputDir, 'README.md'), readmeCode);
    console.log('✅ Generated: README.md');
    
    console.log('\n🎉 Framework code generation complete!');
    console.log(`📁 Output directory: ${outputDir}`);
    console.log('\n📋 Summary:');
    console.log(`   • 1 Process class`);
    console.log(`   • ${steps.length} Step classes`);
    console.log(`   • ${steps.filter((s: any) => s.stepType === 'human').length} Human steps (with generated UI)`);
    console.log(`   • ${steps.filter((s: any) => s.stepType === 'algorithm').length} Algorithm steps`);
    console.log(`   • ${steps.filter((s: any) => s.stepType === 'agent').length} Agent steps`);
    console.log('\n🔧 Next steps:');
    console.log('   1. Review generated TypeScript code');
    console.log('   2. Implement TODO items in algorithm/agent steps');
    console.log('   3. Test with Orgata Framework runtime');
    console.log('   4. Customize UI components as needed');
    
  } catch (error) {
    console.error('❌ Error generating framework code:', error);
    process.exit(1);
  }
}

// Run the test
generateFrameworkCode();