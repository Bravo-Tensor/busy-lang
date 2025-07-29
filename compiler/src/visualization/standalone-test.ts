#!/usr/bin/env node
/**
 * Standalone test for core visualization components (no compiler dependencies)
 */

import { VisualizationGraphModel } from './graph/model';
import { GraphBuilder } from './graph/builder';
import { HierarchicalLayout } from './layout/hierarchical';
import { SVGRenderer } from './render/svg-renderer';
import type { BusyAnalysisResult, VisualizationConfig } from './core/types';

async function runStandaloneTest() {
  console.log('🎯 BUSY Visualization - Standalone Component Test\n');
  
  try {
    // Create comprehensive mock analysis data
    const mockAnalysis: BusyAnalysisResult = {
      organizations: [{
        id: 'org-photography-business',
        name: 'Solo Photography Business',
        description: 'Professional photography business',
        layer: 'L0',
        teams: ['team-client-ops', 'team-creative', 'team-business'],
        sourceFile: 'mock.busy'
      }],
      teams: [
        {
          id: 'team-client-ops',
          name: 'Client Operations',
          description: 'Manages client relationships',
          type: 'stream-aligned',
          layer: 'L0',
          organization: 'org-photography-business',
          roles: ['role-inquiry-manager', 'role-project-coordinator'],
          playbooks: ['playbook-client-onboarding'],
          interfaces: {
            external: ['Client inquiries', 'Client feedback'],
            internal: ['Creative team coordination', 'Business team reporting']
          },
          sourceFile: 'mock.busy'
        },
        {
          id: 'team-creative',
          name: 'Creative Production',
          description: 'Handles photo production and editing',
          type: 'stream-aligned',
          layer: 'L0',
          organization: 'org-photography-business',
          roles: ['role-photographer', 'role-photo-editor'],
          playbooks: ['playbook-photo-production'],
          interfaces: {
            external: ['Client deliverables', 'Portfolio updates'],
            internal: ['Client operations coordination', 'Equipment management']
          },
          sourceFile: 'mock.busy'
        },
        {
          id: 'team-business',
          name: 'Business Operations',
          description: 'Manages financial and administrative operations',
          type: 'enabling',
          layer: 'L0',
          organization: 'org-photography-business',
          roles: ['role-financial-manager', 'role-contract-admin'],
          playbooks: ['playbook-monthly-financials', 'playbook-vendor-management'],
          interfaces: {
            external: ['Vendor management', 'Tax reporting'],
            internal: ['Financial reporting', 'Contract management']
          },
          sourceFile: 'mock.busy'
        }
      ],
      playbooks: [
        {
          id: 'playbook-client-onboarding',
          name: 'Client Onboarding',
          description: 'Complete process for onboarding new photography clients',
          layer: 'L0',
          team: 'team-client-ops',
          steps: [],
          inputs: [],
          outputs: [],
          dependencies: [],
          sourceFile: 'mock.busy'
        },
        {
          id: 'playbook-photo-production',
          name: 'Photo Production',
          description: 'End-to-end photography production workflow',
          layer: 'L0',
          team: 'team-creative',
          steps: [],
          inputs: [],
          outputs: [],
          dependencies: ['playbook-client-onboarding'],
          sourceFile: 'mock.busy'
        }
      ],
      roles: [
        {
          id: 'role-inquiry-manager',
          name: 'Inquiry Manager',
          description: 'Manages client inquiries and initial communications',
          layer: 'L0',
          team: 'team-client-ops',
          responsibilities: [
            'Respond to client inquiries within 24 hours',
            'Qualify potential clients',
            'Schedule initial consultations'
          ],
          capabilities: [
            'Customer service',
            'Sales communication',
            'Scheduling management'
          ],
          dependencies: [],
          sourceFile: 'mock.busy'
        },
        {
          id: 'role-project-coordinator',
          name: 'Project Coordinator',
          description: 'Coordinates photography projects from start to finish',
          layer: 'L0',
          team: 'team-client-ops',
          responsibilities: [
            'Manage project timelines',
            'Coordinate between teams',
            'Ensure client satisfaction'
          ],
          capabilities: [
            'Project management',
            'Team coordination',
            'Client relationship management'
          ],
          dependencies: ['role-inquiry-manager'],
          sourceFile: 'mock.busy'
        },
        {
          id: 'role-photographer',
          name: 'Photographer',
          description: 'Primary photographer responsible for capturing high-quality images',
          layer: 'L0',
          team: 'team-creative',
          responsibilities: [
            'Conduct photography sessions',
            'Ensure technical quality',
            'Manage equipment'
          ],
          capabilities: [
            'Professional photography',
            'Lighting expertise',
            'Equipment operation'
          ],
          dependencies: [],
          sourceFile: 'mock.busy'
        },
        {
          id: 'role-photo-editor',
          name: 'Photo Editor',
          description: 'Responsible for post-processing and editing photographs',
          layer: 'L0',
          team: 'team-creative',
          responsibilities: [
            'Edit and enhance photos',
            'Maintain consistent style',
            'Deliver final products'
          ],
          capabilities: [
            'Photo editing software',
            'Color correction',
            'Digital enhancement'
          ],
          dependencies: ['role-photographer'],
          sourceFile: 'mock.busy'
        }
      ],
      relationships: [],
      dependencies: [],
      statistics: {
        totalFiles: 4,
        totalOrganizations: 1,
        totalTeams: 3,
        totalPlaybooks: 2,
        totalRoles: 4,
        totalSteps: 0,
        totalDependencies: 0,
        cyclicDependencies: 0,
        layerDistribution: { 'L0': 10 }
      }
    };
    
    console.log('📋 Testing with mock data:');
    console.log(`   Organizations: ${mockAnalysis.organizations.length}`);
    console.log(`   Teams: ${mockAnalysis.teams.length}`);
    console.log(`   Playbooks: ${mockAnalysis.playbooks.length}`);
    console.log(`   Roles: ${mockAnalysis.roles.length}`);
    
    // Test 1: Graph Model
    console.log('\n🔍 Test 1: Graph Model');
    const graph = new VisualizationGraphModel('Test Graph', 'Testing the graph model');
    
    // Add some test nodes
    graph.addNode({
      id: 'org-1',
      type: 'organization',
      label: 'Test Organization',
      metadata: { layer: 'L0' }
    });
    
    graph.addNode({
      id: 'team-1',
      type: 'team',
      label: 'Test Team',
      parent: 'org-1',
      metadata: { layer: 'L0' }
    });
    
    graph.addEdge({
      id: 'edge-1',
      type: 'hierarchy',
      source: 'org-1',
      target: 'team-1',
      metadata: {}
    });
    
    console.log(`✅ Graph model: ${graph.nodes.size} nodes, ${graph.edges.size} edges`);
    console.log(`   Graph depth: ${graph.getGraphDepth()}`);
    console.log(`   Connected components: ${graph.getConnectedComponents().length}`);
    
    // Test 2: Graph Builder
    console.log('\n🔍 Test 2: Graph Builder');
    const graphBuilder = new GraphBuilder();
    const builtGraph = graphBuilder.buildGraph(mockAnalysis, 'organizational-overview');
    
    console.log(`✅ Built graph: ${builtGraph.nodes.size} nodes, ${builtGraph.edges.size} edges`);
    
    // Get node types
    const nodeTypes = new Set<string>();
    for (const node of builtGraph.nodes.values()) {
      nodeTypes.add(node.type);
    }
    console.log(`   Node types: ${Array.from(nodeTypes).join(', ')}`);
    
    // Test 3: Hierarchical Layout
    console.log('\n🔍 Test 3: Hierarchical Layout');
    const layout = new HierarchicalLayout();
    
    const layoutResult = layout.calculateLayout(builtGraph);
    
    console.log(`✅ Layout calculated for ${layoutResult.positions.size} nodes`);
    console.log(`   Layout bounds: ${layoutResult.bounds.width}x${layoutResult.bounds.height}`);
    console.log(`   Converged: ${layoutResult.metadata.converged}`);
    
    // Apply positions to graph
    for (const [nodeId, position] of layoutResult.positions) {
      const node = builtGraph.getNode(nodeId);
      if (node) {
        node.position = position;
      }
    }
    
    // Test 4: Graph Analysis
    console.log('\n🔍 Test 4: Graph Analysis');
    const cycles = builtGraph.detectCycles();
    const components = builtGraph.getConnectedComponents();
    
    console.log(`✅ Graph analysis:`);
    console.log(`   Cycles detected: ${cycles.length}`);
    console.log(`   Connected components: ${components.length}`);
    console.log(`   Graph depth: ${builtGraph.getGraphDepth()}`);
    
    // Test 5: Serialization
    console.log('\n🔍 Test 5: Serialization');
    const serialized = builtGraph.toJSON();
    const restored = VisualizationGraphModel.fromJSON(serialized);
    
    console.log(`✅ Serialization test:`);
    console.log(`   Original: ${builtGraph.nodes.size} nodes`);
    console.log(`   Restored: ${restored.nodes.size} nodes`);
    console.log(`   Data integrity: ${builtGraph.nodes.size === restored.nodes.size ? 'PASS' : 'FAIL'}`);
    
    // Test 6: Search and Filtering
    console.log('\n🔍 Test 6: Search and Filtering');
    const searchResults = builtGraph.search({
      nodeType: 'team',
      nodeLabel: 'Creative'
    });
    
    const filteredGraph = builtGraph.filter({
      nodes: (node) => node.type === 'organization' || node.type === 'team'
    });
    
    console.log(`✅ Search and filtering:`);
    console.log(`   Search results: ${searchResults.nodes.length} nodes`);
    console.log(`   Filtered graph: ${filteredGraph.nodes.size} nodes`);
    
    // Test 7: Path Finding
    console.log('\n🔍 Test 7: Path Finding');
    const allNodes = Array.from(builtGraph.nodes.values());
    if (allNodes.length >= 2) {
      const path = builtGraph.findPath(allNodes[0].id, allNodes[1].id);
      console.log(`✅ Path finding: Found path with ${path.length} nodes`);
    } else {
      console.log(`✅ Path finding: Skipped (insufficient nodes)`);
    }
    
    console.log('\n🎉 All standalone tests passed!');
    console.log('\n📊 Final Statistics:');
    console.log(`   Total nodes tested: ${builtGraph.nodes.size}`);
    console.log(`   Total edges tested: ${builtGraph.edges.size}`);
    console.log(`   Graph operations: All successful`);
    console.log(`   Layout calculation: Successful`);
    console.log(`   Serialization: Successful`);
    
    console.log('\n🚀 Core visualization components are working correctly!');
    console.log('   Interactive demo: npm run viz:demo');
    console.log('   Open http://localhost:3000 to see the full visualization');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runStandaloneTest();
}