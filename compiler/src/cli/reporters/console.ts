/**
 * Console Reporter
 * Human-readable console output for validation results
 */

import type { Reporter, CompilationResult, Issue } from '../types';
import chalk from 'chalk';

/**
 * Console reporter class
 */
export class ConsoleReporter implements Reporter {
  
  /**
   * Generate console report
   */
  async generate(result: CompilationResult): Promise<void> {
    this.printHeader(result);
    this.printScanResults(result);
    this.printParseResults(result);
    this.printBuildResults(result);
    this.printAnalysisResults(result);
    this.printSummary(result);
  }
  
  /**
   * Print report header
   */
  private printHeader(result: CompilationResult): void {
    console.log(chalk.bold.blue('\\n🔍 BUSY Validation Report'));
    console.log(chalk.gray('='.repeat(50)));
  }
  
  /**
   * Print scan phase results
   */
  private printScanResults(result: CompilationResult): void {
    const scan = result.scanResult;
    
    console.log(chalk.bold('\\n📁 File Discovery'));
    console.log(`   Files found: ${chalk.cyan(scan.stats.totalFiles)}`);
    console.log(`   Teams: ${chalk.cyan(scan.groups.length)} (L0: ${chalk.cyan(scan.stats.teamsL0)}, L1: ${chalk.cyan(scan.stats.teamsL1)}, L2: ${chalk.cyan(scan.stats.teamsL2)})`);
    console.log(`   Roles: ${chalk.cyan(scan.stats.roleFiles)}, Playbooks: ${chalk.cyan(scan.stats.playbookFiles)}, Teams: ${chalk.cyan(scan.stats.teamFiles)}`);
    
    if (scan.stats.invalidFiles > 0) {
      console.log(`   ${chalk.yellow('⚠️')} Invalid files: ${chalk.yellow(scan.stats.invalidFiles)}`);
    }
    
    // Show structure validation issues
    if (!scan.structureValidation.isValid) {
      console.log(chalk.yellow('\\n   Structure Issues:'));
      for (const error of scan.structureValidation.errors) {
        console.log(`   ${chalk.red('❌')} ${error}`);
      }
      for (const warning of scan.structureValidation.warnings) {
        console.log(`   ${chalk.yellow('⚠️')} ${warning}`);
      }
    }
  }
  
  /**
   * Print parse phase results
   */
  private printParseResults(result: CompilationResult): void {
    const parse = result.parseResult;
    
    console.log(chalk.bold('\\n📝 YAML Parsing'));
    console.log(`   Successfully parsed: ${chalk.green(parse.stats.successfullyParsed)}/${parse.stats.totalFiles}`);
    
    if (parse.parseErrors.length > 0) {
      console.log(`   ${chalk.red('❌')} Parse errors: ${chalk.red(parse.parseErrors.length)}`);
      
      // Show first few parse errors
      const maxErrors = 5;
      for (let i = 0; i < Math.min(parse.parseErrors.length, maxErrors); i++) {
        const error = parse.parseErrors[i];
        const location = error.line ? `:${error.line}${error.column ? `:${error.column}` : ''}` : '';
        console.log(`   ${chalk.red('❌')} ${error.filePath}${location}`);
        console.log(`       ${error.error.message}`);
      }
      
      if (parse.parseErrors.length > maxErrors) {
        console.log(`   ${chalk.gray(`... and ${parse.parseErrors.length - maxErrors} more errors`)}`);
      }
    }
    
    // Show validation errors
    const validationErrors = parse.validationResults.filter(r => !r.isValid);
    if (validationErrors.length > 0) {
      console.log(`   ${chalk.red('❌')} Schema validation errors: ${chalk.red(validationErrors.length)}`);
      
      for (const validation of validationErrors.slice(0, 3)) {
        console.log(`   ${chalk.red('❌')} ${validation.filePath}`);
        for (const error of validation.errors.slice(0, 2)) {
          console.log(`       ${error}`);
        }
      }
    }
  }
  
