#!/usr/bin/env node
/**
 * Simple test for BUSY visualization system (without compiler dependencies)
 */

import { VisualizationUtils } from './index';

async function runSimpleTest() {
  console.log('🎯 BUSY Visualization System - Simple Test\n');
  
  try {
    // Create mock analysis data
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
          layer: 'L0' as const,
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
          layer: 'L0' as const,
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
          layer: 'L0' as const,
          team: 'team-client-ops',
          steps: [
            {
              id: 'step-initial-contact',
              name: 'Initial Client Contact',
              description: 'First interaction with potential client',
              type: 'human' as const,
              duration: '30m',
              inputs: [],
              outputs: [],
              dependencies: []
            },
            {
              id: 'step-consultation',
              name: 'Client Consultation',
              description: 'Detailed consultation to understand client needs',
              type: 'human' as const,
              duration: '60m',
              inputs: [],
              outputs: [],
              dependencies: ['step-initial-contact']
            }
          ],
          inputs: [
            {
              name: 'Client Inquiry',
              type: 'Communication',
              format: 'email',
              required: true,
              description: 'Initial client inquiry with basic requirements'
            }
          ],
          outputs: [
            {
              name: 'Onboarding Package',
              type: 'Document',
              format: 'pdf',
              required: true,
              description: 'Complete client onboarding documentation'
            }
          ],
          dependencies: [],
          sourceFile: 'mock.busy'
        },
        {
          id: 'playbook-photo-production',
          name: 'Photo Production',
          description: 'End-to-end photography production workflow',
          layer: 'L0' as const,
          team: 'team-creative',
          steps: [
            {
              id: 'step-shoot-planning',
              name: 'Shoot Planning',
              description: 'Plan the photography session',
              type: 'human' as const,
              duration: '45m',
              inputs: [],
              outputs: [],
              dependencies: []
            },
            {
              id: 'step-photography',
              name: 'Photography Session',
              description: 'Conduct the actual photo shoot',
              type: 'human' as const,
              duration: '2h',
              inputs: [],
              outputs: [],
              dependencies: ['step-shoot-planning']
            },
            {
              id: 'step-editing',
              name: 'Photo Editing',
              description: 'Edit and enhance the captured photos',
              type: 'human' as const,
              duration: '3h',
              inputs: [],
              outputs: [],
              dependencies: ['step-photography']
            }
          ],
          inputs: [
            {
              name: 'Client Brief',
              type: 'Document',
              format: 'pdf',
              required: true,
              description: 'Detailed client requirements and creative brief'
            }
          ],
          outputs: [
            {
              name: 'Final Photos',
              type: 'Media',
              format: 'jpg',
              required: true,
              description: 'Edited and finalized photography deliverables'
            }
          ],
          dependencies: ['playbook-client-onboarding'],
          sourceFile: 'mock.busy'
        }
      ],
      roles: [
        {
          id: 'role-inquiry-manager',
          name: 'Inquiry Manager',
          description: 'Manages client inquiries and initial communications',
          layer: 'L0' as const,
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
          layer: 'L0' as const,
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
          layer: 'L0' as const,
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
          layer: 'L0' as const,
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
      relationships: [
        {
          id: 'rel-org-teams',
          type: 'hierarchy' as const,
          source: 'org-photography-business',
          target: 'team-client-ops',
          description: 'Organization contains client operations team',
          metadata: { level: 1 }
        },
        {
          id: 'rel-team-roles',
          type: 'hierarchy' as const,
          source: 'team-client-ops',
          target: 'role-inquiry-manager',
          description: 'Team contains inquiry manager role',
          metadata: { level: 2 }
        },
        {
          id: 'rel-playbook-dependency',
          type: 'dependency' as const,
          source: 'playbook-client-onboarding',
          target: 'playbook-photo-production',
          description: 'Photo production depends on client onboarding',
          metadata: { critical: true }
        }
      ],
      dependencies: [
        {
          id: 'dep-onboarding-production',
          source: 'playbook-client-onboarding',
          target: 'playbook-photo-production',
          type: 'requires' as const,
          strength: 1.0,
          critical: true,
          description: 'Photo production requires completed client onboarding'
        },
        {
          id: 'dep-role-coordination',
          source: 'role-inquiry-manager',
          target: 'role-project-coordinator',
          type: 'references' as const,
          strength: 0.8,
          critical: false,
          description: 'Project coordinator works with inquiry manager'
        }
      ],
      statistics: {
        totalFiles: 4,
        totalOrganizations: 1,
        totalTeams: 3,
        totalPlaybooks: 2,
        totalRoles: 4,
        totalSteps: 5,
        totalDependencies: 2,
        cyclicDependencies: 0,
        layerDistribution: { 'L0': 10 }
      }
    };
    
    console.log('📋 Testing with comprehensive mock data...');
    console.log(`   Organizations: ${mockAnalysis.organizations.length}`);
    console.log(`   Teams: ${mockAnalysis.teams.length}`);
    console.log(`   Playbooks: ${mockAnalysis.playbooks.length}`);
    console.log(`   Roles: ${mockAnalysis.roles.length}`);
    
    // Test 1: Organizational Overview
    console.log('\n🔍 Test 1: Organizational Overview');
    const orgViz = VisualizationUtils.createOrganizationalView({
      layout: { type: 'hierarchical', animate: true },
      interactive: true,
      showLabels: true
    });
    
    await orgViz.loadFromAnalysis(mockAnalysis);
    const orgGraph = orgViz.getGraph();
    console.log(`✅ Created graph with ${orgGraph.nodes.size} nodes and ${orgGraph.edges.size} edges`);
    
    // Test 2: Playbook Detail View
    console.log('\n🔍 Test 2: Playbook Detail View');
    const playbookViz = VisualizationUtils.createPlaybookDetailView();
    await playbookViz.loadFromAnalysis(mockAnalysis);
    const playbookGraph = playbookViz.getGraph();
    console.log(`✅ Created playbook view with ${playbookGraph.nodes.size} nodes and ${playbookGraph.edges.size} edges`);
    
    // Test 3: Role Interaction View
    console.log('\n🔍 Test 3: Role Interaction View');
    const roleViz = VisualizationUtils.createRoleInteractionView();
    await roleViz.loadFromAnalysis(mockAnalysis);
    const roleGraph = roleViz.getGraph();
    console.log(`✅ Created role interaction view with ${roleGraph.nodes.size} nodes and ${roleGraph.edges.size} edges`);
    
    // Test 4: Dependency View
    console.log('\n🔍 Test 4: Dependency Graph');
    const depViz = VisualizationUtils.createDependencyView();
    await depViz.loadFromAnalysis(mockAnalysis);
    const depGraph = depViz.getGraph();
    console.log(`✅ Created dependency graph with ${depGraph.nodes.size} nodes and ${depGraph.edges.size} edges`);
    
    // Test 5: Performance Metrics
    console.log('\n🔍 Test 5: Performance Metrics');
    const metrics = orgViz.getMetrics();
    console.log('⚡ Performance:');
    console.log(`   Analysis Time: ${metrics.analysisTime}ms`);
    console.log(`   Layout Time: ${metrics.layoutTime}ms`);
    console.log(`   Node Count: ${metrics.nodeCount}`);
    console.log(`   Edge Count: ${metrics.edgeCount}`);
    console.log(`   Memory Usage: ${Math.round(metrics.memoryUsage / 1024)}KB`);
    
    // Test 6: Filtering
    console.log('\n🔍 Test 6: Filtering');
    orgViz.configure({
      filters: {
        nodeTypes: ['organization', 'team'],
        edgeTypes: ['hierarchy']
      }
    });
    const filteredNodes = orgViz.getNodes().filter((n: any) => n.visible !== false);
    console.log(`✅ After filtering: ${filteredNodes.length} visible nodes`);
    
    // Test 7: Export
    console.log('\n🔍 Test 7: Data Export');
    const exportData = orgViz.exportData();
    console.log(`✅ Exported ${exportData.nodes.length} nodes and ${exportData.edges.length} edges`);
    
    // Test 8: Selection
    console.log('\n🔍 Test 8: Selection');
    const teamNodes = orgViz.getNodes().filter((n: any) => n.type === 'team');
    if (teamNodes.length > 0) {
      orgViz.selectNode(teamNodes[0].id);
      const selection = orgViz.getSelection();
      console.log(`✅ Selected: ${teamNodes[0].label} (${selection.selectedNodes.size} total selected)`);
    }
    
    // Test 9: Graph Analysis
    console.log('\n🔍 Test 9: Graph Analysis');
    const cycles = orgGraph.detectCycles();
    const components = orgGraph.getConnectedComponents();
    const depth = orgGraph.getGraphDepth();
    console.log(`✅ Analysis: ${cycles.length} cycles, ${components.length} components, depth ${depth}`);
    
    // Cleanup
    orgViz.destroy();
    playbookViz.destroy();
    roleViz.destroy();
    depViz.destroy();
    
    console.log('\n🎉 All tests passed successfully!');
    console.log('\n🚀 To see the interactive visualization:');
    console.log('   npm run viz:demo');
    console.log('   Open http://localhost:3000 in your browser');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runSimpleTest();
}