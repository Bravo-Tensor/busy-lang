# Busy Document Primer

Busy treats Markdown as a typed language for modeling business operations. Each document, link, and heading feeds deterministic agents, so structure, naming, and linking conventions are crucial for successful execution across the ecosystem.

## Document Structure

- **Frontmatter first:** Every Busy file begins with YAML `---` fencing that declares `Name`, bracketed `Type` (e.g., `[Playbook]`), and `Description`. The parser rejects documents if the metadata is missing or malformed.
- **Reference-style imports:** Immediately after frontmatter, define imports such as `[Operation]:../core/operation.busy.md`. Imports must resolve to real paths and anchors, otherwise `EvaluateDocument` halts with an error.
- **Local definitions:** Introduce new concepts under `# [Local Definitions]` using level-2 headings (for example `## Capability`). These become addressable nodes that other files can reference without duplicating content.
- **Setup section:** Capture prerequisites, personas, or “no setup needed” explicitly under `# [Setup]`. Agents always run this section before executing any operations.
- **Operations section:** Define callable work under `# [Operations]` using level-2 headings, numbered imperative steps, and scoped links to imported concepts. Close each operation that needs verification with `### [Checklist]` bullets so agents can prove success.

## Execution Lifecycle

- `EvaluateDocument` processes frontmatter, resolves imports, runs setup, exposes operations, and logs context. Missing imports or failed setup stop execution early for safety.
- `ExecuteOperation` enumerates inputs, runs steps in order, manages state, handles outputs, and invokes referenced operations in their own scope. Any ambiguity should surface as a deliberate error.
- `RunChecklist` walks every verification item, logging evidence (test results, file diffs, confirmations). The operation only succeeds once every item is satisfied.
- Logging is mandatory: enter/exit operations, note assumptions, and record outcomes so downstream automation and humans can audit the process.

## Core Concepts

- **Concept / Document:** Named ideas and containers that everything else builds on; they ensure every reference resolves deterministically.
- **Operation:** Encapsulated tasks with inputs, outputs, steps, and checklists—think “function with acceptance criteria.”
- **Prompt:** Entry points for agents, orchestrating context and operations to produce complete responses.
- **Role:** Personas that define traits, principles, and skillsets; `ExecuteRole` lets agents adopt them before acting.
- **Playbook:** Orchestrators that sequence operations, prompts, tools, or roles with optional branching, private helper operations, and closing checklists.
- **Tool:** Minimal wrappers around external capabilities (CLI, MCP, API) describing inputs, invocation contracts, outputs, and optional state handling.

## Linking & Imports

- Prefer reference definitions at the top of the file and reuse them throughout the document. Inline links are acceptable but harder for the parser to reuse.
- Only import assets that already exist. If you want to mention a future concept, reference it in prose instead of adding a failing import.
- Avoid duplicate concept names or self-referential headings; every concept should map to one definition or import.
- Run the Busy Formatting Rules checklist whenever you draft or revise a document to catch broken imports, missing sections, or nonstandard headings.

## Workspaces & Files

- A workspace bundles `.workspace` (JSON configuration), `instructions.md`, optional `role.md`, `input/`, `output/`, `.trace/`, and logging artifacts so agents can execute end-to-end.
- `.workspace` tracks framework (`claude`, `openai`, etc.), role usage, multi-step status, nested workspaces, and validation cache. Use `ValidateWorkspace`, `ParseWorkspaceConfig`, and `DetectWorkspaceType` to keep it healthy.
- Follow the content ownership matrix:
  - `instructions.md`: navigation hub with prerequisites, available operations, and pointers to other docs.
  - `operations.md`: full definitions of operations, inputs, outputs, and checklists.
  - `role.md`: persona, traits, principles, and skillset.
  - `playbook.md`: execution flow, sequencing, and error-handling orchestration.
- Use the Build Basic Workspace Playbook to scaffold new workspaces, customize instructions, and run validation before handing the workspace to an agent.

## Authoring Best Practices

- Name operations with verb–noun clarity (`ReviewRequirements`, `DraftContract`) and document inputs, outputs, steps, and checklists.
- Log assumptions, especially when authoring playbooks or roles; downstream agents need that context to interpret decisions.
- Compose rather than duplicate: import shared assets, and use private operations inside playbooks when you need reusable helpers.
- Treat checklists as acceptance criteria—write observable, evidence-based bullets that an agent can prove with logs or artifacts.
- Keep documents concise but complete; Busy documents are read by agents first and humans second, so clarity beats flourish.

## What To Do Next

1. Keep `busy-v2/base/busy-formatting-rules.busy.md` nearby and run the checklist before committing a new or updated Busy document.
2. When you need a new workspace, start with the template via `busy-v2/base/basic-workspace.busy.md`, then layer in operations, roles, and playbooks according to this primer.
