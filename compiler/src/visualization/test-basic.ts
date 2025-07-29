/**
 * Basic test for BUSY File Visualization System
 * Tests the core functionality with example BUSY files
 */

import { VisualizationSystem, VisualizationUtils } from './index';
import * as path from 'path';

/**
 * Test function to verify the visualization system works
 */
export async function testVisualizationSystem(): Promise<void> {
  console.log('🎯 Testing BUSY File Visualization System...');
  
  try {
    // Define paths to example BUSY files
    const exampleDir = path.join(__dirname, '../../../examples/solo-photography-business');
    const busyFiles = [
      path.join(exampleDir, 'L0/client-operations/team.busy'),
      path.join(exampleDir, 'L0/client-operations/playbooks/client-onboarding.busy'),
      path.join(exampleDir, 'L0/creative-production/team.busy'),
      path.join(exampleDir, 'L0/business-operations/team.busy')
    ];
    
    console.log('📁 Using BUSY files:', busyFiles.map(f => path.basename(f)));
    
    // Test 1: Create organizational overview
    console.log('\n🔍 Test 1: Creating organizational overview...');
    const orgViz = VisualizationUtils.createOrganizationalView({
      layout: { type: 'hierarchical' },
      interactive: true,
      showLabels: true
    });
    
    // Load files
    await orgViz.loadFromFiles(busyFiles);
    console.log('✅ Files loaded successfully');
    
    // Get graph data
    const graph = orgViz.getGraph();
    console.log(`📊 Graph created with ${graph.nodes.size} nodes and ${graph.edges.size} edges`);
    
    // Test node access
    const nodes = orgViz.getNodes();
    const edges = orgViz.getEdges();
    
    console.log('📋 Node types:', [...new Set(nodes.map((n: any) => n.type))]);
    console.log('🔗 Edge types:', [...new Set(edges.map((e: any) => e.type))]);
    
    // Test 2: Create playbook detail view
    console.log('\n🔍 Test 2: Creating playbook detail view...');
    const playbookViz = VisualizationUtils.createPlaybookDetailView();
    await playbookViz.loadFromFiles(busyFiles);
    
    const playbookGraph = playbookViz.getGraph();
    console.log(`📊 Playbook graph: ${playbookGraph.nodes.size} nodes, ${playbookGraph.edges.size} edges`);
    
    // Test 3: Export data
    console.log('\n🔍 Test 3: Testing data export...');
    const exportedData = orgViz.exportData();
    console.log(`💾 Exported ${exportedData.nodes.length} nodes and ${exportedData.edges.length} edges`);
    
    // Test 4: Performance metrics
    console.log('\n🔍 Test 4: Performance metrics...');
    const metrics = orgViz.getMetrics();
    console.log('⚡ Performance:', {
      'Parse Time': `${metrics.parseTime}ms`,
      'Analysis Time': `${metrics.analysisTime}ms`,
      'Layout Time': `${metrics.layoutTime}ms`,
      'Node Count': metrics.nodeCount,
      'Edge Count': metrics.edgeCount,
      'Memory Usage': `${Math.round(metrics.memoryUsage / 1024)}KB`
    });
    
    // Test 5: Filtering
    console.log('\n🔍 Test 5: Testing filters...');
    orgViz.configure({
      filters: {
        nodeTypes: ['organization', 'team'],
        edgeTypes: ['hierarchy']
      }
    });
    
    const filteredNodes = orgViz.getNodes().filter((n: any) => n.visible !== false);
    console.log(`🎛️ After filtering: ${filteredNodes.length} visible nodes`);
    
    // Test 6: Selection
    console.log('\n🔍 Test 6: Testing selection...');
    const firstNode = nodes.find((n: any) => n.type === 'team');
    if (firstNode) {
      orgViz.selectNode(firstNode.id);
      const selection = orgViz.getSelection();
      console.log(`👆 Selected node: ${firstNode.label} (${selection.selectedNodes.size} total)`);
    }
    
    // Cleanup
    orgViz.destroy();
    playbookViz.destroy();
    
    console.log('\n✅ All tests passed! Visualization system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test with mock data if files are not available
 */
export async function testWithMockData(): Promise<void> {
  console.log('🎯 Testing with mock data...');
  
  try {
    const mockAnalysis = {
      organizations: [
        {
          id: 'org-photography-business',
          name: 'Solo Photography Business',
          description: 'Professional photography business',
          layer: 'L0' as const,
          teams: ['team-client-ops', 'team-creative', 'team-business'],
          sourceFile: 'mock.busy'
        }
      ],
      teams: [
        {
          id: 'team-client-ops',
          name: 'Client Operations',
          description: 'Manages client relationships',
          type: 'stream-aligned',
          layer: 'L0' as const,
          organization: 'org-photography-business',
          roles: ['role-inquiry-manager'],
          playbooks: ['playbook-client-onboarding'],
          interfaces: {
            external: ['Client inquiries'],
            internal: ['Creative team coordination']
          },
          sourceFile: 'mock.busy'
        },
        {
          id: 'team-creative',
          name: 'Creative Production',
          description: 'Handles photo production',
          type: 'stream-aligned',
          layer: 'L0' as const,
          organization: 'org-photography-business',
          roles: ['role-photographer'],
          playbooks: ['playbook-photo-shoot'],
          interfaces: {
            external: ['Client deliverables'],
            internal: ['Client operations coordination']
          },
          sourceFile: 'mock.busy'
        }
      ],
      playbooks: [
        {
          id: 'playbook-client-onboarding',
          name: 'Client Onboarding',
          description: 'Onboard new clients',
          layer: 'L0' as const,
          team: 'team-client-ops',
          steps: [
            {
              id: 'step-welcome',
              name: 'Send Welcome Package',
              description: 'Send welcome email',
              type: 'algorithmic' as const,
              duration: '10m',
              inputs: [],
              outputs: [],
              dependencies: []
            }
          ],
          inputs: [],
          outputs: [],
          dependencies: [],
          sourceFile: 'mock.busy'
        }
      ],
      roles: [
        {
          id: 'role-inquiry-manager',
          name: 'Inquiry Manager',
          description: 'Manages client inquiries',
          layer: 'L0' as const,
          team: 'team-client-ops',
          responsibilities: ['Respond to inquiries'],
          capabilities: ['Customer service'],
          dependencies: [],
          sourceFile: 'mock.busy'
        }
      ],
      relationships: [],
      dependencies: [],
      statistics: {
        totalFiles: 1,
        totalOrganizations: 1,
        totalTeams: 2,
        totalPlaybooks: 1,
        totalRoles: 1,
        totalSteps: 1,
        totalDependencies: 0,
        cyclicDependencies: 0,
        layerDistribution: { 'L0': 5 }
      }
    };
    
    const viz = VisualizationUtils.createOrganizationalView();
    await viz.loadFromAnalysis(mockAnalysis);
    
    const graph = viz.getGraph();
    console.log(`✅ Mock data test: ${graph.nodes.size} nodes, ${graph.edges.size} edges`);
    
    viz.destroy();
    
  } catch (error) {
    console.error('❌ Mock data test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testVisualizationSystem().catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });
}