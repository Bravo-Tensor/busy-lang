/**
 * Analysis Types and Interfaces
 * Defines the types used in semantic analysis and validation phases
 */

import type { 
  BusyAST, 
  Symbol, 
  SymbolReference, 
  DependencyGraph,
  CyclicDependency,
  NamespaceInfo 
} from '@/ast/nodes';

/**
 * Analysis result containing validated AST and analysis metadata
 */
export interface AnalysisResult {
  /** Original AST with analysis annotations */
  ast: AnnotatedAST;
  
  /** Analysis report with findings */
  report: AnalysisReport;
  
  /** Validation status */
  isValid: boolean;
  
  /** Analysis metadata */
  metadata: AnalysisMetadata;
}

/**
 * AST annotated with analysis information
 */
export interface AnnotatedAST extends BusyAST {
  /** Analysis annotations */
  annotations: AnalysisAnnotations;
  
  /** Resolved dependencies */
  resolvedDependencies: ResolvedDependencyGraph;
  
  /** Type information */
  typeInfo: TypeInformation;
}

/**
 * Analysis annotations throughout the AST
 */
export interface AnalysisAnnotations {
  /** Symbol usage information */
  symbolUsage: Map<string, SymbolUsageInfo>;
  
  /** Interface compatibility checks */
  interfaceChecks: Map<string, InterfaceCompatibility>;
  
  /** Resource allocation analysis */
  resourceAnalysis: Map<string, ResourceAnalysis>;
  
  /** Governance constraint violations */
  governanceViolations: GovernanceViolation[];
  
  /** Performance analysis */
  performanceMetrics: PerformanceMetrics;
}

/**
 * Enhanced dependency graph with resolution information
 */
export interface ResolvedDependencyGraph extends DependencyGraph {
  /** Resolution status for each dependency */
  resolutionStatus: Map<string, DependencyResolution>;
  
  /** Topological ordering */
  topologicalOrder: string[];
  
  /** Critical path analysis */
  criticalPaths: CriticalPath[];
  
  /** Layer dependency violations */
  layerViolations: LayerViolation[];
}

/**
 * Type information throughout the system
 */
export interface TypeInformation {
  /** Deliverable type mappings */
  deliverableTypes: Map<string, DeliverableTypeInfo>;
  
  /** Interface signatures */
  interfaceSignatures: Map<string, InterfaceSignature>;
  
  /** Role capability mappings */
  roleCapabilities: Map<string, RoleCapability>;
}

/**
 * Symbol usage analysis
 */
export interface SymbolUsageInfo {
  /** Total references */
  referenceCount: number;
  
  /** Reference types breakdown */
  referenceTypes: Map<string, number>;
  
  /** Usage patterns */
  usagePatterns: UsagePattern[];
  
  /** Dead code detection */
  isDeadCode: boolean;
  
  /** Circular reference detection */
  circularReferences: SymbolReference[];
}

/**
 * Interface compatibility analysis
 */
export interface InterfaceCompatibility {
  /** Whether interfaces are compatible */
  isCompatible: boolean;
  
  /** Missing inputs */
  missingInputs: string[];
  
  /** Extra inputs */
  extraInputs: string[];
  
  /** Type mismatches */
  typeMismatches: TypeMismatch[];
  
  /** Format incompatibilities */
  formatIssues: FormatIssue[];
}

/**
 * Resource allocation analysis
 */
export interface ResourceAnalysis {
  /** Total resource requirements */
  totalRequirements: ResourceRequirement[];
  
  /** Resource conflicts */
  conflicts: ResourceConflict[];
  
  /** Utilization patterns */
  utilization: ResourceUtilization[];
  
  /** Optimization suggestions */
  optimizations: ResourceOptimization[];
}

/**
 * Governance constraint violation
 */
export interface GovernanceViolation {
  /** Violation type */
  violationType: 'layer_crossing' | 'unauthorized_escalation' | 'resource_excess' | 'policy_breach';
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  
  /** Description */
  description: string;
  
  /** Location in code */
  location: string;
  
  /** Suggested fix */
  suggestedFix?: string;
  
  /** Policy reference */
  policyReference?: string;
}

/**
 * Performance metrics analysis
 */
export interface PerformanceMetrics {
  /** Estimated execution times */
  executionTimes: Map<string, ExecutionTimeEstimate>;
  
  /** Resource usage predictions */
  resourceUsage: Map<string, ResourceUsageEstimate>;
  
  /** Bottleneck analysis */
  bottlenecks: PerformanceBottleneck[];
  
  /** Scalability assessment */
  scalabilityFactors: ScalabilityFactor[];
}

/**
 * Dependency resolution status
 */
export interface DependencyResolution {
  /** Whether dependency is resolved */
  isResolved: boolean;
  
  /** Resolution method */
  resolutionMethod: 'direct' | 'inheritance' | 'interface' | 'external';
  
  /** Resolved target */
  resolvedTarget?: Symbol;
  
