/**
 * File Scanner - Repository discovery and file organization
 * First phase of the BUSY compiler pipeline
 */

import { discoverBusyFiles, groupFilesByNamespace, validateDirectoryStructure, parseNamespace, resolveAbsolutePath, type FileGroup, type StructureValidation } from '@/utils/path-utils';
import type { CompilerConfig } from '@/config/types';

/**
 * Scanner result containing discovered files and validation
 */
export interface ScanResult {
  /** Absolute path to the scanned directory */
  rootPath: string;
  
  /** All discovered .busy files */
  files: string[];
  
  /** Files grouped by namespace structure */
  groups: FileGroup[];
  
  /** Directory structure validation results */
  structureValidation: StructureValidation;
  
  /** Import dependencies discovered */
  dependencies: ImportDependency[];
  
  /** Scan statistics */
  stats: ScanStats;
}

/**
 * Import dependency information
 */
export interface ImportDependency {
  /** Source file that declares the import */
  sourceFile: string;
  
  /** Type of import (tool or advisor) */
  type: 'tool' | 'advisor';
  
  /** Import identifier */
  name: string;
  
  /** Version constraint for tools */
  version?: string;
  
  /** Interface specification for advisors */
  interface?: string;
}

/**
 * Scan statistics
 */
export interface ScanStats {
  /** Total files discovered */
  totalFiles: number;
  
  /** Files by category */
  teamFiles: number;
  roleFiles: number;
  playbookFiles: number;
  invalidFiles: number;
  
  /** Teams by layer */
  teamsL0: number;
  teamsL1: number;
  teamsL2: number;
  
  /** Scan duration in milliseconds */
  scanDurationMs: number;
}

/**
 * File Scanner class
 */
export class Scanner {
  private config: CompilerConfig;
  
  constructor(config: CompilerConfig) {
    this.config = config;
  }
  
  /**
   * Scan a directory for BUSY files and organize by namespace
   */
  async scan(inputPath: string): Promise<ScanResult> {
    const startTime = Date.now();
    const rootPath = resolveAbsolutePath(inputPath);
    
    // Discover all .busy files
    const files = await discoverBusyFiles(rootPath, this.config.ignore);
    
    // Group files by namespace structure
    const groups = groupFilesByNamespace(files);
    
    // Validate directory structure
    const structureValidation = validateDirectoryStructure(groups);
    
    // Extract import dependencies (lightweight scan)
    const dependencies = await this.extractDependencies(files);
    
    // Calculate statistics
    const stats = this.calculateStats(groups, Date.now() - startTime);
    
    return {
      rootPath,
      files,
      groups,
      structureValidation,
      dependencies,
      stats
    };
  }
  
