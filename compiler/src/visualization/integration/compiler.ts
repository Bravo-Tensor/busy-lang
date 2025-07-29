/**
 * Compiler Integration for BUSY File Visualization
 * Provides interface to the existing BUSY compiler infrastructure
 */

import type {
  ICompilerIntegration,
  ValidationResult
} from '../core/interfaces';
import type { 
  FileChangeEvent
} from '../core/types';
import { BusyAnalyzer } from '../graph/analyzer';
import { Parser } from '@/core/parser';
import { ASTBuilder } from '@/ast/builder';
import type { BusyAST } from '@/ast/nodes';

export class CompilerIntegration implements ICompilerIntegration {
  private analyzer: BusyAnalyzer;
  private currentAST: BusyAST | null = null;
  private watchCallbacks: ((changes: FileChangeEvent[]) => void)[] = [];
  
  constructor() {
    this.analyzer = new BusyAnalyzer();
  }
  
  /**
   * Get the current AST
   */
  async getAST(): Promise<BusyAST | null> {
    return this.currentAST;
  }
  
  /**
   * Parse multiple files and build AST
   */
  async parseFiles(filePaths: string[]): Promise<any[]> {
    try {
      const parser = new Parser();
      const parseResult = await parser.parseFiles(filePaths);
      
      if (parseResult.parseErrors.length > 0) {
        throw new Error(`Parse error: ${parseResult.parseErrors.map(e => e.message).join(', ')}`);
      }
      
      const astBuilder = new ASTBuilder();
      const buildResult = astBuilder.buildAST(parseResult.parsedFiles);
      
      if (!buildResult.success) {
        throw new Error(`AST build error: ${buildResult.errors.map((e: any) => e.message).join(', ')}`);
      }
      
      this.currentAST = buildResult.ast;
      return parseResult.parsedFiles;
    } catch (error) {
      console.error('Error parsing files:', error);
      throw error;
    }
  }
  
  /**
   * Validate files using the compiler
   */
  async validateFiles(filePaths: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // First parse the files
      await this.parseFiles(filePaths);
      
      if (this.currentAST) {
        // Analyze using our analyzer
        const analysis = this.analyzer.analyzeAST(this.currentAST);
        
        // Validate the analysis structure
        const validationResults = this.analyzer.validateStructure(analysis);
        
        // Convert to our format
        results.push(...validationResults);
      }
    } catch (error) {
      results.push({
        type: 'error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
    
    return results;
  }
  
  /**
   * Watch files for changes
   */
  watchFiles(callback: (changes: FileChangeEvent[]) => void): void {
    this.watchCallbacks.push(callback);
    
    // For now, we'll implement a simple polling mechanism
    // In a real implementation, this would use fs.watch or chokidar
    console.log('File watching started (polling mode)');
  }
  
  /**
   * Stop watching files
   */
  stopWatching(): void {
    this.analyzer.stopWatching();
    this.watchCallbacks = [];
    console.log('File watching stopped');
  }
  
  /**
   * Get analysis result from files
   */
  async analyzeFiles(filePaths: string[]) {
    return this.analyzer.analyzeFiles(filePaths);
  }
  
  /**
   * Get analysis result from current AST
   */
  analyzeCurrentAST() {
    if (!this.currentAST) {
      throw new Error('No AST available. Parse files first.');
    }
    
    return this.analyzer.analyzeAST(this.currentAST);
  }
}