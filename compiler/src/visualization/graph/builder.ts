/**
 * Graph Builder for BUSY File Visualization
 * Converts analysis results into visualization graphs
 */

import type {
  IGraphBuilder,
  ValidationResult
} from '../core/interfaces';
import type {
  BusyAnalysisResult,
  VisualizationType,
  VisualizationNode,
  VisualizationEdge,
  NodeType,
  EdgeType
} from '../core/types';
import { VisualizationGraphModel } from './model';
import { DEFAULT_NODE_STYLES, DEFAULT_EDGE_STYLES } from '../core/constants';

export class GraphBuilder implements IGraphBuilder {
  
  /**
   * Build a visualization graph from analysis results
   */
  buildGraph(analysis: BusyAnalysisResult, type: VisualizationType): VisualizationGraphModel {
    const graph = new VisualizationGraphModel(
      `BUSY ${type} Visualization`,
      `Visualization of BUSY file structure - ${type} view`
    );
    
    // Set source files in metadata
    graph.metadata.sourceFiles = this.extractSourceFiles(analysis);
    
    switch (type) {
      case 'organizational-overview':
        return this.buildOrganizationalOverview(analysis, graph);
      case 'playbook-detail':
        return this.buildPlaybookDetail(analysis, graph);
      case 'role-interaction':
        return this.buildRoleInteraction(analysis, graph);
      case 'resource-flow':
        return this.buildResourceFlow(analysis, graph);
      case 'dependency-graph':
        return this.buildDependencyGraph(analysis, graph);
      default:
        throw new Error(`Unsupported visualization type: ${type}`);
    }
  }
  
  /**
   * Update existing graph with changes
   */
  updateGraph(graph: VisualizationGraphModel, changes: any[]): VisualizationGraphModel {
    // For now, rebuild the entire graph
    // In the future, this could be optimized for incremental updates
    return graph;
  }
  
  /**
   * Validate graph structure
   */
  validateGraph(graph: VisualizationGraphModel): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Check for orphaned nodes
    for (const node of graph.nodes.values()) {
      const connectedEdges = graph.getConnectedEdges(node.id);
      if (connectedEdges.length === 0 && graph.nodes.size > 1) {
        results.push({
          type: 'warning',
          message: `Node "${node.label}" has no connections`,
          element: node.id
        });
      }
    }
    
    // Check for invalid edges
    for (const edge of graph.edges.values()) {
      if (!graph.getNode(edge.source)) {
        results.push({
          type: 'error',
          message: `Edge "${edge.id}" references non-existent source node "${edge.source}"`,
          element: edge.id
        });
      }
      
      if (!graph.getNode(edge.target)) {
        results.push({
          type: 'error',
          message: `Edge "${edge.id}" references non-existent target node "${edge.target}"`,
          element: edge.id
        });
      }
    }
    
    // Check for cycles in hierarchical structures
    const hierarchicalEdges = graph.getEdgesByType('hierarchy');
    if (hierarchicalEdges.length > 0) {
      const cycles = graph.detectCycles();
      cycles.forEach((cycle, index) => {
        results.push({
          type: 'warning',
          message: `Hierarchical cycle detected: ${cycle.map(n => n.label).join(' -> ')}`,
          element: cycle[0]?.id
        });
      });
    }
    
