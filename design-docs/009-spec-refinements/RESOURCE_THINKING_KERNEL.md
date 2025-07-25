# BUSY Resources - Thinking Kernel

## Core Philosophy

Resources in BUSY bridge the gap between abstract design-time concepts and concrete runtime instances. Like the distinction between a class and an object in programming, we differentiate between "Chef" (the role) and "Chef Jane" (the specific person). This allows processes to start with specific requirements and evolve toward more abstract, flexible specifications over time.

## Key Concepts

### 1. Design-Time vs Runtime Mirroring
The specification defines what kinds of resources are needed (interfaces and requirements), while the runtime manages actual instances:
- Design-time: "Need a pizza chef with wood-fired oven experience"
- Runtime: "Chef Jane is available and meets these requirements"

### 2. Resource as First-Class Concept
Resources aren't just implicit - they're explicitly defined with:
- **Name**: Unique identifier
- **Characteristics**: Metadata/tags (owner, location, performance profile)
- **Capabilities**: What the resource can do (interfaces it provides)

### 3. Three Resource Categories

**Team-Allocated** (Traditional)
- Budget, equipment, space, time slots
- Owned by the organization
- Allocated down through teams
- Examples: Kitchen stations, meeting rooms, annual budget

**Role-Brought** (Personal)
- Resources individuals bring with them
- Personal tools, skills, equipment
- Interface-compatible with team resources
- Examples: Chef's knives, personal laptop, individual expertise

**Temporarily-Assigned** (Dynamic)
- Resources allocated for specific duration
- Can move between roles/tasks
- Reservation and release cycles
- Examples: Station for a shift, project budget allocation

### 4. Flexible Specificity Spectrum
Resources can be specified at different levels of abstraction:
- **Hyper-specific**: "corner_pizza_oven_001" (exact instance)
- **Characteristic-based**: "Any pizza oven in the main kitchen"
- **Capability-based**: "Any oven that can reach 850°F"
- **Abstract**: "Any equipment with baking capability"

Processes typically start specific and evolve toward abstraction as they mature.

### 5. Resource Schema

```yaml
resource:
  name: "corner_pizza_oven_001"
  extends: "pizza_ovens"              # optional composition/inheritance
  
  characteristics:                    # flexible metadata
    location: "northeast_corner"
    max_temp: 900
    fuel_type: "wood"
    owner: "restaurant"
    age_years: 3
    
  capabilities:                       # what it can do
    - "bake_pizza"                   # name-only reference
    - "roast_vegetables"
    - name: "quick_reheat"           # inline definition
      description: "Rapidly reheat items"
      method: "Set to 450°F, heat 2-3 min"
      inputs: [...]
      outputs: [...]
```

### 6. Resource Injection Patterns
Resources can be specified at multiple levels:
- **Process level**: Default resources for entire workflow
- **Step level**: Specific resources for individual steps
- **Role level**: Resources that roles bring with them

### 7. Resource Requirements in BUSY Specs

```yaml
step:
  name: "make_signature_pizza"
  resources:
    - name: "chef"
      requirement:
        # Option 1: Specific instance
        specific: "chef_jane"
        
        # Option 2: Characteristics matching
        characteristics:
          certification: "pizza_specialist"
          experience_years: ">5"
          
        # Option 3: Capability matching
        capabilities: ["make_neapolitan_pizza"]
        
        # Option 4: Fallback chain
        fallback_chain:
          - specific: "chef_jane"
          - characteristics: {certification: "pizza_specialist"}
          - capabilities: ["basic_pizza_making"]
          - emergency: 
              capabilities: ["food_preparation"]
              warning: "Quality may be compromised"
```

### 8. Characteristics vs Capabilities
- **Characteristics**: Metadata that describes the resource (owner, location, age, performance profile)
- **Capabilities**: Invokable interfaces that define what the resource can do
- Example: A blender has characteristics (brand: "Vitamix", rpm: 37000) and capabilities (blend, puree, crush_ice)

## Runtime Behavior

### Resource Graph Architecture
Resources form a graph (not strict inheritance) where:
- Resources can extend others to avoid repetition
- Characteristics and capabilities compose from multiple sources
- Runtime resolves the full resource definition

### Compilation vs Runtime
- **Compilation**: Validates resource requirements are coherent and can potentially be satisfied
- **Runtime**: Handles actual allocation, reservation, conflict resolution, and fallback chains
- **Evolution**: Specs can migrate from specific to abstract without breaking changes

## Examples from Kitchen Scenario

### Evolution Example
```yaml
# Version 1: Hyper-specific (early implementation)
step:
  resources:
    - requirement:
        specific: "corner_pizza_oven_001"

# Version 2: Relaxed to characteristics
step:
  resources:
    - requirement:
        characteristics:
          type: "pizza_oven"
          location: "main_kitchen"

# Version 3: Pure capability (mature abstraction)
step:
  resources:
    - requirement:
        capabilities: ["bake_pizza"]
```

### Emergency Fallback
```yaml
resources:
  - name: "cutting_tool"
    requirement:
      fallback_chain:
        - specific: "chef_knife_jane"
        - characteristics: {type: "chef_knife", sharpness: "professional"}
        - capabilities: ["precise_cutting"]
        - emergency:
            capabilities: ["basic_cutting"]  # even a plastic knife
            warning: "Quality compromised"
```

### BYO (Bring Your Own) Resources
```yaml
role:
  name: "pizza_chef"
  brings_resources:
    - name: "personal_knife_set"
      characteristics:
        owner: "role_holder"
        quality: "professional"
      capabilities: ["precise_cutting", "fast_prep"]
```

## Design Philosophy

### First-Class Resources
Resources are explicitly defined and managed, not hidden abstractions. Every step must declare what resources it needs, either directly or through role requirements.

### Dependency Injection Pattern
Resources can be injected at:
- **Build time**: Default resources compiled into process
- **Runtime**: Dynamic allocation based on availability
- **Method level**: Passed as parameters to specific steps

### Graceful Degradation
When ideal resources aren't available, the system:
1. Attempts fallback options in order
2. Warns about quality implications
3. Logs resource substitutions
4. Allows human override

## The Balance

The design balances:
- **Specificity when needed**: Can require Chef Jane for signature dishes
- **Flexibility when possible**: Any certified chef for standard orders
- **Evolution over time**: Start specific, become abstract as processes mature
- **Emergency adaptability**: Plastic knife when nothing else available

This approach acknowledges that business resources are tangible and contentious while providing the flexibility modern systems need.