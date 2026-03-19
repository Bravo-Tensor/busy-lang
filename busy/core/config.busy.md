---
Name: Config
Type: [Model]
Description: A singleton [Model] — defines the shape of a configuration or settings object where only one instance exists per workspace. Like a [Model] but there is exactly one record, not a collection.
---

# [Imports](./document.busy.md#imports-section)

[Config]:./config.busy.md
[Model]:./model.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section

# [Setup](./document.busy.md#setup-section)

A [Config] is a [Model] with a singleton constraint — exactly one instance exists. Use [Config] for workspace settings, process definitions, feature flags, and any data shape where there is one authoritative record rather than a collection of instances.

A [Config] inherits all of [Model]'s structure: Identity, Fields, Rules, and Persistence. The key differences are:
- **No Lifecycle section** — configs don't transition through states
- **No Relationships section** — configs don't reference other model instances
- **Identity is implicit** — there is only one, identified by name
- **createInstance is replaced by initialize** — creates the singleton if it doesn't exist
- **listInstances is not applicable** — there is exactly one

Think of a [Config] like a settings file — it defines what knobs exist and their current values, but there's only one copy.

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Fields Section]
[Fields Section]:./config.busy.md#fields-section
[Fields]:./config.busy.md#fields-section
Same as [Model] Fields — a table of field names, types, meanings, and whether they're required. Each field represents a configuration value.

## [Defaults Section]
[Defaults Section]:./config.busy.md#defaults-section
[Defaults]:./config.busy.md#defaults-section
Default values for each field when the config is initialized. Unlike [Model] instances which may have no defaults, every [Config] field should have a sensible default.

## [Rules Section]
[Rules Section]:./config.busy.md#rules-section
[Rules]:./config.busy.md#rules-section
Same as [Model] Rules — constraints that must hold. For configs, these are typically value range constraints (e.g., "port must be between 1024 and 65535") or mutual exclusion rules.

# [Operations](./document.busy.md#operations-section)

## [initialize][./operation.busy.md]

Create the singleton config instance with defaults if it doesn't exist.

### [Input][Input Section]
- `overrides`: Optional field values to override defaults

### [Steps][Steps Section]
1. Check if config instance already exists
2. If exists, return existing instance
3. If not, create with [Defaults], applying any overrides
4. Validate [Rules]
5. Persist via adapter

### [Output][Output Section]
- The config instance

### [Checklist][Checklist Section]
- Singleton constraint maintained
- Defaults applied
- Overrides validated against rules
- Instance persisted

## [getConfig](./operation.busy.md)

Retrieve the current config values.

### [Steps][Steps Section]
1. Load the singleton instance from persistence
2. If not found, run initialize with defaults

### [Output][Output Section]
- The current config instance

## [updateConfig](./operation.busy.md)

Modify configuration values.

### [Input][Input Section]
- `changes`: Fields to modify and their new values

### [Steps][Steps Section]
1. Load current config
2. Apply changes
3. Validate all [Rules] still hold
4. Persist updated config

### [Output][Output Section]
- The updated config instance

### [Checklist][Checklist Section]
- Changes applied
- All rules valid
- Config persisted
