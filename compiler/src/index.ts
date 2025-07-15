/**
 * BUSY Compiler Public API
 * Main entry point for programmatic usage
 */

import { Scanner } from './core/scanner';
import { Parser } from './core/parser';
import { ASTBuilder } from './ast/builder';
import { SymbolTableBuilder } from './symbols/table';
import { loadConfig } from './config/loader';
import { DEFAULT_CONFIG } from './config/types';
import type { CompilerConfig } from './config/types';
import type { CompilationResult } from './cli/types';

export { Scanner, Parser, ASTBuilder, SymbolTableBuilder, loadConfig, DEFAULT_CONFIG };

export type {
  // Core types
  ScanResult,
  ParseResult,
  BuildResult,
  CompilerConfig,
  ValidateOptions,
  
  // AST types
  BusyAST,
  BusyFileNode,
  TeamNode,
  RoleNode,
  PlaybookNode,
  TaskNode,
  DeliverableNode,
  SymbolTable,
  DependencyGraph,
  
  // CLI types
  CompilationResult,
  Issue,
  Reporter
} from './types';

// Re-export utilities
export { parseYamlFile, parseYamlString } from './utils/yaml-utils';
export { discoverBusyFiles, parseNamespace, groupFilesByNamespace } from './utils/path-utils';

/**
 * Main compiler class for programmatic usage
 */
export class BusyCompiler {
  private config: CompilerConfig;
  
  constructor(config?: Partial<CompilerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Compile BUSY repository
   */
  async compile(path: string): Promise<CompilationResult> {
    // Phase 1: Scan
    const scanner = new Scanner(this.config);
    const scanResult = await scanner.scan(path);
    
    // Phase 2: Parse
    const parser = new Parser(this.config);
    const parseResult = await parser.parse(scanResult);
    
    // Phase 3: Build AST
    const astBuilder = new ASTBuilder();
    const buildResult = await astBuilder.build(parseResult);
    
    // Phase 4: Analysis (TODO: Implement)
    const analysisResults: any[] = [];
    
    return {
      scanResult,
      parseResult,
      buildResult,
      analysisResults,
      summary: {
        totalFiles: scanResult.stats.totalFiles,
        successfullyParsed: parseResult.stats.successfullyParsed,
        errors: parseResult.parseErrors.length + buildResult.errors.length,
        warnings: buildResult.warnings.length,
        info: 0,
        duration: scanResult.stats.scanDurationMs + parseResult.stats.parseDurationMs + buildResult.stats.buildDurationMs,
        success: parseResult.parseErrors.length === 0 && buildResult.errors.length === 0
      }
    };
  }
  
  /**
   * Validate BUSY repository (alias for compile)
   */
  async validate(path: string): Promise<CompilationResult> {
    return this.compile(path);
  }
}