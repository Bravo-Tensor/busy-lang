# 001: BUSY Specification Changes

**Date**: 2025-07-16  
**Status**: Proposed  
**Type**: Major Specification Changes  

## Overview

This design iteration introduces 5 significant changes to the BUSY language specification to improve clarity, reduce complexity, and better align with intended usage patterns.

## Changes Included

1. **Capability-Based Imports** - Simplified imports without version management, focusing on specific capabilities
2. **Role Interface Removal** - Remove input/output interfaces from roles (organizational entities)
3. **Deliverable Type Simplification** - Reduce from 4 types to 2 (document/data only)
4. **Document Definitions** - Introduce documents as first-class BUSY entities with reusable definitions
5. **Hierarchical Task Structure** - Enable tasks to have subtasks for better organization

## Documents

- **[BUSY_SPECIFICATION_CHANGES_DESIGN.md](./BUSY_SPECIFICATION_CHANGES_DESIGN.md)** - Complete design specification with current state analysis, proposed changes, and impact assessment
- **[IMPLEMENTATION_TASK_BREAKDOWN.md](./IMPLEMENTATION_TASK_BREAKDOWN.md)** - Detailed 4-phase implementation plan with 35 specific tasks

## Impact Assessment

### Complexity Level
**High** - These changes affect core language constructs and require updates to:
- JSON Schema definitions
- Parser implementation  
- Semantic analysis
- Symbol table management
- All example files
- Complete documentation suite

### Breaking Changes
**Yes** - All existing BUSY files will require updates:
- Remove role interfaces
- Update import syntax to use capabilities
- Convert decision/approval deliverables to data type
- Reference document definitions for document deliverables

### Timeline Estimate
**7-12 days** across 4 implementation phases:
1. Schema and Parser Updates (2-3 days)
2. Symbol Management and Analysis Updates (3-4 days)  
3. Example Files and Documentation Updates (2-3 days)
4. Migration and Validation (1-2 days)

## Success Criteria

- [ ] All schema changes implemented and validated
- [ ] Parser handles all new file types and structures
- [ ] Symbol table tracks new symbol types (documents, capabilities)
- [ ] Semantic analysis validates new rules
- [ ] All example files updated and achieve 100% health score
- [ ] Documentation completely updated
- [ ] Migration tools created and tested
- [ ] Performance maintained

## Migration Strategy

1. **Automated Migration**: Scripts to handle mechanical transformations
2. **Manual Review**: Document definitions and complex structural changes
3. **Validation**: Comprehensive testing of all changes
4. **Rollback Plan**: Ability to revert if issues discovered

## Next Steps

1. **Stakeholder Review** - Review design documents for approval
2. **Implementation Planning** - Confirm timeline and resource allocation  
3. **Phase 1 Execution** - Begin with schema and parser updates
4. **Iterative Development** - Complete phases with validation gates

## Design Decisions Record

### Key Architectural Decisions
- **Capability-based imports**: Chosen for clarity and future extensibility
- **Document as first-class entities**: Enables powerful document management in runtime
- **Hierarchical tasks**: Supports complex workflow modeling
- **Role interface removal**: Clarifies distinction between organizational and functional entities

### Alternative Approaches Considered
- **Version management in imports**: Deferred to package-level management
- **Additional deliverable types**: Simplified to essential document/data distinction
- **Task composition patterns**: Chose hierarchical over compositional for clarity

This design iteration represents a significant evolution of the BUSY language towards better clarity, usability, and runtime capabilities while maintaining its core strengths in organizational modeling.