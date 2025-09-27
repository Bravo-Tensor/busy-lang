# BUSY-Orgata Refinement v3 Design Document

## Executive Summary

### Purpose
<!-- Brief description of what this refinement addresses -->

### Key Changes
<!-- High-level summary of major changes/improvements -->

### Impact
<!-- Expected benefits and scope of changes -->

## Background

### Current State
<!-- Overview of existing BUSY-Orgata integration -->

### Identified Issues
<!-- Problems or limitations this refinement addresses -->

### Previous Iterations
<!-- Reference to v1 and v2 refinements and their outcomes -->

## Design Goals

### Primary Objectives
<!-- Main goals this refinement aims to achieve -->

### Success Criteria
<!-- Measurable outcomes that define success -->

### Non-Goals
<!-- Explicitly what this refinement will NOT address -->

## Architecture Changes

### System Overview
<!-- High-level architectural changes -->

### Component Modifications
<!-- Specific changes to existing components -->

### New Components
<!-- Any new components being introduced -->

### Data Flow Changes
<!-- How data/control flow is being modified -->

## Language Enhancements

### Syntax Changes
<!-- Any changes to BUSY language syntax -->
* Playbooks, Roles, and Documents are the first class citizens. Each of these will adopt one more Capabilities.
* A note on the ecapsulation and dependency management between Playbooks, Roles, and Documents: Playbooks should be the highest level entry point for any given Capability. Playbooks coordinate work between Roles using Documents. A given Role may have a Capability invoked by a Playbook, a given Document could have it's Capability(ies) invoked by a Role or Playbook. In either case, that Capability may likely be a Playbook that is encapsulated by the Role or Playbook. In this way we have a sort of fractal encapsulation wherein Playbooks can orchestrate Roles and Documents within it's scope and Roles can dictate updating, collating, referencing, etc. with Documents. Note that this does mean that Documents/Roles/Playbooks can't articulate how they interact with sibling Documents/Roles/Playbooks, this should always be done by a higher order component. This isn't to say that Roles can't interact with other Roles for example, but that their interaction patterns should be governed by the Playbook.
* Capabilities are commitment to complete an Operation. They have name, description, an Input defintion (or what is needed to start the Operation) and an Output defintion (or what will be delivered or produced at Operation completion). 
* Capabilities can be composed of other Capabilities and Characteristics. A Capability is just a special type of framework defined set of Characterisitcs, which is to say it has the Characteristics of a string Name, a string Description, a set of Characterisics labeled Input, and a set of Characteristics labeled Output.
* Each Characteristic has an assumed defintion (the name as well as the schema, shape or dimensionality of the data or resource to be exchanged, i.e. a type defintion/interface or struct) and an optional Qualifiers which limit the scope or range of the Characteristic. 
* Inputs and Outputs are just collections of Characteristics or Capabilities which specify the exchange of information and resources that may occur. A Resource, example, is just Capability that commits to provide something, not a stand in for that thing itself.
* A Capability defined in the context of a Consumer (i.e. a Role, Playbook, or Doc that _needs_ a Capability) or in the context of a Provider (i.e. that which can implement and serve to provide a Capability), casts its Characteristics as Requires or Provides. A Capability defined absent a Provider/Consumer context is just a baseline specification/defintion that can be extended or composed in the context of a Consumer or Provider. A Capability defined here is not yet realizable, it as an abstract concept. 
    * Example: 
    ```yaml
        capabilities:
            - name: "cook_chicken"
              description: "A juicy delicious chicken cooked on demand"
              input: 
                - name: "get_chicken"
                  type: "capability"
                    output:
                    - type: "chicken" #any item that meets the Characteristic of "chicken" (e.g. "chicken_breast", "whole_chicken", "dark_meat_chicken", etc.)
                - name: "cooking_appliance" #any available resource that meets the Capability of "cooking_appliance"
                  type: capability
                - type: "role" #infers RoleProvider
                name: "cook" #a Role Provider must provide a role that has Capability "cook"
              output:
                - name: "chicken_dish"
                  type: "dish" #will reference Defintion tree for type "dish"
                  characteristics:
                  - name: "temp"
                    value: "hot" #communicates that dish will be served hot, no cold chicken
                    type: string
            - name: "safe_food_practices"
              description: "follows safe food practices to prevent illness and contamination"
              input:
                - resources:
                    - type: "equipment"
                      name: "thermometer"
                    - type: "role"
                      name: "safe_food_practices_certified"
                    - type: "equipment" 
                      name: "cleaner"
              output: 
                - name: "food_safe_verified"
                  type: boolean
        characterisitics:
            - name: "dish"
              characteristics:
                - name: "plated" 
                  value: true
                  type: boolean
                - name: "food_safe"
                  type: "capability"
                  value: "safe_food_practices" #imported Capability defined above
    ```
