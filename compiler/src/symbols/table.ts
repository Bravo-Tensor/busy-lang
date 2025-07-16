/**
 * Symbol Table Builder - Creates and manages symbol table for BUSY AST
 * Tracks all definitions and their references across the repository
 */

import type { 
  BusyFileNode, 
  SymbolTable, 
  Symbol, 
  RoleSymbol, 
  PlaybookSymbol, 
  TaskSymbol, 
  DeliverableSymbol,
  ToolSymbol,
  AdvisorSymbol,
  TeamSymbol,
  DocumentSymbol,
  SymbolReference,
  RoleNode,
  PlaybookNode,
  TeamNode,
  DocumentNode,
  TaskNode,
  DeliverableNode,
  ImportNode
} from '@/ast/nodes';

/**
 * Symbol table builder class
 */
export class SymbolTableBuilder {
  
  /**
   * Build symbol table from file nodes
   */
  build(files: Map<string, BusyFileNode>): SymbolTable {
    const symbolTable: SymbolTable = {
      roles: new Map(),
      playbooks: new Map(),
      tasks: new Map(),
      deliverables: new Map(),
      tools: new Map(),
      advisors: new Map(),
      teams: new Map(),
      documents: new Map()
    };
    
    // First pass: collect all definitions
    for (const [filePath, fileNode] of files) {
      this.collectDefinitions(fileNode, symbolTable);
    }
    
    // Second pass: resolve references
    for (const [filePath, fileNode] of files) {
      this.resolveReferences(fileNode, symbolTable);
    }
    
    // Third pass: mark usage
    this.markUsage(symbolTable);
    
    return symbolTable;
  }
  
  /**
   * Collect all symbol definitions from file
   */
  private collectDefinitions(fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    // Collect imports
    for (const importNode of fileNode.imports) {
      this.addImportSymbol(importNode, fileNode, symbolTable);
    }
    
    // Collect content definitions
    switch (fileNode.content.type) {
      case 'Team':
        this.addTeamSymbol(fileNode.content, fileNode, symbolTable);
        break;
      case 'Role':
        this.addRoleSymbol(fileNode.content, fileNode, symbolTable);
        break;
      case 'Playbook':
        this.addPlaybookSymbol(fileNode.content, fileNode, symbolTable);
        break;
      case 'Document':
        this.addDocumentSymbol(fileNode.content, fileNode, symbolTable);
        break;
    }
  }
  
  /**
   * Add import symbol (tool or advisor)
   */
  private addImportSymbol(importNode: ImportNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    const symbol: ToolSymbol | AdvisorSymbol = {
      name: importNode.name,
      file: fileNode.filePath,
      symbolType: importNode.importType,
      node: importNode,
      references: [],
      isUsed: false,
      namespace: fileNode.namespace,
      capability: importNode.capability
    };
    
    if (importNode.importType === 'tool') {
      symbolTable.tools.set(importNode.name, symbol as ToolSymbol);
    } else {
      symbolTable.advisors.set(importNode.name, symbol as AdvisorSymbol);
    }
  }
  
  /**
   * Add team symbol
   */
  private addTeamSymbol(teamNode: TeamNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    const roleNames: string[] = [];
    const playbookNames: string[] = [];
    
    // Add nested roles
    for (const roleNode of teamNode.roles) {
      this.addRoleSymbol(roleNode, fileNode, symbolTable);
      roleNames.push(roleNode.name);
    }
    
    // Add nested playbooks
    for (const playbookNode of teamNode.playbooks) {
      this.addPlaybookSymbol(playbookNode, fileNode, symbolTable);
      playbookNames.push(playbookNode.name);
    }
    
    const teamSymbol: TeamSymbol = {
      name: teamNode.name,
      file: fileNode.filePath,
      symbolType: 'team',
      node: teamNode,
      references: [],
      isUsed: false,
      namespace: fileNode.namespace,
      teamType: teamNode.teamType,
      roles: roleNames,
      playbooks: playbookNames
    };
    
    symbolTable.teams.set(teamNode.name, teamSymbol);
  }
  
