---
Name: CLI Overview
Type: [View]
Description: Overview of all available busy CLI commands — parse, validate, resolve, graph, init, check, and package management.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Document]:../../../busy/core/document.busy.md
[Validate Command]:./validate.busy.md
[Graph Command]:./graph.busy.md
[Workspace Commands]:./workspace-commands.busy.md
[Home]:../home.busy.md

# Setup

This view provides a reference of all commands available in the `busy` CLI.

# Display

## CLI Overview

The `busy` CLI (`@busy/parser`) parses BUSY markdown workspaces into a typed graph. Install it with:

```bash
npm install -g @busy/parser
```

### Command Summary

| Command | Purpose |
|---------|---------|
| `busy parse <file>` | Parse a document and output its structure as JSON |
| `busy validate <file>` | Validate a document's frontmatter, structure, and imports |
| `busy resolve <file>` | Resolve all imports in a document recursively |
| `busy graph [directory]` | Output the workspace dependency graph |
| `busy info <file>` | Show quick document information |
| `busy init` | Initialize a new workspace with `package.busy.md` |
| `busy check` | Validate workspace coherence (packages, links, integrity) |
| `busy package add <url>` | Add a package from URL or local folder |
| `busy package remove <name>` | Remove a package |
| `busy package upgrade [name]` | Upgrade packages to latest version |
| `busy package list` | List installed packages |
| `busy package info <name>` | Show package details |

### Document Commands

These commands operate on individual `.busy.md` files:

**Parse** — Extract the full structure as JSON:
```bash
busy parse ./models/customer.busy.md -o customer.json
```
Output includes metadata, imports, definitions, operations, and triggers.

**Validate** — Check a document is structurally correct:
```bash
busy validate ./models/customer.busy.md
busy validate ./models/customer.busy.md --resolve-imports
```
With `--resolve-imports`, also verifies that all imported files can be found and parsed.

**Resolve** — Recursively resolve all imports:
```bash
busy resolve ./playbooks/onboarding.busy.md --flat
```
Shows the full dependency tree of a document.

**Info** — Quick summary of a document:
```bash
busy info ./models/customer.busy.md
```
Shows name, type, description, imports, definitions, operations, and triggers at a glance.

For detailed usage, see:
- [Validate Command](./validate.busy.md) — validation options and error patterns
- [Graph Command](./graph.busy.md) — graph formats and filtering

### Workspace Commands

These commands operate on the workspace as a whole:

**Init** — Create a new workspace:
```bash
busy init
busy init -d ./my-workspace
```

**Check** — Validate workspace integrity:
```bash
busy check
busy check -d ./my-workspace
```

**Graph** — Visualize the full workspace:
```bash
busy graph --format tree
busy graph --format dot > workspace.dot
busy graph --filter Model
```

For detailed usage, see [Workspace Commands](./workspace-commands.busy.md).

### Package Commands

Manage external dependencies:

```bash
busy package add ../shared-library/busy    # local folder
busy package add https://github.com/...    # remote URL
busy package list                          # show installed
busy package remove busy-v2                # remove
busy package upgrade --all                 # upgrade all
busy package info busy-v2                  # details
```

For detailed usage, see [Workspace Commands](./workspace-commands.busy.md).
