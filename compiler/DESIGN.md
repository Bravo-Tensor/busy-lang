# BUSY Compiler Design Document

## Overview

The BUSY Compiler is a static analysis tool that validates BUSY language repositories for interface coherence, dependency resolution, and completeness. It operates similarly to traditional compilers but focuses on business process validation rather than code generation.

## Architecture

### Multi-Pass Compilation Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Scanner   │ →  │   Parser    │ →  │  Semantic   │ →  │  Analysis   │
│             │    │             │    │  Analyzer   │    │  Reporter   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
 File Discovery      AST Generation     Symbol Resolution    Error Reports
 Import Resolution   Schema Validation  Type Checking       Warning Reports
 Namespace Mapping   Syntax Validation  Interface Matching  Dependency Graphs
```

### 1. Scanner Phase
**Purpose**: Repository discovery and file organization
- Scan directory structure for .busy files
- Validate namespace adherence (Org→Layer→Team→Role/Playbook)
- Resolve import dependencies and tool references
- Build file dependency graph

**Outputs**:
- File registry with metadata
- Import dependency tree
- Namespace hierarchy map

### 2. Parser Phase
**Purpose**: YAML parsing and AST construction
- Parse YAML structure with schema validation
- Build Abstract Syntax Tree (AST) for each file
- Extract metadata, imports, roles, playbooks, tasks
- Validate grammar compliance against BUSY specification

**Outputs**:
- AST nodes for all language constructs
- Parse error reports
- Schema validation results

### 3. Semantic Analysis Phase
**Purpose**: Symbol resolution and type checking
- Build global symbol table across all files
- Resolve role inheritance and task definitions
- Validate deliverable type consistency
- Check resource allocation coherence

**Outputs**:
- Symbol table with all definitions
- Type resolution mappings
- Interface compatibility matrix

### 4. Analysis & Reporting Phase
**Purpose**: Interface validation and dead code detection
- Validate input/output deliverable matching
- Detect unreachable roles and playbooks
- Analyze workflow completeness
- Generate optimization recommendations

**Outputs**:
- Compilation report (errors/warnings)
- Dependency visualization
- Dead code analysis
- Performance recommendations

## Core Data Structures

### Abstract Syntax Tree (AST)

```typescript
interface BusyAST {
  files: Map<string, BusyFile>
  globalSymbols: SymbolTable
  dependencies: DependencyGraph
}

interface BusyFile {
  path: string
  metadata: FileMetadata
  imports: Import[]
  teams?: Team[]
  roles?: Role[]
  playbooks?: Playbook[]
}

interface FileMetadata {
  name: string
  description: string
  layer: "L0" | "L1" | "L2"
  version: string
}

interface Role {
  name: string
  inheritsFrom?: string
  description: string
  onboarding: OnboardingStep[]
  tasks: Task[]
  responsibilities: string[]
  interfaces: RoleInterface
}

interface Playbook {
  name: string
  description: string
  cadence: CadenceSpec
  inputs: DeliverableSpec[]
  outputs: DeliverableSpec[]
  steps: Task[]
  issueResolution: ResolutionSpec[]
}

interface Task {
  name: string
  description: string
  executionType: "algorithmic" | "ai_agent" | "human" | "human_creative"
  inputs: DeliverableSpec[]
  outputs: DeliverableSpec[]
  estimatedDuration: string
  issues?: IssueSpec[]
}
```

### Symbol Table

```typescript
interface SymbolTable {
  roles: Map<string, RoleSymbol>
  playbooks: Map<string, PlaybookSymbol>
  tasks: Map<string, TaskSymbol>
  deliverables: Map<string, DeliverableSymbol>
  tools: Map<string, ToolSymbol>
  advisors: Map<string, AdvisorSymbol>
}

interface Symbol {
  name: string
  file: string
  line: number
  type: SymbolType
  references: Reference[]
  isUsed: boolean
}

interface Reference {
  file: string
  line: number
  context: "input" | "output" | "inheritance" | "call"
}
```

### Dependency Graph

```typescript
interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  edges: DependencyEdge[]
  cycles: CyclicDependency[]
}

