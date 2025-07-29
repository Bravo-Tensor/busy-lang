/**
 * Graph data model for BUSY File Visualization
 */

import type {
  VisualizationGraph,
  VisualizationNode,
  VisualizationEdge,
  GraphMetadata,
  GraphStatistics,
  Point2D,
  SerializedGraph
} from '../core/types';

export class VisualizationGraphModel implements VisualizationGraph {
  public nodes: Map<string, VisualizationNode>;
  public edges: Map<string, VisualizationEdge>;
  public metadata: GraphMetadata;
  
  private nodeIndex: Map<string, Set<string>>; // Type -> node IDs
  private edgeIndex: Map<string, Set<string>>; // Type -> edge IDs
  private adjacencyList: Map<string, Set<string>>; // Source -> targets
  private reverseAdjacencyList: Map<string, Set<string>>; // Target -> sources
  
  constructor(name: string, description?: string) {
    this.nodes = new Map();
    this.edges = new Map();
    this.nodeIndex = new Map();
    this.edgeIndex = new Map();
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    
    this.metadata = {
      name,
      description,
      sourceFiles: [],
      createdAt: new Date(),
      lastModified: new Date(),
      statistics: this.calculateStatistics()
    };
  }
  
  // ====================
  // Node Operations
  // ====================
  
