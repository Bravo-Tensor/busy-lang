/**
 * Core interfaces for BUSY File Visualization System
 */

import type {
  VisualizationGraph,
  VisualizationNode,
  VisualizationEdge,
  VisualizationType,
  VisualizationConfig,
  LayoutOptions,
  LayoutResult,
  BusyAnalysisResult,
  OrganizationInfo,
  TeamInfo,
  PlaybookInfo,
  RoleInfo,
  StepInfo,
  IOInfo,
  RelationshipInfo,
  DependencyInfo,
  AnalysisStatistics,
  SerializedGraph,
  ExportOptions,
  PerformanceMetrics,
  InteractionEvent,
  SelectionState,
  Point2D,
  Viewport
} from './types';

// ====================
// Core System Interfaces
// ====================

/**
 * Main visualization system interface
 */
export interface IVisualizationSystem {
  // Configuration
  configure(config: Partial<VisualizationConfig>): void;
  getConfig(): VisualizationConfig;
  
  // Data loading and analysis
  loadFromFiles(filePaths: string[]): Promise<void>;
  loadFromAnalysis(analysis: BusyAnalysisResult): Promise<void>;
  refresh(): Promise<void>;
  
  // Graph access
  getGraph(): VisualizationGraph;
  getNodes(): VisualizationNode[];
  getEdges(): VisualizationEdge[];
  
  // Visualization
  render(container: any): void;
  updateVisualization(type: VisualizationType): Promise<void>;
  
  // Interaction
  setViewport(viewport: Viewport): void;
  getViewport(): Viewport;
  zoomToFit(): void;
  zoomToNode(nodeId: string): void;
  
  // Selection
  selectNode(nodeId: string, addToSelection?: boolean): void;
  selectEdge(edgeId: string, addToSelection?: boolean): void;
  clearSelection(): void;
  getSelection(): SelectionState;
  
  // Export
  exportGraph(options: ExportOptions): Promise<Blob>;
  exportData(): SerializedGraph;
  importData(data: SerializedGraph): Promise<void>;
  
  // Events
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback?: (data: any) => void): void;
  
  // Performance
  getMetrics(): PerformanceMetrics;
  
  // Lifecycle
  destroy(): void;
}

/**
 * BUSY file analyzer interface
 */
export interface IBusyAnalyzer {
  analyzeFiles(filePaths: string[]): Promise<BusyAnalysisResult>;
  analyzeAST(ast: any): BusyAnalysisResult;
  extractRelationships(analysis: BusyAnalysisResult): void;
  detectDependencies(analysis: BusyAnalysisResult): void;
  validateStructure(analysis: BusyAnalysisResult): ValidationResult[];
}

export interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  sourceFile?: string;
  element?: string;
}

/**
 * Graph builder interface
 */
export interface IGraphBuilder {
  buildGraph(analysis: BusyAnalysisResult, type: VisualizationType): VisualizationGraph;
  updateGraph(graph: VisualizationGraph, changes: any[]): VisualizationGraph;
  validateGraph(graph: VisualizationGraph): ValidationResult[];
  optimizeGraph(graph: VisualizationGraph): VisualizationGraph;
}

/**
 * Layout engine interface
 */
export interface ILayoutEngine {
  calculateLayout(graph: VisualizationGraph, options: LayoutOptions): Promise<LayoutResult>;
  getAvailableLayouts(): LayoutType[];
  getLayoutParameters(layoutType: LayoutType): Record<string, any>;
  stopLayout(): void;
}

export type LayoutType = 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'layered' | 'manual';

/**
 * Renderer interface
 */
export interface IRenderer {
  render(graph: VisualizationGraph, container: any): void;
  update(graph: VisualizationGraph): void;
  setViewport(viewport: Viewport): void;
  getViewport(): Viewport;
  
  // Interaction handling
  onInteraction(callback: (event: InteractionEvent) => void): void;
  offInteraction(callback?: (event: InteractionEvent) => void): void;
  
  // Selection
  highlightNodes(nodeIds: string[]): void;
  highlightEdges(edgeIds: string[]): void;
  clearHighlights(): void;
  
  // Animation
  animateToViewport(viewport: Viewport, duration?: number): Promise<void>;
  animateLayout(positions: Map<string, Point2D>, duration?: number): Promise<void>;
  
  // Export
  exportSVG(): string;
  exportCanvas(options: ExportOptions): Promise<Blob>;
  
  // Lifecycle
  destroy(): void;
}

/**
 * Style manager interface
 */
export interface IStyleManager {
  getNodeStyle(node: VisualizationNode): any;
  getEdgeStyle(edge: VisualizationEdge): any;
  applyTheme(theme: any): void;
  getTheme(): any;
  createCustomStyle(selector: string, style: any): void;
}

