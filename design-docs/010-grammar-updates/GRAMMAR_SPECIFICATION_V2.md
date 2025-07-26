# BUSY Language Grammar Specification v2.0

## Overview
BUSY is a YAML-based domain-specific language for describing business organizations as code. This specification defines the formal grammar and syntax after the v2.0 refinements that introduce capabilities, remove execution types, and refine resource management.

## Core Grammar Rules

### 1. Program Structure
```yaml
# Top-level BUSY file
version: "2.0"
metadata:
  name: string
  description: string
  layer: "L0" | "L1" | "L2"
  
imports:
  - capability: string
    version: string?
  - tool: string
    version: string?
  - advisor: string
    interface: string?

teams:
  - team_definition

resources:
  - resource_definition

capabilities:
  - capability_definition

```

### 2. Capability Definition
```yaml
capability:
  name: string
  description: string
  method: string  # Multi-line description of how to perform this capability
  
  inputs:
    - name: string
      type: "data" | "document" | "decision" | "physical"
      format: string?
      fields:  # Required for data type
        - name: string
          type: string
          required: boolean
  
  outputs:
    - name: string
      type: "data" | "document" | "decision" | "physical"
      format: string?
      fields:  # Required for data type
        - name: string
          type: string
          required: boolean
```

### 3. Responsibility Definition
```yaml
responsibility:
  name: string
  description: string
  method: string  # Includes monitoring approach and enforcement actions
  
  inputs: "none" | input_spec[]  # Often "none" for monitoring responsibilities
  
  outputs:
    - name: string
      type: "notification" | "alert" | "report" | "data"
      format: string?
      fields:  # Required for data type
        - name: string
          type: string
          required: boolean
```

### 4. Resource Definition
```yaml
resource:
  name: string
  extends: string?  # Optional inheritance from another resource
  
  characteristics:  # Flexible key-value pairs
    # Standard characteristics
    location: string?
    owner: string?
    # Capabilities as characteristics
    capabilities: string[]?
    # Any other metadata
    [key: string]: any
```

### 5. Team Definition
```yaml
team:
  name: string
  type: "stream-aligned" | "enabling" | "complicated-subsystem" | "platform"
  description: string
  
  roles:
    - role_definition
    
  playbooks:
    - playbook_definition
    
  resources:
    - resource_reference
    
  governance:
    escalation_path: string
    decision_authority: string[]
```

### 6. Role Definition
```yaml
role:
  name: string
  description: string
  
  capabilities: string[]  # List of capability names this role provides
  
  responsibilities: string[]  # List of responsibility names this role maintains
  
  brings_resources:  # Resources the role holder brings
    - resource_definition
```

### 7. Playbook Definition
```yaml
playbook:
  name: string
  description: string
  cadence: cadence_spec
  
  inputs: input_spec[]
  outputs: output_spec[]
  
  steps:
    - step_definition
    
  issue_resolution:
    - resolution_definition
```

### 8. Step Definition
```yaml
step:
  name: string
  description: string
  method: string  # Detailed instructions for execution
  
  inputs: input_spec[]
  outputs: output_spec[]
  
  requirements:  # Resource requirements
    - requirement_definition
    
  responsibilities:  # Temporary responsibilities for this step
    - string
  
  issues:
    - issue_type: string
      resolution: resolution_spec
      
  estimated_duration: duration
```

### 9. Requirement Definition
```yaml
requirement:
  name: string  # Local name for the resource
  
  characteristics:  # What to match on
    [key: string]: any  # Including capabilities as a characteristic
    
  priority:  # Fallback chain
    - specific: string  # Exact resource name
    - characteristics: object  # Match by characteristics
    - emergency:
        characteristics: object
        warning: string
```

### 10. Input/Output Specification
```yaml
input:
  name: string
  type: "data" | "document" | "decision" | "physical"
  format: string?
  fields:  # Required for data type
    - name: string
      type: string
      required: boolean
```

### 11. Cadence Specification
```yaml
cadence:
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "on_demand" | "triggered"
  schedule: cron_expression?
  trigger_events: string[]?
```

