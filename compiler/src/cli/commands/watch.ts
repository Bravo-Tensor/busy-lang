/**
 * Watch Command Implementation
 * Continuous validation with file watching
 */

import { ValidateCommand } from './validate';
import type { ValidateOptions } from '@/config/types';
import chalk from 'chalk';
import { watch } from 'fs';
import { join } from 'path';
import { debounce } from '@/utils/debounce';

/**
 * Watch command options
 */
interface WatchOptions extends ValidateOptions {
  debounce?: string;
}

/**
 * Watch command class
 */
export class WatchCommand {
  private validateCommand: ValidateCommand;
  private isValidating = false;
  
  constructor() {
    this.validateCommand = new ValidateCommand();
  }
  
  /**
   * Execute watch command
   */
  async execute(path: string, options: WatchOptions): Promise<void> {
    const debounceMs = parseInt(options.debounce || '500', 10);
    
    console.log(chalk.blue('👀 Starting BUSY file watcher...'));
    console.log(chalk.gray(`Watching: ${path}`));
    console.log(chalk.gray(`Debounce: ${debounceMs}ms`));
    console.log(chalk.gray('Press Ctrl+C to stop\\n'));
    
    // Initial validation
    await this.runValidation(path, options);
    
    // Debounced validation function
    const debouncedValidate = debounce(async () => {
      if (!this.isValidating) {
        await this.runValidation(path, options);
      }
    }, debounceMs);
    
    // Watch for file changes
    const watcher = watch(path, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.busy')) {
        console.log(chalk.yellow(`📁 ${eventType}: ${filename}`));
        debouncedValidate().catch((error: Error) => {
          console.error(chalk.red('Watch validation failed:'), error.message);
        });
      }
    });
    
    // Handle cleanup
    process.on('SIGINT', () => {
      console.log(chalk.blue('\\n🛑 Stopping file watcher...'));
      watcher.close();
      process.exit(0);
    });
    
    // Keep process alive
    await new Promise(() => {}); // Wait indefinitely
  }
  
  /**
   * Run validation with error handling
   */
  private async runValidation(path: string, options: ValidateOptions): Promise<void> {
    this.isValidating = true;
    
    try {
      console.log(chalk.blue('🔄 Validating...'));
      const startTime = Date.now();
      
      await this.validateCommand.execute(path, {
        ...options,
        allowErrors: true, // Don't exit on errors in watch mode
        verbose: false     // Reduce noise in watch mode
      });
      
      const duration = Date.now() - startTime;
      console.log(chalk.green(`✅ Validation complete (${duration}ms)\\n`));
      
    } catch (error) {
      console.error(chalk.red('❌ Validation error:'), (error as Error).message);
      console.log(''); // Add spacing
    } finally {
      this.isValidating = false;
    }
  }
}