---
Name: Workspace Setup Guide
Type: [View]
Description: How to initialize, structure, and configure a BUSY workspace — folder layout, package management, and validation.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Workspace]:../../../busy/core/workspace.busy.md
[Document]:../../../busy/core/document.busy.md
[Home]:../home.busy.md

# Setup

This guide covers how to create and organize a BUSY workspace — the folder that holds your documents, manages dependencies, and can be validated as a coherent unit.

# Display

## Workspace Setup Guide

A BUSY workspace is a directory of `.busy.md` files that form a typed graph. The `busy` CLI provides commands to initialize, validate, and inspect workspaces.

### Initializing a Workspace

Use the CLI to create a new workspace:

```bash
busy init
```

This creates:
- `package.busy.md` — the workspace manifest (lists dependencies)
- `.libraries/` — cached external packages

You can also initialize in a specific directory:

```bash
busy init -d ./my-workspace
```

### Workspace Layout

A typical workspace is organized by domain or function:

```
my-workspace/
├── package.busy.md          # Workspace manifest
├── .libraries/              # Cached external packages
├── core/                    # Shared types and concepts
│   ├── document.busy.md
│   └── operation.busy.md
├── models/                  # Domain models
│   ├── customer.busy.md
│   └── order.busy.md
├── playbooks/               # Orchestration flows
│   └── onboarding.busy.md
├── views/                   # Presentation layers
│   └── dashboard.busy.md
└── tools/                   # External capability wrappers
    └── email-tool.busy.md
```

There's no enforced folder structure — organize by whatever makes sense for your domain. The parser discovers all `.busy.md` files recursively.

### Package Management

Workspaces can import external BUSY packages. The `busy-v2` standard library is the most common dependency.

**Add a package:**
```bash
# From a local folder
busy package add ../busy-lang/busy

# From a local folder (recursive discovery)
busy package add ../shared-models -r

# From a URL
busy package add https://github.com/org/repo/blob/main/busy/package.busy.md
```

**List installed packages:**
```bash
busy package list
```

**Remove a package:**
```bash
busy package remove busy-v2
```

**Upgrade packages:**
```bash
# Upgrade a specific package
busy package upgrade busy-v2

# Upgrade all packages
busy package upgrade --all
```

**Get package details:**
```bash
busy package info busy-v2
```

Packages are cached in `.libraries/` and tracked in `package.busy.md`.

### The Package Manifest

`package.busy.md` is a BUSY document of type `[Package]`. It lists your workspace's external dependencies with their sources, versions, and cache locations. The CLI manages this file automatically — you rarely need to edit it by hand.

### Validating the Workspace

Check that your workspace is structurally coherent:

```bash
busy check
```

This verifies:
- All packages in `package.busy.md` have cached files
- Cached file integrity matches recorded hashes
- No missing or broken dependencies

Add `-d` for a specific directory:
```bash
busy check -d ./my-workspace
```

### Working with the `.workspace` File

For execution-oriented workspaces (not just documentation), a `.workspace` JSON file configures how agents execute the workspace:

```json
{
  "name": "content-generation",
  "type": "workspace",
  "version": "1.0",
  "framework": "claude",
  "hasRole": true,
  "hasSteps": false,
  "inputSource": "input",
  "outputDestination": "output"
}
```

Key fields:
- `name` — workspace name
- `type` — always `"workspace"`
- `framework` — which agent framework to use (`claude`, `openai`, etc.)
- `hasRole` — whether a `role.busy.md` file exists
- `hasSteps` — whether the workspace has multi-step execution

### Workspace Types

| Type | Description | Indicators |
|------|-------------|------------|
| Simple | Single operation, no steps or role | No role, no steps |
| Role-Based | Includes `role.busy.md` | `hasRole: true` |
| Multi-Step | Sequential step folders | `hasSteps: true`, step folders |
| Nested | Contains sub-workspaces | Folders with their own `.workspace` |
| Hybrid | Combination of steps + nesting | Both steps and nested workspaces |

### Recursive Workspaces

Workspaces are fractal — any workspace can contain sub-workspaces that follow the same structure:

```
project/
├── .workspace
├── instructions.busy.md
└── phase-1/
    ├── .workspace
    ├── instructions.busy.md
    └── research/
        ├── .workspace
        └── instructions.busy.md
```

Each sub-workspace is fully independent with its own configuration, instructions, and state.

### Tips

- **Start simple** — a folder of `.busy.md` files with `package.busy.md` is a valid workspace
- **Use `busy check`** after adding or removing packages to catch broken references
- **Use `busy graph`** to visualize your workspace structure and catch orphaned documents
- **Put shared types in a `core/` folder** — models, playbooks, and views import from there
- **All BUSY documents must use `.busy.md`** — the parser ignores plain `.md` files
