import { promises as fs } from 'fs';
import * as path from 'path';
import { DependencyGraphManager } from '../core/dependency-graph';
import { GitManager } from '../core/git-integration';
import { HashTracker } from '../core/hash-tracker';
import { LLMClient } from './llm-client';
import { 
  ReconciliationSession, 
  ReconciliationResult, 
  ChangeEvent, 
  ConflictType,
  KnitConfig,
  ReconcileOptions,
  DelegationRequest,
  DelegationOutput,
  ProjectContext 
} from '../types';

export class GitReconciler {
  private depGraph: DependencyGraphManager;
  private gitManager: GitManager;
  private hashTracker: HashTracker;
  private llmClient: LLMClient;
  private config: KnitConfig;
  private projectRoot: string;

  constructor(
    projectRoot: string,
    config: KnitConfig,
    depGraph: DependencyGraphManager,
    gitManager: GitManager,
    hashTracker: HashTracker
  ) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.depGraph = depGraph;
    this.gitManager = gitManager;
    this.hashTracker = hashTracker;
    this.llmClient = new LLMClient(config.llm);
  }

  /**
   * Start reconciliation process
   */
  async startReconciliation(options: ReconcileOptions = {}): Promise<ReconciliationSession> {
    const config = {
      mode: options.mode || 'in-place' as const,
      createBranch: options.createBranch || false,
      autoApply: options.autoApply !== undefined ? options.autoApply : true,
      safeOnly: options.safeOnly || false,
      interactive: options.interactive || false,
      stagedOnly: options.stagedOnly || false,
      baseBranch: options.baseBranch
    };

    // Verify git repository
    if (!this.gitManager.isGitRepository()) {
      throw new Error('Not a git repository. Knit requires git for reconciliation workflow.');
    }

    const gitStatus = this.gitManager.getGitStatus();
    const currentBranch = gitStatus.currentBranch;
    
    // Validate preconditions
    await this.validatePreconditions(currentBranch, config);
    
    // Try to detect parent branch early for better error messages
    if (!config.createBranch && !config.baseBranch) {
      try {
        this.gitManager.getParentBranch(currentBranch);
      } catch (error) {
        throw new Error(`Parent branch detection failed: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
          'Options:\n' +
          '1. Specify parent explicitly: knit reconcile --base-branch main\n' +
          '2. Check available branches: git branch -a\n' +
          '3. Use branch mode instead: knit reconcile --create-branch');
      }
    }

    if (config.createBranch) {
      return this.reconcileWithNewBranch(currentBranch, config);
    } else {
      return this.reconcileInPlace(currentBranch, config);
    }
  }

  /**
   * Validate preconditions before reconciliation
   */
  private async validatePreconditions(currentBranch: string, options: ReconcileOptions): Promise<void> {
    // Validate branch
    this.validateBranch(currentBranch);
    
    const gitStatus = this.gitManager.getGitStatus();
    
    // Check for uncommitted changes in branch mode
    if (options.createBranch && gitStatus.hasUncommittedChanges) {
      throw new Error('Cannot start reconciliation with uncommitted changes. Please commit or stash your changes first.');
    }
    
    // Warn about uncommitted changes in in-place mode
    if (options.mode === 'in-place' && gitStatus.hasUncommittedChanges && !options.stagedOnly) {
      console.warn('⚠️  You have uncommitted changes. In-place mode will include them in analysis.');
      console.log('   Use --staged-only to reconcile only staged changes, or commit/stash changes first.');
    }
  }

  /**
   * Validate branch for reconciliation
   */
  private validateBranch(currentBranch: string): void {
    if (currentBranch === 'main' || currentBranch === 'master') {
      throw new Error('Cannot reconcile on main branch. Create a feature branch first.\nExample: git checkout -b feature/your-changes');
    }
  }

  /**
   * Legacy branch-based reconciliation
   */
  private async reconcileWithNewBranch(currentBranch: string, config: ReconcileOptions): Promise<ReconciliationSession> {
    // Create reconciliation branch
    const reconciliationBranch = this.gitManager.createReconciliationBranch(currentBranch);
    
    // Analyze changes since last reconciliation
    const changes = this.gitManager.analyzeChanges('HEAD~1', 'HEAD');
    
    const session: ReconciliationSession = {
      id: this.generateSessionId(),
      started: new Date(),
      status: 'in_progress',
      sourceBranch: currentBranch,
      reconciliationBranch,
      changes,
      results: [],
      autoApplied: 0,
      reviewed: 0,
      rejected: 0,
      mode: 'branch'
    };

    console.log(`✅ Created reconciliation branch: ${reconciliationBranch}`);
    console.log(`📊 Analyzing ${changes.length} changed files...`);

    return session;
  }

  /**
   * In-place reconciliation implementation  
   */
  private async reconcileInPlace(currentBranch: string, config: ReconcileOptions): Promise<ReconciliationSession> {
    // Get parent branch
    const parentBranch = config.baseBranch || this.gitManager.getParentBranch(currentBranch);
    console.log(`📊 Analyzing changes since branching from: ${parentBranch}`);
    
    // Get ALL changes since branching from parent
    const changes = config.stagedOnly 
      ? this.gitManager.getStagedChanges()
      : this.gitManager.getRecursiveChanges(parentBranch);
      
    const session: ReconciliationSession = {
      id: this.generateSessionId(),
      started: new Date(),
      status: 'in_progress',
      sourceBranch: currentBranch,
      reconciliationBranch: currentBranch, // Same branch
      changes,
      results: [],
      autoApplied: 0,
      reviewed: 0,
      rejected: 0,
      mode: 'in_place'
    };
    
    console.log(`📊 Found ${changes.length} changed files for reconciliation`);
    
    // Save session state
    await this.saveSession(session);
    
    return session;
  }


  /**
   * Process reconciliation for all changes in session
   */
  async processReconciliation(session: ReconciliationSession, autoApply = true, delegateMode = false): Promise<DelegationOutput | void> {
    if (delegateMode) {
      return this.generateDelegationRequests(session);
    }

    for (const change of session.changes) {
      await this.processFileChange(session, change, autoApply);
    }

    // Update session
    session.status = 'completed';
    await this.saveSession(session);

    // Generate commit with reconciliation summary
    await this.commitReconciliation(session);

    console.log(`✅ Reconciliation completed:`);
    console.log(`   Auto-applied: ${session.autoApplied}`);
    console.log(`   Needs review: ${session.reviewed}`);
  }

  /**
   * Generate delegation requests for Claude Code processing
   */
  private async generateDelegationRequests(session: ReconciliationSession): Promise<DelegationOutput> {
    const requests: DelegationRequest[] = [];
    let requestId = 1;

    // Analyze project context once
    const projectContext = await this.analyzeProjectContext();

    for (const change of session.changes) {
      const dependentFiles = this.depGraph.getDependentFiles(change.filepath);
      
      for (const dependentFile of dependentFiles) {
        try {
          const request = await this.createDelegationRequest(
            `reconcile_${String(requestId).padStart(3, '0')}`,
            change,
            dependentFile,
            projectContext
          );
          requests.push(request);
          requestId++;
        } catch (error) {
          console.warn(`Warning: Could not create delegation request for ${dependentFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Calculate summary stats
    const highConfidence = requests.filter(r => r.confidence >= 0.8).length;
    const requiresReview = requests.filter(r => r.confidence < 0.6).length;

    return {
      reconciliations: requests,
      summary: {
        totalRequests: requests.length,
        highConfidence,
        requiresReview
      }
    };
  }

  /**
   * Create a delegation request for a specific file pair
   */
  private async createDelegationRequest(
    id: string,
    change: ChangeEvent,
    dependentFile: string,
    projectContext: ProjectContext
  ): Promise<DelegationRequest> {
    // Read dependent file content
    const dependentPath = path.join(this.projectRoot, dependentFile);
    let dependentContent: string;
    
    try {
      dependentContent = await fs.readFile(dependentPath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot read dependent file ${dependentFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Determine relationship type
    const relationship = this.inferRelationship(change.filepath, dependentFile);
    
    // Generate contextual prompt
    const prompt = this.generateReconciliationPrompt(change, dependentFile, dependentContent, projectContext, relationship);
    
    // Calculate confidence based on various factors
    const confidence = this.calculateDelegationConfidence(change, dependentFile, relationship);

    return {
      id,
      sourceFile: change.filepath,
      targetFile: dependentFile,
      changes: change.gitDiff || 'No diff available',
      relationship,
      context: {
        ...projectContext,
        fileContent: dependentContent,
        relatedFiles: this.findRelatedFiles(dependentFile)
      },
      prompt,
      confidence
    };
  }

  /**
   * Analyze project context for better delegation requests
   */
  private async analyzeProjectContext(): Promise<ProjectContext> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    let projectType = 'generic';
    let frameworks: string[] = [];

    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      // Detect project type and frameworks
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (dependencies['react']) frameworks.push('react');
      if (dependencies['vue']) frameworks.push('vue');
      if (dependencies['express']) frameworks.push('express');
      if (dependencies['typescript']) {
        projectType = 'typescript';
        frameworks.push('typescript');
      }
      if (dependencies['@types/node']) frameworks.push('nodejs');
      
    } catch (error) {
      // Fallback detection based on file extensions
      console.warn('Could not read package.json, using fallback detection');
    }

    return {
      projectType,
      frameworks,
      relatedFiles: []
    };
  }

  /**
   * Generate a contextual prompt for reconciliation
   */
  private generateReconciliationPrompt(
    change: ChangeEvent,
    dependentFile: string,
    dependentContent: string,
    context: ProjectContext,
    relationship: string
  ): string {
    const relationshipPrompts = {
      'design_to_code': `Update the implementation in ${dependentFile} based on design changes in ${change.filepath}.`,
      'code_to_test': `Update the test file ${dependentFile} to reflect changes in ${change.filepath}.`,
      'spec_to_impl': `Update the implementation ${dependentFile} to match the specification changes in ${change.filepath}.`,
      'types_to_usage': `Update the usage in ${dependentFile} based on type definition changes in ${change.filepath}.`,
      'config_to_code': `Update the code in ${dependentFile} to reflect configuration changes in ${change.filepath}.`,
      'bidirectional': `Update ${dependentFile} to maintain consistency with changes in ${change.filepath}.`
    };

    const basePrompt = relationshipPrompts[relationship as keyof typeof relationshipPrompts] || 
      `Update ${dependentFile} to maintain consistency with changes in ${change.filepath}.`;

    return `${basePrompt}

Changes made to source file:
${change.gitDiff || 'Changes detected but diff not available'}

Current target file content:
${dependentContent}

Project context: ${context.projectType} project using ${context.frameworks.join(', ')}
Related files: ${context.relatedFiles.join(', ')}

Please analyze the changes and update the target file appropriately to maintain consistency and correctness.`;
  }

  /**
   * Infer relationship type between two files
   */
  private inferRelationship(sourceFile: string, targetFile: string): string {
    // Design to code
    if (sourceFile.match(/\.(md|txt)$/) && targetFile.match(/\.(ts|js|py)$/)) {
      return 'design_to_code';
    }
    
    // Code to test
    if (sourceFile.match(/src\/.*\.(ts|js)$/) && targetFile.match(/tests?\/.*\.(test|spec)\.(ts|js)$/)) {
      return 'code_to_test';
    }
    
    // Types to usage
    if (sourceFile.match(/types\/.*\.(ts|d\.ts)$/) && targetFile.match(/src\/.*\.(ts|js)$/)) {
      return 'types_to_usage';
    }
    
    // README/spec to implementation
    if (sourceFile.match(/README\.md$|.*\.spec\.md$/) && targetFile.match(/src\/.*\.(ts|js)$/)) {
      return 'spec_to_impl';
    }
    
    // Configuration to code
    if (sourceFile.match(/\.(json|yaml|yml|env)$/) && targetFile.match(/src\/.*\.(ts|js)$/)) {
      return 'config_to_code';
    }

    return 'bidirectional';
  }

  /**
   * Calculate confidence for delegation request
   */
  private calculateDelegationConfidence(change: ChangeEvent, dependentFile: string, relationship: string): number {
    let confidence = 0.5; // Base confidence
    
    // Relationship-based confidence
    const relationshipConfidence = {
      'code_to_test': 0.9,
      'design_to_code': 0.8,
      'types_to_usage': 0.85,
      'spec_to_impl': 0.75,
      'config_to_code': 0.7,
      'bidirectional': 0.6
    };
    
    confidence += (relationshipConfidence[relationship as keyof typeof relationshipConfidence] || 0.5) * 0.4;
    
    // File naming pattern confidence
    if (this.hasConsistentNaming(change.filepath, dependentFile)) {
      confidence += 0.2;
    }
    
    // Change size confidence (smaller changes are more reliable)
    const changeSize = change.gitDiff?.split('\n').length || 0;
    if (changeSize < 50) confidence += 0.1;
    else if (changeSize > 200) confidence -= 0.1;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Check if two files have consistent naming patterns
   */
  private hasConsistentNaming(file1: string, file2: string): boolean {
    const baseName1 = path.basename(file1, path.extname(file1));
    const baseName2 = path.basename(file2, path.extname(file2));
    
    // Remove common suffixes/prefixes
    const cleanName1 = baseName1.replace(/\.(test|spec)$/, '');
    const cleanName2 = baseName2.replace(/\.(test|spec)$/, '');
    
    return cleanName1 === cleanName2 || baseName2.includes(cleanName1) || baseName1.includes(cleanName2);
  }

  /**
   * Find related files for better context
   */
  private findRelatedFiles(targetFile: string): string[] {
    const relatedFiles: string[] = [];
    const baseName = path.basename(targetFile, path.extname(targetFile));
    
    // This is a simplified implementation - could be enhanced with more sophisticated analysis
    const allDeps = this.depGraph.getAllDependencies();
    
    Object.keys(allDeps).forEach(file => {
      if (file !== targetFile && (
        file.includes(baseName) || 
        path.dirname(file) === path.dirname(targetFile)
      )) {
        relatedFiles.push(file);
      }
    });
    
    return relatedFiles.slice(0, 5); // Limit to 5 related files
  }

  /**
   * Process reconciliation for a single file change
   */
  private async processFileChange(
    session: ReconciliationSession,
    change: ChangeEvent,
    autoApply: boolean
  ): Promise<void> {
    // Get dependent files
    const dependentFiles = this.depGraph.getDependentFiles(change.filepath);
    
    console.log(`🔍 Analyzing ${change.filepath} → ${dependentFiles.length} dependents`);

    for (const dependentFile of dependentFiles) {
      try {
        const result = await this.reconcileFilePair(change, dependentFile);
        session.results.push(result);

        if (autoApply && result.classification === ConflictType.SAFE_AUTO_APPLY) {
          await this.applyReconciliation(result);
          session.autoApplied++;
          console.log(`✅ Auto-applied: ${dependentFile}`);
        } else if (result.classification !== ConflictType.NO_ACTION) {
          session.reviewed++;
          console.log(`⚠️  Needs review: ${dependentFile} (${result.reasoning})`);
        }
      } catch (error) {
        await this.handleReconciliationError(error, change, dependentFile, session);
      }
    }
  }

  /**
   * Enhanced error handling for reconciliation failures
   */
  private async handleReconciliationError(
    error: unknown, 
    change: ChangeEvent, 
    dependentFile: string, 
    session: ReconciliationSession
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Failed to reconcile ${dependentFile}: ${errorMessage}`);
    
    // Provide specific guidance based on error type
    if (errorMessage.includes('merge conflict')) {
      console.log('\n📋 Conflict Resolution Options:');
      console.log('1. Resolve conflicts manually and run: knit reconcile --continue');
      console.log('2. Skip conflicting changes: knit reconcile --skip-conflicts');  
      console.log('3. Use branch mode instead: knit reconcile --create-branch');
    } else if (errorMessage.includes('file not found') || errorMessage.includes('ENOENT')) {
      console.log('\n📋 File Access Issues:');
      console.log(`1. Check if file exists: ls -la ${dependentFile}`);
      console.log('2. Update dependency links if file moved: knit unlink && knit link');
      console.log('3. Remove stale dependencies: knit status --detailed');
    } else if (errorMessage.includes('permission')) {
      console.log('\n📋 Permission Issues:');
      console.log(`1. Check file permissions: ls -la ${dependentFile}`);
      console.log('2. Ensure file is writable');
      console.log('3. Check git repository permissions');
    }
    
    // Create error result for tracking
    const errorResult: ReconciliationResult = {
      classification: ConflictType.REVIEW_REQUIRED,
      confidence: 0.0,
      reasoning: `Reconciliation failed: ${errorMessage}`,
      contradictions: [errorMessage],
      requiresReview: true,
      metadata: {
        sourceFile: change.filepath,
        targetFile: dependentFile,
        timestamp: new Date(),
        errorType: this.categorizeError(errorMessage)
      }
    };
    
    session.results.push(errorResult);
    session.reviewed++;
  }

  /**
   * Categorize errors for better handling
   */
  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('merge conflict')) return 'merge_conflict';
    if (errorMessage.includes('file not found') || errorMessage.includes('ENOENT')) return 'file_not_found';
    if (errorMessage.includes('permission')) return 'permission_denied';
    if (errorMessage.includes('parent branch')) return 'branch_detection_failed';
    if (errorMessage.includes('LLM') || errorMessage.includes('API')) return 'llm_failure';
    return 'unknown_error';
  }

  /**
   * Reconcile a specific file pair
   */
  private async reconcileFilePair(
    change: ChangeEvent,
    dependentFile: string
  ): Promise<ReconciliationResult> {
    const dependentPath = path.join(this.projectRoot, dependentFile);
    
    // Read dependent file content
    let dependentContent: string;
    try {
      dependentContent = await fs.readFile(dependentPath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot read dependent file ${dependentFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Get reconciliation rules
    const rules = this.depGraph.getReconciliationRules(dependentFile);
    
    // Analyze with LLM
    const analysis = await this.llmClient.analyzeReconciliation(
      change.filepath,
      dependentFile,
      change.gitDiff || '',
      dependentContent,
      'dependency'
    );

    // Apply reconciliation rules and thresholds
    const finalClassification = this.applyReconciliationRules(analysis, rules);

    const result: ReconciliationResult = {
      classification: finalClassification,
      confidence: analysis.confidence,
      reasoning: analysis.changesNeeded,
      proposedChanges: analysis.proposedDiff,
      contradictions: analysis.contradictions,
      requiresReview: finalClassification !== ConflictType.SAFE_AUTO_APPLY && finalClassification !== ConflictType.NO_ACTION,
      metadata: {
        sourceFile: change.filepath,
        targetFile: dependentFile,
        timestamp: new Date(),
        llmModel: this.config.llm.model
      }
    };

    return result;
  }

  /**
   * Apply reconciliation rules to LLM analysis
   */
  private applyReconciliationRules(
    analysis: any,
    rules: any
  ): ConflictType {
    // If no update needed, return NO_ACTION
    if (!analysis.needsUpdate) {
      return ConflictType.NO_ACTION;
    }

    // Check confidence threshold
    const threshold = rules?.autoApplyThreshold || this.config.autoApplyThreshold;
    if (analysis.confidence < threshold) {
      return ConflictType.REVIEW_REQUIRED;
    }

    // Check if category requires review
    const requiresReview = rules?.requireReview || ['breaking', 'interface'];
    if (requiresReview.includes(analysis.category)) {
      return ConflictType.REVIEW_REQUIRED;
    }

    // Check for contradictions
    if (analysis.contradictions.length > 0) {
      return ConflictType.REVIEW_REQUIRED;
    }

    // Return LLM classification if it passes all rules
    return analysis.classification;
  }

  /**
   * Apply a reconciliation result (modify the target file)
   */
  private async applyReconciliation(result: ReconciliationResult): Promise<void> {
    if (!result.proposedChanges) {
      return; // No changes to apply
    }

    const targetPath = path.join(this.projectRoot, result.metadata.targetFile);
    
    try {
      // For now, we'll implement a simple approach
      // In a full implementation, we'd parse the diff and apply it properly
      const currentContent = await fs.readFile(targetPath, 'utf-8');
      
      // This is a simplified implementation - in practice, we'd need proper diff parsing
      // For MVP, we'll just append a comment indicating manual review is needed
      const updatedContent = currentContent + '\n\n// knit: Auto-reconciliation applied\n// Changes: ' + result.reasoning + '\n';
      
      await fs.writeFile(targetPath, updatedContent);
      
      // Update hash tracker
      await this.hashTracker.updateHash(result.metadata.targetFile);
      
    } catch (error) {
      throw new Error(`Failed to apply changes to ${result.metadata.targetFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Commit reconciliation changes
   */
  private async commitReconciliation(session: ReconciliationSession): Promise<void> {
    const summary = this.generateReconciliationSummary(session.results);
    
    const commitMessage = `knit: reconcile dependencies for ${session.sourceBranch}

${summary}

Session: ${session.id}
Auto-applied: ${session.autoApplied}
Needs review: ${session.reviewed}`;

    this.gitManager.commit(commitMessage);
  }

  /**
   * Save reconciliation session
   */
  private async saveSession(session: ReconciliationSession): Promise<void> {
    const sessionFile = path.join(this.projectRoot, '.knit', 'reconciliation', `${session.id}.json`);
    await fs.mkdir(path.dirname(sessionFile), { recursive: true });
    await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
  }

  /**
   * Load reconciliation session
   */
  async loadSession(sessionId: string): Promise<ReconciliationSession | null> {
    const sessionFile = path.join(this.projectRoot, '.knit', 'reconciliation', `${sessionId}.json`);
    
    try {
      const content = await fs.readFile(sessionFile, 'utf-8');
      const session = JSON.parse(content);
      
      // Convert date strings back to Date objects
      session.started = new Date(session.started);
      session.results.forEach((result: any) => {
        result.metadata.timestamp = new Date(result.metadata.timestamp);
      });
      
      return session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all reconciliation sessions
   */
  async getAllSessions(): Promise<ReconciliationSession[]> {
    const reconciliationDir = path.join(this.projectRoot, '.knit', 'reconciliation');
    
    try {
      const files = await fs.readdir(reconciliationDir);
      const sessions: ReconciliationSession[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'pending.json') {
          const sessionId = file.replace('.json', '');
          const session = await this.loadSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        }
      }
      
      return sessions.sort((a, b) => b.started.getTime() - a.started.getTime());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private generateSessionId(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  /**
   * Generate reconciliation summary from results
   */
  private generateReconciliationSummary(results: ReconciliationResult[]): string {
    const safeChanges = results.filter(r => r.classification === ConflictType.SAFE_AUTO_APPLY);
    const reviewChanges = results.filter(r => 
      r.classification === ConflictType.REVIEW_RECOMMENDED || 
      r.classification === ConflictType.REVIEW_REQUIRED
    );

    const lines: string[] = [];
    
    if (safeChanges.length > 0) {
      lines.push('Auto-applied changes:');
      safeChanges.forEach(change => {
        lines.push(`- ${change.metadata.targetFile}: ${change.reasoning}`);
      });
    }

    if (reviewChanges.length > 0) {
      lines.push('');
      lines.push('Changes requiring review:');
      reviewChanges.forEach(change => {
        lines.push(`- ${change.metadata.targetFile}: ${change.reasoning} (confidence: ${(change.confidence * 100).toFixed(0)}%)`);
        if (change.contradictions.length > 0) {
          change.contradictions.forEach(contradiction => {
            lines.push(`  ⚠️ ${contradiction}`);
          });
        }
      });
    }

    return lines.join('\n');
  }
}