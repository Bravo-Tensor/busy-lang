# BUSY Compiler Error System Design

## Error Classification Framework

### Severity Hierarchy
```typescript
enum Severity {
  ERROR = "error",      // Blocks compilation/runtime
  WARNING = "warning",  // May cause runtime issues
  INFO = "info",        // Optimization opportunities
  HINT = "hint"         // Style/convention suggestions
}
```

### Error Categories

#### 1. Syntax Errors (ERROR)
**E001 - Invalid YAML Structure**
```yaml
# Example: Missing required field
version: "1.0"
metadata:
  # Missing required 'name' field
  description: "Sample role"
  layer: "L0"
```
**Message**: `Missing required field 'name' in metadata section`
**Fix**: Add `name: "role_name"` to metadata

**E002 - Grammar Violation**
```yaml
# Example: Invalid execution_type
task:
  name: "sample_task"
  execution_type: "invalid_type"  # Should be algorithmic|ai_agent|human|human_creative
```
**Message**: `Invalid execution_type 'invalid_type'. Must be one of: algorithmic, ai_agent, human, human_creative`

#### 2. Type Errors (ERROR)
**E100 - Deliverable Type Mismatch**
```yaml
# Producer task output
outputs:
  - deliverable:
      name: "user_data"
      type: "document"
      format: "json"

# Consumer task input
inputs:
  - deliverable:
      name: "user_data"
      type: "data"        # Mismatch: document vs data
      format: "json"
```
**Message**: `Deliverable 'user_data' type mismatch: produced as 'document' but consumed as 'data'`
**Fix**: Align types or add conversion step

**E101 - Schema Incompatibility**
```yaml
# Producer schema
deliverable:
  name: "user_profile"
  schema:
    type: "json"
    definition: |
      {
        "id": "string",
        "name": "string"
      }

# Consumer schema (incompatible)
deliverable:
  name: "user_profile"
  schema:
    type: "json"
    definition: |
      {
        "userId": "number",  # Different field name and type
        "name": "string"
      }
```
**Message**: `Schema incompatibility for 'user_profile': producer defines 'id' as string, consumer expects 'userId' as number`

#### 3. Interface Errors (ERROR)
**E200 - Missing Interface Implementation**
```yaml
# Role interface definition
interfaces:
  inputs:
    - deliverable:
        name: "client_data"
        type: "data"
        format: "json"

# But no task actually consumes this input
tasks:
  - task:
      name: "process_client"
      inputs: []  # Missing client_data input
```
**Message**: `Role interface declares input 'client_data' but no task consumes it`

**E201 - Unresolved Interface Dependency**
```yaml
# Task requires input
inputs:
  - deliverable:
      name: "external_data"
      type: "data"
      format: "json"

# But no producer found in entire repository
```
**Message**: `No producer found for deliverable 'external_data' required by task 'process_data'`

#### 4. Import Errors (ERROR)
**E300 - Tool Not Found**
```yaml
imports:
  - tool: "nonexistent-tool"
    version: "^1.0"
```
**Message**: `Unknown tool 'nonexistent-tool'. Check tool registry or spelling.`
**Available Tools**: `salesforce, stripe, calendly, quickbooks...`

**E301 - Version Incompatibility**
```yaml
imports:
  - tool: "stripe"
    version: "^5.0"  # But only v4.x available
```
**Message**: `Tool 'stripe' version '^5.0' not available. Available versions: ^4.0, ^3.2`

#### 5. Inheritance Errors (ERROR)
**E400 - Circular Inheritance**
```yaml
# role-a.busy
role:
  name: "role_a"
  inherits_from: "role_b"

# role-b.busy
role:
  name: "role_b"
  inherits_from: "role_a"  # Circular dependency
```
**Message**: `Circular inheritance detected: role_a → role_b → role_a`

**E401 - Parent Role Not Found**
```yaml
role:
  name: "child_role"
  inherits_from: "missing_parent"
```
**Message**: `Parent role 'missing_parent' not found for role 'child_role'`

## Warning Categories

#### 1. Dead Code Warnings (WARNING)
**W001 - Unused Role**
```yaml
# Role defined but never referenced
role:
  name: "unused_role"
  # ... definition
```
**Message**: `Role 'unused_role' is defined but never invoked by any playbook`
**Impact**: Repository bloat, maintenance overhead

**W002 - Unreachable Playbook**
```yaml
# Playbook with no external triggers or internal references
playbook:
  name: "isolated_playbook"
  cadence:
    frequency: "on_demand"  # No trigger events
```
**Message**: `Playbook 'isolated_playbook' is not reachable from any entry point`

**W003 - Unused Deliverable**
```yaml
# Deliverable produced but never consumed
outputs:
  - deliverable:
      name: "orphaned_output"
      type: "data"
```
**Message**: `Deliverable 'orphaned_output' is produced but never consumed`

