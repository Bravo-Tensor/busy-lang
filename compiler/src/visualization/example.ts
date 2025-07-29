/**
 * Example usage of the BUSY File Visualization System
 * This demonstrates how to create and use visualizations
 */

import { VisualizationSystem, VisualizationUtils } from './index';
import type { VisualizationConfig } from './core/types';

/**
 * Example: Basic organizational overview
 */
export async function createBasicOrganizationalView(
  containerId: string,
  busyFiles: string[]
): Promise<VisualizationSystem> {
  
  // Create visualization system
  const viz = VisualizationUtils.createOrganizationalView({
    layout: {
      type: 'hierarchical',
      animate: true,
      duration: 500
    },
    interactive: true,
    showLabels: true
  });
  
  // Load BUSY files
  await viz.loadFromFiles(busyFiles);
  
  // Render in container
  const container = (globalThis as any).document?.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id '${containerId}' not found`);
  }
  
  viz.render(container);
  
  // Setup event listeners
  viz.on('node:click', (node: any) => {
    console.log('Node clicked:', node);
  });
  
  viz.on('selection:changed', (selection: any) => {
    console.log('Selection changed:', selection);
  });
  
  // Zoom to fit all content
  viz.zoomToFit();
  
  return viz;
}

/**
 * Example: Interactive playbook detail view
 */
export async function createPlaybookDetailView(
  containerId: string,
  busyFiles: string[]
): Promise<VisualizationSystem> {
  
  const viz = VisualizationUtils.createPlaybookDetailView({
    layout: {
      type: 'hierarchical',
      parameters: {
        nodeSpacing: 100,
        levelSpacing: 80,
        direction: 'top-bottom'
      }
    },
    filters: {
      nodeTypes: ['playbook', 'step', 'task'],
      edgeTypes: ['hierarchy', 'dependency', 'data_flow']
    }
  });
  
  await viz.loadFromFiles(busyFiles);
  
  const container = (globalThis as any).document?.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id '${containerId}' not found`);
  }
  
  viz.render(container);
  
  // Add interactivity
  viz.on('node:click', (node: any) => {
    if (node.type === 'playbook') {
      // Highlight dependencies
      viz.highlightDependencies(node.id);
    }
  });
  
  return viz;
}

/**
 * Example: Role interaction network
 */
export async function createRoleInteractionNetwork(
  containerId: string,
  busyFiles: string[]
): Promise<VisualizationSystem> {
  
  const viz = VisualizationUtils.createRoleInteractionView({
    layout: {
      type: 'force-directed',
      parameters: {
        linkStrength: 0.1,
        chargeStrength: -300,
        iterations: 300
      }
    },
    filters: {
      nodeTypes: ['role'],
      edgeTypes: ['communication', 'dependency']
    }
  });
  
  await viz.loadFromFiles(busyFiles);
  
  const container = (globalThis as any).document?.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id '${containerId}' not found`);
  }
  
  viz.render(container);
  
  // Show role details on hover
  viz.on('node:hover', (node: any) => {
    if (node.type === 'role') {
      showRoleTooltip(node);
    }
  });
  
  return viz;
}

/**
 * Example: Custom themed visualization
 */
export async function createCustomThemedVisualization(
  containerId: string,
  busyFiles: string[]
): Promise<VisualizationSystem> {
  
  // Custom theme configuration
  const customTheme = {
    name: 'Custom BUSY Theme',
    nodes: {
      organization: {
        fill: '#2d3748',
        stroke: '#4a5568',
        strokeWidth: 2,
        shape: 'rounded-rectangle' as const,
        fontSize: 14,
        fontColor: '#ffffff'
      },
      team: {
        fill: '#2b6cb0',
        stroke: '#3182ce',
        strokeWidth: 2,
        shape: 'rounded-rectangle' as const,
        fontSize: 12,
        fontColor: '#ffffff'
      },
      playbook: {
        fill: '#38a169',
        stroke: '#48bb78',
        strokeWidth: 2,
        shape: 'rounded-rectangle' as const,
        fontSize: 11,
        fontColor: '#ffffff'
      },
      role: {
        fill: '#d69e2e',
        stroke: '#ed8936',
        strokeWidth: 2,
        shape: 'hexagon' as const,
        fontSize: 10,
        fontColor: '#ffffff'
      },
      task: {
        fill: '#805ad5',
        stroke: '#9f7aea',
        strokeWidth: 1,
        shape: 'rectangle' as const,
        fontSize: 9,
        fontColor: '#ffffff'
      },
      step: {
        fill: '#e53e3e',
        stroke: '#fc8181',
        strokeWidth: 1,
        shape: 'circle' as const,
        fontSize: 8,
        fontColor: '#ffffff'
      },
      document: {
        fill: '#718096',
        stroke: '#a0aec0',
        strokeWidth: 1,
        shape: 'rectangle' as const,
        fontSize: 8,
        fontColor: '#ffffff'
      }
    },
    edges: {
      hierarchy: {
        stroke: '#4a5568',
        strokeWidth: 2,
        opacity: 0.8,
        markerEnd: 'arrow' as const
      },
      dependency: {
        stroke: '#e53e3e',
        strokeWidth: 1.5,
        strokeDashArray: '5,5',
        opacity: 0.7,
        markerEnd: 'arrow' as const
      },
      communication: {
        stroke: '#3182ce',
        strokeWidth: 1,
        opacity: 0.6,
        markerEnd: 'arrow' as const
      },
      data_flow: {
        stroke: '#38a169',
        strokeWidth: 2,
        opacity: 0.8,
        markerEnd: 'arrow' as const
      },
      resource_flow: {
        stroke: '#d69e2e',
        strokeWidth: 3,
        opacity: 0.9,
        markerEnd: 'arrow' as const
      }
    },
    background: '#f7fafc',
    gridColor: '#e2e8f0',
    selectionColor: '#fbbf24',
    highlightColor: '#fcd34d'
  };
  
  const viz = new VisualizationSystem({
    type: 'organizational-overview',
    theme: customTheme,
    layout: {
      type: 'hierarchical',
      animate: true,
      duration: 800
    }
  });
  
  await viz.loadFromFiles(busyFiles);
  
  const container = (globalThis as any).document?.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id '${containerId}' not found`);
  }
  
  viz.render(container);
  viz.zoomToFit();
  
  return viz;
}

