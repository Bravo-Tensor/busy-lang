import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { DependencyGraphManager } from './dependency-graph';
import { GitManager } from './git-integration';
import { HashTracker } from './hash-tracker';
import { GitReconciler } from '../reconciliation/git-reconciler';
import { LinkAnalyzer, LinkSuggestion } from '../analysis/link-analyzer';
import { KnitConfig, ReconciliationRules, ReconcileOptions, DelegationOutput } from '../types';

export class KnitManager {
  private projectRoot: string;
  private depGraph: DependencyGraphManager;
  private gitManager: GitManager;
  private hashTracker: HashTracker;
  private config: KnitConfig;
  private reconciler: GitReconciler;
  private linkAnalyzer: LinkAnalyzer;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.depGraph = new DependencyGraphManager(projectRoot);
    this.gitManager = new GitManager(projectRoot);
    this.hashTracker = new HashTracker(path.join(projectRoot, '.knit'));
    this.config = this.getDefaultConfig();
    this.reconciler = new GitReconciler(
      projectRoot,
      this.config,
      this.depGraph,
      this.gitManager,
      this.hashTracker
    );
    this.linkAnalyzer = new LinkAnalyzer(projectRoot, this.depGraph, this.config);
  }

  /**
   * Initialize knit in the project
   */
  async initialize(): Promise<void> {
    // Check if already initialized
    const knitDir = path.join(this.projectRoot, '.knit');
    try {
      await fs.access(knitDir);
      throw new Error('Knit already initialized in this directory');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Check if git repository
    if (!this.gitManager.isGitRepository()) {
      throw new Error('Not a git repository. Knit requires git for reconciliation workflow.');
    }

    await this.depGraph.initialize();
    await this.loadConfig();
  }

  /**
   * Add dependency relationship
   */
  async addDependency(
    sourceFile: string, 
    targetFile: string, 
    rules?: Partial<ReconciliationRules>
  ): Promise<void> {
    await this.loadConfig();
    await this.depGraph.load();
    
    // Validate files exist
    const sourcePath = path.resolve(this.projectRoot, sourceFile);
    const targetPath = path.resolve(this.projectRoot, targetFile);
    
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
    } catch (error) {
      throw new Error('One or both files do not exist');
    }

    await this.depGraph.addDependency(sourceFile, targetFile, rules);
  }

  /**
   * Remove dependency relationship
   */
  async removeDependency(sourceFile: string, targetFile: string): Promise<void> {
    await this.depGraph.load();
    await this.depGraph.removeDependency(sourceFile, targetFile);
  }

  /**
   * Start reconciliation process
   */
  async reconcile(options: ReconcileOptions = {}): Promise<void> {
    await this.loadConfig();
    await this.depGraph.load();

    console.log(chalk.blue('🔄 Starting dependency reconciliation...'));

    const session = await this.reconciler.startReconciliation(options);
    
    if (session.changes.length === 0) {
      console.log(chalk.yellow('ℹ️  No changes detected since last reconciliation'));
      return;
    }

    // Handle delegation mode
    if (options.delegate) {
      const delegationOutput = await this.reconciler.processReconciliation(session, false, true) as DelegationOutput;
      
      if (delegationOutput.reconciliations.length === 0) {
        console.log(chalk.yellow('ℹ️  No reconciliation requests needed'));
        return;
      }

      await this.outputDelegationRequests(delegationOutput, options.delegateFormat || 'structured');
      return;
    }

    // Handle dry-run mode
    if (options.mode === 'dry-run') {
      console.log(chalk.cyan('\n🔍 Dry run - changes that would be made:'));
      // Process for analysis but don't apply
      await this.reconciler.processReconciliation(session, false);
      session.results.forEach(result => {
        const status = result.classification === 'safe' ? '✅' : '⚠️';
        console.log(`  ${status} ${result.metadata.targetFile}: ${result.reasoning}`);
      });
      return;
    }

    await this.reconciler.processReconciliation(session, options.autoApply !== false);

    console.log(chalk.green('\n✅ Reconciliation completed!'));
    
    if (session.mode === 'in_place') {
      console.log(chalk.cyan(`📋 Changes applied to current branch: ${session.sourceBranch}`));
    } else {
      console.log(chalk.cyan(`📋 Reconciliation branch: ${session.reconciliationBranch}`));
    }
    
    if (session.reviewed > 0) {
      console.log(chalk.yellow(`⚠️  ${session.reviewed} changes need manual review`));
      if (session.mode === 'branch') {
        console.log(chalk.cyan('💡 Create a PR to review and merge reconciliation changes:'));
        console.log(chalk.gray(`   git push origin ${session.reconciliationBranch}`));
        console.log(chalk.gray(`   gh pr create --base ${session.sourceBranch} --title "Dependency reconciliation"`));
      } else {
        console.log(chalk.cyan('💡 Review and commit the changes when ready:'));
        console.log(chalk.gray(`   git add .`));
        console.log(chalk.gray(`   git commit -m "Reconcile dependencies"`));
      }
    } else {
      console.log(chalk.green('✅ All changes were auto-applied'));
      if (session.mode === 'branch') {
        console.log(chalk.cyan('💡 You can now merge the reconciliation branch:'));
        console.log(chalk.gray(`   git checkout ${session.sourceBranch}`));
        console.log(chalk.gray(`   git merge ${session.reconciliationBranch}`));
      } else {
        console.log(chalk.cyan('💡 Commit the changes when ready:'));
        console.log(chalk.gray(`   git add .`));
        console.log(chalk.gray(`   git commit -m "Reconcile dependencies"`));
      }
    }
  }

  /**
   * Output delegation requests in the specified format
   */
  private async outputDelegationRequests(
    delegationOutput: DelegationOutput, 
    format: 'structured' | 'commands' | 'interactive'
  ): Promise<void> {
    console.log(chalk.blue(`🤖 Generated ${delegationOutput.reconciliations.length} reconciliation requests`));
    console.log(chalk.cyan(`📊 Summary: ${delegationOutput.summary.highConfidence} high-confidence, ${delegationOutput.summary.requiresReview} need review`));

    switch (format) {
      case 'structured':
        await this.outputStructuredJSON(delegationOutput);
        break;
      case 'commands':
        await this.outputCommands(delegationOutput);
        break;
      case 'interactive':
        await this.outputInteractive(delegationOutput);
        break;
      default:
        throw new Error(`Unknown delegation format: ${format}`);
    }
  }

  /**
   * Output structured JSON for Claude Code processing
   */
  private async outputStructuredJSON(delegationOutput: DelegationOutput): Promise<void> {
    console.log(chalk.gray('\n--- DELEGATION REQUESTS (JSON) ---'));
    console.log(JSON.stringify({
      type: 'knit_delegation',
      timestamp: new Date().toISOString(),
      ...delegationOutput
    }, null, 2));
    console.log(chalk.gray('--- END DELEGATION REQUESTS ---\n'));
    
    console.log(chalk.cyan('💡 Claude Code Integration:'));
    console.log('1. Copy the JSON above');
    console.log('2. In Claude Code, use: "Process these knit reconciliation requests"');
    console.log('3. Paste the JSON to have Claude Code handle the reconciliation');
  }

  /**
   * Output as executable commands
   */
  private async outputCommands(delegationOutput: DelegationOutput): Promise<void> {
    console.log(chalk.gray('\n--- RECONCILIATION COMMANDS ---'));
    
    delegationOutput.reconciliations.forEach((request, index) => {
      console.log(`# Request ${index + 1}: ${request.sourceFile} → ${request.targetFile}`);
      console.log(`# Relationship: ${request.relationship} (confidence: ${(request.confidence * 100).toFixed(0)}%)`);
      console.log(`# ${request.prompt.split('\n')[0]}`);
      console.log(`claude-code edit "${request.targetFile}" --context "${request.sourceFile}" --changes "${request.changes.replace(/"/g, '\\"')}"`);
      console.log('');
    });
    
    console.log(chalk.gray('--- END COMMANDS ---\n'));
    
    console.log(chalk.cyan('💡 Usage:'));
    console.log('1. Copy and execute commands above');
    console.log('2. Or pipe to Claude Code: knit reconcile --delegate --format commands | claude-code batch');
  }

  /**
   * Output interactive prompts
   */
  private async outputInteractive(delegationOutput: DelegationOutput): Promise<void> {
    console.log(chalk.cyan('\n🤖 Interactive Reconciliation Mode\n'));
    
    for (const [index, request] of delegationOutput.reconciliations.entries()) {
      const confidenceColor = request.confidence >= 0.8 ? chalk.green : 
                             request.confidence >= 0.6 ? chalk.yellow : chalk.red;
      
      console.log(chalk.bold(`Request ${index + 1}/${delegationOutput.reconciliations.length}:`));
      console.log(`Source: ${chalk.blue(request.sourceFile)}`);
      console.log(`Target: ${chalk.blue(request.targetFile)}`);
      console.log(`Relationship: ${request.relationship}`);
      console.log(`Confidence: ${confidenceColor((request.confidence * 100).toFixed(0) + '%')}`);
      console.log('');
      console.log(chalk.bold('Changes needed:'));
      console.log(request.prompt);
      console.log('');
      console.log(chalk.bold('File content preview:'));
      console.log(chalk.gray(request.context.fileContent?.slice(0, 200) + '...'));
      console.log('');
      console.log(chalk.cyan('--- Ready for Claude Code processing ---'));
      console.log('');
    }
    
    console.log(chalk.green(`✅ ${delegationOutput.reconciliations.length} reconciliation requests prepared`));
    console.log(chalk.cyan('💡 Copy the prompts above and process them with Claude Code'));
  }

  /**
   * Show current status
   */
  async showStatus(detailed = false): Promise<void> {
    await this.loadConfig();
    await this.depGraph.load();

    const gitStatus = this.gitManager.getGitStatus();
    const sessions = await this.reconciler.getAllSessions();
    const dependencies = this.depGraph.getAllDependencies();

    console.log(chalk.bold('\n📊 Knit Status\n'));

    // Git status
    console.log(chalk.blue('Git Status:'));
    console.log(`  Current branch: ${gitStatus.currentBranch}`);
    console.log(`  Uncommitted changes: ${gitStatus.hasUncommittedChanges ? 'Yes' : 'No'}`);
    console.log(`  Last commit: ${gitStatus.lastCommitHash.slice(0, 8)}`);

    // Dependency graph status
    console.log(chalk.blue('\nDependency Graph:'));
    console.log(`  Tracked files: ${Object.keys(dependencies).length}`);
    console.log(`  Total relationships: ${Object.values(dependencies).reduce((sum, dep) => sum + dep.watches.length, 0)}`);

    // Check for cycles
    const cycles = this.depGraph.hasCycles();
    if (cycles.length > 0) {
      console.log(chalk.red(`  ⚠️  Dependency cycles detected: ${cycles.length}`));
      if (detailed) {
        cycles.forEach(cycle => console.log(chalk.yellow(`    ${cycle}`)));
      }
    }

    // Recent sessions
    console.log(chalk.blue('\nRecent Reconciliations:'));
    if (sessions.length === 0) {
      console.log('  No reconciliation sessions found');
    } else {
      sessions.slice(0, 5).forEach(session => {
        const status = session.status === 'completed' ? '✅' : '🔄';
        console.log(`  ${status} ${session.started.toLocaleDateString()} - ${session.id}`);
        if (detailed) {
          console.log(`      Auto-applied: ${session.autoApplied}, Reviewed: ${session.reviewed}`);
        }
      });
    }

    // Reconciliation branches
    const reconciliationBranches = this.gitManager.getReconciliationBranches();
    if (reconciliationBranches.length > 0) {
      console.log(chalk.blue('\nActive Reconciliation Branches:'));
      reconciliationBranches.forEach(branch => {
        console.log(`  📋 ${branch}`);
      });
    }
  }

  /**
   * Show dependency graph
   */
  async showGraph(format = 'text'): Promise<void> {
    await this.depGraph.load();

    if (format === 'json') {
      const dependencies = this.depGraph.getAllDependencies();
      console.log(JSON.stringify(dependencies, null, 2));
    } else {
      const visualization = this.depGraph.visualize();
      console.log(visualization);
    }
  }

  /**
   * Merge reconciliation branch
   */
  async mergeReconciliation(branchName?: string, deleteBranch = true): Promise<void> {
    const gitStatus = this.gitManager.getGitStatus();
    
    if (!branchName) {
      // Find current reconciliation branch
      const reconciliationBranches = this.gitManager.getReconciliationBranches();
      if (reconciliationBranches.length === 0) {
        throw new Error('No reconciliation branches found');
      }
      if (reconciliationBranches.length > 1) {
        throw new Error('Multiple reconciliation branches found. Please specify which one to merge.');
      }
      branchName = reconciliationBranches[0];
    }

    // Switch to source branch
    const sourceBranch = gitStatus.currentBranch.startsWith('knit/reconcile-') 
      ? 'main' // Default fallback
      : gitStatus.currentBranch;

    this.gitManager.switchToBranch(sourceBranch);

    // Merge reconciliation branch
    this.gitManager.merge(branchName, `Merge reconciliation from ${branchName}`);

    console.log(chalk.green(`✅ Merged ${branchName} into ${sourceBranch}`));

    // Delete reconciliation branch if requested
    if (deleteBranch) {
      this.gitManager.deleteBranch(branchName);
      console.log(chalk.green(`✅ Deleted reconciliation branch ${branchName}`));
    }
  }

  /**
   * Clean up old reconciliation branches
   */
  async cleanup(keepCount = 5, force = false): Promise<number> {
    return this.gitManager.cleanupReconciliationBranches(keepCount);
  }

  /**
   * Show reconciliation history
   */
  async showHistory(limit = 10): Promise<void> {
    const sessions = await this.reconciler.getAllSessions();

    console.log(chalk.bold('\n📚 Reconciliation History\n'));

    if (sessions.length === 0) {
      console.log('No reconciliation sessions found');
      return;
    }

    sessions.slice(0, limit).forEach((session, index) => {
      const status = session.status === 'completed' ? '✅' : session.status === 'failed' ? '❌' : '🔄';
      console.log(`${status} ${session.started.toLocaleDateString()} ${session.started.toLocaleTimeString()}`);
      console.log(`   Session: ${session.id}`);
      console.log(`   Branch: ${session.sourceBranch} → ${session.reconciliationBranch}`);
      console.log(`   Changes: ${session.changes.length} files, ${session.autoApplied} auto-applied, ${session.reviewed} reviewed`);
      
      if (index < sessions.length - 1) {
        console.log('');
      }
    });
  }

  /**
   * Analyze file for dependency link suggestions
   */
  async analyzeLinks(filePath?: string, options: {
    threshold?: number;
    autoAdd?: boolean;
    projectSetup?: boolean;
  } = {}): Promise<void> {
    await this.loadConfig();
    await this.depGraph.load();

    const threshold = options.threshold || 0.7;
    const autoAddThreshold = 0.85;

    console.log(chalk.blue('🔍 Analyzing dependency relationships...'));

    if (options.projectSetup) {
      // Full project analysis
      const result = await this.linkAnalyzer.analyzeProject(threshold, autoAddThreshold);
      
      console.log(chalk.green(`\n✅ Project analysis completed!`));
      console.log(`📊 Found ${result.suggestions.length} total suggestions`);
      console.log(`🚀 Auto-added ${result.autoAdded.length} high-confidence links`);
      
      const manualReview = result.suggestions.filter(s => s.confidence < autoAddThreshold);
      if (manualReview.length > 0) {
        console.log(chalk.yellow(`\n📋 ${manualReview.length} suggestions need manual review:`));
        this.displayLinkSuggestions(manualReview.slice(0, 10));
      }
      
    } else if (filePath) {
      // Single file analysis
      const suggestions = await this.linkAnalyzer.analyzeFile(filePath, threshold);
      
      if (suggestions.length === 0) {
        console.log(chalk.yellow(`ℹ️  No dependency suggestions found for ${filePath}`));
        return;
      }
      
      console.log(chalk.green(`\n📋 Found ${suggestions.length} dependency suggestions for ${filePath}:`));
      this.displayLinkSuggestions(suggestions);
      
      if (options.autoAdd) {
        const highConfidence = suggestions.filter(s => s.confidence >= autoAddThreshold);
        for (const suggestion of highConfidence) {
          try {
            await this.addDependency(suggestion.sourceFile, suggestion.targetFile);
            console.log(chalk.green(`✅ Added: ${suggestion.sourceFile} → ${suggestion.targetFile}`));
          } catch (error) {
            console.warn(chalk.yellow(`Warning: Could not add dependency: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        }
      }
      
    } else {
      console.log(chalk.red('❌ Please specify a file path or use --project-setup'));
      return;
    }
  }

  /**
   * Set up knit with intelligent initial links for new projects
   */
  async setupProject(): Promise<void> {
    console.log(chalk.blue('🚀 Setting up knit with intelligent project analysis...'));
    
    await this.initialize();
    await this.analyzeLinks(undefined, { projectSetup: true, autoAdd: true });
    
    console.log(chalk.green('\n✅ Knit project setup completed!'));
    console.log(chalk.cyan('💡 Use "knit status" to review dependency relationships'));
    console.log(chalk.cyan('💡 Use "knit reconcile" to start dependency reconciliation'));
  }

  /**
   * Display link suggestions in a formatted way
   */
  private displayLinkSuggestions(suggestions: LinkSuggestion[]): void {
    suggestions.forEach((suggestion, index) => {
      const confidenceColor = suggestion.confidence >= 0.8 ? chalk.green : 
                             suggestion.confidence >= 0.6 ? chalk.yellow : chalk.red;
      const confidenceText = confidenceColor(`${(suggestion.confidence * 100).toFixed(0)}%`);
      
      console.log(`\n${index + 1}. ${suggestion.sourceFile} → ${suggestion.targetFile}`);
      console.log(`   Confidence: ${confidenceText} | Relationship: ${suggestion.relationship}`);
      console.log(`   Reasoning: ${suggestion.reasoning}`);
      
      if (suggestion.evidence.sharedTerms.length > 0) {
        console.log(`   Shared terms: ${suggestion.evidence.sharedTerms.slice(0, 5).join(', ')}`);
      }
      
      if (suggestion.evidence.explicitReferences.length > 0) {
        console.log(`   References found: ${suggestion.evidence.explicitReferences.length}`);
      }
    });
  }

  /**
   * Manage configuration
   */
  async manageConfig(options: any): Promise<void> {
    await this.loadConfig();

    if (options.list) {
      console.log(chalk.bold('\n⚙️  Knit Configuration\n'));
      console.log(JSON.stringify(this.config, null, 2));
    } else if (options.get) {
      const value = this.getConfigValue(options.get);
      console.log(value !== undefined ? value : 'Configuration key not found');
    } else if (options.set) {
      const [key, value] = options.set.split('=');
      await this.setConfigValue(key, value);
      console.log(chalk.green(`✅ Set ${key} = ${value}`));
    } else {
      console.log('Use --list, --get <key>, or --set <key=value>');
    }
  }

  private async loadConfig(): Promise<void> {
    const configFile = path.join(this.projectRoot, '.knit', 'config.json');
    try {
      const content = await fs.readFile(configFile, 'utf-8');
      this.config = { ...this.getDefaultConfig(), ...JSON.parse(content) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Use default config if file doesn't exist
    }
  }

  private async saveConfig(): Promise<void> {
    const configFile = path.join(this.projectRoot, '.knit', 'config.json');
    await fs.writeFile(configFile, JSON.stringify(this.config, null, 2));
  }

  private getDefaultConfig(): KnitConfig {
    return {
      autoApplyThreshold: 0.8,
      llm: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: process.env.OPENAI_API_KEY
      },
      git: {
        autoReconcile: false,
        branchPrefix: 'knit/reconcile',
        parentBranch: 'auto-detect',
        allowMainBranch: false
      },
      workflow: {
        mode: 'in-place',
        createBranch: false,
        autoApply: true,
        safeOnly: false
      },
      reconciliation: {
        includeUncommitted: true,
        includeStagedOnly: false
      },
      delegation: {
        enabled: true,
        defaultMode: 'structured',
        contextLevel: 'full'
      },
      linkAnalysis: {
        autoAnalyzeNewFiles: true,
        confidenceThreshold: 0.75,
        autoAddThreshold: 0.85,
        patterns: 'default',
        watchForChanges: true
      },
      claudeIntegration: {
        enabled: true,
        commands: ['/knit-reconcile', '/knit-analyze', '/knit-setup'],
        autoTrigger: {
          onFileCreate: true,
          onSignificantChange: true,
          significantChangeThreshold: 0.3
        }
      },
      ignore: [
        '.git/**',
        'node_modules/**',
        '.knit/**',
        '*.log',
        'dist/**',
        'build/**'
      ],
      rules: {}
    };
  }

  private getConfigValue(key: string): any {
    const keys = key.split('.');
    let value: any = this.config;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  }

  private async setConfigValue(key: string, value: string): Promise<void> {
    const keys = key.split('.');
    let obj: any = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    
    // Try to parse value as JSON, fallback to string
    try {
      obj[keys[keys.length - 1]] = JSON.parse(value);
    } catch {
      obj[keys[keys.length - 1]] = value;
    }
    
    await this.saveConfig();
  }
}