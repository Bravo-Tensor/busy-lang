/**
 * Analyze Command Implementation
 * Specialized analysis command for specific rule categories
 */

import { ValidateCommand } from './validate';
import type { ValidateOptions } from '@/config/types';

/**
 * Analyze command class - extends validate with analysis focus
 */
export class AnalyzeCommand extends ValidateCommand {
  
  /**
   * Execute analysis command with specific focus
   */
  async execute(path: string, options: ValidateOptions & { only?: string[] }): Promise<void> {
    // Set analysis-specific defaults
    const analyzeOptions = {
      ...options,
      allowErrors: true, // Analysis can continue with some errors
      format: options.format || 'console'
    };
    
    // Call parent validate command with filtered rules
    await super.execute(path, analyzeOptions);
  }
}