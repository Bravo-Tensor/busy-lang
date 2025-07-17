/**
 * AST Builder - Converts parsed YAML to AST nodes
 * Third phase of the BUSY compiler pipeline
 */

import type { ParseResult, ParsedFile, BusyFileContent } from '@/core/parser';
import type { 
  BusyAST, 
  BusyFileNode, 
  TeamNode, 
  RoleNode, 
  PlaybookNode,
  DocumentNode,
  DocumentSectionNode,
  DocumentFieldNode,
  TaskNode,
  DeliverableNode,
  ImportNode,
  ResourceNode,
  SymbolTable,
  DependencyGraph,
  RepositoryMetadata,
  SourceLocation,
  FileMetadata,
  NamespaceInfo
} from './nodes';
import { SymbolTableBuilder } from '@/symbols/table';
import { YamlParser } from '@/utils/yaml-utils';

/**
 * AST Builder result
 */
export interface BuildResult {
  /** Complete AST */
  ast: BusyAST;
  
  /** Build statistics */
  stats: BuildStats;
  
  /** Build errors */
  errors: BuildError[];
  
  /** Build warnings */
  warnings: BuildWarning[];
}

/**
 * Build statistics
 */
export interface BuildStats {
  totalFiles: number;
  nodesCreated: number;
  symbolsCreated: number;
  dependenciesCreated: number;
  buildDurationMs: number;
}

/**
 * Build error
 */
export interface BuildError {
  message: string;
  file?: string;
  location?: SourceLocation;
}

/**
 * Build warning
 */
export interface BuildWarning {
  message: string;
  file?: string;
  location?: SourceLocation;
}

/**
 * AST Builder class
 */
export class ASTBuilder {
  private symbolTableBuilder: SymbolTableBuilder;
  private yamlParser: YamlParser;
  private errors: BuildError[] = [];
  private warnings: BuildWarning[] = [];
  
  constructor() {
    this.symbolTableBuilder = new SymbolTableBuilder();
    this.yamlParser = new YamlParser();
  }
  
  /**
   * Create location object with position information
   */
  private createLocation(parsedFile: ParsedFile, path: (string | number)[]): SourceLocation {
    const location: SourceLocation = {
      file: parsedFile.filePath,
      path: path
    };
    
    // Try to get position information from YAML
    try {
      const position = this.yamlParser.getPositionForPath(parsedFile.yaml, path);
      if (position) {
        location.position = position;
      }
      
      const range = this.yamlParser.getRangeForPath(parsedFile.yaml, path);
      if (range) {
        location.range = range;
      }
    } catch (error) {
      // If position extraction fails, just use the basic location
      // This ensures the system is robust even if position tracking fails
    }
    
    return location;
  }
  
  /**
   * Build complete AST from parse result
   */
  async build(parseResult: ParseResult): Promise<BuildResult> {
    const startTime = Date.now();
    this.errors = [];
    this.warnings = [];
    
    // Create repository metadata
    const metadata = this.buildRepositoryMetadata(parseResult);
    
    // Build file nodes
    const files = new Map<string, BusyFileNode>();
    let totalNodes = 0;
    
    for (const parsedFile of parseResult.parsedFiles) {
      try {
        const fileNode = this.buildFileNode(parsedFile);
        files.set(parsedFile.filePath, fileNode);
        totalNodes += this.countNodes(fileNode);
      } catch (error) {
        this.errors.push({
          message: `Failed to build AST for file: ${(error as Error).message}`,
          file: parsedFile.filePath
        });
      }
    }
    
    // Build symbol table
    const symbols = this.symbolTableBuilder.build(files);
    
    // Build dependency graph
    const dependencies = this.buildDependencyGraph(symbols);
    
    // Create root AST node
    const ast: BusyAST = {
      type: 'BusyAST',
      files,
      symbols,
      dependencies,
      metadata,
      children: Array.from(files.values())
    };
    
    const stats: BuildStats = {
      totalFiles: parseResult.parsedFiles.length,
      nodesCreated: totalNodes,
      symbolsCreated: this.countSymbols(symbols),
      dependenciesCreated: dependencies.edges.length,
      buildDurationMs: Date.now() - startTime
    };
    
    return {
      ast,
      stats,
      errors: this.errors,
      warnings: this.warnings
    };
  }
  
