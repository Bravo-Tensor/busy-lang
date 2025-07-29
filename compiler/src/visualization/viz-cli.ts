#!/usr/bin/env node
/**
 * BUSY Visualization CLI - Direct integration with existing compiler
 */

import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Simple YAML-based analyzer for visualization
async function analyzeFilesDirectly(filePaths: string[]): Promise<any> {
  const yaml = await import('yaml');
  const fs = await import('fs/promises');
  
  const organizations: any[] = [];
  const teams: any[] = [];
  const roles: any[] = [];
  const playbooks: any[] = [];
  const relationships: any[] = [];
  const dependencies: any[] = [];
  
  let fileCount = 0;
  
  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const data = yaml.parse(content);
      
      if (!data || typeof data !== 'object') continue;
      fileCount++;
      
      const fileName = path.basename(filePath, '.busy');
      const dirName = path.dirname(filePath);
      const orgName = extractOrgFromPath(filePath);
      
      // Extract organization
      const orgId = `org-${orgName}`;
      if (!organizations.find(o => o.id === orgId)) {
        organizations.push({
          id: orgId,
          name: orgName,
          description: `${orgName} organization`,
          teams: [],
          sourceFile: filePath
        });
      }
      
      // Handle different entity types based on file structure
      if (data.team && fileName === 'team') {
        // Team file
        const teamName = extractTeamFromPath(filePath);
        const teamId = `team-${teamName}-${data.team.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        teams.push({
          id: teamId,
          name: data.team.name,
          description: data.team.description || '',
          type: data.team.type || 'stream-aligned',
          organization: orgId,
          roles: [],
          playbooks: [],
          interfaces: {
            external: data.team.interfaces?.external || [],
            internal: data.team.interfaces?.internal || []
          },
          sourceFile: filePath
        });
        
        // Add team to organization
        const org = organizations.find(o => o.id === orgId);
        if (org && !org.teams.includes(teamId)) {
          org.teams.push(teamId);
        }
        
      } else if (data.role && (fileName.includes('role') || dirName.includes('roles'))) {
        // Role file
        const teamName = extractTeamFromPath(filePath);
        const teamId = findTeamIdByName(teams, teamName);
        const roleId = `role-${fileName}-${data.role.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        roles.push({
          id: roleId,
          name: data.role.name,
          description: data.role.description || '',
          team: teamId,
          responsibilities: data.role.responsibilities || [],
          capabilities: [], // Not available in current format
          dependencies: [], // Not available in current format
          sourceFile: filePath
        });
        
      } else if (data.playbook && (fileName.includes('playbook') || dirName.includes('playbooks'))) {
        // Playbook file
        const teamName = extractTeamFromPath(filePath);
        const teamId = findTeamIdByName(teams, teamName);
        const playbookId = `playbook-${fileName}-${data.playbook.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        const steps = (data.playbook.process || []).map((step: any, index: number) => ({
          id: `step-${fileName}-${index}`,
          name: step.name || `Step ${index + 1}`,
          description: step.description || '',
          type: step.executionType || 'human',
          duration: step.estimatedDuration || '30m',
          inputs: [],
          outputs: [],
          dependencies: []
        }));
        
        playbooks.push({
          id: playbookId,
          name: data.playbook.name,
          description: data.playbook.description || '',
          team: teamId,
          steps,
          inputs: [],
          outputs: [],
          dependencies: [],
          sourceFile: filePath
        });
      }
      
    } catch (error) {
      console.warn(`⚠️  Could not parse ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  // Create relationships
  teams.forEach(team => {
    const org = organizations.find(o => o.id === team.organization);
    if (org) {
      relationships.push({
        id: `${org.id}->${team.id}`,
        type: 'hierarchy',
        source: org.id,
        target: team.id,
        description: `${team.name} belongs to ${org.name}`
      });
    }
  });
  
  roles.forEach(role => {
    const team = teams.find(t => t.id === role.team);
    if (team) {
      relationships.push({
        id: `${team.id}->${role.id}`,
        type: 'hierarchy',
        source: team.id,
        target: role.id,
        description: `${role.name} is part of ${team.name}`
      });
    }
  });
  
  playbooks.forEach(playbook => {
    const team = teams.find(t => t.id === playbook.team);
    if (team) {
      relationships.push({
        id: `${team.id}->${playbook.id}`,
        type: 'hierarchy',
        source: team.id,
        target: playbook.id,
        description: `${playbook.name} is executed by ${team.name}`
      });
    }
  });
  
  const statistics = {
    totalFiles: fileCount,
    totalOrganizations: organizations.length,
    totalTeams: teams.length,
    totalRoles: roles.length,
    totalPlaybooks: playbooks.length
  };
  
  return {
    organizations,
    teams,
    roles,
    playbooks,
    relationships,
    dependencies,
    statistics
  };
}

function extractOrgFromPath(filePath: string): string {
  const parts = filePath.split(path.sep);
  const examplesIndex = parts.findIndex(p => p === 'examples');
  if (examplesIndex >= 0 && examplesIndex < parts.length - 1) {
    return parts[examplesIndex + 1];
  }
  return 'default-organization';
}

function extractTeamFromPath(filePath: string): string {
  const parts = filePath.split(path.sep);
  // Look for team folder pattern (usually after L0/L1/L2)
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i].match(/^L[012]$/)) {
      return parts[i + 1] || 'default-team';
    }
  }
  return 'default-team';
}

