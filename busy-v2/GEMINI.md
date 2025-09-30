------------busy core start------------
# Busy v2 Workspace Overview

## Purpose
This workspace bundles the Busy core documents required to bootstrap an LLM-driven execution environment. It acts as both state/config storage and reference manual for the setup automation.

## Directory Map
- `GEMINI.md`: Source of truth for workspace context; this file is updated by the setup script if the demarcated block drifts.
- `busy-gemini-setup.js`: Node script that copies this core section into target workspaces.
- `commands/get-busy.toml`: Entry command used when no explicit `/command` is supplied.
- `core/`: Canonical specifications for Busy concepts such as `Document`, `Operation`, `Role`, `Tool`, `Prompt`, `Playbook`, and `WorkspaceContext`. `core/test.md` contains reference prompts/tests.
- `base/`: Reusable starter content for new workspaces.
  - `busy-assistant.md`: Persona definition for the default Busy assistant role.
  - `basic-workspace.md`: Minimal workspace reference document.
  - `onboarding.md`: Guided onboarding workflow.
  - `templates/basic-workspace/`: File scaffold (inbox/outbox/logs) and instructions templates used by setup scripts.
  - `tools/`: Reserved for tool definitions packaged with Busy.
- `README.md`: High-level overview for human maintainers.
- `package.json` / `package-lock.json`: Node dependencies and scripts needed by the setup tooling.

## Usage
- Review linked documents at the top of any Busy markdown file before execution to ensure full context.
- Treat markdown references (`[name]:(path/to/doc.md)`) as imports; declare them once at the top of the document.
- When operating without an explicit `/command`, assume the entry point is `@./commands/get-busy.toml`.
- Tests and prompts in `core/test.md` and `base/templates` help verify new integrations; adapt them when extending Busy.

## Workspace Configuration
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
------------busy core end------------

