// Framework-level business package interface and base types

import { SimpleProcess, DataInput } from '../index.js';
import { ContextPackage } from './context-package.js';

export interface BusinessPackage {
  // Playbooks - the main business processes
  readonly playbooks: Map<string, SimpleProcess>;
  
  // Future: roles, rules, governance, etc.
  // readonly roles: Map<string, Role>;
  // readonly rules: Map<string, Rule>;
  
  readonly metadata: {
    name: string;
    version: string;
    description: string;
    source: string; // 'busy-spec' | 'code' | 'config'
  };
  
  // Helper to get specific playbook
  getPlaybook(name: string): SimpleProcess | undefined;
  
  // Method to create input for a playbook
  createPlaybookInput(playbookName: string, data: any): DataInput<any>;
}

export abstract class BaseBusinessPackage implements BusinessPackage {
  public readonly playbooks = new Map<string, SimpleProcess>();
  public abstract readonly metadata: {
    name: string;
    version: string;
    description: string;
    source: string;
  };

  constructor(contextPackage: ContextPackage) {
    const context = contextPackage.context;
    this.wirePlaybooks(context);
  }

  protected abstract wirePlaybooks(context: any): void;

  getPlaybook(name: string): SimpleProcess | undefined {
    return this.playbooks.get(name);
  }

  abstract createPlaybookInput(playbookName: string, data: any): DataInput<any>;
}