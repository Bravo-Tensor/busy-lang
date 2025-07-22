# Orgata Framework Implementation Plan

**Created**: July 2025  
**Status**: Ready for Implementation  
**Timeline**: 6-8 weeks  
**Dependencies**: Can replace existing generated code completely

## Overview

Comprehensive plan to transform the Orgata system from YAML generation to a React-like framework architecture. Since we can replace existing code completely, this allows for optimal implementation without migration concerns.

## Implementation Phases

### Phase 1: Framework Foundation (2 weeks)

#### Week 1: Core Framework Package
**Goal**: Create `@orgata/framework` with base classes and process lifecycle management

**Deliverables**:
1. **Framework Package Structure**
   ```
   packages/orgata-framework/
   ├── src/
   │   ├── core/
   │   │   ├── Process.ts           # Base Process class
   │   │   ├── Step.ts              # Base Step class  
   │   │   ├── HumanStep.ts         # UI-based steps
   │   │   ├── AgentStep.ts         # AI-powered steps
   │   │   └── AlgorithmStep.ts     # Code-based steps
   │   ├── state/
   │   │   ├── ProcessState.ts      # Immutable state management
   │   │   ├── ProcessEvent.ts      # Event sourcing
   │   │   └── AuditTrail.ts        # Complete audit logging
   │   ├── execution/
   │   │   ├── ProcessRunner.ts     # Process execution engine
   │   │   ├── StepExecutor.ts      # Individual step execution
   │   │   └── FlexibilityAgent.ts  # AI-powered overrides
   │   └── types/
   │       └── index.ts             # All TypeScript types
   ├── package.json
   └── README.md
   ```

2. **Core Classes Implementation**
   ```typescript
   // Base classes with essential functionality
   abstract class Process extends EventEmitter
   abstract class Step
   class HumanStep extends Step  
   class AgentStep extends Step
   class AlgorithmStep extends Step
   ```

3. **State Management System**
   ```typescript
   // Immutable event-sourced state
   class ProcessState
   class ProcessEvent
   class AuditTrail
   ```

**Tasks**:
- [ ] Set up monorepo structure with framework package
- [ ] Implement base Process and Step classes
- [ ] Create immutable state management with event sourcing
- [ ] Build process execution engine
- [ ] Add comprehensive TypeScript types
- [ ] Write unit tests for core functionality

#### Week 2: Process Lifecycle & UI Integration
**Goal**: Complete process execution engine and basic UI rendering

**Deliverables**:
1. **Process Execution Engine**
   - Step-by-step execution with pause/resume
   - Skip step functionality with manual data provision
   - Go back functionality with history replay
   - Exception handling and audit trail

2. **Basic UI Framework Integration**
   - HumanStep UI rendering system
   - Form generation from step models
   - Basic validation and data collection

3. **Testing Infrastructure**
   - Unit tests for all core classes
   - Integration tests for process execution
   - Mock implementations for testing

**Tasks**:
- [ ] Complete ProcessRunner with step navigation
- [ ] Implement skip/go-back functionality
- [ ] Build HumanStep UI rendering system
- [ ] Create comprehensive test suite
- [ ] Add developer documentation

### Phase 2: Enhanced Compiler (2 weeks)

#### Week 3: BUSY Compiler Modifications
**Goal**: Modify BUSY compiler to generate TypeScript framework code instead of YAML

**Deliverables**:
1. **New Code Generation Pipeline**
   ```
   BUSY AST → Framework Code Templates → TypeScript Output
   ```

2. **Content Analysis System**
   - Parse verbose BUSY step descriptions
   - Generate appropriate step implementations
   - Create UI models for HumanSteps
   - Generate AI prompts for AgentSteps
   - Create algorithm stubs for AlgorithmSteps

3. **Code Generation Templates**
   - Process class templates
   - Step class templates for each type
   - UI component generation
   - Type-safe interfaces

**Tasks**:
- [ ] Modify BUSY compiler output pipeline
- [ ] Create framework code generation templates  
- [ ] Implement content analysis for step descriptions
- [ ] Build type-safe code generation
- [ ] Add source mapping for debugging

#### Week 4: Code Generation Refinement
**Goal**: Polish code generation and add intelligent content creation

**Deliverables**:
1. **Intelligent Content Generation**
   - Analyze BUSY descriptions to generate realistic form fields
   - Create appropriate AI prompts from step descriptions
   - Generate algorithm stubs with proper interfaces

2. **Enhanced Templates**
   - Responsive UI components for HumanSteps
   - Context-aware AI prompts for AgentSteps
   - Type-safe algorithm implementations

3. **Developer Experience**
   - Generated code is readable and well-commented
   - Clear separation between generated and custom code
   - Easy customization points

**Tasks**:
- [ ] Enhance content analysis algorithms
- [ ] Create sophisticated UI generation templates
- [ ] Implement AI prompt generation from descriptions
- [ ] Add code quality improvements
- [ ] Build comprehensive examples

### Phase 3: Flexibility & Override System (1.5 weeks)

#### Week 5: AI-Powered Flexibility
**Goal**: Implement conversational override system and flexible UI generation

**Deliverables**:
1. **FlexibilityAgent Implementation**
   - Natural language override request processing
   - Dynamic UI generation for complex data
   - Intelligent validation override suggestions
   - Context-aware alternative generation

2. **Exception Management System**
   - Complete exception tracking and categorization
   - Audit trail for all deviations
   - Pattern analysis for process improvements

3. **Dynamic UI System**
   - Generate alternative UIs on demand
   - JSON editor fallback for complex data
   - Agent-assisted data entry modes

