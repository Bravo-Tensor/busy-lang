---
Name: Workspace
Type: [Concept]
Description: A folder-based execution environment configured by a `.workspace` file that defines how BUSY instructions are executed, how steps are organized, and how nested workspaces are invoked.
---

# [Imports](./document.busy.md#imports-section)
[Concept]:./concept.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Playbook]:./playbook.busy.md
[Role]:./role.busy.md

# [Setup](./document.busy.md#setup-section)
A **Workspace** is a folder that contains everything needed to execute a BUSY-formatted task or workflow. It is identified by the presence of a `.workspace` configuration file and typically includes `instructions.md`, optional `role.md`, and standard directories for input/output/working files.

# [Local Definitions](./document.busy.md#local-definitions-section)

## Workspace Detection
An agent determines if a folder is a workspace by checking for the `.workspace` file:
```bash
test -f .workspace && echo "This is a workspace"
```

## Workspace Structure
```
workspace-root/
├── .workspace              # Configuration file (JSON)
├── instructions.md         # BUSY-formatted instructions
├── role.md                 # Optional role context
├── input/                  # Input files for the workspace
├── output/                 # Final deliverables
├── .trace/                 # Execution trace logs
├── trace.log              # Main log file
├── memory.json            # Agent memory/state
└── step-1-review/         # Optional step folder (for multi-step playbooks)
    ├── .workspace
    ├── input/
    ├── output/
    └── deliverable.md
```

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
- **OpenAI**: `openai run instructions.md`
- **Custom**: As specified in `.workspace` configuration

**Execution Mode:**
- **Synchronous (default)**: Parent waits for nested workspace to complete
- **Asynchronous (future)**: Parent continues while nested workspace runs

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
- Executes instructions
- Manages input/output
- Invokes nested workspaces

### Validation Requirements
A valid workspace must satisfy:
- `.workspace` file exists and contains valid JSON
- Required fields present: `name`, `type`, `version`, `framework`
- `instructions.md` exists in valid BUSY format
- Standard directories exist: `input/`, `output/`, `.trace/`
- If `hasRole: true`, `role.md` exists
- If `hasSteps: true`, step folders exist with proper structure
- If nested workspaces declared, invocation commands are valid
- Working files initialized: `trace.log`, `memory.json`

# [Operations](./document.busy.md#operations-section)

## [ValidateWorkspace][Operation]
Verify that a workspace conforms to the Workspace specification.

**Input:**
- Workspace directory path

**Steps:**
1. Check `.workspace` file exists and contains valid JSON
2. Verify required fields: `name`, `type`, `version`, `framework`
3. Verify `type` equals "workspace"
4. Check `instructions.md` exists and has valid BUSY format
5. Verify standard directories exist: `input/`, `output/`, `.trace/`
6. If `hasRole: true`, verify `role.md` exists
7. If `hasSteps: true`, verify step folders exist with proper structure
8. If `nestedWorkspaces` array exists, verify each path and command
9. Verify working files exist: `trace.log`, `memory.json`

**Output:**
- Validation report with pass/fail status
- List of any validation errors or warnings

## [ParseWorkspaceConfig][Operation]
Parse and extract configuration from a `.workspace` file.

**Input:**
- Path to `.workspace` file

**Steps:**
1. Read `.workspace` file contents
2. Parse JSON structure
3. Validate JSON schema against Workspace configuration schema
4. Extract configuration values into structured format
5. Apply defaults for optional fields (inputSource: "input", outputDestination: "output")
6. Return parsed configuration object

**Output:**
- Parsed workspace configuration object
- Any parsing errors or warnings

## [DetectWorkspaceType][Operation]
Determine the type and complexity of a workspace.

**Input:**
- Workspace directory path

**Steps:**
1. Parse workspace configuration
2. Check `hasSteps` flag
3. Check `hasRole` flag
4. Check `nestedWorkspaces` array
5. Count step folders in directory
6. Determine workspace type:
   - **Simple**: Single operation, no steps, no nested workspaces, no role
   - **Role-Based**: Has role context, single operation
   - **Multi-Step**: Has sequential steps, no nested workspaces
   - **Nested**: Has nested workspaces, no steps
   - **Hybrid**: Has both steps and nested workspaces
7. Return workspace type classification

**Output:**
- Workspace type classification
- Complexity indicators (step count, nested workspace count, role presence)
