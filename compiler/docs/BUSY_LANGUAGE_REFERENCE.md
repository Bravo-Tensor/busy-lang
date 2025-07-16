# BUSY Language Reference

**Version**: 1.0.0  
**Target Audience**: BUSY file developers and LLM assistants  
**Purpose**: Complete reference for syntax, validation rules, and best practices

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)  
3. [Syntax Reference](#syntax-reference)
4. [Validation Rules](#validation-rules)
5. [Error Messages](#error-messages)
6. [Best Practices](#best-practices)
7. [LLM Assistant Guide](#llm-assistant-guide)

## Overview

BUSY (Business Unified Specification YAML) is a domain-specific language for describing business organizations as code. It uses YAML syntax to define teams, roles, playbooks, and their relationships within a layered organizational architecture.

### Key Concepts

- **Layer-First Architecture**: L0 (Operational), L1 (Management), L2 (Strategic)
- **Teams**: Organizational units with specific purposes and capabilities
- **Roles**: Individual contributors within teams with defined responsibilities
- **Playbooks**: Repeatable processes executed by teams
- **Tasks**: Atomic units of work with specific execution types
- **Deliverables**: Structured outputs and inputs for tasks/playbooks

### File Types

- **Team Files** (`team.busy`): Define team structure and composition
- **Role Files** (`*.busy` in role directories): Define individual contributor roles
- **Playbook Files** (`*.busy` in playbook directories): Define repeatable processes

## File Structure

### Directory Organization

```
organization/
├── L0/                    # Operational layer
│   ├── team-name/
│   │   ├── team.busy      # Team definition
│   │   ├── roles/         # Role definitions
│   │   │   ├── role-name.busy
│   │   │   └── ...
│   │   └── playbooks/     # Playbook definitions
│   │       ├── playbook-name.busy
│   │       └── ...
│   └── ...
├── L1/                    # Management layer
└── L2/                    # Strategic layer
```

### Base File Structure

All BUSY files must contain:

```yaml
version: "1.0.0"          # REQUIRED: Semantic version
metadata:                 # REQUIRED: File metadata
  name: "Human Name"      # REQUIRED: Display name
  description: "..."      # REQUIRED: Detailed description
  layer: "L0"             # REQUIRED: L0, L1, or L2

# Optional imports
imports:
  - tool: "toolname"      # External tool import
    version: "1.0.0"      # Version constraint
  - advisor: "advisorname"  # AI advisor import
    interface: "interface"  # Interface specification

# Content (one of):
team: {...}               # Team definition
role: {...}               # Role definition  
playbook: {...}           # Playbook definition
```

## Syntax Reference

### Version

```yaml
version: "1.0.0"
```

**Rules**:
- **Required**: Yes
- **Format**: Semantic version (`\d+\.\d+(\.\d+)?`)
- **Examples**: `"1.0"`, `"1.0.0"`, `"2.1.3"`

### Metadata

```yaml
metadata:
  name: "Project Coordinator Role"
  description: "Manages active client projects from booking to delivery"
  layer: "L0"
```

**Rules**:
- **Required**: Yes
- **`name`**: Human-readable display name (min 1 character)
- **`description`**: Detailed description (min 1 character)
- **`layer`**: Must be `"L0"`, `"L1"`, or `"L2"`

### Imports

```yaml
imports:
  - tool: "salesforce"
    version: "^2.0.0"
  - advisor: "legal-advisor"
    interface: "contract-review"
```

**Rules**:
- **Required**: No
- **Tool imports**: Require `tool` and `version` fields
- **Advisor imports**: Require `advisor` and `interface` fields
- **Version format**: Semantic version with optional `^` or `~` prefix

### Team Definition

```yaml
team:
  name: "Client Operations"
  type: "stream-aligned"
  description: "Handles all client-facing operations"
  
  # Optional fields
  roles:
    - name: "project-coordinator"
      description: "Coordinates project execution"
      # ... role fields
  
  playbooks:
    - name: "client-onboarding"
      description: "Onboard new clients"
      # ... playbook fields
  
  resources:
    - type: "time"
      allocation: 40
      unit: "hours/week"
  
  governance:
    escalation_path: "operations-manager"
    decision_authority: ["team-lead"]
  
  interfaces:
    external: ["clients", "vendors"]
    internal: ["creative-team", "business-ops"]
  
  success_metrics:
    - "Client satisfaction > 95%"
    - "Project delivery on time > 90%"
```

**Rules**:
- **Required**: `name`, `type`, `description`
- **Team types**: `"stream-aligned"`, `"enabling"`, `"complicated-subsystem"`, `"platform"`
- **Resource types**: `"time"`, `"people"`, `"capital"`, `"attention"`, `"tooling"`

### Role Definition

```yaml
role:
  name: "project-coordinator"
  description: "Coordinates project execution and client communications"
  
  # Optional inheritance
  inherits_from: "base-coordinator"
  
  # Optional onboarding
  onboarding:
    - step: "Learn project management workflow"
      duration: "1h"
    - step: "Setup communication protocols"
      duration: "45m"
  
  # Optional responsibilities
  responsibilities:
    - "Manage project timelines"
    - "Coordinate with teams"
    - "Maintain client communications"
  
  # Optional tasks
  tasks:
    - name: "project_kickoff"
      description: "Initiate project workflow"
      execution_type: "human"
      # ... task fields
  
  # Optional interfaces
  interfaces:
    inputs:
      - name: "project_requirements"
        type: "document"
        format: "json"
    outputs:
      - name: "project_plan"
        type: "document"
        format: "pdf"
```

**Rules**:
- **Required**: `name`, `description`
- **Name format**: kebab-case (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`)
- **Inheritance**: Optional parent role reference
- **Duration format**: `\d+[mhd]` (minutes, hours, days)

### Playbook Definition

```yaml
playbook:
  name: "client-onboarding"
  description: "Process for onboarding new clients"
  
  # Required cadence
  cadence:
    frequency: "on_demand"
    trigger_events: ["new_client_signup"]
  
  # Optional inputs/outputs
  inputs:
    - name: "client_information"
      type: "document"
      format: "json"
      required_fields: ["name", "email", "package"]
  
  outputs:
    - name: "onboarding_completion"
      type: "document"
      format: "pdf"
  
  # Optional steps
  steps:
    - name: "validate_client_info"
      description: "Validate client information"
      execution_type: "algorithmic"
      # ... task fields
  
  # Optional issue resolution
  issue_resolution:
    - type: "escalate"
      target: "operations-manager"
      conditions: ["data_quality_issues"]
```

**Rules**:
- **Required**: `name`, `description`, `cadence`
- **Name format**: kebab-case (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`)
- **Frequency**: `"daily"`, `"weekly"`, `"monthly"`, `"quarterly"`, `"on_demand"`, `"triggered"`
- **Steps**: Array of task definitions

### Task Definition

```yaml
- name: "review_contract"
  description: "Review contract for legal compliance"
  execution_type: "human_creative"
  
  # Optional duration
  estimated_duration: "2h"
  
  # Optional inputs/outputs
  inputs:
    - name: "draft_contract"
      type: "document"
      format: "pdf"
  
  outputs:
    - name: "reviewed_contract"
      type: "document"
      format: "pdf"
      validation_rules:
        - rule_type: "required"
          condition: "legal_approval_signature"
          error_message: "Contract must be legally approved"
  
  # Execution-specific fields
  ui_type: "form"              # For human tasks
  algorithm: "contract_validator"  # For algorithmic tasks
  agent_prompt: "Review this contract..."  # For AI agent tasks
  
  # Optional issue handling
  issues:
    - issue_type: "legal_complexity"
      resolution:
        type: "escalate"
        target: "legal-advisor"
        timeout: "24h"
  
  # Optional tags
  tags: ["legal", "compliance", "contract"]
```

**Rules**:
- **Required**: `name`, `description`, `execution_type`
- **Name format**: snake_case (`^[a-z][a-z0-9_]*$`)
- **Execution types**: `"algorithmic"`, `"ai_agent"`, `"human"`, `"human_creative"`
- **Duration format**: `\d+[mhd]`
- **UI types**: `"form"`, `"meeting"`, `"writing_session"`, `"strategy_session"`

### Deliverable Definition

```yaml
- name: "client_contract"
  type: "document"
  format: "pdf"
  
  # Optional schema
  schema:
    type: "json"
    definition: |
      {
        "client_name": "string",
        "contract_terms": "object",
        "signatures": "array"
      }
  
  # Optional required fields
  required_fields: ["client_name", "contract_terms"]
  
  # Optional validation rules
  validation_rules:
    - rule_type: "required"
      condition: "client_signature_present"
      error_message: "Client signature is required"
      severity: "error"
    - rule_type: "format"
      condition: "valid_email_format"
      error_message: "Email must be valid format"
      severity: "warning"
```

**Rules**:
- **Required**: `name`, `type`, `format`
- **Name format**: snake_case (`^[a-z][a-z0-9_]*$`)
- **Types**: `"document"`, `"data"`, `"decision"`, `"approval"`
- **Validation rule types**: `"required"`, `"format"`, `"range"`, `"dependency"`, `"conflict"`
- **Severities**: `"error"`, `"warning"`, `"info"`

### Issue Resolution

```yaml
issues:
  - issue_type: "data_quality_problem"
    resolution:
      type: "ai_assist"
      agent_prompt: "Help resolve data quality issues"
      context_gathering: ["previous_validations", "client_history"]
      timeout: "15m"
      fallback:
        type: "escalate"
        target: "data-quality-specialist"
```

**Rules**:
- **Resolution types**: `"escalate"`, `"override"`, `"delegate"`, `"pause"`, `"ai_assist"`
- **Timeout format**: `\d+[mhd]`
- **Fallback**: Optional nested resolution

## Validation Rules

### Schema Validation

The compiler validates all BUSY files against a JSON schema that enforces:

1. **Required fields** at each level
2. **Field format patterns** (kebab-case, snake_case, etc.)
3. **Enumerated values** for specific fields
4. **Nested structure** requirements
5. **Additional properties** restrictions

### Semantic Validation

Beyond schema validation, the compiler performs semantic analysis:

#### Naming Conventions

- **Roles**: Must be kebab-case (`project-coordinator`)
- **Playbooks**: Must be kebab-case (`client-onboarding`)
- **Tasks**: Must be snake_case (`validate_client_info`)
- **Deliverables**: Must be snake_case (`client_contract`)

#### Layer Consistency

- File metadata `layer` must match directory structure
- Cross-layer references must follow proper hierarchy (L0 → L1 → L2)

#### Symbol References

- All symbol references must resolve to defined symbols
- Inheritance chains must be valid and non-circular
- Interface inputs/outputs must be properly typed

#### Execution Type Requirements

- **Algorithmic tasks**: Should specify `algorithm` field
- **AI agent tasks**: Must specify `agent_prompt` field
- **Human tasks**: Should specify `ui_type` field
- **Human creative tasks**: No additional requirements

### Dead Code Detection

The compiler identifies unused symbols:

- **Roles** not referenced in team definitions or playbooks
- **Playbooks** not referenced in team definitions or schedules
- **Tasks** not used in roles or playbooks
- **Deliverables** not consumed by any tasks
- **Tools/Advisors** imported but not used

### Interface Validation

The compiler validates interface compatibility:

- **Input/output matching** between connected tasks
- **Type compatibility** between deliverables
- **Format compatibility** between systems
- **Required field validation** for deliverables

## Error Messages

### Parse Errors

```
YAML_PARSE_ERROR: Invalid YAML syntax at line 15, column 3
SCHEMA_VALIDATION_ERROR: Missing required field 'description' in metadata
INVALID_VERSION_FORMAT: Version '1.0.0.1' does not match semver pattern
```

### Semantic Errors

```
NAMING_CONVENTION: Role name 'project_coordinator' must be kebab-case
UNDEFINED_SYMBOL: Role 'undefined-role' referenced but not defined
CIRCULAR_DEPENDENCY: Circular inheritance detected in role hierarchy
LAYER_MISMATCH: File in L0 directory declares layer 'L1' in metadata
EXECUTION_TYPE_MISMATCH: AI agent task 'analyze_data' missing required agent_prompt
DUPLICATE_SYMBOL: Task name 'validate_input' appears multiple times in role
```

### Validation Warnings

```
DEAD_CODE: Role 'unused-role' is defined but never used
MISSING_DURATION: Task 'complex_task' should specify estimated_duration
EMPTY_PLAYBOOK: Playbook 'empty-process' has no steps defined
UNUSED_IMPORT: Tool 'salesforce' is imported but never used
POTENTIAL_OPTIMIZATION: Consider combining similar tasks for efficiency
```

### Analysis Info

```
SEMANTIC_ANALYSIS_COMPLETE: Analyzed 177 symbols successfully
COMMON_IMPORT: Tool 'stripe' is used in 5 files
PERFORMANCE_METRICS: Critical path analysis completed
INTERFACE_COMPATIBILITY: All interfaces are compatible
```

## Best Practices

### File Organization

1. **Consistent naming**: Use kebab-case for files and directories
2. **Logical grouping**: Group related roles and playbooks within teams
3. **Layer separation**: Keep L0, L1, L2 concerns separate
4. **Version management**: Use semantic versioning consistently

### Task Design

1. **Atomic tasks**: Each task should have a single, clear purpose
2. **Proper typing**: Always specify execution_type appropriately
3. **Duration estimates**: Include realistic time estimates
4. **Error handling**: Define issue resolution for common problems

### Interface Design

1. **Clear inputs/outputs**: Define deliverables with proper schemas
2. **Validation rules**: Include appropriate validation for data quality
3. **Type consistency**: Ensure compatible types across task boundaries
4. **Documentation**: Use descriptive names and detailed descriptions

### Performance Optimization

1. **Minimize dependencies**: Reduce coupling between components
2. **Efficient resource usage**: Optimize resource allocation
3. **Parallel execution**: Design tasks for concurrent execution where possible
4. **Caching strategies**: Identify opportunities for result caching

## LLM Assistant Guide

### When Assisting with BUSY Files

1. **Always validate syntax**: Check against schema and naming conventions
2. **Enforce layer architecture**: Ensure proper L0/L1/L2 separation
3. **Suggest best practices**: Recommend optimal task and interface design
4. **Check for completeness**: Verify all required fields are present
5. **Optimize for clarity**: Prefer readable, maintainable structures

### Common Patterns

#### Role Creation Template
```yaml
version: "1.0.0"
metadata:
  name: "[Human Readable Name]"
  description: "[Detailed description of role purpose]"
  layer: "L0"

role:
  name: "[kebab-case-name]"
  description: "[Role responsibilities and scope]"
  
  responsibilities:
    - "[Primary responsibility]"
    - "[Secondary responsibility]"
  
  tasks:
    - name: "[snake_case_task_name]"
      description: "[Task purpose and outcome]"
      execution_type: "[human|ai_agent|algorithmic|human_creative]"
      estimated_duration: "[Xh|Xm|Xd]"
      
      inputs:
        - name: "[input_deliverable]"
          type: "[document|data|decision|approval]"
          format: "[json|pdf|email|etc]"
      
      outputs:
        - name: "[output_deliverable]"
          type: "[document|data|decision|approval]"
          format: "[json|pdf|email|etc]"
```

#### Playbook Creation Template
```yaml
version: "1.0.0"
metadata:
  name: "[Human Readable Name]"
  description: "[Detailed description of playbook purpose]"
  layer: "L0"

playbook:
  name: "[kebab-case-name]"
  description: "[Process purpose and outcomes]"
  
  cadence:
    frequency: "[daily|weekly|monthly|quarterly|on_demand|triggered]"
    # Add schedule or trigger_events as needed
  
  inputs:
    - name: "[input_deliverable]"
      type: "[document|data|decision|approval]"
      format: "[json|pdf|email|etc]"
  
  outputs:
    - name: "[output_deliverable]"
      type: "[document|data|decision|approval]"
      format: "[json|pdf|email|etc]"
  
  steps:
    - name: "[snake_case_step_name]"
      description: "[Step purpose]"
      execution_type: "[human|ai_agent|algorithmic|human_creative]"
      # Additional task fields...
```

### Validation Checklist

Before finalizing any BUSY file, verify:

- [ ] Valid YAML syntax
- [ ] Required fields present (version, metadata, content)
- [ ] Proper naming conventions (kebab-case for roles/playbooks, snake_case for tasks)
- [ ] Layer consistency between metadata and file location
- [ ] Execution type requirements met (agent_prompt for AI agents, etc.)
- [ ] Duration formats correct (`\d+[mhd]`)
- [ ] No duplicate names within scopes
- [ ] All references resolve to defined symbols
- [ ] Interface compatibility between connected tasks
- [ ] Appropriate validation rules for deliverables

### Error Resolution

When encountering validation errors:

1. **Read error message carefully**: Error messages contain specific guidance
2. **Check location**: Errors include file and line/field information
3. **Verify syntax**: Common issues are YAML formatting problems
4. **Validate naming**: Many errors are naming convention violations
5. **Check requirements**: Ensure all required fields are present and correct
6. **Test incrementally**: Fix one error at a time and re-validate

This reference provides comprehensive guidance for creating and maintaining BUSY files. Always run the compiler validation before finalizing any changes to ensure correctness and consistency.