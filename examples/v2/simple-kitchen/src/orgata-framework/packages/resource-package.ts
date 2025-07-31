// Framework-level resource package interface and base types

import { Capability } from '../types.js';

export interface ResourcePackage {
  readonly resources: Map<string, Capability>;
  readonly metadata: {
    name: string;
    version: string;
    description: string;
  };
}

export abstract class BaseResourcePackage implements ResourcePackage {
  public readonly resources = new Map<string, Capability>();
  public abstract readonly metadata: {
    name: string;
    version: string;
    description: string;
  };

  constructor() {
    this.wireResources();
  }

  protected abstract wireResources(): void;
}