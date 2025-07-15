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
  SymbolReference,
  RoleNode,
  PlaybookNode,
  TeamNode,
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
      teams: new Map()
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
      version: importNode.version,
      interface: importNode.interface
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
   * Add role symbol
   */
  private addRoleSymbol(roleNode: RoleNode, fileNode: BusyFileNode, symbolTable: SymbolTable): void {
    const taskNames: string[] = [];
    
    // Add nested tasks
    for (const taskNode of roleNode.tasks) {
      this.addTaskSymbol(taskNode, fileNode, symbolTable);
      taskNames.push(taskNode.name);
    }
    
    // Add role interface deliverables
    if (roleNode.interfaces) {
      for (const input of roleNode.interfaces.inputs) {
        this.addDeliverableSymbol(input, fileNode, symbolTable);
      }
      for (const output of roleNode.interfaces.outputs) {
        this.addDeliverableSymbol(output, fileNode, symbolTable);
      }
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
    
    // Resolve task input/output references
    this.resolveTaskReferences(fileNode, symbolTable);
    
    // TODO: Add more reference resolution types
    // - Escalation paths
    // - Tool/advisor usage
    // - Trigger event references
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
  private visitTasks(node: TeamNode | RoleNode | PlaybookNode, visitor: (task: TaskNode) => void): void {
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
      ...symbolTable.teams.values()
    ];
    
    for (const symbol of allSymbols) {
      symbol.isUsed = symbol.references.length > 0;
    }
    
    // Special case: deliverables are used if they have both producers and consumers
    for (const deliverable of symbolTable.deliverables.values()) {
      deliverable.isUsed = deliverable.producers.length > 0 && deliverable.consumers.length > 0;
    }
    
    // Special case: playbooks with external triggers are considered used
    for (const playbook of symbolTable.playbooks.values()) {
      if (playbook.triggerEvents.some(event => event.startsWith('external_'))) {
        playbook.isUsed = true;
      }
    }
  }
}