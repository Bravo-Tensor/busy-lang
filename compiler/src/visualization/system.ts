/**
 * Main BUSY File Visualization System
 * Orchestrates all components to provide a complete visualization solution
 */

import type {
  IVisualizationSystem,
  IOrganizationalView
} from './core/interfaces';
import type {
  VisualizationConfig,
  VisualizationType,
  BusyAnalysisResult,
  SerializedGraph,
  ExportOptions,
  PerformanceMetrics,
  InteractionEvent,
  SelectionState,
  Viewport,
  VisualizationNode,
  VisualizationEdge
} from './core/types';
import { VisualizationGraphModel } from './graph/model';
import { GraphBuilder } from './graph/builder';
import { BusyAnalyzer } from './graph/analyzer';
import { LayoutEngine } from './layout/engine';
import { SVGRenderer } from './render/svg-renderer';
import { CompilerIntegration } from './integration/compiler';
import { 
  DEFAULT_THEME, 
  DEFAULT_VIEWPORT, 
  DEFAULT_FILTERS,
  EVENTS
} from './core/constants';

export class VisualizationSystem implements IVisualizationSystem, IOrganizationalView {
  private config: VisualizationConfig;
  private graph: VisualizationGraphModel | null = null;
  private analysis: BusyAnalysisResult | null = null;
  
  // Core components
  private analyzer: BusyAnalyzer;
  private graphBuilder: GraphBuilder;
  private layoutEngine: LayoutEngine;
  private renderer: SVGRenderer;
  private compilerIntegration: CompilerIntegration;
  
  // State management
  private viewport: Viewport = { ...DEFAULT_VIEWPORT };
  private selection: SelectionState = {
    selectedNodes: new Set(),
    selectedEdges: new Set(),
    multiSelect: false
  };
  
  // Event system
  private eventListeners: Map<string, Function[]> = new Map();
  
  // Performance tracking
  private performanceMetrics: PerformanceMetrics = {
    parseTime: 0,
    analysisTime: 0,
    layoutTime: 0,
    renderTime: 0,
    totalTime: 0,
    memoryUsage: 0,
    nodeCount: 0,
    edgeCount: 0
  };
  
  constructor(config?: Partial<VisualizationConfig>) {
    // Initialize default configuration
    this.config = {
      type: 'organizational-overview',
      layout: {
        type: 'hierarchical',
        animate: true,
        duration: 500
      },
      theme: DEFAULT_THEME,
      filters: { ...DEFAULT_FILTERS },
      interactive: true,
      showLabels: true,
      showMetadata: false,
      ...config
    };
    
    // Initialize components
    this.analyzer = new BusyAnalyzer();
    this.graphBuilder = new GraphBuilder();
    this.layoutEngine = new LayoutEngine();
    this.renderer = new SVGRenderer();
    this.compilerIntegration = new CompilerIntegration();
    
    // Setup renderer interactions
    this.renderer.onInteraction(this.handleInteraction.bind(this));
  }
  
  // ====================
  // Core System Interface
  // ====================
  
  /**
   * Configure the visualization system
   */
  configure(config: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit(EVENTS.CONFIGURATION_CHANGED, this.config);
  }
  
  /**
   * Get current configuration
   */
  getConfig(): VisualizationConfig {
    return { ...this.config };
  }
  