  /**
   * Extract import dependencies from files without full parsing
   */
  private async extractDependencies(files: string[]): Promise<ImportDependency[]> {
    const dependencies: ImportDependency[] = [];
    const fs = await import('fs/promises');
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Quick regex-based extraction of imports (before full YAML parsing)
        // This is a lightweight scan for dependency analysis
        const importMatches = content.match(/^imports:\\s*$([\\s\\S]*?)^\\w+:/m);
        if (importMatches) {
          const importsSection = importMatches[1];
          
          // Extract tool imports
          const toolMatches = importsSection.matchAll(/- tool:\\s*[\"']?([^\"'\\n]+)[\"']?\\s*version:\\s*[\"']?([^\"'\\n]+)[\"']?/g);
          for (const match of toolMatches) {
            dependencies.push({
              sourceFile: file,
              type: 'tool',
              name: match[1],
              version: match[2]
            });
          }
          
          // Extract advisor imports
          const advisorMatches = importsSection.matchAll(/- advisor:\\s*[\"']?([^\"'\\n]+)[\"']?\\s*interface:\\s*[\"']?([^\"'\\n]+)[\"']?/g);
          for (const match of advisorMatches) {
            dependencies.push({
              sourceFile: file,
              type: 'advisor',
              name: match[1],
              interface: match[2]
            });
          }
        }
      } catch (error) {
        // Skip files that can't be read (will be caught in parsing phase)
        continue;
      }
    }
    
    return dependencies;
  }
  
  /**
   * Calculate scan statistics
   */
  private calculateStats(groups: FileGroup[], scanDurationMs: number): ScanStats {
    let totalFiles = 0;
    let teamFiles = 0;
    let roleFiles = 0;
    let playbookFiles = 0;
    let invalidFiles = 0;
    let teamsL0 = 0;
    let teamsL1 = 0;
    let teamsL2 = 0;
    
    for (const group of groups) {
      if (group.org === 'invalid') {
        invalidFiles += group.invalidFiles.length;
        continue;
      }
      
      // Count files
      if (group.teamFile) {
        teamFiles++;
        totalFiles++;
      }
      roleFiles += group.roles.length;
      playbookFiles += group.playbooks.length;
      totalFiles += group.roles.length + group.playbooks.length;
      
      // Count teams by layer
      switch (group.layer) {
        case 'L0':
          teamsL0++;
          break;
        case 'L1':
          teamsL1++;
          break;
        case 'L2':
          teamsL2++;
          break;
      }
    }
    
    totalFiles += invalidFiles;
    
    return {
      totalFiles,
      teamFiles,
      roleFiles,
      playbookFiles,
      invalidFiles,
      teamsL0,
      teamsL1,
      teamsL2,
      scanDurationMs
    };
  }
  
  /**
   * Validate import dependencies against registries
   */
  async validateDependencies(dependencies: ImportDependency[]): Promise<DependencyValidation[]> {
    const validations: DependencyValidation[] = [];
    
    // Load tool and advisor registries
    const toolRegistry = await this.loadToolRegistry();
    const advisorRegistry = await this.loadAdvisorRegistry();
    
    for (const dep of dependencies) {
      const validation: DependencyValidation = {
        dependency: dep,
        isValid: true,
        errors: [],
        warnings: []
      };
      
      if (dep.type === 'tool') {
        const tool = toolRegistry.get(dep.name);
        if (!tool) {
          validation.isValid = false;
          validation.errors.push(`Unknown tool '${dep.name}'`);
        } else if (dep.version && !this.isVersionCompatible(dep.version, tool.version)) {
          validation.isValid = false;
          validation.errors.push(`Tool '${dep.name}' version '${dep.version}' is not compatible with available '${tool.version}'`);
        }
      } else if (dep.type === 'advisor') {
        const advisor = advisorRegistry.get(dep.name);
        if (!advisor) {
          validation.isValid = false;
          validation.errors.push(`Unknown advisor '${dep.name}'`);
        } else if (dep.interface && !advisor.interfaces.includes(dep.interface)) {
          validation.isValid = false;
          validation.errors.push(`Advisor '${dep.name}' does not support interface '${dep.interface}'`);
        }
      }
      
      validations.push(validation);
    }
    
    return validations;
  }
  
  /**
   * Load tool registry from configuration
   */
  private async loadToolRegistry(): Promise<Map<string, ToolInfo>> {
    const registry = new Map<string, ToolInfo>();
    
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.config.toolRegistry, 'utf8');
      const data = JSON.parse(content) as Record<string, ToolInfo>;
      
      for (const [name, info] of Object.entries(data)) {
        registry.set(name, info);
      }
    } catch (error) {
      // Tool registry is optional - provide default common tools
      this.addDefaultTools(registry);
    }
    
    return registry;
  }
  
  /**
   * Load advisor registry from configuration
   */
  private async loadAdvisorRegistry(): Promise<Map<string, AdvisorInfo>> {
    const registry = new Map<string, AdvisorInfo>();
    
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.config.advisorRegistry, 'utf8');
      const data = JSON.parse(content) as Record<string, AdvisorInfo>;
      
      for (const [name, info] of Object.entries(data)) {
        registry.set(name, info);
      }
    } catch (error) {
      // Advisor registry is optional
    }
    
    return registry;
  }
  
  /**
   * Add default common tools if no registry found
   */
  private addDefaultTools(registry: Map<string, ToolInfo>): void {
    const defaultTools: Record<string, ToolInfo> = {
      'salesforce': { version: '^4.0', description: 'Salesforce CRM integration' },
      'stripe': { version: '^4.0', description: 'Payment processing' },
      'calendly': { version: '^3.0', description: 'Calendar scheduling' },
      'gmail': { version: '^2.0', description: 'Email integration' },
      'quickbooks': { version: '^2024', description: 'Accounting software' },
      'docusign': { version: '^3.0', description: 'Digital signature platform' },
      'lightroom': { version: '^13.0', description: 'Photo editing software' },
      'photoshop': { version: '^24.0', description: 'Image editing software' },
      'dropbox': { version: '^3.0', description: 'File storage and sharing' },
      'google-workspace': { version: '^2.0', description: 'Google productivity suite' },
      'google-forms': { version: '^2.0', description: 'Form creation and responses' },
      'google-drive': { version: '^3.0', description: 'File storage and collaboration' },
      'google-sheets': { version: '^2.0', description: 'Spreadsheet application' },
      'excel': { version: '^365', description: 'Microsoft Excel spreadsheet' }
    };
    
    for (const [name, info] of Object.entries(defaultTools)) {
      registry.set(name, info);
    }
  }
  
  /**
   * Check if version constraint is compatible
   */
  private isVersionCompatible(required: string, available: string): boolean {
    // Simple version compatibility check
    // For now, just check if the major version matches
    const semver = require('semver');
    try {
      return semver.satisfies(available.replace(/^[\\^~]/, ''), required);
    } catch {
      return false;
    }
  }
}

/**
 * Dependency validation result
 */
export interface DependencyValidation {
  dependency: ImportDependency;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Tool information from registry
 */
interface ToolInfo {
  version: string;
  description: string;
}

/**
 * Advisor information from registry
 */
interface AdvisorInfo {
  interfaces: string[];
  description: string;
}