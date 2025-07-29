/**
 * Hierarchical Layout Algorithm for BUSY Visualization
 * Arranges nodes in a layered hierarchy based on their level and relationships
 */

import type {
  VisualizationGraph,
  VisualizationNode,
  VisualizationEdge,
  LayoutOptions,
  LayoutResult,
  Point2D,
  Rectangle
} from '../core/types';
import { LAYOUT_DEFAULTS } from '../core/constants';

export interface HierarchicalLayoutOptions {
  nodeSpacing?: number;
  levelSpacing?: number;
  alignment?: 'left' | 'center' | 'right';
  direction?: 'top-bottom' | 'bottom-top' | 'left-right' | 'right-left';
  padding?: number;
  centerRoot?: boolean;
}

export class HierarchicalLayout {
  private options: Required<HierarchicalLayoutOptions>;
  
  constructor(options: HierarchicalLayoutOptions = {}) {
    this.options = {
      nodeSpacing: options.nodeSpacing ?? LAYOUT_DEFAULTS.hierarchical.nodeSpacing,
      levelSpacing: options.levelSpacing ?? LAYOUT_DEFAULTS.hierarchical.levelSpacing,
      alignment: options.alignment ?? LAYOUT_DEFAULTS.hierarchical.alignment as 'center',
      direction: options.direction ?? LAYOUT_DEFAULTS.hierarchical.direction as 'top-bottom',
      padding: options.padding ?? 50,
      centerRoot: options.centerRoot ?? true
    };
  }
  
  /**
   * Calculate hierarchical layout positions for all nodes
   */
  calculateLayout(graph: VisualizationGraph): LayoutResult {
    const startTime = Date.now();
    
    // Organize nodes by levels
    const levels = this.organizeNodesByLevels(graph);
    
    // Calculate positions for each level
    const positions = new Map<string, Point2D>();
    let currentOffset = this.options.padding;
    
    const isVertical = this.options.direction === 'top-bottom' || this.options.direction === 'bottom-top';
    const isReversed = this.options.direction === 'bottom-top' || this.options.direction === 'right-left';
    
    // Calculate level positions
    const levelPositions: { level: number; position: number; width: number; height: number }[] = [];
    
    levels.forEach((nodes, level) => {
      const levelSize = this.calculateLevelSize(nodes, isVertical);
      
      levelPositions.push({
        level,
        position: currentOffset,
        width: levelSize.width,
        height: levelSize.height
      });
      
      currentOffset += (isVertical ? levelSize.height : levelSize.width) + this.options.levelSpacing;
    });
    
    // Position nodes within each level
    levels.forEach((nodes, level) => {
      const levelInfo = levelPositions.find(lp => lp.level === level)!;
      this.positionNodesInLevel(nodes, levelInfo, positions, isVertical, isReversed);
    });
    
    // Apply direction-specific transformations
    this.applyDirectionTransform(positions, isVertical, isReversed);
    
    // Calculate bounds
    const bounds = this.calculateBounds(positions);
    
    // Center the layout if requested
    if (this.options.centerRoot) {
      this.centerLayout(positions, bounds);
    }
    
    return {
      positions,
      bounds: this.calculateBounds(positions), // Recalculate after centering
      metadata: {
        layoutType: 'hierarchical',
        duration: Date.now() - startTime,
        iterations: 1,
        converged: true,
        parameters: { ...this.options }
      }
    };
  }
  
  /**
   * Organize nodes into levels based on hierarchy
   */
  private organizeNodesByLevels(graph: VisualizationGraph): Map<number, VisualizationNode[]> {
    const levels = new Map<number, VisualizationNode[]>();
    const processedNodes = new Set<string>();
    
    // First pass: use existing level information
    for (const node of graph.nodes.values()) {
      if (node.level !== undefined) {
        if (!levels.has(node.level)) {
          levels.set(node.level, []);
        }
        levels.get(node.level)!.push(node);
        processedNodes.add(node.id);
      }
    }
    
    // Second pass: calculate levels for nodes without explicit level
    const unprocessedNodes = Array.from(graph.nodes.values())
      .filter(node => !processedNodes.has(node.id));
    
    if (unprocessedNodes.length > 0) {
      this.calculateNodeLevels(graph, unprocessedNodes, levels, processedNodes);
    }
    
    // Sort nodes within each level for better arrangement
    levels.forEach(nodes => {
      nodes.sort((a, b) => {
        // Sort by node type priority first
        const typePriority = this.getNodeTypePriority(a.type) - this.getNodeTypePriority(b.type);
        if (typePriority !== 0) return typePriority;
        
        // Then by label alphabetically
        return a.label.localeCompare(b.label);
      });
    });
    
    return levels;
  }
  
