# BUSY Language Developer Onboarding Guide

Welcome to the BUSY Language project! This comprehensive guide will help you understand the project's vision, architecture, and key concepts. BUSY is a domain-specific language that transforms business organizations into executable code, enabling a new paradigm where business processes are defined, versioned, and executed as software.

## Table of Contents

1. [Project Vision](#project-vision)
2. [Core Concepts](#core-concepts)
3. [System Architecture](#system-architecture)
4. [The BUSY Language](#the-busy-language)
5. [The Orgata Framework](#the-orgata-framework)
6. [Development Workflow](#development-workflow)
7. [Getting Started](#getting-started)
8. [Key Design Decisions](#key-design-decisions)

## Project Vision

### What is BUSY?

BUSY (Business Understanding System YAML) is a domain-specific language that enables organizations to describe their operations as code. Instead of traditional documentation that becomes outdated, BUSY creates living specifications that compile into executable systems.

### Core Problem Being Solved

Traditional business operations suffer from:
- **Documentation Drift**: Written processes diverge from actual practice
- **Manual Coordination**: Human effort required for routine process execution
- **Knowledge Silos**: Critical information trapped in individual minds
- **Scaling Friction**: Growing teams struggle with consistent execution

BUSY addresses these by making business processes:
- **Executable**: Processes run as software, not just documentation
- **Versionable**: Changes tracked through git like any codebase
- **Testable**: Validate processes before deployment
- **Auditable**: Complete execution history and decision trails

### Target Users

- **Small to Medium Businesses**: Organizations looking to scale operations efficiently
- **Process-Heavy Organizations**: Companies with complex workflows needing automation
- **Digital Transformation Teams**: Groups modernizing traditional business operations

## Core Concepts

### Layer-First Architecture

BUSY organizes all business operations into three distinct layers, enforcing separation of concerns:

#### L0 - Operational Layer
- **Purpose**: Day-to-day business execution
- **Examples**: Customer service, order fulfillment, content creation
- **Characteristics**: 
  - High volume, repetitive tasks
  - Direct customer interaction
  - Real-time execution requirements
  - Focus on efficiency and consistency

#### L1 - Management Layer
- **Purpose**: Process optimization and resource coordination
- **Examples**: Quality assurance, resource allocation, performance monitoring
- **Characteristics**:
  - Cross-team coordination
  - Process improvement focus
  - Metrics and analytics driven
  - Balance efficiency with flexibility

#### L2 - Strategic Layer
- **Purpose**: Long-term planning and organizational design
- **Examples**: Business strategy, organizational structure, market positioning
- **Characteristics**:
  - Low frequency, high impact decisions
  - Cross-functional perspective
  - Future-oriented planning
  - Focus on competitive advantage

### Human-Computer Collaboration

BUSY recognizes three execution models for tasks:

#### Human Execution
- **When Used**: Tasks requiring judgment, creativity, or empathy
- **Implementation**: Generated form-based UIs with validation
- **Examples**: Client consultation, creative review, conflict resolution

#### Algorithmic Execution
- **When Used**: Deterministic, rule-based processes
- **Implementation**: TypeScript functions with clear inputs/outputs
- **Examples**: Data validation, calculations, file processing

#### AI Agent Execution
- **When Used**: Pattern recognition, content generation, analysis
- **Implementation**: LLM integration with context assembly
- **Examples**: Email drafting, report summarization, initial triage

### Resource Management

BUSY treats four resources as first-class citizens:

1. **Time**: Execution duration, scheduling, deadlines
2. **People**: Human capacity, skills, availability
3. **Capital**: Budget allocation, cost tracking, ROI
4. **Attention**: Cognitive load, focus management, priority

### Process-First Modeling

Business logic lives in **Playbooks** - structured workflows that define:
- **Inputs**: What information triggers the process
- **Steps**: Sequential or parallel task execution
- **Outputs**: Deliverables and their validation rules
- **Exception Handling**: What happens when things go wrong
- **Resources**: Time, people, and tools required

## System Architecture

The BUSY ecosystem consists of four integrated components:

### 1. BUSY Language (DSL)

A YAML-based specification language that describes:
- **Teams**: Organizational units with clear boundaries
- **Roles**: Capabilities and responsibilities
- **Playbooks**: Executable workflows
- **Documents**: Structured data schemas
- **Interfaces**: How teams communicate

### 2. BUSY Compiler

Transforms `.busy` files into executable artifacts:

```
Input Pipeline:
.busy files → Lexer → Parser → AST → Semantic Analysis → 
Dependency Resolution → Intermediate Representation

Output Generation:
IR → Code Generator → [React UI, TypeScript Functions, 
Database Schemas, AI Prompts, Integration Configs]
```

Key compiler features:
- **Multi-pass validation**: Schema, type, and business rule checking
- **Dependency resolution**: Ensures all references are valid
- **Incremental compilation**: Fast rebuilds for development
- **Error recovery**: Helpful error messages with fix suggestions

### 3. Orgata Runtime Framework

The execution engine that brings BUSY specifications to life:

#### Core Components

**Operation**: Basic unit of execution
- Combines Context (infrastructure) with Implementation (logic)
- Strongly typed inputs and outputs
- Built-in validation and error handling

**Context**: Microruntime providing infrastructure
- Resource management and dependency injection
- Execution monitoring and tracing
- Authorization and audit logging
- Exception handling and recovery

**Process**: Orchestrates multiple operations
- Step sequencing and parallelization
- State management across steps
- Checkpoint and resume capabilities
- Human-in-the-loop coordination

**Resource Manager**: Handles resource allocation
- Capacity planning and scheduling
- Cost tracking and budgeting
- Priority-based allocation
- Resource conflict resolution

#### Execution Models

**Human Task Execution**:
1. UI generated from task specification
2. Context assembled from previous steps
3. Input validation against schema
4. Human completes form/review
5. Output validated and stored
6. Process continues or escalates

**Algorithmic Task Execution**:
1. Function invoked with typed inputs
2. Deterministic logic executes
3. Results validated against schema
4. State updated and persisted
5. Next step triggered

**AI Agent Task Execution**:
1. Context assembled from process state
2. Prompt generated from task template
3. LLM invoked with safety bounds
4. Response parsed and validated
5. Human review if confidence low
6. Results integrated into process

### 4. OSTEAOS (Operating System)

Provides system-level services:
- **Runtime Isolation**: Separate execution environments per layer
- **Inter-Runtime Communication**: Message passing between layers
- **Resource Governance**: System-wide resource management
- **Security**: Access control and audit trails
- **Monitoring**: Health checks and performance metrics

## The BUSY Language

### File Organization

BUSY follows a strict directory structure mirroring organizational hierarchy:

```
organization/
├── L0/                          # Operational layer
│   ├── team-name/
│   │   ├── team.busy           # Team charter
│   │   ├── roles/              # Role definitions
│   │   │   └── role-name.busy
│   │   ├── playbooks/          # Workflows
│   │   │   └── playbook.busy
│   │   └── documents/          # Data schemas
│   │       └── document.busy
├── L1/                          # Management layer
└── L2/                          # Strategic layer
```

### Language Syntax

#### Team Definition
Defines organizational context and boundaries:

```yaml
version: "1.0.0"
metadata:
  name: "Client Operations Team"
  layer: "L0"

team:
  name: "client-operations"
  description: "Manages client relationships from inquiry to delivery"
  
  boundaries:
    - "All client-facing communication"
    - "Project lifecycle management"
    - "Service delivery coordination"
  
  interfaces:
    provides:
      - name: "project-status"
        type: "report"
        schema: "project-status-schema"
    
    consumes:
      - name: "resource-availability"
        type: "data"
        from: "L1/resource-management"
```

#### Role Definition
Specifies capabilities and responsibilities:

```yaml
version: "1.0.0"
metadata:
  name: "Project Coordinator Role"
  layer: "L0"

role:
  name: "project-coordinator"
  description: "Coordinates project execution from kickoff to delivery"
  
  capabilities:
    - "project-planning"
    - "resource-coordination"
    - "client-communication"
  
  deliverables:
    produces:
      - name: "project-plan"
        type: "document"
        format: "structured-timeline"
    
    consumes:
      - name: "client-requirements"
        type: "document"
        format: "requirement-spec"
  
  resources:
    time_allocation: "40h/week"
    tools:
      - import: "project-management-tool"
        capability: "task-tracking"
```

#### Playbook Definition
Defines executable workflows:

```yaml
version: "1.0.0"
metadata:
  name: "Client Onboarding Playbook"

playbook:
  name: "client-onboarding"
  description: "Complete onboarding from contract to project kickoff"
  
  cadence:
    frequency: "triggered"
    trigger_events: ["contract_signed"]
  
  inputs:
    - name: "signed_contract"
      type: "document"
      required: true
  
  outputs:
    - name: "project_kickoff_package"
      type: "document"
      validation_rules:
        - "all_documents_complete"
        - "client_approval_received"
  
  steps:
    - name: "collect_requirements"
      role: "project-coordinator"
      execution_type: "human"
      ui_type: "form"
      estimated_duration: "2h"
      
      inputs:
        - name: "contract_details"
          from: "signed_contract"
      
      outputs:
        - name: "detailed_requirements"
          type: "document"
          schema: "requirement-schema"
    
    - name: "generate_timeline"
      role: "project-coordinator"
      execution_type: "algorithmic"
      estimated_duration: "10m"
      
      algorithm: "timeline_generation"
      
      inputs:
        - name: "requirements"
          from: "collect_requirements.detailed_requirements"
      
      outputs:
        - name: "project_timeline"
          type: "document"
```

### Type System

BUSY provides a rich type system:

**Primitive Types**: string, number, boolean, date, datetime
**Business Types**: currency, duration, percentage, email, phone
**Structured Types**: object, array, enum
**File Types**: document, image, video, audio

### Validation System

Multi-level validation ensures correctness:

1. **Schema Validation**: YAML structure and required fields
2. **Type Validation**: Data type compatibility
3. **Business Rules**: Domain-specific constraints
4. **Interface Compatibility**: Producer/consumer alignment
5. **Resource Constraints**: Capacity and scheduling feasibility

## The Orgata Framework

Orgata is the runtime framework that executes BUSY specifications. It provides the infrastructure for process orchestration, state management, and human-AI collaboration.

### Core Design Principles

#### 1. Separation of Concerns
- **Context**: Handles all infrastructure (logging, auth, state)
- **Implementation**: Contains only business logic
- **Operation**: Combines context and implementation

#### 2. Composability
- Operations compose into Processes
- Processes compose into Workflows
- Workflows compose into Organizations

#### 3. Resilience
- Automatic retry with exponential backoff
- Circuit breakers for external services
- Checkpoint/resume for long-running processes
- Graceful degradation when services unavailable

### Key Framework Components

#### Infrastructure Services
Provided to all operations through dependency injection:

```typescript
interface InfrastructureServices {
  state: StateManager;           // Process state persistence
  audit: AuditLogger;            // Compliance and debugging
  auth: AuthorizationService;    // Access control
  notification: NotificationHub;  // Event broadcasting
  storage: DocumentStorage;       // File management
  scheduler: TaskScheduler;       // Timing and orchestration
}
```

#### Process Orchestration

```typescript
class Process {
  // Manages workflow execution
  async execute(): Promise<ProcessResult> {
    // 1. Initialize process state
    const state = await this.initializeState();
    
    // 2. Execute steps sequentially or in parallel
    for (const step of this.workflow.steps) {
      try {
        // 3. Prepare step context
        const context = this.createStepContext(step, state);
        
        // 4. Execute operation
        const result = await step.operation.execute(context);
        
        // 5. Update state
        state.recordStepCompletion(step, result);
        
        // 6. Check for exceptions
        if (result.hasException()) {
          await this.handleException(result.exception);
        }
      } catch (error) {
        // 7. Freeze process for governance
        await this.freezeProcess(state, error);
        throw new ProcessFreezedException(this.id, error);
      }
    }
    
    return this.createResult(state);
  }
}
```

#### Exception Handling

BUSY processes handle exceptions through freezing and governance:

1. **Detection**: Error or business rule violation occurs
2. **Freeze**: Process state saved, execution paused
3. **Notification**: Relevant parties alerted
4. **Intervention**: Human or AI reviews and resolves
5. **Resume**: Process continues from checkpoint

#### Human-AI Collaboration

The framework seamlessly integrates human and AI contributions:

```typescript
class HumanAICollaborator {
  async executeTask(task: Task): Promise<TaskResult> {
    // Determine execution strategy
    const strategy = this.determineStrategy(task);
    
    switch (strategy) {
      case 'human_only':
        return this.executeHumanTask(task);
        
      case 'ai_with_review':
        const aiResult = await this.executeAITask(task);
        return this.requestHumanReview(aiResult);
        
      case 'ai_autonomous':
        return this.executeAITask(task);
        
      case 'collaborative':
        const draft = await this.executeAITask(task);
        return this.executeHumanTask(task, draft);
    }
  }
}
```

### Client Folder System

Orgata maintains human-readable artifacts alongside process execution:

```
clients/{client-id}/
├── process-log.md        # Narrative of process execution
├── documents/            # Generated and uploaded documents
├── communications/       # Email/message history
├── checkpoints/         # Process state snapshots
└── metadata.json        # Machine-readable state
```

This dual approach (human-readable + machine-processable) ensures:
- Transparency in process execution
- Easy debugging and audit
- Legal/compliance documentation
- Knowledge transfer between team members

## Development Workflow

### Setting Up Development Environment

1. **Clone Repository**:
```bash
git clone <repository-url>
cd busy-lang
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Build Compiler**:
```bash
cd compiler
npm run build
```

4. **Run Tests**:
```bash
npm test
```

### Working with BUSY Files

1. **Create/Edit BUSY Specifications**:
   - Follow the directory structure (L0/L1/L2)
   - Use kebab-case for all names
   - Validate with schema before committing

2. **Compile BUSY to Runtime**:
```bash
npm run compile -- --input ./examples/solo-photography-business
```

3. **Analyze BUSY Files**:
```bash
npm run analyze -- ./examples/solo-photography-business
```

### Development Commands

- `npm run analyze`: Validate BUSY files and check health
- `npm run compile`: Generate runtime artifacts
- `npm run dev`: Start development server
- `npm test`: Run test suite
- `npm run lint`: Check code style

### Git Workflow

1. **Feature Development**:
   - Create feature branch from main
   - Make changes to BUSY specifications
   - Regenerate code if needed
   - Test thoroughly
   - Create pull request

2. **Code Regeneration**:
   - Compiler output goes to separate build directory
   - AI-assisted merge preserves customizations
   - Review changes before merging

## Getting Started

### Quick Start Example

1. **Define a Simple Team**:

Create `L0/kitchen-operations/team.busy`:
```yaml
version: "1.0.0"
metadata:
  name: "Kitchen Operations"
  layer: "L0"

team:
  name: "kitchen-operations"
  description: "Handles food preparation and service"
```

2. **Define a Role**:

Create `L0/kitchen-operations/roles/cook.busy`:
```yaml
version: "1.0.0"
metadata:
  name: "Cook Role"

role:
  name: "cook"
  description: "Prepares meals according to recipes"
  capabilities:
    - "food-preparation"
    - "quality-control"
```

3. **Define a Playbook**:

Create `L0/kitchen-operations/playbooks/prepare-meal.busy`:
```yaml
version: "1.0.0"
metadata:
  name: "Meal Preparation"

playbook:
  name: "prepare-meal"
  description: "Standard meal preparation process"
  
  steps:
    - name: "gather_ingredients"
      role: "cook"
      execution_type: "human"
      estimated_duration: "5m"
    
    - name: "prepare_meal"
      role: "cook"
      execution_type: "human"
      estimated_duration: "30m"
    
    - name: "quality_check"
      role: "cook"
      execution_type: "human"
      estimated_duration: "2m"
```

4. **Compile and Run**:
```bash
npm run compile -- --input ./L0/kitchen-operations
npm run dev
```

### Next Steps

1. **Explore Examples**: Study the `examples/` directory
2. **Read Design Docs**: Deep dive into `design-docs/`
3. **Try Modifications**: Extend existing examples
4. **Build Something New**: Create your own business model

## Key Design Decisions

### Why YAML?

- **Human Readable**: Business users can understand and review
- **Widely Supported**: Excellent tooling across all platforms
- **Structured**: Natural hierarchy for organizational modeling
- **Version Control Friendly**: Clean diffs for code review

### Why Layer Separation?

- **Clear Responsibilities**: Each layer has distinct concerns
- **Scalability**: Teams can work independently
- **Governance**: Natural escalation paths
- **Performance**: Isolated runtimes prevent interference

### Why TypeScript?

- **Type Safety**: Catch errors at compile time
- **Tooling**: Excellent IDE support and refactoring
- **Ecosystem**: Rich library ecosystem
- **Isomorphic**: Same language for frontend and backend

### Why Process Freezing?

- **Governance**: Ensures proper oversight of exceptions
- **Auditability**: Complete record of interventions
- **Learning**: Patterns in freezes inform process improvement
- **Safety**: Prevents cascading failures

### Why Git-Based Workflow?

- **Version Control**: Track all changes over time
- **Collaboration**: Standard pull request workflow
- **Rollback**: Easy reversion if issues arise
- **Documentation**: Commit messages explain why changes made

## Contributing

### Design Philosophy

When contributing to BUSY, keep these principles in mind:

1. **Business First**: Technology serves business needs, not vice versa
2. **Simplicity**: Prefer simple solutions that business users understand
3. **Composition**: Build small, composable pieces
4. **Resilience**: Plan for failure and recovery
5. **Transparency**: Make processes observable and auditable

### Areas for Contribution

- **Language Extensions**: New constructs for emerging patterns
- **Compiler Optimizations**: Faster compilation and better errors
- **Runtime Features**: Enhanced orchestration capabilities
- **Tool Integrations**: Connect with popular business tools
- **Documentation**: Improve guides and examples

## Resources

### Documentation
- `design-docs/`: Complete design documentation
- `examples/`: Working BUSY implementations
- `compiler/README.md`: Compiler architecture details

### Key Files to Review
- `design-docs/ARCHITECTURE_OVERVIEW.md`: System architecture
- `design-docs/001-initial-specification/`: Language specification
- `design-docs/011-orgata-framework-architecture/`: Runtime details
- `examples/solo-photography-business/`: Complete business example

### Community
- GitHub Issues: Report bugs and request features
- Discussions: Share ideas and get help
- Contributing Guide: How to contribute code

## Summary

BUSY transforms how organizations operate by making business processes executable, versionable, and scalable. By combining a domain-specific language with a sophisticated runtime framework, BUSY enables businesses to operate with the precision of software while maintaining the flexibility needed for human judgment and creativity.

The system's layer-first architecture, combined with its support for human, algorithmic, and AI execution models, creates a powerful platform for digital transformation. Whether you're automating routine operations, optimizing resource allocation, or planning strategic initiatives, BUSY provides the tools to describe and execute your business as code.

Welcome to the future of business operations. Let's build something amazing together!