**Tasks**:
- [ ] Implement FlexibilityAgent with LLM integration
- [ ] Build dynamic UI generation system
- [ ] Create exception tracking and analysis
- [ ] Add conversational override capabilities
- [ ] Build comprehensive audit trail system

#### Week 6 (First Half): Integration & Testing
**Goal**: Integrate all components and comprehensive testing

**Deliverables**:
1. **Complete Integration**
   - Framework + Compiler + Flexibility System
   - End-to-end process execution
   - Full override and exception handling

2. **Testing Suite**
   - Unit tests for all components
   - Integration tests for complete workflows
   - Performance testing for large processes

**Tasks**:
- [ ] Complete end-to-end integration
- [ ] Build comprehensive test suite
- [ ] Performance optimization
- [ ] Bug fixes and stability improvements

### Phase 4: IDE Integration & Knit Enhancement (2 weeks)

#### Week 6 (Second Half) - Week 7: IDE Transformation
**Goal**: Transform Orgata IDE to work with new framework architecture

**Deliverables**:
1. **Replace Existing Generation System**
   - Remove old YAML-based `BusyGeneratorService`
   - Integrate new framework-based compiler
   - Update all API endpoints

2. **Enhanced Process Visualization**
   - Visual process editor for BUSY files
   - Real-time process execution viewing
   - Exception and audit trail visualization

3. **Agent Integration**
   - Chat interface for process override requests
   - Framework-aware agent tools
   - Real-time process modification capabilities

**Tasks**:
- [ ] Replace existing generation services
- [ ] Update IDE API endpoints
- [ ] Build visual process editor
- [ ] Integrate flexibility agent into IDE
- [ ] Add process execution visualization

#### Week 8: Knit Integration & Bidirectional Sync
**Goal**: Enhance knit for framework code synchronization

**Deliverables**:
1. **Framework-Aware Knit**
   - Understand generated framework code patterns
   - Track custom implementations vs. generated stubs
   - Intelligent merge strategies for code changes

2. **Bidirectional Synchronization**
   - BUSY changes → Framework code regeneration
   - Code changes → BUSY file updates (where appropriate)
   - Conflict resolution for incompatible changes

3. **Developer Workflow**
   - Seamless editing of both BUSY files and generated code
   - Automatic reconciliation of changes
   - Clear separation of concerns

**Tasks**:
- [ ] Enhance knit for framework code understanding
- [ ] Implement bidirectional sync logic
- [ ] Build conflict resolution system
- [ ] Create developer workflow documentation
- [ ] End-to-end testing of complete system

## Technical Specifications

### Framework Package Dependencies
```json
{
  "dependencies": {
    "@types/node": "^20.0.0",
    "eventemitter3": "^5.0.0",
    "zod": "^3.22.0",           // Runtime validation
    "immer": "^10.0.0"          // Immutable state updates
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "tsup": "^8.0.0"
  }
}
```

### Code Generation Templates
```typescript
// Process template
export class {{ProcessName}}Process extends Process {
  constructor() {
    super({{processConfig}});
    {{#steps}}
    this.addStep(new {{stepClassName}}());
    {{/steps}}
  }
}

// HumanStep template  
class {{StepName}}Step extends HumanStep {
  constructor() {
    super({
      model: {{generatedModel}},
      view: {{generatedView}}
    });
  }
}
```

### Directory Structure Post-Implementation
```
busy-lang/
├── packages/
│   ├── orgata-framework/           # New framework package
│   ├── busy-compiler/              # Modified compiler
│   └── orgata-ide/                 # Updated IDE
├── examples/
│   ├── generated-processes/        # Example generated code
│   └── business-definitions/       # Example BUSY files
└── design-docs/
    └── 008-orgata-framework/       # This design
```

## Success Criteria

### Technical Success
- [ ] BUSY files compile to readable, type-safe TypeScript
- [ ] Generated code can be customized without breaking regeneration
- [ ] Complete audit trail of all process executions and exceptions
- [ ] Flexible override system works conversationally
- [ ] Bidirectional sync maintains consistency

### User Experience Success
- [ ] Business users can run processes without coding knowledge
- [ ] Developers can customize generated code with full IDE support
- [ ] Users never feel trapped by rigid workflows
- [ ] Exception handling provides clear improvement insights
- [ ] Process modification feels natural and intuitive

### Business Value Success
- [ ] Faster business process development and iteration
- [ ] Clear audit trail for compliance and improvement
- [ ] Learning system that makes processes better over time
- [ ] Framework that scales from simple to complex organizations
- [ ] Reduced maintenance burden compared to YAML generation

## Risk Mitigation

### Technical Risks
- **Complexity of bidirectional sync**: Start with forward sync only, add reverse sync incrementally
- **Framework lock-in concerns**: Generate standard TypeScript, provide clear escape hatches
- **Performance with complex processes**: Build performance testing from day one

### User Experience Risks  
- **Learning curve for developers**: Comprehensive documentation and examples
- **Business user confusion**: Start with simple visual interfaces
- **Override system abuse**: Clear audit trail and consequence analysis

### Timeline Risks
- **Scope creep**: Clear phase boundaries, ship MVP first
- **Integration complexity**: Build integration tests early
- **Polish time**: Plan for 20% buffer in each phase

## Next Actions

1. **Immediate** (This Week):
   - Set up monorepo structure
   - Create framework package scaffold
   - Begin implementing base classes

2. **Week 1 Goals**:
   - Complete core framework classes
   - Basic process execution working
   - Initial test suite

3. **Weekly Reviews**:
   - Demo working functionality each Friday
   - Adjust timeline based on progress
   - Gather feedback on developer experience

This implementation plan provides a clear path from the current YAML generation system to a sophisticated, flexible framework that embodies the "facilitate, never constrain" philosophy.