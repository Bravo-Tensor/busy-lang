# BUSY Compiler Validation Errors Reference

**Version**: 1.0.0  
**Purpose**: Complete reference for all validation errors, warnings, and resolution strategies

## Error Categories

### 1. Schema Validation Errors

These errors occur when BUSY files don't conform to the JSON schema.

#### Required Field Errors
- **Missing version**: `version field is required`
- **Missing metadata**: `metadata field is required`
- **Missing metadata.name**: `metadata.name field is required`
- **Missing metadata.description**: `metadata.description field is required`
- **Missing metadata.layer**: `metadata.layer field is required`

#### Format Validation Errors
- **Invalid version format**: `Invalid version format 'x.y.z.w'. Expected semver format (e.g., '1.0' or '1.0.0')`
- **Invalid layer value**: `metadata.layer must be one of: L0, L1, L2`
- **Invalid team type**: `team.type must be one of: stream-aligned, enabling, complicated-subsystem, platform`
- **Invalid execution type**: `execution_type must be one of: algorithmic, ai_agent, human, human_creative`
- **Invalid deliverable type**: `deliverable.type must be one of: document, data, decision, approval`
- **Invalid frequency**: `cadence.frequency must be one of: daily, weekly, monthly, quarterly, on_demand, triggered`
- **Invalid resolution type**: `resolution.type must be one of: escalate, override, delegate, pause, ai_assist`
- **Invalid ui_type**: `ui_type must be one of: form, meeting, writing_session, strategy_session`
- **Invalid rule_type**: `rule_type must be one of: required, format, range, dependency, conflict`
- **Invalid severity**: `severity must be one of: error, warning, info`

### 2. Semantic Validation Errors

These errors occur during semantic analysis after successful parsing.

#### Naming Convention Errors

**Error Code**: `NAMING_CONVENTION`  
**Severity**: Error  
**Category**: Semantic

- **Role naming**: `Role name 'role_name' must be kebab-case (lowercase with hyphens)`
  - **Fix**: Change `role_name` to `role-name`
  - **Pattern**: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

- **Playbook naming**: `Playbook name 'playbook_name' must be kebab-case (lowercase with hyphens)`
  - **Fix**: Change `playbook_name` to `playbook-name`
  - **Pattern**: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

- **Task naming**: `Task name 'task-name' must be snake_case`
  - **Fix**: Change `task-name` to `task_name`
  - **Pattern**: `^[a-z][a-z0-9_]*$`

#### Layer Consistency Errors

**Error Code**: `LAYER_MISMATCH`  
**Severity**: Error  
**Category**: Semantic

- **Layer mismatch**: `Layer mismatch: metadata declares 'L1' but file is in 'L0' directory`
  - **Fix**: Either move file to correct layer directory or update metadata.layer

#### Symbol Resolution Errors

**Error Code**: `UNDEFINED_PARENT_ROLE`  
**Severity**: Error  
**Category**: Semantic

- **Undefined inheritance**: `Role 'junior-developer' inherits from undefined role 'senior-developer'`
  - **Fix**: Define the parent role or remove the inheritance
  - **Suggested fix**: `Define role 'senior-developer' or remove inheritance`

**Error Code**: `UNDEFINED_SYMBOL`  
**Severity**: Error  
**Category**: Semantic

- **Undefined reference**: `Symbol 'undefined-role' referenced but not defined`
  - **Fix**: Define the referenced symbol or remove the reference

#### Duplicate Symbol Errors

**Error Code**: `DUPLICATE_SYMBOL`  
**Severity**: Error  
**Category**: Semantic

- **Duplicate task**: `Duplicate task name 'validate_input' in role 'developer'`
  - **Fix**: Rename one of the duplicate tasks to have unique names

- **Duplicate step**: `Duplicate step name 'review_code' in playbook 'code-review'`
  - **Fix**: Rename one of the duplicate steps to have unique names

#### Execution Type Validation Errors

**Error Code**: `EXECUTION_TYPE_MISMATCH`  
**Severity**: Error  
**Category**: Semantic

- **Missing agent prompt**: `AI agent task 'analyze_data' must specify an agent_prompt`
  - **Fix**: Add `agent_prompt` field to the AI agent task

