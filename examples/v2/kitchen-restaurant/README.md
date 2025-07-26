# Kitchen Restaurant Example - BUSY v2.0

This directory contains the updated kitchen restaurant example demonstrating BUSY language v2.0 features, including the three major refinements:

1. **Capability/Responsibility Model**
2. **Runtime Execution Strategy** (no execution types in spec)
3. **Resource Management** (first-class resources)

## Directory Structure

```
kitchen-restaurant/
├── resources/
│   └── kitchen-resources.busy      # Resource definitions
├── capabilities/
│   └── kitchen-capabilities.busy   # Capability & responsibility definitions
└── L0/
    └── kitchen-operations/
        ├── roles/
        │   └── expeditor.busy       # Role with capabilities & responsibilities
        ├── playbooks/
        │   └── process-order.busy   # Process with resource requirements
        └── team.busy                # Team structure
```

## Key Changes from v1.0

### 1. Capability/Responsibility Model

**Before (v1.0)**:
```yaml
role:
  tasks:
    - task:
        name: "coordinate_orders"
        execution_type: "human"
        ui_type: "form"
```

**After (v2.0)**:
```yaml
# In capabilities/kitchen-capabilities.busy
capability:
  name: "coordinate-orders"
  method: |
    Review incoming order tickets and assess complexity.
    Prioritize orders based on prep time and sequence.
    Assign cooking tasks to appropriate stations...

# In roles/expeditor.busy
role:
  capabilities:
    - "coordinate-orders"
    - "quality-control"
  responsibilities:
    - "maintain-order-accuracy"
```

### 2. No Execution Types in Spec

**Before (v1.0)**:
```yaml
task:
  execution_type: "human"
  ui_type: "form"
  agent_prompt: "Review and prioritize orders"
```

**After (v2.0)**:
```yaml
step:
  method: |
    Review order complexity and required cooking stations.
    Assess current kitchen capacity and availability.
    Prioritize based on cook times and sequence...
```

The `method` field contains all execution details. The runtime generates algorithmic, AI, and human implementations from this unified description.

### 3. First-Class Resource Management

**Before (v1.0)**:
```yaml
# Resources were implicit or simple allocations
resources:
  - type: "equipment"
    allocation: 4
```

**After (v2.0)**:
```yaml
# Explicit resource definitions
resource:
  name: "corner_pizza_oven_001"
  extends: "pizza_ovens"
  characteristics:
    location: "northeast_corner"
    max_temp: 900
    fuel_type: "wood"
    capabilities: ["bake_pizza", "roast_vegetables"]

# Resource requirements with priority chains
step:
  requirements:
    - name: "oven"
      priority:
        - specific: "corner_pizza_oven_001"
        - characteristics: {fuel_type: "wood"}
        - characteristics: {capabilities: ["bake_pizza"]}
        - emergency:
            characteristics: {capabilities: ["high_heat_cooking"]}
            warning: "Using non-optimal cooking equipment"
```

## Example Workflow

### Process Order Playbook

The `process-order.busy` playbook demonstrates:

1. **Resource Requirements**: Each step specifies exactly what resources it needs with fallback chains
2. **Method-Based Instructions**: Detailed execution instructions without specifying HOW (human/AI/algorithmic)
3. **Capability Dependencies**: Steps reference capabilities that must be resolved at compile time

### Resource Evolution Path

The example shows how resources can evolve from specific to abstract:

```yaml
# Version 1: Hyper-specific
requirements:
  - name: "oven"
    priority:
      - specific: "corner_pizza_oven_001"

# Version 2: Characteristic-based
requirements:
  - name: "oven"
    characteristics:
      fuel_type: "wood"
      max_temp: ">850"

# Version 3: Pure capability
requirements:
  - name: "oven"
    characteristics:
      capabilities: ["bake_pizza"]
```

## Compilation Output

When compiled, this v2.0 example would generate:

1. **Capability Interfaces**: TypeScript interfaces for each capability
2. **Resource Registry**: Runtime resource management configuration
3. **Execution Stubs**: Three versions (algorithmic, AI, human) for each step
4. **Monitoring Hooks**: Code for responsibility tracking
5. **Fallback Chains**: Resource allocation strategies

## Key Benefits Demonstrated

1. **Cleaner Specs**: Business logic separated from implementation details
2. **Runtime Flexibility**: Same process can run with different execution strategies
3. **Resource Evolution**: Can start specific and become abstract over time
4. **Emergency Handling**: Graceful degradation with priority chains
5. **True Composability**: Capabilities can be reused across different contexts

This example serves as the reference implementation for BUSY v2.0 patterns and demonstrates how real-world business processes can be expressed in the new syntax.