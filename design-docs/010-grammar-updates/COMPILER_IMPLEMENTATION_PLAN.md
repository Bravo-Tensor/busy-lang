# BUSY v2.0 Compiler Implementation Plan

## Overview

This document outlines the specific implementation steps to update the BUSY compiler from v1.0 to v2.0, incorporating the three major refinements:

1. **Capability/Responsibility Model**
2. **Runtime Execution Strategy** (remove execution types)
3. **Resource Management** (first-class resources)

## Implementation Progress

### ✅ Completed
- [x] Grammar specification updates
- [x] JSON schema definitions for v2.0
- [x] AST node definitions for v2.0

### 🔄 In Progress
- [ ] Parser updates
- [ ] Symbol table enhancements
- [ ] Validator modifications
- [ ] Code generator updates

## Phase 2.1: Parser Modifications (3 days)

### Files to Update
- `src/core/parser.ts` - Main parser logic
- `src/utils/yaml-utils.ts` - YAML parsing utilities

### Specific Changes

#### 1. Add New Node Type Parsing
```typescript
// Add to parser switch statement
case 'capability':
  return this.parseCapability(yamlNode);
case 'responsibility':
  return this.parseResponsibility(yamlNode);
case 'resource':
  return this.parseResourceDefinition(yamlNode);
```

#### 2. Update Import Parsing
```typescript
parseImport(importNode: any): ImportNode {
  // Support new import types: capability, tool, advisor
  const importType = importNode.capability ? 'capability' :
                    importNode.tool ? 'tool' : 'advisor';
  
  return {
    type: 'Import',
    importType,
    name: importNode[importType],
    version: importNode.version,
    interface: importNode.interface
  };
}
```

#### 3. Update Role Parsing
```typescript
parseRole(roleNode: any): RoleNode {
  return {
    type: 'Role',
    name: roleNode.name,
    description: roleNode.description,
    capabilities: roleNode.capabilities || [],
    responsibilities: roleNode.responsibilities || [],
    bringsResources: (roleNode.brings_resources || []).map(r => this.parseResourceDefinition(r))
  };
}
```

#### 4. Update Step Parsing (replaces Task parsing)
```typescript
parseStep(stepNode: any): StepNode {
  return {
    type: 'Step',
    name: stepNode.name,
    description: stepNode.description,
    method: stepNode.method, // NEW: unified method field
    inputs: (stepNode.inputs || []).map(i => this.parseInputOutputSpec(i)),
    outputs: (stepNode.outputs || []).map(o => this.parseInputOutputSpec(o)),
    requirements: (stepNode.requirements || []).map(r => this.parseRequirement(r)),
    responsibilities: stepNode.responsibilities || [],
    issues: (stepNode.issues || []).map(i => this.parseIssue(i)),
    estimatedDuration: stepNode.estimated_duration
  };
}
```

#### 5. Add New Parser Methods
```typescript
parseCapability(capNode: any): CapabilityNode {
  return {
    type: 'Capability',
    name: capNode.name,
    description: capNode.description,
    method: capNode.method,
    inputs: this.parseInputsOutputs(capNode.inputs),
    outputs: this.parseInputsOutputs(capNode.outputs)
  };
}

parseResponsibility(respNode: any): ResponsibilityNode {
  return {
    type: 'Responsibility',
    name: respNode.name,
    description: respNode.description,
    method: respNode.method,
    inputs: this.parseInputsOutputs(respNode.inputs),
    outputs: this.parseInputsOutputs(respNode.outputs)
  };
}

parseResourceDefinition(resNode: any): ResourceDefinitionNode {
  return {
    type: 'ResourceDefinition',
    name: resNode.name,
    extends: resNode.extends,
    characteristics: resNode.characteristics || {}
  };
}

parseRequirement(reqNode: any): RequirementNode {
  return {
    type: 'Requirement',
    name: reqNode.name,
    characteristics: reqNode.characteristics,
    priority: (reqNode.priority || []).map(p => this.parsePriorityItem(p))
  };
}

parseInputsOutputs(spec: any): InputOutputSpec[] {
  if (spec === "none" || !spec) return [];
  return spec.map(s => this.parseInputOutputSpec(s));
}
```

