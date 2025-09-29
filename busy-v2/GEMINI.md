# Directory Overview

This directory contains a framework for interacting with Large Language Models (LLMs). The framework is designed to be self-documenting and self-executing, where the markdown files themselves define the "code" that the LLM executes. The core concepts of the framework are `Documents`, `Operations`, `Concepts`, `Roles`, and `Tools`.

# Key Files

*   **`spec.md`**: The root document that introduces the core concepts of the framework. It defines the structure of a `Document` and how `Concepts` and `Operations` are used.
*   **`core/`**: This directory contains the core definitions of the framework's concepts.
    *   **`workspace-context.md`**: A foundational [Document] that configures and guides agent execution within a workspace.
    *   **`concept.md`**: Defines what a `Concept` is and how it should be evaluated.
    *   **`document.md`**: Defines the structure of a `Document`, which is the atomic unit of the framework.
    *   **`operation.md`**: Defines an `Operation` as a unit of work.
    *   **`tool.md`**: Defines a `Tool` as a wrapper around external capabilities so agents can invoke them uniformly.
    *   **`prompt.md`**: Defines a `Prompt` as a specialized `Document` that serves as an entry point for an LLM.
    *   **`role.md`**: Defines a `Role` as a specialized `Document` that defines a persona for the LLM.
*   **`base/`**: This directory contains base implementations of the core concepts.
    *   **`busy-assistant.md`**: A `Role` that defines a busy assistant persona.
*   **`test/`**: This directory contains test files.
    *   **`test-prompt.md`**: A `Prompt` to test the framework.

# Usage
Before execution, you MUST review all the links imported at the top and ensure completeness of your understanding of all related concepts. If no /command was specified, assume you're entrypoint is through @./commands/get-busy.md.

The contents of this directory are intended to be used by an LLM. The LLM reads the markdown files and executes the instructions within them. The framework is designed to be extensible, allowing new `Documents`, `Operations`, `Concepts`, `Roles`, and `Tools` to be created to define new tasks and workflows for the LLM.

When interacting with this project, it is important to follow the defined markdown reference style. References to other concepts should be defined at the top of the file (e.g., `[theConcept]:(path/to/theConcept.md)`) and then referenced later with `[theConcept]` or `[myConcept][theConcept]`.

# Workspace Configuration

```json
{
  "WorkspaceContext": {
    "State Storage": "GEMINI.md",
    "Configuration Storage": "GEMINI.md",
    "Log Level": "informational",
    "Autonomy Level": "assisted",
    "Bundled Documents": "ALL"
  }
}
```
