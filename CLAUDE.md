# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the BUSY Language project - a domain-specific language for describing business organizations as code. The project includes a complete compiler implementation alongside comprehensive design documentation.

## Project Structure

This repository contains:

**Design Documentation:**
- `design-docs/` - Complete design documentation organized by migration-style numbering
  - `001-initial-specification/` - Core BUSY language specification and grammar
  - `002-runtime-architecture/` - Runtime system design and implementation
  - `003-compiler-implementation/` - Compiler development plan and architecture
  - `004-specification-changes/` - Proposed language enhancements
  - `ARCHITECTURE_OVERVIEW.md` - Complete system architecture overview

**Implementation:**
- `compiler/` - Complete TypeScript compiler implementation
- `examples/` - Example BUSY business implementations

## Architecture Understanding

The BUSY ecosystem consists of four main components:

1. **BUSY Language** - YAML-based DSL for describing business processes
2. **BUSY Compiler** - Transforms .busy files into executable components  
3. **Orgata Runtime** - Business process execution engine and IDE
4. **OSTEAOS** - Operating system providing resource isolation and governance

Key architectural concepts:
- **Layer-first architecture**: L0 (Operational), L1 (Management), L2 (Strategic)
- **Runtime isolation**: Each layer runs in separate Orgata instances
- **Exception handling**: Process freezing and governance-based resolution
- **Resource management**: Time, people, capital, attention as first-class resources

## Development Status

This project now includes a working BUSY compiler implementation in the `compiler/` directory alongside the original specifications.

## Project Workflow

**Implementation**: Claude performs all development work including coding, testing, and documentation updates.
**Review**: User reviews design documents, provides feedback, and approves implementation plans.
**No Migration Concerns**: This is a greenfield project with no existing BUSY files in production.

## Documentation Standards

**Avoid Repetition**: Design documents should complement, not duplicate each other:
- README: High-level summary only
- Design documents: Detailed specifications 
- Implementation plans: Specific tasks and estimates

**Concise Communication**: Shorter documentation is preferred. Provide essential information without redundancy across files.

## Working with This Codebase

**Compiler Development**: 
- Use `npm run analyze` to validate example files
- Follow existing naming conventions (kebab-case for BUSY entities)
- Maintain 100% health score in analysis results
- Update documentation when making language changes

**Design Process**:
- All design documentation is in root-level `design-docs/` directory
- Use migration-style numbering: `001-description`, `002-description`, etc.
- Create comprehensive design documents before implementation
- Break down work into specific, actionable tasks
- Focus on single-developer implementation estimates

When discussing or modifying the specifications, consider the layer-first architecture and the balance between human creativity and process automation.