  /**
   * Add document symbol
   */
  private addDocumentSymbol(documentNode: DocumentNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    const sectionNames: string[] = [];
    
    // Collect section names
    for (const section of documentNode.sections || []) {
      sectionNames.push(section.name);
    }
    
    const documentSymbol: DocumentSymbol = {
      name: documentNode.metadata.name,
      file: fileNode.filePath,
      symbolType: 'document',
      node: documentNode,
      references: [],
      isUsed: false,
      namespace: fileNode.namespace,
      contentType: documentNode.contentType,
      sections: sectionNames
    };
    
    symbolTable.documents.set(documentNode.metadata.name, documentSymbol);
  }
  
  /**
   * Add role symbol
   */
  private addRoleSymbol(roleNode: RoleNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    const taskNames: string[] = [];
    
    // Add nested tasks
    for (const taskNode of roleNode.tasks) {
      this.addTaskSymbol(taskNode, fileNode, symbolTable);
      taskNames.push(taskNode.name);
    }
    
    
    const roleSymbol: RoleSymbol = {
      name: roleNode.name,
      file: fileNode.filePath,
      symbolType: 'role',
      node: roleNode,
      references: [],
      isUsed: false,
      namespace: fileNode.namespace,
      parentRole: roleNode.inheritsFrom,
      childRoles: [], // Will be populated in reference resolution
      tasks: taskNames
    };
    
    symbolTable.roles.set(roleNode.name, roleSymbol);
  }
  
  /**
   * Add playbook symbol
   */
  private addPlaybookSymbol(playbookNode: PlaybookNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    const stepNames: string[] = [];
    
    // Add input/output deliverables
    for (const input of playbookNode.inputs) {
      this.addDeliverableSymbol(input, fileNode, symbolTable);
    }
    for (const output of playbookNode.outputs) {
      this.addDeliverableSymbol(output, fileNode, symbolTable);
    }
    
    // Add steps (tasks)
    for (const stepNode of playbookNode.steps) {
      this.addTaskSymbol(stepNode, fileNode, symbolTable);
      stepNames.push(stepNode.name);
    }
    
    const playbookSymbol: PlaybookSymbol = {
      name: playbookNode.name,
      file: fileNode.filePath,
      symbolType: 'playbook',
      node: playbookNode,
      references: [],
      isUsed: false,
      namespace: fileNode.namespace,
      steps: stepNames,
      triggerEvents: playbookNode.cadence.triggerEvents
    };
    
    symbolTable.playbooks.set(playbookNode.name, playbookSymbol);
  }
  
  /**
   * Add task symbol
   */
  private addTaskSymbol(taskNode: TaskNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    const inputNames: string[] = [];
    const outputNames: string[] = [];
    
    // Add input deliverables
    for (const input of taskNode.inputs) {
      this.addDeliverableSymbol(input, fileNode, symbolTable);
      inputNames.push(input.name);
    }
    
    // Add output deliverables
    for (const output of taskNode.outputs) {
      this.addDeliverableSymbol(output, fileNode, symbolTable);
      outputNames.push(output.name);
    }
    
    // Add subtasks recursively
    for (const subtask of taskNode.subtasks || []) {
      this.addTaskSymbol(subtask, fileNode, symbolTable);
    }
    
    const taskSymbol: TaskSymbol = {
      name: taskNode.name,
      file: fileNode.filePath,
      symbolType: 'task',
      node: taskNode,
      references: [],
      isUsed: false,
      namespace: fileNode.namespace,
      inputs: inputNames,
      outputs: outputNames,
      executionType: taskNode.executionType
    };
    
    symbolTable.tasks.set(taskNode.name, taskSymbol);
  }
  
  /**
   * Add deliverable symbol
   */
  private addDeliverableSymbol(deliverableNode: DeliverableNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    // Check if deliverable already exists
    const existing = symbolTable.deliverables.get(deliverableNode.name);
    if (existing) {
      // TODO: Validate compatibility between existing and new deliverable
      return;
    }
    
    const deliverableSymbol: DeliverableSymbol = {
      name: deliverableNode.name,
      file: fileNode.filePath,
      symbolType: 'deliverable',
      node: deliverableNode,
      references: [],
      isUsed: false,
      namespace: fileNode.namespace,
      producers: [],
      consumers: [],
      deliverableType: deliverableNode.deliverableType,
      format: deliverableNode.format
    };
    
    symbolTable.deliverables.set(deliverableNode.name, deliverableSymbol);
  }
  
