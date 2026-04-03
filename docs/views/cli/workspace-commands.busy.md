---
Name: Workspace Commands
Type: [View]
Description: How to use busy init, busy check, busy automation-ir, and busy package commands to manage workspaces and dependencies.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Document]:../../../busy/core/document.busy.md
[Workspace]:../../../busy/core/workspace.busy.md
[CLI Overview]:./overview.busy.md
[Home]:../home.busy.md

# Setup

This view covers the workspace-level CLI commands: `busy init`, `busy check`, `busy automation-ir`, and the `busy package` subcommands.

# Display

## Workspace Commands

These commands operate on the workspace as a whole — initializing structure, checking integrity, and managing external package dependencies.

### busy init

Create a new BUSY workspace:

```bash
busy init
busy init -d ./my-workspace
```

**What it creates:**
- `package.busy.md` — the workspace manifest (a `[Package]` type document)
- `.libraries/` — directory for cached external packages

If either already exists, it's skipped. This is safe to run in an existing workspace.

### busy check

Validate workspace coherence — verifying that all declared packages exist and their cached files are intact:

```bash
busy check
busy check -d ./my-workspace
```

**What it checks:**
- Every package in `package.busy.md` has a corresponding cached file in `.libraries/`
- File integrity hashes match (if recorded)
- No missing or corrupted dependencies

**Options:**

| Flag | Description |
|------|-------------|
| `-d, --dir <directory>` | Workspace directory (default: `.`) |
| `--skip-external` | Skip validation of external URLs |
| `-v, --verbose` | Show all checks, not just errors |

**Output:**
```
Checking workspace...

  Dependencies: 3

✓ Workspace is coherent
```

Or with errors:
```
Checking workspace...

  Dependencies: 3

Errors:
  ✗ Package "shared-models": cached file not found at .libraries/shared-models/models.busy.md

✗ Workspace has errors
```

### busy automation-ir

Export machine-consumable workspace automation IR built from the richer BUSY document parser:

```bash
busy automation-ir
busy automation-ir --include-graph
busy automation-ir -o workspace-ir.json
```

**What it includes:**
- workspace root/name and summary stats
- every parsed BUSY document in the workspace
- per-document metadata, imports, operations, triggers, and tools/provider mappings when present
- optional dependency graph summary when `--include-graph` is passed

Use this when runtime consumers need a stable automation-oriented view of the workspace rather than the dependency-only output from `busy graph`.

### busy package add

Add an external package from a local folder or URL:

```bash
# Add from a local directory (uses package.busy.md manifest)
busy package add ../busy-lang/busy

# Add from a local directory (recursive file discovery)
busy package add ../shared-models -r

# Add a single file from a URL
busy package add https://raw.githubusercontent.com/org/repo/main/core/document.busy.md
```

**Options:**

| Flag | Description |
|------|-------------|
| `-d, --dir <directory>` | Workspace directory |
| `-r, --recursive` | Recursively add all files from a local folder |

**How it works:**
1. Detects the source type (local folder with manifest, local folder without, or URL)
2. Fetches the content
3. Saves to `.libraries/` with an integrity hash
4. Records the entry in `package.busy.md`

### busy package remove

Remove a package:

```bash
busy package remove <package-id>
```

Removes the entry from `package.busy.md` and deletes cached files from `.libraries/`.

### busy package upgrade

Upgrade packages to their latest version:

```bash
# Upgrade a specific package
busy package upgrade busy-v2

# Upgrade all packages
busy package upgrade --all
```

Shows version changes:
```
Checking for updates...

  ✓ busy-v2: 1.0.0 → 1.1.0
  - shared-models: 2.0.0 (up to date)

✓ Upgraded 1 package(s)
```

### busy package list

Show all installed packages:

```bash
busy package list
```

Output:
```
Dependencies:
  busy-v2              1.0.0        local      .libraries/busy-v2/
  shared-models        2.0.0        github     .libraries/shared-models/

Total: 2 dependency(s)
```

### busy package info

Show details about a specific package:

```bash
busy package info busy-v2
```

Output:
```
Package: busy-v2

| Field     | Value |
|-----------|-------|
| Source    | ../busy-lang/busy |
| Provider  | local |
| Cached    | .libraries/busy-v2/ |
| Version   | 1.0.0 |
| Fetched   | 2026-03-20T14:30:00.000Z |
| Integrity | sha256-abc123... |
```

### Typical Workflow

1. **Initialize:** `busy init` to create the workspace manifest
2. **Add dependencies:** `busy package add` for external packages you need
3. **Author documents:** Create `.busy.md` files that import from `.libraries/`
4. **Check integrity:** `busy check` to verify nothing is broken
5. **Inspect structure:** `busy graph --format tree` to see the dependency graph
6. **Export runtime IR when needed:** `busy automation-ir -o workspace-ir.json`
7. **Keep updated:** `busy package upgrade --all` periodically