  /**
   * Build repository metadata
   */
  private buildRepositoryMetadata(parseResult: ParseResult): RepositoryMetadata {
    const layers = new Set<'L0' | 'L1' | 'L2'>();
    const organizations = new Set<string>();
    const teams = new Set<string>();
    
    for (const file of parseResult.parsedFiles) {
      layers.add(file.namespace.layer);
      if (file.namespace.org) {
        organizations.add(file.namespace.org);
      }
      teams.add(file.namespace.team);
    }
    
    return {
      rootPath: '', // Will be set by compiler
      totalFiles: parseResult.parsedFiles.length,
      layers: Array.from(layers).sort(),
      organizations: Array.from(organizations).sort(),
      teams: Array.from(teams).sort()
    };
  }
  
  /**
   * Build file node from parsed file
   */
  private buildFileNode(parsedFile: ParsedFile): BusyFileNode {
    const content = parsedFile.yaml.data;
    
    // Build imports
    const imports = this.buildImports(content.imports || [], parsedFile);
    
    // Build content node based on file type
    let contentNode: TeamNode | RoleNode | PlaybookNode | DocumentNode;
    
    switch (parsedFile.fileType) {
      case 'team':
        contentNode = this.buildTeamNode(content.team || content.teams![0], parsedFile);
        break;
      case 'role':
        contentNode = this.buildRoleNode(content.role!, parsedFile);
        break;
      case 'playbook':
        contentNode = this.buildPlaybookNode(content.playbook!, parsedFile);
        break;
      case 'document':
        contentNode = this.buildDocumentNode(content.document!, parsedFile);
        break;
      default:
        throw new Error(`Unknown file type: ${parsedFile.fileType}`);
    }
    
    const metadata: FileMetadata = {
      version: content.version,
      name: content.metadata.name,
      description: content.metadata.description,
      layer: content.metadata.layer
    };
    
    const namespace: NamespaceInfo = {
      org: parsedFile.namespace.org,
      layer: parsedFile.namespace.layer,
      team: parsedFile.namespace.team,
      category: parsedFile.namespace.category
    };
    
    const fileNode: BusyFileNode = {
      type: 'BusyFile',
      filePath: parsedFile.filePath,
      metadata,
      imports,
      content: contentNode,
      namespace,
      location: this.createLocation(parsedFile, []),
      children: [contentNode, ...imports]
    };
    
    // Set parent references
    contentNode.parent = fileNode;
    for (const importNode of imports) {
      importNode.parent = fileNode;
    }
    
    return fileNode;
  }
  
  /**
   * Build import nodes
   */
  private buildImports(imports: any[], parsedFile: ParsedFile): ImportNode[] {
    return imports.map((imp, index) => {
      const importNode: ImportNode = {
        type: 'Import',
        importType: imp.tool ? 'tool' : 'advisor',
        name: imp.tool || imp.advisor,
        capability: imp.capability || '',
        location: this.createLocation(parsedFile, ['imports', index])
      };
      
      return importNode;
    });
  }
  
  /**
   * Build team node
   */
  private buildTeamNode(team: any, parsedFile: ParsedFile): TeamNode {
    const roles = (team.roles || []).map((role: any, index: number) => 
      this.buildRoleNode(role, parsedFile, ['team', 'roles', index])
    );
    
    const playbooks = (team.playbooks || []).map((playbook: any, index: number) => 
      this.buildPlaybookNode(playbook, parsedFile, ['team', 'playbooks', index])
    );
    
    const resources = (team.resources || []).map((resource: any, index: number) => 
      this.buildResourceNode(resource, parsedFile, ['team', 'resources', index])
    );
    
    const teamNode: TeamNode = {
      type: 'Team',
      name: team.name,
      teamType: team.type,
      description: team.description,
      roles,
      playbooks,
      resources,
      governance: team.governance ? {
        type: 'Governance',
        escalationPath: team.governance.escalation_path,
        decisionAuthority: team.governance.decision_authority || [],
        location: this.createLocation(parsedFile, ['team', 'governance'])
      } : undefined,
      interfaces: team.interfaces ? {
        type: 'TeamInterfaces',
        external: team.interfaces.external || [],
        internal: team.interfaces.internal || [],
        location: this.createLocation(parsedFile, ['team', 'interfaces'])
      } : undefined,
      successMetrics: team.success_metrics || [],
      location: this.createLocation(parsedFile, ['team']),
      children: [...roles, ...playbooks, ...resources]
    };
    
    // Set parent references
    for (const child of teamNode.children || []) {
      child.parent = teamNode;
    }
    
    return teamNode;
  }
  
