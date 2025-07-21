import { 
  BusyFileModification, 
  KnitImpactAnalysis, 
  DependentProcess, 
  ReconciliationAction,
  RiskAssessment,
  ProcessChange
} from '@/types/conversation';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export class KnitIntegrationService {
  private knitConfigPath: string;
  private dependencyGraphPath: string;

  constructor() {
    this.knitConfigPath = path.join(process.cwd(), '.knit');
    this.dependencyGraphPath = path.join(this.knitConfigPath, 'dependencies.json');
  }

  async analyzeModifications(modifications: BusyFileModification[]): Promise<KnitImpactAnalysis> {
    try {
      // Step 1: Identify all files that will be affected
      const affectedFiles = modifications.map(mod => mod.filePath);
      
      // Step 2: Get current dependency graph
      const dependencyGraph = await this.loadDependencyGraph();
      
      // Step 3: Find all dependent processes
      const dependentProcesses = await this.findDependentProcesses(affectedFiles, dependencyGraph);
      
      // Step 4: Analyze semantic changes
      const semanticChanges = await this.analyzeSemanticChanges(modifications);
      
      // Step 5: Generate reconciliation plan
      const reconciliationPlan = await this.generateReconciliationPlan(
        dependentProcesses, 
        semanticChanges
      );
      
      // Step 6: Assess risks
      const riskAssessment = this.assessRisks(modifications, dependentProcesses, semanticChanges);
      
      return {
        hasBreakingChanges: this.hasBreakingChanges(semanticChanges),
        requiresApproval: this.requiresApproval(riskAssessment, dependentProcesses),
        dependentProcesses,
        reconciliationPlan,
        riskAssessment,
        estimatedTime: this.calculateEstimatedTime(reconciliationPlan)
      };
      
    } catch (error) {
      console.error('Error analyzing modifications with knit:', error);
      // Return safe fallback analysis
      return this.createFallbackAnalysis(modifications);
    }
  }

  async executeReconciliation(
    modifications: BusyFileModification[],
    approvals: string[] = []
  ): Promise<ReconciliationResult> {
    try {
      // Step 1: Create reconciliation branch
      const branchName = await this.createReconciliationBranch();
      
      // Step 2: Apply modifications
      await this.applyModifications(modifications);
      
      // Step 3: Link new dependencies
      await this.linkNewDependencies(modifications);
      
      // Step 4: Run knit reconciliation
      const reconciliationResult = await this.runKnitReconciliation();
      
      // Step 5: Validate business process integrity
      const validationResult = await this.validateBusinessProcessIntegrity(modifications);
      
      return {
        success: reconciliationResult.success && validationResult.success,
        branchName,
        appliedChanges: reconciliationResult.appliedChanges,
        pendingReviews: reconciliationResult.pendingReviews,
        errors: [...reconciliationResult.errors, ...validationResult.errors],
        warnings: [...reconciliationResult.warnings, ...validationResult.warnings]
      };
      
    } catch (error) {
      console.error('Error executing reconciliation:', error);
      return {
        success: false,
        branchName: '',
        appliedChanges: [],
        pendingReviews: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  async validateBusinessProcessCoherence(
    processFiles: string[]
  ): Promise<BusinessCoherenceResult> {
    const results: BusinessCoherenceResult = {
      isCoherent: true,
      violations: [],
      suggestions: []
    };

    try {
      // Load dependency graph
      const dependencyGraph = await this.loadDependencyGraph();
      
      // Check each process file for coherence violations
      for (const filePath of processFiles) {
        const violations = await this.checkProcessCoherence(filePath, dependencyGraph);
        results.violations.push(...violations);
      }
      
      // Check cross-process coherence
      const crossProcessViolations = await this.checkCrossProcessCoherence(processFiles);
      results.violations.push(...crossProcessViolations);
      
      results.isCoherent = results.violations.length === 0;
      
      // Generate suggestions for violations
      results.suggestions = await this.generateCoherenceSuggestions(results.violations);
      
    } catch (error) {
      console.error('Error validating business process coherence:', error);
      results.isCoherent = false;
      results.violations.push({
        type: 'system-error',
        severity: 'critical',
        description: 'Unable to validate process coherence',
        affectedFiles: processFiles,
        recommendation: 'Manual review required'
      });
    }

    return results;
  }

  private async loadDependencyGraph(): Promise<DependencyGraph> {
    try {
      const graphContent = await fs.readFile(this.dependencyGraphPath, 'utf-8');
      return JSON.parse(graphContent);
    } catch (error) {
      console.warn('Could not load dependency graph, using empty graph');
      return { dependencies: {}, version: '1.0.0', lastUpdated: new Date().toISOString() };
    }
  }

  private async findDependentProcesses(
    affectedFiles: string[], 
    dependencyGraph: DependencyGraph
  ): Promise<DependentProcess[]> {
    const dependentProcesses: DependentProcess[] = [];
    
    for (const filePath of affectedFiles) {
      const fileNode = dependencyGraph.dependencies[filePath];
      if (!fileNode) continue;
      
      // Find files that watch this file (dependent on it)
      const watchedBy = fileNode.watchedBy || [];
      
      for (const dependentFile of watchedBy) {
        const impactLevel = await this.calculateImpactLevel(filePath, dependentFile);
        const changesRequired = await this.identifyRequiredChanges(filePath, dependentFile);
        
        dependentProcesses.push({
          processId: dependentFile,
          impactLevel,
          changesRequired,
          autoReconcilable: this.isAutoReconcilable(changesRequired, impactLevel)
        });
      }
    }
    
    return dependentProcesses;
  }

  private async analyzeSemanticChanges(modifications: BusyFileModification[]): Promise<SemanticChange[]> {
    const semanticChanges: SemanticChange[] = [];
    
    for (const modification of modifications) {
      // Analyze the semantic impact of each modification
      const change = await this.extractSemanticChange(modification);
      if (change) {
        semanticChanges.push(change);
      }
    }
    
    return semanticChanges;
  }

  private async extractSemanticChange(modification: BusyFileModification): Promise<SemanticChange | null> {
    try {
      // Parse BUSY file changes to understand semantic impact
      const changes = modification.changes;
      
      for (const change of changes) {
        if (change.operation === 'modify' && change.path.includes('timeline')) {
          return {
            type: 'timeline-change',
            description: 'Process timeline modified',
            impact: 'medium',
            affectsInterface: true,
            breakingChange: false
          };
        }
        
        if (change.operation === 'add' && change.path.includes('step')) {
          return {
            type: 'process-extension',
            description: 'New process step added',
            impact: 'low',
            affectsInterface: false,
            breakingChange: false
          };
        }
        
        if (change.operation === 'remove') {
          return {
            type: 'process-reduction',
            description: 'Process element removed',
            impact: 'high',
            affectsInterface: true,
            breakingChange: true
          };
        }
      }
      
    } catch (error) {
      console.error('Error extracting semantic change:', error);
    }
    
    return null;
  }

  private async generateReconciliationPlan(
    dependentProcesses: DependentProcess[],
    semanticChanges: SemanticChange[]
  ): Promise<ReconciliationAction[]> {
    const actions: ReconciliationAction[] = [];
    
    for (const process of dependentProcesses) {
      if (process.autoReconcilable) {
        actions.push({
          id: this.generateId(),
          type: 'auto-apply',
          description: `Automatically update ${process.processId}`,
          processId: process.processId,
          changes: process.changesRequired,
          priority: this.getPriority(process.impactLevel)
        });
      } else {
        actions.push({
          id: this.generateId(),
          type: 'review-required',
          description: `Manual review required for ${process.processId}`,
          processId: process.processId,
          changes: process.changesRequired,
          priority: this.getPriority(process.impactLevel)
        });
      }
    }
    
    return actions;
  }

  private assessRisks(
    modifications: BusyFileModification[],
    dependentProcesses: DependentProcess[],
    semanticChanges: SemanticChange[]
  ): RiskAssessment {
    const riskFactors = [];
    const mitigations = [];
    
    // Assess modification risks
    const hasBreakingChanges = semanticChanges.some(change => change.breakingChange);
    if (hasBreakingChanges) {
      riskFactors.push({
        type: 'breaking-change',
        description: 'Modifications include breaking changes',
        impact: 'high' as const,
        probability: 0.9
      });
      
      mitigations.push({
        riskType: 'breaking-change',
        strategy: 'Require manual approval and testing',
        effectiveness: 0.8,
        cost: 'medium' as const
      });
    }
    
    // Assess dependency risks
    const highImpactProcesses = dependentProcesses.filter(p => p.impactLevel === 'high' || p.impactLevel === 'critical');
    if (highImpactProcesses.length > 0) {
      riskFactors.push({
        type: 'dependency-impact',
        description: `${highImpactProcesses.length} high-impact processes affected`,
        impact: 'high' as const,
        probability: 0.7
      });
      
      mitigations.push({
        riskType: 'dependency-impact',
        strategy: 'Staged rollout with rollback capability',
        effectiveness: 0.9,
        cost: 'high' as const
      });
    }
    
    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(riskFactors);
    
    return {
      overall: overallRisk,
      factors: riskFactors,
      mitigations
    };
  }

  private async calculateImpactLevel(sourceFile: string, dependentFile: string): Promise<'low' | 'medium' | 'high' | 'critical'> {
    // Analyze the relationship between files to determine impact level
    try {
      const dependencyGraph = await this.loadDependencyGraph();
      const sourceNode = dependencyGraph.dependencies[sourceFile];
      
      if (!sourceNode) return 'low';
      
      // Check if this is a critical dependency
      const reconciliationRules = sourceNode.reconciliationRules;
      if (reconciliationRules?.requireReview?.includes('critical')) {
        return 'critical';
      }
      
      // Check file types and domains
      if (sourceFile.includes('L2/') || dependentFile.includes('L2/')) {
        return 'high'; // Strategic layer changes have high impact
      }
      
      if (sourceFile.includes('team.busy') || dependentFile.includes('team.busy')) {
        return 'medium'; // Team structure changes have medium impact
      }
      
      return 'low';
      
    } catch (error) {
      console.error('Error calculating impact level:', error);
      return 'medium'; // Safe default
    }
  }

  private async identifyRequiredChanges(sourceFile: string, dependentFile: string): Promise<ProcessChange[]> {
    const changes: ProcessChange[] = [];
    
    // Analyze what changes are needed in the dependent file
    // This is a simplified version - would need more sophisticated analysis
    
    changes.push({
      type: 'timeline-adjustment',
      description: 'Adjust dependent process timeline',
      automated: true,
      riskLevel: 'low'
    });
    
    return changes;
  }

  private isAutoReconcilable(changes: ProcessChange[], impactLevel: string): boolean {
    // Determine if changes can be applied automatically
    const hasManualChanges = changes.some(change => !change.automated);
    const hasHighRisk = changes.some(change => change.riskLevel === 'high');
    const isCriticalImpact = impactLevel === 'critical';
    
    return !hasManualChanges && !hasHighRisk && !isCriticalImpact;
  }

  private hasBreakingChanges(semanticChanges: SemanticChange[]): boolean {
    return semanticChanges.some(change => change.breakingChange);
  }

  private requiresApproval(riskAssessment: RiskAssessment, dependentProcesses: DependentProcess[]): boolean {
    return riskAssessment.overall === 'high' || 
           riskAssessment.overall === 'critical' ||
           dependentProcesses.some(p => p.impactLevel === 'critical');
  }

  private calculateEstimatedTime(reconciliationPlan: ReconciliationAction[]): number {
    let totalTime = 0;
    
    for (const action of reconciliationPlan) {
      switch (action.type) {
        case 'auto-apply':
          totalTime += 2; // 2 minutes for auto-apply
          break;
        case 'review-required':
          totalTime += 30; // 30 minutes for manual review
          break;
        case 'manual-intervention':
          totalTime += 120; // 2 hours for manual intervention
          break;
      }
    }
    
    return totalTime;
  }

  private createFallbackAnalysis(modifications: BusyFileModification[]): KnitImpactAnalysis {
    return {
      hasBreakingChanges: false,
      requiresApproval: modifications.length > 3, // Simple heuristic
      dependentProcesses: [],
      reconciliationPlan: [],
      riskAssessment: {
        overall: 'low',
        factors: [],
        mitigations: []
      },
      estimatedTime: 10
    };
  }

  private async createReconciliationBranch(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `orgata-ide/reconcile-${timestamp}`;
    
    try {
      await execAsync(`git checkout -b ${branchName}`);
      return branchName;
    } catch (error) {
      console.error('Error creating reconciliation branch:', error);
      return branchName;
    }
  }

  private async applyModifications(modifications: BusyFileModification[]): Promise<void> {
    for (const modification of modifications) {
      try {
        switch (modification.type) {
          case 'create':
            await this.createFile(modification);
            break;
          case 'update':
            await this.updateFile(modification);
            break;
          case 'delete':
            await this.deleteFile(modification);
            break;
        }
      } catch (error) {
        console.error(`Error applying modification to ${modification.filePath}:`, error);
        throw error;
      }
    }
  }

  private async createFile(modification: BusyFileModification): Promise<void> {
    const dir = path.dirname(modification.filePath);
    await fs.mkdir(dir, { recursive: true });
    
    const content = modification.changes[0]?.newValue || '';
    await fs.writeFile(modification.filePath, content, 'utf-8');
  }

  private async updateFile(modification: BusyFileModification): Promise<void> {
    // Apply changes to existing file
    let content = await fs.readFile(modification.filePath, 'utf-8');
    
    for (const change of modification.changes) {
      if (change.operation === 'modify' && change.newValue) {
        content = change.newValue as string;
      }
    }
    
    await fs.writeFile(modification.filePath, content, 'utf-8');
  }

  private async deleteFile(modification: BusyFileModification): Promise<void> {
    try {
      await fs.unlink(modification.filePath);
    } catch (error) {
      console.warn(`Could not delete file ${modification.filePath}:`, error);
    }
  }

  private async linkNewDependencies(modifications: BusyFileModification[]): Promise<void> {
    for (const modification of modifications) {
      if (modification.type === 'create') {
        // Auto-link new files to relevant existing files
        await this.autoLinkFile(modification.filePath);
      }
    }
  }

  private async autoLinkFile(filePath: string): Promise<void> {
    try {
      // Use new link analysis feature for intelligent dependency discovery
      const { stdout } = await execAsync(`knit analyze-links ${filePath} --auto-add --threshold 0.7`);
      console.log(`Auto-linked file ${filePath}: ${stdout}`);
    } catch (error) {
      console.warn(`Could not auto-link file ${filePath}:`, error);
      // Fallback to manual dependency identification
      try {
        const dependencies = await this.identifyFileDependencies(filePath);
        for (const dependency of dependencies) {
          await execAsync(`knit link ${filePath} ${dependency}`);
        }
      } catch (fallbackError) {
        console.warn('Fallback linking also failed:', fallbackError);
      }
    }
  }

  private async identifyFileDependencies(filePath: string): Promise<string[]> {
    const dependencies: string[] = [];
    
    // Business processes typically depend on:
    // - Team definitions
    // - Resource definitions  
    // - Higher-level process definitions
    
    if (filePath.includes('/L0/') && filePath.includes('operations')) {
      // L0 operations depend on team definitions
      dependencies.push(`${path.dirname(filePath)}/../team-management/team.busy`);
    }
    
    if (filePath.includes('/L1/')) {
      // L1 processes depend on L0 processes
      const l0Path = filePath.replace('/L1/', '/L0/');
      dependencies.push(l0Path);
    }
    
    return dependencies.filter(dep => this.fileExists(dep));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async runKnitReconciliation(): Promise<KnitReconciliationResult> {
    try {
      // Use new delegation mode for AI-assisted reconciliation
      const { stdout, stderr } = await execAsync('knit reconcile --delegate --format structured');
      
      if (stdout.includes('DELEGATION REQUESTS')) {
        // Parse delegation requests and process them
        const delegationData = this.parseDelegationRequests(stdout);
        const processedResults = await this.processDelegationRequests(delegationData);
        
        return {
          success: processedResults.success,
          appliedChanges: processedResults.appliedChanges,
          pendingReviews: processedResults.pendingReviews,
          errors: processedResults.errors,
          warnings: processedResults.warnings
        };
      } else {
        // Fallback to traditional reconciliation
        const { stdout: fallbackStdout, stderr: fallbackStderr } = await execAsync('knit reconcile --auto-apply');
        
        return {
          success: true,
          appliedChanges: this.parseAppliedChanges(fallbackStdout),
          pendingReviews: this.parsePendingReviews(fallbackStdout),
          errors: fallbackStderr ? [fallbackStderr] : [],
          warnings: []
        };
      }
    } catch (error) {
      return {
        success: false,
        appliedChanges: [],
        pendingReviews: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  private async validateBusinessProcessIntegrity(modifications: BusyFileModification[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const modification of modifications) {
      try {
        // Validate YAML syntax
        if (modification.filePath.endsWith('.busy')) {
          await this.validateBusyFileSyntax(modification);
        }
        
        // Validate business logic
        await this.validateBusinessLogic(modification);
        
      } catch (error) {
        errors.push(`Validation error in ${modification.filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return {
      success: errors.length === 0,
      errors,
      warnings
    };
  }

  private async validateBusyFileSyntax(modification: BusyFileModification): Promise<void> {
    try {
      // Use existing BUSY compiler for validation
      const compilerPath = path.join(process.cwd(), 'compiler', 'src', 'index.ts');
      if (await this.fileExists(compilerPath)) {
        await execAsync(`cd compiler && npm run validate ${modification.filePath}`);
      }
    } catch (error) {
      throw new Error(`BUSY syntax validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateBusinessLogic(modification: BusyFileModification): Promise<void> {
    // Validate business process logic
    // - Check for circular dependencies
    // - Validate resource assignments
    // - Check timeline consistency
    // This would integrate with the existing validation system
  }

  private async checkProcessCoherence(filePath: string, dependencyGraph: DependencyGraph): Promise<CoherenceViolation[]> {
    const violations: CoherenceViolation[] = [];
    
    // Check if file respects its dependencies
    const fileNode = dependencyGraph.dependencies[filePath];
    if (fileNode) {
      for (const dependency of fileNode.watches || []) {
        const violation = await this.checkDependencyCoherence(filePath, dependency);
        if (violation) {
          violations.push(violation);
        }
      }
    }
    
    return violations;
  }

  private async checkCrossProcessCoherence(processFiles: string[]): Promise<CoherenceViolation[]> {
    const violations: CoherenceViolation[] = [];
    
    // Check for conflicts between processes
    // - Resource over-allocation
    // - Timeline conflicts
    // - Role assignment conflicts
    
    return violations;
  }

  private async checkDependencyCoherence(filePath: string, dependencyPath: string): Promise<CoherenceViolation | null> {
    // Implementation would check if the file properly respects its dependency
    return null;
  }

  private async generateCoherenceSuggestions(violations: CoherenceViolation[]): Promise<CoherenceSuggestion[]> {
    return violations.map(violation => ({
      violationId: violation.type,
      suggestion: `Address ${violation.type}: ${violation.recommendation}`,
      priority: violation.severity === 'critical' ? 'high' : 'medium',
      autoFixAvailable: false
    }));
  }

  private calculateOverallRisk(riskFactors: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (riskFactors.some(f => f.impact === 'critical')) return 'critical';
    if (riskFactors.some(f => f.impact === 'high')) return 'high';
    if (riskFactors.length > 2) return 'medium';
    return 'low';
  }

  private getPriority(impactLevel: string): 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'urgent'
    };
    
    return priorityMap[impactLevel] || 'medium';
  }

  private parseAppliedChanges(stdout: string): string[] {
    // Parse knit output to extract applied changes
    return [];
  }

  private parsePendingReviews(stdout: string): string[] {
    // Parse knit output to extract pending reviews
    return [];
  }

  private parseDelegationRequests(stdout: string): any {
    try {
      // Extract JSON from delegation output
      const jsonMatch = stdout.match(/--- DELEGATION REQUESTS \(JSON\) ---\n([\s\S]*?)\n--- END DELEGATION REQUESTS ---/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch (error) {
      console.error('Error parsing delegation requests:', error);
    }
    return null;
  }

  private async processDelegationRequests(delegationData: any): Promise<KnitReconciliationResult> {
    if (!delegationData || !delegationData.reconciliations) {
      return {
        success: false,
        appliedChanges: [],
        pendingReviews: [],
        errors: ['Invalid delegation data'],
        warnings: []
      };
    }

    const appliedChanges: string[] = [];
    const pendingReviews: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Process each reconciliation request
    for (const request of delegationData.reconciliations) {
      try {
        if (request.confidence >= 0.8) {
          // High confidence - attempt automated processing
          await this.processSingleReconciliation(request);
          appliedChanges.push(`${request.sourceFile} → ${request.targetFile}`);
        } else {
          // Lower confidence - add to review queue
          pendingReviews.push(`${request.sourceFile} → ${request.targetFile} (${Math.round(request.confidence * 100)}% confidence)`);
        }
      } catch (error) {
        errors.push(`Error processing ${request.sourceFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      appliedChanges,
      pendingReviews,
      errors,
      warnings
    };
  }

  private async processSingleReconciliation(request: any): Promise<void> {
    // This would process individual reconciliation requests
    // For now, we'll log the request details
    console.log(`Processing reconciliation: ${request.sourceFile} → ${request.targetFile}`);
    console.log(`Relationship: ${request.relationship}`);
    console.log(`Changes: ${request.changes.substring(0, 200)}...`);
    
    // In a real implementation, this would:
    // 1. Parse the git diff in request.changes
    // 2. Apply the changes to the target file
    // 3. Validate the changes
    // 4. Handle any errors
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Supporting interfaces
interface DependencyGraph {
  dependencies: Record<string, DependencyNode>;
  version: string;
  lastUpdated: string;
}

interface DependencyNode {
  watches?: string[];
  watchedBy?: string[];
  reconciliationRules?: {
    requireReview?: string[];
    autoApplyThreshold?: number;
  };
}

interface SemanticChange {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  affectsInterface: boolean;
  breakingChange: boolean;
}

interface ReconciliationResult {
  success: boolean;
  branchName: string;
  appliedChanges: string[];
  pendingReviews: string[];
  errors: string[];
  warnings: string[];
}

interface KnitReconciliationResult {
  success: boolean;
  appliedChanges: string[];
  pendingReviews: string[];
  errors: string[];
  warnings: string[];
}

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

interface BusinessCoherenceResult {
  isCoherent: boolean;
  violations: CoherenceViolation[];
  suggestions: CoherenceSuggestion[];
}

interface CoherenceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedFiles: string[];
  recommendation: string;
}

interface CoherenceSuggestion {
  violationId: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  autoFixAvailable: boolean;
}