/**
 * Main Analysis Engine
 * Orchestrates all analysis passes and produces comprehensive analysis results
 */

import type { BusyAST } from '@/ast/nodes';
import type { 
  AnalysisResult, 
  AnalysisConfiguration, 
  AnalysisReport,
  AnalysisMetadata,
  AnnotatedAST
} from './types';
import { DEFAULT_ANALYSIS_CONFIG } from './types';

import { SemanticAnalyzer } from './semantic-analyzer';
import { DependencyResolver } from './dependency-resolver';
import { TypeChecker } from './type-checker';
import { InterfaceValidator } from './interface-validator';
import { GovernanceValidator } from './governance-validator';
import { ResourceAnalyzer } from './resource-analyzer';
import { PerformanceAnalyzer } from './performance-analyzer';
import { SecurityAnalyzer } from './security-analyzer';
import { QualityAnalyzer } from './quality-analyzer';

/**
 * Main analysis engine that coordinates all analysis passes
 */
export class Analyzer {
  private config: AnalysisConfiguration;
  private semanticAnalyzer: SemanticAnalyzer;
  private dependencyResolver: DependencyResolver;
  private typeChecker: TypeChecker;
  private interfaceValidator: InterfaceValidator;
  private governanceValidator: GovernanceValidator;
  private resourceAnalyzer: ResourceAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private securityAnalyzer: SecurityAnalyzer;
  private qualityAnalyzer: QualityAnalyzer;

  constructor(config: Partial<AnalysisConfiguration> = {}) {
    this.config = { ...DEFAULT_ANALYSIS_CONFIG, ...config };
    
    // Initialize analyzers
    this.semanticAnalyzer = new SemanticAnalyzer(this.config);
    this.dependencyResolver = new DependencyResolver(this.config);
    this.typeChecker = new TypeChecker(this.config);
    this.interfaceValidator = new InterfaceValidator(this.config);
    this.governanceValidator = new GovernanceValidator(this.config);
    this.resourceAnalyzer = new ResourceAnalyzer(this.config);
    this.performanceAnalyzer = new PerformanceAnalyzer(this.config);
    this.securityAnalyzer = new SecurityAnalyzer(this.config);
    this.qualityAnalyzer = new QualityAnalyzer(this.config);
  }

  /**
   * Perform comprehensive analysis of BUSY AST
   */
  async analyze(ast: BusyAST): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Create analysis metadata
      const metadata: AnalysisMetadata = {
        timestamp: new Date(),
        version: '1.0.0',
        configuration: this.config,
        statistics: {
          nodesAnalyzed: 0,
          passesExecuted: [],
          memoryUsage: process.memoryUsage().heapUsed,
          cacheHitRate: 0
        }
      };

      // Initialize annotated AST
      let annotatedAST: AnnotatedAST = {
        ...ast,
        annotations: {
          symbolUsage: new Map(),
          interfaceChecks: new Map(),
          resourceAnalysis: new Map(),
          governanceViolations: [],
          performanceMetrics: {
            executionTimes: new Map(),
            resourceUsage: new Map(),
            bottlenecks: [],
            scalabilityFactors: []
          }
        },
        resolvedDependencies: {
          ...ast.dependencies,
          resolutionStatus: new Map(),
          topologicalOrder: [],
          criticalPaths: [],
          layerViolations: []
        },
        typeInfo: {
          deliverableTypes: new Map(),
          interfaceSignatures: new Map(),
          roleCapabilities: new Map()
        }
      };

      // Initialize analysis report
      const report: AnalysisReport = {
        summary: {
          totalSymbols: 0,
          dependenciesResolved: 0,
          dependenciesUnresolved: 0,
          compatibilityRate: 0,
          analysisDuration: 0,
          healthScore: 0
        },
        errors: [],
        warnings: [],
        info: [],
        performance: {
          performanceScore: 0,
          bottlenecks: [],
          resourceUtilization: {
            overall: 0,
            byType: new Map(),
            peakTimes: []
          },
          scalability: {
            score: 0,
            limitingFactors: [],
            recommendations: []
          },
          optimizations: []
        },
        security: {
          securityScore: 0,
          vulnerabilities: [],
          accessControl: {
            score: 0,
            violations: [],
            recommendations: []
          },
          dataFlowSecurity: {
            score: 0,
            risks: [],
            mitigations: []
          }
        },
        quality: {
          qualityScore: 0,
          maintainability: {
            score: 0,
            complexity: 0,
            coupling: 0,
            cohesion: 0
          },
          complexity: {
            cyclomaticComplexity: 0,
            cognitiveComplexity: 0,
            nesting: 0
          },
          documentation: {
            coverage: 0,
            missingDocs: [],
            qualityScore: 0
          },
          bestPractices: {
            score: 0,
            violations: [],
            recommendations: []
          }
        }
      };

