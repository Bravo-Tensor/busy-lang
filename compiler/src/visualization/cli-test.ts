#!/usr/bin/env node
/**
 * CLI test for BUSY visualization with real files
 */

import { VisualizationUtils } from './index';
import * as path from 'path';
import * as fs from 'fs';

async function testWithRealFiles() {
  console.log('🎯 Testing BUSY Visualization with Real Files...\n');
  
  try {
    // Find BUSY files in examples directory
    const examplesDir = path.join(__dirname, '../../../examples');
    const busyFiles: string[] = [];
    
    function findBusyFiles(dir: string) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          findBusyFiles(fullPath);
        } else if (item.name.endsWith('.busy')) {
          busyFiles.push(fullPath);
        }
      }
    }
    
    findBusyFiles(examplesDir);
    
    if (busyFiles.length === 0) {
      console.log('⚠️  No .busy files found in examples directory');
      console.log('📁 Searching in:', examplesDir);
      return;
    }
    
    console.log(`📁 Found ${busyFiles.length} BUSY files:`);
    busyFiles.forEach(file => {
      const relativePath = path.relative(examplesDir, file);
      console.log(`   • ${relativePath}`);
    });
    
    console.log('\n🔍 Creating visualization...');
    
    // Create organizational overview
    const viz = VisualizationUtils.createOrganizationalView({
      layout: { type: 'hierarchical', animate: true },
      interactive: true,
      showLabels: true
    });
    
    // Load and analyze files
    console.log('📋 Loading and analyzing files...');
    await viz.loadFromFiles(busyFiles);
    
    // Get results
    const graph = viz.getGraph();
    const nodes = viz.getNodes();
    const edges = viz.getEdges();
    const metrics = viz.getMetrics();
    
    console.log('\n📊 Analysis Results:');
    console.log(`   Nodes: ${graph.nodes.size}`);
    console.log(`   Edges: ${graph.edges.size}`);
    console.log('   Node Types:', [...new Set(nodes.map((n: any) => n.type))].join(', '));
    console.log('   Edge Types:', [...new Set(edges.map((e: any) => e.type))].join(', '));
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`   Parse Time: ${metrics.parseTime}ms`);
    console.log(`   Analysis Time: ${metrics.analysisTime}ms`);
    console.log(`   Layout Time: ${metrics.layoutTime}ms`);
    console.log(`   Total Time: ${metrics.totalTime}ms`);
    console.log(`   Memory Usage: ${Math.round(metrics.memoryUsage / 1024)}KB`);
    
    // Test different view types
    console.log('\n🔄 Testing different visualizations...');
    
    // Playbook detail view
    const playbookViz = VisualizationUtils.createPlaybookDetailView();
    await playbookViz.loadFromFiles(busyFiles);
    console.log(`   Playbook Detail: ${playbookViz.getGraph().nodes.size} nodes`);
    
    // Role interaction view
    const roleViz = VisualizationUtils.createRoleInteractionView();
    await roleViz.loadFromFiles(busyFiles);
    console.log(`   Role Interaction: ${roleViz.getGraph().nodes.size} nodes`);
    
    // Dependency view
    const depViz = VisualizationUtils.createDependencyView();
    await depViz.loadFromFiles(busyFiles);
    console.log(`   Dependencies: ${depViz.getGraph().nodes.size} nodes`);
    
    // Test export
    console.log('\n💾 Testing data export...');
    const exportData = viz.exportData();
    console.log(`   Exported: ${exportData.nodes.length} nodes, ${exportData.edges.length} edges`);
    
    // Test filtering
    console.log('\n🎛️ Testing filters...');
    viz.configure({
      filters: {
        nodeTypes: ['organization', 'team']
      }
    });
    const filteredNodes = viz.getNodes().filter((n: any) => n.visible !== false);
    console.log(`   After filtering: ${filteredNodes.length} visible nodes`);
    
    // Cleanup
    viz.destroy();
    playbookViz.destroy();
    roleViz.destroy();
    depViz.destroy();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n🚀 To see the interactive visualization, run:');
    console.log('   npm run viz:demo');
    console.log('   Then open http://localhost:3000 in your browser');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    process.exit(1);
  }
}

async function testWithMockDataOnly() {
  console.log('🎯 Testing BUSY Visualization with Mock Data...\n');
  
  try {
    const mockAnalysis = {
      organizations: [{
        id: 'org-photography-business',
        name: 'Solo Photography Business',
        description: 'Professional photography business',
        layer: 'L0' as const,
        teams: ['team-client-ops', 'team-creative', 'team-business'],
        sourceFile: 'mock.busy'
      }],
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
      playbooks: [{
        id: 'playbook-client-onboarding',
        name: 'Client Onboarding',
        description: 'Onboard new clients',
        layer: 'L0' as const,
        team: 'team-client-ops',
        steps: [],
        inputs: [],
        outputs: [],
        dependencies: [],
        sourceFile: 'mock.busy'
      }],
      roles: [{
        id: 'role-inquiry-manager',
        name: 'Inquiry Manager',
        description: 'Manages client inquiries',
        layer: 'L0' as const,
        team: 'team-client-ops',
        responsibilities: ['Respond to inquiries'],
        capabilities: ['Customer service'],
        dependencies: [],
        sourceFile: 'mock.busy'
      }],
      relationships: [],
      dependencies: [],
      statistics: {
        totalFiles: 1,
        totalOrganizations: 1,
        totalTeams: 2,
        totalPlaybooks: 1,
        totalRoles: 1,
        totalSteps: 0,
        totalDependencies: 0,
        cyclicDependencies: 0,
        layerDistribution: { 'L0': 5 }
      }
    };
    
    const viz = VisualizationUtils.createOrganizationalView();
    await viz.loadFromAnalysis(mockAnalysis);
    
    const graph = viz.getGraph();
    console.log(`✅ Mock data test successful!`);
    console.log(`📊 Created visualization with ${graph.nodes.size} nodes and ${graph.edges.size} edges`);
    
    viz.destroy();
    
    console.log('\n🚀 To see the interactive visualization, run:');
    console.log('   npm run viz:demo');
    console.log('   Then open http://localhost:3000 in your browser');
    
  } catch (error) {
    console.error('❌ Mock data test failed:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--mock-only')) {
    testWithMockDataOnly();
  } else {
    testWithRealFiles();
  }
}