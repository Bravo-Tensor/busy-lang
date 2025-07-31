// Framework-level runtime package interface and base types

import { ResourcePackage } from './resource-package.js';
import { ContextPackage } from './context-package.js';
import { BusinessPackage } from './business-package.js';

export interface RuntimePackage {
  readonly resources: ResourcePackage;
  readonly context: ContextPackage;
  readonly business: BusinessPackage;
  readonly metadata: {
    name: string;
    version: string;
    environment: string;
    description: string;
  };

  // Convenience method to execute business processes
  execute(processName: string, ...args: any[]): Promise<any>;
}

export abstract class BaseRuntimePackage implements RuntimePackage {
  public readonly resources: ResourcePackage;
  public readonly context: ContextPackage;
  public readonly business: BusinessPackage;
  public abstract readonly metadata: {
    name: string;
    version: string;
    environment: string;
    description: string;
  };

  constructor() {
    // Wire up the full stack - subclasses provide concrete implementations
    this.resources = this.createResourcePackage();
    this.context = this.createContextPackage(this.resources);
    this.business = this.createBusinessPackage(this.context);
  }

  protected abstract createResourcePackage(): ResourcePackage;
  protected abstract createContextPackage(resources: ResourcePackage): ContextPackage;
  protected abstract createBusinessPackage(context: ContextPackage): BusinessPackage;

  abstract execute(processName: string, ...args: any[]): Promise<any>;
}