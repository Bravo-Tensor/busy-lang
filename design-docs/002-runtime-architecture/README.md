# 002: Runtime Architecture Design

**Date**: 2025  
**Status**: Implemented  
**Type**: System Architecture  

## Overview

This design iteration defines the architecture for the BUSY Runtime system that transforms BUSY language specifications into executable web applications. The focus is on generating React/TypeScript applications that provide user interfaces for managing business processes defined in BUSY files.

## Design Focus

- **Human-Readable Artifacts**: Generate both code and data that users can understand
- **Gradual Digital Adoption**: Make underlying data accessible rather than abstracted
- **AI-Assisted Evolution**: Support bidirectional changes between specs and generated code
- **Local-First Development**: Start with file system, expand to cloud capabilities

## Impact Assessment

**Scope**: Complete runtime execution model for BUSY processes  
**Breaking Changes**: None (additive to language specification)  
**Migration Required**: None (new capabilities)

## Success Criteria

- [x] React/TypeScript application generation from BUSY specifications
- [x] Database schema generation with runtime state management
- [x] Client folder system for human-readable process artifacts
- [x] Task execution models (Human, Algorithmic, AI Agent)
- [x] Code regeneration with merge workflow preservation

## Files in this Design Iteration

- **RUNTIME_ARCHITECTURE_DESIGN.md** - Complete runtime system architecture

## Key Innovations

### Human-Readable Artifacts
The runtime generates both executable code and human-readable documentation:
- Client folders with markdown process logs
- File system organization that's browsable without tools
- Complete audit trails in plain text format

### Task Execution Models
Three distinct execution patterns with generated implementations:
- **Human Tasks**: Form-based interfaces with validation
- **Algorithmic Tasks**: Function stubs with integration points
- **AI Agent Tasks**: Prompt templates with LLM integration

### Code Evolution Strategy
Git-based workflow with AI-assisted merging to preserve customizations:
- Feature branch creation for BUSY updates
- Intelligent diff analysis and smart merging
- Standard pull request workflow for human review

## Implementation Status

**Completed**:
- React/Next.js application generation
- Database schema generation with Prisma ORM
- Client folder system with markdown audit trails
- Task interface generation for all execution types
- Process state management and exception handling

**Architecture Decisions**:
- Next.js for full-stack React applications
- SQLite for local-first database with Prisma ORM
- File system integration for client artifact storage
- TypeScript for type safety across generated code

## Integration with Other Designs

This runtime architecture builds directly on:
- **001-initial-specification**: Uses BUSY language definitions as input
- **003-compiler-implementation**: Provides compilation targets and output formats

Future integration points:
- **004-specification-changes**: Will require runtime updates for enhanced features

## Historical Context

This design iteration established the execution model that transforms BUSY specifications from static descriptions into dynamic, interactive business applications. The focus on human-readable artifacts and gradual adoption became key differentiators for the BUSY ecosystem.