  /** Resolution errors */
  errors: string[];
  
  /** Warnings */
  warnings: string[];
}

/**
 * Critical path in dependency graph
 */
export interface CriticalPath {
  /** Nodes in critical path */
  nodes: string[];
  
  /** Total estimated duration */
  totalDuration: number;
  
  /** Bottleneck nodes */
  bottlenecks: string[];
  
  /** Optimization opportunities */
  optimizations: string[];
}

/**
 * Layer dependency violation
 */
export interface LayerViolation {
  /** Source layer */
  sourceLayer: 'L0' | 'L1' | 'L2';
  
  /** Target layer */
  targetLayer: 'L0' | 'L1' | 'L2';
  
  /** Violation type */
  violationType: 'reverse_dependency' | 'skip_layer' | 'circular_layer';
  
  /** Violating symbols */
  symbols: string[];
  
  /** Severity */
  severity: 'error' | 'warning';
}

/**
 * Type mismatch information
 */
export interface TypeMismatch {
  /** Expected type */
  expected: string;
  
  /** Actual type */
  actual: string;
  
  /** Field name */
  field: string;
  
  /** Description */
  description: string;
}

/**
 * Format compatibility issue
 */
export interface FormatIssue {
  /** Expected format */
  expectedFormat: string;
  
  /** Actual format */
  actualFormat: string;
  
  /** Compatibility level */
  compatibility: 'incompatible' | 'conversion_required' | 'warning';
  
  /** Conversion suggestion */
  conversionSuggestion?: string;
}

/**
 * Analysis report with all findings
 */
export interface AnalysisReport {
  /** Analysis summary */
  summary: AnalysisSummary;
  
  /** All errors found */
  errors: AnalysisError[];
  
  /** All warnings */
  warnings: AnalysisWarning[];
  
  /** Informational messages */
  info: AnalysisInfo[];
  
  /** Performance analysis */
  performance: PerformanceReport;
  
  /** Security analysis */
  security: SecurityReport;
  
  /** Quality metrics */
  quality: QualityReport;
}

/**
 * Analysis summary statistics
 */
export interface AnalysisSummary {
  /** Total symbols analyzed */
  totalSymbols: number;
  
  /** Dependencies resolved */
  dependenciesResolved: number;
  
  /** Dependencies unresolved */
  dependenciesUnresolved: number;
  
  /** Interface compatibility rate */
  compatibilityRate: number;
  
  /** Analysis duration */
  analysisDuration: number;
  
  /** Overall health score */
  healthScore: number;
}

/**
 * Analysis error
 */
export interface AnalysisError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Source location */
  location: string;
  
  /** Error category */
  category: 'semantic' | 'dependency' | 'type' | 'governance' | 'resource';
  
  /** Suggested fix */
  suggestedFix?: string;
  
  /** Severity */
  severity: 'error' | 'critical';
}

/**
 * Analysis warning
 */
export interface AnalysisWarning {
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Source location */
  location: string;
  
  /** Warning category */
  category: 'performance' | 'best_practice' | 'compatibility' | 'optimization' | 'dependency';
  
  /** Recommendation */
  recommendation?: string;
}

/**
 * Analysis info message
 */
export interface AnalysisInfo {
  /** Info code */
  code: string;
  
  /** Info message */
  message: string;
  
  /** Source location */
  location: string;
  
  /** Category */
  category: 'metric' | 'suggestion' | 'discovery';
}

/**
 * Performance analysis report
 */
export interface PerformanceReport {
  /** Overall performance score */
  performanceScore: number;
  
  /** Identified bottlenecks */
  bottlenecks: PerformanceBottleneck[];
  
  /** Resource utilization */
  resourceUtilization: ResourceUtilizationSummary;
  
  /** Scalability assessment */
  scalability: ScalabilityAssessment;
  
  /** Optimization recommendations */
  optimizations: PerformanceOptimization[];
}

/**
 * Security analysis report
 */
export interface SecurityReport {
  /** Security score */
  securityScore: number;
  
  /** Security vulnerabilities */
  vulnerabilities: SecurityVulnerability[];
  
  /** Access control analysis */
  accessControl: AccessControlAnalysis;
  
  /** Data flow security */
  dataFlowSecurity: DataFlowSecurityAnalysis;
}

/**
 * Quality analysis report
 */
export interface QualityReport {
  /** Code quality score */
  qualityScore: number;
  
  /** Maintainability metrics */
  maintainability: MaintainabilityMetrics;
  
  /** Complexity analysis */
  complexity: ComplexityAnalysis;
  
  /** Documentation coverage */
  documentation: DocumentationCoverage;
  
  /** Best practice adherence */
  bestPractices: BestPracticeAdherence;
}

/**
 * Analysis metadata
 */
export interface AnalysisMetadata {
  /** Analysis timestamp */
  timestamp: Date;
  
  /** Analysis version */
  version: string;
  
  /** Analysis configuration */
  configuration: AnalysisConfiguration;
  
