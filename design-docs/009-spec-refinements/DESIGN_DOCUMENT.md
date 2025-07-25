# BUSY Specification Refinements - Design Document

## Executive Summary

This design document outlines three fundamental refinements to the BUSY specification that elevate it from a process description language with implementation details to a pure business logic specification language. These changes push execution strategies, resource management, and implementation concerns to the runtime layer where they belong.

## Current State Analysis

### Problems with Current Specification

1. **Mixed Concerns**: Business logic is intertwined with implementation details (execution_type, ui_type)
2. **Limited Composability**: No clear interface definitions for plugging components together
3. **Rigid Execution**: Processes locked to specific execution types at design time
4. **Resource Coupling**: Resource allocation details embedded in business logic
5. **Missing Abstractions**: No distinction between active capabilities and passive responsibilities

### Impact of Current Limitations

- BUSY files are verbose and include non-business concerns
- Difficult to reuse components across different contexts
- Runtime inflexibility requires spec changes for execution adaptations
- Resource management complexity leaks into business process definitions

## Proposed Changes

### Change 1: Capability/Responsibility Model

#### Concept

Introduce a capability system where all roles, tools, and advisors declare their capabilities as interface definitions, with responsibilities as a special type of capability for continuous monitoring. All capabilities and responsibilities include a 'method' field that describes how the work should be done.

#### Detailed Design

**Capability Definition**:
```yaml
capability:
  name: "process-payment"
  description: "Process customer payment transactions"
  method: |
    Validate payment information against fraud detection rules.
    Check available balance or credit limit.
    Process transaction through payment gateway.
    Generate unique transaction ID.
    Record transaction in audit log.
    Return confirmation with transaction details.
  inputs:
    - name: "payment_info"
      type: "data"
      format: "payment_request"
      fields:
        - name: "amount"
          type: "number"
          required: true
        - name: "currency"
          type: "string"
          required: true
        - name: "method"
          type: "string"
          required: true
        - name: "customer_id"
          type: "string"
          required: false
  outputs:
    - name: "transaction_result"
      type: "data"  
      format: "payment_confirmation"
      fields:
        - name: "transaction_id"
          type: "string"
          required: true
        - name: "status"
          type: "string"
          required: true
        - name: "timestamp"
          type: "datetime"
          required: true
        - name: "receipt_url"
          type: "string"
          required: false
```

**Responsibility Definition**:
```yaml
responsibility:
  name: "maintain-order-accuracy"
  description: "Ensure order accuracy remains above 98%"
  method: |
    Continuously monitor order accuracy metrics.
    Track accuracy rate over rolling 24-hour window.
    If accuracy drops below 98%, investigate root cause.
    Alert kitchen manager for immediate intervention.
    If accuracy drops below 95%, pause new orders until resolved.
    Generate hourly reports on accuracy trends.
  inputs: none  # Monitoring responsibilities often have no explicit inputs
  outputs:
    - name: "accuracy_alert"
      type: "notification"
      format: "alert"
      fields:
        - name: "current_rate"
          type: "number"
          required: true
        - name: "threshold_violated"
          type: "string"
          required: true
        - name: "recommended_action"
          type: "string"
          required: true
```

**Key Features**:

1. **Interface-Driven**: Capabilities define clear contracts between components
2. **Method Description**: All capabilities and tasks include a 'method' field for detailed how-to instructions
3. **Complete Field Definitions**: Data inputs/outputs specify all fields with name, type, and required flag
4. **Composable**: Capabilities can be nested and composed
5. **Name-Only References**: Capabilities can be referenced by name, resolved at compile time
6. **Transient Responsibilities**: Playbooks can assign temporary responsibilities to roles
7. **Simplified Playbooks**: Playbooks don't declare required capabilities upfront - they emerge from steps
8. **Fractal Nature**: Responsibility for capability management lives at higher layers

#### Integration Examples

**Role with Capabilities**:
```yaml
role:
  name: "payment-processor"
  capabilities:
    - "process-payment"
    - "refund-payment"
    - "validate-payment-method"
  responsibilities:
    - "maintain-transaction-security"
    - "ensure-pci-compliance"
```

