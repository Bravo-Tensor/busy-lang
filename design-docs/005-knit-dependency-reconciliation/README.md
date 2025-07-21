# 005: Knit Dependency Reconciliation System

## Overview

The **Knit** system provides bidirectional dependency reconciliation for maintaining coherence between related files. When any file changes, knit ensures dependent files remain consistent through automated analysis and human-supervised reconciliation.

## Problem Statement

Development workflows often involve cascading changes across related files:
- Design documents → implementation code
- API specifications → client code  
- Configuration → dependent systems
- Code generation → customized output

Traditional approaches are unidirectional (design → code) and miss feedback loops where implementation reality should inform design. Knit provides bidirectional coherence with intelligent conflict resolution.

## Core Concept

Like git tracks file versions over time, **knit tracks file consistency across dependencies**:
- Git: `file(t1) → file(t2) → file(t3)`
- Knit: `design.md ↔ component.ts ↔ test.spec.ts`

## Key Features

- **Git-style change detection** using content hashing
- **Bidirectional propagation** of changes through dependency graph
- **LLM-powered reconciliation** with human oversight
- **Conflict classification** (safe auto-apply vs. review required)
- **Simple file-based implementation** with no external dependencies

## Command Interface

```bash
knit init          # Initialize dependency tracking
knit watch         # Monitor for changes
knit status        # Show reconciliation status
knit apply         # Apply safe changes
knit review        # Review flagged conflicts
knit commit        # Finalize reconciliation cycle
knit graph         # Show dependency relationships
knit link A B      # Add dependency A → B
```

## Documents

- `KNIT_SYSTEM_DESIGN.md` - Core architecture and technical design
- `RECONCILIATION_WORKFLOW.md` - LLM integration and conflict resolution
- `IMPLEMENTATION_PLAN.md` - Development phases and tasks