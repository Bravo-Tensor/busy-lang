/**
 * Layout Engine Coordinator for BUSY Visualization
 * Manages different layout algorithms and provides a unified interface
 */

import type {
  ILayoutEngine,
  LayoutType
} from '../core/interfaces';
import type {
  VisualizationGraph,
  LayoutOptions,
  LayoutResult
} from '../core/types';
import { HierarchicalLayout } from './hierarchical';
import { ForceDirectedLayout } from './force-directed';

export class LayoutEngine implements ILayoutEngine {
  private hierarchicalLayout: HierarchicalLayout;
  private forceDirectedLayout: ForceDirectedLayout;
  private currentLayout: any = null;
  private isRunning = false;
  
  constructor() {
    this.hierarchicalLayout = new HierarchicalLayout();
    this.forceDirectedLayout = new ForceDirectedLayout();
  }
  
  /**
   * Calculate layout positions for the graph
   */
  async calculateLayout(graph: VisualizationGraph, options: LayoutOptions): Promise<LayoutResult> {
    if (this.isRunning) {
      throw new Error('Layout calculation already in progress');
    }
    
    this.isRunning = true;
    
    try {
      let result: LayoutResult;
      
      switch (options.type) {
        case 'hierarchical':
          this.currentLayout = this.hierarchicalLayout;
          result = this.hierarchicalLayout.calculateLayout(graph);
          break;
          
        case 'force-directed':
          this.currentLayout = this.forceDirectedLayout;
          result = await this.forceDirectedLayout.calculateLayout(graph, options);
          break;
          
        case 'circular':
          result = this.calculateCircularLayout(graph, options);
          break;
          
        case 'grid':
          result = this.calculateGridLayout(graph, options);
          break;
          
        case 'layered':
          result = this.calculateLayeredLayout(graph, options);
          break;
          
        case 'manual':
          result = this.calculateManualLayout(graph, options);
          break;
          
        default:
          throw new Error(`Unsupported layout type: ${options.type}`);
      }
      
      return result;
    } finally {
      this.isRunning = false;
      this.currentLayout = null;
    }
  }
  
  /**
   * Get available layout types
   */
  getAvailableLayouts(): LayoutType[] {
    return ['hierarchical', 'force-directed', 'circular', 'grid', 'layered', 'manual'];
  }
  
  /**
   * Get default parameters for a layout type
   */
  getLayoutParameters(layoutType: LayoutType): Record<string, any> {
    switch (layoutType) {
      case 'hierarchical':
        return {
          nodeSpacing: { type: 'number', default: 150, min: 50, max: 300 },
          levelSpacing: { type: 'number', default: 100, min: 50, max: 200 },
          alignment: { type: 'select', default: 'center', options: ['left', 'center', 'right'] },
          direction: { type: 'select', default: 'top-bottom', options: ['top-bottom', 'bottom-top', 'left-right', 'right-left'] }
        };
        
      case 'force-directed':
        return {
          linkStrength: { type: 'number', default: 0.1, min: 0, max: 1, step: 0.1 },
          chargeStrength: { type: 'number', default: -300, min: -1000, max: 0 },
          centerForce: { type: 'number', default: 0.1, min: 0, max: 1, step: 0.1 },
          iterations: { type: 'number', default: 300, min: 50, max: 1000 }
        };
        
      case 'circular':
        return {
          radius: { type: 'number', default: 200, min: 100, max: 500 },
          startAngle: { type: 'number', default: 0, min: 0, max: 360 },
          padding: { type: 'number', default: 20, min: 0, max: 100 }
        };
        
      case 'grid':
        return {
          columns: { type: 'number', default: 5, min: 1, max: 20 },
          cellWidth: { type: 'number', default: 150, min: 100, max: 300 },
          cellHeight: { type: 'number', default: 100, min: 50, max: 200 },
          padding: { type: 'number', default: 20, min: 0, max: 100 }
        };
        
      case 'layered':
        return {
          layerSpacing: { type: 'number', default: 120, min: 50, max: 200 },
          nodeSpacing: { type: 'number', default: 80, min: 30, max: 150 },
          iterations: { type: 'number', default: 100, min: 10, max: 500 },
          crossingReduction: { type: 'boolean', default: true }
        };
        
      case 'manual':
        return {
          preservePositions: { type: 'boolean', default: true },
          snapToGrid: { type: 'boolean', default: false },
          gridSize: { type: 'number', default: 20, min: 5, max: 100 }
        };
        
      default:
        return {};
    }
  }
  