## Phase 2.2: AST Modifications (4 days)

### Files to Update
- `src/ast/builder.ts` - AST building logic
- `src/ast/nodes.ts` - Update to use v2 nodes or create migration

### Specific Changes

#### 1. Update AST Builder
```typescript
class ASTBuilder {
  buildFromParsedFiles(parsedFiles: ParsedFile[]): BusyAST {
    const ast: BusyAST = {
      type: 'BusyAST',
      files: new Map(),
      symbols: new SymbolTable(),
      dependencies: new DependencyGraph(),
      metadata: this.buildRepositoryMetadata(parsedFiles)
    };

    // Build files with v2.0 nodes
    for (const file of parsedFiles) {
      const fileNode = this.buildFileNode(file);
      ast.files.set(file.filePath, fileNode);
      
      // Extract capabilities, responsibilities, resources for symbol table
      this.extractSymbols(fileNode, ast.symbols);
    }

    return ast;
  }

  extractSymbols(fileNode: BusyFileNode, symbolTable: SymbolTable) {
    // Add capabilities to symbol table
    for (const capability of fileNode.capabilities) {
      symbolTable.addCapability(capability);
    }
    
    // Add responsibilities to symbol table
    for (const responsibility of fileNode.responsibilities) {
      symbolTable.addResponsibility(responsibility);
    }
    
    // Add resources to symbol table
    for (const resource of fileNode.resources) {
      symbolTable.addResource(resource);
    }
  }
}
```

## Phase 2.3: Validator Enhancements (3 days)

### Files to Update
- `src/analysis/semantic-analyzer.ts` - Core validation logic
- `src/analysis/interface-validator.ts` - Interface validation

### Specific Changes

#### 1. Capability Resolution Validation
```typescript
class CapabilityValidator {
  validateCapabilityReferences(ast: BusyAST): ValidationResult[] {
    const errors: ValidationResult[] = [];
    
    // Check that all capability references can be resolved
    for (const [, fileNode] of ast.files) {
      if (fileNode.content.type === 'Role') {
        const role = fileNode.content as RoleNode;
        for (const capabilityName of role.capabilities) {
          if (!ast.symbols.hasCapability(capabilityName)) {
            errors.push({
              type: 'error',
              message: `Capability '${capabilityName}' not found`,
              file: fileNode.filePath,
              location: this.getCapabilityLocation(role, capabilityName)
            });
          }
        }
      }
    }
    
    return errors;
  }
}
```

#### 2. Resource Requirement Validation
```typescript
class ResourceValidator {
  validateResourceRequirements(ast: BusyAST): ValidationResult[] {
    const errors: ValidationResult[] = [];
    
    // Check that resource requirements can potentially be satisfied
    for (const [, fileNode] of ast.files) {
      if (fileNode.content.type === 'Playbook') {
        const playbook = fileNode.content as PlaybookNode;
        for (const step of playbook.steps) {
          for (const requirement of step.requirements) {
            this.validateRequirement(requirement, ast.symbols, errors);
          }
        }
      }
    }
    
    return errors;
  }
}
```

## Phase 2.4: Code Generator Adaptations (4 days)

### Files to Update
- `src/generators/runtime-generator.ts` - Main code generation
- `src/generators/types/interface-generator.ts` - Interface generation

### Specific Changes

#### 1. Capability Interface Generation
```typescript
class InterfaceGenerator {
  generateCapabilityInterface(capability: CapabilityNode): string {
    const inputTypes = this.generateInputTypes(capability.inputs);
    const outputTypes = this.generateOutputTypes(capability.outputs);
    
    return `
export interface ${this.toPascalCase(capability.name)}Capability {
  name: "${capability.name}";
  description: "${capability.description}";
  method: "${capability.method}";
  execute(inputs: ${inputTypes}): Promise<${outputTypes}>;
}`;
  }
}
```

#### 2. Execution Stub Generation
```typescript
class ExecutionStubGenerator {
  generateExecutionStubs(step: StepNode): ExecutionStubs {
    return {
      algorithmic: this.generateAlgorithmicStub(step),
      ai: this.generateAIStub(step),
      human: this.generateHumanStub(step)
    };
  }
  
  generateAlgorithmicStub(step: StepNode): string {
    return `
