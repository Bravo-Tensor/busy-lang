# Orgata Framework

> Business process execution framework for the BUSY Language ecosystem

The Orgata Framework provides a complete runtime system for executing business processes defined in the BUSY Language, with comprehensive human-in-the-loop automation, intervention capabilities, and extensible architecture.

## Features

### 🔄 Process Execution
- **Sequential & Parallel Operations**: Support for both linear and complex process flows
- **Resource Management**: First-class support for time, people, capital, and attention resources
- **Context Management**: Hierarchical execution contexts with proper isolation and sharing

### 🛑 Human-in-the-Loop Automation
- **Always-On Intervention**: Every operation has automatic before/after checkpoints
- **Manual Mode**: Step-by-step control with retry, skip, and navigation options  
- **Jump Navigation**: Ability to jump to any operation within a process set
- **State Editing**: Direct modification of process state and data during execution
- **CLI Interface**: Rich terminal interface for human intervention and control

### 🏗️ Architecture
- **Layer-First Design**: L0 (Operational), L1 (Management), L2 (Strategic) separation
- **Dependency Injection**: Clean package-based architecture for testability
- **Extensible Operations**: Support for Algorithm, Human, and custom implementations
- **Resource Isolation**: Each layer runs in separate runtime instances

### 📦 Packaging System
- **Runtime Packages**: Pre-configured runtime environments for different use cases
- **Resource Packages**: Modular resource provisioning and management
- **Business Packages**: Domain-specific business logic encapsulation
- **Context Packages**: Environment-specific configuration and setup

## Installation

```bash
npm install @busy-lang/orgata-framework
```

## Quick Start

```typescript
import { 
  BasicContext, 
  BasicInfrastructureServices,
  SimpleProcess,
  CLIInterventionInterface 
} from '@busy-lang/orgata-framework';

// Create runtime context
const infrastructure = new BasicInfrastructureServices();
const context = new BasicContext(infrastructure);

// Set up human intervention
infrastructure.interventionManager.setInterface(
  new CLIInterventionInterface()
);

// Define and execute a process
const process = new SimpleProcess(
  'sample-process',
  'A sample business process',
  inputSchema,
  outputSchema,
  ['step1', 'step2', 'step3'],
  operations,
  context
);

const result = await process.execute({ data: initialData });
```

## Architecture Overview

### Core Components

#### Context System
- **BasicContext**: Root execution context with resource management
- **Context Spawning**: Hierarchical context creation for operation isolation
- **Capability Management**: Registry and lifecycle management for operations

#### Operation System  
- **BasicOperation**: Wrapper for business logic implementations
- **OperationSet**: Collections of related operations with shared context
- **SimpleProcess**: Sequential process execution with intervention support

#### Intervention System
- **InterventionManager**: Central coordinator for human-in-the-loop automation
- **OperationOrchestrator**: Intervention-aware operation execution
- **Checkpoint Management**: Automatic state snapshots and restoration
- **CLI Interface**: Rich terminal interface for human control

#### Infrastructure Services
- **Logging**: Structured logging with metadata and context tracking
- **Configuration**: Flexible configuration management
- **Resource Injection**: Dependency injection for operation implementations

### Package Architecture

The framework uses a clean package-based architecture:

```
├── Core Framework (types, context, operations)
├── Intervention System (human-in-the-loop automation)  
├── Infrastructure Services (logging, config, resources)
└── Packaging System (runtime composition and deployment)
```

## Intervention System

The intervention system provides comprehensive human-in-the-loop automation:

### Features
- **Automatic Checkpoints**: Before/after snapshots for every operation
- **Manual Mode**: Complete step-by-step control over process execution
- **Jump Navigation**: Ability to jump to any operation in the process
- **State Editing**: Direct modification of process data and context
- **Error Recovery**: Automatic intervention mode on failures

### CLI Interface
- Space bar intervention during execution
- Interactive menu system for operation control
- Operation selection with visual progress indicators
- State editing capabilities with JSON support

### Usage
```typescript
// Set up intervention
infrastructure.interventionManager.setInterface(
  new CLIInterventionInterface()
);

// Process automatically supports intervention
const result = await process.execute(input);
```

## API Reference

### Core Types
- `Context`: Execution context with capability management
- `Operation`: Business logic wrapper with metadata
- `Input/Output`: Typed data containers for operation execution
- `Capability`: Generic interface for executable components

### Intervention Types  
- `InterventionState`: Current execution state and available actions
- `InterventionAction`: User actions during intervention
- `Checkpoint`: State snapshots for rollback and recovery

### Package Types
- `RuntimePackage`: Complete runtime environment configuration
- `ResourcePackage`: Resource provisioning and management
- `BusinessPackage`: Domain-specific business logic
- `ContextPackage`: Environment-specific setup

## Contributing

This framework is part of the BUSY Language ecosystem. See the main repository for contribution guidelines and development setup.

## License

MIT - See LICENSE file for details.

## Related Projects

- [BUSY Language](../compiler) - Domain-specific language for business processes
- [BUSY Examples](../examples) - Sample implementations and use cases
- [OSTEAOS](../osteaos) - Operating system for business process isolation