interface DependencyNode {
  id: string
  type: "role" | "playbook" | "task" | "deliverable" | "tool"
  file: string
  dependencies: string[]
  dependents: string[]
}
```

## Static Analysis Rules

### 1. Interface Coherence Rules

**Deliverable Type Matching**:
```typescript
rule DeliverableTypeCompatibility {
  for each task.output in AST {
    for each consuming_task.input in AST {
      if (output.name === input.name) {
        assert(output.type === input.type)
        assert(output.format.isCompatibleWith(input.format))
        assert(output.schema.isAssignableTo(input.schema))
      }
    }
  }
}
```

**Interface Completeness**:
```typescript
rule InterfaceCompleteness {
  for each role in AST {
    assert(role.interfaces.inputs.every(input => 
      exists(upstream_output => upstream_output.matches(input))
    ))
    assert(role.interfaces.outputs.every(output =>
      exists(downstream_input => downstream_input.matches(output))
    ))
  }
}
```

### 2. Dependency Resolution Rules

**Import Validation**:
```typescript
rule ImportResolution {
  for each import in AST {
    if (import.type === "tool") {
      assert(toolRegistry.contains(import.tool))
      assert(import.version.isCompatibleWith(toolRegistry.get(import.tool).version))
    }
    if (import.type === "advisor") {
      assert(advisorRegistry.contains(import.advisor))
      assert(advisorRegistry.get(import.advisor).interfaces.contains(import.interface))
    }
  }
}
```

**Role Inheritance**:
```typescript
rule RoleInheritance {
  for each role in AST {
    if (role.inheritsFrom) {
      const parent = symbolTable.roles.get(role.inheritsFrom)
      assert(parent !== undefined, "Parent role must exist")
      assert(!hasCircularInheritance(role, parent), "No circular inheritance")
      assert(role.overrides.every(override => 
        parent.tasks.contains(override.taskName)
      ))
    }
  }
}
```

### 3. Dead Code Detection Rules

**Unreachable Roles**:
```typescript
rule UnreachableRoles {
  for each role in AST {
    const isReferenced = AST.playbooks.some(playbook =>
      playbook.steps.some(step => step.assignedRole === role.name)
    )
    const hasExternalInterface = role.interfaces.inputs.some(input =>
      input.source === "external"
    )
    
    if (!isReferenced && !hasExternalInterface) {
      warn(`Role ${role.name} is never invoked`)
    }
  }
}
```

**Unused Deliverables**:
```typescript
rule UnusedDeliverables {
  for each deliverable in symbolTable.deliverables {
    if (deliverable.references.length === 0) {
      warn(`Deliverable ${deliverable.name} is never consumed`)
    }
    if (deliverable.references.every(ref => ref.context === "output")) {
      warn(`Deliverable ${deliverable.name} is produced but never consumed`)
    }
  }
}
```

### 4. Workflow Completeness Rules

**Entry Point Validation**:
```typescript
rule EntryPointValidation {
  const entryPoints = AST.playbooks.filter(playbook =>
    playbook.cadence.frequency === "triggered" &&
    playbook.cadence.triggerEvents.some(event => event.startsWith("external_"))
  )
  
  assert(entryPoints.length > 0, "Repository must have at least one external entry point")
  
  for each playbook in AST.playbooks {
    if (!isReachableFrom(playbook, entryPoints)) {
      warn(`Playbook ${playbook.name} is not reachable from any entry point`)
    }
  }
}
```

**Resource Budget Validation**:
```typescript
rule ResourceBudgetValidation {
  for each team in AST.teams {
    const totalTimeAllocated = team.roles.flatMap(role => role.tasks)
      .reduce((sum, task) => sum + parseDuration(task.estimatedDuration), 0)
    
    const availableCapacity = team.resources
      .filter(resource => resource.type === "time")
      .reduce((sum, resource) => sum + resource.allocation, 0)
    
    if (totalTimeAllocated > availableCapacity * 1.2) {
      warn(`Team ${team.name} may be over-allocated (${totalTimeAllocated}h vs ${availableCapacity}h)`)
    }
  }
}
```

## Error Classification

### Error Severity Levels

**ERROR** - Compilation failures that prevent runtime execution:
- Missing required fields
- Type mismatches in deliverable interfaces
- Circular dependencies
- Invalid import references
- Schema validation failures

**WARNING** - Issues that may cause runtime problems:
- Unused roles or playbooks
- Unreachable workflow paths
- Resource over-allocation
- Missing error handling
- Performance anti-patterns

**INFO** - Optimization opportunities:
- Redundant deliverable definitions
- Inefficient workflow patterns
- Missing documentation
- Incomplete test coverage

## CLI Interface Design

### Command Structure
```bash
# Basic validation
busy-check validate [path]

# Specific analysis modes
busy-check interfaces [path]     # Interface coherence only
busy-check dependencies [path]   # Dependency resolution only
busy-check deadcode [path]       # Dead code detection only
busy-check workflows [path]      # Workflow completeness only

# Output formats
busy-check validate [path] --format json
busy-check validate [path] --format html
busy-check validate [path] --format graph

# Configuration
busy-check validate [path] --config busy.config.json
busy-check validate [path] --strict
busy-check validate [path] --warnings-as-errors

# Watch mode for development
busy-check watch [path]
```

### Configuration File
```json
{
  "rules": {
    "interfaceCoherence": "error",
    "deadCodeDetection": "warning", 
    "resourceValidation": "info",
    "workflowCompleteness": "error"
  },
  "ignore": [
    "*/deprecated/*",
    "*/examples/*"
  ],
  "customRules": [
    "./rules/custom-validation.js"
  ],
  "toolRegistry": "./tools.json",
  "advisorRegistry": "./advisors.json"
}
```

## IDE Integration

### Language Server Protocol (LSP)
- Real-time validation as files are edited
- Auto-completion for role/playbook references
- Go-to-definition for deliverable types
- Hover information for task descriptions
- Rename refactoring across files

### VS Code Extension Features
- Syntax highlighting for .busy files
- Integrated error/warning reporting
- Dependency graph visualization
- Quick fixes for common issues
- Snippet templates for roles/playbooks

## Performance Considerations

### Incremental Compilation
- File-level change detection
- Selective re-analysis of affected dependencies
- Cached symbol table persistence
- Parallel processing of independent files

### Memory Optimization
- Streaming parser for large repositories
- Lazy loading of AST nodes
- Garbage collection of unused symbols
- Compressed dependency graphs

### Scalability Targets
- 1000+ .busy files in single repository
- Sub-second validation for typical changes
- <1GB memory usage for large repositories
- Parallel processing across CPU cores