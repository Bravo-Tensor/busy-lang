/**
 * Analyze Command Implementation
 * Deep analysis command that performs semantic analysis, dependency resolution,
 * and comprehensive validation beyond basic parsing
 */

import { ValidateCommand } from './validate';
import { Analyzer, DEFAULT_ANALYSIS_CONFIG } from '@/analysis';
import { Scanner } from '@/core/scanner';
import { Parser } from '@/core/parser';
import { ASTBuilder } from '@/ast/builder';
import type { ValidateOptions, CompilerConfig } from '@/config/types';
import { DEFAULT_CONFIG } from '@/config/types';
import type { AnalysisConfiguration, AnalysisResult } from '@/analysis/types';

/**
 * Enhanced options for analysis command
 */
export interface AnalyzeOptions extends ValidateOptions {
  /** Analysis passes to run */
  only?: string[];
  
  /** Include performance analysis */
  performance?: boolean;
  
  /** Include security analysis */
  security?: boolean;
  
  /** Include quality analysis */
  quality?: boolean;
  
  /** Maximum analysis time in seconds */
  timeout?: number;
  
  /** Output detailed metrics */
  detailed?: boolean;
}

/**
 * Analyze command class - performs comprehensive analysis
 */
export class AnalyzeCommand extends ValidateCommand {
  private analyzer: Analyzer;
  
  constructor() {
    super();
    this.analyzer = new Analyzer();
  }
  