**Task/Step with Method**:
```yaml
step:
  name: "calculate_order_total"
  description: "Calculate final order total with taxes and discounts"
  method: |
    Retrieve base order amount from cart.
    Apply any valid discount codes sequentially.
    Calculate subtotal after discounts.
    Determine applicable tax rate based on delivery address.
    Calculate tax amount on subtotal.
    Add delivery fees if applicable.
    Sum all components for final total.
    Round to appropriate currency precision.
  inputs:
    - name: "order_items"
      type: "data"
      format: "cart"
      fields:
        - name: "items"
          type: "array"
          required: true
        - name: "discount_codes"
          type: "array"
          required: false
  outputs:
    - name: "order_total"
      type: "data"
      format: "pricing"
      fields:
        - name: "subtotal"
          type: "number"
          required: true
        - name: "tax"
          type: "number"
          required: true
        - name: "total"
          type: "number"
          required: true
```

### Change 2: Runtime Execution Strategy

#### Concept

Remove all execution type specifications from the BUSY language, making execution strategy a runtime concern with automatic fallback chains and human override capabilities.

#### Current State (To Be Removed)

```yaml
# These fields will be removed:
execution_type: "human" | "ai_agent" | "algorithmic"
ui_type: "form" | "meeting" | "strategy_session"
agent_prompt: "string"
context_gathering: ["sources"]
algorithm: "string"
```

**Note**: The new 'method' field in capabilities and tasks/steps will contain the detailed instructions that would previously have been split across agent_prompt, algorithm specifications, and human instructions. This unified approach keeps all implementation guidance in one place.

#### New Approach

**Compilation Output**:
- Generate stubs for all three execution types (algo, AI, human)
- Runtime determines availability and switching logic
- Post-generation enhancement through IDE agents

**Runtime Behavior**:
```
Default Chain: algorithmic → ai_agent → human
Override: Human can intervene at any point
Configuration: Runtime policies control available types
```

**Benefits**:
- BUSY specs focus purely on WHAT, not HOW
- Same process can adapt to different execution contexts
- Graceful degradation when preferred execution unavailable
- Testing/simulation can use different execution strategies

### Change 3: Resource Management Refinement

#### Concept

Transform resources from implicit dependencies to first-class concepts with explicit definitions, requirements, and flexible abstraction levels. Resources bridge design-time concepts (roles, types) with runtime instances (specific people, equipment).

#### Design Philosophy

**Key Principles**:
- **Design-Time vs Runtime**: Distinguish between "Chef" (role) and "Chef Jane" (instance)
- **Explicit over Implicit**: Resources are explicitly defined and required, not hidden
- **Evolution Path**: Support migration from specific to abstract requirements
- **Capabilities as Characteristics**: Treat capabilities as a type of characteristic

#### Resource Definition Schema

```yaml
resource:
  name: "corner_pizza_oven_001"
  extends: "pizza_ovens"              # optional inheritance/composition
  
  characteristics:                    # all metadata including capabilities
    location: "northeast_corner"
    max_temp: 900
    fuel_type: "wood"
    age_years: 3
    capabilities: ["bake_pizza", "roast_vegetables"]
```

#### Resource Requirements Schema

```yaml
step:
  name: "make_signature_pizza"
  requirements:
    - name: "oven"
      characteristics:                # can include capabilities
        capabilities: ["bake_pizza"]
        max_temp: ">850"
      priority:                       # fallback chain
        - specific: "corner_pizza_oven_001"
        - characteristics: {type: "pizza_oven", fuel_type: "wood"}
        - characteristics: {capabilities: ["high_heat_baking"]}
        
    - name: "chef"
      priority:
        - specific: "chef_jane"
        - characteristics: 
            certification: "pizza_specialist"
            experience_years: ">5"
            capabilities: ["make_neapolitan_pizza"]
```

#### Resource Categories

