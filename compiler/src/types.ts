/**
 * Type re-exports for convenience
 */

// Core types
export type { ScanResult, ImportDependency, DependencyValidation } from './core/scanner';
export type { ParseResult, ParsedFile, BusyFileContent } from './core/parser';
export type { BuildResult, BuildStats, BuildError, BuildWarning } from './ast/builder';
export type { CompilerConfig, ValidateOptions, OutputFormat, Severity } from './config/types';

// AST types
export type {
  BusyAST,
  BusyFileNode,
  TeamNode,
  RoleNode,
  PlaybookNode,
  TaskNode,
  DeliverableNode,
  ImportNode,
  ResourceNode,
  SymbolTable,
  Symbol,
  RoleSymbol,
  PlaybookSymbol,
  TaskSymbol,
  DeliverableSymbol,
  ToolSymbol,
  AdvisorSymbol,
  TeamSymbol,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  CyclicDependency,
  SourceLocation
} from './ast/nodes';

// CLI types
export type {
  CompilationResult,
  AnalysisResult,
  Issue,
  AutoFix,
  FileChange,
  CompilationSummary,
  Reporter
} from './cli/types';

// Utility types
export type {
  ParsedYaml,
  YamlParseError,
  ValidationResult,
  ValidationError,
  SourcePosition,
  SourceRange
} from './utils/yaml-utils';

export type {
  NamespaceInfo,
  FileGroup,
  StructureValidation
} from './utils/path-utils';