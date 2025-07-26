# Grammar Specification Updates

This directory contains the updated BUSY language grammar specification (v2.0) that incorporates the three major refinements:

1. **Capability/Responsibility Model** - Interface-driven composition
2. **Runtime Execution Strategy** - Removed execution types from spec
3. **Resource Management** - First-class resource concepts

## Files

- `GRAMMAR_SPECIFICATION_V2.md` - Complete v2.0 grammar specification
- `MIGRATION_GUIDE.md` - Guide for migrating v1.0 to v2.0 syntax (TODO)

## Key Changes

### New Constructs
- `capability` - Interface definitions with inputs/outputs/method
- `responsibility` - Special capability for continuous monitoring
- `resource` - Explicit resource definitions with characteristics
- `requirement` - Resource requirements with priority chains

### Removed Constructs
- `execution_type` field
- `ui_type`, `agent_prompt`, `algorithm` fields
- `required_capabilities` from playbooks
- Old resource allocation syntax

### Modified Constructs
- Roles now declare `capabilities` instead of `tasks`
- Steps include `method` field for execution instructions
- Resources referenced through `requirements` with fallback chains
- Capabilities treated as characteristics in resource matching

## Implementation Status

- [x] Grammar specification document
- [ ] EBNF formal grammar
- [ ] Migration guide
- [ ] Validation rules