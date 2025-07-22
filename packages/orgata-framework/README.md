# @orgata/framework

A React-like framework for business process development with complete flexibility and intelligent override capabilities.

## Philosophy: "Facilitate, Never Constrain"

The Orgata Framework is designed around the core principle that business tools should enhance productivity without creating bureaucratic barriers. Users can always skip steps, go back, provide manual data, or request AI assistance to bypass any constraint.

## Key Features

- **🔄 Immutable State Management**: Event-sourced state with complete audit trail
- **⏭️ Universal Flexibility**: Skip any step, go back, provide manual data
- **🤖 AI-Powered Overrides**: Conversational assistance to bypass constraints  
- **📝 Complete Audit Trail**: Track all decisions and exceptions for improvement
- **🎯 Three Step Types**: Human (UI), Agent (AI), Algorithm (Code)
- **🚫 Never Rewrite History**: Forward-only updates preserve complete record

## Quick Start

### Installation

```bash
npm install @orgata/framework
```

### Basic Usage

```typescript
import { Process, HumanStep, ProcessConfig } from '@orgata/framework';

// Create a simple process
class ClientOnboardingProcess extends Process {
  constructor() {
    super({
      name: "Client Onboarding",
      layer: "L0",
      estimatedDuration: "2 hours"
    });
    
    this.addStep(new ContactInfoStep());
    this.addStep(new NeedsAssessmentStep());
  }
  
  async execute(context) {
    return await this.executeSteps(context);
  }
}

// Create a human step with form UI
class ContactInfoStep extends HumanStep {
  constructor() {
    super({
      id: 'contact-info',
      name: 'Collect Contact Information',
      model: {
        fields: [
          {
            id: 'email',
            type: FieldType.EMAIL,
            label: 'Email Address',
            required: true
          },
          {
            id: 'phone',
            type: FieldType.PHONE,
            label: 'Phone Number',
            required: false
          }
        ]
      }
    });
  }
}
```

### Flexible Navigation

```typescript
const process = new ClientOnboardingProcess();

// Skip a step with manual data
await process.skipStep('contact-info', 'Already have contact info', {
  email: 'client@example.com',
  phone: '+1-555-0123'
});

// Go back to previous step
await process.goBack(1);

// Navigate to specific step
await process.goToStep('needs-assessment', 'Need to update requirements');
```

## Core Concepts

### Process Class

The base `Process` class provides:
- Step management and execution
- Flexible navigation (skip, go back, jump to step)
- Immutable state management
- Complete audit trail
- AI-powered override system

### Step Types

**HumanStep**: UI-based user interaction
- Automatic form generation from descriptions
- Flexible validation and override capabilities
- Alternative UI generation for complex requirements

**AgentStep**: AI-powered processing  
- Context-aware prompt generation
- Confidence scoring and human review triggers
- Structured output parsing and validation

**AlgorithmStep**: Code-based processing
- Type-safe input/output handling
- Error handling and recovery
- Performance monitoring

### State Management

The framework uses immutable state with event sourcing:
- All changes create new events (never modify history)
- Complete audit trail of all decisions
- Exception tracking for process improvement
- Forward-only updates preserve integrity

## Design Documentation

This framework is based on comprehensive design specifications:

- **[Architecture Overview](../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md)**: Core design philosophy and principles
- **[API Specification](../design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md)**: Complete TypeScript API reference  
- **[Implementation Plan](../design-docs/008-orgata-framework/IMPLEMENTATION_PLAN.md)**: Development roadmap and timeline
- **[Code Generation](../design-docs/008-orgata-framework/CODE_GENERATION_PATTERNS.md)**: Templates for generating framework code

## Development Status

Current status: **Phase 1 Implementation** (Core Framework)

✅ **Completed**:
- Core framework classes (Process, Step types)
- Immutable state management with event sourcing  
- TypeScript types and API structure
- Package setup and build configuration

🔄 **In Progress**:
- Process execution engine
- Flexibility and override system
- UI integration layer

📋 **Planned**:
- AI agent integration
- Code generation from BUSY files
- IDE integration and tooling

## Contributing

This framework is part of the larger BUSY Language project. See the [main repository](../../README.md) for contribution guidelines.

## License

MIT - See [LICENSE](../../LICENSE) for details.