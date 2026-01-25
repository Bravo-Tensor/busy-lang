---
Name: Workspace
Type: [Concept]
Description: A folder-based execution environment configured by a `.workspace` file that defines how BUSY instructions are executed, how steps are organized, and how nested workspaces are invoked.
---

# [Imports](./document.busy.md#imports-section)
[Operation]:./operation.busy.md
[Steps]:./operation.busy.md#steps-section
[Input]:./operation.busy.md#input-section
[Output]:./operation.busy.md#output-section

# [Setup](./document.busy.md#setup-section)
A **Workspace** is a folder that contains everything needed to execute a BUSY-formatted task or workflow. It is identified by the presence of a `.workspace` configuration file and typically includes `instructions.busy.md`, optional `role.busy.md`, and standard directories for input/output/working files.

**CRITICAL**: All BUSY documents within workspaces MUST use the `.busy.md` extension. This includes `instructions.busy.md`, `operations.busy.md`, `role.busy.md`, and `playbook.busy.md`.

**Recursive Structure**: Workspaces are **fractal/recursive** - any workspace can contain sub-workspaces that follow the exact same structure and rules as the parent workspace. This enables hierarchical composition of arbitrary depth, where each sub-workspace is a fully independent workspace with its own `.workspace` configuration, instructions, operations, and potentially its own sub-workspaces.

# [Local Definitions](./document.busy.md#local-definitions-section)

## Workspace Detection
An agent determines if a folder is a workspace by checking for the `.workspace` file:
```bash
test -f .workspace && echo "This is a workspace"
```

## Workspace Structure
```
workspace-root/
├── .workspace                  # Configuration file (JSON)
├── instructions.busy.md        # BUSY-formatted instructions (REQUIRED .busy.md extension)
├── operations.busy.md          # Operation definitions (REQUIRED .busy.md extension)
├── role.busy.md                # Optional role context (REQUIRED .busy.md extension if present)
├── playbook.busy.md            # Optional orchestration logic (REQUIRED .busy.md extension if present)
├── input/                      # Input files for the workspace
├── output/                     # Final deliverables
├── .trace/                     # Execution trace logs
├── trace.log                  # Main log file
├── memory.json                # Agent memory/state
├── GEMINI.md                  # Gemini-specific state (NOT .busy.md)
├── AGENT.md                   # Generic agent state (NOT .busy.md)
├── CLAUDE.md                  # Claude-specific state (NOT .busy.md)
├── step-1-review/             # Optional step folder (for multi-step playbooks)
│   ├── .workspace             # Step is a full workspace
│   ├── instructions.busy.md   # Step instructions
│   ├── input/
│   ├── output/
│   └── deliverable.md
└── sub-workspace/             # Optional nested workspace (recursive/fractal)
    ├── .workspace             # Full workspace configuration
    ├── instructions.busy.md   # Workspace instructions
    ├── operations.busy.md     # Workspace operations
    ├── input/
    ├── output/
    └── nested-sub-workspace/  # Can nest infinitely
        ├── .workspace
        ├── instructions.busy.md
        └── ...
```

**Note on File Extensions**:
- ALL BUSY documents use `.busy.md` extension
- Agent state files (`GEMINI.md`, `AGENT.md`, `CLAUDE.md`) use `.md` (not `.busy.md`)
- General workspace files (`deliverable.md`, `trace.log`, `memory.json`) use standard extensions

## .workspace Configuration Schema
The `.workspace` file is a JSON configuration that defines workspace behavior.

```json
{
  "name": "string",              // Workspace name (typically folder name)
  "type": "workspace",           // Always "workspace"
  "version": "string",           // Configuration version (e.g., "1.0")
  "framework": "string",         // Execution framework (e.g., "claude", "openai")
  "hasRole": boolean,            // True if role.md exists
  "hasSteps": boolean,           // True if multi-step playbook
  "inputSource": "string",       // Input directory name (default: "input")
  "outputDestination": "string", // Output directory name (default: "output")
  "nestedWorkspaces": [          // Optional: list of nested workspace paths
    {
      "path": "string",
      "command": "string"        // Invocation command template
    }
  ],
  "validationCache": {           // Optional: cached validation results
    "validated": boolean,        // True if workspace has been validated
    "timestamp": "string",       // ISO timestamp of last validation
    "workspaceType": "string",   // Detected workspace type (simple, role-based, multi-step, nested, hybrid)
    "validationStatus": "string" // Status: "valid", "invalid", or "needs-revalidation"
  }
}
```

