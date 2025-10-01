---
Name: WorkspaceContext
Type: [Document]
Description: A foundational [Document] that configures and guides agent execution within a workspace. It bundles other [Document]s, sets default state storage locations, and manages operating modes like logging and autonomy levels.
---

[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md
[Prompt]:./prompt.md
[Role]:./role.md
[Tool]:./tool.md
[Playbook]:./playbook.md
[Trace Directory]:./workspace-context.md#trace-directory

# Local Definitions

## Operating Modes

[Log Level]:./workspace-context.md#log-level
### Log Level
Controls the verbosity of the agent's logging.
- **verbose**: Detailed logging of all actions and thoughts.
- **informational**: Standard logging of important actions, e.g. all entries and exits to [Operation]s.
- **warning**: Logs only warnings and errors.
- **error**: Logs only errors.

[Autonomy Level]:./workspace-context.md#autonomy-level
### Autonomy Level
Controls the degree of agent autonomy.
- **manual**: The agent requires explicit approval for every action.
- **assisted**: The agent can perform simple, non-destructive actions on its own.
- **autonomous**: The agent can perform all actions on its own.

## Configuration

[Bundled Documents]:./workspace-context.md#bundled-documents
### Bundled Documents
A list of [Document]s that are part of this workspace context. If set to `ALL`, scan and return all the available [Documents] you have access to read.

[State Storage]:./workspace-context.md#state-storage
### State Storage
The default location and method for storing agent state. Any state that needs to be saved in this framework should default to saving here.

[Configuration Storage]:./workspace-context.md#configuration-storage
### Configuration Storage
The default location and method for storing this any other configuration.

[Trace Directory]:./workspace-context.md#trace-directory
### Trace Directory
The folder path where execution trace logs are written. Default to `.trace` at the workspace root so every agent run has a consistent location to append trace files. Create the directory if it does not exist before writing logs.

# Setup
Read in all existing state and configuration. If it is not found, stop and throw an [error](./operation.md#error) asking the user to run the `InitializeWorkspace` [Operation]. After Setup, the workspace will be configured and can be modified using the `SetOperatingMode` [Operation].

- **[State Storage]**: `GEMINI.md`
- **[Configuration Storage]**: `GEMINI.md`
- **[Trace Directory]**: `.trace`
- **[Log Level]**: `informational`
- **[Autonomy Level]**: `assisted`
- **[Bundled Documents]**: `ALL`

# Operations

[InitializeWorkspace]:./workspace-context.md#initializeworkspace
## InitializeWorkspace
- **Input:** None
- **Steps:**
    1.  Apply the default settings from the `Setup` section.
    2.  Ensure the [Trace Directory] exists (create it if necessary) so trace logs have a stable location.
    3.  Save everything to [Configuration Storage].
    4.  Log a confirmation message indicating that the workspace has been initialized, including the resolved [Trace Directory] path.

[SetOperatingMode]:./workspace-context.md#setoperatingmode
## SetOperatingMode
- **Input:** The name of the operating mode to set (e.g., `Log Level`) and the desired value (e.g., `verbose`).
- **Steps:**
    1.  Validate that the provided operating mode and value are valid.
    2.  Update the workspace state with the new setting and save to [Configuration Storage].
    3.  Log a confirmation message indicating the change and note the current [Trace Directory] so developers can locate the trace output.

## ListAllDocuments
- **Input:** None
- **Steps:**
    1.  Read the [Bundled Documents] list from the workspace state.
    2.  For each [Document], display its `Name`, type (e.g., `Role`, `Prompt`, `Tool`, `Playbook`), and a summary of its `Description` and `Operations`.

## DisplayCurrentSettings
- **Input:** None
- **Steps:**
    1.  Read the current settings from the workspace state (`Log Level`, `Autonomy Level`, `Bundled Documents`, `State Storage`, `Trace Directory`).
    2.  Display the current settings to the user in a clear and readable format.
