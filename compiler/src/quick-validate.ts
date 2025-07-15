#!/usr/bin/env node

/**
 * Quick validation script to test the photography business example
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import * as YAML from 'yaml';
import * as path from 'path';
import chalk from 'chalk';

interface ValidationResult {
  file: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateBusyFile(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    file: filePath,
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    const content = await readFile(filePath, 'utf8');
    
    // Parse YAML
    const parsed = YAML.parse(content);
    
    // Basic validation
    if (!parsed.version) {
      result.errors.push('Missing version field');
      result.isValid = false;
    }
    
    if (!parsed.metadata) {
      result.errors.push('Missing metadata field');
      result.isValid = false;
    } else {
      if (!parsed.metadata.name) {
        result.errors.push('Missing metadata.name field');
        result.isValid = false;
      }
      if (!parsed.metadata.description) {
        result.errors.push('Missing metadata.description field');
        result.isValid = false;
      }
      if (!parsed.metadata.layer) {
        result.errors.push('Missing metadata.layer field');
        result.isValid = false;
      }
    }
    
    // Check for content
    if (!parsed.role && !parsed.playbook && !parsed.team && !parsed.teams) {
      result.errors.push('Missing content: must have role, playbook, team, or teams');
      result.isValid = false;
    }
    
    // File type specific validation
    if (parsed.role) {
      if (!parsed.role.name) {
        result.errors.push('Role missing name');
        result.isValid = false;
      }
      if (!parsed.role.description) {
        result.errors.push('Role missing description');
        result.isValid = false;
      }
    }
    
    if (parsed.playbook) {
      if (!parsed.playbook.name) {
        result.errors.push('Playbook missing name');
        result.isValid = false;
      }
      if (!parsed.playbook.description) {
        result.errors.push('Playbook missing description');
        result.isValid = false;
      }
      if (!parsed.playbook.cadence) {
        result.errors.push('Playbook missing cadence');
        result.isValid = false;
      }
    }
    
    if (parsed.team) {
      if (!parsed.team.name) {
        result.errors.push('Team missing name');
        result.isValid = false;
      }
      if (!parsed.team.description) {
        result.errors.push('Team missing description');
        result.isValid = false;
      }
    }
    
  } catch (error) {
    result.errors.push(`Parse error: ${(error as Error).message}`);
    result.isValid = false;
  }

  return result;
}

async function findBusyFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(currentDir: string) {
    try {
      const entries = await readdir(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          await scan(fullPath);
        } else if (entry.endsWith('.busy')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await scan(dir);
  return files.sort();
}

async function main() {
  const targetDir = process.argv[2] || '../examples/solo-photography-business';
  const resolvedDir = path.resolve(targetDir);
  
  console.log(chalk.blue.bold('🔍 BUSY Quick Validation'));
  console.log(chalk.gray(`Target: ${resolvedDir}`));
  console.log(chalk.gray('=' .repeat(50)));
  
  try {
    const files = await findBusyFiles(resolvedDir);
    
    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  No .busy files found'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`📁 Found ${files.length} .busy files`));
    
    const results: ValidationResult[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    
    for (const file of files) {
      const result = await validateBusyFile(file);
      results.push(result);
      
      const relativePath = path.relative(resolvedDir, file);
      
      if (result.isValid) {
        console.log(chalk.green(`✅ ${relativePath}`));
      } else {
        console.log(chalk.red(`❌ ${relativePath}`));
        for (const error of result.errors) {
          console.log(chalk.red(`   • ${error}`));
          totalErrors++;
        }
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`   • ${warning}`));
          totalWarnings++;
        }
      }
    }
    
    console.log(chalk.gray('=' .repeat(50)));
    console.log(chalk.blue.bold('📊 Summary'));
    console.log(`Files processed: ${chalk.cyan(files.length)}`);
    console.log(`Valid files: ${chalk.green(results.filter(r => r.isValid).length)}`);
    console.log(`Invalid files: ${chalk.red(results.filter(r => !r.isValid).length)}`);
    console.log(`Total errors: ${chalk.red(totalErrors)}`);
    console.log(`Total warnings: ${chalk.yellow(totalWarnings)}`);
    
    if (totalErrors > 0) {
      console.log(chalk.red('\\n❌ Validation failed'));
      process.exit(1);
    } else {
      console.log(chalk.green('\\n✅ Validation passed'));
    }
    
  } catch (error) {
    console.error(chalk.red('Validation error:'), (error as Error).message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});