// Kitchen-specific runtime package implementations

import { BaseRuntimePackage, ResourcePackage, ContextPackage, BusinessPackage } from '@busy-lang/orgata-framework/packages';
import { createKitchenResourcePackage } from './resource-package.js';
import { createProductionContextPackage, createTestContextPackage } from './context-package.js';
import { createKitchenBusinessPackage } from './business-package.js';

export class ProductionRuntimePackage extends BaseRuntimePackage {
  public readonly metadata = {
    name: 'production-runtime',
    version: '1.0.0',
    environment: 'production',
    description: 'Production-ready PB&J sandwich making system with full resources'
  };

  protected createResourcePackage(): ResourcePackage {
    return createKitchenResourcePackage();
  }

  protected createContextPackage(resources: ResourcePackage): ContextPackage {
    return createProductionContextPackage(resources);
  }

  protected createBusinessPackage(context: ContextPackage): BusinessPackage {
    return createKitchenBusinessPackage(context);
  }

  async execute(recipeName: string, servings: number): Promise<any> {
    const playbook = this.business.getPlaybook('pbj-sandwich');
    if (!playbook) {
      throw new Error(`Playbook not found: ${recipeName}`);
    }
    
    const input = this.business.createPlaybookInput('pbj-sandwich', {
      recipe_name: recipeName,
      servings: servings
    });
    
    return await playbook.execute(input);
  }
}

export class TestRuntimePackage extends BaseRuntimePackage {
  public readonly metadata = {
    name: 'test-runtime',
    version: '1.0.0',
    environment: 'test',
    description: 'Test version of PB&J sandwich making system with predictable behavior'
  };

  protected createResourcePackage(): ResourcePackage {
    return createKitchenResourcePackage();
  }

  protected createContextPackage(resources: ResourcePackage): ContextPackage {
    return createTestContextPackage(resources);
  }

  protected createBusinessPackage(context: ContextPackage): BusinessPackage {
    return createKitchenBusinessPackage(context);
  }

  async execute(recipeName: string, servings: number): Promise<any> {
    const playbook = this.business.getPlaybook('pbj-sandwich');
    if (!playbook) {
      throw new Error(`Playbook not found: ${recipeName}`);
    }
    
    const input = this.business.createPlaybookInput('pbj-sandwich', {
      recipe_name: recipeName,
      servings: servings
    });
    
    return await playbook.execute(input);
  }
}

// Factory functions for different runtime configurations
export function createProductionRuntime(): ProductionRuntimePackage {
  return new ProductionRuntimePackage();
}

export function createTestRuntime(): TestRuntimePackage {
  return new TestRuntimePackage();
}

// Future: Could add more variants like:
// - createSimulationRuntime(parameters)
// - createBenchmarkRuntime()
// - createDebugRuntime()