* A Playbook may then adopt and contextualize this defintion in it's own defintion:
```yaml
playbooks:
    - name: "smoked_chicken_recipie"
      description: "texas style smoked chicken"
      cadence: daily, morning
      input:
        requires:
            resources:
                - type: "equipment"
                  name: "smoker" #a more specific type of "cooking_device"
                - type: "ingredient"
                  name: "wood"
                  characteristics:
                    - type: "oak"        
                - type: "role"
                  name: "cook"
                  characteristics:
                    - responsibility: "maintains_fire" #adds the Responsibility (which is a special type of Capability) to maintain the fire
                - type: "ingredient"
                  name: "salt, pepper, garlic"
                - type: "ingredient"
                  name: "chicken_quarters"
      output:
        provides:
            resources:
                - type: "ingredient"
                  name: "smoked_chicken"
      steps:
        - name: "prepare smoker"
          method: |
            Start a fire with wood
            Ensure clean smoke
            Adjust to 225 degrees
          estimated-time: 30m
        - name: "prepare chicken"
          method: |
            Pat chicken_quarters dry
            Sprinkle liberally with salt, pepper, garlic
          estimated-time: 15m
        - name: "smoke chicken"
          method: |
            Place chicken at back of smoker
            Verify temp is still at 225 every 15m
            Leave for 1hr or until temp reaches 150
            Add more wood to bump up temp to 350
            Move chicken to front of smoker
            Cook until temp reaches 180, about 15m
          estimated-time: 90m
        - name: "wrap and hold"
          method: |
            Remove chicken, wrap individually with foil
            Place in holding oven
          estimated-time: 10m
    - name: "fulfill_smoked_chicken_order"
      description: "finish off a smoked chicken and plate for customer"
      cadence: on-demand
      input:
        requires:
            resources:
              - type: "ingredient"
                name: "smoked_chicken" #get smoked chicken from IngredientProvider
              - type: "ingredient"
                name: "cayenne pepper" 
            order:
              name: "spicyness"
              type: "menu.smoked_chicken.preferences.spicyness"
      output:
        provides: 
            dish: "chicken_dish"
            order:
              - completed #same as order.completed = true
      steps:
      - name: "cook_chicken" # imports the "cook_chicken" Capability above
        provides: #this step will provide the chicken via the ingredient provider, but other resources defined in "cook_chicken" will still need to be fulfilled elsewhere (e.g. the Team definition)
            - name: "smoked_chicken"
              type: "ingredient"
        method: | #provides the implementation details for the more generic cook_chicken
            take chicken from holding oven
            reheat to 180 degrees
            sprinkle cayenne pepper on according to spicyness preference
            plate chicken
```
* You'd also specify a Team and/or Resource defintion that would commit Provider side resources like what equipment is available and who will be working with what assigned Roles.
* Documents could also be specified that serves as a sort of reference defintion, state bag, working document, or view for the various Playbooks and Roles. An Order, Menu, and Recipie are all examples of what could potentially be served well as a Document. Documents can have their own sub Capabilities, which is to say, updating a document may kick off a Playbook of it's own like reformatting, gathering additional information, disseminating or memorializing, etc.
* As part of the runtime compilation, all of this should be distilled down to a hierarchy of Characteristic Defintions and Operations, ensuring that each Operation can start and complete given it's Required and Providing Characteristics/Capabilities. In aggregate, Inputs and Outputs simply specify before and after requirements, they don't specify the give and take, the "lock and key" of who's requiring and who's providing what. 


* Playbooks are the organization and syncronization of Roles and Docs, they are the highest order. They may order 

### Semantic Changes
<!-- Changes to language meaning or behavior -->
* 

### New Features
<!-- New language constructs or capabilities -->

### Backward Compatibility
<!-- How existing BUSY files are affected -->
* No need for backward compatibility. As an output of this project we do need to go through the examples and update them, but no migration script or code needs to be created.

## Runtime Modifications

### Orgata Changes
<!-- Modifications to the Orgata runtime -->

### Execution Model
<!-- Changes to how BUSY processes execute -->

### Resource Management
<!-- Updates to resource handling -->

### Error Handling
<!-- Improvements to exception/error management -->

## Compiler Updates

### Parser Changes
<!-- Updates to the BUSY parser -->

### Code Generation
<!-- Changes to how BUSY compiles to runtime -->

### Optimization
<!-- New optimization strategies -->

### Tooling
<!-- Updates to development tools -->

## Integration Points

### Backend Service
<!-- How this affects the backend service -->

### IDE Integration
<!-- Impact on development environment -->

### External Systems
<!-- Effects on external integrations -->

## Implementation Strategy

### Phases
<!-- Development phases and milestones -->

### Dependencies
<!-- What needs to be completed first -->

### Risk Mitigation
<!-- Identified risks and mitigation strategies -->

## Testing Strategy

### Unit Testing
<!-- Component-level testing approach -->

### Integration Testing
<!-- System integration testing -->

### Migration Testing
<!-- Testing backward compatibility -->

### Performance Testing
<!-- Performance validation approach -->

## Migration Plan

### Existing Systems
<!-- How to migrate existing BUSY implementations -->

### Breaking Changes
<!-- Any breaking changes and migration path -->

### Deprecation Timeline
<!-- Schedule for deprecating old features -->

## Documentation Updates

### Specification Changes
<!-- Updates needed to language specification -->

### API Documentation
<!-- Changes to runtime/compiler APIs -->

### User Guides
<!-- Updates to user-facing documentation -->

## Open Questions

### Technical Decisions
<!-- Outstanding technical decisions to be made -->

### Research Areas
<!-- Areas requiring further investigation -->

## Appendices

### A. Related Documents
<!-- Links to relevant design documents -->

### B. Code Examples
<!-- Illustrative code samples -->

### C. Performance Analysis
<!-- Performance impact analysis -->