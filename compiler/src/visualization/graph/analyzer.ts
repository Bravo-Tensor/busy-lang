/**
 * BUSY File Analyzer for Visualization System
 * Integrates with existing BUSY compiler to extract structural information
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Parser } from '@/core/parser';
import { ASTBuilder } from '@/ast/builder';
import type { BusyAST, BusyFileNode, TeamNode, RoleNode, PlaybookNode } from '@/ast/nodes';
import type { 
  IBusyAnalyzer,
  ValidationResult
} from '../core/interfaces';
import type {
  BusyAnalysisResult,
  OrganizationInfo,
  TeamInfo,
  PlaybookInfo,
  RoleInfo,
  StepInfo,
  IOInfo,
  RelationshipInfo,
  DependencyInfo,
  AnalysisStatistics
} from '../core/types';
import type { FileChangeEvent } from '../core/types';

export class BusyAnalyzer implements IBusyAnalyzer {
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();
  private watchCallbacks: ((changes: FileChangeEvent[]) => void)[] = [];
  
  /**
   * Analyze BUSY files from file paths
   */
  async analyzeFiles(filePaths: string[]): Promise<BusyAnalysisResult> {
    try {
      // Expand glob patterns and filter for .busy files
      const expandedPaths = await this.expandFilePaths(filePaths);
      const busyFiles = expandedPaths.filter(p => p.endsWith('.busy'));
      
      if (busyFiles.length === 0) {
        throw new Error('No BUSY files found');
      }
      
      // Parse files using existing compiler
      const parser = new Parser();
      const parseResult = await parser.parseFiles(busyFiles);
      
      if (parseResult.parseErrors.length > 0) {
        throw new Error(`Parse error: ${parseResult.parseErrors.map(e => e.message).join(', ')}`);
      }
      
      // Build AST
      const astBuilder = new ASTBuilder();
      const astResult = astBuilder.buildAST(parseResult.parsedFiles);
      
      if (!astResult.success) {
        throw new Error(`AST build error: ${astResult.errors.map((e: any) => e.message).join(', ')}`);
      }
      
      return this.analyzeAST(astResult.ast);
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Analyze from existing AST
   */
  analyzeAST(ast: BusyAST): BusyAnalysisResult {
    const organizations: OrganizationInfo[] = [];
    const teams: TeamInfo[] = [];
    const playbooks: PlaybookInfo[] = [];
    const roles: RoleInfo[] = [];
    const relationships: RelationshipInfo[] = [];
    const dependencies: DependencyInfo[] = [];
    
    // Extract entities from AST
    for (const [filePath, fileNode] of ast.files) {
      this.extractEntitiesFromFile(fileNode, {
        organizations,
        teams,
        playbooks,
        roles,
        relationships,
        dependencies
      });
    }
    
    // Calculate statistics
    const statistics = this.calculateStatistics({
      organizations,
      teams,
      playbooks,
      roles,
      relationships,
      dependencies
    });
    
    // Build relationships and dependencies
    this.extractRelationships({ 
      organizations, 
      teams, 
      playbooks, 
      roles, 
      relationships, 
      dependencies, 
      statistics 
    });
    this.detectDependencies({ 
      organizations, 
      teams, 
      playbooks, 
      roles, 
      relationships, 
      dependencies, 
      statistics 
    });
    
    return {
      organizations,
      teams,
      playbooks,
      roles,
      relationships,
      dependencies,
      statistics
    };
  }
  
  /**
   * Extract relationships between entities
   */
  extractRelationships(analysis: BusyAnalysisResult): void {
    // Clear existing relationships to rebuild
    analysis.relationships = [];
    
    // Team-Organization hierarchy
    analysis.teams.forEach(team => {
      const org = analysis.organizations.find(o => o.teams.includes(team.id));
      if (org) {
        analysis.relationships.push({
          id: `${org.id}->${team.id}`,
          type: 'hierarchy',
          source: org.id,
          target: team.id,
          description: `${team.name} belongs to ${org.name}`,
          metadata: { level: 1, relationship_type: 'contains' }
        });
      }
    });
    
    // Team-Playbook hierarchy
    analysis.playbooks.forEach(playbook => {
      const team = analysis.teams.find(t => t.id === playbook.team);
      if (team) {
        analysis.relationships.push({
          id: `${team.id}->${playbook.id}`,
          type: 'hierarchy',
          source: team.id,
          target: playbook.id,
          description: `${playbook.name} is executed by ${team.name}`,
          metadata: { level: 2, relationship_type: 'executes' }
        });
      }
    });
    
    // Team-Role hierarchy
    analysis.roles.forEach(role => {
      const team = analysis.teams.find(t => t.id === role.team);
      if (team) {
        analysis.relationships.push({
          id: `${team.id}->${role.id}`,
          type: 'hierarchy',
          source: team.id,
          target: role.id,
          description: `${role.name} is part of ${team.name}`,
          metadata: { level: 2, relationship_type: 'includes' }
        });
      }
    });
    
    // Role dependencies within playbooks
    analysis.playbooks.forEach(playbook => {
      playbook.steps.forEach(step => {
        step.dependencies.forEach(depStepId => {
          const depStep = playbook.steps.find(s => s.id === depStepId);
          if (depStep) {
            analysis.relationships.push({
              id: `${depStep.id}->${step.id}`,
              type: 'dependency',
              source: depStep.id,
              target: step.id,
              description: `${step.name} depends on ${depStep.name}`,
              metadata: { 
                playbook: playbook.id,
                dependency_type: 'sequential',
                critical: true
              }
            });
          }
        });
      });
    });
    
    // Communication relationships (from team interfaces)
    analysis.teams.forEach(team => {
      team.interfaces.internal.forEach(interfaceDesc => {
        // Parse internal interface descriptions to find team references
        const referencedTeams = this.extractTeamReferences(interfaceDesc, analysis.teams);
        referencedTeams.forEach(refTeam => {
          if (refTeam.id !== team.id) {
            analysis.relationships.push({
              id: `${team.id}<->${refTeam.id}`,
              type: 'communication',
              source: team.id,
              target: refTeam.id,
              description: interfaceDesc,
              metadata: { 
                interface_type: 'internal',
                bidirectional: true
              }
            });
          }
        });
      });
    });
  }
  
  /**
   * Detect dependencies between entities
   */
  detectDependencies(analysis: BusyAnalysisResult): void {
    // Import dependencies
    analysis.playbooks.forEach(playbook => {
      playbook.dependencies.forEach(dep => {
        const targetPlaybook = analysis.playbooks.find(p => p.name === dep || p.id === dep);
        if (targetPlaybook) {
          analysis.dependencies.push({
            id: `${playbook.id}->${targetPlaybook.id}`,
            source: playbook.id,
            target: targetPlaybook.id,
            type: 'imports',
            strength: 0.8,
            critical: true,
            description: `${playbook.name} imports from ${targetPlaybook.name}`
          });
        }
      });
    });
    
    // Role capability dependencies
    analysis.roles.forEach(role => {
      role.dependencies.forEach(dep => {
        const targetRole = analysis.roles.find(r => r.name === dep || r.id === dep);
        if (targetRole && targetRole.id !== role.id) {
          analysis.dependencies.push({
            id: `${role.id}->${targetRole.id}`,
            source: role.id,
            target: targetRole.id,
            type: 'requires',
            strength: 0.6,
            critical: false,
            description: `${role.name} requires capabilities from ${targetRole.name}`
          });
        }
      });
    });
    
    // Data flow dependencies (from step inputs/outputs)
    analysis.playbooks.forEach(playbook => {
      playbook.steps.forEach(step => {
        step.outputs.forEach(output => {
          // Find steps that use this output as input
          playbook.steps.forEach(otherStep => {
            if (otherStep.id !== step.id) {
              const usesOutput = otherStep.inputs.some(input => 
                input.name === output.name || 
                input.type === output.type
              );
              if (usesOutput) {
                analysis.dependencies.push({
                  id: `${step.id}->${otherStep.id}`,
                  source: step.id,
                  target: otherStep.id,
                  type: 'references',
                  strength: 0.7,
                  critical: output.required,
                  description: `${otherStep.name} uses output from ${step.name}`
                });
              }
            }
          });
        });
      });
    });
  }
  
  /**
   * Validate analysis structure
   */
  validateStructure(analysis: BusyAnalysisResult): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Check for orphaned entities
    analysis.teams.forEach(team => {
      const hasOrganization = analysis.organizations.some(org => org.teams.includes(team.id));
      if (!hasOrganization) {
        results.push({
          type: 'warning',
          message: `Team "${team.name}" is not associated with any organization`,
          element: team.id
        });
      }
    });
    
    analysis.playbooks.forEach(playbook => {
      const hasTeam = analysis.teams.some(team => team.id === playbook.team);
      if (!hasTeam) {
        results.push({
          type: 'error',
          message: `Playbook "${playbook.name}" references non-existent team`,
          sourceFile: playbook.sourceFile,
          element: playbook.id
        });
      }
    });
    
    // Check for circular dependencies
    const cycles = this.detectCircularDependencies(analysis.dependencies);
    cycles.forEach(cycle => {
      results.push({
        type: 'warning',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        element: cycle[0]
      });
    });
    
    return results;
  }
  
  /**
   * Watch files for changes
   */
  watchFiles(filePaths: string[], callback: (changes: FileChangeEvent[]) => void): void {
    this.watchCallbacks.push(callback);
    
    filePaths.forEach(filePath => {
      if (!this.fileWatchers.has(filePath)) {
        try {
          const watcher = fs.watch(filePath, (eventType) => {
            const change: FileChangeEvent = {
              type: eventType === 'rename' ? 'deleted' : 'modified',
              filePath,
              timestamp: new Date()
            };
            
            this.watchCallbacks.forEach(cb => cb([change]));
          });
          
          this.fileWatchers.set(filePath, watcher);
        } catch (error) {
          // File might not exist or be inaccessible, skip watching
        }
      }
    });
  }
  
  /**
   * Stop watching files
   */
  stopWatching(): void {
    this.fileWatchers.forEach(watcher => watcher.close());
    this.fileWatchers.clear();
    this.watchCallbacks = [];
  }
  
  // Private helper methods
  
  private async expandFilePaths(filePaths: string[]): Promise<string[]> {
    const expanded: string[] = [];
    
    for (const filePath of filePaths) {
      if (filePath.includes('*') || filePath.includes('?')) {
        // Glob pattern
        const matches = await glob(filePath);
        expanded.push(...matches);
      } else if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          // Directory - find all .busy files
          const matches = await glob(path.join(filePath, '**/*.busy'));
          expanded.push(...matches);
        } else {
          // Single file
          expanded.push(filePath);
        }
      }
    }
    
    return [...new Set(expanded)]; // Remove duplicates
  }
  
  private extractEntitiesFromFile(
    fileNode: BusyFileNode, 
    collections: {
      organizations: OrganizationInfo[];
      teams: TeamInfo[];
      playbooks: PlaybookInfo[];
      roles: RoleInfo[];
      relationships: RelationshipInfo[];
      dependencies: DependencyInfo[];
    }
  ): void {
    const { content } = fileNode;
    const layer = fileNode.metadata.layer as 'L0' | 'L1' | 'L2' || 'L0';
    
    switch (content.type) {
      case 'Team':
        this.extractTeamInfo(content as TeamNode, fileNode.filePath, layer, collections);
        break;
      case 'Role':
        this.extractRoleInfo(content as RoleNode, fileNode.filePath, layer, collections);
        break;
      case 'Playbook':
        this.extractPlaybookInfo(content as PlaybookNode, fileNode.filePath, layer, collections);
        break;
    }
  }
  
  private extractTeamInfo(
    teamNode: TeamNode, 
    sourceFile: string, 
    layer: 'L0' | 'L1' | 'L2',
    collections: any
  ): void {
    const teamId = this.generateId('team', teamNode.name, sourceFile);
    
    // Extract organization info
    const orgName = this.extractOrganizationFromPath(sourceFile);
    const orgId = this.generateId('organization', orgName, sourceFile);
    
    let organization = collections.organizations.find((o: OrganizationInfo) => o.id === orgId);
    if (!organization) {
      organization = {
        id: orgId,
        name: orgName,
        description: `${orgName} organization`,
        layer,
        teams: [],
        sourceFile
      };
      collections.organizations.push(organization);
    }
    
    // Add team to organization
    if (!organization.teams.includes(teamId)) {
      organization.teams.push(teamId);
    }
    
    const teamInfo: TeamInfo = {
      id: teamId,
      name: teamNode.name,
      description: teamNode.description,
      type: teamNode.teamType || 'stream-aligned',
      layer,
      organization: orgId,
      roles: [],
      playbooks: [],
      interfaces: {
        external: teamNode.interfaces?.external || [],
        internal: teamNode.interfaces?.internal || []
      },
      sourceFile
    };
    
    collections.teams.push(teamInfo);
  }
  
  private extractRoleInfo(
    roleNode: RoleNode, 
    sourceFile: string, 
    layer: 'L0' | 'L1' | 'L2',
    collections: any
  ): void {
    const roleId = this.generateId('role', roleNode.name, sourceFile);
    const teamId = this.extractTeamFromPath(sourceFile);
    
    const roleInfo: RoleInfo = {
      id: roleId,
      name: roleNode.name,
      description: roleNode.description,
      layer,
      team: teamId,
      responsibilities: roleNode.responsibilities || [],
      capabilities: roleNode.capabilities || [],
      dependencies: roleNode.dependencies || [],
      sourceFile
    };
    
    collections.roles.push(roleInfo);
    
    // Add role to team if team exists
    const team = collections.teams.find((t: TeamInfo) => t.id === teamId);
    if (team && !team.roles.includes(roleId)) {
      team.roles.push(roleId);
    }
  }
  
  private extractPlaybookInfo(
    playbookNode: PlaybookNode, 
    sourceFile: string, 
    layer: 'L0' | 'L1' | 'L2',
    collections: any
  ): void {
    const playbookId = this.generateId('playbook', playbookNode.name, sourceFile);
    const teamId = this.extractTeamFromPath(sourceFile);
    
    const steps: StepInfo[] = playbookNode.steps?.map((stepNode, index) => ({
      id: this.generateId('step', stepNode.name, sourceFile, index),
      name: stepNode.name,
      description: stepNode.description,
      type: stepNode.executionType || 'human',
      duration: stepNode.estimatedDuration || '30m',
      inputs: stepNode.inputs?.map(input => ({
        name: input.name,
        type: input.type,
        format: input.format || 'json',
        required: input.required !== false,
        description: input.description
      })) || [],
      outputs: stepNode.outputs?.map(output => ({
        name: output.name,
        type: output.type,
        format: output.format || 'json',
        required: output.required !== false,
        description: output.description
      })) || [],
      dependencies: stepNode.dependencies || []
    })) || [];
    
    const playbookInfo: PlaybookInfo = {
      id: playbookId,
      name: playbookNode.name,
      description: playbookNode.description,
      layer,
      team: teamId,
      steps,
      inputs: playbookNode.inputs?.map(input => ({
        name: input.name,
        type: input.type,
        format: input.format || 'json',
        required: input.required !== false,
        description: input.description
      })) || [],
      outputs: playbookNode.outputs?.map(output => ({
        name: output.name,
        type: output.type,
        format: output.format || 'json',
        required: output.required !== false,
        description: output.description
      })) || [],
      dependencies: playbookNode.imports?.map(imp => imp.tool || imp.advisor || '') || [],
      sourceFile
    };
    
    collections.playbooks.push(playbookInfo);
    
    // Add playbook to team if team exists
    const team = collections.teams.find((t: TeamInfo) => t.id === teamId);
    if (team && !team.playbooks.includes(playbookId)) {
      team.playbooks.push(playbookId);
    }
  }
  
  private calculateStatistics(data: Partial<BusyAnalysisResult>): AnalysisStatistics {
    const layerDistribution: Record<string, number> = {};
    
    [
      ...(data.organizations || []),
      ...(data.teams || []),
      ...(data.playbooks || []),
      ...(data.roles || [])
    ].forEach(entity => {
      const layer = (entity as any).layer || 'L0';
      layerDistribution[layer] = (layerDistribution[layer] || 0) + 1;
    });
    
    return {
      totalFiles: new Set([
        ...(data.organizations || []).map(o => o.sourceFile),
        ...(data.teams || []).map(t => t.sourceFile),
        ...(data.playbooks || []).map(p => p.sourceFile),
        ...(data.roles || []).map(r => r.sourceFile)
      ]).size,
      totalOrganizations: (data.organizations || []).length,
      totalTeams: (data.teams || []).length,
      totalPlaybooks: (data.playbooks || []).length,
      totalRoles: (data.roles || []).length,
      totalSteps: (data.playbooks || []).reduce((sum, p) => sum + p.steps.length, 0),
      totalDependencies: (data.dependencies || []).length,
      cyclicDependencies: this.detectCircularDependencies(data.dependencies || []).length,
      layerDistribution
    };
  }
  
  private generateId(type: string, name: string, sourceFile: string, index?: number): string {
    const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filePart = path.basename(sourceFile, '.busy');
    const suffix = index !== undefined ? `-${index}` : '';
    return `${type}-${filePart}-${baseName}${suffix}`;
  }
  
  private extractOrganizationFromPath(filePath: string): string {
    const parts = filePath.split(path.sep);
    const examplesIndex = parts.findIndex(p => p === 'examples');
    if (examplesIndex >= 0 && examplesIndex < parts.length - 1) {
      return parts[examplesIndex + 1];
    }
    return 'default-organization';
  }
  
  private extractTeamFromPath(filePath: string): string {
    const parts = filePath.split(path.sep);
    // Look for team folder pattern (usually after L0/L1/L2)
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].match(/^L[012]$/)) {
        return this.generateId('team', parts[i + 1] || 'default-team', filePath);
      }
    }
    return this.generateId('team', 'default-team', filePath);
  }
  
  private extractTeamReferences(interfaceDesc: string, teams: TeamInfo[]): TeamInfo[] {
    const references: TeamInfo[] = [];
    teams.forEach(team => {
      if (interfaceDesc.toLowerCase().includes(team.name.toLowerCase())) {
        references.push(team);
      }
    });
    return references;
  }
  
  private detectCircularDependencies(dependencies: DependencyInfo[]): string[][] {
    const graph = new Map<string, string[]>();
    const cycles: string[][] = [];
    
    // Build adjacency list
    dependencies.forEach(dep => {
      if (!graph.has(dep.source)) {
        graph.set(dep.source, []);
      }
      graph.get(dep.source)!.push(dep.target);
    });
    
    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];
    
    const dfs = (node: string): boolean => {
      if (recursionStack.has(node)) {
        // Found cycle
        const cycleStart = currentPath.indexOf(node);
        if (cycleStart >= 0) {
          cycles.push([...currentPath.slice(cycleStart), node]);
        }
        return true;
      }
      
      if (visited.has(node)) {
        return false;
      }
      
      visited.add(node);
      recursionStack.add(node);
      currentPath.push(node);
      
      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) {
          // Cycle found in subtree
        }
      }
      
      recursionStack.delete(node);
      currentPath.pop();
      return false;
    };
    
    // Check all nodes
    for (const [node] of graph) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
    
    return cycles;
  }
}