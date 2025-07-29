/**
 * Core type definitions for BUSY File Visualization System
 */

import type { BusyAST, BusyFileNode, TeamNode, RoleNode, PlaybookNode } from '@/ast/nodes';

// ====================
// Geometry and Visual Types
// ====================

export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  center: Point2D;
  scale: number;
  bounds: Rectangle;
}

// ====================
// Visualization Graph Model
// ====================

export type NodeType = 'organization' | 'team' | 'playbook' | 'role' | 'task' | 'step' | 'document';
export type EdgeType = 'hierarchy' | 'dependency' | 'communication' | 'data_flow' | 'resource_flow';

export interface VisualizationNode {
  id: string;
  type: NodeType;
  label: string;
  position?: Point2D;
  size?: Size2D;
  
  // Source information
  sourceFile?: string;
  sourcePath?: string;
  sourceNode?: BusyFileNode | TeamNode | RoleNode | PlaybookNode;
  
  // Visual properties
  style?: NodeStyle;
  visible?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  
  // Hierarchy information
  level?: number;
  parent?: string;
  children?: string[];
  
  // Metadata
  metadata: Record<string, any>;
}

export interface VisualizationEdge {
  id: string;
  type: EdgeType;
  source: string;
  target: string;
  label?: string;
  
  // Visual properties
  style?: EdgeStyle;
  visible?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  
  // Edge properties
  weight?: number;
  bidirectional?: boolean;
  
  // Metadata
  metadata: Record<string, any>;
}

export interface VisualizationGraph {
  nodes: Map<string, VisualizationNode>;
  edges: Map<string, VisualizationEdge>;
  metadata: GraphMetadata;
}

export interface GraphMetadata {
  name: string;
  description?: string;
  sourceFiles: string[];
  createdAt: Date;
  lastModified: Date;
  statistics: GraphStatistics;
}

export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  depth: number;
  cycleCount: number;
  componentCount: number;
}

// ====================
// Visual Styling
// ====================

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  radius?: number;
  shape?: 'circle' | 'rectangle' | 'rounded-rectangle' | 'hexagon';
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: string | number;
}

export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: string;
  opacity?: number;
  markerEnd?: string;
  markerStart?: string;
  curve?: 'linear' | 'curved' | 'step';
}

export interface VisualizationTheme {
  name: string;
  nodes: Record<NodeType, NodeStyle>;
  edges: Record<EdgeType, EdgeStyle>;
  background: string;
  gridColor?: string;
  selectionColor: string;
  highlightColor: string;
}

// ====================
// Layout Types
// ====================

export type LayoutType = 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'layered' | 'manual';

export interface LayoutOptions {
  type: LayoutType;
  animate?: boolean;
  duration?: number;
  iterations?: number;
  parameters?: Record<string, any>;
}

export interface LayoutResult {
  positions: Map<string, Point2D>;
  bounds: Rectangle;
  metadata: LayoutMetadata;
}

export interface LayoutMetadata {
  layoutType: LayoutType;
  duration: number;
  iterations: number;
  converged: boolean;
  parameters: Record<string, any>;
}

// ====================
// Analysis and Processing
// ====================

export interface BusyAnalysisResult {
  organizations: OrganizationInfo[];
  teams: TeamInfo[];
  playbooks: PlaybookInfo[];
  roles: RoleInfo[];
  relationships: RelationshipInfo[];
  dependencies: DependencyInfo[];
  statistics: AnalysisStatistics;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  description?: string;
  layer: 'L0' | 'L1' | 'L2';
  teams: string[];
  sourceFile: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  description?: string;
  type: string;
  layer: 'L0' | 'L1' | 'L2';
  organization: string;
  roles: string[];
  playbooks: string[];
  interfaces: {
    external: string[];
    internal: string[];
  };
  sourceFile: string;
}

