---
Name: Onboarding
Description: A guide for new users to set up the BUSY framework for the first time.
---

[Concept]:../core/concept.md
[Document]:../core/document.md
[Operation]:../core/operation.md
[WorkspaceContext]:../core/workspace-context.md

<!--IMPORTANT: Read through and understand all linked files above before continuing! These will give you all the context and instructions you need to proceed!-->

# Setup for First-Time Users

Welcome to the BUSY framework! To get started, please follow these steps:

1.  **Create `GEMINI.md`:**
    *   If `GEMINI.md` does not exist, you need to create it. You can do this by running the `InitializeWorkspace` operation from the `core/workspace-context.md` document.

2.  **Copy Commands:**
    *   This project contains custom commands in the `commands/` directory. To make them available to the Gemini agent, you need to copy them to the `.gemini/` directory in your project root. You can do this with the following shell command:
        ```bash
        cp -r commands/ .gemini/
        ```
    *   *Note: The `.gemini/` directory is a special directory that the Gemini agent reads from to load custom commands and configuration.*

3.  **Start Using the Framework:**
    *   Once you have set up `GEMINI.md` and copied the commands, you can start using the framework by invoking the `/get-busy` command.

# Operations

## FirstTimeSetup
- **Input:** None
- **Steps:**
    1.  **Check for `GEMINI.md`:**
        *   Check if `GEMINI.md` exists in the root directory.
        *   If it does not exist, execute the `InitializeWorkspace` [Operation] from the `core/workspace-context.md` [Document].
    2.  **Copy Commands:**
        *   Execute the following shell command to copy the `commands/` directory to `.gemini/`:
            ```bash
            cp -r commands/ .gemini/
            ```
    3.  **Log Confirmation:**
        *   Log a message confirming that the first-time setup is complete.
