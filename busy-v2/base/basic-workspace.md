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
    1. Export `WORKSPACE_ROOT` to the desired absolute path (e.g., `export WORKSPACE_ROOT="$(pwd)/agents/basic-workspace"`).
    2. Create the destination parent directory if necessary: `mkdir -p "$(dirname "$WORKSPACE_ROOT")"`.
    3. Copy the template: `cp -R base/templates/basic-workspace "$WORKSPACE_ROOT"` (this writes the inbox/outbox folders, `.gitkeep` markers, `instructions.md`, and `instructions.test.md`).
    4. Update all links in the workspace BUSY docs to link to the workspace BUSY folder (.e.g `$WORKSPACE_ROOT/.busy/`).

## _ReviewTemplateInstructions
- **Purpose:** Tailor the BUSY-formatted instructions that ship with the template to your specific domain.
- **Steps:**
    1. Open `$WORKSPACE_ROOT/instructions.md` (copied from the template) and read the frontmatter plus the guidance sections that reference the BUSY library.
    2. Incorporate any domain or project-specific expectations—add new BUSY document links, required tools, or output sections as needed.
    3. Note any external assets the agent should rely on so downstream maintainers understand the workspace contract.

## _ValidateWorkspace
- **Purpose:** Smoke-test the workspace by running the included test.
- **Steps:**
    1. Run the test suite defined in `$WORKSPACE_ROOT/instructions.test.md`.
    2. Report the results to the user.

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