// Algorithmic implementation for ${step.name}
export async function ${step.name}_algorithmic(inputs: any): Promise<any> {
  // Generated from method: ${step.method}
  // TODO: Implement algorithmic logic
  throw new Error("Algorithmic implementation not yet provided");
}`;
  }
  
  generateAIStub(step: StepNode): string {
    return `
// AI implementation for ${step.name}
export async function ${step.name}_ai(inputs: any): Promise<any> {
  const prompt = \`${step.method}\`;
  // TODO: Call AI service with prompt and inputs
  throw new Error("AI implementation not yet provided");
}`;
  }
  
  generateHumanStub(step: StepNode): string {
    return `
// Human implementation for ${step.name}
export async function ${step.name}_human(inputs: any): Promise<any> {
  const instructions = \`${step.method}\`;
  // TODO: Generate UI for human execution
  throw new Error("Human implementation not yet provided");
}`;
  }
}
```

#### 3. Resource Registry Generation
```typescript
class ResourceRegistryGenerator {
  generateResourceRegistry(resources: ResourceDefinitionNode[]): string {
    const resourceDefs = resources.map(r => this.generateResourceDefinition(r)).join(',\n');
    
    return `
export const ResourceRegistry = {
${resourceDefs}
};

export class ResourceManager {
  private resources = new Map<string, any>();
  
  constructor() {
    // Initialize with resource definitions
    Object.entries(ResourceRegistry).forEach(([name, def]) => {
      this.resources.set(name, def);
    });
  }
  
  findResource(requirements: ResourceRequirement): Resource | null {
    // Implementation for resource matching and priority chains
    return this.matchByPriority(requirements);
  }
}`;
  }
}
```

## Testing Strategy

### Unit Tests
- Parser tests for new syntax elements
- AST builder tests for v2.0 nodes
- Validator tests for capability resolution
- Code generator tests for stub generation

### Integration Tests
- End-to-end compilation of v2.0 examples
- Migration tests from v1.0 to v2.0
- Resource matching and priority chain tests

### Example Test Cases
```typescript
describe('BUSY v2.0 Parser', () => {
  it('should parse capability definitions', async () => {
    const yamlContent = `
version: "2.0"
metadata:
  name: "test-capability"
  description: "Test capability"
  layer: "L0"

capability:
  name: "process-payment"
  description: "Process payment transactions"
  method: |
    Validate payment information.
    Process through gateway.
    Return confirmation.
  inputs:
    - name: "payment_info"
      type: "data"
      fields:
        - name: "amount"
          type: "number"
          required: true
  outputs:
    - name: "confirmation"
      type: "data"
      fields:
        - name: "transaction_id"
          type: "string"
          required: true
`;

    const result = await parser.parse([{
      filePath: 'test.busy',
      content: yamlContent
    }]);
    
    expect(result.parsedFiles).toHaveLength(1);
    expect(result.parsedFiles[0].yaml.data.capability.name).toBe('process-payment');
  });
});
```

## Migration Strategy

### Automated Migration Tool
Create a migration utility that:
1. Converts `tasks` → `capabilities` in roles
2. Removes `execution_type` fields from steps
3. Converts implicit resources to explicit requirements
4. Adds `method` fields from existing descriptions

### Backward Compatibility
- Support both v1.0 and v2.0 parsing during transition
- Emit warnings for deprecated v1.0 syntax
- Provide clear migration paths

## Success Criteria

### Technical Metrics
- [ ] 100% of v2.0 grammar constructs parseable
- [ ] All v2.0 schema validation passes
- [ ] Generated code compiles without errors
- [ ] Migration tool achieves >95% success rate

### Quality Metrics
- [ ] >95% test coverage for new code
- [ ] Zero breaking changes for valid v2.0 syntax
- [ ] Performance within 10% of v1.0 compiler

This implementation plan provides the detailed roadmap for updating the BUSY compiler to support v2.0 specifications while maintaining quality and backward compatibility during the transition.