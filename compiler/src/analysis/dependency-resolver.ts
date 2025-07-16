/**
 * Dependency Resolver
 * Resolves dependencies between symbols and builds enhanced dependency graph
 * with topological ordering and critical path analysis
 */

import type { 
  BusyAST, 
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  Symbol 
} from '@/ast/nodes';

import type { 
  AnalysisConfiguration,
  ResolvedDependencyGraph,
  DependencyResolution,
  CriticalPath,
  LayerViolation,
  AnalysisError,
  AnalysisWarning
} from './types';

/**
 * Result of dependency resolution
 */
export interface DependencyResolutionResult {
  /** Enhanced dependency graph */
  resolvedDependencies: ResolvedDependencyGraph;
  
  /** Number of resolved dependencies */
  resolved: number;
  
  /** Number of unresolved dependencies */
  unresolved: number;
  
  /** Resolution errors */
  errors: AnalysisError[];
  
  /** Resolution warnings */
  warnings: AnalysisWarning[];
}

/**
 * Dependency resolver implementation
 */
export class DependencyResolver {
  private config: AnalysisConfiguration;

  constructor(config: AnalysisConfiguration) {
    this.config = config;
  }

  /**
   * Resolve dependencies in the AST
   */
  async resolve(ast: BusyAST): Promise<DependencyResolutionResult> {
    const result: DependencyResolutionResult = {
      resolvedDependencies: {
        ...ast.dependencies,
        resolutionStatus: new Map(),
        topologicalOrder: [],
        criticalPaths: [],
        layerViolations: []
      },
      resolved: 0,
      unresolved: 0,
      errors: [],
      warnings: []
    };

    try {
      // Resolve individual dependencies
      await this.resolveDependencies(ast, result);
      
      // Build topological ordering
      await this.buildTopologicalOrder(result);
      
      // Analyze critical paths
      await this.analyzeCriticalPaths(ast, result);
      
      // Check layer violations
      await this.checkLayerViolations(ast, result);
      
      // Detect circular dependencies
      await this.detectCircularDependencies(result);

    } catch (error) {
      result.errors.push({
        code: 'DEPENDENCY_RESOLUTION_FAILED',
        message: `Dependency resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: 'dependency-resolver',
        category: 'dependency',
        severity: 'critical'
      });
    }

    return result;
  }

  /**
   * Resolve individual dependencies
   */
  private async resolveDependencies(ast: BusyAST, result: DependencyResolutionResult): Promise<void> {
    for (const edge of ast.dependencies.edges) {
      const resolution = await this.resolveDependency(edge, ast);
      result.resolvedDependencies.resolutionStatus.set(`${edge.from}->${edge.to}`, resolution);
      
      if (resolution.isResolved) {
        result.resolved++;
      } else {
        result.unresolved++;
        
        // Add error for unresolved dependency
        result.errors.push({
          code: 'UNRESOLVED_DEPENDENCY',
          message: `Cannot resolve dependency from '${edge.from}' to '${edge.to}': ${resolution.errors.join(', ')}`,
          location: `dependency:${edge.from}->${edge.to}`,
          category: 'dependency',
          severity: 'error',
          suggestedFix: resolution.errors.length > 0 ? resolution.errors[0] : undefined
        });
      }
      
      // Add warnings
      for (const warning of resolution.warnings) {
        result.warnings.push({
          code: 'DEPENDENCY_WARNING',
          message: warning,
          location: `dependency:${edge.from}->${edge.to}`,
          category: 'dependency'
        });
      }
    }
  }

  /**
   * Resolve a single dependency
   */
  private async resolveDependency(edge: DependencyEdge, ast: BusyAST): Promise<DependencyResolution> {
    const resolution: DependencyResolution = {
      isResolved: false,
      resolutionMethod: 'direct',
      errors: [],
      warnings: []
    };

    // Find target symbol
    const targetSymbol = this.findSymbol(edge.to, ast);
    if (!targetSymbol) {
      resolution.errors.push(`Symbol '${edge.to}' not found`);
      return resolution;
    }

    // Check resolution method based on edge type
    switch (edge.edgeType) {
      case 'input':
      case 'output':
        resolution.resolutionMethod = 'interface';
        break;
      case 'inheritance':
        resolution.resolutionMethod = 'inheritance';
        break;
      case 'escalation':
        resolution.resolutionMethod = 'direct';
        break;
      case 'import':
        resolution.resolutionMethod = 'external';
        break;
    }

    // Validate resolution based on type
    const validationResult = await this.validateResolution(edge, targetSymbol, ast);
    if (validationResult.isValid) {
      resolution.isResolved = true;
      resolution.resolvedTarget = targetSymbol;
    } else {
      resolution.errors.push(...validationResult.errors);
      resolution.warnings.push(...validationResult.warnings);
    }

    return resolution;
  }

  /**
   * Find symbol by name in AST
   */
  private findSymbol(symbolName: string, ast: BusyAST): Symbol | undefined {
    // Search in all symbol tables
    return ast.symbols.roles.get(symbolName) ||
           ast.symbols.playbooks.get(symbolName) ||
           ast.symbols.tasks.get(symbolName) ||
           ast.symbols.deliverables.get(symbolName) ||
           ast.symbols.tools.get(symbolName) ||
           ast.symbols.advisors.get(symbolName) ||
           ast.symbols.teams.get(symbolName);
  }

  /**
   * Validate a dependency resolution
   */
  private async validateResolution(edge: DependencyEdge, target: Symbol, ast: BusyAST): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    const source = this.findSymbol(edge.from, ast);
    if (!source) {
      result.isValid = false;
      result.errors.push(`Source symbol '${edge.from}' not found`);
      return result;
    }

    // Validate based on edge type
    switch (edge.edgeType) {
      case 'inheritance':
        await this.validateInheritance(source, target, result);
        break;
      case 'input':
        await this.validateInput(source, target, result);
        break;
      case 'output':
        await this.validateOutput(source, target, result);
        break;
      case 'escalation':
        await this.validateEscalation(source, target, result);
        break;
      case 'import':
        await this.validateImport(source, target, result);
        break;
    }

    return result;
  }

  /**
   * Validate inheritance dependency
   */
  private async validateInheritance(source: Symbol, target: Symbol, result: any): Promise<void> {
    // Both must be roles for inheritance
    if (source.symbolType !== 'role' || target.symbolType !== 'role') {
      result.isValid = false;
      result.errors.push('Inheritance is only valid between roles');
      return;
    }

    // Check for circular inheritance
    if (await this.hasCircularInheritance(source, target)) {
      result.isValid = false;
      result.errors.push('Circular inheritance detected');
    }

    // Check layer compatibility for inheritance
    if (!this.isLayerCompatible(source.namespace, target.namespace, 'inheritance')) {
      result.warnings.push('Cross-layer inheritance may violate organizational boundaries');
    }
  }

  /**
   * Validate input dependency
   */
  private async validateInput(source: Symbol, target: Symbol, result: any): Promise<void> {
    // Target should be a deliverable
    if (target.symbolType !== 'deliverable') {
      result.warnings.push('Input dependency target is not a deliverable');
    }

    // Check if target deliverable is produced by any task
    if (target.symbolType === 'deliverable') {
      const producers = target.references.filter(ref => ref.referenceType === 'output');
      if (producers.length === 0) {
        result.warnings.push(`Deliverable '${target.name}' is used as input but never produced`);
      }
    }
  }

  /**
   * Validate output dependency
   */
  private async validateOutput(source: Symbol, target: Symbol, result: any): Promise<void> {
    // Target should be a deliverable
    if (target.symbolType !== 'deliverable') {
      result.warnings.push('Output dependency target is not a deliverable');
    }

    // Check if target deliverable is consumed by any task
    if (target.symbolType === 'deliverable') {
      const consumers = target.references.filter(ref => ref.referenceType === 'input');
      if (consumers.length === 0) {
        result.warnings.push(`Deliverable '${target.name}' is produced but never consumed`);
      }
    }
  }

  /**
   * Validate escalation dependency
   */
  private async validateEscalation(source: Symbol, target: Symbol, result: any): Promise<void> {
    // Target should be a role or team
    if (target.symbolType !== 'role' && target.symbolType !== 'team') {
      result.isValid = false;
      result.errors.push('Escalation target must be a role or team');
      return;
    }

    // Check layer hierarchy for escalation
    if (!this.isValidEscalationPath(source.namespace, target.namespace)) {
      result.warnings.push('Escalation may not follow proper hierarchical structure');
    }
  }

  /**
   * Validate import dependency
   */
  private async validateImport(source: Symbol, target: Symbol, result: any): Promise<void> {
    // Target should be a tool or advisor
    if (target.symbolType !== 'tool' && target.symbolType !== 'advisor') {
      result.isValid = false;
      result.errors.push('Import target must be a tool or advisor');
      return;
    }

    // Additional import validation could go here
  }

  /**
   * Check for circular inheritance
   */
  private async hasCircularInheritance(source: Symbol, target: Symbol): Promise<boolean> {
    // This would implement a graph traversal to detect cycles in inheritance
    // Placeholder implementation
    return false;
  }

  /**
   * Check layer compatibility
   */
  private isLayerCompatible(sourceNamespace: any, targetNamespace: any, dependencyType: string): boolean {
    // Implement layer compatibility rules
    // For now, allow all dependencies but warn about cross-layer
    return sourceNamespace.layer === targetNamespace.layer;
  }

  /**
   * Check if escalation path is valid
   */
  private isValidEscalationPath(sourceNamespace: any, targetNamespace: any): boolean {
    // Escalation should generally go up layers (L0 -> L1 -> L2)
    const layerOrder = { 'L0': 0, 'L1': 1, 'L2': 2 };
    const sourceLevel = layerOrder[sourceNamespace.layer as keyof typeof layerOrder];
    const targetLevel = layerOrder[targetNamespace.layer as keyof typeof layerOrder];
    
    // Allow same layer or escalation up
    return targetLevel >= sourceLevel;
  }

  /**
   * Build topological ordering of dependencies
   */
  private async buildTopologicalOrder(result: DependencyResolutionResult): Promise<void> {
    const graph = result.resolvedDependencies;
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string): boolean => {
      if (visiting.has(nodeId)) {
        // Circular dependency detected
        return false;
      }
      
      if (visited.has(nodeId)) {
        return true;
      }

      visiting.add(nodeId);
      
      const node = graph.nodes.get(nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visit(depId)) {
            return false;
          }
        }
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
      
      return true;
    };

    // Visit all nodes
    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (!visit(nodeId)) {
          // Circular dependency detected
          result.warnings.push({
            code: 'CIRCULAR_DEPENDENCY',
            message: `Circular dependency detected involving node '${nodeId}'`,
            location: `node:${nodeId}`,
            category: 'dependency'
          });
        }
      }
    }

    result.resolvedDependencies.topologicalOrder = order.reverse();
  }

  /**
   * Analyze critical paths in dependency graph
   */
  private async analyzeCriticalPaths(ast: BusyAST, result: DependencyResolutionResult): Promise<void> {
    const graph = result.resolvedDependencies;
    
    // Find all paths from nodes with no dependencies to nodes with no dependents
    const entryNodes = Array.from(graph.nodes.values()).filter(node => node.dependencies.length === 0);
    const exitNodes = Array.from(graph.nodes.values()).filter(node => node.dependents.length === 0);

    for (const entryNode of entryNodes) {
      for (const exitNode of exitNodes) {
        const paths = this.findAllPaths(entryNode.id, exitNode.id, graph);
        
        for (const path of paths) {
          const criticalPath = await this.analyzePath(path, ast, graph);
          if (criticalPath.totalDuration > 0) {
            result.resolvedDependencies.criticalPaths.push(criticalPath);
          }
        }
      }
    }

    // Sort by total duration (longest first)
    result.resolvedDependencies.criticalPaths.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * Find all paths between two nodes
   */
  private findAllPaths(start: string, end: string, graph: ResolvedDependencyGraph): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]): void => {
      if (current === end) {
        paths.push([...path, current]);
        return;
      }

      if (visited.has(current)) {
        return;
      }

      visited.add(current);
      const node = graph.nodes.get(current);
      
      if (node) {
        for (const dependent of node.dependents) {
          dfs(dependent, [...path, current]);
        }
      }
      
      visited.delete(current);
    };

    dfs(start, []);
    return paths;
  }

  /**
   * Analyze a path to create critical path information
   */
  private async analyzePath(path: string[], ast: BusyAST, graph: ResolvedDependencyGraph): Promise<CriticalPath> {
    let totalDuration = 0;
    const bottlenecks: string[] = [];
    const optimizations: string[] = [];

    for (const nodeId of path) {
      const node = graph.nodes.get(nodeId);
      if (node) {
        // Estimate duration based on symbol type
        const duration = this.estimateNodeDuration(node.symbol);
        totalDuration += duration;
        
        // Identify bottlenecks (nodes with high duration or many dependencies)
        if (duration > 60 || node.dependencies.length > 3) {
          bottlenecks.push(nodeId);
        }
        
        // Suggest optimizations
        if (node.dependencies.length > 5) {
          optimizations.push(`Consider breaking down '${nodeId}' into smaller components`);
        }
      }
    }

    return {
      nodes: path,
      totalDuration,
      bottlenecks,
      optimizations
    };
  }

  /**
   * Estimate duration for a symbol
   */
  private estimateNodeDuration(symbol: Symbol): number {
    // Basic duration estimation based on symbol type
    switch (symbol.symbolType) {
      case 'task':
        // Try to parse estimated duration from task
        // Placeholder: return default duration
        return 30; // minutes
      case 'role':
        return 0; // Roles don't have execution duration
      case 'playbook':
        return 60; // Default playbook duration
      default:
        return 0;
    }
  }

  /**
   * Check for layer violations in dependencies
   */
  private async checkLayerViolations(ast: BusyAST, result: DependencyResolutionResult): Promise<void> {
    for (const edge of ast.dependencies.edges) {
      const sourceSymbol = this.findSymbol(edge.from, ast);
      const targetSymbol = this.findSymbol(edge.to, ast);
      
      if (sourceSymbol && targetSymbol) {
        const violation = this.checkLayerViolation(sourceSymbol, targetSymbol, edge);
        if (violation) {
          result.resolvedDependencies.layerViolations.push(violation);
        }
      }
    }
  }

  /**
   * Check for layer violation between two symbols
   */
  private checkLayerViolation(source: Symbol, target: Symbol, edge: DependencyEdge): LayerViolation | null {
    const sourceLayer = source.namespace.layer;
    const targetLayer = target.namespace.layer;
    
    // Define layer order
    const layerOrder = { 'L0': 0, 'L1': 1, 'L2': 2 };
    const sourceLevel = layerOrder[sourceLayer as keyof typeof layerOrder];
    const targetLevel = layerOrder[targetLayer as keyof typeof layerOrder];
    
    // Check for violations
    if (sourceLevel > targetLevel) {
      // Higher layer depending on lower layer (reverse dependency)
      return {
        sourceLayer,
        targetLayer,
        violationType: 'reverse_dependency',
        symbols: [source.name, target.name],
        severity: 'error'
      };
    }
    
    if (Math.abs(sourceLevel - targetLevel) > 1) {
      // Skipping a layer
      return {
        sourceLayer,
        targetLayer,
        violationType: 'skip_layer',
        symbols: [source.name, target.name],
        severity: 'warning'
      };
    }
    
    return null;
  }

  /**
   * Detect circular dependencies
   */
  private async detectCircularDependencies(result: DependencyResolutionResult): Promise<void> {
    // Use the existing cycles from the dependency graph
    for (const cycle of result.resolvedDependencies.cycles) {
      result.warnings.push({
        code: 'CIRCULAR_DEPENDENCY_DETECTED',
        message: `Circular dependency detected: ${cycle.nodes.join(' -> ')} -> ${cycle.nodes[0]}`,
        location: `cycle:${cycle.nodes.join('-')}`,
        category: 'dependency',
        recommendation: 'Break the circular dependency by refactoring dependencies or introducing interfaces'
      });
    }
  }

  /**
   * Update resolver configuration
   */
  updateConfiguration(config: AnalysisConfiguration): void {
    this.config = config;
  }
}