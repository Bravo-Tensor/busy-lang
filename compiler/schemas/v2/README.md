# BUSY v2.0 JSON Schemas

This directory contains the JSON schemas for BUSY language v2.0, implementing the three major refinements:

1. **Capability/Responsibility Model**
2. **Runtime Execution Strategy** (no execution types in spec)
3. **Resource Management** (first-class resource concepts)

## Schema Files

### Core Schemas
- `busy-schema.json` - Main BUSY file schema
- `capability-schema.json` - Capability definition schema
- `responsibility-schema.json` - Responsibility definition schema (special capability)
- `resource-schema.json` - Resource definition schema
- `requirement-schema.json` - Resource requirement schema

### Key Changes from v1.0

#### Removed Fields
- `execution_type` from tasks/steps
- `ui_type`, `agent_prompt`, `algorithm` fields
- `required_capabilities` from playbooks
- Old resource allocation syntax

#### New Constructs
- **Capabilities**: Interface definitions with inputs/outputs/method
- **Responsibilities**: Continuous monitoring capabilities
- **Resources**: Explicit definitions with characteristics
- **Requirements**: Resource requirements with priority chains

#### Modified Constructs
- Roles now have `capabilities` and `responsibilities` lists
- Steps include `method` field for execution instructions
- Resources are first-class with flexible characteristics
- Capabilities are treated as characteristics in resource matching

## Usage

These schemas are used by:
1. The BUSY compiler for validation
2. IDE plugins for autocomplete and validation
3. Documentation generators
4. Migration tools

## Validation Example

```typescript
import Ajv from 'ajv';
import busySchema from './busy-schema.json';

const ajv = new Ajv();
const validate = ajv.compile(busySchema);

const valid = validate(busyDocument);
if (!valid) {
  console.error(validate.errors);
}
```