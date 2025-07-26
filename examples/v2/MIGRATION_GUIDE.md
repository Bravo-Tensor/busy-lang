# BUSY v1.0 to v2.0 Migration Guide

This guide shows how to migrate existing BUSY v1.0 files to the new v2.0 syntax and patterns.

## Overview of Changes

### 1. Version Declaration
```yaml
# v1.0
version: "1.0.0"

# v2.0
version: "2.0"
```

### 2. Import Changes
```yaml
# v1.0
imports:
  - tool: "salesforce"
    capability: "lead-management"

# v2.0
imports:
  - capability: "lead-management"
    version: "^2.0"
  - tool: "salesforce"
    version: "^2.0"
```

### 3. Task → Step + Capability Migration

**Step 1: Extract Capabilities**

Create separate capability definitions:

```yaml
# NEW: capabilities/process-capabilities.busy
version: "2.0"
metadata:
  name: "Process Capabilities"
  description: "Core process capabilities"
  layer: "L0"

capabilities:
  - capability:
      name: "qualify-lead"
      description: "Assess lead potential and fit"
      method: |
        Review lead information and company profile.
        Score lead based on qualification criteria.
        Determine if lead meets minimum requirements.
        Document qualification decision and reasoning.
      inputs:
        - name: "raw_lead"
          type: "data"
          format: "lead_info"
          fields:
            - name: "company_name"
              type: "string"
              required: true
            - name: "contact_email"
              type: "string"
              required: true
            - name: "lead_source"
              type: "string" 
              required: true
      outputs:
        - name: "qualified_lead"
          type: "data"
          format: "qualification_result"
          fields:
            - name: "qualification_status"
              type: "string"
              required: true
            - name: "score"
              type: "number"
              required: true
            - name: "notes"
              type: "string"
              required: false
```

**Step 2: Update Role Definitions**

```yaml
# v1.0
role:
  name: "sales-rep"
  tasks:
    - task:
        name: "qualify_lead"
        execution_type: "human"
        ui_type: "form"
        inputs: [...]
        outputs: [...]
  responsibilities:
    - "Maintain lead quality above 80%"

# v2.0  
role:
  name: "sales-rep"
  capabilities:
    - "qualify-lead"         # Reference to capability definition
    - "schedule-meetings"
    - "update-crm"
  responsibilities:
    - "maintain-lead-quality"  # Reference to responsibility definition
```

**Step 3: Update Playbook Steps**

```yaml
# v1.0
steps:
  - name: "qualify_lead"
    execution_type: "human"
    ui_type: "form"
    agent_prompt: "Review lead and determine qualification"
    inputs: [...]
    outputs: [...]

# v2.0
steps:
  - step:
      name: "qualify_lead"
      method: |
        Review lead information and company profile.
        Score lead based on qualification criteria.
        Determine if lead meets minimum requirements.
        Document qualification decision and reasoning.
      requirements:
        - name: "sales_rep"
          priority:
            - specific: "senior_sales_rep_jane"
            - characteristics:
                experience_years: ">2"
                capabilities: ["qualify-lead"]
      inputs: [...]
      outputs: [...]
```

### 4. Resource Management Migration

**Step 1: Define Resources Explicitly**

```yaml
# v1.0 (implicit)
resources:
  - type: "people"
    allocation: 2
    unit: "FTE"

# v2.0 (explicit)
resources:
  - resource:
      name: "sales_team_members"
      characteristics:
        type: "people"
        roles: ["sales_rep", "sales_manager"]
        capacity_fte: 2
        capabilities: ["qualify-lead", "close-deals", "manage-pipeline"]
  
  - resource:
      name: "jane_doe"
      extends: "sales_team_members"
      characteristics:
        type: "person"
        role: "senior_sales_rep"
        experience_years: 5
        capabilities: ["qualify-lead", "close-complex-deals", "mentor-juniors"]
```

**Step 2: Add Resource Requirements**

```yaml
# v2.0
step:
  name: "complex_deal_negotiation"
  requirements:
    - name: "negotiator"
      priority:
        - specific: "jane_doe"                    # Prefer Jane for complex deals
        - characteristics:                        # Fallback to experienced rep
            experience_years: ">3"
            capabilities: ["close-complex-deals"]
        - characteristics:                        # Emergency fallback
            capabilities: ["qualify-lead"]
          emergency:
            warning: "Using junior rep for complex negotiation"
```

