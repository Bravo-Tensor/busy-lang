/**
 * Configuration Loader
 * Loads and validates compiler configuration from various sources
 */

import { readFile, access } from 'fs/promises';
import { join } from 'path';
import type { CompilerConfig } from './types';
import { DEFAULT_CONFIG } from './types';

/**
 * Load configuration from file or use defaults
 */
export async function loadConfig(configPath?: string): Promise<CompilerConfig> {
  const config = { ...DEFAULT_CONFIG };
  
  // Try to load from specified config file or default locations
  const configFiles = configPath ? [configPath] : [
    '.busy.json',
    '.busy.config.json',
    'busy.config.json',
    '.busyrc.json',
    '.busyrc'
  ];
  
  for (const file of configFiles) {
    try {
      await access(file);
      const content = await readFile(file, 'utf8');
      const userConfig = JSON.parse(content);
      
      // Merge user config with defaults
      Object.assign(config, userConfig);
      
      // Validate configuration
      validateConfig(config);
      
      return config;
    } catch (error) {
      // Continue to next config file or use defaults
      if (configPath) {
        // If specific config file was requested but not found, throw error
        throw new Error(`Configuration file not found: ${configPath}`);
      }
    }
  }
  
  return config;
}

/**
 * Validate configuration object
 */
function validateConfig(config: CompilerConfig): void {
  // Validate rule severities
  const validSeverities = ['error', 'warning', 'info', 'off'];
  for (const [ruleName, severity] of Object.entries(config.rules)) {
    if (!validSeverities.includes(severity)) {
      throw new Error(`Invalid severity '${severity}' for rule '${ruleName}'. Must be one of: ${validSeverities.join(', ')}`);
    }
  }
  
  // Validate output format
  const validFormats = ['console', 'json', 'html', 'junit'];
  if (!validFormats.includes(config.outputFormat)) {
    throw new Error(`Invalid output format '${config.outputFormat}'. Must be one of: ${validFormats.join(', ')}`);
  }
  
  // Validate numeric values
  if (config.maxErrors < 0) {
    throw new Error('maxErrors must be non-negative');
  }
  if (config.maxWarnings < 0) {
    throw new Error('maxWarnings must be non-negative');
  }
  
  // Validate arrays
  if (!Array.isArray(config.ignore)) {
    throw new Error('ignore must be an array of glob patterns');
  }
  if (!Array.isArray(config.customRules)) {
    throw new Error('customRules must be an array of paths');
  }
}