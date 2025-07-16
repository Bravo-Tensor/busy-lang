# BUSY Specification Changes Design Document

**Version**: 1.0.0  
**Date**: 2025-07-16  
**Status**: Design Phase  

## Executive Summary

This document outlines the design for five significant changes to the BUSY language specification that will improve clarity, reduce complexity, and better align with intended usage patterns. The changes focus on simplifying imports, removing unnecessary interfaces, refining deliverable types, introducing document definitions as first-class entities, and adding hierarchical task structure.

## Current State Analysis

### 1. Current Import System
```yaml
imports:
  - tool: "salesforce"
    version: "^2.0.0"
  - advisor: "legal-advisor"
    interface: "contract-review"
```

**Issues**:
- Version management is premature and complex
- `interface` field for advisors is confusing
- No clear indication of what specific capabilities are being imported
- Difficult to track unused import capabilities

### 2. Current Role Interfaces
```yaml
role:
  name: "photo-editor"
  interfaces:
    inputs:
      - name: "raw_content"
        type: "data"
        format: "image_files"
    outputs:
      - name: "processed_deliverables"
        type: "data"
        format: "final_images"
```

**Issues**:
- Roles are organizational entities, not functional units
- Role interfaces create confusion about what roles actually interface with
- Only tasks and playbooks should have functional interfaces

### 3. Current Deliverable Types
```yaml
deliverable:
  type: "document|data|decision|approval"
```

**Issues**:
- Four types create unnecessary complexity
- `decision` and `approval` are conceptually just data types
- No clear distinction between simple data and complex documents

### 4. Current Document Handling
```yaml
deliverable:
  name: "contract"
  type: "document"
  format: "pdf"
  schema:
    type: "json"
    definition: "inline schema"
```

**Issues**:
- Documents are just deliverables with schemas
- No reusable document definitions
- Schemas are inline rather than referenced
- No conceptual document structure definition

### 5. Current Task Structure
```yaml
task:
  name: "complex_task"
  description: "A complex task"
  execution_type: "human"
  # No subtask support
```

**Issues**:
- Tasks are flat with no hierarchical structure
- No way to encapsulate sub-functionality
- Difficult to model complex tasks with mixed execution types

## Proposed Changes

### Change 1: Simplified Capability-Based Imports

**Current**:
```yaml
imports:
  - tool: "salesforce"
    version: "^2.0.0"
  - advisor: "legal-advisor"
    interface: "contract-review"
```

**Proposed**:
```yaml
imports:
  - tool: "salesforce"
    capability: "contact_management"
  - tool: "salesforce"
    capability: "opportunity_tracking"
  - advisor: "legal-advisor"
    capability: "contract_review"
  - advisor: "legal-advisor"
    capability: "compliance_check"
```

**Benefits**:
- Removes premature version complexity
- Clear capability-based imports like modern code
- Easier to track what specific capabilities are used
- Better unused import detection
- Unified structure for tools and advisors

**Schema Changes**:
```json
"import": {
  "type": "object",
  "required": ["tool", "capability"],
  "properties": {
    "tool": {
      "type": "string",
      "description": "Tool name (e.g., salesforce, stripe)"
    },
    "advisor": {
      "type": "string", 
      "description": "Advisor name (e.g., legal-advisor, data-scientist)"
    },
    "capability": {
      "type": "string",
      "description": "Specific capability or subcomponent"
    }
  },
  "oneOf": [
    {"required": ["tool", "capability"]},
    {"required": ["advisor", "capability"]}
  ]
}
```

### Change 2: Remove Role Interfaces

**Current**:
```yaml
role:
  name: "photo-editor"
  interfaces:
    inputs: [...]
    outputs: [...]
```

**Proposed**:
```yaml
role:
  name: "photo-editor"
  # No interfaces section
```

**Rationale**:
- Roles are organizational entities, not functional interfaces
- Tasks and playbooks are the functional units with interfaces
- Simplifies role definition and removes conceptual confusion
- Aligns with actual usage patterns

**Schema Changes**:
- Remove `interfaces` property from role definition
- Remove `role_interface` definition entirely
- Update validation to remove role interface checks

### Change 3: Simplified Deliverable Types

**Current**:
```yaml
deliverable:
  type: "document|data|decision|approval"
```

**Proposed**:
```yaml
deliverable:
  type: "document|data"
```

**Rationale**:
- `decision` and `approval` are conceptually just data types
- Two types are sufficient and clearer
- `data` = simple fields/function signature style
- `document` = complex structured content with schema