  /**
   * Resolve references between symbols
   */
  private resolveReferences(fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    // Resolve role inheritance
    if (fileNode.content.type === 'Role') {
      this.resolveRoleInheritance(fileNode.content, fileNode, symbolTable);
    }
    
    // Resolve team-role relationships based on directory structure
    this.resolveTeamRoleRelationships(fileNode, symbolTable);
    
    // Resolve task input/output references
    this.resolveTaskReferences(fileNode, symbolTable);
    
    // TODO: Add more reference resolution types
    // - Escalation paths
    // - Tool/advisor usage
    // - Trigger event references
  }
  
  /**
   * Resolve team-role relationships based on directory structure
   */
  private resolveTeamRoleRelationships(fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    // Check if this is a role file in a team directory structure
    if (fileNode.content.type === 'Role') {
      // Extract team name from file path
      // Pattern: .../team-name/roles/role-name.busy
      const pathParts = fileNode.filePath.split('/');
      const roleIndex = pathParts.findIndex(part => part === 'roles');
      
      if (roleIndex > 0) {
        const teamDirName = pathParts[roleIndex - 1];
        
        // Find the team symbol for this directory
        const teamSymbol = Array.from(symbolTable.teams.values()).find(team => 
          team.file.includes(teamDirName) && team.file.endsWith('team.busy')
        );
        
        if (teamSymbol) {
          // Add reference from team to role
          const reference: SymbolReference = {
            file: fileNode.filePath,
            location: fileNode.content.location!,
            referenceType: 'team_membership',
            context: `Role '${fileNode.content.name}' is part of team '${teamSymbol.name}'`
          };
          
          // Add reference to role symbol
          const roleSymbol = symbolTable.roles.get(fileNode.content.name);
          if (roleSymbol) {
            roleSymbol.references.push(reference);
          }
        }
      }
    }
    
    // Check if this is a playbook file in a team directory structure  
    if (fileNode.content.type === 'Playbook') {
      // Extract team name from file path
      // Pattern: .../team-name/playbooks/playbook-name.busy
      const pathParts = fileNode.filePath.split('/');
      const playbookIndex = pathParts.findIndex(part => part === 'playbooks');
      
      if (playbookIndex > 0) {
        const teamDirName = pathParts[playbookIndex - 1];
        
        // Find the team symbol for this directory
        const teamSymbol = Array.from(symbolTable.teams.values()).find(team => 
          team.file.includes(teamDirName) && team.file.endsWith('team.busy')
        );
        
        if (teamSymbol) {
          // Add reference from team to playbook
          const reference: SymbolReference = {
            file: fileNode.filePath,
            location: fileNode.content.location!,
            referenceType: 'team_membership',
            context: `Playbook '${fileNode.content.name}' is part of team '${teamSymbol.name}'`
          };
          
          // Add reference to playbook symbol
          const playbookSymbol = symbolTable.playbooks.get(fileNode.content.name);
          if (playbookSymbol) {
            playbookSymbol.references.push(reference);
          }
        }
      }
    }
  }

  /**
   * Resolve role inheritance relationships
   */
  private resolveRoleInheritance(roleNode: RoleNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    if (!roleNode.inheritsFrom) return;
    
    const parentSymbol = symbolTable.roles.get(roleNode.inheritsFrom);
    const childSymbol = symbolTable.roles.get(roleNode.name);
    
    if (parentSymbol && childSymbol) {
      // Add child to parent's children list
      parentSymbol.childRoles.push(roleNode.name);
      
      // Add inheritance reference
      const reference: SymbolReference = {
        file: fileNode.filePath,
        location: roleNode.location!,
        referenceType: 'inheritance',
        context: `Role '${roleNode.name}' inherits from '${roleNode.inheritsFrom}'`
      };
      
      parentSymbol.references.push(reference);
    }
  }
  