  /**
   * Build role node
   */
  private buildRoleNode(role: any, parsedFile: ParsedFile, basePath: (string | number)[] = ['role']): RoleNode {
    const tasks = (role.tasks || []).map((task: any, index: number) => 
      this.buildTaskNode(task, parsedFile, [...basePath, 'tasks', index])
    );
    
    const onboarding = (role.onboarding || []).map((step: any, index: number) => ({
      type: 'OnboardingStep' as const,
      step: step.step,
      duration: step.duration,
      location: this.createLocation(parsedFile, [...basePath, 'onboarding', index])
    }));
    
    const roleNode: RoleNode = {
      type: 'Role',
      name: role.name,
      inheritsFrom: role.inherits_from,
      description: role.description,
      onboarding,
      tasks,
      responsibilities: role.responsibilities || [],
      interfaces: role.interfaces ? {
        type: 'RoleInterface',
        inputs: (role.interfaces.inputs || []).map((input: any, index: number) => 
          this.buildDeliverableNode(input, parsedFile, [...basePath, 'interfaces', 'inputs', index])
        ),
        outputs: (role.interfaces.outputs || []).map((output: any, index: number) => 
          this.buildDeliverableNode(output, parsedFile, [...basePath, 'interfaces', 'outputs', index])
        ),
        location: this.createLocation(parsedFile, [...basePath, 'interfaces'])
      } : undefined,
      location: this.createLocation(parsedFile, basePath),
      children: [...tasks, ...onboarding]
    };
    
    // Set parent references
    for (const child of roleNode.children || []) {
      child.parent = roleNode;
    }
    
    return roleNode;
  }
  
  /**
   * Build playbook node
   */
  private buildPlaybookNode(playbook: any, parsedFile: ParsedFile, basePath: (string | number)[] = ['playbook']): PlaybookNode {
    const inputs = (playbook.inputs || []).map((input: any, index: number) => 
      this.buildDeliverableNode(input, parsedFile, [...basePath, 'inputs', index])
    );
    
    const outputs = (playbook.outputs || []).map((output: any, index: number) => 
      this.buildDeliverableNode(output, parsedFile, [...basePath, 'outputs', index])
    );
    
    const steps = (playbook.steps || []).map((step: any, index: number) => 
      this.buildTaskNode(step, parsedFile, [...basePath, 'steps', index])
    );
    
    const cadence = {
      type: 'Cadence' as const,
      frequency: playbook.cadence?.frequency,
      schedule: playbook.cadence?.schedule,
      triggerEvents: playbook.cadence?.trigger_events || [],
      location: this.createLocation(parsedFile, [...basePath, 'cadence'])
    };

    const playbookNode: PlaybookNode = {
      type: 'Playbook',
      name: playbook.name,
      description: playbook.description,
      cadence,
      inputs,
      outputs,
      steps,
      issueResolution: [], // TODO: Implement issue resolution parsing
      location: this.createLocation(parsedFile, basePath),
      children: [cadence, ...inputs, ...outputs, ...steps]
    };
    
    // Set parent references
    for (const child of playbookNode.children || []) {
      child.parent = playbookNode;
    }
    
    return playbookNode;
  }
  
  /**
   * Build document node
   */
  private buildDocumentNode(document: any, parsedFile: ParsedFile, basePath: (string | number)[] = ['document']): DocumentNode {
    const sections = (document.sections || []).map((section: any, index: number) => 
      this.buildDocumentSectionNode(section, parsedFile, [...basePath, 'sections', index])
    );
    
    const documentNode: DocumentNode = {
      type: 'Document',
      metadata: {
        version: parsedFile.yaml.data.version,
        name: document.metadata.name,
        description: document.metadata.description,
        layer: document.metadata.layer
      },
      contentType: document.content_type,
      sections: sections,
      narrativeContent: document.narrative_content,
      location: this.createLocation(parsedFile, basePath),
      children: sections
    };
    
    // Set parent references
    for (const child of documentNode.children || []) {
      child.parent = documentNode;
    }
    
    return documentNode;
  }
  
  /**
   * Build document section node
   */
  private buildDocumentSectionNode(section: any, parsedFile: ParsedFile, basePath: (string | number)[]): DocumentSectionNode {
    const fields = (section.fields || []).map((field: any, index: number) => 
      this.buildDocumentFieldNode(field, parsedFile, [...basePath, 'fields', index])
    );
    
    const sectionNode: DocumentSectionNode = {
      type: 'DocumentSection',
      name: section.name,
      sectionType: section.type,
      fields: fields,
      content: section.content,
      location: this.createLocation(parsedFile, basePath),
      children: fields
    };
    
    // Set parent references
    for (const child of sectionNode.children || []) {
      child.parent = sectionNode;
    }
    
    return sectionNode;
  }
  