**Schema Changes**:
```json
"deliverable": {
  "properties": {
    "type": {
      "enum": ["document", "data"]
    }
  }
}
```

### Change 4: Document Definitions as First-Class Entities

**Current**:
```yaml
# Documents are just deliverables with inline schemas
deliverable:
  name: "contract"
  type: "document"
  schema:
    type: "json"
    definition: "inline schema"
```

**Proposed**:
```yaml
# New document definition file: documents/contract.busy
version: "1.0.0"
metadata:
  name: "Contract Document"
  description: "Legal agreement document structure"
  layer: "L0"

document:
  name: "contract"
  description: "Standard legal contract document"
  
  sections:
    - name: "parties"
      description: "Contracting parties information"
      required: true
      content_type: "structured"
      fields:
        - name: "client_name"
          type: "string"
          required: true
        - name: "client_address"
          type: "string"
          required: true
        - name: "vendor_name"
          type: "string"
          required: true
    
    - name: "terms"
      description: "Contract terms and conditions"
      required: true
      content_type: "narrative"
      guidelines: "Detailed terms including scope, deliverables, timelines, and payment terms"
    
    - name: "signatures"
      description: "Signature block"
      required: true
      content_type: "structured"
      fields:
        - name: "client_signature"
          type: "signature"
          required: true
        - name: "vendor_signature"
          type: "signature"
          required: true
        - name: "date_signed"
          type: "date"
          required: true
  
  validation_rules:
    - rule_type: "required"
      condition: "parties.client_name AND parties.vendor_name"
      error_message: "Both client and vendor names are required"
    
    - rule_type: "format"
      condition: "signatures.date_signed <= today()"
      error_message: "Signature date cannot be in the future"

# Usage in deliverables:
deliverable:
  name: "client_contract"
  type: "document"
  document_definition: "contract"  # References the document definition
  format: "pdf"
```

**Benefits**:
- Documents become first-class entities like roles and playbooks
- Reusable document definitions across the organization
- Clear separation between document structure and instances
- Conceptual documentation alongside formal structure
- Runtime will support document instances and versions
- Playbooks can reference, modify, and request changes to documents

**Schema Changes**:
```json
"document": {
  "type": "object",
  "required": ["name", "description", "sections"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*$"
    },
    "description": {
      "type": "string"
    },
    "sections": {
      "type": "array",
      "items": {"$ref": "#/definitions/document_section"}
    },
    "validation_rules": {
      "type": "array",
      "items": {"$ref": "#/definitions/validation"}
    }
  }
}
```

### Change 5: Hierarchical Task Structure

**Current**:
```yaml
task:
  name: "complex_task"
  description: "A complex task"
  execution_type: "human"
```

**Proposed**:
```yaml
task:
  name: "complex_task"
  description: "A complex task with subtasks"
  execution_type: "human"
  
  subtasks:
    - name: "analyze_requirements"
      description: "Analyze requirements using AI"
      execution_type: "ai_agent"
      agent_prompt: "Analyze the requirements and extract key information"
      estimated_duration: "15m"
      
      inputs:
        - name: "requirement_document"
          type: "document"
          document_definition: "requirements_doc"
      
      outputs:
        - name: "analyzed_requirements"
          type: "data"
          format: "json"
    
    - name: "validate_analysis"
      description: "Validate the AI analysis"
      execution_type: "human"
      estimated_duration: "30m"
      
      inputs:
        - name: "analyzed_requirements"
          type: "data"
          format: "json"
      
      outputs:
        - name: "validated_requirements"
          type: "data"
          format: "json"
  
  # Parent task inputs/outputs aggregate from subtasks
  inputs:
    - name: "requirement_document"
      type: "document"
      document_definition: "requirements_doc"
  
  outputs:
    - name: "validated_requirements"
      type: "data"
      format: "json"
```

**Benefits**:
- Tasks can encapsulate complex multi-step processes
- Mixed execution types within a single logical task
- Better organization and reusability
- Clear interfaces between subtasks
- Hierarchical structure matches real-world task breakdown

**Schema Changes**:
```json
"task": {
  "properties": {
    "subtasks": {
      "type": "array",
      "items": {"$ref": "#/definitions/task"}
    }
  }
}
```

## Implementation Impact Analysis

### 1. Schema Changes
- **Complexity**: Medium
- **Files Affected**: `busy-schema.json`
- **Breaking Changes**: Yes - existing files will need updates

### 2. Parser Changes
- **Complexity**: Medium
- **Files Affected**: `parser.ts`, validation logic
- **New Features**: Document file type support, subtask parsing