  addNode(node: VisualizationNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with id '${node.id}' already exists`);
    }
    
    this.nodes.set(node.id, { ...node });
    
    // Update type index
    if (!this.nodeIndex.has(node.type)) {
      this.nodeIndex.set(node.type, new Set());
    }
    this.nodeIndex.get(node.type)!.add(node.id);
    
    // Initialize adjacency lists
    this.adjacencyList.set(node.id, new Set());
    this.reverseAdjacencyList.set(node.id, new Set());
    
    this.updateMetadata();
  }
  
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return;
    }
    
    // Remove all edges connected to this node
    const connectedEdges = this.getConnectedEdges(nodeId);
    connectedEdges.forEach(edge => this.removeEdge(edge.id));
    
    // Remove from type index
    const typeNodes = this.nodeIndex.get(node.type);
    if (typeNodes) {
      typeNodes.delete(nodeId);
      if (typeNodes.size === 0) {
        this.nodeIndex.delete(node.type);
      }
    }
    
    // Remove from adjacency lists
    this.adjacencyList.delete(nodeId);
    this.reverseAdjacencyList.delete(nodeId);
    
    // Remove the node
    this.nodes.delete(nodeId);
    
    this.updateMetadata();
  }
  
  updateNode(nodeId: string, updates: Partial<VisualizationNode>): void {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node with id '${nodeId}' not found`);
    }
    
    // Handle type change
    if (updates.type && updates.type !== node.type) {
      // Remove from old type index
      const oldTypeNodes = this.nodeIndex.get(node.type);
      if (oldTypeNodes) {
        oldTypeNodes.delete(nodeId);
        if (oldTypeNodes.size === 0) {
          this.nodeIndex.delete(node.type);
        }
      }
      
      // Add to new type index
      if (!this.nodeIndex.has(updates.type)) {
        this.nodeIndex.set(updates.type, new Set());
      }
      this.nodeIndex.get(updates.type)!.add(nodeId);
    }
    
    // Update node
    Object.assign(node, updates);
    this.nodes.set(nodeId, node);
    
    this.updateMetadata();
  }
  
  getNode(nodeId: string): VisualizationNode | undefined {
    return this.nodes.get(nodeId);
  }
  
  getNodesByType(type: string): VisualizationNode[] {
    const nodeIds = this.nodeIndex.get(type) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)!).filter(Boolean);
  }
  
  // ====================
  // Edge Operations
  // ====================
  
  addEdge(edge: VisualizationEdge): void {
    if (this.edges.has(edge.id)) {
      throw new Error(`Edge with id '${edge.id}' already exists`);
    }
    
    // Validate that source and target nodes exist
    if (!this.nodes.has(edge.source)) {
      throw new Error(`Source node '${edge.source}' not found`);
    }
    if (!this.nodes.has(edge.target)) {
      throw new Error(`Target node '${edge.target}' not found`);
    }
    
    this.edges.set(edge.id, { ...edge });
    
    // Update type index
    if (!this.edgeIndex.has(edge.type)) {
      this.edgeIndex.set(edge.type, new Set());
    }
    this.edgeIndex.get(edge.type)!.add(edge.id);
    
    // Update adjacency lists
    this.adjacencyList.get(edge.source)!.add(edge.target);
    this.reverseAdjacencyList.get(edge.target)!.add(edge.source);
    
    this.updateMetadata();
  }
  
  removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      return;
    }
    
    // Remove from type index
    const typeEdges = this.edgeIndex.get(edge.type);
    if (typeEdges) {
      typeEdges.delete(edgeId);
      if (typeEdges.size === 0) {
        this.edgeIndex.delete(edge.type);
      }
    }
    
    // Update adjacency lists
    this.adjacencyList.get(edge.source)?.delete(edge.target);
    this.reverseAdjacencyList.get(edge.target)?.delete(edge.source);
    
    // Remove the edge
    this.edges.delete(edgeId);
    
    this.updateMetadata();
  }
  
  updateEdge(edgeId: string, updates: Partial<VisualizationEdge>): void {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Edge with id '${edgeId}' not found`);
    }
    
    // Handle type change
    if (updates.type && updates.type !== edge.type) {
      // Remove from old type index
      const oldTypeEdges = this.edgeIndex.get(edge.type);
      if (oldTypeEdges) {
        oldTypeEdges.delete(edgeId);
        if (oldTypeEdges.size === 0) {
          this.edgeIndex.delete(edge.type);
        }
      }
      
      // Add to new type index
      if (!this.edgeIndex.has(updates.type)) {
        this.edgeIndex.set(updates.type, new Set());
      }
      this.edgeIndex.get(updates.type)!.add(edgeId);
    }
    
    // Handle source/target changes
    if (updates.source || updates.target) {
      // Remove old adjacency
      this.adjacencyList.get(edge.source)?.delete(edge.target);
      this.reverseAdjacencyList.get(edge.target)?.delete(edge.source);
      
      // Add new adjacency
      const newSource = updates.source || edge.source;
      const newTarget = updates.target || edge.target;
      
      // Validate new nodes exist
      if (!this.nodes.has(newSource)) {
        throw new Error(`Source node '${newSource}' not found`);
      }
      if (!this.nodes.has(newTarget)) {
        throw new Error(`Target node '${newTarget}' not found`);
      }
      
      this.adjacencyList.get(newSource)!.add(newTarget);
      this.reverseAdjacencyList.get(newTarget)!.add(newSource);
    }
    
    // Update edge
    Object.assign(edge, updates);
    this.edges.set(edgeId, edge);
    
    this.updateMetadata();
  }
  
  getEdge(edgeId: string): VisualizationEdge | undefined {
    return this.edges.get(edgeId);
  }
  
  getEdgesByType(type: string): VisualizationEdge[] {
    const edgeIds = this.edgeIndex.get(type) || new Set();
    return Array.from(edgeIds).map(id => this.edges.get(id)!).filter(Boolean);
  }
  
  getEdgesBetween(sourceId: string, targetId: string): VisualizationEdge[] {
    return Array.from(this.edges.values()).filter(
      edge => edge.source === sourceId && edge.target === targetId
    );
  }
  
  // ====================
  // Graph Traversal
  // ====================
  
  getNeighbors(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): VisualizationNode[] {
    const neighbors = new Set<string>();
    
    if (direction === 'outgoing' || direction === 'both') {
      const outgoing = this.adjacencyList.get(nodeId) || new Set();
      outgoing.forEach(id => neighbors.add(id));
    }
    
    if (direction === 'incoming' || direction === 'both') {
      const incoming = this.reverseAdjacencyList.get(nodeId) || new Set();
      incoming.forEach(id => neighbors.add(id));
    }
    
    return Array.from(neighbors).map(id => this.nodes.get(id)!).filter(Boolean);
  }
  
  getConnectedEdges(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): VisualizationEdge[] {
    const connectedEdges: VisualizationEdge[] = [];
    
    for (const edge of this.edges.values()) {
      const isOutgoing = edge.source === nodeId;
      const isIncoming = edge.target === nodeId;
      
      if ((direction === 'outgoing' && isOutgoing) ||
          (direction === 'incoming' && isIncoming) ||
          (direction === 'both' && (isOutgoing || isIncoming))) {
        connectedEdges.push(edge);
      }
    }
    
    return connectedEdges;
  }
  
  findPath(fromId: string, toId: string, maxLength: number = 10): VisualizationNode[] {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return [];
    }
    
    if (fromId === toId) {
      return [this.nodes.get(fromId)!];
    }
    
    // BFS to find shortest path
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: fromId, path: [fromId] }];
    const visited = new Set<string>([fromId]);
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (path.length > maxLength) {
        continue;
      }
      
      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      for (const neighborId of neighbors) {
        if (neighborId === toId) {
          const finalPath = [...path, neighborId];
          return finalPath.map(id => this.nodes.get(id)!).filter(Boolean);
        }
        
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            nodeId: neighborId,
            path: [...path, neighborId]
          });
        }
      }
    }
    
    return []; // No path found
  }
  
  detectCycles(): VisualizationNode[][] {
    const cycles: VisualizationNode[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];
    
    const dfs = (nodeId: string): void => {
      if (recursionStack.has(nodeId)) {
        // Found cycle
        const cycleStart = currentPath.indexOf(nodeId);
        if (cycleStart >= 0) {
          const cycleNodeIds = [...currentPath.slice(cycleStart), nodeId];
          const cycleNodes = cycleNodeIds.map(id => this.nodes.get(id)!).filter(Boolean);
          cycles.push(cycleNodes);
        }
        return;
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);
      
      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      for (const neighborId of neighbors) {
        dfs(neighborId);
      }
      
      recursionStack.delete(nodeId);
      currentPath.pop();
    };
    
    // Check all nodes
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }
    
    return cycles;
  }
  
  // ====================
  // Graph Analysis
  // ====================
  
  getConnectedComponents(): VisualizationNode[][] {
    const components: VisualizationNode[][] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: string, component: string[]): void => {
      if (visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      component.push(nodeId);
      
      // Visit all neighbors (both directions for undirected traversal)
      const neighbors = new Set([
        ...(this.adjacencyList.get(nodeId) || []),
        ...(this.reverseAdjacencyList.get(nodeId) || [])
      ]);
      
      for (const neighborId of neighbors) {
        dfs(neighborId, component);
      }
    };
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        dfs(nodeId, component);
        const componentNodes = component.map(id => this.nodes.get(id)!).filter(Boolean);
        components.push(componentNodes);
      }
    }
    
    return components;
  }
  
  getGraphDepth(): number {
    let maxDepth = 0;
    
    // Find root nodes (nodes with no incoming edges)
    const rootNodes = Array.from(this.nodes.keys()).filter(nodeId => {
      const incoming = this.reverseAdjacencyList.get(nodeId) || new Set();
      return incoming.size === 0;
    });
    
    if (rootNodes.length === 0) {
      // No clear roots, pick any node
      rootNodes.push(Array.from(this.nodes.keys())[0]);
    }
    
    const getDepth = (nodeId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(nodeId)) {
        return 0; // Avoid infinite recursion in cycles
      }
      
      visited.add(nodeId);
      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      
      if (neighbors.size === 0) {
        return 1;
      }
      
      let maxChildDepth = 0;
      for (const neighborId of neighbors) {
        const childDepth = getDepth(neighborId, new Set(visited));
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
      
      return maxChildDepth + 1;
    };
    
    for (const rootId of rootNodes) {
      const depth = getDepth(rootId);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth;
  }
  
  // ====================
  // Serialization
  // ====================
  
  toJSON(): SerializedGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      metadata: { ...this.metadata }
    };
  }
  
  static fromJSON(data: SerializedGraph): VisualizationGraphModel {
    const graph = new VisualizationGraphModel(data.metadata.name, data.metadata.description);
    
    // Add nodes first
    data.nodes.forEach(node => {
      graph.addNode(node);
    });
    
    // Then add edges
    data.edges.forEach(edge => {
      graph.addEdge(edge);
    });
    
    // Update metadata
    graph.metadata = { ...data.metadata };
    
    return graph;
  }
  
  clone(): VisualizationGraphModel {
    return VisualizationGraphModel.fromJSON(this.toJSON());
  }
  
  // ====================
  // Filtering and Querying
  // ====================
  
  filter(predicate: {
    nodes?: (node: VisualizationNode) => boolean;
    edges?: (edge: VisualizationEdge) => boolean;
  }): VisualizationGraphModel {
    const filteredGraph = new VisualizationGraphModel(
      `${this.metadata.name} (filtered)`,
      this.metadata.description
    );
    
    // Filter nodes
    const validNodeIds = new Set<string>();
    for (const node of this.nodes.values()) {
      if (!predicate.nodes || predicate.nodes(node)) {
        filteredGraph.addNode(node);
        validNodeIds.add(node.id);
      }
    }
    
    // Filter edges (only include if both endpoints are in filtered nodes)
    for (const edge of this.edges.values()) {
      if (validNodeIds.has(edge.source) && 
          validNodeIds.has(edge.target) && 
          (!predicate.edges || predicate.edges(edge))) {
        filteredGraph.addEdge(edge);
      }
    }
    
    return filteredGraph;
  }
  
  search(query: {
    nodeLabel?: string;
    edgeLabel?: string;
    nodeType?: string;
    edgeType?: string;
    metadata?: Record<string, any>;
  }): {
    nodes: VisualizationNode[];
    edges: VisualizationEdge[];
  } {
    const matchingNodes: VisualizationNode[] = [];
    const matchingEdges: VisualizationEdge[] = [];
    
    // Search nodes
    for (const node of this.nodes.values()) {
      let matches = true;
      
      if (query.nodeLabel && !node.label.toLowerCase().includes(query.nodeLabel.toLowerCase())) {
        matches = false;
      }
      
      if (query.nodeType && node.type !== query.nodeType) {
        matches = false;
      }
      
      if (query.metadata) {
        for (const [key, value] of Object.entries(query.metadata)) {
          if (node.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
      }
      
      if (matches) {
        matchingNodes.push(node);
      }
    }
    
    // Search edges
    for (const edge of this.edges.values()) {
      let matches = true;
      
      if (query.edgeLabel && edge.label && !edge.label.toLowerCase().includes(query.edgeLabel.toLowerCase())) {
        matches = false;
      }
      
      if (query.edgeType && edge.type !== query.edgeType) {
        matches = false;
      }
      
      if (query.metadata) {
        for (const [key, value] of Object.entries(query.metadata)) {
          if (edge.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
      }
      
      if (matches) {
        matchingEdges.push(edge);
      }
    }
    
    return { nodes: matchingNodes, edges: matchingEdges };
  }
  
  // ====================
  // Private Methods
  // ====================
  
  private calculateStatistics(): GraphStatistics {
    const cycles = this.detectCycles();
    const components = this.getConnectedComponents();
    
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      depth: this.getGraphDepth(),
      cycleCount: cycles.length,
      componentCount: components.length
    };
  }
  
  private updateMetadata(): void {
    this.metadata.lastModified = new Date();
    this.metadata.statistics = this.calculateStatistics();
  }
}