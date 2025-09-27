---
Name: /get-busy
Description: The main entry point command for the BUSY framework. It loads the default workspace and role, then executes a given prompt.
---

[Concept]:../core/concept.md
[Document]:../core/document.md
[Operation]:../core/operation.md
[Prompt]:../core/prompt.md
[Role]:../core/role.md
[WorkspaceContext]:../core/workspace-context.md
[HelpfulAssistant]:../base/helpful-assistant.md

# Local Definitions

## Prompt Text
The user-provided prompt to be executed.

# Setup
1.  Initialize the [WorkspaceContext] by executing its `InitializeWorkspace` [Operation].
2.  Adopt the [HelpfulAssistant] [Role] by executing its `ExecuteRole` [Operation].

# Operations

## ExecuteGetBusy
- **Input:** [Prompt Text]
- **Steps:**
    1.  Execute the `Setup` section to prepare the environment.
    2.  Treat the [Prompt Text] as a [Prompt] and execute it using the `ExecutePrompt` [Operation] from the `core/prompt.md` document.
