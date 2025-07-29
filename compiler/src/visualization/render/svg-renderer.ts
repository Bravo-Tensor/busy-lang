/**
 * SVG Renderer for BUSY File Visualization
 * Handles SVG rendering, interactions, and viewport management
 */

import * as d3 from 'd3';
import type {
  IRenderer
} from '../core/interfaces';
import type {
  VisualizationGraph,
  VisualizationNode,
  VisualizationEdge,
  InteractionEvent,
  Viewport,
  Point2D,
  ExportOptions
} from '../core/types';
import { DEFAULT_VIEWPORT, ZOOM_LIMITS, ANIMATION_DURATION } from '../core/constants';

export class SVGRenderer implements IRenderer {
  private container: any | null = null;
  private svg: any | null = null;
  private g: any | null = null;
  private viewport: Viewport = { ...DEFAULT_VIEWPORT };
  private zoom: any | null = null;
  private graph: VisualizationGraph | null = null;
  
  private interactionCallbacks: ((event: InteractionEvent) => void)[] = [];
  
  // Node and edge selections
  private nodeSelection: any | null = null;
  private edgeSelection: any | null = null;
  
  /**
   * Render the graph in the given container
   */
  render(graph: VisualizationGraph, container: any): void {
    this.container = container;
    this.graph = graph;
    
    // Clear existing content
    d3.select(container).selectAll('*').remove();
    
    // Create SVG
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `${this.viewport.bounds.x} ${this.viewport.bounds.y} ${this.viewport.bounds.width} ${this.viewport.bounds.height}`)
      .style('background-color', '#ffffff')
      .style('cursor', 'grab');
    
    // Create main group for transformations
    this.g = this.svg.append('g')
      .attr('class', 'visualization-group');
    
    // Add grid background
    this.createGrid();
    
    // Add defs for markers and patterns
    this.createDefs();
    
    // Setup zoom behavior
    this.setupZoom();
    
    // Render graph elements
    this.renderEdges();
    this.renderNodes();
    