    return results;
  }
  
  /**
   * Optimize graph for better visualization
   */
  optimizeGraph(graph: VisualizationGraphModel): VisualizationGraphModel {
    const optimized = graph.clone();
    
    // Remove redundant edges
    this.removeRedundantEdges(optimized);
    
    // Merge similar nodes if appropriate
    this.mergeSimilarNodes(optimized);
    
    // Optimize layout hints
    this.addLayoutHints(optimized);
    
    return optimized;
  }
  
  // ====================
  // Specialized Graph Builders
  // ====================
  
  private buildOrganizationalOverview(
    analysis: BusyAnalysisResult, 
    graph: VisualizationGraphModel
  ): VisualizationGraphModel {
    // Add organization nodes
    analysis.organizations.forEach(org => {
      const node = this.createOrganizationNode(org);
      graph.addNode(node);
    });
    
    // Add team nodes
    analysis.teams.forEach(team => {
      const node = this.createTeamNode(team);
      graph.addNode(node);
    });
    
    // Add playbook nodes (summarized)
    analysis.playbooks.forEach(playbook => {
      const node = this.createPlaybookNode(playbook);
      graph.addNode(node);
    });
    
    // Add role nodes (summarized)
    analysis.roles.forEach(role => {
      const node = this.createRoleNode(role);
      graph.addNode(node);
    });
    
    // Add hierarchical relationships
    this.addHierarchicalEdges(analysis, graph);
    
    // Add key dependency relationships
    this.addKeyDependencyEdges(analysis, graph);
    
    return graph;
  }
  
  private buildPlaybookDetail(
    analysis: BusyAnalysisResult, 
    graph: VisualizationGraphModel
  ): VisualizationGraphModel {
    // For now, show all playbooks with detailed step information
    analysis.playbooks.forEach(playbook => {
      // Add playbook node
      const playbookNode = this.createPlaybookNode(playbook);
      graph.addNode(playbookNode);
      
      // Add step nodes
      playbook.steps.forEach(step => {
        const stepNode = this.createStepNode(step, playbook.id);
        graph.addNode(stepNode);
        
        // Connect playbook to step
        const edge = this.createHierarchyEdge(
          playbook.id,
          step.id,
          `${playbook.name} contains ${step.name}`
        );
        graph.addEdge(edge);
      });
      
      // Add step dependencies
      playbook.steps.forEach(step => {
        step.dependencies.forEach(depStepId => {
          const depStep = playbook.steps.find(s => s.id === depStepId);
          if (depStep) {
            const edge = this.createDependencyEdge(
              depStep.id,
              step.id,
              `${step.name} depends on ${depStep.name}`
            );
            graph.addEdge(edge);
          }
        });
      });
    });
    
    // Add data flow edges
    this.addDataFlowEdges(analysis, graph);
    
    return graph;
  }
  
  private buildRoleInteraction(
    analysis: BusyAnalysisResult, 
    graph: VisualizationGraphModel
  ): VisualizationGraphModel {
    // Add role nodes
    analysis.roles.forEach(role => {
      const node = this.createRoleNode(role);
      graph.addNode(node);
    });
    
    // Add role interaction edges
    analysis.relationships
      .filter(rel => rel.type === 'communication')
      .forEach(rel => {
        const edge = this.createCommunicationEdge(
          rel.source,
          rel.target,
          rel.description || 'Communication'
        );
        graph.addEdge(edge);
      });
    
    // Add role dependency edges
    analysis.dependencies
      .filter(dep => dep.type === 'requires')
      .forEach(dep => {
        const edge = this.createDependencyEdge(
          dep.source,
          dep.target,
          dep.description || 'Dependency'
        );
        graph.addEdge(edge);
      });
    
    return graph;
  }
  
  private buildResourceFlow(
    analysis: BusyAnalysisResult, 
    graph: VisualizationGraphModel
  ): VisualizationGraphModel {
    // Add team nodes as resource processors
    analysis.teams.forEach(team => {
      const node = this.createTeamNode(team);
      graph.addNode(node);
    });
    
    // Add playbook nodes as resource transformers
    analysis.playbooks.forEach(playbook => {
      const node = this.createPlaybookNode(playbook);
      graph.addNode(node);
    });
    
    // Add resource flow edges based on inputs/outputs
    analysis.playbooks.forEach(playbook => {
      // Connect team to playbook (resource allocation)
      const team = analysis.teams.find(t => t.id === playbook.team);
      if (team) {
        const edge = this.createResourceFlowEdge(
          team.id,
          playbook.id,
          'Resource allocation'
        );
        graph.addEdge(edge);
      }
      
      // Connect playbooks based on data flow
      playbook.outputs.forEach(output => {
        analysis.playbooks.forEach(otherPlaybook => {
          if (otherPlaybook.id !== playbook.id) {
            const usesOutput = otherPlaybook.inputs.some(input => 
              input.name === output.name || input.type === output.type
            );
            if (usesOutput) {
              const edge = this.createResourceFlowEdge(
                playbook.id,
                otherPlaybook.id,
                `${output.name} flow`
              );
              graph.addEdge(edge);
            }
          }
        });
      });
    });
    
    return graph;
  }
  
  private buildDependencyGraph(
    analysis: BusyAnalysisResult, 
    graph: VisualizationGraphModel
  ): VisualizationGraphModel {
    // Add all entity nodes
    analysis.organizations.forEach(org => graph.addNode(this.createOrganizationNode(org)));
    analysis.teams.forEach(team => graph.addNode(this.createTeamNode(team)));
    analysis.playbooks.forEach(playbook => graph.addNode(this.createPlaybookNode(playbook)));
    analysis.roles.forEach(role => graph.addNode(this.createRoleNode(role)));
    
    // Add all dependency edges
    analysis.dependencies.forEach(dep => {
      const edge = this.createDependencyEdge(
        dep.source,
        dep.target,
        dep.description || 'Dependency',
        dep.critical
      );
      graph.addEdge(edge);
    });
    
    // Add relationship edges that represent dependencies
    analysis.relationships
      .filter(rel => rel.type === 'dependency')
      .forEach(rel => {
        const edge = this.createDependencyEdge(
          rel.source,
          rel.target,
          rel.description || 'Relationship dependency'
        );
        graph.addEdge(edge);
      });
    
    return graph;
  }
  
  // ====================
  // Node Creation Helpers
  // ====================
  
  private createOrganizationNode(org: any): VisualizationNode {
    return {
      id: org.id,
      type: 'organization' as NodeType,
      label: org.name,
      style: { ...DEFAULT_NODE_STYLES.organization },
      visible: true,
      selected: false,
      highlighted: false,
      level: 0,
      children: org.teams,
      metadata: {
        description: org.description,
        layer: org.layer,
        sourceFile: org.sourceFile,
        teamCount: org.teams.length
      }
    };
  }
  
  private createTeamNode(team: any): VisualizationNode {
    return {
      id: team.id,
      type: 'team' as NodeType,
      label: team.name,
      style: { ...DEFAULT_NODE_STYLES.team },
      visible: true,
      selected: false,
      highlighted: false,
      level: 1,
      parent: team.organization,
      children: [...team.roles, ...team.playbooks],
      metadata: {
        description: team.description,
        teamType: team.type,
        layer: team.layer,
        sourceFile: team.sourceFile,
        interfaces: team.interfaces,
        roleCount: team.roles.length,
        playbookCount: team.playbooks.length
      }
    };
  }
  
  private createPlaybookNode(playbook: any): VisualizationNode {
    return {
      id: playbook.id,
      type: 'playbook' as NodeType,
      label: playbook.name,
      style: { ...DEFAULT_NODE_STYLES.playbook },
      visible: true,
      selected: false,
      highlighted: false,
      level: 2,
      parent: playbook.team,
      children: playbook.steps.map((s: any) => s.id),
      metadata: {
        description: playbook.description,
        layer: playbook.layer,
        sourceFile: playbook.sourceFile,
        stepCount: playbook.steps.length,
        inputCount: playbook.inputs.length,
        outputCount: playbook.outputs.length,
        dependencies: playbook.dependencies
      }
    };
  }
  
  private createRoleNode(role: any): VisualizationNode {
    return {
      id: role.id,
      type: 'role' as NodeType,
      label: role.name,
      style: { ...DEFAULT_NODE_STYLES.role },
      visible: true,
      selected: false,
      highlighted: false,
      level: 2,
      parent: role.team,
      metadata: {
        description: role.description,
        layer: role.layer,
        sourceFile: role.sourceFile,
        responsibilities: role.responsibilities,
        capabilities: role.capabilities,
        dependencies: role.dependencies
      }
    };
  }
  
  private createStepNode(step: any, playbookId: string): VisualizationNode {
    return {
      id: step.id,
      type: 'step' as NodeType,
      label: step.name,
      style: { ...DEFAULT_NODE_STYLES.step },
      visible: true,
      selected: false,
      highlighted: false,
      level: 3,
      parent: playbookId,
      metadata: {
        description: step.description,
        executionType: step.type,
        duration: step.duration,
        inputCount: step.inputs.length,
        outputCount: step.outputs.length,
        dependencies: step.dependencies
      }
    };
  }
  
  // ====================
  // Edge Creation Helpers
  // ====================
  
  private createHierarchyEdge(
    sourceId: string, 
    targetId: string, 
    label?: string
  ): VisualizationEdge {
    return {
      id: `hierarchy-${sourceId}-${targetId}`,
      type: 'hierarchy' as EdgeType,
      source: sourceId,
      target: targetId,
      label,
      style: { ...DEFAULT_EDGE_STYLES.hierarchy },
      visible: true,
      selected: false,
      highlighted: false,
      bidirectional: false,
      weight: 1.0,
      metadata: {
        relationship: 'contains'
      }
    };
  }
  
  private createDependencyEdge(
    sourceId: string, 
    targetId: string, 
    label?: string,
    critical: boolean = false
  ): VisualizationEdge {
    return {
      id: `dependency-${sourceId}-${targetId}`,
      type: 'dependency' as EdgeType,
      source: sourceId,
      target: targetId,
      label,
      style: { 
        ...DEFAULT_EDGE_STYLES.dependency,
        strokeWidth: critical ? 2 : 1.5,
        stroke: critical ? '#dc2626' : '#ef4444'
      },
      visible: true,
      selected: false,
      highlighted: false,
      bidirectional: false,
      weight: critical ? 1.0 : 0.7,
      metadata: {
        critical,
        relationship: 'depends_on'
      }
    };
  }
  
  private createCommunicationEdge(
    sourceId: string, 
    targetId: string, 
    label?: string
  ): VisualizationEdge {
    return {
      id: `communication-${sourceId}-${targetId}`,
      type: 'communication' as EdgeType,
      source: sourceId,
      target: targetId,
      label,
      style: { ...DEFAULT_EDGE_STYLES.communication },
      visible: true,
      selected: false,
      highlighted: false,
      bidirectional: true,
      weight: 0.6,
      metadata: {
        relationship: 'communicates_with'
      }
    };
  }
  
  private createDataFlowEdge(
    sourceId: string, 
    targetId: string, 
    label?: string
  ): VisualizationEdge {
    return {
      id: `dataflow-${sourceId}-${targetId}`,
      type: 'data_flow' as EdgeType,
      source: sourceId,
      target: targetId,
      label,
      style: { ...DEFAULT_EDGE_STYLES.data_flow },
      visible: true,
      selected: false,
      highlighted: false,
      bidirectional: false,
      weight: 0.8,
      metadata: {
        relationship: 'provides_data_to'
      }
    };
  }
  
  private createResourceFlowEdge(
    sourceId: string, 
    targetId: string, 
    label?: string
  ): VisualizationEdge {
    return {
      id: `resourceflow-${sourceId}-${targetId}`,
      type: 'resource_flow' as EdgeType,
      source: sourceId,
      target: targetId,
      label,
      style: { ...DEFAULT_EDGE_STYLES.resource_flow },
      visible: true,
      selected: false,
      highlighted: false,
      bidirectional: false,
      weight: 0.9,
      metadata: {
        relationship: 'provides_resources_to'
      }
    };
  }
  
  // ====================
  // Relationship Building Helpers
  // ====================
  
  private addHierarchicalEdges(analysis: BusyAnalysisResult, graph: VisualizationGraphModel): void {
    // Organization -> Team edges
    analysis.organizations.forEach(org => {
      org.teams.forEach(teamId => {
        const team = analysis.teams.find(t => t.id === teamId);
        if (team) {
          const edge = this.createHierarchyEdge(
            org.id,
            team.id,
            `${org.name} contains ${team.name}`
          );
          graph.addEdge(edge);
        }
      });
    });
    
    // Team -> Playbook edges
    analysis.playbooks.forEach(playbook => {
      const team = analysis.teams.find(t => t.id === playbook.team);
      if (team) {
        const edge = this.createHierarchyEdge(
          team.id,
          playbook.id,
          `${team.name} executes ${playbook.name}`
        );
        graph.addEdge(edge);
      }
    });
    
    // Team -> Role edges
    analysis.roles.forEach(role => {
      const team = analysis.teams.find(t => t.id === role.team);
      if (team) {
        const edge = this.createHierarchyEdge(
          team.id,
          role.id,
          `${team.name} includes ${role.name}`
        );
        graph.addEdge(edge);
      }
    });
  }
  
  private addKeyDependencyEdges(analysis: BusyAnalysisResult, graph: VisualizationGraphModel): void {
    // Only add critical dependencies to avoid clutter
    analysis.dependencies
      .filter(dep => dep.critical)
      .forEach(dep => {
        const edge = this.createDependencyEdge(
          dep.source,
          dep.target,
          dep.description,
          dep.critical
        );
        graph.addEdge(edge);
      });
  }
  
  private addDataFlowEdges(analysis: BusyAnalysisResult, graph: VisualizationGraphModel): void {
    analysis.playbooks.forEach(playbook => {
      playbook.steps.forEach(step => {
        step.outputs.forEach(output => {
          // Find other steps that use this output
          playbook.steps.forEach(otherStep => {
            if (otherStep.id !== step.id) {
              const usesOutput = otherStep.inputs.some(input => 
                input.name === output.name || input.type === output.type
              );
              if (usesOutput) {
                const edge = this.createDataFlowEdge(
                  step.id,
                  otherStep.id,
                  output.name
                );
                graph.addEdge(edge);
              }
            }
          });
        });
      });
    });
  }
  
  // ====================
  // Graph Optimization Helpers
  // ====================
  
  private removeRedundantEdges(graph: VisualizationGraphModel): void {
    // Remove transitive edges in hierarchical structures
    const hierarchicalEdges = graph.getEdgesByType('hierarchy');
    const toRemove: string[] = [];
    
    for (const edge of hierarchicalEdges) {
      // Check if there's a longer path between source and target
      const path = graph.findPath(edge.source, edge.target, 5);
      if (path.length > 2) {
        // There's an indirect path, this edge might be redundant
        toRemove.push(edge.id);
      }
    }
    
    toRemove.forEach(edgeId => graph.removeEdge(edgeId));
  }
  
  private mergeSimilarNodes(graph: VisualizationGraphModel): void {
    // For now, don't merge nodes - keep them distinct for clarity
    // This could be implemented later for large graphs
  }
  
  private addLayoutHints(graph: VisualizationGraphModel): void {
    // Add level information for hierarchical layouts
    for (const node of graph.nodes.values()) {
      if (node.level === undefined) {
        // Calculate level based on hierarchical edges
        const incomingHierarchy = graph.getConnectedEdges(node.id, 'incoming')
          .filter(e => e.type === 'hierarchy');
        
        if (incomingHierarchy.length === 0) {
          node.level = 0; // Root node
        } else {
          // Level is one more than parent's level
          const parentLevels = incomingHierarchy
            .map(e => graph.getNode(e.source)?.level || 0);
          node.level = Math.max(...parentLevels) + 1;
        }
      }
    }
  }
  
  // ====================
  // Utility Methods
  // ====================
  
  private extractSourceFiles(analysis: BusyAnalysisResult): string[] {
    const sourceFiles = new Set<string>();
    
    analysis.organizations.forEach(org => sourceFiles.add(org.sourceFile));
    analysis.teams.forEach(team => sourceFiles.add(team.sourceFile));
    analysis.playbooks.forEach(playbook => sourceFiles.add(playbook.sourceFile));
    analysis.roles.forEach(role => sourceFiles.add(role.sourceFile));
    
    return Array.from(sourceFiles);
  }
}