# BUSY System Architecture

## Overview

The BUSY ecosystem consists of three primary components that work together to transform business process definitions into executable organizational systems:

1. **BUSY Language**: Domain-specific language for describing business processes
2. **BUSY Compiler**: Translates .busy files into executable components
3. **Orgata Runtime**: Executes and manages business processes
4. **OSTEAOS**: Operating system that provides resource isolation and allocation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          OSTEAOS                                │
│                    (Business Operating System)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Orgata Runtime  │  │ Orgata Runtime  │  │ Orgata Runtime  │ │
│  │                 │  │                 │  │                 │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │ │
│  │ │L2 Instance  │ │  │ │L1 Instance  │ │  │ │L0 Instance  │ │ │
│  │ │(Strategic)  │◄├──┤►│(Management) │◄├──┤►│(Operational)│ │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │ BUSY Compiler   │
                    │                 │
                    │ .busy files  →  │
                    │ Runtime Config  │
                    └─────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │ Package Manager │
                    │ (Dependencies)  │
                    └─────────────────┘
```

## Component Breakdown

### 1. BUSY Language Layer

**Purpose**: Human-readable DSL for defining business processes
**Format**: YAML-based with strict schema
**Scope**: Team definitions, roles, playbooks, interfaces, requirements

**Key Constraints**:
- Process definitions specify: inputs required, execution steps, tools/imports needed, timing estimates
- Roles and Playbooks are aliases for the same concept (class definitions) post-compilation
- Team definitions are contextual charters, not redundant role listings
- Roles/Playbooks assume generic capabilities - no specific person assignments
- Dependencies and timing defined, but not detailed orchestration
- Must be version controlled (git-based workflow)
- Namespace structure: `Org->Layer->Team->(Roles|Playbooks)` maps to file structure
- Compile-time validation for consistency and dependencies
- Support for imports/packages for external dependencies

**File/Folder Structure Model**:
```
org/
  L0/                 # Operational layer
    growthops/
      team.busy       # Charter/context document
      roles/
        sdr.busy
        ae.busy
      playbooks/
        lead-qualification.busy
  L1/                 # Management layer  
    process-optimization/
      team.busy
      roles/
        process-analyst.busy
      playbooks/
        weekly-retrospective.busy
  L2/                 # Strategic layer
    executive/
      team.busy
      roles/
        strategy-lead.busy
      playbooks/
        quarterly-planning.busy
```

**Team Definition Purpose**:
- Provide context for LLM validation of new roles/playbooks
- Document team boundaries and high-level responsibilities
- Interface documentation for other teams and layers
- Generate team "API documentation" from aggregate role/playbook definitions
- NO manual maintenance of role/playbook lists (auto-discovered from filesystem)

**Inter-Layer Interface Design Choices**:
- **API Model**: L0 teams expose explicit interfaces, L1 "representatives" interact via defined contracts
- **Server-Side Rendering Model**: L0 teams render higher-level interfaces directly to L1 consumers
- **Choice deferred to implementation**: Both patterns supported, teams decide based on complexity and coupling needs
- **Layer isolation enforced**: Regardless of interface style, layers run in separate Orgata runtime instances

### 2. BUSY Compiler

**Purpose**: Transform .busy files into executable runtime configurations

**Pipeline Stages**:
```
Source Files (.busy) 
    ↓
Tokenizer/Lexer
    ↓
Parser (AST Generation)
    ↓
Semantic Analyzer (Validation)
    ↓
Dependency Resolution
    ↓
IR (Intermediate Representation)
    ↓
Code Generation (Multiple Targets)
    ↓
Output Artifacts
```

**Validation Rules**:
- Role/playbook interface compatibility
- Resource allocation consistency
- Circular dependency detection
- Governance constraint verification
- Deliverable schema validation

**Compilation Targets**:
- Orgata Runtime Configuration (JSON/YAML)
- UI Component Specifications (React/Vue)
- AI Agent Configurations (Prompts + Tools)
- Integration Specifications (APIs, MCP servers)
- Monitoring/Telemetry Setup

### 3. Orgata Runtime

**Purpose**: Business process execution engine and IDE

**Core Responsibilities**:
- Execute compiled business processes
- Provide UI for human interactions
- Manage AI agent orchestration
- Handle exception/issue escalation
- Track process state and audit trails
- Resource request/allocation via OSTEAOS

**Architecture**:
```
┌─────────────────────────────────────────┐
│            Orgata Instance              │
├─────────────────────────────────────────┤
│  Process Engine  │  UI Framework       │
├─────────────────────────────────────────┤
│  AI Orchestrator │  Exception Handler  │
├─────────────────────────────────────────┤
│  State Manager   │  Audit Logger       │
├─────────────────────────────────────────┤
│           Resource Interface            │
└─────────────────────────────────────────┘
                    │
                    ▼
              OSTEAOS API
