/**
 * JSON Reporter
 * Machine-readable JSON output for validation results
 */

import type { Reporter, CompilationResult } from '../types';
import { writeFile } from 'fs/promises';

/**
 * JSON reporter class
 */
export class JsonReporter implements Reporter {
  
  /**
   * Generate JSON report
   */
  async generate(result: CompilationResult, outputPath?: string): Promise<void> {
    const report = this.buildJsonReport(result);
    const json = JSON.stringify(report, null, 2);
    
    if (outputPath) {
      await writeFile(outputPath, json, 'utf8');
      console.log(`Report written to: ${outputPath}`);
    } else {
      console.log(json);
    }
  }
  
  /**
   * Build structured JSON report
   */
  private buildJsonReport(result: CompilationResult): any {
    return {
      summary: result.summary,
      scan: {
        stats: result.scanResult.stats,
        structureValidation: result.scanResult.structureValidation,
        groups: result.scanResult.groups.map(group => ({
          org: group.org,
          layer: group.layer,
          team: group.team,
          fileCount: {
            team: group.teamFile ? 1 : 0,
            roles: group.roles.length,
            playbooks: group.playbooks.length,
            invalid: group.invalidFiles.length
          }
        }))
      },
      parse: {
        stats: result.parseResult.stats,
        errors: result.parseResult.parseErrors.map(error => ({
          file: error.filePath,
          message: error.error.message,
          line: error.line,
          column: error.column
        })),
        validationErrors: result.parseResult.validationResults
          .filter(r => !r.isValid)
          .map(r => ({
            file: r.filePath,
            errors: r.errors,
            warnings: r.warnings
          }))
      },
      build: {
        stats: result.buildResult.stats,
        errors: result.buildResult.errors,
        warnings: result.buildResult.warnings
      },
      analysis: result.analysisResults.map(analysis => ({
        rule: analysis.ruleName,
        duration: analysis.duration,
        issues: analysis.issues.map(issue => ({
          severity: issue.severity,
          code: issue.code,
          message: issue.message,
          file: issue.file,
          line: issue.line,
          column: issue.column,
          suggestion: issue.suggestion,
          autoFix: issue.autoFix
        }))
      })),
      metadata: {
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        repository: result.buildResult.ast?.metadata
      }
    };
  }
}