# BUSY Compiler Architecture Documentation

**Version**: 1.0.0  
**Purpose**: Comprehensive documentation of the BUSY compiler architecture and analysis pipeline

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Compilation Pipeline](#compilation-pipeline)
4. [Analysis Pipeline](#analysis-pipeline)
5. [Symbol Table Management](#symbol-table-management)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Extension Points](#extension-points)

## Overview

The BUSY compiler is a multi-stage compilation and analysis system that transforms BUSY language files into validated, analyzed organizational structures. The architecture follows a traditional compiler design with distinct phases for scanning, parsing, semantic analysis, and optimization.

### Key Design Principles

- **Separation of Concerns**: Each phase has distinct responsibilities
- **Modularity**: Components are loosely coupled and easily testable
- **Extensibility**: New analysis passes can be added without modifying core components
- **Performance**: Optimized for large-scale organizational codebases
- **Error Recovery**: Comprehensive error handling and recovery mechanisms

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Scanner     │ -> │     Parser      │ -> │  AST Builder    │
│  (File Discovery)│    │  (YAML Parse)   │    │ (Tree Creation) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Symbol Table   │ <- │    Semantic     │ <- │   Analysis      │
│    Builder      │    │    Analyzer     │    │   Engine        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Reporter     │ <- │  Validation     │ <- │  Multi-Pass     │
│   (Output)      │    │   Results       │    │   Analysis      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Architecture Components

### 1. Core Compiler Components

#### Scanner (`src/core/scanner.ts`)
**Purpose**: File discovery and initial processing

**Responsibilities**:
- Recursive directory traversal
- BUSY file identification (`.busy` extension)
- Namespace extraction from file paths
- Layer validation (L0/L1/L2)
- File metadata collection

**Key Features**:
- Parallel file discovery for large codebases
- Configurable file filtering
- Namespace validation
- Error recovery for malformed directory structures

**Interface**:
```typescript
interface ScanResult {
  files: string[];              // Discovered BUSY files
  namespaces: NamespaceInfo[];  // Extracted namespace information
  errors: ScanError[];          // Discovery errors
  stats: ScanStats;            // Performance metrics
}
```

#### Parser (`src/core/parser.ts`)
**Purpose**: YAML parsing and schema validation

**Responsibilities**:
- YAML syntax validation
- JSON schema compliance checking
- AST node creation
- Semantic validation (beyond schema)
- Error position tracking

**Key Features**:
- Parallel parsing for performance
- Schema validation with detailed error reporting
- Semantic validation rules
- Line/column error positioning

**Interface**:
```typescript
interface ParseResult {
  parsedFiles: ParsedFile[];           // Successfully parsed files
  parseErrors: ParseError[];           // Parse failures
  validationResults: FileValidationResult[];  // Schema validation results
  stats: ParseStats;                   // Performance metrics
}
```

#### AST Builder (`src/ast/builder.ts`)
**Purpose**: Abstract Syntax Tree construction

**Responsibilities**:
- Converting parsed YAML to AST nodes
- Symbol extraction and cataloging
- Dependency graph construction
- Reference resolution preparation

**Key Features**:
- Strongly typed AST nodes
- Efficient symbol table construction
- Dependency tracking
- Memory-efficient tree structures

### 2. Symbol Management

#### Symbol Table (`src/symbols/table.ts`)
**Purpose**: Symbol definition and usage tracking

**Responsibilities**:
- Symbol registration and lookup
- Usage tracking and dead code detection
- Inheritance chain resolution
- Cross-file reference management

**Key Features**:
- Multi-symbol type support (roles, playbooks, tasks, etc.)
- Efficient symbol lookup
- Usage pattern analysis
- Team-role relationship detection

**Symbol Types**:
```typescript
interface SymbolTable {
  roles: Map<string, RoleSymbol>;
  playbooks: Map<string, PlaybookSymbol>;
  tasks: Map<string, TaskSymbol>;
  deliverables: Map<string, DeliverableSymbol>;
  tools: Map<string, ToolSymbol>;
  advisors: Map<string, AdvisorSymbol>;
  teams: Map<string, TeamSymbol>;
}
```

#### Symbol Usage Detection
- **Direct References**: Explicit symbol usage in definitions
- **Inheritance Chains**: Parent-child role relationships
- **Directory Structure**: Team-role relationships via file organization
- **Playbook Execution**: Task usage within playbooks
- **Interface Connections**: Input/output deliverable flows

### 3. Analysis Pipeline

#### Main Analysis Engine (`src/analysis/analyzer.ts`)
**Purpose**: Orchestrates all analysis passes

**Responsibilities**:
- Analysis pass coordination
- Configuration management
- Result aggregation
- Performance monitoring

**Analysis Passes**:
1. **Semantic Analysis**: Symbol resolution and validation
2. **Dependency Resolution**: Dependency graph construction
3. **Type Checking**: Interface compatibility verification
4. **Interface Validation**: Input/output matching
5. **Governance Validation**: Policy compliance checking
6. **Resource Analysis**: Resource allocation optimization
7. **Performance Analysis**: Bottleneck identification
8. **Security Analysis**: Vulnerability detection
9. **Quality Analysis**: Code quality assessment

#### Semantic Analyzer (`src/analysis/semantic-analyzer.ts`)
**Purpose**: Core semantic validation and analysis

**Responsibilities**:
- Symbol usage analysis
- Dead code detection
- Naming convention validation
- Scope violation detection
- Import usage verification

**Key Features**:
- Comprehensive symbol tracking
- Multi-level usage analysis
- Pattern detection
- Circular reference detection

**Analysis Types**:
```typescript
interface SemanticAnalysisResult {
  symbolUsage: Map<string, SymbolUsageInfo>;
  errors: AnalysisError[];
  warnings: AnalysisWarning[];
  info: AnalysisInfo[];
}
```

#### Dependency Resolver (`src/analysis/dependency-resolver.ts`)
**Purpose**: Dependency graph analysis and resolution

**Responsibilities**:
- Dependency graph construction
- Circular dependency detection
- Topological sorting
- Critical path analysis

#### Type Checker (`src/analysis/type-checker.ts`)
**Purpose**: Type system validation

**Responsibilities**:
- Deliverable type validation
- Interface signature checking
- Type compatibility verification
- Schema validation

#### Task Dependency Validator (`src/analysis/task-validator.ts`)
**Purpose**: Task input/output compatibility verification

**Responsibilities**:
- Input/output matching between tasks
- Format compatibility checking
- Required field validation
- Interface evolution tracking

### 4. Specialized Analyzers

#### Performance Analyzer (`src/analysis/performance-analyzer.ts`)
**Purpose**: Performance bottleneck identification

**Capabilities**:
- Execution time estimation
- Resource usage prediction
- Bottleneck detection
- Scalability assessment

#### Security Analyzer (`src/analysis/security-analyzer.ts`)
**Purpose**: Security vulnerability detection

**Capabilities**:
- Access control validation
- Data flow security analysis
- Escalation path verification
- Privilege escalation detection

#### Quality Analyzer (`src/analysis/quality-analyzer.ts`)
**Purpose**: Code quality assessment

**Capabilities**:
- Complexity analysis
- Maintainability metrics
- Documentation coverage
- Best practice adherence

#### Resource Analyzer (`src/analysis/resource-analyzer.ts`)
**Purpose**: Resource allocation optimization

**Capabilities**:
- Resource requirement analysis
- Conflict detection
- Utilization optimization
- Capacity planning

#### Governance Validator (`src/analysis/governance-validator.ts`)
**Purpose**: Policy compliance verification

**Capabilities**:
- Layer boundary enforcement
- Escalation path validation
- Decision authority verification
- Policy violation detection

## Compilation Pipeline

### 1. Scanning Phase

**Process**:
1. **Directory Traversal**: Recursive search for `.busy` files
2. **Namespace Extraction**: Parse file paths for organizational structure
3. **Layer Validation**: Verify L0/L1/L2 directory organization
4. **File Filtering**: Apply configured file filters
5. **Error Collection**: Gather and report discovery errors

**Output**: `ScanResult` with file paths and metadata

### 2. Parsing Phase

**Process**:
1. **YAML Parsing**: Convert YAML to JavaScript objects
2. **Schema Validation**: Validate against JSON schema
3. **Semantic Validation**: Additional semantic checks
4. **Error Recovery**: Attempt to parse despite errors
5. **Position Tracking**: Record line/column positions for errors

**Output**: `ParseResult` with parsed files and validation results

### 3. AST Construction Phase

**Process**:
1. **Node Creation**: Convert parsed data to AST nodes
2. **Symbol Extraction**: Identify and catalog symbols
3. **Reference Collection**: Gather symbol references
4. **Dependency Mapping**: Build initial dependency graph
5. **Validation**: Verify AST integrity

**Output**: `BusyAST` with complete syntax tree

### 4. Symbol Table Construction

**Process**:
1. **Symbol Registration**: Register all defined symbols
2. **Reference Resolution**: Link references to definitions
3. **Usage Tracking**: Mark symbol usage patterns
4. **Inheritance Processing**: Resolve inheritance chains
5. **Team Organization**: Map team-role relationships

**Output**: Complete symbol table with usage information

## Analysis Pipeline

### 1. Multi-Pass Analysis Architecture

The analysis pipeline uses a multi-pass approach for comprehensive validation:

```typescript
class Analyzer {
  async analyze(ast: BusyAST): Promise<AnalysisResult> {
    const passes = [
      this.semanticAnalyzer,
      this.dependencyResolver,
      this.typeChecker,
      this.taskValidator,
      this.governanceValidator,
      this.resourceAnalyzer,
      this.performanceAnalyzer,
      this.securityAnalyzer,
      this.qualityAnalyzer
    ];
    
    // Execute passes in sequence
    for (const pass of passes) {
      await pass.analyze(ast, result);
    }
    
    return result;
  }
}
```

### 2. Pass Dependencies

**Analysis Pass Order**:
1. **Semantic Analysis** (foundation)
2. **Dependency Resolution** (requires symbols)
3. **Type Checking** (requires dependencies)
4. **Task Validation** (requires types)
5. **Governance Validation** (requires structure)
6. **Resource Analysis** (requires task dependencies)
7. **Performance Analysis** (requires resources)
8. **Security Analysis** (requires all structure)
9. **Quality Analysis** (requires complete analysis)

### 3. Analysis Configuration

**Configuration Options**:
```typescript
interface AnalysisConfiguration {
  enabledPasses: AnalysisPass[];
  severityThresholds: SeverityThresholds;
  performance: PerformanceSettings;
  customRules: CustomRule[];
}
```

**Performance Settings**:
- **Parallel Analysis**: Enable concurrent analysis passes
- **Caching**: Cache analysis results for incremental compilation
- **Memory Limits**: Control memory usage for large codebases
- **Timeout Controls**: Prevent analysis from hanging

### 4. Result Aggregation

**Analysis Results**:
```typescript
interface AnalysisResult {
  ast: AnnotatedAST;              // AST with analysis annotations
  report: AnalysisReport;         // Comprehensive analysis report
  isValid: boolean;               // Overall validation status
  metadata: AnalysisMetadata;     // Analysis metadata
}
```

**Health Scoring**:
- **Error Impact**: Critical errors heavily penalize score
- **Warning Consideration**: Warnings moderately impact score
- **Symbol Usage**: Dead code detection affects score
- **Best Practices**: Adherence to conventions impacts score

## Symbol Table Management

### 1. Symbol Registration

**Registration Process**:
1. **Discovery**: Find symbol definitions during AST construction
2. **Validation**: Verify symbol name and structure
3. **Cataloging**: Add to appropriate symbol table
4. **Indexing**: Create lookup indexes for performance

**Symbol Categories**:
- **Roles**: Individual contributor definitions
- **Playbooks**: Process and workflow definitions
- **Tasks**: Atomic work unit definitions
- **Deliverables**: Data and document definitions
- **Tools**: External system integrations
- **Advisors**: AI assistant definitions
- **Teams**: Organizational unit definitions

### 2. Usage Tracking

**Usage Detection Methods**:
- **Direct References**: Explicit symbol usage in definitions
- **Inheritance**: Parent-child relationships
- **Directory Structure**: Team-role organizational relationships
- **Playbook Execution**: Task execution within playbooks
- **Interface Connections**: Input/output flows

**Usage Patterns**:
```typescript
interface SymbolUsageInfo {
  referenceCount: number;
  referenceTypes: Map<string, number>;
  usagePatterns: UsagePattern[];
  isDeadCode: boolean;
  circularReferences: SymbolReference[];
}
```

### 3. Dead Code Detection

**Detection Algorithm**:
1. **Mark Phase**: Mark all directly referenced symbols
2. **Sweep Phase**: Mark transitively referenced symbols
3. **Usage Analysis**: Analyze usage patterns
4. **Report Generation**: Report unused symbols

**Special Cases**:
- **Teams**: Always considered used (organizational structure)
- **Inheritance**: Parent roles marked as used
- **Playbook Tasks**: Tasks in used playbooks marked as used
- **Interface Deliverables**: Input/output deliverables marked as used

## Error Handling

### 1. Error Categories

**Compilation Errors**:
- **YAML Syntax**: Malformed YAML files
- **Schema Validation**: JSON schema violations
- **Semantic Errors**: Naming conventions, undefined references
- **Type Errors**: Interface mismatches, type incompatibilities

**Analysis Errors**:
- **Dependency Errors**: Circular dependencies, unresolved references
- **Governance Errors**: Policy violations, layer boundary crossings
- **Performance Errors**: Resource conflicts, bottlenecks
- **Security Errors**: Vulnerability detection, access control issues

### 2. Error Recovery

**Recovery Strategies**:
- **Continue Processing**: Attempt to continue despite errors
- **Error Isolation**: Isolate errors to prevent cascade failures
- **Partial Results**: Provide partial analysis when possible
- **Suggestion Generation**: Provide fix suggestions for errors

**Error Context**:
- **Location Information**: File, line, column positions
- **Context Preservation**: Maintain error context for debugging
- **Suggested Fixes**: Provide actionable error resolution guidance
- **Related Errors**: Group related errors for easier resolution

### 3. Validation Workflow

**Validation Stages**:
1. **Syntax Validation**: YAML parsing and basic structure
2. **Schema Validation**: JSON schema compliance
3. **Semantic Validation**: Business logic and constraints
4. **Cross-Reference Validation**: Symbol resolution and usage
5. **Quality Validation**: Best practices and optimization

## Performance Optimization

### 1. Compilation Performance

**Optimization Strategies**:
- **Parallel Processing**: Concurrent file processing
- **Incremental Compilation**: Only recompile changed files
- **Caching**: Cache parsed results and analysis
- **Memory Management**: Efficient memory usage for large codebases

**Performance Metrics**:
- **Compilation Time**: Total time for full compilation
- **Memory Usage**: Peak memory consumption
- **Throughput**: Files processed per second
- **Cache Hit Rate**: Effectiveness of caching

### 2. Analysis Performance

**Optimization Techniques**:
- **Pass Ordering**: Optimize analysis pass sequence
- **Early Termination**: Stop analysis on critical errors
- **Selective Analysis**: Run only required analysis passes
- **Result Caching**: Cache analysis results between runs

**Scalability Considerations**:
- **Large Codebases**: Efficient handling of 1000+ files
- **Memory Limits**: Configurable memory usage limits
- **Timeout Controls**: Prevent analysis from hanging
- **Progress Reporting**: User feedback during long operations

### 3. Symbol Table Performance

**Optimization Features**:
- **Efficient Lookups**: O(1) symbol lookup using maps
- **Lazy Loading**: Load symbols on demand
- **Reference Indexing**: Fast reference resolution
- **Usage Caching**: Cache usage analysis results

## Extension Points

### 1. Custom Analysis Passes

**Adding New Analyzers**:
```typescript
class CustomAnalyzer {
  async analyze(ast: BusyAST, result: AnalysisResult): Promise<void> {
    // Custom analysis logic
  }
}

// Register with analysis engine
analyzer.addCustomPass(new CustomAnalyzer());
```

### 2. Custom Validation Rules

**Rule Definition**:
```typescript
interface CustomRule {
  name: string;
  description: string;
  implementation: (ast: BusyAST) => AnalysisError[];
  configuration?: Record<string, unknown>;
}
```

### 3. Reporter Extensions

**Custom Output Formats**:
- **JSON Reporter**: Machine-readable results
- **HTML Reporter**: Interactive web reports
- **Console Reporter**: Terminal-friendly output
- **Custom Formats**: Extensible reporter system

### 4. Schema Extensions

**Custom Schema Definitions**:
- **Field Extensions**: Add custom fields to existing types
- **Type Extensions**: Define new symbol types
- **Validation Extensions**: Add custom validation rules
- **Format Extensions**: Support new deliverable formats

## Development Guidelines

### 1. Code Organization

**Module Structure**:
- **Core**: Scanner, Parser, AST Builder
- **Analysis**: All analysis passes and types
- **Symbols**: Symbol table and management
- **CLI**: Command-line interface
- **Utils**: Utility functions and helpers

### 2. Testing Strategy

**Test Categories**:
- **Unit Tests**: Individual component testing
- **Integration Tests**: Cross-component testing
- **End-to-End Tests**: Full compilation pipeline
- **Performance Tests**: Scalability and performance validation

### 3. Documentation Requirements

**Documentation Standards**:
- **API Documentation**: Complete TypeScript interface documentation
- **Architecture Documentation**: High-level design documentation
- **User Documentation**: End-user guides and references
- **Developer Documentation**: Contributor guides and development setup

This architecture documentation provides a comprehensive understanding of the BUSY compiler's design, implementation, and extension points for maintainers and contributors.