### 3. Semantic Analysis Changes
- **Complexity**: High
- **Files Affected**: `semantic-analyzer.ts`, `symbols/table.ts`
- **New Features**: Document symbol tracking, capability usage tracking, subtask analysis

### 4. Example File Updates
- **Complexity**: Medium
- **Files Affected**: All example files
- **Changes**: Remove role interfaces, update imports, update deliverable types

### 5. Documentation Updates
- **Complexity**: High
- **Files Affected**: All documentation files
- **Changes**: Update syntax references, examples, validation rules

## Implementation Task Breakdown

### Phase 1: Schema and Parser Updates (2-3 days)
1. **Update JSON Schema** (4 hours)
   - Modify import definition for capability-based imports
   - Remove role interface definition
   - Update deliverable type enum
   - Add document definition schema
   - Add subtask support to task schema

2. **Update Parser** (6 hours)
   - Add document file type support
   - Update import parsing logic
   - Remove role interface parsing
   - Add subtask parsing support
   - Update validation rules

3. **Update AST Nodes** (4 hours)
   - Add DocumentNode type
   - Update ImportNode structure
   - Remove role interface from RoleNode
   - Add subtasks to TaskNode
   - Update type definitions

### Phase 2: Semantic Analysis Updates (3-4 days)
1. **Update Symbol Table** (8 hours)
   - Add document symbol support
   - Update import capability tracking
   - Remove role interface handling
   - Add subtask symbol management
   - Update usage detection

2. **Update Semantic Analyzer** (6 hours)
   - Add document validation
   - Update import usage checking
   - Remove role interface validation
   - Add subtask validation
   - Update dead code detection

3. **Update Dependency Resolution** (4 hours)
   - Add document dependency tracking
   - Update import capability resolution
   - Add subtask dependency handling

### Phase 3: Example and Documentation Updates (2-3 days)
1. **Update Example Files** (6 hours)
   - Remove interfaces from all role files
   - Update imports in all files
   - Update deliverable types
   - Create example document definitions
   - Add subtask examples

2. **Update Documentation** (8 hours)
   - Update language reference
   - Update validation error reference
   - Update developer guide
   - Update architecture documentation
   - Add document definition guide

3. **Update Tests** (4 hours)
   - Update existing tests
   - Add document definition tests
   - Add subtask tests
   - Update validation tests

## Risk Assessment

### High Risk
- **Breaking Changes**: All existing files will need updates
- **Complexity**: Document definitions add significant complexity
- **Validation**: New validation rules need thorough testing

### Medium Risk
- **Migration**: Existing files need systematic updates
- **Documentation**: Extensive documentation updates required
- **Testing**: Comprehensive test suite updates needed

### Low Risk
- **Core Architecture**: Changes don't affect core compilation pipeline
- **Backwards Compatibility**: Clear migration path exists

## Example File Updates

Since this is a greenfield project with no production BUSY files, the only "migration" needed is updating the example files in the compiler project:

### Example Files to Update
- `compiler/examples/solo-photography-business/` - All .busy files
- Any test fixtures or documentation examples

### Update Process
1. **Schema Update**: Deploy new schema validation
2. **Example Updates**: Update all example files to new syntax
3. **Validation**: Ensure 100% health score on all examples
4. **Documentation**: Update language reference and guides
- Troubleshooting guide for common issues

## Future Considerations

### 1. Document Versioning
- Runtime will support document instances and versions
- Playbooks can request changes and modifications
- Version control for document definitions

### 2. Advanced Import Management
- Package-level versioning system
- Import dependency resolution
- Capability compatibility checking

### 3. Subtask Optimization
- Parallel subtask execution
- Subtask result caching
- Dynamic subtask generation

## Conclusion

These changes will significantly improve the BUSY language by:
- Simplifying imports and removing premature complexity
- Clarifying role vs. task distinctions
- Reducing deliverable type confusion
- Introducing powerful document definition capabilities
- Enabling hierarchical task modeling

The implementation requires careful planning and systematic updates, but the benefits justify the effort. The changes align with real-world usage patterns and prepare the language for future runtime capabilities.

## Next Steps

1. **Review and Approval**: Stakeholder review of this design document
2. **Implementation Planning**: Detailed task breakdown and scheduling
3. **Development**: Implement changes according to the phased approach
4. **Testing**: Comprehensive testing of all changes
5. **Migration**: Deploy changes and migrate existing files
6. **Documentation**: Update all documentation and examples

This design provides a clear path forward for evolving the BUSY language specification while maintaining its core strengths and improving usability.