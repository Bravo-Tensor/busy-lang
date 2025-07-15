/**
 * CLI Types
 * Type definitions for CLI commands and results
 */

import type { ScanResult } from '@/core/scanner';
import type { ParseResult } from '@/core/parser';
import type { BuildResult } from '@/ast/builder';

/**
 * Complete compilation result
 */
export interface CompilationResult {
  /** File scanning results */
  scanResult: ScanResult;
  
  /** YAML parsing results */
  parseResult: ParseResult;
  
  /** AST building results */
  buildResult: BuildResult;
  
  /** Analysis results (TODO: Define analysis types) */
  analysisResults: AnalysisResult[];
  
  /** Summary statistics */
  summary: CompilationSummary;
}

/**
 * Analysis result interface (placeholder)
 */
export interface AnalysisResult {
  ruleName: string;
  issues: Issue[];
  duration: number;
}

/**
 * Issue found during analysis
 */
export interface Issue {
  severity: 'error' | 'warning' | 'info' | 'hint';
  code: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string;
  autoFix?: AutoFix;
}

/**
 * Auto-fix suggestion
 */
export interface AutoFix {
  title: string;
  description: string;
  changes: FileChange[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * File change for auto-fix
 */
export interface FileChange {
  file: string;
  operation: 'insert' | 'replace' | 'delete';
  line: number;
  oldText?: string;
  newText: string;
}

/**
 * Compilation summary
 */
export interface CompilationSummary {
  totalFiles: number;
  successfullyParsed: number;
  errors: number;
  warnings: number;
  info: number;
  duration: number;
  success: boolean;
}

/**
 * Reporter interface
 */
export interface Reporter {
  generate(result: CompilationResult, outputPath?: string): Promise<void>;
}