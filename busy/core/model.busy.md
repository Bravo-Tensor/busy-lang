---
Name: Model
Type: [Document]
Description: A thing that exists in the domain - what is true about it, how to identify it, and how its state changes over time.
---

# [Imports](./document.busy.md#imports-section)

[Model]:./model.busy.md
[Operation]:./operation.busy.md
[Checklist]:./checklist.busy.md
[Tool]:./tool.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section

# [Setup](./document.busy.md#setup-section)

A [Model] represents something that exists and can be reasoned about. Unlike a [Tool] which computes or transforms, a [Model] simply holds truth - the current state of a thing in the world.

Every [Model] must be explainable to a non-technical person and could be tracked with paper and pen. If you find yourself reaching for technical terms, you're describing implementation, not the model itself.

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Identity Section]
[Identity Section]:./model.busy.md#identity-section
[Identity]:./model.busy.md#identity-section
Defines what makes each instance of this model unique. This is the field or combination of fields that distinguishes one instance from another - like a person's name tag or an order's ticket number.

## [Fields Section]
[Fields Section]:./model.busy.md#fields-section
[Fields]:./model.busy.md#fields-section
A table listing what information this model holds. Each field has:
- **Field**: The name of the piece of information
- **Meaning**: What this field represents in plain language
- **Required**: Whether every instance must have this field (Yes/No)

## [Lifecycle Section]
[Lifecycle Section]:./model.busy.md#lifecycle-section
[Lifecycle]:./model.busy.md#lifecycle-section
A table showing valid states and transitions. Each row has:
- **State**: A named condition the model can be in
- **Can Transition To**: Which states can follow this one
- **Trigger**: What causes the transition (or "-" if manual)

## [Rules Section]
[Rules Section]:./model.busy.md#rules-section
[Rules]:./model.busy.md#rules-section
Constraints that must always hold true. These are facts about the model that can never be violated - like "an order must have at least one item" or "a person's age cannot be negative".

## [Relationships Section]
[Relationships Section]:./model.busy.md#relationships-section
[Relationships]:./model.busy.md#relationships-section
How this model connects to other models:
- **references**: Points to another model (like an order referencing a customer)
- **contains**: Owns other models (like a cart containing items)
- **belongs_to**: Is owned by another model (like an item belonging to a cart)

## [Persistence Section]
[Persistence Section]:./model.busy.md#persistence-section
[Persistence]:./model.busy.md#persistence-section
Declares which adapter handles storage for this model. Models define **what** data looks like, not **where** or **how** it's stored.

**Include:**
- Which adapter to use (e.g., File Adapter, Database Adapter)
- ID format convention (e.g., `p_{uuid}`)

**Do not include:**
- Storage paths (`data/model/{id}.json`)
- CRUD operation examples or query examples
- Adapter-specific implementation details

Storage paths and formats are the adapter's responsibility. This separation allows swapping adapters without changing models.

# [Operations](./document.busy.md#operations-section)

## createInstance

Create a new instance of this model.

### [Input][Input Section]
- `fields`: Values for the required and optional fields

### [Steps][Steps Section]
1. Validate all required fields are present
2. Check all [Rules] are satisfied
3. Set initial [Lifecycle] state
4. Assign [Identity] value
5. Store the instance via [Persistence] adapter

### [Output][Output Section]
- The newly created model instance with its identity

### [Checklist][Checklist Section]
- All required fields provided
- All rules pass validation
- Initial lifecycle state set
- Identity assigned and unique
- Instance persisted

## updateInstance

Modify an existing instance of this model.

### [Input][Input Section]
- `identity`: The identity value of the instance to update
- `changes`: Fields to modify and their new values

### [Steps][Steps Section]
1. Retrieve instance by identity
2. Apply field changes
3. Validate all [Rules] still hold
4. If lifecycle state changed, validate transition is allowed
5. Persist updated instance

### [Output][Output Section]
- The updated model instance

### [Checklist][Checklist Section]
- Instance exists
- Changes applied
- All rules still valid
- Lifecycle transition valid (if state changed)
- Changes persisted

## transitionState

Move an instance through its lifecycle.

### [Input][Input Section]
- `identity`: The identity value of the instance
- `new_state`: The target lifecycle state
- `trigger`: What caused this transition

### [Steps][Steps Section]
1. Retrieve instance by identity
2. Check current state allows transition to new_state (per [Lifecycle] table)
3. Update the state field
4. Record the trigger
5. Persist the change

### [Output][Output Section]
- The instance in its new state

### [Checklist][Checklist Section]
- Transition is valid per lifecycle table
- State updated
- Trigger recorded
- Change persisted

## findByIdentity

Retrieve a single instance by its identity.

### [Input][Input Section]
- `identity`: The identity value to look up

### [Steps][Steps Section]
1. Query [Persistence] store for matching identity
2. Return instance if found, or indicate not found

### [Output][Output Section]
- The matching instance, or indication that none exists

### [Checklist][Checklist Section]
- Query executed
- Result returned or not-found indicated

## listInstances

Retrieve multiple instances, optionally filtered.

### [Input][Input Section]
- `filters`: Optional field constraints to match
- `limit`: Maximum number to return (optional)

### [Steps][Steps Section]
1. Query [Persistence] store with filters
2. Apply limit if specified
3. Return matching instances

### [Output][Output Section]
- List of matching model instances

### [Checklist][Checklist Section]
- Filters applied correctly
- Limit respected
- Results returned
