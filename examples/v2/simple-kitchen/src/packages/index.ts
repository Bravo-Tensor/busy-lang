// Kitchen-specific package exports - clean entry points for different runtime configurations

// Re-export framework types for convenience
export type { ResourcePackage, ContextPackage, BusinessPackage, RuntimePackage } from '../orgata-framework/packages/index.js';

export {
  KitchenResourcePackage,
  createKitchenResourcePackage
} from './resource-package.js';

export {
  ProductionContextPackage,
  TestContextPackage,
  createProductionContextPackage,
  createTestContextPackage
} from './context-package.js';

export {
  KitchenBusinessPackage,
  createKitchenBusinessPackage
} from './business-package.js';

export {
  ProductionRuntimePackage,
  TestRuntimePackage,
  createProductionRuntime,
  createTestRuntime
} from './runtime-package.js';