  /** Analysis statistics */
  statistics: AnalysisStatistics;
}

/**
 * Analysis configuration
 */
export interface AnalysisConfiguration {
  /** Enabled analysis passes */
  enabledPasses: AnalysisPass[];
  
  /** Severity thresholds */
  severityThresholds: SeverityThresholds;
  
  /** Performance settings */
  performance: PerformanceSettings;
  
  /** Custom rules */
  customRules: CustomRule[];
}

/**
 * Analysis pass enumeration
 */
export type AnalysisPass = 
  | 'semantic_analysis'
  | 'dependency_resolution'
  | 'type_checking'
  | 'interface_validation'
  | 'governance_validation'
  | 'resource_analysis'
  | 'performance_analysis'
  | 'security_analysis'
  | 'quality_analysis';

/**
 * Severity threshold configuration
 */
export interface SeverityThresholds {
  /** Error threshold */
  error: number;
  
  /** Warning threshold */
  warning: number;
  
  /** Info threshold */
  info: number;
}

/**
 * Performance settings for analysis
 */
export interface PerformanceSettings {
  /** Maximum analysis time */
  maxAnalysisTime: number;
  
  /** Parallel analysis enabled */
  parallelAnalysis: boolean;
  
  /** Cache analysis results */
  cacheResults: boolean;
  
  /** Memory limit */
  memoryLimit: number;
}

/**
 * Custom analysis rule
 */
export interface CustomRule {
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Rule implementation */
  implementation: (ast: BusyAST) => AnalysisError[];
  
  /** Rule configuration */
  configuration?: Record<string, unknown>;
}

// Additional supporting types would be defined here for all the referenced interfaces
// This is a comprehensive type system for the analysis phase

/**
 * Analysis statistics
 */
export interface AnalysisStatistics {
  /** Total nodes analyzed */
  nodesAnalyzed: number;
  
  /** Analysis passes executed */
  passesExecuted: AnalysisPass[];
  
  /** Memory usage */
  memoryUsage: number;
  
  /** Cache hit rate */
  cacheHitRate: number;
}

// Export analysis configuration presets
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfiguration = {
  enabledPasses: [
    'semantic_analysis',
    'dependency_resolution',
    'type_checking',
    'interface_validation',
    'governance_validation',
    'resource_analysis',
    'performance_analysis'
  ],
  severityThresholds: {
    error: 0,
    warning: 10,
    info: 50
  },
  performance: {
    maxAnalysisTime: 30000, // 30 seconds
    parallelAnalysis: true,
    cacheResults: true,
    memoryLimit: 512 * 1024 * 1024 // 512MB
  },
  customRules: []
};

// Placeholder interfaces for referenced but not fully defined types
export interface DeliverableTypeInfo {
  type: string;
  format: string;
  schema?: string;
}

export interface InterfaceSignature {
  inputs: string[];
  outputs: string[];
  compatibility: string;
}

export interface RoleCapability {
  tasks: string[];
  executionTypes: string[];
  requiredTools: string[];
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  context: string;
}

export interface ResourceRequirement {
  type: string;
  amount: number;
  unit: string;
}

export interface ResourceConflict {
  type: string;
  conflictingResources: string[];
  severity: string;
}

export interface ResourceUtilization {
  resource: string;
  utilizationRate: number;
  peakUsage: number;
}

export interface ResourceOptimization {
  type: string;
  description: string;
  potentialSavings: number;
}

export interface ExecutionTimeEstimate {
  task: string;
  estimatedTime: number;
  confidence: number;
}

export interface ResourceUsageEstimate {
  resource: string;
  estimatedUsage: number;
  unit: string;
}

export interface PerformanceBottleneck {
  location: string;
  type: string;
  impact: number;
  suggestion: string;
}

export interface ScalabilityFactor {
  factor: string;
  impact: number;
  threshold: number;
}

export interface ResourceUtilizationSummary {
  overall: number;
  byType: Map<string, number>;
  peakTimes: string[];
}

export interface ScalabilityAssessment {
  score: number;
  limitingFactors: string[];
  recommendations: string[];
}

export interface PerformanceOptimization {
  type: string;
  description: string;
  expectedImprovement: number;
}

export interface SecurityVulnerability {
  type: string;
  severity: string;
  description: string;
  recommendation: string;
}

export interface AccessControlAnalysis {
  score: number;
  violations: string[];
  recommendations: string[];
}

export interface DataFlowSecurityAnalysis {
  score: number;
  risks: string[];
  mitigations: string[];
}

export interface MaintainabilityMetrics {
  score: number;
  complexity: number;
  coupling: number;
  cohesion: number;
}

export interface ComplexityAnalysis {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nesting: number;
}

export interface DocumentationCoverage {
  coverage: number;
  missingDocs: string[];
  qualityScore: number;
}

export interface BestPracticeAdherence {
  score: number;
  violations: string[];
  recommendations: string[];
}