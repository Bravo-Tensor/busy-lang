/**
 * Force-Directed Layout Algorithm for BUSY Visualization
 * Uses a physics simulation to position nodes with attractive and repulsive forces
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

export interface ForceDirectedLayoutOptions {
  linkStrength?: number;
  chargeStrength?: number;
  centerForce?: number;
  iterations?: number;
  alpha?: number;
  alphaDecay?: number;
  velocityDecay?: number;
  stopThreshold?: number;
}

interface NodeState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number; // Fixed position X
  fy?: number; // Fixed position Y
}

export class ForceDirectedLayout {
  private options: Required<ForceDirectedLayoutOptions>;
  private simulation: {
    nodes: NodeState[];
    links: { source: string; target: string; strength: number }[];
    alpha: number;
    iteration: number;
  } | null = null;
  private shouldStop = false;
  
  constructor(options: ForceDirectedLayoutOptions = {}) {
    this.options = {
      linkStrength: options.linkStrength ?? LAYOUT_DEFAULTS['force-directed'].linkStrength,
      chargeStrength: options.chargeStrength ?? LAYOUT_DEFAULTS['force-directed'].chargeStrength,
      centerForce: options.centerForce ?? LAYOUT_DEFAULTS['force-directed'].centerForce,
      iterations: options.iterations ?? LAYOUT_DEFAULTS['force-directed'].iterations,
      alpha: options.alpha ?? LAYOUT_DEFAULTS['force-directed'].alpha,
      alphaDecay: options.alphaDecay ?? LAYOUT_DEFAULTS['force-directed'].alphaDecay,
      velocityDecay: options.velocityDecay ?? 0.4,
      stopThreshold: options.stopThreshold ?? 0.01
    };
  }
  
  /**
   * Calculate force-directed layout positions
   */
  async calculateLayout(graph: VisualizationGraph, options?: LayoutOptions): Promise<LayoutResult> {
    const startTime = Date.now();
    this.shouldStop = false;
    
    // Override options if provided
    if (options?.parameters) {
      Object.assign(this.options, options.parameters);
    }
    
    // Initialize simulation
    this.initializeSimulation(graph);
    
    // Run simulation
    let iteration = 0;
    let converged = false;
    
    while (iteration < this.options.iterations && !this.shouldStop && !converged) {
      converged = this.simulationStep();
      iteration++;
      
      // Allow other tasks to run
      if (iteration % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Extract final positions
    const positions = new Map<string, Point2D>();
    this.simulation!.nodes.forEach(node => {
      positions.set(node.id, { x: node.x, y: node.y });
    });
    
    // Calculate bounds
    const bounds = this.calculateBounds(positions);
    
    // Center the layout
    this.centerLayout(positions, bounds);
    
    return {
      positions,
      bounds: this.calculateBounds(positions), // Recalculate after centering
      metadata: {
        layoutType: 'force-directed',
        duration: Date.now() - startTime,
        iterations: iteration,
        converged,
        parameters: { ...this.options }
      }
    };
  }
  
  /**
   * Stop the simulation
   */
  stop(): void {
    this.shouldStop = true;
  }
  
  /**
   * Initialize the force simulation
   */
  private initializeSimulation(graph: VisualizationGraph): void {
    // Create node states
    const nodes: NodeState[] = [];
    
    for (const node of graph.nodes.values()) {
      // Use existing position if available, otherwise random
      const x = node.position?.x ?? (Math.random() - 0.5) * 1000;
      const y = node.position?.y ?? (Math.random() - 0.5) * 1000;
      
      nodes.push({
        id: node.id,
        x,
        y,
        vx: 0,
        vy: 0,
        fx: node.position?.x, // Fix position if explicitly set
        fy: node.position?.y
      });
    }
    
    // Create links
    const links: { source: string; target: string; strength: number }[] = [];
    
    for (const edge of graph.edges.values()) {
      // Different edge types have different strengths
      let strength = this.options.linkStrength;
      
      switch (edge.type) {
        case 'hierarchy':
          strength *= 2.0; // Stronger for hierarchical relationships
          break;
        case 'dependency':
          strength *= 1.5; // Moderate strength for dependencies
          break;
        case 'communication':
          strength *= 0.8; // Weaker for communication
          break;
        case 'data_flow':
          strength *= 1.2; // Moderate strength for data flow
          break;
        case 'resource_flow':
          strength *= 1.8; // Strong for resource flow
          break;
      }
      
      links.push({
        source: edge.source,
        target: edge.target,
        strength
      });
    }
    
    this.simulation = {
      nodes,
      links,
      alpha: this.options.alpha,
      iteration: 0
    };
  }
  
  /**
   * Run one step of the simulation
   */
  private simulationStep(): boolean {
    if (!this.simulation) return true;
    
    const { nodes, links } = this.simulation;
    
    // Apply forces
    this.applyLinkForce(nodes, links);
    this.applyChargeForce(nodes);
    this.applyCenterForce(nodes);
    
    // Update positions
    let totalVelocity = 0;
    
    nodes.forEach(node => {
      // Apply velocity decay
      node.vx *= this.options.velocityDecay;
      node.vy *= this.options.velocityDecay;
      
      // Update position (unless fixed)
      if (node.fx === undefined) {
        node.x += node.vx * this.simulation!.alpha;
      } else {
        node.x = node.fx;
        node.vx = 0;
      }
      
      if (node.fy === undefined) {
        node.y += node.vy * this.simulation!.alpha;
      } else {
        node.y = node.fy;
        node.vy = 0;
      }
      
      totalVelocity += Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    });
    
    // Update alpha (cooling)
    this.simulation.alpha *= (1 - this.options.alphaDecay);
    this.simulation.iteration++;
    
    // Check for convergence
    const avgVelocity = totalVelocity / nodes.length;
    return avgVelocity < this.options.stopThreshold;
  }
  
  /**
   * Apply attractive force between connected nodes
   */
  private applyLinkForce(nodes: NodeState[], links: { source: string; target: string; strength: number }[]): void {
    const nodeMap = new Map<string, NodeState>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    links.forEach(link => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      
      if (!source || !target) return;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) return;
      
      // Desired link distance (could be configurable)
      const desiredDistance = 100;
      const force = (distance - desiredDistance) * link.strength;
      
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });
  }
  
  /**
   * Apply repulsive force between all nodes
   */
  private applyChargeForce(nodes: NodeState[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared === 0) continue;
        
        const distance = Math.sqrt(distanceSquared);
        const force = this.options.chargeStrength / distanceSquared;
        
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }
  }
  
  /**
   * Apply centering force to keep nodes near the origin
   */
  private applyCenterForce(nodes: NodeState[]): void {
    if (nodes.length === 0) return;
    
    // Calculate center of mass
    let centerX = 0;
    let centerY = 0;
    
    nodes.forEach(node => {
      centerX += node.x;
      centerY += node.y;
    });
    
    centerX /= nodes.length;
    centerY /= nodes.length;
    
    // Apply centering force
    nodes.forEach(node => {
      node.vx -= centerX * this.options.centerForce;
      node.vy -= centerY * this.options.centerForce;
    });
  }
  
  /**
   * Calculate bounding box for all positioned nodes
   */
  private calculateBounds(positions: Map<string, Point2D>): Rectangle {
    if (positions.size === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const nodeSize = 120; // Approximate node size
    const padding = 50;
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const pos of positions.values()) {
      minX = Math.min(minX, pos.x - nodeSize / 2);
      maxX = Math.max(maxX, pos.x + nodeSize / 2);
      minY = Math.min(minY, pos.y - nodeSize / 2);
      maxY = Math.max(maxY, pos.y + nodeSize / 2);
    }
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + 2 * padding,
      height: maxY - minY + 2 * padding
    };
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
}