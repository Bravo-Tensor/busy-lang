/**
 * Constants and configuration for BUSY File Visualization System
 */

import type { VisualizationTheme, NodeStyle, EdgeStyle, NodeType, EdgeType } from './types';

// ====================
// Visual Constants
// ====================

export const DEFAULT_VIEWPORT = {
  center: { x: 0, y: 0 },
  scale: 1.0,
  bounds: { x: -1000, y: -1000, width: 2000, height: 2000 }
};

export const ZOOM_LIMITS = {
  min: 0.1,
  max: 10.0,
  step: 0.1
};

export const ANIMATION_DURATION = 300; // milliseconds
export const LAYOUT_ANIMATION_DURATION = 500; // milliseconds

// ====================
// Node Styling
// ====================

export const DEFAULT_NODE_STYLES: Record<NodeType, NodeStyle> = {
  organization: {
    fill: '#1f2937',
    stroke: '#374151',
    strokeWidth: 2,
    opacity: 1,
    radius: 20,
    shape: 'rounded-rectangle',
    fontSize: 14,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontColor: '#ffffff',
    fontWeight: 600
  },
  team: {
    fill: '#3b82f6',
    stroke: '#2563eb',
    strokeWidth: 2,
    opacity: 1,
    radius: 16,
    shape: 'rounded-rectangle',
    fontSize: 12,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontColor: '#ffffff',
    fontWeight: 500
  },
  playbook: {
    fill: '#10b981',
    stroke: '#059669',
    strokeWidth: 2,
    opacity: 1,
    radius: 14,
    shape: 'rounded-rectangle',
    fontSize: 11,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontColor: '#ffffff',
    fontWeight: 500
  },
  role: {
    fill: '#f59e0b',
    stroke: '#d97706',
    strokeWidth: 2,
    opacity: 1,
    radius: 12,
    shape: 'hexagon',
    fontSize: 10,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontColor: '#ffffff',
    fontWeight: 500
  },
  task: {
    fill: '#8b5cf6',
    stroke: '#7c3aed',
    strokeWidth: 1,
    opacity: 1,
    radius: 10,
    shape: 'rectangle',
    fontSize: 9,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontColor: '#ffffff',
    fontWeight: 400
  },
  step: {
    fill: '#ef4444',
    stroke: '#dc2626',
    strokeWidth: 1,
    opacity: 1,
    radius: 8,
    shape: 'circle',
    fontSize: 8,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontColor: '#ffffff',
    fontWeight: 400
  },
  document: {
    fill: '#6b7280',
    stroke: '#4b5563',
    strokeWidth: 1,
    opacity: 1,
    radius: 8,
    shape: 'rectangle',
    fontSize: 8,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontColor: '#ffffff',
    fontWeight: 400
  }
};

// ====================
// Edge Styling
// ====================

export const DEFAULT_EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  hierarchy: {
    stroke: '#374151',
    strokeWidth: 2,
    opacity: 0.8,
    markerEnd: 'arrow',
    curve: 'linear'
  },
  dependency: {
    stroke: '#ef4444',
    strokeWidth: 1.5,
    strokeDashArray: '5,5',
    opacity: 0.7,
    markerEnd: 'arrow',
    curve: 'curved'
  },
  communication: {
    stroke: '#3b82f6',
    strokeWidth: 1,
    opacity: 0.6,
    markerEnd: 'arrow',
    curve: 'curved'
  },
  data_flow: {
    stroke: '#10b981',
    strokeWidth: 2,
    opacity: 0.8,
    markerEnd: 'arrow',
    curve: 'step'
  },
  resource_flow: {
    stroke: '#f59e0b',
    strokeWidth: 3,
    opacity: 0.9,
    markerEnd: 'arrow',
    curve: 'linear'
  }
};

// ====================
// Theme Definitions
// ====================

export const DEFAULT_THEME: VisualizationTheme = {
  name: 'Default BUSY Theme',
  nodes: DEFAULT_NODE_STYLES,
  edges: DEFAULT_EDGE_STYLES,
  background: '#ffffff',
  gridColor: '#f3f4f6',
  selectionColor: '#fbbf24',
  highlightColor: '#fcd34d'
};