  /**
   * Resolve task input/output deliverable references
   */
  private resolveTaskReferences(fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    this.visitTasks(fileNode.content, (taskNode) => {
      // Resolve input references
      for (const input of taskNode.inputs) {
        const deliverableSymbol = symbolTable.deliverables.get(input.name);
        if (deliverableSymbol) {
          const reference: SymbolReference = {
            file: fileNode.filePath,
            location: input.location!,
            referenceType: 'input',
            context: `Task '${taskNode.name}' consumes '${input.name}'`
          };
          
          deliverableSymbol.references.push(reference);
          deliverableSymbol.consumers.push(reference);
        }
      }
      
      // Resolve output references
      for (const output of taskNode.outputs) {
        const deliverableSymbol = symbolTable.deliverables.get(output.name);
        if (deliverableSymbol) {
          const reference: SymbolReference = {
            file: fileNode.filePath,
            location: output.location!,
            referenceType: 'output',
            context: `Task '${taskNode.name}' produces '${output.name}'`
          };
          
          deliverableSymbol.references.push(reference);
          deliverableSymbol.producers.push(reference);
        }
      }
    });
  }
  
  /**
   * Visit all tasks in a content node
   */
  private visitTasks(node: TeamNode | RoleNode | PlaybookNode | DocumentNode, visitor: (task: TaskNode) => void): void {
    switch (node.type) {
      case 'Team':
        for (const role of node.roles) {
          for (const task of role.tasks) {
            visitor(task);
          }
        }
        for (const playbook of node.playbooks) {
          for (const step of playbook.steps) {
            visitor(step);
          }
        }
        break;
      case 'Role':
        for (const task of node.tasks) {
          visitor(task);
        }
        break;
      case 'Playbook':
        for (const step of node.steps) {
          visitor(step);
        }
        break;
      case 'Document':
        // Documents don't contain tasks directly
        break;
    }
  }
  
