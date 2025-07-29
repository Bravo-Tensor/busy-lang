/**
 * BUSY File Visualization System
 * Main entry point for the visualization system
 */

// Core system
export { VisualizationSystem } from './system';

// Core types and interfaces
export type {
  // Core types
  VisualizationType,
  VisualizationConfig,
  VisualizationGraph,
  VisualizationNode,
  VisualizationEdge,
  NodeType,
  EdgeType,
  Point2D,
  Size2D,
  Rectangle,
  Viewport,
  
  // Analysis types
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
  
  // Layout types
  LayoutType,
  LayoutOptions,
  LayoutResult,
  LayoutMetadata,
  
  // Visual types
  NodeStyle,
  EdgeStyle,
  VisualizationTheme,
  
  // Interaction types
  InteractionEvent,
  SelectionState,
  
  // Export types
  ExportOptions,
  SerializedGraph,
  
  // Performance types
  PerformanceMetrics,
  VisualizationError,
  
  // Integration types
  FileChangeEvent
} from './core/types';

export type {
  // Core interfaces
  IVisualizationSystem,
  IBusyAnalyzer,
  IGraphBuilder,
  ILayoutEngine,
  IRenderer,
  IStyleManager,
  
  // Specialized view interfaces
  IOrganizationalView,
  IPlaybookDetailView,
  IRoleInteractionView,
  IResourceFlowView,
  IDependencyGraphView,
  
  // Integration interfaces
  ICompilerIntegration,
  IIDEIntegration,
  IExportIntegration,
  
  // Plugin interfaces
  IVisualizationPlugin,
  IPluginManager,
  
  // Utility interfaces
  IEventEmitter,
  IConfigurationManager,
  ICacheManager,
  IPerformanceMonitor,
  
  // Validation
  ValidationResult
} from './core/interfaces';

// Components
export { VisualizationGraphModel } from './graph/model';
export { GraphBuilder } from './graph/builder';
export { BusyAnalyzer } from './graph/analyzer';
export { LayoutEngine } from './layout/engine';
export { HierarchicalLayout } from './layout/hierarchical';
export { ForceDirectedLayout } from './layout/force-directed';
export { SVGRenderer } from './render/svg-renderer';
export { CompilerIntegration } from './integration/compiler';

// Constants and themes
export {
  DEFAULT_THEME,
  DARK_THEME,
  DEFAULT_VIEWPORT,
  ZOOM_LIMITS,
  ANIMATION_DURATION,
  LAYOUT_ANIMATION_DURATION,
  DEFAULT_NODE_STYLES,
  DEFAULT_EDGE_STYLES,
  LAYOUT_DEFAULTS,
  PERFORMANCE_THRESHOLDS,
  SUPPORTED_FILE_EXTENSIONS,
  EXPORT_FORMATS,
  DEFAULT_EXPORT_SIZE,
  ERROR_MESSAGES,
  EVENTS,
  VALIDATION_RULES,
  DEFAULT_FILTERS,
  KEYBOARD_SHORTCUTS,
  ACCESSIBILITY
} from './core/constants';

// Utility functions for common operations
export const VisualizationUtils = {
  /**
   * Create a basic visualization system with default configuration
   */
  createSystem(config?: Partial<VisualizationConfig>): VisualizationSystem {
    return new VisualizationSystem(config);
  },
  
  /**
   * Create an organizational overview visualization
   */
  createOrganizationalView(config?: Partial<VisualizationConfig>): VisualizationSystem {
    return new VisualizationSystem({
      type: 'organizational-overview',
      layout: { type: 'hierarchical' },
      ...config
    });
  },
  
  /**
   * Create a playbook detail visualization
   */
  createPlaybookDetailView(config?: Partial<VisualizationConfig>): VisualizationSystem {
    return new VisualizationSystem({
      type: 'playbook-detail',
      layout: { type: 'hierarchical' },
      ...config
    });
  },
  
  /**
   * Create a role interaction visualization
   */
  createRoleInteractionView(config?: Partial<VisualizationConfig>): VisualizationSystem {
    return new VisualizationSystem({
      type: 'role-interaction',
      layout: { type: 'force-directed' },
      ...config
    });
  },
  
  /**
   * Create a dependency graph visualization
   */
  createDependencyView(config?: Partial<VisualizationConfig>): VisualizationSystem {
    return new VisualizationSystem({
      type: 'dependency-graph',
      layout: { type: 'hierarchical' },
      ...config
    });
  },
  
  /**
   * Create a resource flow visualization
   */
  createResourceFlowView(config?: Partial<VisualizationConfig>): VisualizationSystem {
    return new VisualizationSystem({
      type: 'resource-flow',
      layout: { type: 'force-directed' },
      ...config
    });
  }
};

// Default export for convenience
export default VisualizationSystem;