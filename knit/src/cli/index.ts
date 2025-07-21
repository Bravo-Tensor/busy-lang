#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { KnitManager } from '../core/knit-manager';

const program = new Command();

program
  .name('knit')
  .description('Bidirectional dependency reconciliation with git-integrated workflow')
  .version('0.1.0');

// Initialize knit in current directory
program
  .command('init')
  .description('Initialize knit dependency tracking in current directory')
  .action(async () => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.initialize();
      console.log(chalk.green('✅ Knit initialized successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize knit:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add dependency relationship
program
  .command('link <source> <target>')
  .description('Add dependency relationship: source file watches target file')
  .option('--auto-apply-threshold <threshold>', 'Auto-apply threshold for this relationship', parseFloat)
  .action(async (source: string, target: string, options) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.addDependency(source, target, {
        autoApplyThreshold: options.autoApplyThreshold
      });
      console.log(chalk.green(`✅ Added dependency: ${source} → ${target}`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to add dependency:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Remove dependency relationship
program
  .command('unlink <source> <target>')
  .description('Remove dependency relationship')
  .action(async (source: string, target: string) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.removeDependency(source, target);
      console.log(chalk.green(`✅ Removed dependency: ${source} → ${target}`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to remove dependency:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Start reconciliation process
program
  .command('reconcile')
  .description('Start dependency reconciliation process')
  .option('--mode <type>', 'Reconcile mode: in-place (default), branch, dry-run', 'in-place')
  .option('--auto-apply', 'Apply safe changes automatically', true)
  .option('--no-auto-apply', 'Disable automatic application of changes')
  .option('--safe-only', 'Only auto-apply SAFE_AUTO_APPLY changes', false)
  .option('--interactive', 'Prompt for each change', false)
  .option('--staged-only', 'Only reconcile staged changes', false)
  .option('--base-branch <name>', 'Compare against specific branch (default: auto-detect)')
  .option('--create-branch', 'Create reconciliation branch (legacy mode)', false)
  .option('--dry-run', 'Show what would change without applying', false)
  .option('--delegate', 'Delegate reconciliation to Claude Code instead of using internal LLM', false)
  .option('--delegate-format <format>', 'Delegation output format: structured (default), commands, interactive', 'structured')
  .action(async (options) => {
    try {
      const knit = new KnitManager(process.cwd());
      
      // Convert CLI options to ReconcileOptions format
      const reconcileOptions = {
        mode: options.dryRun ? 'dry-run' as const : options.mode as 'in-place' | 'branch',
        autoApply: options.autoApply,
        safeOnly: options.safeOnly,
        interactive: options.interactive,
        stagedOnly: options.stagedOnly,
        baseBranch: options.baseBranch,
        createBranch: options.createBranch,
        delegate: options.delegate,
        delegateFormat: options.delegateFormat as 'structured' | 'commands' | 'interactive'
      };
      
      await knit.reconcile(reconcileOptions);
    } catch (error) {
      console.error(chalk.red('❌ Reconciliation failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Show status of reconciliation and dependencies
program
  .command('status')
  .description('Show current reconciliation status and dependency graph')
  .option('--detailed', 'Show detailed information')
  .action(async (options) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.showStatus(options.detailed);
    } catch (error) {
      console.error(chalk.red('❌ Failed to show status:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Show dependency graph visualization
program
  .command('graph')
  .description('Visualize dependency relationships')
  .option('--format <format>', 'Output format (text|json)', 'text')
  .action(async (options) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.showGraph(options.format);
    } catch (error) {
      console.error(chalk.red('❌ Failed to show graph:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Merge reconciliation branch back to source
program
  .command('merge [branch]')
  .description('Merge reconciliation branch back to source branch')
  .option('--delete-branch', 'Delete reconciliation branch after merge', true)
  .action(async (branch: string | undefined, options) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.mergeReconciliation(branch, options.deleteBranch);
    } catch (error) {
      console.error(chalk.red('❌ Failed to merge:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Clean up old reconciliation branches
program
  .command('cleanup')
  .description('Clean up old reconciliation branches')
  .option('--keep <count>', 'Number of recent branches to keep', '5')
  .option('--force', 'Force delete branches even if not merged')
  .action(async (options) => {
    try {
      const knit = new KnitManager(process.cwd());
      const deleted = await knit.cleanup(parseInt(options.keep), options.force);
      console.log(chalk.green(`✅ Cleaned up ${deleted} old reconciliation branches`));
    } catch (error) {
      console.error(chalk.red('❌ Cleanup failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Show reconciliation history
program
  .command('history')
  .description('Show reconciliation session history')
  .option('--limit <count>', 'Number of sessions to show', '10')
  .action(async (options) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.showHistory(parseInt(options.limit));
    } catch (error) {
      console.error(chalk.red('❌ Failed to show history:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Analyze dependency links
program
  .command('analyze-links [file]')
  .description('Analyze file or project for dependency link suggestions')
  .option('--threshold <number>', 'Confidence threshold for suggestions (0-1)', parseFloat)
  .option('--auto-add', 'Automatically add high-confidence suggestions', false)
  .option('--project-setup', 'Analyze entire project for initial setup', false)
  .action(async (file: string | undefined, options) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.analyzeLinks(file, {
        threshold: options.threshold,
        autoAdd: options.autoAdd,
        projectSetup: options.projectSetup
      });
    } catch (error) {
      console.error(chalk.red('❌ Link analysis failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Setup project with intelligent analysis
program
  .command('setup')
  .description('Initialize knit with intelligent project analysis and link suggestions')
  .action(async () => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.setupProject();
    } catch (error) {
      console.error(chalk.red('❌ Project setup failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Configuration management
program
  .command('config')
  .description('Manage knit configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--get <key>', 'Get configuration value')
  .option('--list', 'List all configuration')
  .action(async (options) => {
    try {
      const knit = new KnitManager(process.cwd());
      await knit.manageConfig(options);
    } catch (error) {
      console.error(chalk.red('❌ Config operation failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Error handling for unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Unknown command. Use --help for available commands.'));
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}