  /**
   * Print AST build results
   */
  private printBuildResults(result: CompilationResult): void {
    const build = result.buildResult;
    
    console.log(chalk.bold('\\n🌲 AST Construction'));
    console.log(`   AST nodes: ${chalk.cyan(build.stats.nodesCreated)}`);
    console.log(`   Symbols: ${chalk.cyan(build.stats.symbolsCreated)}`);
    console.log(`   Dependencies: ${chalk.cyan(build.stats.dependenciesCreated)}`);
    
    if (build.errors.length > 0) {
      console.log(`   ${chalk.red('❌')} Build errors: ${chalk.red(build.errors.length)}`);
      for (const error of build.errors.slice(0, 3)) {
        console.log(`   ${chalk.red('❌')} ${error.message}`);
        if (error.file) {
          console.log(`       File: ${error.file}`);
        }
      }
    }
    
    if (build.warnings.length > 0) {
      console.log(`   ${chalk.yellow('⚠️')} Build warnings: ${chalk.yellow(build.warnings.length)}`);
      for (const warning of build.warnings.slice(0, 3)) {
        console.log(`   ${chalk.yellow('⚠️')} ${warning.message}`);
      }
    }
  }
  
  /**
   * Print analysis results
   */
  private printAnalysisResults(result: CompilationResult): void {
    if (result.analysisResults.length === 0) {
      return;
    }
    
    console.log(chalk.bold('\\n🔍 Static Analysis'));
    
    const allIssues: Issue[] = [];
    for (const analysis of result.analysisResults) {
      allIssues.push(...analysis.issues);
    }
    
    // Group issues by severity
    const errors = allIssues.filter(i => i.severity === 'error');
    const warnings = allIssues.filter(i => i.severity === 'warning');
    const info = allIssues.filter(i => i.severity === 'info');
    
    if (errors.length > 0) {
      console.log(`   ${chalk.red('❌')} Errors: ${chalk.red(errors.length)}`);
      this.printIssues(errors.slice(0, 5), 'error');
    }
    
    if (warnings.length > 0) {
      console.log(`   ${chalk.yellow('⚠️')} Warnings: ${chalk.yellow(warnings.length)}`);
      this.printIssues(warnings.slice(0, 3), 'warning');
    }
    
    if (info.length > 0) {
      console.log(`   ${chalk.blue('ℹ️')} Info: ${chalk.blue(info.length)}`);
      this.printIssues(info.slice(0, 2), 'info');
    }
  }
  
  /**
   * Print issues with consistent formatting
   */
  private printIssues(issues: Issue[], severity: string): void {
    const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    const color = severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : 'blue';
    
    for (const issue of issues) {
      const location = issue.line ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}` : '';
      console.log(`   ${chalk[color](icon)} ${issue.code}: ${issue.message}`);
      console.log(`       ${chalk.gray(`${issue.file}${location}`)}`);
      
      if (issue.suggestion) {
        console.log(`       ${chalk.gray('💡 Suggestion:')} ${issue.suggestion}`);
      }
    }
  }
  
  /**
   * Print summary
   */
  private printSummary(result: CompilationResult): void {
    const summary = result.summary;
    
    console.log(chalk.bold('\\n📊 Summary'));
    console.log('─'.repeat(30));
    
    // Overall status
    if (summary.success) {
      console.log(`${chalk.green('✅ Validation passed')}`);
    } else {
      console.log(`${chalk.red('❌ Validation failed')}`);
    }
    
    // Statistics
    console.log(`Files processed: ${chalk.cyan(summary.totalFiles)}`);
    console.log(`Successfully parsed: ${chalk.cyan(summary.successfullyParsed)}`);
    
    if (summary.errors > 0) {
      console.log(`Errors: ${chalk.red(summary.errors)}`);
    }
    if (summary.warnings > 0) {
      console.log(`Warnings: ${chalk.yellow(summary.warnings)}`);
    }
    if (summary.info > 0) {
      console.log(`Info: ${chalk.blue(summary.info)}`);
    }
    
    console.log(`Duration: ${chalk.gray(summary.duration + 'ms')}`);
    console.log('');
  }
}