### 12. Issue Resolution
```yaml
resolution:
  type: "escalate" | "override" | "delegate" | "pause"
  target: string?
  conditions: condition_spec[]?
  timeout: duration?
  fallback: resolution_spec?
```

## Type Definitions

### Duration
```
duration: string  # "1h", "30m", "2d", "1w", etc.
```

### Cron Expression
```
cron_expression: string  # Standard cron format
```

## Key Changes from v1.0

### 1. Capabilities Replace Functions
- Roles now declare `capabilities` instead of `tasks`
- Capabilities are interface definitions with inputs/outputs
- Responsibilities are special capabilities for continuous monitoring

### 2. Execution Types Removed
- No more `execution_type` field
- No more `ui_type`, `agent_prompt`, `algorithm` fields
- All execution details in the `method` field
- Runtime handles execution strategy

### 3. Resources as First-Class
- Explicit resource definitions with characteristics
- Requirements specify priority chains
- Capabilities treated as characteristics
- Support for specific → abstract evolution

### 4. Simplified Structure
- Cleaner separation of concerns
- Interface-driven composition
- Runtime handles complexity

## Example Usage

```yaml
version: "2.0"
metadata:
  name: "kitchen-operations"
  description: "Restaurant kitchen operations team"
  layer: "L0"

imports:
  - capability: "food-safety-standards"
    version: "2024.1"

resources:
  - resource:
      name: "corner_pizza_oven_001"
      extends: "pizza_ovens"
      characteristics:
        location: "northeast_corner"
        max_temp: 900
        fuel_type: "wood"
        capabilities: ["bake_pizza", "roast_vegetables"]

  - resource:
      name: "chef_jane"
      characteristics:
        certification: "pizza_specialist"
        experience_years: 12
        capabilities: ["make_neapolitan_pizza", "manage_wood_fired_oven"]

capabilities:
  - capability:
      name: "bake_pizza"
      description: "Bake a pizza to perfection"
      method: |
        Preheat oven to optimal temperature (700-900°F).
        Prepare pizza peel with semolina.
        Slide pizza onto oven floor.
        Rotate every 30-45 seconds for even cooking.
        Remove when crust is golden and cheese bubbles.
      inputs:
        - name: "prepared_pizza"
          type: "physical"
          format: "raw_pizza"
      outputs:
        - name: "baked_pizza"
          type: "physical"
          format: "finished_pizza"

teams:
  - team:
      name: "kitchen-operations"
      type: "stream-aligned"
      
      roles:
        - role:
            name: "pizza_chef"
            capabilities:
              - "make_neapolitan_pizza"
              - "bake_pizza"
              - "manage_wood_fired_oven"
            responsibilities:
              - "maintain_food_quality"
              - "ensure_kitchen_safety"
      
      playbooks:
        - playbook:
            name: "dinner_service"
            cadence:
              frequency: "daily"
              schedule: "0 17 * * *"
            
            inputs:
              - name: "reservations"
                type: "data"
                fields:
                  - name: "table_count"
                    type: "number"
                    required: true
                  - name: "special_requests"
                    type: "array"
                    required: false
            
            steps:
              - step:
                  name: "prepare_pizzas"
                  method: |
                    Review orders and prioritize by table.
                    Prepare dough and toppings.
                    Assemble pizzas according to orders.
                  requirements:
                    - name: "chef"
                      priority:
                        - specific: "chef_jane"
                        - characteristics:
                            certification: "pizza_specialist"
                            capabilities: ["make_neapolitan_pizza"]
                    - name: "oven"
                      characteristics:
                        capabilities: ["bake_pizza"]
                        max_temp: ">850"
                      priority:
                        - specific: "corner_pizza_oven_001"
                        - characteristics: {fuel_type: "wood"}
```

## Compilation Notes

The BUSY compiler v2.0 generates:
1. **Capability Interfaces**: TypeScript/Go interfaces from capability definitions
2. **Resource Registries**: Runtime resource management configuration
3. **Execution Stubs**: Three versions (algorithmic, AI, human) from method fields
4. **Monitoring Hooks**: For responsibility tracking
5. **Fallback Chains**: Resource allocation strategies