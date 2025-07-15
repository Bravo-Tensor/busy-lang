/**
 * Configuration types for BUSY compiler
 */

/**
 * Severity levels for compilation rules
 */
export type Severity = 'error' | 'warning' | 'info' | 'off';

/**
 * Output format options
 */
export type OutputFormat = 'console' | 'json' | 'html' | 'junit';

/**
 * Complete compiler configuration
 */
export interface CompilerConfig {
  /** Rule severity settings */
  rules: RuleConfig;
  
  /** File/directory patterns to ignore */
  ignore: string[];
  
  /** Paths to custom rule modules */
  customRules: string[];
  
  /** Path to tool registry file */
  toolRegistry: string;
  
  /** Path to advisor registry file */
  advisorRegistry: string;
  
  /** Maximum errors before stopping compilation */
  maxErrors: number;
  
  /** Maximum warnings before stopping compilation */
  maxWarnings: number;
  
  /** Enable parallel file processing */
  parallelProcessing: boolean;
  
  /** Enable verbose output */
  verbose: boolean;
  
  /** Treat warnings as errors */
  warningsAsErrors: boolean;
  
  /** Default output format */
  outputFormat: OutputFormat;
  
  /** Enable compilation cache */
  cacheEnabled: boolean;
  
  /** Cache directory path */
  cacheDirectory: string;
}

/**
 * Rule configuration with severity levels
 */
export interface RuleConfig {
  /** Interface coherence validation */
  interfaceCoherence: Severity;
  
  /** Dead code detection */
  deadCodeDetection: Severity;
  
  /** Resource allocation validation */
  resourceValidation: Severity;
  
  /** Workflow completeness checking */
  workflowCompleteness: Severity;
  
  /** Type checking for deliverables */
  typeChecking: Severity;
  
  /** Import validation */
  importValidation: Severity;
  
  /** Role inheritance validation */
  inheritanceValidation: Severity;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: CompilerConfig = {
  rules: {
    interfaceCoherence: 'error',
    deadCodeDetection: 'warning',
    resourceValidation: 'info',
    workflowCompleteness: 'error',
    typeChecking: 'error',
    importValidation: 'error',
    inheritanceValidation: 'error'
  },
  ignore: [],
  customRules: [],
  toolRegistry: './tools.json',
  advisorRegistry: './advisors.json',
  maxErrors: 100,
  maxWarnings: 1000,
  parallelProcessing: true,
  verbose: false,
  warningsAsErrors: false,
  outputFormat: 'console',
  cacheEnabled: true,
  cacheDirectory: '.busy-cache'
};

/**
 * CLI command options
 */
export interface ValidateOptions {
  /** Configuration file path */
  config?: string;
  
  /** Output format override */
  format?: OutputFormat;
  
  /** Output file path */
  output?: string;
  
  /** Enable strict mode (warnings as errors) */
  strict?: boolean;
  
  /** Allow errors and continue */
  allowErrors?: boolean;
  
  /** Verbose output */
  verbose?: boolean;
  
  /** Disable cache */
  noCache?: boolean;
  
  /** Maximum errors */
  maxErrors?: number;
  
  /** Include only specific rules */
  only?: string[];
  
  /** Exclude specific rules */
  exclude?: string[];
}

/**
 * Analysis options for specific analysis types
 */
export interface AnalysisOptions {
  /** Include dependency graph in output */
  includeDependencyGraph?: boolean;
  
  /** Include dead code analysis */
  includeDeadCode?: boolean;
  
  /** Include performance suggestions */
  includePerformance?: boolean;
  
  /** Include auto-fix suggestions */
  includeAutoFix?: boolean;
  
  /** Depth of analysis (shallow, normal, deep) */
  depth?: 'shallow' | 'normal' | 'deep';
}