  /**
   * Mark symbols as used based on references
   */
  private markUsage(symbolTable: SymbolTable): void {
    // Mark symbols with references as used
    const allSymbols = [
      ...symbolTable.roles.values(),
      ...symbolTable.playbooks.values(),
      ...symbolTable.tasks.values(),
      ...symbolTable.deliverables.values(),
      ...symbolTable.tools.values(),
      ...symbolTable.advisors.values(),
      ...symbolTable.teams.values(),
      ...symbolTable.documents.values()
    ];
    
    for (const symbol of allSymbols) {
      symbol.isUsed = symbol.references.length > 0;
    }
    
    // Keep track of files with used content for tool/advisor marking
    const filesWithUsedContent = new Set<string>();
    
    // Special case: deliverables are used if they have both producers and consumers
    for (const deliverable of symbolTable.deliverables.values()) {
      deliverable.isUsed = deliverable.producers.length > 0 && deliverable.consumers.length > 0;
    }
    
    // Special case: deliverables that are inputs/outputs of used playbooks are considered used
    for (const playbook of symbolTable.playbooks.values()) {
      if (playbook.isUsed) {
        const playbookNode = playbook.node as PlaybookNode;
        // Mark playbook inputs as used
        for (const input of playbookNode.inputs) {
          const deliverableSymbol = symbolTable.deliverables.get(input.name);
          if (deliverableSymbol) {
            deliverableSymbol.isUsed = true;
          }
        }
        // Mark playbook outputs as used
        for (const output of playbookNode.outputs) {
          const deliverableSymbol = symbolTable.deliverables.get(output.name);
          if (deliverableSymbol) {
            deliverableSymbol.isUsed = true;
          }
        }
      }
    }
    
    // Special case: documents are considered used if they're referenced as document_definition in deliverables
    for (const deliverable of symbolTable.deliverables.values()) {
      if (deliverable.isUsed) {
        const deliverableNode = deliverable.node as DeliverableNode;
        if (deliverableNode.documentDefinition) {
          const documentSymbol = symbolTable.documents.get(deliverableNode.documentDefinition);
          if (documentSymbol) {
            documentSymbol.isUsed = true;
          }
        }
      }
    }
    
    // Special case: playbooks with external triggers or cadence are considered used
    for (const playbook of symbolTable.playbooks.values()) {
      // Playbooks with external triggers
      if (playbook.triggerEvents.some(event => event.startsWith('external_'))) {
        playbook.isUsed = true;
      }
      
      // Playbooks with scheduled cadence are also considered used
      const playbookNode = playbook.node as PlaybookNode;
      if (playbookNode.cadence && (playbookNode.cadence.frequency || playbookNode.cadence.schedule)) {
        playbook.isUsed = true;
      }
    }
    
    // Special case: tasks within playbooks are considered used if the playbook is used
    for (const playbook of symbolTable.playbooks.values()) {
      if (playbook.isUsed) {
        for (const stepName of playbook.steps) {
          const taskSymbol = symbolTable.tasks.get(stepName);
          if (taskSymbol) {
            taskSymbol.isUsed = true;
            
            // Mark task inputs and outputs as used
            const taskNode = taskSymbol.node as TaskNode;
            for (const input of taskNode.inputs) {
              const deliverableSymbol = symbolTable.deliverables.get(input.name);
              if (deliverableSymbol) {
                deliverableSymbol.isUsed = true;
              }
            }
            for (const output of taskNode.outputs) {
              const deliverableSymbol = symbolTable.deliverables.get(output.name);
              if (deliverableSymbol) {
                deliverableSymbol.isUsed = true;
              }
            }
          }
        }
      }
    }
    
    // Special case: tasks within roles are considered used if the role is used
    for (const role of symbolTable.roles.values()) {
      if (role.isUsed) {
        for (const taskName of role.tasks) {
          const taskSymbol = symbolTable.tasks.get(taskName);
          if (taskSymbol) {
            taskSymbol.isUsed = true;
            
            // Mark task inputs and outputs as used
            const taskNode = taskSymbol.node as TaskNode;
            for (const input of taskNode.inputs) {
              const deliverableSymbol = symbolTable.deliverables.get(input.name);
              if (deliverableSymbol) {
                deliverableSymbol.isUsed = true;
              }
            }
            for (const output of taskNode.outputs) {
              const deliverableSymbol = symbolTable.deliverables.get(output.name);
              if (deliverableSymbol) {
                deliverableSymbol.isUsed = true;
              }
            }
          }
        }
      }
    }
    
    // Special case: teams are considered used by default (they represent organizational structure)
    for (const team of symbolTable.teams.values()) {
      team.isUsed = true;
    }
    
    // Collect files with used content
    for (const team of symbolTable.teams.values()) {
      if (team.isUsed) {
        filesWithUsedContent.add(team.file);
      }
    }
    for (const role of symbolTable.roles.values()) {
      if (role.isUsed) {
        filesWithUsedContent.add(role.file);
      }
    }
    for (const playbook of symbolTable.playbooks.values()) {
      if (playbook.isUsed) {
        filesWithUsedContent.add(playbook.file);
      }
    }
    for (const document of symbolTable.documents.values()) {
      if (document.isUsed) {
        filesWithUsedContent.add(document.file);
      }
    }
    
    // Special case: tools and advisors are used if they're imported in any file with used content
    // First, build a map of all tool/advisor imports across all files
    const toolImports = new Map<string, Set<string>>(); // tool name -> set of files that import it
    const advisorImports = new Map<string, Set<string>>(); // advisor name -> set of files that import it
    
    for (const tool of symbolTable.tools.values()) {
      if (!toolImports.has(tool.name)) {
        toolImports.set(tool.name, new Set());
      }
      toolImports.get(tool.name)!.add(tool.file);
    }
    
    for (const advisor of symbolTable.advisors.values()) {
      if (!advisorImports.has(advisor.name)) {
        advisorImports.set(advisor.name, new Set());
      }
      advisorImports.get(advisor.name)!.add(advisor.file);
    }
    
    // Mark tools as used if any file that imports them has used content
    for (const tool of symbolTable.tools.values()) {
      const importingFiles = toolImports.get(tool.name);
      if (importingFiles) {
        for (const file of importingFiles) {
          if (filesWithUsedContent.has(file)) {
            tool.isUsed = true;
            break;
          }
        }
      }
    }
    
    // Mark advisors as used if any file that imports them has used content
    for (const advisor of symbolTable.advisors.values()) {
      const importingFiles = advisorImports.get(advisor.name);
      if (importingFiles) {
        for (const file of importingFiles) {
          if (filesWithUsedContent.has(file)) {
            advisor.isUsed = true;
            break;
          }
        }
      }
    }
  }
}