# BUSY Language Developer and LLM Assistant Guide

**Version**: 1.0.0  
**Purpose**: Comprehensive guide for developers and LLM assistants working with BUSY files

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Workflow](#development-workflow)
3. [LLM Assistant Guidelines](#llm-assistant-guidelines)
4. [Process Interview Decomposition](#process-interview-decomposition)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)
7. [Examples](#examples)

## Quick Start

### Installation and Setup

```bash
# Clone the repository
git clone https://github.com/busy-lang/compiler
cd compiler

# Install dependencies
npm install

# Build the compiler
npm run build

# Run validation on examples
npm run dev -- analyze ../examples/solo-photography-business/
```

### Basic Commands

```bash
# Validate BUSY files
npm run dev -- validate path/to/files/

# Analyze with full semantic analysis
npm run dev -- analyze path/to/files/

# Watch for changes
npm run dev -- watch path/to/files/
```

### File Structure Requirements

```
project/
├── L0/                    # Operational layer
│   ├── team-name/
│   │   ├── team.busy      # Team definition
│   │   ├── roles/         # Individual roles
│   │   └── playbooks/     # Repeatable processes
├── L1/                    # Management layer
└── L2/                    # Strategic layer
```

## Development Workflow

### 1. Planning Phase

**Before creating BUSY files:**

1. **Map the organization**: Identify teams, roles, and key processes
2. **Define layers**: Categorize activities into L0 (operational), L1 (management), L2 (strategic)
3. **Identify interfaces**: Determine how teams and roles interact
4. **Plan dependencies**: Understand workflow dependencies and data flows

### 2. Development Process

**Recommended development order:**

1. **Create team structures** (`team.busy` files)
2. **Define roles** within teams
3. **Create playbooks** for repeatable processes
4. **Validate and iterate** until 100% health score

### 3. Validation Strategy

**Continuous validation approach:**

```bash
# Quick syntax check
npm run dev -- validate .

# Full semantic analysis
npm run dev -- analyze .

# Watch mode during development
npm run dev -- watch .
```

**Target metrics:**
- Health Score: 100/100
- Zero validation errors
- Zero warnings (or justified warnings)
- All symbols used (no dead code)

### 4. Quality Assurance

**Quality checklist:**

- [ ] All files follow naming conventions
- [ ] Layer consistency maintained
- [ ] No dead code or unused imports
- [ ] Proper execution type requirements
- [ ] Complete documentation (descriptions)
- [ ] Interface compatibility verified
- [ ] Duration estimates provided

## LLM Assistant Guidelines

### Core Principles

1. **Always validate syntax** before suggesting changes
2. **Maintain architectural consistency** across L0/L1/L2 layers
3. **Follow naming conventions** strictly
4. **Suggest optimizations** for performance and clarity
5. **Check for completeness** of required fields
6. **Provide context** for recommendations

### Assistance Workflow

#### 1. Initial Assessment

When helping with BUSY files:

```
1. Analyze the existing structure
2. Identify the organizational layer (L0/L1/L2)
3. Understand the team/role/playbook context
4. Check for naming convention compliance
5. Verify required fields are present
```

#### 2. Recommendations

**Always provide:**
- Specific syntax corrections
- Explanation of why changes are needed
- Alternative approaches when applicable
- Validation steps to verify changes

**Example response format:**
```markdown
## Issue Identified
Role name 'project_manager' violates naming convention.

## Solution
Change to kebab-case: `project-manager`

## Rationale
BUSY language requires roles to use kebab-case for consistency and compatibility.

## Validation
After making changes, run: `npm run dev -- validate .`
```

#### 3. Code Generation

**When generating new BUSY files:**

1. **Start with template structure**
2. **Fill in required fields first**
3. **Add optional fields as needed**
4. **Include meaningful descriptions**
5. **Validate against schema**

### Common Assistance Patterns

#### Creating a New Role

```yaml
version: "1.0.0"
metadata:
  name: "[Human readable name]"
  description: "[Detailed description of purpose and responsibilities]"
  layer: "[L0|L1|L2]"

role:
  name: "[kebab-case-name]"
  description: "[Role scope and primary responsibilities]"
  
  # Optional but recommended
  responsibilities:
    - "[Primary responsibility]"
    - "[Secondary responsibility]"
  
  # Define core tasks
  tasks:
    - name: "[snake_case_task_name]"
      description: "[Clear task description]"
      execution_type: "[human|ai_agent|algorithmic|human_creative]"
      estimated_duration: "[2h|30m|1d]"
      
      # Define inputs/outputs for clarity
      inputs:
        - name: "[input_name]"
          type: "[document|data|decision|approval]"
          format: "[json|pdf|email|etc]"
      
      outputs:
        - name: "[output_name]"
          type: "[document|data|decision|approval]"
          format: "[json|pdf|email|etc]"
```

#### Creating a New Playbook

```yaml
version: "1.0.0"
metadata:
  name: "[Human readable name]"
  description: "[Detailed description of process and outcomes]"
  layer: "[L0|L1|L2]"

playbook:
  name: "[kebab-case-name]"
  description: "[Process purpose and key outcomes]"
  
  cadence:
    frequency: "[daily|weekly|monthly|quarterly|on_demand|triggered]"
    # Include trigger_events for triggered playbooks
    trigger_events: ["[event_name]"]
  
  # Define what triggers the process
  inputs:
    - name: "[trigger_input]"
      type: "[document|data|decision|approval]"
      format: "[json|pdf|email|etc]"
  
  # Define what the process produces
  outputs:
    - name: "[process_output]"
      type: "[document|data|decision|approval]"
      format: "[json|pdf|email|etc]"
  
  # Break down into concrete steps
  steps:
    - name: "[step_name]"
      description: "[Step purpose and outcome]"
      execution_type: "[human|ai_agent|algorithmic|human_creative]"
      estimated_duration: "[time_estimate]"
      # ... additional task fields
```

## Process Interview Decomposition

### Interview Analysis Framework

**When decomposing process interviews into BUSY files:**

#### 1. Interview Parsing

**Key information to extract:**

- **Roles mentioned**: Who does what?
- **Processes described**: What are the repeatable workflows?
- **Inputs/outputs**: What information flows between steps?
- **Decision points**: Where are approvals or choices made?
- **Escalation paths**: How are issues resolved?
- **Timing**: How long do tasks take? How often do they occur?

#### 2. Structural Analysis

**Organize information by:**

```
1. Organizational Layer
   - L0: Day-to-day operations
   - L1: Team management and coordination
   - L2: Strategic planning and oversight

2. Team Boundaries
   - Who works together regularly?
   - What are the team interfaces?
   - How do teams coordinate?

3. Role Definitions
   - What are individual responsibilities?
   - What tasks do people perform?
   - What skills are required?

4. Process Flows
   - What are the repeatable workflows?
   - What triggers processes?
   - What are the outcomes?
```

#### 3. Decomposition Process

**Step-by-step decomposition:**

1. **Identify Teams**
   ```
   - Extract team names and purposes
   - Classify team types (stream-aligned, enabling, etc.)
   - Map team interfaces and dependencies
   ```

2. **Define Roles**
   ```
   - List all mentioned roles
   - Group roles by team
   - Define responsibilities for each role
   - Identify role hierarchies and inheritance
   ```

3. **Extract Tasks**
   ```
   - Break down role responsibilities into atomic tasks
   - Classify execution types (human, AI, algorithmic)
   - Estimate durations based on interview data
   - Define inputs and outputs for each task
   ```

4. **Map Processes**
   ```
   - Identify repeatable workflows
   - Define process triggers and cadence
   - Break processes into sequential steps
   - Map inputs and outputs for each process
   ```

5. **Define Deliverables**
   ```
   - Identify all documents, data, and decisions
   - Classify deliverable types and formats
   - Define validation rules and requirements
   - Map deliverable flows between tasks
   ```

### Example Decomposition

**Interview Extract:**
> "The project manager coordinates with clients weekly to review project status. They collect updates from the development team and design team, compile a status report, and send it to the client. If there are any issues, they escalate to the team lead."

**Decomposition:**

1. **Role**: `project-manager`
2. **Playbook**: `weekly-client-review`
3. **Tasks**:
   - `collect_team_updates`
   - `compile_status_report`
   - `send_client_update`
4. **Deliverables**:
   - `team_updates` (input)
   - `status_report` (intermediate)
   - `client_update` (output)
5. **Issue Resolution**: Escalate to `team-lead`

**Resulting BUSY Structure:**

```yaml
# roles/project-manager.busy
role:
  name: "project-manager"
  description: "Coordinates project activities and client communications"
  
  tasks:
    - name: "collect_team_updates"
      description: "Gather progress updates from development and design teams"
      execution_type: "human"
      estimated_duration: "30m"
      
      outputs:
        - name: "team_updates"
          type: "data"
          format: "json"

# playbooks/weekly-client-review.busy
playbook:
  name: "weekly-client-review"
  description: "Weekly status review and client communication process"
  
  cadence:
    frequency: "weekly"
    schedule: "0 9 * * 1"  # Monday 9 AM
  
  steps:
    - name: "collect_team_updates"
      description: "Gather updates from all teams"
      execution_type: "human"
      estimated_duration: "30m"
    
    - name: "compile_status_report"
      description: "Create comprehensive status report"
      execution_type: "human"
      estimated_duration: "45m"
      
      issues:
        - issue_type: "project_delays"
          resolution:
            type: "escalate"
            target: "team-lead"
            timeout: "24h"
```

## Common Patterns

### 1. Role Inheritance

**When to use:**
- Similar roles with slight variations
- Progressive skill levels (junior → senior)
- Specialized roles with common base

**Pattern:**
```yaml
# Base role
role:
  name: "developer"
  description: "Base developer role"
  
  tasks:
    - name: "write_code"
      description: "Write and test code"
      execution_type: "human_creative"

# Specialized role
role:
  name: "senior-developer"
  inherits_from: "developer"
  description: "Senior developer with additional responsibilities"
  
  tasks:
    - name: "review_code"
      description: "Review code from other developers"
      execution_type: "human"
    - name: "mentor_junior_developers"
      description: "Provide guidance to junior team members"
      execution_type: "human"
```

### 2. Process Chains

**When to use:**
- Sequential workflows
- Handoffs between roles
- Multi-step approval processes

**Pattern:**
```yaml
playbook:
  name: "content-approval-process"
  description: "Multi-stage content approval workflow"
  
  steps:
    - name: "draft_content"
      description: "Create initial content draft"
      execution_type: "human_creative"
    
    - name: "review_content"
      description: "Review for accuracy and style"
      execution_type: "human"
    
    - name: "legal_review"
      description: "Legal compliance review"
      execution_type: "human"
    
    - name: "final_approval"
      description: "Final approval for publication"
      execution_type: "human"
```

### 3. Exception Handling

**When to use:**
- Error conditions
- Escalation scenarios
- Fallback processes

**Pattern:**
```yaml
- name: "process_payment"
  description: "Process customer payment"
  execution_type: "algorithmic"
  
  issues:
    - issue_type: "payment_failure"
      resolution:
        type: "ai_assist"
        agent_prompt: "Analyze payment failure and suggest resolution"
        timeout: "5m"
        fallback:
          type: "escalate"
          target: "payment-specialist"
    
    - issue_type: "fraud_detection"
      resolution:
        type: "escalate"
        target: "security-team"
        timeout: "15m"
```

### 4. Interface Compatibility

**When to use:**
- Connecting different systems
- Team boundaries
- Data transformations

**Pattern:**
```yaml
# Producer role
role:
  name: "data-analyst"
  interfaces:
    outputs:
      - name: "analysis_report"
        type: "document"
        format: "json"
        schema:
          type: "json"
          definition: |
            {
              "insights": "array",
              "metrics": "object",
              "recommendations": "array"
            }

# Consumer role
role:
  name: "product-manager"
  interfaces:
    inputs:
      - name: "analysis_report"
        type: "document"
        format: "json"
        # Must match producer schema
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Naming Convention Violations

**Problem**: Mixed case or incorrect patterns
**Solution**: Follow strict naming conventions

```yaml
# Wrong
role:
  name: "ProjectManager"     # Should be kebab-case
  tasks:
    - name: "sendEmail"      # Should be snake_case

# Correct
role:
  name: "project-manager"
  tasks:
    - name: "send_email"
```

#### 2. Missing Required Fields

**Problem**: Incomplete definitions
**Solution**: Include all required fields

```yaml
# Wrong
role:
  name: "coordinator"
  # Missing description

# Correct
role:
  name: "coordinator"
  description: "Coordinates team activities and communications"
```

#### 3. Execution Type Mismatches

**Problem**: Missing type-specific fields
**Solution**: Include required fields for each execution type

```yaml
# Wrong
- name: "analyze_data"
  execution_type: "ai_agent"
  # Missing agent_prompt

# Correct
- name: "analyze_data"
  execution_type: "ai_agent"
  agent_prompt: "Analyze the data and provide insights on trends and patterns"
```

#### 4. Dead Code Issues

**Problem**: Defined but unused symbols
**Solution**: Remove unused symbols or add references

```yaml
# Create reference to unused role
team:
  name: "development"
  roles:
    - name: "unused-role"  # Now referenced
      description: "Previously unused role"
```

#### 5. Layer Violations

**Problem**: Inconsistent layer definitions
**Solution**: Match directory structure and metadata

```
# Directory: L0/team-name/
# File metadata must declare layer: "L0"
```

### Debugging Workflow

1. **Check syntax errors first**
   ```bash
   npm run dev -- validate .
   ```

2. **Review semantic errors**
   ```bash
   npm run dev -- analyze .
   ```

3. **Fix naming conventions**
   - Use kebab-case for roles and playbooks
   - Use snake_case for tasks and deliverables

4. **Verify layer consistency**
   - Check directory structure matches metadata
   - Ensure proper L0/L1/L2 organization

5. **Resolve symbol references**
   - Define all referenced symbols
   - Remove unused symbols or add references

6. **Validate execution types**
   - Add required fields for each execution type
   - Include appropriate optional fields

### Performance Optimization

#### 1. Minimize Dependencies

**Strategy**: Reduce coupling between components

```yaml
# Good: Loosely coupled
role:
  name: "data-processor"
  tasks:
    - name: "process_data"
      inputs:
        - name: "raw_data"
          type: "data"
          format: "json"  # Generic format
      outputs:
        - name: "processed_data"
          type: "data"
          format: "json"  # Generic format
```

#### 2. Optimize Task Granularity

**Strategy**: Balance atomicity with efficiency

```yaml
# Good: Appropriate granularity
- name: "validate_and_process_order"
  description: "Complete order validation and processing"
  execution_type: "algorithmic"
  estimated_duration: "5m"

# Avoid: Too granular
- name: "validate_order_step_1"
  description: "Validate order format"
  execution_type: "algorithmic"
  estimated_duration: "30s"
```

#### 3. Use Appropriate Execution Types

**Strategy**: Match execution type to task nature

```yaml
# Good: Appropriate execution types
- name: "generate_report"
  execution_type: "algorithmic"      # Data processing
  
- name: "analyze_market_trends"
  execution_type: "ai_agent"         # Analysis requiring intelligence
  
- name: "approve_budget"
  execution_type: "human"            # Decision requiring judgment
  
- name: "design_logo"
  execution_type: "human_creative"   # Creative work
```

## Examples

### Complete Role Example

```yaml
version: "1.0.0"
metadata:
  name: "Customer Success Manager"
  description: "Manages customer relationships and ensures satisfaction"
  layer: "L0"

imports:
  - tool: "salesforce"
    version: "^2.0.0"
  - advisor: "customer-success-advisor"
    interface: "relationship-management"

role:
  name: "customer-success-manager"
  description: "Builds and maintains customer relationships, ensures satisfaction and retention"
  
  onboarding:
    - step: "Learn CRM systems and customer data"
      duration: "2h"
    - step: "Review customer success playbooks"
      duration: "1h"
    - step: "Shadow senior CSM on customer calls"
      duration: "4h"
  
  responsibilities:
    - "Maintain regular contact with assigned customers"
    - "Monitor customer health scores and usage metrics"
    - "Identify expansion opportunities and risks"
    - "Coordinate with support team for issue resolution"
  
  tasks:
    - name: "conduct_quarterly_review"
      description: "Quarterly business review with key customers"
      execution_type: "human"
      ui_type: "meeting"
      estimated_duration: "2h"
      
      inputs:
        - name: "customer_health_metrics"
          type: "data"
          format: "json"
          required_fields: ["usage_score", "satisfaction_score", "support_tickets"]
        - name: "account_history"
          type: "document"
          format: "json"
      
      outputs:
        - name: "qbr_summary"
          type: "document"
          format: "pdf"
          schema:
            type: "json"
            definition: |
              {
                "customer_name": "string",
                "health_score": "number",
                "key_achievements": "array",
                "action_items": "array",
                "next_review_date": "string"
              }
      
      issues:
        - issue_type: "customer_dissatisfaction"
          resolution:
            type: "escalate"
            target: "customer-success-director"
            timeout: "24h"
        - issue_type: "churn_risk"
          resolution:
            type: "ai_assist"
            agent_prompt: "Analyze customer data and suggest retention strategies"
            context_gathering: ["usage_patterns", "support_history", "industry_trends"]
            timeout: "1h"
      
      tags: ["customer-review", "quarterly", "relationship-building"]
    
    - name: "monitor_customer_health"
      description: "Daily monitoring of customer health metrics"
      execution_type: "algorithmic"
      algorithm: "customer_health_calculator"
      estimated_duration: "15m"
      
      inputs:
        - name: "usage_data"
          type: "data"
          format: "json"
        - name: "support_ticket_data"
          type: "data"
          format: "json"
      
      outputs:
        - name: "health_score_update"
          type: "data"
          format: "json"
          validation_rules:
            - rule_type: "range"
              condition: "score >= 0 AND score <= 100"
              error_message: "Health score must be between 0 and 100"
      
      tags: ["monitoring", "daily", "automation"]
  
  interfaces:
    inputs:
      - name: "customer_assignments"
        type: "data"
        format: "json"
      - name: "support_escalations"
        type: "data"
        format: "json"
    
    outputs:
      - name: "customer_status_updates"
        type: "data"
        format: "json"
      - name: "expansion_opportunities"
        type: "data"
        format: "json"
```

### Complete Playbook Example

```yaml
version: "1.0.0"
metadata:
  name: "Monthly Customer Health Review"
  description: "Monthly process for reviewing customer health across all accounts"
  layer: "L1"

playbook:
  name: "monthly-customer-health-review"
  description: "Systematic review of customer health metrics and identification of at-risk accounts"
  
  cadence:
    frequency: "monthly"
    schedule: "0 9 1 * *"  # First day of month at 9 AM
  
  inputs:
    - name: "customer_health_data"
      type: "data"
      format: "json"
      required_fields: ["customer_id", "health_score", "usage_metrics", "support_tickets"]
    - name: "previous_month_actions"
      type: "document"
      format: "json"
  
  outputs:
    - name: "monthly_health_report"
      type: "document"
      format: "pdf"
      schema:
        type: "json"
        definition: |
          {
            "reporting_period": "string",
            "overall_health_score": "number",
            "at_risk_customers": "array",
            "improvement_actions": "array",
            "success_stories": "array"
          }
    - name: "action_plan"
      type: "document"
      format: "json"
      validation_rules:
        - rule_type: "required"
          condition: "action_items.length > 0"
          error_message: "Action plan must contain at least one action item"
  
  steps:
    - name: "aggregate_health_data"
      description: "Compile health data from all customer accounts"
      execution_type: "algorithmic"
      algorithm: "health_data_aggregator"
      estimated_duration: "30m"
      
      inputs:
        - name: "customer_health_data"
          type: "data"
          format: "json"
      
      outputs:
        - name: "aggregated_health_metrics"
          type: "data"
          format: "json"
    
    - name: "identify_at_risk_customers"
      description: "Identify customers with declining health scores"
      execution_type: "ai_agent"
      agent_prompt: "Analyze customer health data and identify accounts at risk of churn based on usage patterns, support tickets, and health score trends"
      context_gathering: ["historical_health_data", "industry_benchmarks", "churn_indicators"]
      estimated_duration: "45m"
      
      inputs:
        - name: "aggregated_health_metrics"
          type: "data"
          format: "json"
      
      outputs:
        - name: "at_risk_customer_list"
          type: "data"
          format: "json"
          validation_rules:
            - rule_type: "format"
              condition: "risk_score between 0 and 100"
              error_message: "Risk score must be between 0 and 100"
    
    - name: "create_action_plans"
      description: "Create specific action plans for at-risk customers"
      execution_type: "human"
      ui_type: "form"
      estimated_duration: "2h"
      
      inputs:
        - name: "at_risk_customer_list"
          type: "data"
          format: "json"
      
      outputs:
        - name: "customer_action_plans"
          type: "document"
          format: "json"
      
      issues:
        - issue_type: "high_risk_customer"
          resolution:
            type: "escalate"
            target: "customer-success-director"
            conditions: ["risk_score > 80"]
            timeout: "2h"
    
    - name: "generate_monthly_report"
      description: "Generate comprehensive monthly health report"
      execution_type: "algorithmic"
      algorithm: "monthly_report_generator"
      estimated_duration: "15m"
      
      inputs:
        - name: "aggregated_health_metrics"
          type: "data"
          format: "json"
        - name: "customer_action_plans"
          type: "document"
          format: "json"
      
      outputs:
        - name: "monthly_health_report"
          type: "document"
          format: "pdf"
    
    - name: "distribute_report"
      description: "Distribute report to stakeholders"
      execution_type: "algorithmic"
      algorithm: "report_distributor"
      estimated_duration: "5m"
      
      inputs:
        - name: "monthly_health_report"
          type: "document"
          format: "pdf"
      
      outputs:
        - name: "distribution_confirmation"
          type: "data"
          format: "json"
  
  issue_resolution:
    - type: "escalate"
      target: "customer-success-director"
      conditions: ["critical_customer_issues"]
      timeout: "4h"
    - type: "pause"
      conditions: ["data_quality_issues"]
      timeout: "24h"
      fallback:
        type: "escalate"
        target: "data-team"
```

This comprehensive guide provides everything needed for developers and LLM assistants to effectively work with BUSY files, from basic syntax to advanced patterns and troubleshooting strategies.