// Kitchen-specific context package implementations

import { BaseContextPackage, ResourcePackage } from '../orgata-framework/packages/index.js';

export class ProductionContextPackage extends BaseContextPackage {
  public readonly metadata = {
    name: 'production-context',
    environment: 'production',
    description: 'Production context with full infrastructure services'
  };
}

// Future: TestContextPackage for testing scenarios
export class TestContextPackage extends BaseContextPackage {
  public readonly metadata = {
    name: 'test-context',
    environment: 'test',
    description: 'Test context with mock infrastructure and deterministic behavior'
  };

  // Future: Override createInfrastructure() to return MockInfrastructureServices
  // Future: Override createContext() to return TestContext
}

// Factory functions for different contexts
export function createProductionContextPackage(resourcePackage: ResourcePackage): ProductionContextPackage {
  return new ProductionContextPackage(resourcePackage);
}

export function createTestContextPackage(resourcePackage: ResourcePackage): TestContextPackage {
  return new TestContextPackage(resourcePackage);
}