#### Duration Format Errors

**Error Code**: `INVALID_DURATION_FORMAT`  
**Severity**: Error  
**Category**: Semantic

- **Invalid duration**: `Invalid duration format '2hours' for task 'complex_task'. Use format like '30m', '2h', '1d'`
  - **Fix**: Change duration to valid format: `30m`, `2h`, `1d`
  - **Pattern**: `^\d+[mhd]$`

### 3. Analysis Errors

These errors occur during advanced semantic analysis.

#### Semantic Analysis Errors

**Error Code**: `SEMANTIC_ANALYSIS_FAILED`  
**Severity**: Critical  
**Category**: Semantic

- **Analysis failure**: `Semantic analysis failed: [specific error message]`
  - **Fix**: Address the underlying issue mentioned in the error message

### 4. Validation Warnings

These are non-blocking issues that should be addressed for better code quality.

#### Dead Code Warnings

**Error Code**: `DEAD_CODE`  
**Severity**: Warning  
**Category**: Optimization

- **Unused symbol**: `Symbol 'unused-role' is defined but never used`
  - **Fix**: Remove the unused symbol or add references to it
  - **Recommendation**: `Remove unused symbol 'unused-role' or add references to it`

#### Import Warnings

**Error Code**: `UNUSED_IMPORT`  
**Severity**: Warning  
**Category**: Optimization

- **Unused import**: `Import 'salesforce' is declared but never used`
  - **Fix**: Remove the unused import
  - **Recommendation**: `Remove unused import 'salesforce'`

#### Naming Convention Warnings

**Error Code**: `NAMING_CONVENTION`  
**Severity**: Warning  
**Category**: Best Practice

- **Role naming**: `Role name 'roleName' does not follow naming conventions`
  - **Fix**: Use kebab-case for role names
  - **Recommendation**: `Use kebab-case for role names (e.g., "senior-developer")`

- **Playbook naming**: `Playbook name 'playbookName' does not follow naming conventions`
  - **Fix**: Use kebab-case for playbook names
  - **Recommendation**: `Use kebab-case for playbook names (e.g., "onboard-new-client")`

- **Task naming**: `Task name 'taskName' does not follow naming conventions`
  - **Fix**: Use snake_case for task names
  - **Recommendation**: `Use snake_case for task names (e.g., "review_pull_request")`

#### Execution Type Warnings

**Error Code**: `EXECUTION_TYPE_SUGGESTION`  
**Severity**: Warning  
**Category**: Best Practice

- **Missing algorithm**: `Algorithmic task 'process_data' should specify an algorithm`
  - **Fix**: Add `algorithm` field to the task

- **Missing UI type**: `Human task 'review_document' should specify a ui_type`
  - **Fix**: Add `ui_type` field to the task

#### Empty Structure Warnings

**Error Code**: `EMPTY_STRUCTURE`  
**Severity**: Warning  
**Category**: Best Practice

- **No tasks**: `Role 'manager' has no tasks defined`
  - **Fix**: Add tasks to the role or remove if not needed

- **No steps**: `Playbook 'empty-process' has no steps defined`
  - **Fix**: Add steps to the playbook or remove if not needed

- **No roles or playbooks**: `Team 'support' has no roles or playbooks defined`
  - **Fix**: Add roles or playbooks to the team

- **No trigger events**: `Triggered playbook 'incident-response' has no trigger events defined`
  - **Fix**: Add trigger_events to the cadence

### 5. Analysis Info Messages

These are informational messages about the analysis process.

#### Completion Messages

**Error Code**: `SEMANTIC_ANALYSIS_COMPLETE`  
**Severity**: Info  
**Category**: Metric

- **Analysis complete**: `Semantic analysis completed. Analyzed 177 symbols.`

#### Common Import Messages

**Error Code**: `COMMON_IMPORT`  
**Severity**: Info  
**Category**: Discovery

- **Common import**: `Import 'stripe' is used in 5 files`

## Error Resolution Strategies

### 1. Schema Validation Issues

**Strategy**: Fix schema violations first, as they prevent parsing

1. **Check YAML syntax**: Ensure valid YAML formatting
2. **Verify required fields**: Add missing required fields
3. **Check enum values**: Ensure values match allowed options
4. **Validate patterns**: Check naming patterns and formats

