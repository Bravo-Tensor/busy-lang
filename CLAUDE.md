# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the BUSY Language project - a domain-specific language for describing business organizations as code. The project consists of documentation defining the language specification, architecture, and product requirements.

## Project Structure

This is a documentation-only repository containing:

- `architecture.md` - Complete system architecture specification for the BUSY ecosystem
- `grammar-spec.md` - Formal grammar specification for the BUSY language
- `prd.md` - Product requirements document with core concepts
- `grammar.md` - Additional grammar documentation

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

This is currently a specification-only project. No implementation exists yet. The documentation defines:

- Multi-layer organizational architecture (L0/L1/L2)
- YAML-based grammar for business process definitions
- Compilation pipeline from .busy files to runtime configurations
- Integration patterns for external tools and dependencies

## Working with This Codebase

Since this is a documentation repository:
- Focus on understanding the architectural concepts in `architecture.md`
- Reference `grammar-spec.md` for language syntax details
- Use `prd.md` for high-level product concepts
- No build/test/lint commands are available as no code implementation exists yet

When discussing or modifying the specifications, consider the layer-first architecture and the balance between human creativity and process automation.