1. **Team-Allocated**: Traditional organizational resources (budget, equipment, space)
2. **Role-Brought**: Personal resources brought by individuals (personal tools, skills)
3. **Temporarily-Assigned**: Resources allocated for specific durations

#### Flexibility Spectrum

Resources can be specified at different abstraction levels:
- **Hyper-specific**: "corner_pizza_oven_001" (exact instance)
- **Characteristic-based**: "Any pizza oven in main kitchen"
- **Capability-based**: "Any oven that can bake pizza"
- **Abstract**: "Any equipment with cooking capability"

#### Runtime Responsibilities

- **Resource Matching**: Match requirements to available resources
- **Priority Resolution**: Follow priority chains when primary unavailable
- **Allocation Management**: Reserve, allocate, and release resources
- **Conflict Resolution**: Handle contention between processes
- **Graceful Degradation**: Support emergency fallbacks

## Implementation Strategy

### Compiler Changes

1. **Parser Updates**:
   - Add capability/responsibility keywords
   - Add resource definition and requirement keywords
   - Remove execution-related keywords
   - Update resource syntax to support characteristics and priority chains

2. **AST Modifications**:
   - New nodes for capabilities and resource definitions
   - Capability resolution phase
   - Resource requirement validation
   - Responsibility ownership tracking

3. **Code Generation**:
   - Generate execution type stubs using 'method' field content
   - Create capability interfaces with complete field specifications
   - Generate resource interfaces from definitions
   - Implement monitoring hooks for responsibilities
   - Use AI to translate 'method' descriptions into three implementation types

### Runtime Framework

1. **Execution Manager**:
   - Dynamic execution type switching
   - Fallback chain implementation
   - Human override mechanisms

2. **Resource Manager**:
   - Resource definition registry
   - Requirement matching engine
   - Priority chain resolution
   - Allocation and reservation system
   - Conflict detection and resolution
   - Emergency fallback handling

3. **Capability Marketplace**:
   - Discovery and matching
   - Version management
   - Cross-organization sharing

### Migration Approach

1. **Automated Tooling**:
   - Convert functions → capabilities
   - Remove execution_type fields
   - Transform implicit resources to explicit requirements
   - Generate resource definitions from existing allocations

2. **Backward Compatibility**:
   - Parallel support during transition
   - Warnings for deprecated syntax
   - Gradual migration path
   - Auto-generate simple requirements from legacy syntax

## Benefits and Trade-offs

### Benefits

1. **Specification Clarity**: BUSY files become pure business logic
2. **Runtime Flexibility**: Adapt without specification changes  
3. **True Composability**: Interface-driven component reuse
4. **Resource Evolution**: Start specific, become abstract over time
5. **Emergency Adaptability**: Graceful degradation with priority chains
6. **Operational Excellence**: Resource/execution concerns at appropriate layer
7. **Innovation Enablement**: Capability marketplace, fractal patterns

### Trade-offs

1. **Initial Complexity**: Learning curve for capability and resource models
2. **Migration Effort**: Existing BUSY files need significant updates
3. **Runtime Requirements**: More sophisticated runtime needed
4. **Debugging Complexity**: More layers of abstraction
5. **Resource Definitions**: Additional overhead of defining resources explicitly

## Success Criteria

1. **Specification Simplicity**: 30-50% reduction in BUSY file size
2. **Runtime Flexibility**: 100% of processes support execution switching
3. **Capability Reuse**: >60% of capabilities used across multiple contexts
4. **Resource Flexibility**: >80% of resources evolve from specific to abstract
5. **Migration Success**: >95% automated migration success rate
6. **Performance**: <5% overhead from new abstractions
7. **Emergency Handling**: 100% of processes support graceful degradation

## Conclusion

These refinements transform BUSY from a mixed-concern process description language into a pure business specification language. The capability/responsibility model provides clear interfaces for composition, runtime execution strategies enable flexible adaptation without spec changes, and the refined resource management model bridges abstract design with concrete business reality. Together, these changes create a more powerful, flexible, and maintainable system while preserving the ability to express specific business requirements when needed.