  /**
   * Build document field node
   */
  private buildDocumentFieldNode(field: any, parsedFile: ParsedFile, basePath: (string | number)[]): DocumentFieldNode {
    const fieldNode: DocumentFieldNode = {
      type: 'DocumentField',
      name: field.name,
      fieldType: field.type,
      required: field.required || false,
      options: field.options,
      location: this.createLocation(parsedFile, basePath)
    };
    
    return fieldNode;
  }
  
  /**
   * Build task node
   */
  private buildTaskNode(task: any, parsedFile: ParsedFile, basePath: (string | number)[]): TaskNode {
    const inputs = (task.inputs || []).map((input: any, index: number) => 
      this.buildDeliverableNode(input, parsedFile, [...basePath, 'inputs', index])
    );
    
    const outputs = (task.outputs || []).map((output: any, index: number) => 
      this.buildDeliverableNode(output, parsedFile, [...basePath, 'outputs', index])
    );
    
    const subtasks = (task.subtasks || []).map((subtask: any, index: number) => 
      this.buildTaskNode(subtask, parsedFile, [...basePath, 'subtasks', index])
    );
    
    const taskNode: TaskNode = {
      type: 'Task',
      name: task.name,
      description: task.description,
      executionType: task.execution_type,
      inputs,
      outputs,
      estimatedDuration: task.estimated_duration,
      algorithm: task.algorithm,
      agentPrompt: task.agent_prompt,
      contextGathering: task.context_gathering,
      uiType: task.ui_type,
      facilitation: task.facilitation ? {
        type: 'Facilitation',
        agenda: task.facilitation.agenda || [],
        location: this.createLocation(parsedFile, [...basePath, 'facilitation'])
      } : undefined,
      issues: [], // TODO: Implement issues parsing
      tags: task.tags || [],
      subtasks: subtasks,
      location: this.createLocation(parsedFile, basePath),
      children: [...inputs, ...outputs, ...subtasks]
    };
    
    // Set parent references
    for (const child of taskNode.children || []) {
      child.parent = taskNode;
    }
    
    return taskNode;
  }
  
  /**
   * Build deliverable node
   */
  private buildDeliverableNode(deliverable: any, parsedFile: ParsedFile, basePath: (string | number)[]): DeliverableNode {
    return {
      type: 'Deliverable',
      name: deliverable.name,
      deliverableType: deliverable.type,
      documentDefinition: deliverable.document_definition,
      format: deliverable.format,
      schema: deliverable.schema ? {
        type: 'Schema',
        schemaType: deliverable.schema.type,
        definition: deliverable.schema.definition,
        location: this.createLocation(parsedFile, [...basePath, 'schema'])
      } : undefined,
      requiredFields: deliverable.required_fields || [],
      validationRules: (deliverable.validation_rules || []).map((rule: any, index: number) => ({
        type: 'ValidationRule',
        ruleType: rule.rule_type,
        condition: rule.condition,
        errorMessage: rule.error_message,
        severity: rule.severity || 'error',
        location: this.createLocation(parsedFile, [...basePath, 'validation_rules', index])
      })),
      location: this.createLocation(parsedFile, basePath)
    };
  }
  
  /**
   * Build resource node
   */
  private buildResourceNode(resource: any, parsedFile: ParsedFile, basePath: (string | number)[]): ResourceNode {
    return {
      type: 'Resource',
      resourceType: resource.type,
      allocation: resource.allocation,
      unit: resource.unit,
      constraints: resource.constraints || [],
      location: this.createLocation(parsedFile, basePath)
    };
  }
  
  /**
   * Build dependency graph
   */
  private buildDependencyGraph(symbols: SymbolTable): DependencyGraph {
    // TODO: Implement dependency graph construction
    return {
      nodes: new Map(),
      edges: [],
      cycles: []
    };
  }
  
  /**
   * Count nodes in AST tree
   */
  private countNodes(node: any): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }
  
  /**
   * Count symbols in symbol table
   */
  private countSymbols(symbols: SymbolTable): number {
    return symbols.roles.size + 
           symbols.playbooks.size + 
           symbols.tasks.size + 
           symbols.deliverables.size + 
           symbols.tools.size + 
           symbols.advisors.size + 
           symbols.teams.size + 
           symbols.documents.size;
  }
}