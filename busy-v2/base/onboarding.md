---
Name: Onboarding Playbook
Type: [Playbook]
Description: Sequences the initial BUSY workspace setup steps for a first-time user.
---

[Playbook]:../core/playbook.md
[Document]:../core/document.md
[Operation]:../core/operation.md
[WorkspaceContext]:../core/workspace-context.md
[InitializeWorkspace]:../core/workspace-context.md#initializeworkspace
[BusyAssistant]:./busy-assistant.md
[EvaluateDocument]:../core/document.md#evaluatedocument
[ListPlaybookSteps]:../core/playbook.md#listplaybooksteps

# Setup
This [Playbook] guides a new user through initializing the BUSY workspace and making core commands available. Before executing, [EvaluateDocument] so imports, setup instructions, and private operations load into context. The playbook assumes you have shell access to the project root and the ability to execute `cp`.

# Operations

## _EnsureWorkspaceInitialized
- **Purpose:** Guarantee that `GEMINI.md` exists and matches the default workspace configuration.
- **Steps:**
    1. Check whether `GEMINI.md` is present at the repository root.
    2. If the file is missing or clearly outdated, execute the [InitializeWorkspace] [Operation] from [WorkspaceContext].
    3. If the file exists, skim its state to confirm the default values (`State Storage`, `Configuration Storage`, `Log Level`, `Autonomy Level`, `Bundled Documents`) are reasonable for a fresh install. Adjust only if directed by the user.

## _CopyCommandTemplates
- **Purpose:** Provide Gemini with the local BUSY commands bundle.
- **Steps:**
    1. Compare the repository `commands/` directory with `.gemini/` in the project root.
    2. If `.gemini/` is missing, or the contents differ, run `cp -r commands/ .gemini/` from the workspace root.
    3. Log the resulting `.gemini/` location for future reference.

## _LogOnboardingComplete
- **Purpose:** Record that the onboarding flow finished.
- **Steps:**
    1. Summarize which steps were executed and whether any were skipped due to conditions.
    2. Provide the user with next-step guidance (for example, "Invoke `/get-busy` to start using the framework").

## Step 1 — Prepare Workspace Configuration
- **Target:** `_EnsureWorkspaceInitialized`
- **Condition:** `true` (always execute to confirm the workspace baseline).
- **Role Context:** [BusyAssistant]
- **Notes:** The role should answer any clarifying questions about workspace state before running [InitializeWorkspace].

## Step 2 — Install Gemini Commands
- **Target:** `_CopyCommandTemplates`
- **Condition:** Evaluate to `true` when the `.gemini/` directory is missing or its `commands/` subtree differs from the repository copy; otherwise skip.
- **Role Context:** [BusyAssistant]
- **Notes:** If the copy is skipped, note where the existing `.gemini/commands/` lives so the user can inspect it.

## Step 3 — Confirm Onboarding
- **Target:** `_LogOnboardingComplete`
- **Condition:** `true` (always summarize the results of the playbook).
- **Role Context:** [BusyAssistant]
- **Notes:** Use the summary to reiterate entry points like `/get-busy` and remind the user where state/configuration live.

## ListPlaybookSteps
Execute [ListPlaybookSteps] to enumerate the user-facing steps defined above (Step 1 through Step 3).