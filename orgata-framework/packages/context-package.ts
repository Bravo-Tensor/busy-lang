// Framework-level context package interface and base types

import { Context, InfrastructureServices } from '../types.js';
import { BasicInfrastructureServices, ProductionContext } from '../index.js';
import { ResourcePackage } from './resource-package.js';

export interface ContextPackage {
  readonly context: Context;
  readonly infrastructure: InfrastructureServices;
  readonly metadata: {
    name: string;
    environment: string;
    description: string;
  };
}

export abstract class BaseContextPackage implements ContextPackage {
  public readonly context: Context;
  public readonly infrastructure: InfrastructureServices;
  public abstract readonly metadata: {
    name: string;
    environment: string;
    description: string;
  };

  constructor(resourcePackage: ResourcePackage) {
    // Create infrastructure (can be overridden by subclasses)
    this.infrastructure = this.createInfrastructure();
    
    // Create context (can be overridden by subclasses)
    this.context = this.createContext(this.infrastructure);
    
    // Wire in all resources from the package
    this.wireResources(resourcePackage);
  }

  protected createInfrastructure(): InfrastructureServices {
    return new BasicInfrastructureServices();
  }

  protected createContext(infrastructure: InfrastructureServices): Context {
    return new ProductionContext(infrastructure);
  }

  private wireResources(resourcePackage: ResourcePackage): void {
    for (const [name, resource] of resourcePackage.resources) {
      this.context.capabilities.set(name, resource);
    }
  }
}