export const DARK_THEME: VisualizationTheme = {
  name: 'Dark BUSY Theme',
  nodes: {
    ...DEFAULT_NODE_STYLES,
    organization: {
      ...DEFAULT_NODE_STYLES.organization,
      fill: '#374151',
      stroke: '#6b7280'
    },
    team: {
      ...DEFAULT_NODE_STYLES.team,
      fill: '#1e40af',
      stroke: '#3b82f6'
    },
    playbook: {
      ...DEFAULT_NODE_STYLES.playbook,
      fill: '#047857',
      stroke: '#10b981'
    },
    role: {
      ...DEFAULT_NODE_STYLES.role,
      fill: '#b45309',
      stroke: '#f59e0b'
    },
    task: {
      ...DEFAULT_NODE_STYLES.task,
      fill: '#6d28d9',
      stroke: '#8b5cf6'
    },
    step: {
      ...DEFAULT_NODE_STYLES.step,
      fill: '#b91c1c',
      stroke: '#ef4444'
    },
    document: {
      ...DEFAULT_NODE_STYLES.document,
      fill: '#4b5563',
      stroke: '#6b7280'
    }
  },
  edges: {
    ...DEFAULT_EDGE_STYLES,
    hierarchy: {
      ...DEFAULT_EDGE_STYLES.hierarchy,
      stroke: '#9ca3af'
    },
    dependency: {
      ...DEFAULT_EDGE_STYLES.dependency,
      stroke: '#f87171'
    },
    communication: {
      ...DEFAULT_EDGE_STYLES.communication,
      stroke: '#60a5fa'
    },
    data_flow: {
      ...DEFAULT_EDGE_STYLES.data_flow,
      stroke: '#34d399'
    },
    resource_flow: {
      ...DEFAULT_EDGE_STYLES.resource_flow,
      stroke: '#fbbf24'
    }
  },
  background: '#111827',
  gridColor: '#374151',
  selectionColor: '#fbbf24',
  highlightColor: '#fcd34d'
};

// ====================
// Layout Constants
// ====================

export const LAYOUT_DEFAULTS = {
  hierarchical: {
    nodeSpacing: 150,
    levelSpacing: 100,
    alignment: 'center',
    direction: 'top-bottom'
  },
  'force-directed': {
    linkStrength: 0.1,
    chargeStrength: -300,
    centerForce: 0.1,
    iterations: 300,
    alpha: 0.3,
    alphaDecay: 0.02
  },
  circular: {
    radius: 200,
    startAngle: 0,
    endAngle: 2 * Math.PI,
    padding: 20
  },
  grid: {
    columns: 5,
    cellWidth: 150,
    cellHeight: 100,
    padding: 20
  },
  layered: {
    layerSpacing: 120,
    nodeSpacing: 80,
    iterations: 100,
    crossingReduction: true
  }
};

// ====================
// Performance Constants
// ====================

export const PERFORMANCE_THRESHOLDS = {
  // Node count thresholds for performance optimization
  LARGE_GRAPH_THRESHOLD: 500,
  HUGE_GRAPH_THRESHOLD: 1000,
  
  // Rendering optimizations
  LOD_THRESHOLD: 0.5, // Level of detail threshold (zoom level)
  CULLING_MARGIN: 100, // Pixels outside viewport to still render
  
  // Animation and interaction
  MAX_ANIMATION_NODES: 200,
  DEBOUNCE_DELAY: 150, // milliseconds
  
  // Memory limits
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_HISTORY_SIZE: 50 // undo/redo history
};

// ====================
// File and Export Constants
// ====================

export const SUPPORTED_FILE_EXTENSIONS = ['.busy'];

export const EXPORT_FORMATS = {
  svg: {
    mimeType: 'image/svg+xml',
    extension: '.svg'
  },
  png: {
    mimeType: 'image/png',
    extension: '.png'
  },
  jpeg: {
    mimeType: 'image/jpeg',
    extension: '.jpg'
  },
  pdf: {
    mimeType: 'application/pdf',
    extension: '.pdf'
  },
  json: {
    mimeType: 'application/json',
    extension: '.json'
  }
};

export const DEFAULT_EXPORT_SIZE = {
  width: 1920,
  height: 1080
};

// ====================
// Error Messages
// ====================

