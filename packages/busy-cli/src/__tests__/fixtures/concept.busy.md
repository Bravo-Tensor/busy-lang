---
Name: Concept
Type: [Concept]
Description: Base concept type that all other types build upon.
---
# [Imports]

# [Local Definitions]

## Definition
A named unit of meaning that can be referenced and composed.

# [Setup]

When evaluating a concept, resolve all imports first, then process definitions.

# [Operations]

## EvaluateConcept

Evaluate a concept and return its resolved definition.

### [Steps]
1. Load the concept document
2. Resolve any import references
3. Return the concept definition

### [Checklist]
- Concept loaded successfully
- All imports resolved
