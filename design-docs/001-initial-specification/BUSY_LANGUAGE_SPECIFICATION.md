# BUSY Language Specification

**Version**: 1.0  
**Status**: Implemented  
**Last Updated**: July 2025

## Language Overview

The BUSY language is a YAML-based domain-specific language for describing business organizations as code. It enables business processes to be defined, validated, and executed through automated systems while maintaining human readability and version control compatibility.

## Core Design Principles

### 1. Layer-First Architecture
Business operations are organized into three distinct layers:
- **L0 (Operational)**: Day-to-day business operations and customer interaction
- **L1 (Management)**: Process optimization and cross-team coordination  
- **L2 (Strategic)**: Long-term planning and organizational design

### 2. Human-Computer Collaboration
Tasks are categorized by execution model:
- **Human**: Form-based interfaces requiring human judgment
- **Algorithmic**: Automated code execution with deterministic logic
- **AI Agent**: LLM-powered tasks with context assembly and prompts

### 3. Process-First Modeling
Business logic is captured in playbooks (workflows) that:
- Define inputs, outputs, and execution steps
- Specify resource requirements and timing estimates
- Support exception handling and escalation paths
- Enable audit trails and state management

## Language Structure

### File Organization
```
organization/
├── L0/                     # Operational layer
│   ├── team-name/
│   │   ├── team.busy      # Team charter and context
│   │   ├── roles/         # Role definitions
│   │   │   └── role-name.busy
│   │   ├── playbooks/     # Workflow definitions
│   │   │   └── playbook-name.busy
│   │   └── documents/     # Document schemas
│   │       └── document-name.busy
├── L1/                     # Management layer
│   └── [same structure]
└── L2/                     # Strategic layer
    └── [same structure]
```

### Core Entity Types

#### Team Definitions
**Purpose**: Contextual charters providing LLM validation context

```yaml
name: "client-operations"
layer: "L0"
description: "Manages client relationships and project delivery"
boundaries:
  - "Customer-facing processes and communication"
  - "Project lifecycle from inquiry to delivery"
interfaces:
  provides:
    - name: "project-status"
      schema: "project-status-schema"
  consumes:
    - name: "client-requirements"  
      schema: "requirements-schema"
```

#### Role Definitions
**Purpose**: Executable class definitions for business capabilities

```yaml
name: "inquiry-manager"
description: "Handles initial client inquiries and qualification"
inherits_from: "base-client-role"
capabilities:
  - "client-communication"
  - "lead-qualification"
deliverables:
  produces:
    - name: "qualification-assessment"
      type: "structured-data"
      schema: "qualification-schema"
  consumes:
    - name: "inquiry-data"
      type: "form-submission"
      schema: "inquiry-schema"
resources:
  time_allocation: "2h per inquiry"
  tools:
    - import: "salesforce-crm"
    - import: "email-templates"
```

#### Playbook Definitions  
**Purpose**: Workflow specifications with step-by-step execution

```yaml
name: "client-onboarding"
description: "Complete client onboarding from inquiry to contract"
cadence:
  trigger: "manual"
  frequency: "per-client"
steps:
  - name: "receive-inquiry"
    role: "inquiry-manager"
    execution_type: "human"
    inputs:
      - name: "contact-form"
        type: "form-data"
    outputs:
      - name: "inquiry-data"
        type: "structured"
    estimated_time: "15m"
    
  - name: "qualify-lead" 
    role: "inquiry-manager"
    execution_type: "human"
    inputs:
      - name: "inquiry-data"
        source: "receive-inquiry"
    outputs:
      - name: "qualification-score"
        type: "number"
    estimated_time: "30m"
```

#### Document Definitions
**Purpose**: Structured data schemas for process artifacts

```yaml
name: "client-contract"
type: "legal-document"
schema:
  type: "object"
  properties:
    client_name:
      type: "string"
      required: true
    service_description:
      type: "string"
      required: true
    total_cost:
      type: "number"
      minimum: 0
    signature_date:
      type: "string"
      format: "date"
validation_rules:
  - "total_cost must be positive"
  - "signature_date must be in future"
```

