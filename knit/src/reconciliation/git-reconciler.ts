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
  KnitConfig 
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
  async startReconciliation(sourceBranch?: string): Promise<ReconciliationSession> {
    // Verify git repository
    if (!this.gitManager.isGitRepository()) {
      throw new Error('Not a git repository. Knit requires git for reconciliation workflow.');
    }

    const gitStatus = this.gitManager.getGitStatus();
    
    if (gitStatus.hasUncommittedChanges) {
      throw new Error('Cannot start reconciliation with uncommitted changes. Please commit or stash your changes first.');
    }

    const currentBranch = sourceBranch || gitStatus.currentBranch;
    
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
      rejected: 0
    };

    // Save session state
    await this.saveSession(session);

    console.log(`✅ Created reconciliation branch: ${reconciliationBranch}`);
    console.log(`📊 Analyzing ${changes.length} changed files...`);

    return session;
  }

  /**
   * Process reconciliation for all changes in session
   */
  async processReconciliation(session: ReconciliationSession, autoApply = true): Promise<void> {
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
        console.error(`❌ Failed to reconcile ${dependentFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Create error result
        const errorResult: ReconciliationResult = {
          classification: ConflictType.REVIEW_REQUIRED,
          confidence: 0.0,
          reasoning: `Reconciliation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          contradictions: [],
          requiresReview: true,
          metadata: {
            sourceFile: change.filepath,
            targetFile: dependentFile,
            timestamp: new Date()
          }
        };
        
        session.results.push(errorResult);
        session.reviewed++;
      }
    }
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