  /**
   * Load visualization from BUSY files
   */
  async loadFromFiles(filePaths: string[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.emit(EVENTS.FILES_LOADED, { files: filePaths });
      
      // Parse and analyze files
      const parseStart = Date.now();
      this.analysis = await this.analyzer.analyzeFiles(filePaths);
      this.performanceMetrics.parseTime = Date.now() - parseStart;
      
      this.emit(EVENTS.ANALYSIS_COMPLETE, this.analysis);
      
      // Build graph
      await this.buildGraphFromAnalysis();
      
      this.performanceMetrics.totalTime = Date.now() - startTime;
      this.updatePerformanceMetrics();
      
    } catch (error) {
      this.emit(EVENTS.ERROR, {
        type: 'load',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  /**
   * Load visualization from analysis results
   */
  async loadFromAnalysis(analysis: BusyAnalysisResult): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.analysis = analysis;
      this.emit(EVENTS.ANALYSIS_COMPLETE, this.analysis);
      
      await this.buildGraphFromAnalysis();
      
      this.performanceMetrics.totalTime = Date.now() - startTime;
      this.updatePerformanceMetrics();
      
    } catch (error) {
      this.emit(EVENTS.ERROR, {
        type: 'load',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  /**
   * Refresh the visualization
   */
  async refresh(): Promise<void> {
    if (this.analysis) {
      await this.buildGraphFromAnalysis();
    }
  }
  
  /**
   * Get the current graph
   */
  getGraph(): VisualizationGraphModel {
    if (!this.graph) {
      throw new Error('No graph loaded. Call loadFromFiles() or loadFromAnalysis() first.');
    }
    return this.graph;
  }
  
  /**
   * Get all nodes
   */
  getNodes(): VisualizationNode[] {
    return this.graph ? Array.from(this.graph.nodes.values()) : [];
  }
  
  /**
   * Get all edges
   */
  getEdges(): VisualizationEdge[] {
    return this.graph ? Array.from(this.graph.edges.values()) : [];
  }
  
  /**
   * Render the visualization
   */
  render(container: any): void {
    if (!this.graph) {
      throw new Error('No graph to render. Load data first.');
    }
    
    const renderStart = Date.now();
    
    try {
      this.renderer.render(this.graph, container);
      this.performanceMetrics.renderTime = Date.now() - renderStart;
      
      this.emit(EVENTS.RENDER_COMPLETE, {
        nodeCount: this.graph.nodes.size,
        edgeCount: this.graph.edges.size
      });
      
    } catch (error) {
      this.emit(EVENTS.RENDER_ERROR, {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  /**
   * Update visualization type
   */
  async updateVisualization(type: VisualizationType): Promise<void> {
    if (!this.analysis) {
      throw new Error('No analysis data available');
    }
    
    this.config.type = type;
    await this.buildGraphFromAnalysis();
  }
  
  // ====================
  // Viewport Management
  // ====================
  
  /**
   * Set viewport
   */
  setViewport(viewport: Viewport): void {
    this.viewport = { ...viewport };
    this.renderer.setViewport(this.viewport);
    this.emit(EVENTS.VIEWPORT_CHANGED, this.viewport);
  }
  
  /**
   * Get current viewport
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }
  
  /**
   * Zoom to fit all content
   */
  zoomToFit(): void {
    if (!this.graph) return;
    
    // Calculate bounds of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const node of this.graph.nodes.values()) {
      if (node.position) {
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxY = Math.max(maxY, node.position.y);
      }
    }
    
    if (isFinite(minX) && isFinite(maxX) && isFinite(minY) && isFinite(maxY)) {
      const padding = 100;
      const viewport: Viewport = {
        center: { x: 0, y: 0 },
        scale: 1,
        bounds: {
          x: minX - padding,
          y: minY - padding,
          width: maxX - minX + 2 * padding,
          height: maxY - minY + 2 * padding
        }
      };
      
      this.setViewport(viewport);
    }
  }
  
  /**
   * Zoom to specific node
   */
  zoomToNode(nodeId: string): void {
    const node = this.graph?.getNode(nodeId);
    if (!node || !node.position) return;
    
    const viewport: Viewport = {
      center: { x: -node.position.x, y: -node.position.y },
      scale: 2,
      bounds: {
        x: node.position.x - 200,
        y: node.position.y - 200,
        width: 400,
        height: 400
      }
    };
    
    this.setViewport(viewport);
  }
  
  // ====================
  // Selection Management
  // ====================
  
  /**
   * Select a node
   */
  selectNode(nodeId: string, addToSelection: boolean = false): void {
    if (!addToSelection) {
      this.clearSelection();
    }
    
    this.selection.selectedNodes.add(nodeId);
    this.selection.lastSelected = nodeId;
    
    // Update visual state
    const node = this.graph?.getNode(nodeId);
    if (node) {
      node.selected = true;
    }
    
    this.renderer.highlightNodes([nodeId]);
    this.emit(EVENTS.SELECTION_CHANGED, this.selection);
  }
  
  /**
   * Select an edge
   */
  selectEdge(edgeId: string, addToSelection: boolean = false): void {
    if (!addToSelection) {
      this.clearSelection();
    }
    
    this.selection.selectedEdges.add(edgeId);
    this.selection.lastSelected = edgeId;
    
    // Update visual state
    const edge = this.graph?.getEdge(edgeId);
    if (edge) {
      edge.selected = true;
    }
    
    this.renderer.highlightEdges([edgeId]);
    this.emit(EVENTS.SELECTION_CHANGED, this.selection);
  }
  
  /**
   * Clear all selections
   */
  clearSelection(): void {
    // Update node states
    this.selection.selectedNodes.forEach(nodeId => {
      const node = this.graph?.getNode(nodeId);
      if (node) {
        node.selected = false;
      }
    });
    
    // Update edge states
    this.selection.selectedEdges.forEach(edgeId => {
      const edge = this.graph?.getEdge(edgeId);
      if (edge) {
        edge.selected = false;
      }
    });
    
    this.selection.selectedNodes.clear();
    this.selection.selectedEdges.clear();
    this.selection.lastSelected = undefined;
    
    this.renderer.clearHighlights();
    this.emit(EVENTS.SELECTION_CHANGED, this.selection);
  }
  
  /**
   * Get current selection
   */
  getSelection(): SelectionState {
    return {
      selectedNodes: new Set(this.selection.selectedNodes),
      selectedEdges: new Set(this.selection.selectedEdges),
      lastSelected: this.selection.lastSelected,
      multiSelect: this.selection.multiSelect
    };
  }
  
  // ====================
  // Organizational View Implementation
  // ====================
  
  /**
   * Show specific organization
   */
  showOrganization(organizationId: string): void {
    this.config.filters.organizations = [organizationId];
    this.applyFilters();
  }
  
  /**
   * Expand team to show more details
   */
  expandTeam(teamId: string): void {
    // Implementation would show roles and playbooks for the team
    console.log(`Expanding team: ${teamId}`);
  }
  
  /**
   * Collapse team to hide details
   */
  collapseTeam(teamId: string): void {
    // Implementation would hide roles and playbooks for the team
    console.log(`Collapsing team: ${teamId}`);
  }
  
  /**
   * Show/hide playbooks
   */
  showPlaybooks(show: boolean): void {
    if (show) {
      if (!this.config.filters.nodeTypes?.includes('playbook')) {
        this.config.filters.nodeTypes?.push('playbook');
      }
    } else {
      this.config.filters.nodeTypes = this.config.filters.nodeTypes?.filter(t => t !== 'playbook');
    }
    this.applyFilters();
  }
  
  /**
   * Show/hide roles
   */
  showRoles(show: boolean): void {
    if (show) {
      if (!this.config.filters.nodeTypes?.includes('role')) {
        this.config.filters.nodeTypes?.push('role');
      }
    } else {
      this.config.filters.nodeTypes = this.config.filters.nodeTypes?.filter(t => t !== 'role');
    }
    this.applyFilters();
  }
  
  /**
   * Highlight dependencies for an element
   */
  highlightDependencies(elementId: string): void {
    if (!this.graph) return;
    
    const connectedEdges = this.graph.getConnectedEdges(elementId);
    const dependencyEdges = connectedEdges.filter(e => e.type === 'dependency');
    const dependencyNodes = new Set<string>();
    
    dependencyEdges.forEach(edge => {
      dependencyNodes.add(edge.source);
      dependencyNodes.add(edge.target);
    });
    
    this.renderer.highlightNodes(Array.from(dependencyNodes));
    this.renderer.highlightEdges(dependencyEdges.map(e => e.id));
  }
  
  /**
   * Filter by layers
   */
  filterByLayer(layers: ('L0' | 'L1' | 'L2')[]): void {
    this.config.filters.layers = layers;
    this.applyFilters();
  }
  
  // ====================
  // Export Functionality
  // ====================
  
  /**
   * Export graph visualization
   */
  async exportGraph(options: ExportOptions): Promise<Blob> {
    switch (options.format) {
      case 'svg':
        const svgString = this.renderer.exportSVG();
        return new Blob([svgString], { type: 'image/svg+xml' });
        
      case 'png':
      case 'jpeg':
        return this.renderer.exportCanvas(options);
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }
  
  /**
   * Export graph data
   */
  exportData(): SerializedGraph {
    if (!this.graph) {
      throw new Error('No graph to export');
    }
    
    return this.graph.toJSON();
  }
  
  /**
   * Import graph data
   */
  async importData(data: SerializedGraph): Promise<void> {
    this.graph = VisualizationGraphModel.fromJSON(data);
    
    if (this.graph) {
      await this.calculateAndApplyLayout();
    }
  }
  
  // ====================
  // Event System
  // ====================
  
  /**
   * Add event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    
    if (callback) {
      const index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.set(event, []);
    }
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.compilerIntegration.stopWatching();
    this.renderer.destroy();
    this.eventListeners.clear();
    this.graph = null;
    this.analysis = null;
  }
  
  // ====================
  // Private Methods
  // ====================
  
  private async buildGraphFromAnalysis(): Promise<void> {
    if (!this.analysis) return;
    
    const buildStart = Date.now();
    
    // Build graph
    this.graph = this.graphBuilder.buildGraph(this.analysis, this.config.type);
    this.emit(EVENTS.GRAPH_BUILT, {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size
    });
    
    // Apply filters
    this.applyFilters();
    
    // Calculate layout
    await this.calculateAndApplyLayout();
    
    this.performanceMetrics.analysisTime = Date.now() - buildStart;
  }
  
  private async calculateAndApplyLayout(): Promise<void> {
    if (!this.graph) return;
    
    const layoutStart = Date.now();
    
    try {
      this.emit(EVENTS.LAYOUT_START, { type: this.config.layout.type });
      
      const layoutResult = await this.layoutEngine.calculateLayout(this.graph, this.config.layout);
      
      // Apply positions to nodes
      for (const [nodeId, position] of layoutResult.positions) {
        const node = this.graph.getNode(nodeId);
        if (node) {
          node.position = position;
        }
      }
      
      this.performanceMetrics.layoutTime = Date.now() - layoutStart;
      
      this.emit(EVENTS.LAYOUT_COMPLETE, {
        duration: layoutResult.metadata.duration,
        iterations: layoutResult.metadata.iterations,
        converged: layoutResult.metadata.converged
      });
      
    } catch (error) {
      this.emit(EVENTS.LAYOUT_ERROR, {
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  private applyFilters(): void {
    if (!this.graph) return;
    
    const filters = this.config.filters;
    
    // Filter nodes
    for (const node of this.graph.nodes.values()) {
      let visible = true;
      
      // Filter by node type
      if (filters.nodeTypes && !filters.nodeTypes.includes(node.type)) {
        visible = false;
      }
      
      // Filter by layer
      if (filters.layers && node.metadata.layer && !filters.layers.includes(node.metadata.layer)) {
        visible = false;
      }
      
      // Filter by organization
      if (filters.organizations && filters.organizations.length > 0) {
        const nodeOrg = node.metadata.organization || node.parent;
        if (!filters.organizations.includes(nodeOrg)) {
          visible = false;
        }
      }
      
      node.visible = visible;
    }
    
    // Filter edges based on visible nodes
    for (const edge of this.graph.edges.values()) {
      const sourceNode = this.graph.getNode(edge.source);
      const targetNode = this.graph.getNode(edge.target);
      
      edge.visible = !!(sourceNode?.visible && targetNode?.visible);
      
      // Additional edge type filtering
      if (filters.edgeTypes && !filters.edgeTypes.includes(edge.type)) {
        edge.visible = false;
      }
    }
    
    // Update renderer if already rendered
    if (this.renderer && this.graph) {
      this.renderer.update(this.graph);
    }
  }
  
  private handleInteraction(event: InteractionEvent): void {
    switch (event.type) {
      case 'click':
        if (event.target) {
          const target = event.target as any;
          if ('type' in target && target.type) {
            // It's a node
            this.selectNode(target.id, event.modifiers.shift);
            this.emit(EVENTS.NODE_CLICK, target);
          } else {
            // It's an edge
            this.selectEdge(target.id, event.modifiers.shift);
            this.emit(EVENTS.EDGE_CLICK, target);
          }
        } else {
          // Background click
          if (!event.modifiers.shift) {
            this.clearSelection();
          }
        }
        break;
        
      case 'hover':
        if (event.target) {
          const target = event.target as any;
          if ('type' in target && target.type) {
            this.emit(EVENTS.NODE_HOVER, target);
          } else {
            this.emit(EVENTS.EDGE_HOVER, target);
          }
        }
        break;
        
      case 'zoom':
      case 'pan':
        this.viewport = this.renderer.getViewport();
        this.emit(EVENTS.VIEWPORT_CHANGED, this.viewport);
        break;
    }
  }
  
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  private updatePerformanceMetrics(): void {
    this.performanceMetrics.nodeCount = this.graph?.nodes.size || 0;
    this.performanceMetrics.edgeCount = this.graph?.edges.size || 0;
    
    // Estimate memory usage (simplified)
    this.performanceMetrics.memoryUsage = (
      this.performanceMetrics.nodeCount * 1000 + // ~1KB per node
      this.performanceMetrics.edgeCount * 500    // ~0.5KB per edge
    );
  }
}