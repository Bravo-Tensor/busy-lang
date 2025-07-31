# Runtime Packages - Dependency Injection Architecture

This directory contains the packaged, dependency-injected architecture for the Orgata kitchen example.

## Architecture Overview

The system is broken into 4 layers for maximum flexibility and testability:

```
┌─────────────────────────────────────────────────────────────┐
│                   Runtime Package                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │ Resource Pkg    │ │  Context Pkg    │ │  Business Pkg   │ │
│  │                 │ │                 │ │                 │ │
│  │ • Storage       │ │ • Production    │ │ • PB&J Playbook │ │
│  │ • UI Service    │ │ • Test          │ │ • 4 Operations  │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Package Layers

### 1. Resource Package (`resource-package.ts`)
- **Purpose**: Wires up all resources that fulfill requirements (storage, UI, etc.)
- **Responsibility**: Resource discovery and registration
- **Future**: Could load resources from config, plugins, or external sources

```typescript
const resources = createKitchenResourcePackage();
// Contains: kitchen-storage, ui-service
```

### 2. Context Package (`context-package.ts`)
- **Purpose**: Takes resource package + adds infrastructure context
- **Variants**: Production, Test (future: Simulation, Mock, etc.)
- **Responsibility**: Environment-specific wiring

```typescript
const context = createProductionContextPackage(resources);
// or
const context = createTestContextPackage(resources);
```

### 3. Business Package (`business-package.ts`)
- **Purpose**: Defines the actual business playbooks from BUSY specifications
- **Responsibility**: Business logic definition and operation wiring
- **Future**: Could be loaded from BUSY files

```typescript
const business = createKitchenBusinessPackage(context);
// Contains: gather → prepare → assemble → cleanup
```

### 4. Runtime Package (`runtime-package.ts`)
- **Purpose**: Fully wired, ready-to-run deployable application
- **Variants**: Production, Test (future: Simulation, Debug, etc.)
- **Responsibility**: Complete system assembly

```typescript
const runtime = createProductionRuntime();
await runtime.execute('PB&J Sandwich', 1);
```

## Usage Examples

### Basic Usage
```typescript
import { createProductionRuntime } from './packages/index.js';

const runtime = createProductionRuntime();
const result = await runtime.execute('PB&J Sandwich', 1);
```

### Different Environments
```typescript
import { createProductionRuntime, createTestRuntime } from './packages/index.js';

// Production with real resources
const prodRuntime = createProductionRuntime();

// Test with deterministic behavior  
const testRuntime = createTestRuntime();
```

### Custom Wiring (Future)
```typescript
// Example of how custom wiring could work
const resources = createKitchenResourcePackage();
const customContext = createSimulationContextPackage(resources, {
  failureRate: 0.5,  // 50% failure rate for testing
  speed: 'fast'      // No delays
});
const business = createKitchenBusinessPackage(customContext);
```

## Benefits

### 1. **Dependency Injection**
- Clean separation of concerns
- Easy to swap implementations
- Testable components

### 2. **Multiple Configurations**
- Production vs Test environments
- Different resource implementations
- Configurable behavior

### 3. **Future Extensibility**
- Configuration-based wiring
- Plugin systems
- Runtime resource swapping
- Different business playbooks

### 4. **Clean Entry Points**
- Simple factory functions
- Clear package boundaries
- Easy to understand wiring

## Future Roadmap

### Configuration-Based Wiring
```yaml
# runtime-config.yaml
resources:
  storage: 
    type: "KitchenStorageCapability"
    config: { timeout: 5000 }
  ui:
    type: "ConsoleUICapability"
    
context:
  environment: "production"
  infrastructure: "BasicInfrastructureServices"
  
business:
  name: "pbj-sandwich-playbook"
  steps: ["gather", "prepare", "assemble", "cleanup"]
```

### Runtime Resource Swapping
```typescript
// Switch from algorithm to human mid-process
await runtime.swapResource('assemble-sandwich', 'human-implementation');

// Retry a failed step with different implementation
await runtime.retryStep('assemble-sandwich', { mode: 'human' });
```

### Plugin System
```typescript
// Load resources from plugins
const resources = await loadResourcesFromPlugins([
  'kitchen-storage-plugin',
  'advanced-ui-plugin'
]);
```