#### 2. Resource Warnings (WARNING)
**W100 - Resource Over-allocation**
```yaml
# Team with insufficient capacity
team:
  resources:
    - resource:
        type: "time"
        allocation: 40
        unit: "hours/week"

# But roles require 60+ hours/week total
```
**Message**: `Team 'growth-ops' may be over-allocated: 62h required vs 40h available`

**W101 - Missing Resource Definition**
```yaml
# Task requires attention but team has no attention budget
task:
  name: "strategic_planning"
  # Implicitly requires attention resource
```
**Message**: `Task 'strategic_planning' likely requires 'attention' resource but team has no attention budget`

#### 3. Quality Warnings (WARNING)
**W200 - Missing Error Handling**
```yaml
task:
  name: "external_api_call"
  execution_type: "algorithmic"
  # No issues block defined for network/API failures
```
**Message**: `Task 'external_api_call' calls external service but has no error handling defined`

**W201 - Incomplete Validation Rules**
```yaml
deliverable:
  name: "user_input"
  type: "data"
  format: "json"
  # No validation_rules defined for user input
```
**Message**: `User input deliverable 'user_input' has no validation rules defined`

## Info Categories

#### 1. Optimization Opportunities (INFO)
**I001 - Redundant Deliverable Definition**
```yaml
# Same deliverable defined multiple times with identical schemas
```
**Message**: `Deliverable 'user_profile' defined identically in 3 locations. Consider consolidating.`

**I002 - Inefficient Workflow Pattern**
```yaml
# Sequential tasks that could be parallel
steps:
  - task: "independent_task_a"
  - task: "independent_task_b"  # Could run in parallel
```
**Message**: `Tasks 'independent_task_a' and 'independent_task_b' have no dependencies and could run in parallel`

**I003 - Missing Documentation**
```yaml
role:
  name: "complex_role"
  description: ""  # Empty description
```
**Message**: `Role 'complex_role' has empty description. Consider adding documentation.`

## Error Reporting Format

### Console Output
```
❌ ERROR E200: Missing Interface Implementation
  └─ File: L0/sales/roles/account-manager.busy:15
  └─ Role interface declares input 'lead_data' but no task consumes it
  └─ Fix: Add task that consumes 'lead_data' or remove from interface

⚠️  WARNING W001: Unused Role
  └─ File: L0/support/roles/escalation-manager.busy:1
  └─ Role 'escalation_manager' is defined but never invoked
  └─ Consider: Remove role or add playbook that uses it

ℹ️  INFO I002: Optimization Opportunity
  └─ File: L0/ops/playbooks/daily-standup.busy:12
  └─ Tasks could run in parallel: 'collect_metrics', 'generate_reports'
  └─ Suggestion: Use parallel execution to reduce timeline

📊 Summary:
  ├─ 1 error (blocks compilation)
  ├─ 1 warning (may cause issues)
  ├─ 1 info (optimization opportunity)
  └─ 23 files processed in 0.8s
```

### JSON Output
```json
{
  "summary": {
    "errors": 1,
    "warnings": 1,
    "info": 1,
    "files_processed": 23,
    "duration_ms": 800
  },
  "issues": [
    {
      "severity": "error",
      "code": "E200",
      "title": "Missing Interface Implementation",
      "message": "Role interface declares input 'lead_data' but no task consumes it",
      "file": "L0/sales/roles/account-manager.busy",
      "line": 15,
      "column": 12,
      "fix_suggestion": "Add task that consumes 'lead_data' or remove from interface",
      "related_files": []
    }
  ],
  "dependency_graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

### HTML Report
- Interactive dependency graph visualization
- Filterable issue list by severity/category
- File-by-file breakdown with syntax highlighting
- Quick fix suggestions with code examples
- Progress tracking for issue resolution

## Error Recovery Strategies

### Graceful Degradation
```typescript
// Continue analysis even with errors
class ErrorRecoveryParser {
  parseTask(taskNode: YAMLNode): Task | null {
    try {
      return this.parseTaskStrict(taskNode)
    } catch (error) {
      this.reportError(error)
      return this.parseTaskLenient(taskNode) // Best-effort parsing
    }
  }
}
```

### Incremental Fixes
```typescript
// Allow partial compilation with warnings
interface CompilationResult {
  success: boolean
  ast: BusyAST | null
  errors: CompilerError[]
  warnings: CompilerWarning[]
  canProceedToRuntime: boolean  // true if only warnings
}
```

### Auto-Fix Suggestions
```typescript
interface AutoFix {
  title: string
  description: string
  changes: FileChange[]
  confidence: "high" | "medium" | "low"
}

interface FileChange {
  file: string
  operation: "insert" | "replace" | "delete"
  line: number
  oldText?: string
  newText: string
}
```

## Integration with IDE

### Real-time Validation
- Show errors as red underlines
- Show warnings as yellow underlines
- Show info as blue underlines
- Hover for detailed error messages

### Quick Fixes
- Auto-complete for deliverable names
- Generate missing task implementations
- Fix common type mismatches
- Add missing validation rules

### Refactoring Support
- Rename deliverable across all files
- Extract common task patterns to roles
- Inline unused deliverable definitions
- Convert sequential to parallel tasks