      // Execute analysis passes in order
      for (const pass of this.config.enabledPasses) {
        const passStartTime = Date.now();
        
        try {
          switch (pass) {
            case 'semantic_analysis':
              await this.runSemanticAnalysis(annotatedAST, report);
              break;
              
            case 'dependency_resolution':
              await this.runDependencyResolution(annotatedAST, report);
              break;
              
            case 'type_checking':
              await this.runTypeChecking(annotatedAST, report);
              break;
              
            case 'interface_validation':
              await this.runInterfaceValidation(annotatedAST, report);
              break;
              
            case 'governance_validation':
              await this.runGovernanceValidation(annotatedAST, report);
              break;
              
            case 'resource_analysis':
              await this.runResourceAnalysis(annotatedAST, report);
              break;
              
            case 'performance_analysis':
              await this.runPerformanceAnalysis(annotatedAST, report);
              break;
              
            case 'security_analysis':
              await this.runSecurityAnalysis(annotatedAST, report);
              break;
              
            case 'quality_analysis':
              await this.runQualityAnalysis(annotatedAST, report);
              break;
          }
          
          metadata.statistics.passesExecuted.push(pass);
          
        } catch (error) {
          report.errors.push({
            code: 'ANALYSIS_PASS_FAILED',
            message: `Analysis pass '${pass}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            location: 'analyzer',
            category: 'semantic',
            severity: 'critical'
          });
        }
        
        const passEndTime = Date.now();
        report.info.push({
          code: 'ANALYSIS_PASS_COMPLETE',
          message: `Analysis pass '${pass}' completed in ${passEndTime - passStartTime}ms`,
          location: 'analyzer',
          category: 'metric'
        });
      }

      // Calculate final metrics
      const endTime = Date.now();
      report.summary.analysisDuration = endTime - startTime;
      report.summary.totalSymbols = this.countSymbols(annotatedAST);
      report.summary.healthScore = this.calculateHealthScore(report);
      
      // Update metadata
      metadata.statistics.memoryUsage = process.memoryUsage().heapUsed;
      metadata.statistics.nodesAnalyzed = this.countNodes(annotatedAST);

      return {
        ast: annotatedAST,
        report,
        isValid: report.errors.length === 0,
        metadata
      };
      
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run semantic analysis pass
   */
  private async runSemanticAnalysis(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.semanticAnalyzer.analyze(ast);
    
    // Merge symbol usage information
    for (const [symbol, usage] of result.symbolUsage) {
      ast.annotations.symbolUsage.set(symbol, usage);
    }
    
    // Add errors and warnings
    report.errors.push(...result.errors);
    report.warnings.push(...result.warnings);
    report.info.push(...result.info);
  }

  /**
   * Run dependency resolution pass
   */
  private async runDependencyResolution(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.dependencyResolver.resolve(ast);
    
    // Update resolved dependencies
    ast.resolvedDependencies = result.resolvedDependencies;
    
    // Update summary statistics
    report.summary.dependenciesResolved = result.resolved;
    report.summary.dependenciesUnresolved = result.unresolved;
    
    // Add errors and warnings
    report.errors.push(...result.errors);
    report.warnings.push(...result.warnings);
  }

  /**
   * Run type checking pass
   */
  private async runTypeChecking(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.typeChecker.check(ast);
    
    // Update type information
    ast.typeInfo = result.typeInfo;
    
    // Add errors and warnings
    report.errors.push(...result.errors);
    report.warnings.push(...result.warnings);
  }

  /**
   * Run interface validation pass
   */
  private async runInterfaceValidation(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.interfaceValidator.validate(ast);
    
    // Update interface compatibility information
    for (const [interfaceId, compatibility] of result.compatibilityChecks) {
      ast.annotations.interfaceChecks.set(interfaceId, compatibility);
    }
    
    // Update compatibility rate
    report.summary.compatibilityRate = result.overallCompatibilityRate;
    
    // Add errors and warnings
    report.errors.push(...result.errors);
    report.warnings.push(...result.warnings);
  }

  /**
   * Run governance validation pass
   */
  private async runGovernanceValidation(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.governanceValidator.validate(ast);
    
    // Update governance violations
    ast.annotations.governanceViolations = result.violations;
    
    // Add errors and warnings
    report.errors.push(...result.errors);
    report.warnings.push(...result.warnings);
  }

  /**
   * Run resource analysis pass
   */
  private async runResourceAnalysis(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.resourceAnalyzer.analyze(ast);
    
    // Update resource analysis
    for (const [resourceId, analysis] of result.resourceAnalysis) {
      ast.annotations.resourceAnalysis.set(resourceId, analysis);
    }
    
    // Add warnings for resource conflicts
    report.warnings.push(...result.warnings);
  }

  /**
   * Run performance analysis pass
   */
  private async runPerformanceAnalysis(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.performanceAnalyzer.analyze(ast);
    
    // Update performance metrics
    ast.annotations.performanceMetrics = result.metrics;
    
    // Update performance report
    report.performance = result.report;
    
    // Add warnings for performance issues
    report.warnings.push(...result.warnings);
  }

  /**
   * Run security analysis pass
   */
  private async runSecurityAnalysis(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.securityAnalyzer.analyze(ast);
    
    // Update security report
    report.security = result.report;
    
    // Add errors and warnings
    report.errors.push(...result.errors);
    report.warnings.push(...result.warnings);
  }

  /**
   * Run quality analysis pass
   */
  private async runQualityAnalysis(ast: AnnotatedAST, report: AnalysisReport): Promise<void> {
    const result = await this.qualityAnalyzer.analyze(ast);
    
    // Update quality report
    report.quality = result.report;
    
    // Add warnings for quality issues
    report.warnings.push(...result.warnings);
  }

  /**
   * Count total symbols in AST
   */
  private countSymbols(ast: AnnotatedAST): number {
    return ast.symbols.roles.size + 
           ast.symbols.playbooks.size + 
           ast.symbols.tasks.size + 
           ast.symbols.deliverables.size + 
           ast.symbols.tools.size + 
           ast.symbols.advisors.size + 
           ast.symbols.teams.size;
  }

  /**
   * Count total nodes in AST
   */
  private countNodes(ast: AnnotatedAST): number {
    let count = 0;
    const visited = new WeakSet();
    
    function traverse(node: any): void {
      if (node && typeof node === 'object') {
        // Prevent circular reference traversal
        if (visited.has(node)) {
          return;
        }
        visited.add(node);
        
        count++;
        if (Array.isArray(node)) {
          node.forEach(traverse);
        } else {
          // Skip parent references to avoid circularity
          Object.entries(node).forEach(([key, value]) => {
            if (key !== 'parent') {
              traverse(value);
            }
          });
        }
      }
    }
    
    traverse(ast);
    return count;
  }

  /**
   * Calculate overall health score based on analysis results
   */
  private calculateHealthScore(report: AnalysisReport): number {
    const errorWeight = 10;
    const warningWeight = 2;
    
    const errorPenalty = report.errors.length * errorWeight;
    const warningPenalty = report.warnings.length * warningWeight;
    
    const baseScore = 100;
    const finalScore = Math.max(0, baseScore - errorPenalty - warningPenalty);
    
    return Math.round(finalScore);
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: Partial<AnalysisConfiguration>): void {
    this.config = { ...this.config, ...config };
    
    // Update analyzer configurations
    this.semanticAnalyzer.updateConfiguration(this.config);
    this.dependencyResolver.updateConfiguration(this.config);
    this.typeChecker.updateConfiguration(this.config);
    this.interfaceValidator.updateConfiguration(this.config);
    this.governanceValidator.updateConfiguration(this.config);
    this.resourceAnalyzer.updateConfiguration(this.config);
    this.performanceAnalyzer.updateConfiguration(this.config);
    this.securityAnalyzer.updateConfiguration(this.config);
    this.qualityAnalyzer.updateConfiguration(this.config);
  }

  /**
   * Get current configuration
   */
  getConfiguration(): AnalysisConfiguration {
    return { ...this.config };
  }
}