  /**
   * Calculate levels for nodes that don't have explicit level information
   */
  private calculateNodeLevels(
    graph: VisualizationGraph,
    nodes: VisualizationNode[],
    levels: Map<number, VisualizationNode[]>,
    processedNodes: Set<string>
  ): void {
    const queue = [...nodes];
    const inProgress = new Set<string>();
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      if (processedNodes.has(node.id) || inProgress.has(node.id)) {
        continue;
      }
      
      // Find the maximum level of incoming hierarchical connections
      const incomingEdges = graph.getConnectedEdges(node.id, 'incoming')
        .filter(edge => edge.type === 'hierarchy');
      
      let maxParentLevel = -1;
      let allParentsProcessed = true;
      
      for (const edge of incomingEdges) {
        const parentNode = graph.getNode(edge.source);
        if (parentNode) {
          if (processedNodes.has(parentNode.id)) {
            maxParentLevel = Math.max(maxParentLevel, parentNode.level ?? 0);
          } else {
            allParentsProcessed = false;
            break;
          }
        }
      }
      
      if (allParentsProcessed) {
        const nodeLevel = maxParentLevel + 1;
        node.level = nodeLevel;
        
        if (!levels.has(nodeLevel)) {
          levels.set(nodeLevel, []);
        }
        levels.get(nodeLevel)!.push(node);
        processedNodes.add(node.id);
        inProgress.delete(node.id);
      } else {
        // Dependencies not ready, add back to queue
        inProgress.add(node.id);
        queue.push(node);
      }
    }
  }
  
  /**
   * Calculate the total size needed for a level
   */
  private calculateLevelSize(nodes: VisualizationNode[], isVertical: boolean): { width: number; height: number } {
    if (nodes.length === 0) {
      return { width: 0, height: 0 };
    }
    
    const nodeWidth = 120; // Default node width
    const nodeHeight = 60; // Default node height
    
    if (isVertical) {
      // Vertical layout: nodes arranged horizontally in each level
      const totalWidth = nodes.length * nodeWidth + (nodes.length - 1) * this.options.nodeSpacing;
      return {
        width: totalWidth,
        height: nodeHeight
      };
    } else {
      // Horizontal layout: nodes arranged vertically in each level
      const totalHeight = nodes.length * nodeHeight + (nodes.length - 1) * this.options.nodeSpacing;
      return {
        width: nodeWidth,
        height: totalHeight
      };
    }
  }
  
  /**
   * Position nodes within a single level
   */
  private positionNodesInLevel(
    nodes: VisualizationNode[],
    levelInfo: { level: number; position: number; width: number; height: number },
    positions: Map<string, Point2D>,
    isVertical: boolean,
    isReversed: boolean
  ): void {
    const nodeWidth = 120;
    const nodeHeight = 60;
    
    if (isVertical) {
      // Vertical layout: arrange nodes horizontally
      let startX = 0;
      
      // Apply alignment
      if (this.options.alignment === 'center') {
        startX = -levelInfo.width / 2;
      } else if (this.options.alignment === 'right') {
        startX = -levelInfo.width;
      }
      
      nodes.forEach((node, index) => {
        const x = startX + index * (nodeWidth + this.options.nodeSpacing) + nodeWidth / 2;
        const y = levelInfo.position + nodeHeight / 2;
        
        positions.set(node.id, { x, y });
      });
    } else {
      // Horizontal layout: arrange nodes vertically
      let startY = 0;
      
      // Apply alignment
      if (this.options.alignment === 'center') {
        startY = -levelInfo.height / 2;
      } else if (this.options.alignment === 'right') {
        startY = -levelInfo.height;
      }
      
      nodes.forEach((node, index) => {
        const x = levelInfo.position + nodeWidth / 2;
        const y = startY + index * (nodeHeight + this.options.nodeSpacing) + nodeHeight / 2;
        
        positions.set(node.id, { x, y });
      });
    }
  }
  
  /**
   * Apply direction-specific coordinate transformations
   */
  private applyDirectionTransform(
    positions: Map<string, Point2D>,
    isVertical: boolean,
    isReversed: boolean
  ): void {
    if (!isReversed) {
      return;
    }
    
    // Calculate bounds for reversal
    const bounds = this.calculateBounds(positions);
    
    if (isVertical) {
      // Reverse Y coordinates for bottom-top
      for (const [nodeId, pos] of positions) {
        positions.set(nodeId, {
          x: pos.x,
          y: bounds.y + bounds.height - (pos.y - bounds.y)
        });
      }
    } else {
      // Reverse X coordinates for right-left
      for (const [nodeId, pos] of positions) {
        positions.set(nodeId, {
          x: bounds.x + bounds.width - (pos.x - bounds.x),
          y: pos.y
        });
      }
    }
  }
  
  /**
   * Center the layout around the origin
   */
  private centerLayout(positions: Map<string, Point2D>, bounds: Rectangle): void {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    for (const [nodeId, pos] of positions) {
      positions.set(nodeId, {
        x: pos.x - centerX,
        y: pos.y - centerY
      });
    }
  }
  
  /**
   * Calculate bounding box for all positioned nodes
   */
  private calculateBounds(positions: Map<string, Point2D>): Rectangle {
    if (positions.size === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const nodeWidth = 120;
    const nodeHeight = 60;
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const pos of positions.values()) {
      minX = Math.min(minX, pos.x - nodeWidth / 2);
      maxX = Math.max(maxX, pos.x + nodeWidth / 2);
      minY = Math.min(minY, pos.y - nodeHeight / 2);
      maxY = Math.max(maxY, pos.y + nodeHeight / 2);
    }
    
    return {
      x: minX - this.options.padding,
      y: minY - this.options.padding,
      width: maxX - minX + 2 * this.options.padding,
      height: maxY - minY + 2 * this.options.padding
    };
  }
  
  /**
   * Get priority for node type ordering
   */
  private getNodeTypePriority(type: string): number {
    const priorities: Record<string, number> = {
      'organization': 0,
      'team': 1,
      'playbook': 2,
      'role': 2,
      'task': 3,
      'step': 4,
      'document': 5
    };
    
    return priorities[type] ?? 999;
  }
}