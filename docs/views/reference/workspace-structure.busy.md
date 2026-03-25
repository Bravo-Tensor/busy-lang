---
Name: Workspace Structure Reference
Type: [View]
Description: Reference for the .workspace configuration file, folder conventions, execution flow, and validation requirements.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Workspace]:../../../busy/core/workspace.busy.md
[Document]:../../../busy/core/document.busy.md
[Home]:../home.busy.md

# Setup

This view documents the `.workspace` configuration schema, standard folder layout, execution flow, and validation requirements for BUSY workspaces.

# Display

## Workspace Structure Reference

A BUSY workspace is a folder identified by a `.workspace` configuration file. It bundles everything needed for an agent to execute a task or workflow.

### Standard Folder Layout

```
workspace-root/
├── .workspace                  # Configuration (JSON)
├── instructions.busy.md        # What to do (REQUIRED)
├── operations.busy.md          # Operation definitions
├── role.busy.md                # Agent persona (optional)
├── playbook.busy.md            # Orchestration flow (optional)
├── package.busy.md             # External dependencies
├── .libraries/                 # Cached packages
├── input/                      # Input files
├── output/                     # Final deliverables
├── .trace/                     # Execution trace logs
├── trace.log                   # Main log file
└── memory.json                 # Agent memory/state
```

**File extension rules:**
- All BUSY documents **must** use `.busy.md` — the parser ignores plain `.md`
- Agent state files (`CLAUDE.md`, `GEMINI.md`, `AGENT.md`) use plain `.md`
- General files (`trace.log`, `memory.json`) use standard extensions

### .workspace Configuration

The `.workspace` file is JSON:

```json
{
  "name": "my-workspace",
  "type": "workspace",
  "version": "1.0",
  "framework": "claude",
  "hasRole": true,
  "hasSteps": false,
  "inputSource": "input",
  "outputDestination": "output"
}
```

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Workspace name |
| `type` | string | Always `"workspace"` |
| `version` | string | Configuration version (e.g., `"1.0"`) |
| `framework` | string | Agent framework (`"claude"`, `"openai"`, etc.) |

**Optional fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hasRole` | boolean | false | Whether `role.busy.md` exists |
| `hasSteps` | boolean | false | Whether multi-step playbook |
| `inputSource` | string | `"input"` | Input directory name |
| `outputDestination` | string | `"output"` | Output directory name |
| `nestedWorkspaces` | array | [] | Sub-workspace paths and commands |
| `validationCache` | object | null | Cached validation results |

### Content Ownership

Each file has a clear purpose — don't mix responsibilities:

| File | Owns | Does NOT Own |
|------|------|-------------|
| `instructions.busy.md` | Navigation hub, prerequisites, pointers | Operation logic |
| `operations.busy.md` | Full operation definitions, inputs, outputs | Persona, flow control |
| `role.busy.md` | Persona, traits, principles, skillset | Operations, instructions |
| `playbook.busy.md` | Execution flow, sequencing, error handling | Individual operation logic |

### Multi-Step Workspaces

For sequential workflows, create step folders:

```
workspace/
├── .workspace
├── instructions.busy.md
├── step-1-review/
│   ├── .workspace
│   ├── instructions.busy.md
│   ├── input/
│   ├── output/
│   └── deliverable.md
├── step-2-draft/
│   ├── .workspace
│   ├── instructions.busy.md
│   ├── input/
│   ├── output/
│   └── deliverable.md
└── output/
```

**Naming convention:** `step-<number>-<name>/` (e.g., `step-1-review-requirements/`)

**Input/output chain:**
1. First step → reads from parent `input/`
2. Middle steps → reads from previous step's `deliverable.md`
3. Last step → writes to parent `output/`

### Nested Workspaces

Any folder with a `.workspace` file is an independent sub-workspace:

```
parent/
├── .workspace
├── instructions.busy.md
└── child-workspace/
    ├── .workspace
    ├── instructions.busy.md
    └── grandchild/
        ├── .workspace
        └── instructions.busy.md
```

**Invocation:** The parent calls nested workspaces using the configured command:
```bash
cd child-workspace
claude -p "execute your instructions"
```

**Execution is synchronous by default** — the parent waits for each nested workspace to complete.

### Execution Flow

When an agent executes a workspace:

1. **Detect** — Check for `.workspace` file
2. **Load** — Parse `.workspace` JSON
3. **Assume Role** — If `hasRole: true`, read and adopt `role.busy.md`
4. **Execute** — Read `instructions.busy.md` and follow them
5. **Handle Steps** — If `hasSteps: true`, execute step folders in order
6. **Invoke Nested** — For sub-workspaces, execute their commands
7. **Write Output** — Place deliverables in `output/`

### Validation Requirements

A valid workspace must satisfy all of these:

| Requirement | Check |
|-------------|-------|
| `.workspace` exists | Valid JSON with required fields |
| `instructions.busy.md` exists | Has `.busy.md` extension and valid BUSY format |
| Standard directories | `input/`, `output/`, `.trace/` exist |
| Role file (if declared) | `role.busy.md` exists when `hasRole: true` |
| Operations file (if present) | `operations.busy.md` has valid BUSY format |
| Playbook file (if present) | `playbook.busy.md` has valid BUSY format |
| Step folders (if declared) | Each step has proper workspace structure |
| Nested workspaces | Each declared sub-workspace is itself valid |
| Working files | `trace.log` and `memory.json` initialized |

Use `busy check` to validate workspace coherence, and `busy validate` to check individual files.

### Trace Logging

All workspace execution should be logged to `trace.log`:

```
2026-03-20T14:30:00Z | Workspace -> ReviewRequirements | Starting requirements review.
2026-03-20T14:30:15Z | Workspace -> ReviewRequirements | Completed. 3 requirements validated.
```

Format: `timestamp | Document -> Operation | message`

This creates an audit trail that humans and downstream tools can inspect.
