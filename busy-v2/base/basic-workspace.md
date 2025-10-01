---
Name: Build Basic Workspace Playbook
Type: [Playbook]
Description: Provisions a folder-based agent workspace with inbox/outbox automation and a Gemini handoff script.
---

[Playbook]:../core/playbook.md
[Document]:../core/document.md
[Operation]:../core/operation.md
[Tool]:../core/tool.md
[BusyAssistant]:./busy-assistant.md
[EvaluateDocument]:../core/document.md#evaluatedocument
[ExecutePlaybook]:../core/playbook.md#executeplaybook
[ListPlaybookSteps]:../core/playbook.md#listplaybooksteps

# Setup
This [Playbook] scaffolds a minimal agent workspace. Run it from your BUSY repository root with shell access. The starter assets live in `base/templates/basic-workspace`; define an absolute target path (for example `agents/basic-workspace`) and export it as `$WORKSPACE_ROOT` before copying the template.

# Operations

## _CopyWorkspaceTemplate
- **Purpose:** Materialize the template workspace that ships with inbox/outbox directories and starter instructions.
- **Steps:**
    1. Log entry: `timestamp | Build Basic Workspace Playbook -> _CopyWorkspaceTemplate | Starting template copy and link update.`
    2. Export `WORKSPACE_ROOT` to the desired absolute path (e.g., `export WORKSPACE_ROOT="$(pwd)/agents/basic-workspace"`).
    2. Create the destination parent directory if necessary: `mkdir -p "$(dirname "$WORKSPACE_ROOT")"`.
    3. Copy the template: `cp -R base/templates/basic-workspace "$WORKSPACE_ROOT"` (this writes the inbox/outbox folders, `.gitkeep` markers, `.trace/`, `instructions.md`, and `instructions.test.md`).
    4. Update links in copied BUSY docs to point to project-level .busy files:
        - `sed -i '' 's|:/.busy/|:../../../.busy/|g' "$WORKSPACE_ROOT/instructions.md"`
        - `sed -i '' 's|:/.busy/|:../../../.busy/|g' "$WORKSPACE_ROOT/instructions.test.md"`
    5. Confirm that `$WORKSPACE_ROOT/.trace/` exists and retains its `.gitkeep` placeholder so the directory is tracked across commits.
    6. Log exit: `timestamp | Build Basic Workspace Playbook -> _CopyWorkspaceTemplate | Completed template copy and link update.`


## _ReviewTemplateInstructions
- **Purpose:** Tailor the BUSY-formatted instructions that ship with the template to your specific domain.
- **Steps:**
    1. Log entry: `timestamp | Build Basic Workspace Playbook -> _ReviewTemplateInstructions | Starting review of template instructions.`
    2. Open `$WORKSPACE_ROOT/instructions.md` (copied from the template) and read the frontmatter plus the guidance sections that reference the BUSY library.
    2. Incorporate any domain or project-specific expectations—add new BUSY document links, required tools, or output sections as needed.
    3. Note any external assets the agent should rely on so downstream maintainers understand the workspace contract.
    4. Log exit: `timestamp | Build Basic Workspace Playbook -> _ReviewTemplateInstructions | Completed review of template instructions.`

## _ValidateWorkspace
- **Purpose:** Smoke-test the workspace by running the included test.
- **Steps:**
    1. Log entry: `timestamp | Build Basic Workspace Playbook -> _ValidateWorkspace | Starting workspace validation.`
    2. Run the test suite defined in `$WORKSPACE_ROOT/instructions.test.md`.
    2. Report the results to the user.
    3. Log exit: `timestamp | Build Basic Workspace Playbook -> _ValidateWorkspace | Completed workspace validation.`

## Step 1 — Copy Workspace Template
- **Target:** `_CopyWorkspaceTemplate`
- **Role Context:** [BusyAssistant]
- **Notes:** The BusyAssistant can clarify directory conventions or BUSY-specific best practices while you scaffold.

## Step 2 — Customize Instructions
- **Target:** `_ReviewTemplateInstructions`
- **Role Context:** [BusyAssistant]
- **Notes:** Customize the instructions to capture the agent’s tone, constraints, and expected deliverables.

## Step 3 — Validate Workspace
- **Target:** `_ValidateWorkspace`
- **Role Context:** [BusyAssistant]
- **Notes:** This will run the test suite to ensure the workspace is functioning correctly.

## ListPlaybookSteps
Execute [ListPlaybookSteps] after [EvaluateDocument] to enumerate Steps 1–3.

### Checklist
- Confirm `$WORKSPACE_ROOT` contains the copied template workspace with inbox/outbox directories, `.busy/` assets, `.trace/`, and updated links.
- Confirm `$WORKSPACE_ROOT/instructions.md` reflects any project-specific guidance or note that none was required.
- Confirm `$WORKSPACE_ROOT/instructions.test.md` was executed and report the observed results to the user.
- Confirm `.trace/trace.log` is ready for use (create the file if this is the initial run).