## Type System

### Data Types
- **Primitive Types**: string, number, boolean, date
- **Structured Types**: object, array, enum
- **Business Types**: currency, duration, percentage
- **File Types**: document, image, audio, video

### Interface Compatibility
```yaml
# Producer interface
produces:
  - name: "client-data"
    schema:
      type: "object"
      properties:
        name: { type: "string" }
        email: { type: "string", format: "email" }

# Consumer interface - must be compatible
consumes:
  - name: "client-info"
    schema:
      type: "object"
      properties:
        name: { type: "string" }
        email: { type: "string" }
```

## Import System

### Tool Imports
```yaml
imports:
  tools:
    - name: "salesforce-crm"
      capability: "lead-management"
      configuration:
        api_version: "v54.0"
        sandbox: false
```

### Advisor Imports  
```yaml
imports:
  advisors:
    - name: "legal-counsel"
      capability: "contract-review"
      escalation_threshold: "high-value-contracts"
```

## Validation Rules

### Compile-Time Validation
1. **Schema Validation**: All YAML files conform to BUSY schema
2. **Type Checking**: Interface compatibility between producers/consumers
3. **Dependency Resolution**: All imports can be resolved
4. **Circular Dependency Detection**: No circular references in workflows
5. **Resource Allocation**: Realistic capacity and timing estimates

### Runtime Validation  
1. **Data Validation**: All inputs/outputs conform to specified schemas
2. **Business Rules**: Domain-specific validation logic
3. **Resource Constraints**: Available capacity for process execution
4. **Exception Handling**: Proper escalation paths for failures

## Language Grammar

### Lexical Structure
- **Keywords**: Reserved words (name, role, playbook, team, etc.)
- **Identifiers**: kebab-case naming convention
- **Literals**: Strings, numbers, booleans following YAML syntax
- **Comments**: YAML comment syntax with `#`

### Syntax Rules
- Files must be valid YAML with UTF-8 encoding
- Entity names use kebab-case (client-operations, inquiry-manager)
- File names match entity names with .busy extension
- Folder structure reflects organizational hierarchy

### Schema Validation
All BUSY files validated against JSON Schema definitions:
- `busy-schema.json`: Complete language schema
- `team-schema.json`: Team-specific validation
- `role-schema.json`: Role-specific validation  
- `playbook-schema.json`: Playbook-specific validation

## Error Handling

### Compilation Errors
```
E001: Schema Validation Error
E002: Type Mismatch Error  
E003: Missing Dependency Error
E004: Circular Dependency Error
E005: Resource Over-allocation Error
```

### Runtime Errors
```
R001: Data Validation Error
R002: Business Rule Violation
R003: Resource Unavailable Error
R004: External Service Error
R005: Human Escalation Required
```

## Extension Points

### Custom Types
```yaml
custom_types:
  photography_style:
    type: "enum"
    values: ["portrait", "landscape", "event", "commercial"]
    
  project_budget:
    type: "object"
    properties:
      amount: { type: "number", minimum: 0 }
      currency: { type: "string", enum: ["USD", "EUR", "GBP"] }
```

### Custom Validation
```yaml
validation_rules:
  - name: "budget-approval-required"
    condition: "project_budget.amount > 10000"
    action: "require_approval"
    escalation: "finance-manager"
```

## Implementation Notes

### Compiler Integration
- Lexer/Parser implemented in TypeScript using yaml library
- AST generation with symbol table for cross-reference resolution
- Type checker validates interface compatibility
- Code generator produces React/TypeScript applications

### Runtime Integration  
- Generated applications include validation middleware
- State management preserves process execution context
- Exception handling supports process freezing and resumption
- Audit trails capture all state transitions and decisions

## Version Compatibility

### Semantic Versioning
- **Major**: Breaking changes to language syntax or semantics
- **Minor**: New features with backward compatibility
- **Patch**: Bug fixes and clarifications

### Migration Strategy
- Automated migration tools for version upgrades
- Deprecation warnings for features being removed
- Comprehensive test suite for compatibility verification

This specification defines the complete BUSY language as implemented in the current compiler and runtime system.