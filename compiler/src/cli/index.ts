#!/usr/bin/env node

/**
 * BUSY Compiler CLI Entry Point
 * Command-line interface for the BUSY language compiler
 */

// Register path mappings for compiled JS
import { register } from 'tsconfig-paths';
import * as path from 'path';

// Register the path mappings
register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: {
    '@/*': ['*'],
    '@/ast/*': ['ast/*'],
    '@/analysis/*': ['analysis/*'],
    '@/core/*': ['core/*'],
    '@/symbols/*': ['symbols/*'],
    '@/utils/*': ['utils/*']
  }
});

import { Command } from 'commander';
import { ValidateCommand } from './commands/validate';
import { AnalyzeCommand } from './commands/analyze';
import { WatchCommand } from './commands/watch';
import chalk from 'chalk';

const program = new Command();

program
  .name('busy-check')
  .description('BUSY Language compiler and static analyzer')
  .version('0.1.0');

// Global options
program
  .option('-v, --verbose', 'Enable verbose output')
  .option('-c, --config <path>', 'Configuration file path')
  .option('--no-color', 'Disable colored output');

// Validate command
program
  .command('validate')
  .description('Validate BUSY files for syntax and semantic correctness')
  .argument('[path]', 'Path to BUSY repository or file', '.')
  .option('-f, --format <type>', 'Output format (console, json, html)', 'console')
  .option('-o, --output <file>', 'Output file path')
  .option('--strict', 'Treat warnings as errors')
  .option('--allow-errors', 'Continue validation despite errors')
  .option('--max-errors <n>', 'Maximum errors before stopping', '100')
  .option('--no-cache', 'Disable compilation cache')
  .option('--only <rules>', 'Run only specified rules (comma-separated)')
  .option('--exclude <rules>', 'Exclude specified rules (comma-separated)')
  .action(async (path, options, command) => {
    try {
      const validateCommand = new ValidateCommand();
      await validateCommand.execute(path, {
        ...options,
        ...command.parent?.opts()
      });
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Analyze command variations
program
  .command('interfaces')
  .description('Analyze interface coherence only')
  .argument('[path]', 'Path to BUSY repository', '.')
  .option('-f, --format <type>', 'Output format', 'console')
  .option('-o, --output <file>', 'Output file path')
  .action(async (path, options, command) => {
    try {
      const analyzeCommand = new AnalyzeCommand();
      await analyzeCommand.execute(path, {
        ...options,
        ...command.parent?.opts(),
        only: ['interfaceCoherence']
      });
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('dependencies')
  .description('Analyze dependency resolution only')
  .argument('[path]', 'Path to BUSY repository', '.')
  .option('-f, --format <type>', 'Output format', 'console')
  .option('-o, --output <file>', 'Output file path')
  .action(async (path, options, command) => {
    try {
      const analyzeCommand = new AnalyzeCommand();
      await analyzeCommand.execute(path, {
        ...options,
        ...command.parent?.opts(),
        only: ['importValidation', 'inheritanceValidation']
      });
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('deadcode')
  .description('Analyze dead code detection only')
  .argument('[path]', 'Path to BUSY repository', '.')
  .option('-f, --format <type>', 'Output format', 'console')
  .option('-o, --output <file>', 'Output file path')
  .action(async (path, options, command) => {
    try {
      const analyzeCommand = new AnalyzeCommand();
      await analyzeCommand.execute(path, {
        ...options,
        ...command.parent?.opts(),
        only: ['deadCodeDetection']
      });
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('workflows')
  .description('Analyze workflow completeness only')
  .argument('[path]', 'Path to BUSY repository', '.')
  .option('-f, --format <type>', 'Output format', 'console')
  .option('-o, --output <file>', 'Output file path')
  .action(async (path, options, command) => {
    try {
      const analyzeCommand = new AnalyzeCommand();
      await analyzeCommand.execute(path, {
        ...options,
        ...command.parent?.opts(),
        only: ['workflowCompleteness']
      });
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Watch command
program
  .command('watch')
  .description('Watch for file changes and validate continuously')
  .argument('[path]', 'Path to BUSY repository', '.')
  .option('-f, --format <type>', 'Output format', 'console')
  .option('--debounce <ms>', 'Debounce delay in milliseconds', '500')
  .action(async (path, options, command) => {
    try {
      const watchCommand = new WatchCommand();
      await watchCommand.execute(path, {
        ...options,
        ...command.parent?.opts()
      });
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Global error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}