import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { DependencyGraph, FileDependency, ReconciliationRules, ConflictType } from '../types';

export class DependencyGraphManager {
  private graph: DependencyGraph;
  private knitDir: string;
  private dependenciesFile: string;

  constructor(projectRoot: string) {
    this.knitDir = path.join(projectRoot, '.knit');
    this.dependenciesFile = path.join(this.knitDir, 'dependencies.json');
    this.graph = {
      dependencies: {},
      version: '1.0.0',
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize .knit directory and dependency graph
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.knitDir, { recursive: true });
      await fs.mkdir(path.join(this.knitDir, 'reconciliation'), { recursive: true });
      await fs.mkdir(path.join(this.knitDir, 'state'), { recursive: true });
      
      // Create default configuration
      const defaultConfig = {
        autoApplyThreshold: 0.8,
        llm: {
          provider: 'openai',
          model: 'gpt-4'
        },
        git: {
          autoReconcile: false,
          branchPrefix: 'knit/reconcile'
        },
        ignore: [
          '.git/**',
          'node_modules/**',
          '.knit/**',
          '*.log',
          'dist/**',
          'build/**'
        ],
        rules: {}
      };
      
      await fs.writeFile(
        path.join(this.knitDir, 'config.json'),
        JSON.stringify(defaultConfig, null, 2)
      );

      await this.save();
      console.log('✅ Initialized knit dependency tracking');
    } catch (error) {
      throw new Error(`Failed to initialize knit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load dependency graph from disk
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.dependenciesFile, 'utf-8');
      this.graph = JSON.parse(content);
      this.graph.lastUpdated = new Date(this.graph.lastUpdated);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, start with empty graph
        await this.save();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save dependency graph to disk
   */
  async save(): Promise<void> {
    this.graph.lastUpdated = new Date();
    await fs.writeFile(
      this.dependenciesFile,
      JSON.stringify(this.graph, null, 2)
    );
  }

  /**
   * Add a dependency relationship: source file watches target file
   */
  async addDependency(sourceFile: string, targetFile: string, rules?: Partial<ReconciliationRules>): Promise<void> {
    const normalizedSource = this.normalizePath(sourceFile);
    const normalizedTarget = this.normalizePath(targetFile);

    // Initialize source file if not exists
    if (!this.graph.dependencies[normalizedSource]) {
      this.graph.dependencies[normalizedSource] = {
        watches: [],
        watchedBy: [],
        reconciliationRules: {
          autoApplyThreshold: 0.8,
          requireReview: [ConflictType.REVIEW_REQUIRED]
        }
      };
    }

    // Initialize target file if not exists
    if (!this.graph.dependencies[normalizedTarget]) {
      this.graph.dependencies[normalizedTarget] = {
        watches: [],
        watchedBy: [],
        reconciliationRules: {
          autoApplyThreshold: 0.8,
          requireReview: [ConflictType.REVIEW_REQUIRED]
        }
      };
    }

    // Add dependency relationship
    if (!this.graph.dependencies[normalizedSource].watches.includes(normalizedTarget)) {
      this.graph.dependencies[normalizedSource].watches.push(normalizedTarget);
    }
    
    if (!this.graph.dependencies[normalizedTarget].watchedBy.includes(normalizedSource)) {
      this.graph.dependencies[normalizedTarget].watchedBy.push(normalizedSource);
    }

    // Apply custom rules if provided
    if (rules) {
      this.graph.dependencies[normalizedSource].reconciliationRules = {
        ...this.graph.dependencies[normalizedSource].reconciliationRules,
        ...rules
      };
    }

    await this.save();
  }

  /**
   * Remove a dependency relationship
   */
  async removeDependency(sourceFile: string, targetFile: string): Promise<void> {
    const normalizedSource = this.normalizePath(sourceFile);
    const normalizedTarget = this.normalizePath(targetFile);

    if (this.graph.dependencies[normalizedSource]) {
      this.graph.dependencies[normalizedSource].watches = 
        this.graph.dependencies[normalizedSource].watches.filter(f => f !== normalizedTarget);
    }

    if (this.graph.dependencies[normalizedTarget]) {
      this.graph.dependencies[normalizedTarget].watchedBy = 
        this.graph.dependencies[normalizedTarget].watchedBy.filter(f => f !== normalizedSource);
    }

    await this.save();
  }

  /**
   * Get files that depend on the given file (files that watch it)
   */
  getDependentFiles(filepath: string): string[] {
    const normalized = this.normalizePath(filepath);
    return this.graph.dependencies[normalized]?.watchedBy || [];
  }

  /**
   * Get files that the given file depends on (files it watches)
   */
  getDependencies(filepath: string): string[] {
    const normalized = this.normalizePath(filepath);
    return this.graph.dependencies[normalized]?.watches || [];
  }

  /**
   * Get reconciliation rules for a file
   */
  getReconciliationRules(filepath: string): ReconciliationRules | undefined {
    const normalized = this.normalizePath(filepath);
    return this.graph.dependencies[normalized]?.reconciliationRules;
  }

  /**
   * Update last reconciled hash for a file
   */
  async updateReconciledHash(filepath: string, hash: string): Promise<void> {
    const normalized = this.normalizePath(filepath);
    if (this.graph.dependencies[normalized]) {
      this.graph.dependencies[normalized].lastReconciledHash = hash;
      await this.save();
    }
  }

  /**
   * Get last reconciled hash for a file
   */
  getLastReconciledHash(filepath: string): string | undefined {
    const normalized = this.normalizePath(filepath);
    return this.graph.dependencies[normalized]?.lastReconciledHash;
  }

  /**
   * Get all dependency relationships
   */
  getAllDependencies(): Record<string, FileDependency> {
    return { ...this.graph.dependencies };
  }

  /**
   * Check for dependency cycles
   */
  hasCycles(): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    const dfs = (file: string, path: string[]): void => {
      visited.add(file);
      recursionStack.add(file);

      const dependencies = this.getDependencies(file);
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, [...path, dep]);
        } else if (recursionStack.has(dep)) {
          cycles.push([...path, dep].join(' → '));
        }
      }

      recursionStack.delete(file);
    };

    for (const file of Object.keys(this.graph.dependencies)) {
      if (!visited.has(file)) {
        dfs(file, [file]);
      }
    }

    return cycles;
  }

  /**
   * Generate a visual representation of the dependency graph
   */
  visualize(): string {
    const lines: string[] = ['Dependency Graph:'];
    
    for (const [file, deps] of Object.entries(this.graph.dependencies)) {
      if (deps.watches.length > 0) {
        lines.push(`  ${file}:`);
        for (const watch of deps.watches) {
          lines.push(`    → ${watch}`);
        }
      }
    }

    const cycles = this.hasCycles();
    if (cycles.length > 0) {
      lines.push('');
      lines.push('⚠️  Cycles detected:');
      for (const cycle of cycles) {
        lines.push(`  ${cycle}`);
      }
    }

    return lines.join('\n');
  }

  private normalizePath(filepath: string): string {
    return path.normalize(filepath).replace(/\\/g, '/');
  }
}