    // Setup interactions
    this.setupInteractions();
  }
  
  /**
   * Update the visualization with new graph data
   */
  update(graph: VisualizationGraph): void {
    this.graph = graph;
    
    if (!this.g) {
      throw new Error('Renderer not initialized. Call render() first.');
    }
    
    // Update edges
    this.renderEdges();
    
    // Update nodes
    this.renderNodes();
  }
  
  /**
   * Set the viewport
   */
  setViewport(viewport: Viewport): void {
    this.viewport = { ...viewport };
    
    if (this.svg) {
      this.svg.attr('viewBox', 
        `${viewport.bounds.x} ${viewport.bounds.y} ${viewport.bounds.width} ${viewport.bounds.height}`
      );
    }
    
    if (this.zoom && this.svg) {
      const transform = d3.zoomIdentity
        .translate(viewport.center.x, viewport.center.y)
        .scale(viewport.scale);
      
      this.svg.call(this.zoom.transform, transform);
    }
  }
  
  /**
   * Get the current viewport
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }
  
  /**
   * Add interaction callback
   */
  onInteraction(callback: (event: InteractionEvent) => void): void {
    this.interactionCallbacks.push(callback);
  }
  
  /**
   * Remove interaction callback
   */
  offInteraction(callback?: (event: InteractionEvent) => void): void {
    if (callback) {
      const index = this.interactionCallbacks.indexOf(callback);
      if (index >= 0) {
        this.interactionCallbacks.splice(index, 1);
      }
    } else {
      this.interactionCallbacks = [];
    }
  }
  
  /**
   * Highlight specific nodes
   */
  highlightNodes(nodeIds: string[]): void {
    if (!this.nodeSelection) return;
    
    this.nodeSelection
      .classed('highlighted', d => nodeIds.includes(d.id))
      .select('rect, circle')
      .style('stroke', d => nodeIds.includes(d.id) ? '#fcd34d' : null)
      .style('stroke-width', d => nodeIds.includes(d.id) ? 3 : null);
  }
  
  /**
   * Highlight specific edges
   */
  highlightEdges(edgeIds: string[]): void {
    if (!this.edgeSelection) return;
    
    this.edgeSelection
      .classed('highlighted', d => edgeIds.includes(d.id))
      .select('path')
      .style('stroke', d => edgeIds.includes(d.id) ? '#fcd34d' : null)
      .style('stroke-width', d => edgeIds.includes(d.id) ? 3 : null);
  }
  
  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    if (this.nodeSelection) {
      this.nodeSelection
        .classed('highlighted', false)
        .select('rect, circle')
        .style('stroke', null)
        .style('stroke-width', null);
    }
    
    if (this.edgeSelection) {
      this.edgeSelection
        .classed('highlighted', false)
        .select('path')
        .style('stroke', null)
        .style('stroke-width', null);
    }
  }
  
  /**
   * Animate to a specific viewport
   */
  async animateToViewport(viewport: Viewport, duration: number = ANIMATION_DURATION): Promise<void> {
    return new Promise((resolve) => {
      if (!this.zoom || !this.svg) {
        resolve();
        return;
      }
      
      const transform = d3.zoomIdentity
        .translate(viewport.center.x, viewport.center.y)
        .scale(viewport.scale);
      
      this.svg
        .transition()
        .duration(duration)
        .call(this.zoom.transform, transform)
        .on('end', () => {
          this.viewport = { ...viewport };
          resolve();
        });
    });
  }
  
  /**
   * Animate layout changes
   */
  async animateLayout(positions: Map<string, Point2D>, duration: number = ANIMATION_DURATION): Promise<void> {
    return new Promise((resolve) => {
      if (!this.nodeSelection) {
        resolve();
        return;
      }
      
      this.nodeSelection
        .transition()
        .duration(duration)
        .attr('transform', d => {
          const pos = positions.get(d.id);
          return pos ? `translate(${pos.x}, ${pos.y})` : null;
        })
        .on('end', () => resolve());
      
      // Also animate edges if they have positions
      if (this.edgeSelection) {
        this.edgeSelection
          .transition()
          .duration(duration)
          .select('path')
          .attr('d', d => this.createEdgePath(d, positions));
      }
    });
  }
  
  /**
   * Export as SVG string
   */
  exportSVG(): string {
    if (!this.svg) {
      throw new Error('Renderer not initialized');
    }
    
    // Clone the SVG to avoid modifying the original
    const svgNode = this.svg.node()?.cloneNode(true) as any;
    
    // Add necessary styles inline
    this.inlineStyles(svgNode);
    
    return (new (globalThis as any).XMLSerializer()).serializeToString(svgNode);
  }
  
  /**
   * Export as Canvas/Image
   */
  async exportCanvas(options: ExportOptions): Promise<Blob> {
    const svgString = this.exportSVG();
    const canvas = (globalThis as any).document?.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = options.width;
    canvas.height = options.height;
    
    // Fill background
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    return new Promise((resolve, reject) => {
      const img = new (globalThis as any).Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, options.width, options.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, `image/${options.format}`, options.quality || 0.9);
      };
      img.onerror = reject;
      
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      img.src = URL.createObjectURL(svgBlob);
    });
  }
  
  /**
   * Cleanup and destroy the renderer
   */
  destroy(): void {
    if (this.container) {
      d3.select(this.container).selectAll('*').remove();
    }
    
    this.container = null;
    this.svg = null;
    this.g = null;
    this.zoom = null;
    this.graph = null;
    this.nodeSelection = null;
    this.edgeSelection = null;
    this.interactionCallbacks = [];
  }
  
  // ====================
  // Private Methods
  // ====================
  
  private createGrid(): void {
    if (!this.g) return;
    
    const gridSize = 20;
    const bounds = this.viewport.bounds;
    
    // Create grid pattern
    const grid = this.g.append('g')
      .attr('class', 'grid')
      .style('opacity', 0.1);
    
    // Vertical lines
    for (let x = bounds.x; x <= bounds.x + bounds.width; x += gridSize) {
      grid.append('line')
        .attr('x1', x)
        .attr('y1', bounds.y)
        .attr('x2', x)
        .attr('y2', bounds.y + bounds.height)
        .style('stroke', '#e5e7eb')
        .style('stroke-width', 1);
    }
    
    // Horizontal lines
    for (let y = bounds.y; y <= bounds.y + bounds.height; y += gridSize) {
      grid.append('line')
        .attr('x1', bounds.x)
        .attr('y1', y)
        .attr('x2', bounds.x + bounds.width)
        .attr('y2', y)
        .style('stroke', '#e5e7eb')
        .style('stroke-width', 1);
    }
  }
  
  private createDefs(): void {
    if (!this.svg) return;
    
    const defs = this.svg.append('defs');
    
    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', '#666')
      .style('stroke', 'none');
  }
  
  private setupZoom(): void {
    if (!this.svg || !this.g) return;
    
    this.zoom = d3.zoom()
      .scaleExtent([ZOOM_LIMITS.min, ZOOM_LIMITS.max])
      .on('zoom', (event) => {
        const { transform } = event;
        
        this.g!.attr('transform', transform);
        
        // Update viewport
        this.viewport.center = { x: transform.x, y: transform.y };
        this.viewport.scale = transform.k;
        
        // Emit viewport change event
        this.emitInteractionEvent({
          type: 'zoom',
          target: null,
          position: { x: transform.x, y: transform.y },
          timestamp: new Date(),
          modifiers: {
            shift: event.sourceEvent?.shiftKey || false,
            ctrl: event.sourceEvent?.ctrlKey || false,
            alt: event.sourceEvent?.altKey || false
          }
        });
      });
    
    this.svg.call(this.zoom);
  }
  
  private renderNodes(): void {
    if (!this.g || !this.graph) return;
    
    const nodes = Array.from(this.graph.nodes.values()).filter(n => n.visible !== false);
    
    // Bind data
    this.nodeSelection = this.g.selectAll('.node')
      .data(nodes, (d: VisualizationNode) => d.id);
    
    // Remove old nodes
    this.nodeSelection.exit().remove();
    
    // Add new nodes
    const nodeEnter = this.nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => d.position ? `translate(${d.position.x}, ${d.position.y})` : 'translate(0, 0)');
    
    // Add node shapes
    nodeEnter.each((d, i, nodes) => {
      const node = d3.select(nodes[i]);
      this.createNodeShape(node, d);
    });
    
    // Update existing nodes
    this.nodeSelection = nodeEnter.merge(this.nodeSelection);
    
    // Update positions
    this.nodeSelection
      .attr('transform', d => d.position ? `translate(${d.position.x}, ${d.position.y})` : 'translate(0, 0)');
    
    // Setup node interactions
    this.setupNodeInteractions();
  }
  
  private renderEdges(): void {
    if (!this.g || !this.graph) return;
    
    const edges = Array.from(this.graph.edges.values()).filter(e => e.visible !== false);
    
    // Create edges group if it doesn't exist
    let edgesGroup = this.g.select('.edges');
    if (edgesGroup.empty()) {
      edgesGroup = this.g.insert('g', '.node')
        .attr('class', 'edges');
    }
    
    // Bind data
    this.edgeSelection = edgesGroup.selectAll('.edge')
      .data(edges, (d: VisualizationEdge) => d.id);
    
    // Remove old edges
    this.edgeSelection.exit().remove();
    
    // Add new edges
    const edgeEnter = this.edgeSelection.enter()
      .append('g')
      .attr('class', 'edge');
    
    // Add edge paths
    edgeEnter.append('path')
      .attr('d', d => this.createEdgePath(d))
      .style('fill', 'none')
      .style('stroke', d => d.style?.stroke || '#666')
      .style('stroke-width', d => d.style?.strokeWidth || 1)
      .style('stroke-dasharray', d => d.style?.strokeDashArray || null)
      .style('marker-end', d => d.style?.markerEnd === 'arrow' ? 'url(#arrow)' : null);
    
    // Add edge labels
    edgeEnter.filter(d => d.label)
      .append('text')
      .attr('class', 'edge-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '-5')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(d => d.label || '');
    
    // Update existing edges
    this.edgeSelection = edgeEnter.merge(this.edgeSelection);
    
    // Update edge paths
    this.edgeSelection.select('path')
      .attr('d', d => this.createEdgePath(d));
    
    // Update edge labels
    this.edgeSelection.select('text')
      .attr('transform', d => {
        const path = this.createEdgePath(d);
        // Position label at midpoint of path (simplified)
        const sourceNode = this.graph?.nodes.get(d.source);
        const targetNode = this.graph?.nodes.get(d.target);
        if (sourceNode?.position && targetNode?.position) {
          const midX = (sourceNode.position.x + targetNode.position.x) / 2;
          const midY = (sourceNode.position.y + targetNode.position.y) / 2;
          return `translate(${midX}, ${midY})`;
        }
        return 'translate(0, 0)';
      });
  }
  
  private createNodeShape(selection: any, node: VisualizationNode): void {
    const style = node.style || {};
    const shape = style.shape || 'rectangle';
    const radius = style.radius || 20;
    
    switch (shape) {
      case 'circle':
        selection.append('circle')
          .attr('r', radius)
          .style('fill', style.fill || '#3b82f6')
          .style('stroke', style.stroke || '#2563eb')
          .style('stroke-width', style.strokeWidth || 2);
        break;
        
      case 'hexagon':
        const hexPoints = this.createHexagonPoints(radius);
        selection.append('polygon')
          .attr('points', hexPoints)
          .style('fill', style.fill || '#f59e0b')
          .style('stroke', style.stroke || '#d97706')
          .style('stroke-width', style.strokeWidth || 2);
        break;
        
      case 'rounded-rectangle':
      default:
        const width = radius * 2;
        const height = radius * 1.5;
        selection.append('rect')
          .attr('x', -width / 2)
          .attr('y', -height / 2)
          .attr('width', width)
          .attr('height', height)
          .attr('rx', 5)
          .attr('ry', 5)
          .style('fill', style.fill || '#3b82f6')
          .style('stroke', style.stroke || '#2563eb')
          .style('stroke-width', style.strokeWidth || 2);
        break;
    }
    
    // Add label
    selection.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', `${style.fontSize || 12}px`)
      .style('font-family', style.fontFamily || 'Inter, sans-serif')
      .style('font-weight', style.fontWeight || 500)
      .style('fill', style.fontColor || '#ffffff')
      .style('pointer-events', 'none')
      .text(node.label);
  }
  
  private createHexagonPoints(radius: number): string {
    const points: Point2D[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
    }
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }
  
  private createEdgePath(edge: VisualizationEdge, positions?: Map<string, Point2D>): string {
    const sourceNode = this.graph?.nodes.get(edge.source);
    const targetNode = this.graph?.nodes.get(edge.target);
    
    if (!sourceNode || !targetNode) return '';
    
    const sourcePos = positions?.get(edge.source) || sourceNode.position || { x: 0, y: 0 };
    const targetPos = positions?.get(edge.target) || targetNode.position || { x: 0, y: 0 };
    
    const style = edge.style || {};
    const curve = style.curve || 'linear';
    
    switch (curve) {
      case 'curved':
        return this.createCurvedPath(sourcePos, targetPos);
      case 'step':
        return this.createStepPath(sourcePos, targetPos);
      case 'linear':
      default:
        return `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
    }
  }
  
  private createCurvedPath(source: Point2D, target: Point2D): string {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    
    // Create a curved path
    return `M ${source.x} ${source.y} A ${dr} ${dr} 0 0 1 ${target.x} ${target.y}`;
  }
  
  private createStepPath(source: Point2D, target: Point2D): string {
    const midX = source.x + (target.x - source.x) / 2;
    return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
  }
  
  private setupNodeInteractions(): void {
    if (!this.nodeSelection) return;
    
    this.nodeSelection
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        this.emitInteractionEvent({
          type: 'click',
          target: d,
          position: { x: event.offsetX, y: event.offsetY },
          timestamp: new Date(),
          modifiers: {
            shift: event.shiftKey,
            ctrl: event.ctrlKey,
            alt: event.altKey
          }
        });
      })
      .on('mouseover', (event, d) => {
        this.emitInteractionEvent({
          type: 'hover',
          target: d,
          position: { x: event.offsetX, y: event.offsetY },
          timestamp: new Date(),
          modifiers: {
            shift: event.shiftKey,
            ctrl: event.ctrlKey,
            alt: event.altKey
          }
        });
      });
  }
  
  private setupInteractions(): void {
    if (!this.svg) return;
    
    this.svg
      .on('click', (event) => {
        // Only emit if clicking on background (not on nodes/edges)
        if (event.target === this.svg?.node()) {
          this.emitInteractionEvent({
            type: 'click',
            target: null,
            position: { x: event.offsetX, y: event.offsetY },
            timestamp: new Date(),
            modifiers: {
              shift: event.shiftKey,
              ctrl: event.ctrlKey,
              alt: event.altKey
            }
          });
        }
      });
  }
  
  private emitInteractionEvent(event: InteractionEvent): void {
    this.interactionCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in interaction callback:', error);
      }
    });
  }
  
  private inlineStyles(svgElement: any): void {
    // Add basic styles to the SVG for export
    const style = (globalThis as any).document?.createElement('style');
    style.textContent = `
      .node text {
        user-select: none;
        pointer-events: none;
      }
      .edge text {
        user-select: none;
        pointer-events: none;
      }
      .grid {
        opacity: 0.1;
      }
    `;
    
    svgElement.insertBefore(style, svgElement.firstChild);
  }
}