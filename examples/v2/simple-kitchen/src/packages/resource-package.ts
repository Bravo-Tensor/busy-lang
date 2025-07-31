// Kitchen-specific resource package implementation

import { BaseResourcePackage } from '../orgata-framework/packages/index.js';
import { KitchenStorageCapability } from '../kitchen-capabilities/storage-service.js';
import { KitchenUICapability } from '../kitchen-capabilities/ui-service.js';

export class KitchenResourcePackage extends BaseResourcePackage {
  public readonly metadata = {
    name: 'kitchen-resources',
    version: '1.0.0',
    description: 'Kitchen resources that fulfill BUSY spec requirements'
  };

  protected wireResources(): void {
    // Storage resource - fulfills storage requirements (pantry, fridge, cabinet, drawer)
    const storageResource = new KitchenStorageCapability();
    this.resources.set('kitchen-storage', storageResource);

    // UI resource - fulfills human interaction requirements
    const uiResource = new KitchenUICapability();
    this.resources.set('ui-service', uiResource);

    // Future resources:
    // - AI service resource (for agent mode operations)
    // - External API resources
    // - Database resources
    // - Monitoring resources
  }

  // Helper method to get specific resources with type safety
  getStorageResource(): KitchenStorageCapability {
    return this.resources.get('kitchen-storage') as KitchenStorageCapability;
  }

  getUIResource(): KitchenUICapability {
    return this.resources.get('ui-service') as KitchenUICapability;
  }
}

// Factory function for easy instantiation
export function createKitchenResourcePackage(): KitchenResourcePackage {
  return new KitchenResourcePackage();
}