export interface PlaybookInfo {
  id: string;
  name: string;
  description?: string;
  layer: 'L0' | 'L1' | 'L2';
  team: string;
  steps: StepInfo[];
  inputs: IOInfo[];
  outputs: IOInfo[];
  dependencies: string[];
  sourceFile: string;
}

export interface RoleInfo {
  id: string;
  name: string;
  description?: string;
  layer: 'L0' | 'L1' | 'L2';
  team: string;
  responsibilities: string[];
  capabilities: string[];
  dependencies: string[];
  sourceFile: string;
}

export interface StepInfo {
  id: string;
  name: string;
  description?: string;
  type: 'human' | 'algorithmic' | 'ai_assist';
  duration: string;
  inputs: IOInfo[];
  outputs: IOInfo[];
  dependencies: string[];
}

export interface IOInfo {
  name: string;
  type: string;
  format: string;
  required: boolean;
  description?: string;
}

export interface RelationshipInfo {
  id: string;
  type: 'hierarchy' | 'dependency' | 'communication' | 'data_flow';
  source: string;
  target: string;
  description?: string;
  metadata: Record<string, any>;
}

export interface DependencyInfo {
  id: string;
  source: string;
  target: string;
  type: 'imports' | 'references' | 'requires';
  strength: number;
  critical: boolean;
  description?: string;
}

export interface AnalysisStatistics {
  totalFiles: number;
  totalOrganizations: number;
  totalTeams: number;
  totalPlaybooks: number;
  totalRoles: number;
  totalSteps: number;
  totalDependencies: number;
  cyclicDependencies: number;
  layerDistribution: Record<string, number>;
}

// ====================
// Visualization Views
// ====================

export type VisualizationType = 
  | 'organizational-overview'
  | 'playbook-detail'
  | 'role-interaction'
  | 'resource-flow'
  | 'dependency-graph';

export interface VisualizationConfig {
  type: VisualizationType;
  layout: LayoutOptions;
  theme: VisualizationTheme;
  filters: FilterOptions;
  interactive: boolean;
  showLabels: boolean;
  showMetadata: boolean;
}

export interface FilterOptions {
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
  layers?: ('L0' | 'L1' | 'L2')[];
  organizations?: string[];
  teams?: string[];
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ====================
// Interaction and Events
// ====================

export interface InteractionEvent {
  type: 'click' | 'hover' | 'select' | 'drag' | 'zoom' | 'pan';
  target: VisualizationNode | VisualizationEdge | null;
  position: Point2D;
  timestamp: Date;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
}

export interface SelectionState {
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  lastSelected?: string;
  multiSelect: boolean;
}

// ====================
// Export and Serialization
// ====================

export interface ExportOptions {
  format: 'svg' | 'png' | 'jpeg' | 'pdf';
  width: number;
  height: number;
  quality?: number;
  includeMetadata?: boolean;
  backgroundColor?: string;
}

export interface SerializedGraph {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  metadata: GraphMetadata;
  layout?: LayoutResult;
  config?: VisualizationConfig;
}

// ====================
// Integration Types
// ====================

export interface CompilerIntegration {
  analyzeFiles(files: string[]): Promise<BusyAnalysisResult>;
  watchFiles(callback: (changes: FileChangeEvent[]) => void): void;
  stopWatching(): void;
}

export interface FileChangeEvent {
  type: 'added' | 'modified' | 'deleted';
  filePath: string;
  timestamp: Date;
}

// ====================
// Performance and Monitoring
// ====================

export interface PerformanceMetrics {
  parseTime: number;
  analysisTime: number;
  layoutTime: number;
  renderTime: number;
  totalTime: number;
  memoryUsage: number;
  nodeCount: number;
  edgeCount: number;
}

export interface VisualizationError {
  type: 'parse' | 'analysis' | 'layout' | 'render' | 'export';
  message: string;
  details?: string;
  sourceFile?: string;
  timestamp: Date;
  stack?: string;
}