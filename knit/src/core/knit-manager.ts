import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { DependencyGraphManager } from './dependency-graph';
import { GitManager } from './git-integration';
import { HashTracker } from './hash-tracker';
import { GitReconciler } from '../reconciliation/git-reconciler';
import { KnitConfig, ReconciliationRules } from '../types';

export class KnitManager {
  private projectRoot: string;
  private depGraph: DependencyGraphManager;
  private gitManager: GitManager;
  private hashTracker: HashTracker;
  private config: KnitConfig;
  private reconciler: GitReconciler;

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
  async reconcile(options: {
    autoApply?: boolean;
    branchName?: string;
    sourceBranch?: string;
  } = {}): Promise<void> {
    await this.loadConfig();
    await this.depGraph.load();

    console.log(chalk.blue('🔄 Starting dependency reconciliation...'));

    const session = await this.reconciler.startReconciliation(options.sourceBranch);
    
    if (session.changes.length === 0) {
      console.log(chalk.yellow('ℹ️  No changes detected since last reconciliation'));
      return;
    }

    await this.reconciler.processReconciliation(session, options.autoApply !== false);

    console.log(chalk.green('\n✅ Reconciliation completed!'));
    console.log(chalk.cyan(`📋 Reconciliation branch: ${session.reconciliationBranch}`));
    
    if (session.reviewed > 0) {
      console.log(chalk.yellow(`⚠️  ${session.reviewed} changes need manual review`));
      console.log(chalk.cyan('💡 Create a PR to review and merge reconciliation changes:'));
      console.log(chalk.gray(`   git push origin ${session.reconciliationBranch}`));
      console.log(chalk.gray(`   gh pr create --base ${session.sourceBranch} --title "Dependency reconciliation"`));
    } else {
      console.log(chalk.green('🎉 All changes were auto-applied successfully'));
    }
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
        branchPrefix: 'knit/reconcile'
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