  /**
   * Execute comprehensive analysis command
   */
  async execute(path: string, options: AnalyzeOptions = {}): Promise<void> {
    console.log(`\n🔍 BUSY Analysis Report`);
    console.log(`==================================================\n`);
    
    try {
      // First run basic validation
      console.log('📋 Running basic validation...');
      await super.execute(path, { ...options, allowErrors: true });
      
      // Build AST through the compiler pipeline
      console.log('\n🏗️  Building AST for analysis...');
      
      // Step 1: Scan directory
      const scanner = new Scanner({ ...DEFAULT_CONFIG, parallelProcessing: true });
      const scanResult = await scanner.scan(path);
      
      if (scanResult.files.length === 0) {
        console.error('❌ No BUSY files found in directory');
        process.exit(1);
      }
      
      // Step 2: Parse files
      const parser = new Parser({ ...DEFAULT_CONFIG, parallelProcessing: true });
      const parseResult = await parser.parse(scanResult);
      
      if (parseResult.parseErrors.length > 0) {
        console.error(`❌ Parse errors found: ${parseResult.parseErrors.length}`);
        for (const error of parseResult.parseErrors.slice(0, 3)) {
          console.error(`   ${error.filePath}: ${error.error.message}`);
        }
        if (!options.allowErrors) {
          process.exit(1);
        }
      }
      
      // Step 3: Build AST
      const astBuilder = new ASTBuilder();
      const buildResult = await astBuilder.build(parseResult);
      
      if (buildResult.errors.length > 0) {
        console.error(`❌ AST build errors: ${buildResult.errors.length}`);
        for (const error of buildResult.errors.slice(0, 3)) {
          console.error(`   ${error.message}`);
        }
        if (!options.allowErrors) {
          process.exit(1);
        }
      }
      
      // Configure analyzer
      const analysisConfig = this.buildAnalysisConfig(options);
      this.analyzer.updateConfiguration(analysisConfig);
      
      // Run analysis
      console.log('\n🧠 Running comprehensive analysis...');
      const startTime = Date.now();
      const result = await this.analyzer.analyze(buildResult.ast);
      const duration = Date.now() - startTime;
      
      // Display results
      await this.displayAnalysisResults(result, options, duration);
      
      // Exit with appropriate code
      if (!result.isValid && !options.allowErrors) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
  
  /**
   * Build analysis configuration from options
   */
  private buildAnalysisConfig(options: AnalyzeOptions): AnalysisConfiguration {
    const config = { ...DEFAULT_ANALYSIS_CONFIG };
    
    // Filter passes if specific ones requested
    if (options.only && options.only.length > 0) {
      config.enabledPasses = config.enabledPasses.filter(pass => 
        options.only!.includes(pass)
      );
    }
    
    // Add optional passes
    if (options.performance && !config.enabledPasses.includes('performance_analysis')) {
      config.enabledPasses.push('performance_analysis');
    }
    
    if (options.security && !config.enabledPasses.includes('security_analysis')) {
      config.enabledPasses.push('security_analysis');
    }
    
    if (options.quality && !config.enabledPasses.includes('quality_analysis')) {
      config.enabledPasses.push('quality_analysis');
    }
    
    // Set timeout
    if (options.timeout) {
      config.performance.maxAnalysisTime = options.timeout * 1000;
    }
    
    return config;
  }
  
  /**
   * Display analysis results
   */
  private async displayAnalysisResults(result: AnalysisResult, options: AnalyzeOptions, duration: number): Promise<void> {
    const { report } = result;
    
    // Summary
    console.log('\n📊 Analysis Summary');
    console.log('──────────────────────────────');
    console.log(`✅ Overall Health Score: ${report.summary.healthScore}/100`);
    console.log(`📈 Symbols Analyzed: ${report.summary.totalSymbols}`);
    console.log(`🔗 Dependencies Resolved: ${report.summary.dependenciesResolved}/${report.summary.dependenciesResolved + report.summary.dependenciesUnresolved}`);
    console.log(`🤝 Interface Compatibility: ${Math.round(report.summary.compatibilityRate * 100)}%`);
    console.log(`⏱️  Analysis Duration: ${duration}ms`);
    
    // Errors
    if (report.errors.length > 0) {
      console.log(`\n❌ Analysis Errors (${report.errors.length})`);
      for (const error of report.errors.slice(0, 10)) { // Show first 10
        console.log(`   ${error.code}: ${error.message}`);
        if (error.location !== 'analyzer') {
          console.log(`      at ${error.location}`);
        }
      }
      if (report.errors.length > 10) {
        console.log(`   ... and ${report.errors.length - 10} more errors`);
      }
    }
    
    // Warnings
    if (report.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${report.warnings.length})`);
      for (const warning of report.warnings.slice(0, 5)) { // Show first 5
        console.log(`   ${warning.code}: ${warning.message}`);
        if (warning.location !== 'analyzer') {
          console.log(`      at ${warning.location}`);
        }
      }
      if (report.warnings.length > 5) {
        console.log(`   ... and ${report.warnings.length - 5} more warnings`);
      }
    }
    
    // Detailed metrics if requested
    if (options.detailed) {
      await this.displayDetailedMetrics(result);
    }
    
    // Performance report
    if (options.performance || options.detailed) {
      console.log(`\n⚡ Performance Analysis`);
      console.log('──────────────────────────────');
      console.log(`Performance Score: ${report.performance.performanceScore}/100`);
      console.log(`Resource Utilization: ${Math.round(report.performance.resourceUtilization.overall * 100)}%`);
      console.log(`Scalability Score: ${report.performance.scalability.score}/100`);
      
      if (report.performance.bottlenecks.length > 0) {
        console.log(`Bottlenecks Found: ${report.performance.bottlenecks.length}`);
      }
    }
    
    // Security report
    if (options.security || options.detailed) {
      console.log(`\n🛡️  Security Analysis`);
      console.log('──────────────────────────────');
      console.log(`Security Score: ${report.security.securityScore}/100`);
      console.log(`Access Control Score: ${report.security.accessControl.score}/100`);
      console.log(`Data Flow Security: ${report.security.dataFlowSecurity.score}/100`);
      
      if (report.security.vulnerabilities.length > 0) {
        console.log(`Vulnerabilities Found: ${report.security.vulnerabilities.length}`);
      }
    }
    
    // Quality report
    if (options.quality || options.detailed) {
      console.log(`\n🏆 Quality Analysis`);
      console.log('──────────────────────────────');
      console.log(`Quality Score: ${report.quality.qualityScore}/100`);
      console.log(`Maintainability: ${report.quality.maintainability.score}/100`);
      console.log(`Documentation Coverage: ${Math.round(report.quality.documentation.coverage * 100)}%`);
      console.log(`Best Practices: ${report.quality.bestPractices.score}/100`);
    }
    
    // Dependency analysis
    if (result.ast.resolvedDependencies.criticalPaths.length > 0) {
      console.log(`\n🗂️  Dependency Analysis`);
      console.log('──────────────────────────────');
      console.log(`Critical Paths Found: ${result.ast.resolvedDependencies.criticalPaths.length}`);
      
      if (result.ast.resolvedDependencies.layerViolations.length > 0) {
        console.log(`Layer Violations: ${result.ast.resolvedDependencies.layerViolations.length}`);
      }
      
      if (result.ast.resolvedDependencies.cycles.length > 0) {
        console.log(`Circular Dependencies: ${result.ast.resolvedDependencies.cycles.length}`);
      }
    }
    
    // Final status
    console.log(`\n📊 Final Assessment`);
    console.log('──────────────────────────────');
    if (result.isValid) {
      console.log('✅ Analysis completed successfully');
    } else {
      console.log('❌ Analysis found critical issues');
    }
    
    console.log(`Analysis Report Generated: ${result.metadata.timestamp.toISOString()}`);
  }
  
  /**
   * Display detailed metrics
   */
  private async displayDetailedMetrics(result: AnalysisResult): Promise<void> {
    console.log(`\n📈 Detailed Metrics`);
    console.log('──────────────────────────────');
    
    // Symbol usage statistics
    const symbolStats = new Map<string, number>();
    for (const [, usage] of result.ast.annotations.symbolUsage) {
      const key = usage.isDeadCode ? 'Dead Code' : 'Active';
      symbolStats.set(key, (symbolStats.get(key) || 0) + 1);
    }
    
    console.log('Symbol Usage:');
    for (const [type, count] of symbolStats) {
      console.log(`  ${type}: ${count}`);
    }
    
    // Analysis passes executed
    console.log(`\nAnalysis Passes: ${result.metadata.statistics.passesExecuted.join(', ')}`);
    console.log(`Memory Usage: ${Math.round(result.metadata.statistics.memoryUsage / 1024 / 1024)}MB`);
    console.log(`Nodes Analyzed: ${result.metadata.statistics.nodesAnalyzed}`);
  }
}