/**
 * Example: Export visualization
 */
export async function exportVisualization(
  viz: VisualizationSystem,
  format: 'svg' | 'png' | 'jpeg' = 'svg'
): Promise<Blob> {
  
  const exportOptions = {
    format,
    width: 1920,
    height: 1080,
    quality: 0.9,
    backgroundColor: '#ffffff'
  };
  
  return viz.exportGraph(exportOptions);
}

/**
 * Example: Multi-view dashboard
 */
export async function createMultiViewDashboard(
  busyFiles: string[]
): Promise<{
  organizational: VisualizationSystem;
  playbooks: VisualizationSystem;
  roles: VisualizationSystem;
  dependencies: VisualizationSystem;
}> {
  
  // Create multiple views
  const organizational = VisualizationUtils.createOrganizationalView();
  const playbooks = VisualizationUtils.createPlaybookDetailView();
  const roles = VisualizationUtils.createRoleInteractionView();
  const dependencies = VisualizationUtils.createDependencyView();
  
  // Load data into all views
  await Promise.all([
    organizational.loadFromFiles(busyFiles),
    playbooks.loadFromFiles(busyFiles),
    roles.loadFromFiles(busyFiles),
    dependencies.loadFromFiles(busyFiles)
  ]);
  
  // Sync selections across views
  const syncSelection = (selectedViz: VisualizationSystem, nodeId: string) => {
    [organizational, playbooks, roles, dependencies].forEach(viz => {
      if (viz !== selectedViz) {
        viz.selectNode(nodeId, false);
      }
    });
  };
  
  // Setup cross-view interactions
  [organizational, playbooks, roles, dependencies].forEach(viz => {
    viz.on('node:click', (node: any) => {
      syncSelection(viz, node.id);
    });
  });
  
  return {
    organizational,
    playbooks,
    roles,
    dependencies
  };
}

/**
 * Helper function to show role tooltip (example implementation)
 */
function showRoleTooltip(node: any): void {
  // Create or update tooltip
  let tooltip = (globalThis as any).document?.getElementById('role-tooltip');
  if (!tooltip) {
    tooltip = (globalThis as any).document?.createElement('div');
    tooltip.id = 'role-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #1a202c;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: Inter, sans-serif;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      pointer-events: none;
    `;
    (globalThis as any).document?.body?.appendChild(tooltip);
  }
  
  tooltip.innerHTML = `
    <strong>${node.label}</strong><br>
    Type: ${node.type}<br>
    ${node.metadata.description ? `Description: ${node.metadata.description}<br>` : ''}
    ${node.metadata.responsibilities ? `Responsibilities: ${node.metadata.responsibilities.length}<br>` : ''}
    ${node.metadata.capabilities ? `Capabilities: ${node.metadata.capabilities.length}` : ''}
  `;
  
  // Position tooltip near mouse (simplified)
  tooltip.style.display = 'block';
}

/**
 * Example: Performance monitoring
 */
export function setupPerformanceMonitoring(viz: VisualizationSystem): void {
  viz.on('render:complete', () => {
    const metrics = viz.getMetrics();
    console.log('Performance Metrics:', {
      'Total Time': `${metrics.totalTime}ms`,
      'Parse Time': `${metrics.parseTime}ms`,
      'Analysis Time': `${metrics.analysisTime}ms`,
      'Layout Time': `${metrics.layoutTime}ms`,
      'Render Time': `${metrics.renderTime}ms`,
      'Node Count': metrics.nodeCount,
      'Edge Count': metrics.edgeCount,
      'Memory Usage': `${Math.round(metrics.memoryUsage / 1024)}KB`
    });
  });
}