**Example:**
```json
{
  "name": "content-generation",
  "type": "workspace",
  "version": "1.0",
  "framework": "claude",
  "hasRole": true,
  "hasSteps": true,
  "inputSource": "input",
  "outputDestination": "output",
  "nestedWorkspaces": [
    {
      "path": "step-1-research",
      "command": "claude -p \"execute your instructions\""
    },
    {
      "path": "step-2-draft",
      "command": "claude -p \"execute your instructions\""
    }
  ],
  "validationCache": {
    "validated": true,
    "timestamp": "2025-10-12T14:30:00Z",
    "workspaceType": "hybrid",
    "validationStatus": "valid"
  }
}
```

## Workspace Execution Flow
When executing a workspace, an agent follows this sequence:

1. **Detect Workspace**: Check for `.workspace` file
2. **Load Configuration**: Parse `.workspace` JSON
3. **Assume Role** (if `hasRole: true`): Read and adopt persona from `role.md`
4. **Execute Instructions**:
   - Read `instructions.md`
   - If single operation: execute directly
   - If multi-step playbook: execute steps in sequence
5. **Handle Steps** (if `hasSteps: true`):
   - For each step folder:
     - Get input from previous step's `deliverable.md` or parent `input/`
     - Execute step's `instructions.md`
     - Write output to step's `output/`
     - Write deliverable to step's `deliverable.md`
6. **Invoke Nested Workspaces**: For subfolders with `.workspace`:
   - Execute command from configuration
   - Wait for completion (synchronous by default)
   - Collect results
7. **Write Final Output**: Write deliverables to workspace `output/`

## Step Folder Structure
For multi-step playbooks, each step gets its own workspace folder.

**Naming Convention:**
```
step-<number>-<step-name>/
```
Example: `step-1-review-requirements/`, `step-2-design-solution/`

**Structure:**
```
step-1-review/
├── .workspace          # Step-specific configuration
├── instructions.md     # Step instructions (optional, can inherit)
├── input/             # Step inputs
├── output/            # Step outputs
└── deliverable.md     # Feeds next step's input
```

**Input/Output Chain:**
1. **First Step**: Input from parent workspace `input/`
2. **Middle Steps**: Input from previous step's `deliverable.md`
3. **Last Step**: Output to parent workspace `output/`

Example flow:
```
parent/input/ → step-1/input/ → step-1/deliverable.md →
step-2/input/ → step-2/deliverable.md →
step-3/input/ → step-3/output/ → parent/output/
```

## Nested Workspace Patterns
Subfolders that contain `.workspace` files are treated as independent workspaces.

**Detection:**
```bash
find . -maxdepth 2 -name ".workspace" -type f
```

**Invocation:**
The parent workspace invokes nested workspaces using the command template:
```bash
cd <nested-workspace-path>
claude -p "execute your instructions"
cd ..
```

**Framework-Specific Commands:**
- **Claude**: `claude -p "execute your instructions"`
- **OpenAI**: `openai run instructions.busy.md`
- **Custom**: As specified in `.workspace` configuration

**Execution Mode:**
- **Synchronous (default)**: Parent waits for nested workspace to complete
- **Asynchronous (future)**: Parent continues while nested workspace runs

## Recursive/Fractal Workspace Composition

**Key Principle**: Any workspace can contain sub-workspaces that follow the **exact same structure and rules** as the parent workspace. This recursive property enables:

1. **Infinite Nesting**: Sub-workspaces can contain their own sub-workspaces to any depth
2. **Self-Similarity**: Each level of the hierarchy follows identical validation and execution rules
3. **Composition**: Complex workflows can be broken down into smaller, independently executable workspaces
4. **Reusability**: Sub-workspaces can be copied, moved, or reused in different parent contexts

**Example Recursive Structure:**
```
project-workspace/
├── .workspace
├── instructions.busy.md
├── operations.busy.md
└── phase-1-design/              # Sub-workspace level 1
    ├── .workspace
    ├── instructions.busy.md
    ├── operations.busy.md
    └── research-task/           # Sub-workspace level 2
        ├── .workspace
        ├── instructions.busy.md
        ├── operations.busy.md
        └── literature-review/   # Sub-workspace level 3
            ├── .workspace
            ├── instructions.busy.md
            └── ...              # Can continue infinitely
```

**Execution Tree**: When a parent workspace executes, it recursively executes all sub-workspaces, creating an execution tree where:
- Each node is an independent workspace execution
- Parent nodes wait for child nodes to complete (synchronous)
- Each execution follows the same Workspace Execution Flow
- State is managed independently at each level (separate `trace.log`, `memory.json`, agent state files)

## Working Files Standards
Logs, memory, and other working files are stored in the root workspace folder.

**Standard Files:**
- `trace.log`: Execution trace using format `timestamp | Document -> Operation | message`
- `memory.json`: Agent memory/state (JSON format)
- `.trace/`: Directory for detailed trace files

