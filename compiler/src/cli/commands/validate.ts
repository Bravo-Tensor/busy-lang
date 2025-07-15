/**
 * Validate Command Implementation
 * Main validation command for BUSY compiler
 */

import { Scanner } from '@/core/scanner';
import { Parser } from '@/core/parser';
import { ASTBuilder } from '@/ast/builder';
import { loadConfig } from '@/config/loader';
import { ConsoleReporter } from '../reporters/console';
import { JsonReporter } from '../reporters/json';
import { HtmlReporter } from '../reporters/html';
import type { ValidateOptions, OutputFormat } from '@/config/types';
import type { CompilationResult } from '../types';
import chalk from 'chalk';

/**
 * Validate command class
 */
export class ValidateCommand {
  
  /**
   * Execute validation command
   */
  async execute(path: string, options: ValidateOptions): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Load configuration
      const config = await loadConfig(options.config);
      
      // Apply CLI option overrides
      if (options.verbose) config.verbose = true;
      if (options.maxErrors) config.maxErrors = parseInt(options.maxErrors.toString(), 10);
      if (options.strict) config.warningsAsErrors = true;
      if (options.noCache) config.cacheEnabled = false;
      
      // Apply rule filters
      if (options.only) {
        const onlyRules = options.only.toString().split(',');
        this.applyRuleFilter(config, onlyRules, 'only');
      }
      if (options.exclude) {
        const excludeRules = options.exclude.toString().split(',');
        this.applyRuleFilter(config, excludeRules, 'exclude');
      }
      
      if (config.verbose) {
        console.log(chalk.blue('🔍 Starting BUSY validation...'));
        console.log(chalk.gray(`Target: ${path}`));
        console.log(chalk.gray(`Config: ${options.config || 'default'}`));
      }
      
      // Phase 1: Scan files
      if (config.verbose) console.log(chalk.blue('📁 Scanning repository...'));
      const scanner = new Scanner(config);
      const scanResult = await scanner.scan(path);
      
      if (config.verbose) {
        console.log(chalk.gray(`Found ${scanResult.stats.totalFiles} files`));
        console.log(chalk.gray(`Teams: L0(${scanResult.stats.teamsL0}) L1(${scanResult.stats.teamsL1}) L2(${scanResult.stats.teamsL2})`));
      }
      
      // Phase 2: Parse files
      if (config.verbose) console.log(chalk.blue('📝 Parsing YAML files...'));
      const parser = new Parser(config);
      const parseResult = await parser.parse(scanResult);
      
      if (config.verbose) {
        console.log(chalk.gray(`Parsed ${parseResult.stats.successfullyParsed}/${parseResult.stats.totalFiles} files`));
        if (parseResult.parseErrors.length > 0) {
          console.log(chalk.yellow(`${parseResult.parseErrors.length} parse errors`));
        }
      }
      
      // Phase 3: Build AST
      if (config.verbose) console.log(chalk.blue('🌲 Building AST...'));
      const astBuilder = new ASTBuilder();
      const buildResult = await astBuilder.build(parseResult);
      
      if (config.verbose) {
        console.log(chalk.gray(`Created ${buildResult.stats.nodesCreated} AST nodes`));
        console.log(chalk.gray(`Symbols: ${buildResult.stats.symbolsCreated}, Dependencies: ${buildResult.stats.dependenciesCreated}`));
      }
      
      // Phase 4: Analysis (TODO: Implement analysis rules)
      if (config.verbose) console.log(chalk.blue('🔍 Running analysis...'));
      
      // Create compilation result
      const result: CompilationResult = {
        scanResult,
        parseResult,
        buildResult,
        analysisResults: [], // TODO: Add analysis results
        summary: {
          totalFiles: scanResult.stats.totalFiles,
          successfullyParsed: parseResult.stats.successfullyParsed,
          errors: parseResult.parseErrors.length + buildResult.errors.length,
          warnings: buildResult.warnings.length,
          info: 0,
          duration: Date.now() - startTime,
          success: parseResult.parseErrors.length === 0 && buildResult.errors.length === 0
        }
      };
      
      // Generate report
      const reporter = this.createReporter(options.format || config.outputFormat);
      await reporter.generate(result, options.output);
      
      // Exit with appropriate code
      const hasErrors = result.summary.errors > 0;
      const hasWarnings = result.summary.warnings > 0;
      
      if (hasErrors || (config.warningsAsErrors && hasWarnings)) {
        if (!options.allowErrors) {
          process.exit(1);
        }
      }
      
    } catch (error) {
      console.error(chalk.red('Validation failed:'), (error as Error).message);
      if (options.verbose) {
        console.error(chalk.gray((error as Error).stack));
      }
      process.exit(1);
    }
  }
  
  /**
   * Apply rule filtering
   */
  private applyRuleFilter(config: any, rules: string[], type: 'only' | 'exclude'): void {
    const allRuleKeys = Object.keys(config.rules);
    
    if (type === 'only') {
      // Disable all rules first, then enable only specified ones
      for (const key of allRuleKeys) {
        config.rules[key] = 'off';
      }
      for (const rule of rules) {
        if (allRuleKeys.includes(rule)) {
          config.rules[rule] = 'error'; // Default to error level
        }
      }
    } else if (type === 'exclude') {
      // Disable specified rules
      for (const rule of rules) {
        if (allRuleKeys.includes(rule)) {
          config.rules[rule] = 'off';
        }
      }
    }
  }
  
  /**
   * Create appropriate reporter based on format
   */
  private createReporter(format: OutputFormat) {
    switch (format) {
      case 'json':
        return new JsonReporter();
      case 'html':
        return new HtmlReporter();
      case 'console':
      default:
        return new ConsoleReporter();
    }
  }
}