function findTeamIdByName(teams: any[], teamName: string): string {
  const team = teams.find(t => t.name.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(t.name.toLowerCase()));
  return team ? team.id : `team-${teamName}`;
}

interface VizOptions {
  type?: 'org' | 'playbook' | 'role' | 'dependency';
  output?: string;
  demo?: boolean;
  port?: number;
}

async function visualizeBusyFiles(directory: string, options: VizOptions) {
  console.log('🎯 BUSY File Visualization\n');
  
  try {
    // Check if directory exists and has BUSY files
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory not found: ${directory}`);
      process.exit(1);
    }
    
    const busyFiles = await findBusyFiles(directory);
    if (busyFiles.length === 0) {
      console.error(`❌ No .busy files found in: ${directory}`);
      process.exit(1);
    }
    
    console.log(`📁 Found ${busyFiles.length} BUSY files:`);
    busyFiles.forEach(file => {
      const relativePath = path.relative(directory, file);
      console.log(`   • ${relativePath}`);
    });
    
    // Analyze files using existing compiler
    console.log('\n📋 Analyzing BUSY files...');
    const analysisResult = await analyzeBusyFiles(directory);
    
    if (analysisResult.success) {
      console.log('✅ Analysis completed successfully!');
      console.log(`   Files processed: ${analysisResult.stats.totalFiles}`);
      console.log(`   Organizations: ${analysisResult.stats.organizations || 0}`);
      console.log(`   Teams: ${analysisResult.stats.teams || 0}`);
      console.log(`   Playbooks: ${analysisResult.stats.playbooks || 0}`);
      console.log(`   Roles: ${analysisResult.stats.roles || 0}`);
    } else {
      console.log('⚠️  Analysis completed with issues');
      if (analysisResult.errors.length > 0) {
        console.log('   Errors:');
        analysisResult.errors.forEach(error => console.log(`     - ${error}`));
      }
    }
    
    // Generate visualization
    if (options.demo) {
      console.log('\n📊 Creating visualization for demo...');
      // First create the visualization file with real data
      await createVisualization(busyFiles, { ...options, output: 'demo-data.html' });
      
      console.log('\n🚀 Starting demo server...');
      await startDemoServer(options.port || 3000, 'demo-data.html');
    } else {
      console.log('\n📊 Creating visualization...');
      await createVisualization(busyFiles, options);
    }
    
  } catch (error) {
    console.error('❌ Visualization failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function findBusyFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  
  function scanDirectory(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (item.isFile() && item.name.endsWith('.busy')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(directory);
  return files;
}

async function analyzeBusyFiles(directory: string): Promise<{
  success: boolean;
  stats: any;
  errors: string[];
}> {
  try {
    // Use the existing BUSY compiler CLI
    const { stdout, stderr } = await execAsync(`npm run analyze "${directory}"`, {
      cwd: path.join(__dirname, '..', '..')
    });
    
    // Parse the output to extract statistics
    const stats = extractStatsFromOutput(stdout);
    const errors = stderr ? stderr.split('\n').filter(line => line.trim()) : [];
    
    return {
      success: errors.length === 0,
      stats,
      errors
    };
  } catch (error) {
    return {
      success: false,
      stats: {},
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

function extractStatsFromOutput(output: string): any {
  const stats: any = {
    totalFiles: 0,
    organizations: 0,
    teams: 0,
    playbooks: 0,
    roles: 0
  };
  
  // Simple pattern matching to extract stats from CLI output
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('Files analyzed:')) {
      const match = line.match(/(\d+)/);
      if (match) stats.totalFiles = parseInt(match[1]);
    }
    if (line.includes('team.busy')) stats.teams++;
    if (line.includes('playbook')) stats.playbooks++;
    if (line.includes('role')) stats.roles++;
  }
  
  return stats;
}

async function createVisualization(files: string[], options: VizOptions) {
  const visualizationType = options.type || 'org';
  
  console.log(`📊 Creating ${visualizationType} visualization...`);
  console.log('🔍 Analyzing BUSY files to extract real data...');
  
  try {
    // Use a simplified analyzer that directly parses YAML
    const analysisResult = await analyzeFilesDirectly(files);
    
    console.log(`✨ Successfully analyzed ${analysisResult.statistics.totalFiles} files:`);
    console.log(`   Organizations: ${analysisResult.statistics.totalOrganizations}`);
    console.log(`   Teams: ${analysisResult.statistics.totalTeams}`);
    console.log(`   Roles: ${analysisResult.statistics.totalRoles}`);
    console.log(`   Playbooks: ${analysisResult.statistics.totalPlaybooks}`);
    
    // Create interactive HTML with real data
    const htmlContent = generateInteractiveVisualizationHTML(analysisResult, visualizationType);
    
    const outputFile = options.output || 'busy-visualization.html';
    fs.writeFileSync(outputFile, htmlContent);
    
    console.log(`✅ Interactive visualization created: ${outputFile}`);
    console.log(`🌐 Open the file in your browser to view the visualization`);
    
    // Try to open automatically
    try {
      const openCommand = process.platform === 'darwin' ? 'open' : 
                        process.platform === 'win32' ? 'start' : 'xdg-open';
      await execAsync(`${openCommand} "${outputFile}"`);
      console.log('🎉 Opening visualization in your default browser...');
    } catch (error) {
      console.log('💡 Manually open the HTML file to view the visualization');
    }
    
  } catch (error) {
    console.error('❌ Failed to analyze BUSY files:', error instanceof Error ? error.message : String(error));
    console.log('📋 Falling back to basic file listing...');
    
    // Fallback to basic listing
    const htmlContent = generateBasicVisualizationHTML(files, visualizationType);
    const outputFile = options.output || 'busy-visualization.html';
    fs.writeFileSync(outputFile, htmlContent);
    console.log(`✅ Basic visualization created: ${outputFile}`);
  }
}

function generateInteractiveVisualizationHTML(analysisResult: any, type: string): string {
  // Convert analysis result to visualization data
  const nodes: any[] = [];
  const edges: any[] = [];
  
  // Add organizations as nodes
  analysisResult.organizations.forEach((org: any) => {
    nodes.push({
      id: org.id,
      name: org.name,
      type: 'organization',
      description: org.description,
      x: 300,
      y: 200
    });
  });
  
  // Add teams as nodes
  analysisResult.teams.forEach((team: any) => {
    nodes.push({
      id: team.id,
      name: team.name,
      type: 'team',
      description: team.description,
      organization: team.organization
    });
  });
  
  // Add roles as nodes
  analysisResult.roles.forEach((role: any) => {
    nodes.push({
      id: role.id,
      name: role.name,
      type: 'role',
      description: role.description,
      team: role.team
    });
  });
  
  // Add playbooks as nodes
  analysisResult.playbooks.forEach((playbook: any) => {
    nodes.push({
      id: playbook.id,
      name: playbook.name,
      type: 'playbook',
      description: playbook.description,
      team: playbook.team
    });
  });
  
  // Add relationships as edges
  analysisResult.relationships.forEach((rel: any) => {
    edges.push({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      type: rel.type,
      description: rel.description
    });
  });
  
  // Add dependencies as edges
  analysisResult.dependencies.forEach((dep: any) => {
    edges.push({
      id: dep.id,
      source: dep.source,
      target: dep.target,
      type: 'dependency',
      description: dep.description,
      strength: dep.strength
    });
  });
  
  const data = { nodes, edges };
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BUSY File Visualization - ${type}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            background: #f5f5f5; 
            overflow: hidden;
        }
        .container { 
            width: 100vw; 
            height: 100vh; 
            display: flex; 
            flex-direction: column;
        }
        .header { 
            background: #2563eb; 
            color: white; 
            padding: 10px 20px; 
            text-align: center;
            flex-shrink: 0;
        }
        .controls {
            background: #1e40af;
            color: white;
            padding: 8px 20px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-shrink: 0;
        }
        .controls button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .controls button:hover {
            background: #2563eb;
        }
        .controls button.active {
            background: #059669;
        }
        .visualization { 
            flex: 1; 
            background: white; 
            position: relative;
            overflow: hidden;
        }
        .node {
            cursor: pointer;
            stroke-width: 2px;
        }
        .node.organization { fill: #2563eb; stroke: #1d4ed8; }
        .node.team { fill: #7c3aed; stroke: #6d28d9; }
        .node.role { fill: #059669; stroke: #047857; }
        .node.playbook { fill: #dc2626; stroke: #b91c1c; }
        
        .node.selected {
            stroke-width: 4px;
            stroke: #fbbf24;
        }
        
        .link {
            stroke: #94a3b8;
            stroke-width: 1.5px;
            fill: none;
        }
        .link.hierarchy { stroke: #64748b; }
        .link.dependency { stroke: #f59e0b; stroke-dasharray: 5,5; }
        .link.selected { stroke: #fbbf24; stroke-width: 3px; }
        
        .node-label {
            font-size: 10px;
            font-weight: 500;
            text-anchor: middle;
            pointer-events: none;
            fill: white;
        }
        
        .tooltip {
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            display: none;
        }
        
        .stats {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255,255,255,0.9);
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">🎯 BUSY File Visualization</h2>
            <p style="margin: 5px 0 0 0;">Interactive ${type} view</p>
        </div>
        
        <div class="controls">
            <button id="view-org" class="active">Organizational</button>
            <button id="view-deps">Dependencies</button>
            <button id="view-all">All Details</button>
            <span style="margin-left: 20px;">|</span>
            <button id="zoom-fit">Zoom to Fit</button>
            <button id="reset-view">Reset View</button>
        </div>
        
        <div class="visualization" id="viz-container">
            <div class="tooltip" id="tooltip"></div>
            <div class="stats">
                <strong>Stats:</strong><br>
                Organizations: ${analysisResult.statistics.totalOrganizations}<br>
                Teams: ${analysisResult.statistics.totalTeams}<br>
                Roles: ${analysisResult.statistics.totalRoles}<br>
                Playbooks: ${analysisResult.statistics.totalPlaybooks}
            </div>
        </div>
    </div>

    <script>
        // Data from BUSY analysis
        const data = ${JSON.stringify(data, null, 2)};
        
        // Visualization setup
        const container = d3.select('#viz-container');
        const width = window.innerWidth;
        const height = window.innerHeight - 120; // Account for header and controls
        
        const svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', \`0 0 \${width} \${height}\`);
        
        const g = svg.append('g');
        
        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Force simulation
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.edges).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));
        
        // Create links
        const link = g.selectAll('.link')
            .data(data.edges)
            .join('line')
            .attr('class', d => \`link \${d.type}\`);
        
        // Create nodes
        const node = g.selectAll('.node')
            .data(data.nodes)
            .join('circle')
            .attr('class', d => \`node \${d.type}\`)
            .attr('r', d => d.type === 'organization' ? 20 : d.type === 'team' ? 15 : 10)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('click', nodeClicked)
            .on('mouseover', nodeHovered)
            .on('mouseout', nodeUnhovered);
        
        // Create labels
        const label = g.selectAll('.node-label')
            .data(data.nodes)
            .join('text')
            .attr('class', 'node-label')
            .text(d => d.name);
        
        // Simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            label
                .attr('x', d => d.x)
                .attr('y', d => d.y + 4);
        });
        
        // Event handlers
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        let selectedNode = null;
        
        function nodeClicked(event, d) {
            // Clear previous selection
            node.classed('selected', false);
            link.classed('selected', false);
            
            if (selectedNode === d) {
                selectedNode = null;
                return;
            }
            
            selectedNode = d;
            
            // Highlight selected node
            d3.select(this).classed('selected', true);
            
            // Highlight connected edges
            link.classed('selected', edge => 
                edge.source.id === d.id || edge.target.id === d.id
            );
        }
        
        function nodeHovered(event, d) {
            const tooltip = d3.select('#tooltip');
            tooltip.style('display', 'block')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .html(\`
                    <strong>\${d.name}</strong><br>
                    Type: \${d.type}<br>
                    \${d.description ? d.description : ''}
                \`);
        }
        
        function nodeUnhovered() {
            d3.select('#tooltip').style('display', 'none');
        }
        
        // View controls
        d3.select('#view-org').on('click', () => switchView('org'));
        d3.select('#view-deps').on('click', () => switchView('deps'));
        d3.select('#view-all').on('click', () => switchView('all'));
        
        d3.select('#zoom-fit').on('click', zoomToFit);
        d3.select('#reset-view').on('click', resetView);
        
        function switchView(viewType) {
            d3.selectAll('.controls button').classed('active', false);
            d3.select(\`#view-\${viewType}\`).classed('active', true);
            
            // Filter visibility based on view type
            if (viewType === 'org') {
                node.style('opacity', d => 
                    d.type === 'organization' || d.type === 'team' || d.type === 'role' ? 1 : 0.2
                );
                link.style('opacity', d => d.type === 'hierarchy' ? 1 : 0.1);
            } else if (viewType === 'deps') {
                node.style('opacity', d => 
                    d.type === 'playbook' || d.type === 'team' ? 1 : 0.2
                );
                link.style('opacity', d => d.type === 'dependency' ? 1 : 0.1);
            } else {
                node.style('opacity', 1);
                link.style('opacity', 1);
            }
        }
        
        function zoomToFit() {
            const bounds = g.node().getBBox();
            const fullWidth = width;
            const fullHeight = height;
            const scale = 0.8 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
            const translate = [fullWidth / 2 - scale * (bounds.x + bounds.width / 2), 
                             fullHeight / 2 - scale * (bounds.y + bounds.height / 2)];
            
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
        }
        
        function resetView() {
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
            );
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight - 120;
            svg.attr('viewBox', \`0 0 \${newWidth} \${newHeight}\`);
            simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
            simulation.alpha(0.3).restart();
        });
        
        // Initialize with organizational view
        switchView('org');
    </script>
</body>
</html>
  `.trim();
}

function generateBasicVisualizationHTML(files: string[], type: string): string {
  const fileList = files.map(file => path.basename(file)).join(', ');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BUSY File Visualization - ${type}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .file-list { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .demo-link { background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        .demo-link:hover { background: #047857; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 BUSY File Visualization</h1>
            <p>Visualization Type: ${type}</p>
        </div>
        
        <div class="content">
            <h2>📁 Analyzed Files</h2>
            <div class="file-list">
                <strong>Files found:</strong> ${fileList}
            </div>
            
            <h2>🚀 Interactive Demo</h2>
            <p>To see the full interactive visualization with your BUSY files, run:</p>
            <pre style="background: #f0f0f0; padding: 15px; border-radius: 4px;">npm run viz:demo</pre>
            <p>Then open <strong>http://localhost:3000</strong> in your browser.</p>
            <a href="#" onclick="alert('Run: npm run viz:demo')" class="demo-link">View Interactive Demo Instructions</a>
            
            <h2>📊 Visualization Features</h2>
            <ul>
                <li><strong>Organizational Overview:</strong> Hierarchical view of organizations, teams, and roles</li>
                <li><strong>Dependency Graph:</strong> Visual representation of playbook dependencies</li>
                <li><strong>Role Interactions:</strong> How roles connect across teams</li>
                <li><strong>Interactive Controls:</strong> Zoom, pan, filter, and explore</li>
            </ul>
            
            <h2>💡 Next Steps</h2>
            <ol>
                <li>Run <code>npm run viz:demo</code> to start the interactive server</li>
                <li>Open <code>http://localhost:3000</code> in your browser</li>
                <li>Explore the different visualization modes</li>
                <li>Use the interactive controls to analyze your business structure</li>
            </ol>
        </div>
    </div>
</body>
</html>
  `.trim();
}

async function startDemoServer(port: number, dataFile?: string) {
  try {
    console.log(`🌐 Starting demo server on port ${port}...`);
    
    // Create a simple HTTP server here instead of calling external command
    const http = await import('http');
    const fs = await import('fs/promises');
    
    const server = http.createServer(async (req, res) => {
      if (req.url === '/' || req.url === '/demo') {
        try {
          let content: string;
          
          if (dataFile && await fs.access(dataFile).then(() => true).catch(() => false)) {
            // Serve the real data visualization
            content = await fs.readFile(dataFile, 'utf8');
          } else {
            // Serve the mock demo
            content = await fs.readFile(path.join(__dirname, 'demo.html'), 'utf8');
          }
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        } catch (error) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Demo file not found');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });
    
    server.listen(port, () => {
      console.log(`🎯 BUSY Visualization Demo Server Started!`);
      console.log(`📱 Open your browser and visit: http://localhost:${port}`);
      console.log(`🚀 Demo features:`);
      console.log(`   • Interactive organizational visualization`);
      console.log(`   • Zoom, pan, and selection controls`);
      console.log(`   • Different view modes (Organizational, Dependencies, Team Details)`);
      if (dataFile) {
        console.log(`   • Real data from your BUSY files`);
      } else {
        console.log(`   • Mock data representing a photography business`);
      }
      console.log(``);
      console.log(`💡 Press Ctrl+C to stop the server`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down demo server...');
      server.close(() => {
        console.log('✅ Demo server stopped');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start demo server:', error);
    console.log('💡 Try running manually: npm run viz:demo');
  }
}

// CLI Setup
program
  .name('busy-viz')
  .description('BUSY File Visualization CLI')
  .version('1.0.0');

program
  .command('visualize')
  .alias('viz')
  .description('Create visualization from BUSY files')
  .argument('<directory>', 'Directory containing BUSY files')
  .option('-t, --type <type>', 'Visualization type (org|playbook|role|dependency)', 'org')
  .option('-o, --output <file>', 'Output HTML file', 'busy-visualization.html')
  .option('-d, --demo', 'Start interactive demo server')
  .option('-p, --port <port>', 'Demo server port', '3000')
  .action(visualizeBusyFiles);

program
  .command('demo')
  .description('Start interactive demo server')
  .option('-p, --port <port>', 'Server port', '3000')
  .action(async (options) => {
    await startDemoServer(parseInt(options.port));
  });

// Handle direct execution
if (require.main === module) {
  program.parse();
}

export { visualizeBusyFiles, startDemoServer };