**Example trace.log Entry:**
```
2025-10-12T14:30:00Z | Content Generation Workspace -> _ReviewRequirements | Starting requirements review.
2025-10-12T14:30:15Z | Content Generation Workspace -> _ReviewRequirements | Completed requirements review.
```

## Workspace Lifecycle
A workspace has distinct lifecycle phases:

### Creation Phase
To create a workspace, use the Build Basic Workspace Playbook:
- Reference: `@busy-v2/base/basic-workspace.md`
- Creates `.workspace` configuration
- Sets up directory structure
- Initializes working files
- Validates structure

### Execution Phase
To execute a workspace, follow the Workspace Execution Flow defined above
- Detects workspace configuration
- Assumes role if specified
- Executes instructions (from `instructions.busy.md`)
- Manages input/output
- Invokes nested workspaces (recursively - each sub-workspace executes independently following the same rules)
- Each nested workspace can itself contain sub-workspaces, creating a fractal execution tree

### Validation Requirements
A valid workspace must satisfy:
- `.workspace` file exists and contains valid JSON
- Required fields present: `name`, `type`, `version`, `framework`
- `instructions.busy.md` exists with `.busy.md` extension (CRITICAL) and valid BUSY format
- Standard directories exist: `input/`, `output/`, `.trace/`
- If `hasRole: true`, `role.busy.md` exists with `.busy.md` extension
- If operations defined, `operations.busy.md` exists with `.busy.md` extension
- If playbook defined, `playbook.busy.md` exists with `.busy.md` extension
- If `hasSteps: true`, step folders exist with proper structure (each step is a full workspace)
- If nested workspaces declared, invocation commands are valid and each nested workspace is itself valid
- Working files initialized: `trace.log`, `memory.json`
- Recursive validation: All sub-workspaces must also satisfy these validation requirements

# [Operations](./document.busy.md#operations-section)

## [ValidateWorkspace][Operation]

### [Input]
- `workspace_path`: Directory path of the workspace to verify.

### [Steps]
1. Confirm the `.workspace` file exists and contains valid JSON.
2. Verify required fields (`name`, `type`, `version`, `framework`) are present.
3. Ensure `type` equals `"workspace"`.
4. Confirm `instructions.busy.md` exists with the `.busy.md` extension and valid BUSY format.
5. When `operations.busy.md` exists, verify the `.busy.md` extension and format.
6. When `playbook.busy.md` exists, verify the `.busy.md` extension and format.
7. Ensure standard directories exist: `input/`, `output/`, `.trace/`.
8. When `hasRole: true`, verify `role.busy.md` exists with the `.busy.md` extension.
9. When `hasSteps: true`, confirm each step folder is a valid workspace with proper structure.
10. When `nestedWorkspaces` are declared, verify each path/command and recursively validate each nested workspace.
11. Confirm working files (`trace.log`, `memory.json`) are present.
12. Recursively validate all sub-workspaces using the same rules.

### [Output]
- Validation report indicating pass/fail status plus any errors or warnings.

## [ParseWorkspaceConfig][Operation]

### [Input]
- `workspace_file`: Path to a `.workspace` configuration file.

### [Steps]
1. Read the `.workspace` file contents.
2. Parse the JSON structure.
3. Validate the JSON against the Workspace configuration schema.
4. Extract configuration values into a structured representation.
5. Apply defaults for optional fields (e.g., `inputSource` defaults to `"input"`, `outputDestination` defaults to `"output"`).
6. Return the parsed configuration object.

### [Output]
- Structured workspace configuration plus any parsing warnings.

## [DetectWorkspaceType][Operation]

### [Input]
- `workspace_path`: Directory path to classify.

### [Steps]
1. Parse the workspace configuration.
2. Check the `hasSteps` flag.
3. Check the `hasRole` flag.
4. Check the `nestedWorkspaces` array.
5. Count step folders present in the directory.
6. Count nested sub-workspaces (folders containing `.workspace` files).
7. Determine workspace type:
   - **Simple**: Single operation; no steps, nested workspaces, or role.
   - **Role-Based**: Includes `role.busy.md`; single operation.
   - **Multi-Step**: Sequential steps without nested workspaces.
   - **Nested**: Nested workspaces without steps.
   - **Hybrid**: Combination of steps and nested workspaces.
   - **Recursive/Fractal**: Sub-workspaces that themselves contain sub-workspaces.
8. Calculate nesting depth (levels of sub-workspaces).
9. Return the workspace type classification.

### [Output]
- Workspace classification along with complexity indicators (step count, nested workspace count, nesting depth, role presence) and a list of sub-workspaces with their types.