```

**Interface Types by Execution Model**:
- **Algorithmic**: Direct code execution, no UI
- **AI Agent**: LLM integration with context assembly
- **Human**: Form-based UI with structured inputs/outputs
- **Human Creative**: Facilitated sessions (meetings, writing, strategy)

### 4. OSTEAOS (Operating System)

**Purpose**: System integrity, isolation, and governance for business runtimes

**Core Functions**:
- **Runtime Isolation**: L0/L1/L2 boundary enforcement  
- **Inter-Runtime Communication**: Message passing and negotiation between runtimes
- **System Integrity**: Ensure runtimes don't crash or interfere with each other
- **Security/Governance**: Permission and constraint enforcement across runtime boundaries
- **Monitoring**: System-wide telemetry and health checks

**Resource Estimation and Feasibility Model**:
```yaml
# BUSY files define process-level requirements
process_requirements:
  timing_estimates: "2h prep, 30m execution"
  dependencies: ["input_data", "system_access"]
  tools_needed: ["import: salesforce", "import: email_system"]
  cadence: "daily"
  
# Compiler generates resource estimation
compiler_analysis:
  estimated_capacity_needed:
    daily_time_requirement: "2.5h per person per day"
    concurrent_roles_needed: 2
    tools_access_windows: ["9am-5pm for salesforce"]
    dependency_wait_times: "15m avg for input_data"
    
  feasibility_check:
    target_resources: "3 people, 8h/day available"
    analysis: "FEASIBLE - 7.5h total capacity vs 5h estimated need"
    bottlenecks: ["salesforce access contention during peak hours"]
    recommendations: ["stagger execution times", "pre-cache input_data"]
    
# Alternative: Author sets constraints, compiler validates
author_constraints:
  available_capacity: "2 people, 6h/day"
  required_completion: "daily by 3pm"
  compiler_response: "NOT FEASIBLE - need 2.5h per person but only 1.5h scheduled slack time"
```

## Data Flow Architecture

### Compilation Flow
```
1. Source Analysis
   .busy files → AST → Dependency Graph

2. Validation Phase
   Type Checking → Constraint Verification → Conflict Detection

3. Code Generation
   Runtime Config → UI Specs → AI Configs → Integration Specs

4. Deployment
   Orgata Configuration → OSTEAOS Resource Allocation
```

### Runtime Execution Flow
```
1. Process Initiation
   Trigger Event → Resource Request → Runtime Allocation

2. Execution
   Step Processing → Interface Generation → Human/AI Interaction

3. Exception Handling
   Issue Detection → State Freeze → Resolution Path → Process Resume

4. Completion
   Deliverable Validation → Audit Logging → Resource Release
```

## Integration Points

### External Dependencies (Package Management)
```yaml
dependency_types:
  tools:          # External software (Salesforce, Slack)
    interface: "api" | "ui_bridge" | "mcp_server"
    compilation_target: "code" | "edge_ui" | "service_call"
  
  advisors:       # External consultants/services  
    interface: "human" | "ai_assistant" | "documentation"
    compilation_target: "ui_widget" | "chat_integration"
  
  regulations:    # Compliance requirements
    interface: "validation_rules" | "audit_hooks" | "reporting"
    compilation_target: "middleware" | "aspect_oriented"
```

### Customer Input Channels
- Email/Slack bots (NLP → structured input)
- Web forms (traditional SaaS interfaces)
- Phone systems (speech-to-text → data entry)
- API integrations (direct system-to-system)

## Design Constraints

### Performance
- Compilation should be fast enough for interactive development
- Runtime should handle real-time process execution
- State persistence for process interruption/resumption

### Scalability  
- Support for large organizations (1000+ people)
- Distributed runtime deployment across business units
- Efficient resource utilization and allocation

### Reliability
- Process state must be recoverable after failures
- Audit trails for all decisions and exceptions
- Graceful degradation when external systems fail

### Security
- Role-based access control for process modification
- Secure handling of sensitive business data
- Audit logging for compliance requirements

### Maintainability
- Clear separation between L0/L1/L2 concerns
- Modular compilation pipeline for easy extension
- Standard software development practices (git, CI/CD, testing)

## Development Phases

### Phase 1: Core Compiler
- Basic YAML parsing and validation
- Simple code generation for algorithmic tasks
- File-based runtime configuration output

### Phase 2: Orgata Runtime MVP
- Process execution engine
- Basic UI generation for human tasks
- Simple exception handling

### Phase 3: AI Integration
- LLM orchestration for AI agent tasks
- Context assembly and prompt generation
- Creative facilitation interfaces

### Phase 4: OSTEAOS Integration
- Resource allocation and management
- Multi-runtime deployment
- Advanced governance and monitoring

### Phase 5: Package Ecosystem
- External dependency management
- Third-party tool integrations
- Regulatory compliance modules

## Technology Stack Considerations

### Compiler
- **Language**: Rust/Go for performance, or TypeScript for ecosystem
- **Parser**: YAML + JSON Schema validation
- **AST**: Custom IR with type system
- **Code Gen**: Template-based with multiple output formats

### Runtime (Orgata)
- **Backend**: Node.js/Python for rapid development
- **Frontend**: React/Vue for UI generation
- **AI Integration**: LangChain/LlamaIndex for LLM orchestration
- **State Management**: Redis/PostgreSQL for persistence

### Operating System (OSTEAOS)
- **Container Orchestration**: Kubernetes for runtime isolation
- **Resource Management**: Custom scheduler on top of k8s
- **Monitoring**: Prometheus/Grafana for telemetry
- **Communication**: gRPC for inter-runtime messaging