  /**
   * Stop the current layout calculation
   */
  stopLayout(): void {
    if (this.currentLayout && typeof this.currentLayout.stop === 'function') {
      this.currentLayout.stop();
    }
    this.isRunning = false;
    this.currentLayout = null;
  }
  
  // ====================
  // Layout Implementations
  // ====================
  
  private calculateCircularLayout(graph: VisualizationGraph, options: LayoutOptions): LayoutResult {
    const startTime = Date.now();
    const params = { ...options.parameters };
    const radius = params.radius ?? 200;
    const startAngle = (params.startAngle ?? 0) * Math.PI / 180;
    const padding = params.padding ?? 20;
    
    const nodes = Array.from(graph.nodes.values());
    const positions = new Map();
    
    if (nodes.length === 0) {
      return {
        positions,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        metadata: {
          layoutType: 'circular',
          duration: Date.now() - startTime,
          iterations: 1,
          converged: true,
          parameters: params
        }
      };
    }
    
    const angleStep = (2 * Math.PI) / nodes.length;
    
    nodes.forEach((node, index) => {
      const angle = startAngle + index * angleStep;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      positions.set(node.id, { x, y });
    });
    
    const bounds = {
      x: -radius - padding,
      y: -radius - padding,
      width: 2 * (radius + padding),
      height: 2 * (radius + padding)
    };
    
    return {
      positions,
      bounds,
      metadata: {
        layoutType: 'circular',
        duration: Date.now() - startTime,
        iterations: 1,
        converged: true,
        parameters: params
      }
    };
  }
  
  private calculateGridLayout(graph: VisualizationGraph, options: LayoutOptions): LayoutResult {
    const startTime = Date.now();
    const params = { ...options.parameters };
    const columns = params.columns ?? 5;
    const cellWidth = params.cellWidth ?? 150;
    const cellHeight = params.cellHeight ?? 100;
    const padding = params.padding ?? 20;
    
    const nodes = Array.from(graph.nodes.values());
    const positions = new Map();
    
    nodes.forEach((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      
      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;
      
      positions.set(node.id, { x, y });
    });
    
    const rows = Math.ceil(nodes.length / columns);
    const bounds = {
      x: -padding,
      y: -padding,
      width: columns * cellWidth + 2 * padding,
      height: rows * cellHeight + 2 * padding
    };
    
    return {
      positions,
      bounds,
      metadata: {
        layoutType: 'grid',
        duration: Date.now() - startTime,
        iterations: 1,
        converged: true,
        parameters: params
      }
    };
  }
  
  private calculateLayeredLayout(graph: VisualizationGraph, options: LayoutOptions): LayoutResult {
    const startTime = Date.now();
    const params = { ...options.parameters };
    
    // For now, use hierarchical layout as a basis for layered layout
    // This could be enhanced with proper Sugiyama-style layered layout
    const hierarchicalResult = this.hierarchicalLayout.calculateLayout(graph);
    
    return {
      ...hierarchicalResult,
      metadata: {
        layoutType: 'layered',
        duration: Date.now() - startTime,
        iterations: params.iterations ?? 100,
        converged: true,
        parameters: params
      }
    };
  }
  
  private calculateManualLayout(graph: VisualizationGraph, options: LayoutOptions): LayoutResult {
    const startTime = Date.now();
    const params = { ...options.parameters };
    const preservePositions = params.preservePositions ?? true;
    const snapToGrid = params.snapToGrid ?? false;
    const gridSize = params.gridSize ?? 20;
    
    const positions = new Map();
    
    for (const node of graph.nodes.values()) {
      let position = node.position ?? { x: 0, y: 0 };
      
      if (snapToGrid) {
        position = {
          x: Math.round(position.x / gridSize) * gridSize,
          y: Math.round(position.y / gridSize) * gridSize
        };
      }
      
      positions.set(node.id, position);
    }
    
    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const pos of positions.values()) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }
    
    const padding = 100;
    const bounds = positions.size > 0 ? {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + 2 * padding,
      height: maxY - minY + 2 * padding
    } : { x: 0, y: 0, width: 0, height: 0 };
    
    return {
      positions,
      bounds,
      metadata: {
        layoutType: 'manual',
        duration: Date.now() - startTime,
        iterations: 1,
        converged: true,
        parameters: params
      }
    };
  }
}