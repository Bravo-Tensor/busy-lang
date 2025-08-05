# 012: Orgata Backend Service Architecture

**Date**: 2025-01-29  
**Status**: In Design  
**Type**: Backend Service Architecture  

## Overview

This design iteration defines the architecture for exposing Orgata runtime as a backend service, enabling frontend applications to interact with business processes through both MCP and REST API protocols.

## Design Focus

- MCP server exposing generic Orgata concepts (Operations, Contexts, Playbooks, Roles)
- REST API for web frontend access and real-time process monitoring
- Protocol-agnostic business engine with clean separation of concerns
- Environment isolation through MCP roots (production, staging, simulation)
- Domain-specific data flow through generic abstractions

## Core Design Principles

### Business-Only Backend
- No UI, branding, or presentation concerns in backend
- Pure business logic and process orchestration
- Domain-specific behavior flows through schemas and metadata
- Frontend repository handles all presentation and customization

### Protocol Boundaries
- **MCP Server**: Development tooling, AI assistant access, schema discovery
- **REST API**: Web frontend access, real-time monitoring, third-party integrations  
- **Shared Business Engine**: Protocol-agnostic core with single source of truth

### Generic Abstractions with Domain Flexibility
- Generic Orgata concepts (Playbooks, Roles, Operations, Executions)
- Domain-specific data flows through these abstractions
- Schema-driven behavior enables dynamic frontend generation
- Customization through metadata, not hardcoded business logic

## Architecture Components

### MCP Server Interface
- **Resources**: Runtime instances, playbooks, roles, executions, operations
- **Tools**: Execute playbook, handle interventions, manage process state
- **Prompts**: AI-assisted operation generation and business logic validation
- **Sampling**: AI model configuration for agent operations
- **Roots**: Environment separation (production, staging, simulation, development)

### REST API Interface
- **HTTP Endpoints**: Standard CRUD operations for business entities
- **WebSocket Support**: Real-time process execution monitoring
- **Integration Points**: Third-party system access
- **Mobile Support**: Universal HTTP access patterns

### Business Engine Core
- **Runtime Management**: Create and manage Orgata runtime instances
- **Process Execution**: Orchestrate playbook execution with intervention support
- **State Management**: Persistent process state and execution history
- **Schema Discovery**: Dynamic metadata extraction for frontend generation

## Key Benefits

1. **Dual Protocol Access**: Right interface for the right use case
2. **Clean Separation**: Business logic independent of access protocols
3. **AI Integration**: Native MCP support for development and analysis workflows
4. **Real-time Capability**: WebSocket support for live process monitoring
5. **Environment Isolation**: Clear separation of deployment contexts
6. **Domain Agnostic**: Generic framework supporting any business domain

## Files in this Design Iteration

- **BACKEND_ARCHITECTURE.md** - Detailed backend service architecture and implementation
- **MCP_PROTOCOL_SPECIFICATION.md** - Complete MCP server interface definition
- **REST_API_SPECIFICATION.md** - REST API endpoints and WebSocket interface
- **IMPLEMENTATION_PLAN.md** - Development roadmap and technical tasks

## Next Steps

Ready for collaborative design iteration to define:
1. Detailed MCP resource and tool specifications
2. REST API endpoint design and WebSocket event schemas
3. Business engine interface and implementation patterns
4. Environment management and deployment strategies
5. Integration patterns with existing Orgata framework