export const ERROR_MESSAGES = {
  INVALID_FILE_FORMAT: 'Invalid BUSY file format',
  FILE_NOT_FOUND: 'BUSY file not found',
  PARSE_ERROR: 'Error parsing BUSY file',
  LAYOUT_ERROR: 'Error calculating layout',
  RENDER_ERROR: 'Error rendering visualization',
  EXPORT_ERROR: 'Error exporting visualization',
  INVALID_CONFIGURATION: 'Invalid visualization configuration',
  MEMORY_LIMIT_EXCEEDED: 'Memory limit exceeded',
  OPERATION_TIMEOUT: 'Operation timed out'
};

// ====================
// Event Names
// ====================

export const EVENTS = {
  // System events
  INITIALIZED: 'system:initialized',
  CONFIGURATION_CHANGED: 'system:config-changed',
  ERROR: 'system:error',
  
  // Data events
  FILES_LOADED: 'data:files-loaded',
  ANALYSIS_COMPLETE: 'data:analysis-complete',
  GRAPH_BUILT: 'data:graph-built',
  
  // Layout events
  LAYOUT_START: 'layout:start',
  LAYOUT_PROGRESS: 'layout:progress',
  LAYOUT_COMPLETE: 'layout:complete',
  LAYOUT_ERROR: 'layout:error',
  
  // Render events
  RENDER_START: 'render:start',
  RENDER_COMPLETE: 'render:complete',
  RENDER_ERROR: 'render:error',
  
  // Interaction events
  NODE_CLICK: 'interaction:node-click',
  NODE_HOVER: 'interaction:node-hover',
  EDGE_CLICK: 'interaction:edge-click',
  EDGE_HOVER: 'interaction:edge-hover',
  SELECTION_CHANGED: 'interaction:selection-changed',
  VIEWPORT_CHANGED: 'interaction:viewport-changed',
  
  // Export events
  EXPORT_START: 'export:start',
  EXPORT_COMPLETE: 'export:complete',
  EXPORT_ERROR: 'export:error'
};

// ====================
// Validation Rules
// ====================

export const VALIDATION_RULES = {
  MAX_NODE_LABEL_LENGTH: 100,
  MAX_EDGE_LABEL_LENGTH: 50,
  MAX_NODES_PER_GRAPH: 10000,
  MAX_EDGES_PER_GRAPH: 50000,
  MIN_NODE_SIZE: 10,
  MAX_NODE_SIZE: 200,
  MIN_EDGE_WIDTH: 0.5,
  MAX_EDGE_WIDTH: 10
};

// ====================
// Default Filters
// ====================

export const DEFAULT_FILTERS = {
  nodeTypes: ['organization', 'team', 'playbook', 'role'] as NodeType[],
  edgeTypes: ['hierarchy', 'dependency'] as EdgeType[],
  layers: ['L0', 'L1', 'L2'] as ('L0' | 'L1' | 'L2')[],
  showLabels: true,
  showMetadata: false
};

// ====================
// Keyboard Shortcuts
// ====================

export const KEYBOARD_SHORTCUTS = {
  ZOOM_IN: ['=', '+'],
  ZOOM_OUT: ['-', '_'],
  ZOOM_FIT: ['0'],
  SELECT_ALL: ['ctrl+a', 'cmd+a'],
  COPY: ['ctrl+c', 'cmd+c'],
  PASTE: ['ctrl+v', 'cmd+v'],
  UNDO: ['ctrl+z', 'cmd+z'],
  REDO: ['ctrl+shift+z', 'cmd+shift+z', 'ctrl+y', 'cmd+y'],
  DELETE: ['delete', 'backspace'],
  ESCAPE: ['escape']
};

// ====================
// Accessibility
// ====================

export const ACCESSIBILITY = {
  // ARIA labels
  ARIA_LABELS: {
    NODE: 'visualization-node',
    EDGE: 'visualization-edge',
    GRAPH: 'busy-visualization-graph',
    TOOLBAR: 'visualization-toolbar',
    CONTROLS: 'visualization-controls'
  },
  
  // Focus styles
  FOCUS_OUTLINE: '2px solid #2563eb',
  FOCUS_OUTLINE_OFFSET: '2px',
  
  // High contrast ratios
  MIN_CONTRAST_RATIO: 4.5,
  
  // Keyboard navigation
  TAB_ORDER: ['toolbar', 'controls', 'graph', 'nodes', 'edges']
};