### 2. Naming Convention Issues

**Strategy**: Apply consistent naming conventions

1. **Roles and Playbooks**: Use kebab-case (`project-coordinator`, `client-onboarding`)
2. **Tasks and Deliverables**: Use snake_case (`validate_input`, `client_contract`)
3. **Files and Directories**: Use kebab-case throughout

### 3. Symbol Resolution Issues

**Strategy**: Ensure all references are defined

1. **Check inheritance chains**: Verify parent roles exist
2. **Validate references**: Ensure all referenced symbols are defined
3. **Check imports**: Verify imported tools/advisors are used

### 4. Dead Code Issues

**Strategy**: Remove unused symbols or add references

1. **Identify unused symbols**: Review dead code warnings
2. **Remove if unnecessary**: Delete unused roles, playbooks, tasks
3. **Add references if needed**: Use symbols if they should be active

### 5. Execution Type Issues

**Strategy**: Provide required fields for each execution type

1. **AI Agent tasks**: Must have `agent_prompt`
2. **Algorithmic tasks**: Should have `algorithm`
3. **Human tasks**: Should have `ui_type`
4. **Human creative tasks**: No additional requirements

## Validation Workflow

### 1. Pre-Validation Checklist

Before running validation:

- [ ] Check YAML syntax
- [ ] Verify file structure matches directory organization
- [ ] Ensure all required fields are present
- [ ] Check naming conventions
- [ ] Validate duration formats

### 2. Validation Process

1. **Schema Validation**: Checks structure and required fields
2. **Parse Validation**: Validates YAML and basic semantics
3. **Semantic Analysis**: Checks symbol resolution and usage
4. **Dead Code Detection**: Identifies unused symbols
5. **Interface Validation**: Checks compatibility between components

### 3. Error Prioritization

Fix errors in this order:

1. **Critical errors**: Schema violations, parse failures
2. **Semantic errors**: Naming conventions, undefined symbols
3. **Warnings**: Dead code, missing optional fields
4. **Info messages**: Optimization suggestions

### 4. Testing Strategy

After fixing errors:

1. **Re-run validation**: Ensure all errors are resolved
2. **Check health score**: Aim for 100/100 health score
3. **Test compilation**: Verify files compile successfully
4. **Review warnings**: Address remaining warnings

## Common Error Patterns

### 1. Case Sensitivity Issues

**Problem**: Using wrong case for identifiers
**Solution**: Follow naming conventions strictly

```yaml
# Wrong
role:
  name: "ProjectCoordinator"  # Should be kebab-case
  tasks:
    - name: "validateInput"   # Should be snake_case

# Correct
role:
  name: "project-coordinator"
  tasks:
    - name: "validate_input"
```

### 2. Missing Required Fields

**Problem**: Omitting required fields
**Solution**: Include all required fields

```yaml
# Wrong
role:
  name: "coordinator"
  # Missing description

# Correct
role:
  name: "coordinator"
  description: "Coordinates project activities"
```

### 3. Invalid Execution Types

**Problem**: Using wrong execution type requirements
**Solution**: Match fields to execution types

```yaml
# Wrong
- name: "ai_task"
  execution_type: "ai_agent"
  # Missing agent_prompt

# Correct
- name: "ai_task"
  execution_type: "ai_agent"
  agent_prompt: "Analyze the data and provide insights"
```

### 4. Layer Mismatches

**Problem**: File location doesn't match declared layer
**Solution**: Ensure consistency between directory and metadata

```yaml
# Wrong: In L0 directory but declares L1
metadata:
  layer: "L1"  # Should be L0

# Correct: In L0 directory
metadata:
  layer: "L0"
```

### 5. Undefined References

**Problem**: Referencing non-existent symbols
**Solution**: Define referenced symbols or remove references

```yaml
# Wrong
role:
  name: "junior-dev"
  inherits_from: "senior-dev"  # senior-dev not defined

# Correct: Define the parent role first
role:
  name: "senior-dev"
  description: "Senior developer role"
---
role:
  name: "junior-dev"
  inherits_from: "senior-dev"
```

This comprehensive reference covers all validation errors and provides clear resolution strategies for maintaining high-quality BUSY files.