// ====================
// Specialized View Interfaces
// ====================

/**
 * Organizational overview view
 */
export interface IOrganizationalView {
  showOrganization(organizationId: string): void;
  expandTeam(teamId: string): void;
  collapseTeam(teamId: string): void;
  showPlaybooks(show: boolean): void;
  showRoles(show: boolean): void;
  highlightDependencies(elementId: string): void;
  filterByLayer(layers: ('L0' | 'L1' | 'L2')[]): void;
}

/**
 * Playbook detail view
 */
export interface IPlaybookDetailView {
  showPlaybook(playbookId: string): void;
  expandStep(stepId: string): void;
  collapseStep(stepId: string): void;
  showDataFlow(show: boolean): void;
  showRoleInteractions(show: boolean): void;
  highlightCriticalPath(): void;
}

/**
 * Role interaction view
 */
export interface IRoleInteractionView {
  showRole(roleId: string): void;
  showInteractions(roleId: string): void;
  filterByInteractionType(types: string[]): void;
  showCommunicationPatterns(show: boolean): void;
  detectConflicts(): string[];
}

/**
 * Resource flow view
 */
export interface IResourceFlowView {
  showResourceType(resourceType: string): void;
  traceResourceFlow(resourceId: string): void;
  showBottlenecks(show: boolean): void;
  highlightCriticalResources(): void;
  showUtilization(show: boolean): void;
}

/**
 * Dependency graph view
 */
export interface IDependencyGraphView {
  showDependencies(elementId: string): void;
  showCycles(show: boolean): void;
  highlightCriticalDependencies(): void;
  filterByDependencyType(types: string[]): void;
  showImpactAnalysis(elementId: string): void;
}

// ====================
// Integration Interfaces
// ====================

/**
 * Compiler integration interface
 */
export interface ICompilerIntegration {
  getAST(): Promise<any>;
  parseFiles(filePaths: string[]): Promise<any[]>;
  validateFiles(filePaths: string[]): Promise<ValidationResult[]>;
  watchFiles(callback: (changes: any[]) => void): void;
  stopWatching(): void;
}

/**
 * IDE integration interface
 */
export interface IIDEIntegration {
  openFile(filePath: string, line?: number, column?: number): void;
  highlightElement(filePath: string, elementPath: string): void;
  showDefinition(elementId: string): void;
  showReferences(elementId: string): void[];
  navigateToElement(elementId: string): void;
}

/**
 * Export integration interface
 */
export interface IExportIntegration {
  exportSVG(options: ExportOptions): Promise<string>;
  exportPNG(options: ExportOptions): Promise<Blob>;
  exportPDF(options: ExportOptions): Promise<Blob>;
  exportData(format: 'json' | 'yaml' | 'csv'): Promise<string>;
  importData(data: string, format: 'json' | 'yaml'): Promise<void>;
}

// ====================
// Plugin System Interfaces
// ====================

/**
 * Plugin interface for extensibility
 */
export interface IVisualizationPlugin {
  name: string;
  version: string;
  description: string;
  
  initialize(system: IVisualizationSystem): void;
  destroy(): void;
  
  // Optional hooks
  onGraphBuilt?(graph: VisualizationGraph): void;
  onLayoutCalculated?(layout: LayoutResult): void;
  onRenderComplete?(): void;
  onInteraction?(event: InteractionEvent): boolean; // return true to prevent default
}

/**
 * Plugin manager interface
 */
export interface IPluginManager {
  registerPlugin(plugin: IVisualizationPlugin): void;
  unregisterPlugin(pluginName: string): void;
  getPlugins(): IVisualizationPlugin[];
  getPlugin(name: string): IVisualizationPlugin | undefined;
  enablePlugin(name: string): void;
  disablePlugin(name: string): void;
}

// ====================
// Event System Interfaces
// ====================

export interface IEventEmitter {
  on(event: string, callback: Function): void;
  off(event: string, callback?: Function): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, callback: Function): void;
  removeAllListeners(event?: string): void;
}

// ====================
// Configuration Interfaces
// ====================

export interface IConfigurationManager {
  get<T>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): void;
  getAll(): Record<string, any>;
  reset(): void;
  
  // Configuration validation
  validate(config: any): ValidationResult[];
  
  // Presets
  loadPreset(presetName: string): void;
  savePreset(presetName: string, config: any): void;
  getPresets(): string[];
  deletePreset(presetName: string): void;
}

// ====================
// Cache and Performance Interfaces
// ====================

export interface ICacheManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  
  // Cache statistics
  getStats(): CacheStats;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
}

export interface IPerformanceMonitor {
  startTimer(name: string): void;
  endTimer(name: string): number;
  recordMetric(name: string, value: number): void;
  getMetrics(): PerformanceMetrics;
  reset(): void;
}