### 5. Responsibility Migration

**Step 1: Extract Responsibility Definitions**

```yaml
# NEW: responsibilities/quality-responsibilities.busy
responsibilities:
  - responsibility:
      name: "maintain-lead-quality"
      description: "Ensure lead qualification accuracy stays above 80%"
      method: |
        Track qualification accuracy for each completed lead.
        Calculate rolling accuracy over 30-day windows.
        If accuracy drops below 80%, analyze failure patterns.
        Implement coaching or process improvements.
        Alert sales manager if accuracy falls below 70%.
        Generate weekly quality reports.
      inputs: "none"
      outputs:
        - name: "quality_alert"
          type: "notification"
          format: "alert"
          fields:
            - name: "current_accuracy"
              type: "number"
              required: true
            - name: "trend"
              type: "string"
              required: true
            - name: "recommended_action"
              type: "string"
              required: false
```

### 6. Complete Migration Example

**Before (v1.0)**:
```yaml
version: "1.0.0"
metadata:
  name: "Sales Team"
  layer: "L0"

imports:
  - tool: "salesforce"
    capability: "crm-management"

role:
  name: "sales-rep"
  tasks:
    - task:
        name: "qualify_lead"
        execution_type: "human"
        ui_type: "form"
        inputs:
          - name: "raw_lead"
            type: "data"
            required_fields: ["name", "email"]
        outputs:
          - name: "qualified_lead"
            type: "data"
            required_fields: ["status", "score"]
  responsibilities:
    - "Maintain lead quality above 80%"
```

**After (v2.0)**:
```yaml
# capabilities/sales-capabilities.busy
version: "2.0"
metadata:
  name: "Sales Capabilities"
  layer: "L0"

capabilities:
  - capability:
      name: "qualify-lead" 
      description: "Assess lead potential and fit"
      method: |
        Review lead information and score against criteria.
        Determine qualification status and document reasoning.
      inputs:
        - name: "raw_lead"
          type: "data"
          fields:
            - name: "name"
              type: "string"
              required: true
            - name: "email"
              type: "string"
              required: true
      outputs:
        - name: "qualified_lead"
          type: "data"
          fields:
            - name: "status"
              type: "string"
              required: true
            - name: "score"
              type: "number"
              required: true

responsibilities:
  - responsibility:
      name: "maintain-lead-quality"
      description: "Ensure lead qualification accuracy stays above 80%"
      method: |
        Monitor qualification accuracy continuously.
        Alert when accuracy drops below threshold.
      inputs: "none"
      outputs:
        - name: "quality_alert"
          type: "notification"
          fields:
            - name: "current_accuracy"
              type: "number"
              required: true

# roles/sales-rep.busy  
version: "2.0"
metadata:
  name: "Sales Representative"
  layer: "L0"

imports:
  - capability: "qualify-lead"
  - tool: "salesforce"

role:
  name: "sales-rep"
  capabilities:
    - "qualify-lead"
  responsibilities:
    - "maintain-lead-quality"
```

## Automated Migration Tools

The BUSY compiler will include migration utilities:

```bash
# Analyze v1.0 files for migration
busy migrate analyze ./src/

# Convert v1.0 to v2.0 automatically  
busy migrate convert ./src/ --output ./v2/

# Validate migrated files
busy migrate validate ./v2/
```

## Migration Checklist

- [ ] Update version to "2.0"
- [ ] Extract task definitions into capability files
- [ ] Convert responsibility strings to responsibility definitions
- [ ] Update role definitions to use capability/responsibility references
- [ ] Remove execution_type, ui_type, agent_prompt fields from steps
- [ ] Add method field to all steps with detailed instructions
- [ ] Define resources explicitly with characteristics
- [ ] Add resource requirements to steps with priority chains
- [ ] Update import statements for new syntax
- [ ] Test compilation with v2.0 compiler
- [ ] Validate runtime behavior matches expectations

## Benefits After Migration

1. **Cleaner Separation**: Business logic separated from implementation details
2. **Better Reusability**: Capabilities can be shared across teams/processes
3. **Runtime Flexibility**: Same specs work with different execution strategies
4. **Resource Evolution**: Can start specific and become abstract over time
5. **Graceful Degradation**: Built-in fallback chains for resilience