---
Name: Document
Type: [Concept]
Description: The most atomic and fundamental structural unit of the prompt framework, encapsulating concepts, setup, and operations.
---
# [Imports](#imports-section)
[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md
[Checklist]:./checklist.md
[Tool]:./tool.md
[Playbook]:./playbook.md

# [Setup](#local-definitions-section)
A [Document] serves as the primary container for organizing prompts, similar to a class in programming. Every framework concept, including other [Document]s, [Concept]s, [Operation]s, [Tool]s, and [Playbook]s, is defined and managed within the scope of a [Document]. Always [read the entire document](./document.busy.md#evaluatedocument) before executing any [Operations].

# [Local Definitions](#local-definitions-section)
## Concept Description
Frontmatter in the file, delimited by `---`, containing metadata such as `Name`, `Type`, and `Description`. `Type` identifies the document's specialization (e.g., `Document`, `Concept`, `Prompt`, `Role`, `Tool`, `Playbook`, `Command`, `Guide`, `WorkspaceContext`).
## Imports Section
A section immediately following the frontmatter, listing [Concept]s imported from other files, formatted as `[ConceptName]:(path/to/file#anchor)`.
Import resolution policy:
- Paths are repository-relative or relative to the current document.
- Anchors must reference a valid heading within the target file.
- All imports must resolve deterministically; if any import cannot be resolved, this is an [error](./operation.busy.md#error).
## Local Definitions Section
For any local [Concept]s that are relevant to overall [Document], create a "heading 2" (i.e., `##`) in its name (e.g., `## LocalVar`) so it can be referenced via link to become a first-class [Concept].
## Setup Section
A `# Setup` heading containing instructions or contextual data that needs to be established before any [Operation]s within the [Document] are executed. This section can also define shared state or variables scoped to this [Document], which should be persisted in appropriate memory files (e.g., AGENT.md, CLAUDE.md, GEMINI.md).
## Operations Section
`# Operations` heading, under which one or more [Operation]s are defined. Each [Operation] is a callable [Concept] and is denoted by a level-2 heading (`##`). Each callable may conclude with a `### Checklist` that enumerates required verifications to execute.

# [Operations](#operations-section)

## [EvaluateDocument](./operation.md)
When an LLM processes a [Document], it should:
1.  **Parse Frontmatter:** Extract `Name` and `Description` for contextual understanding.
2.  **Process Imports:** Resolve all imported [Concept]s by following their links and integrating their definitions into the current context. If any import cannot be resolved (invalid path or anchor), immediately return an [error] describing the missing import and stop further processing; do not execute [Setup](./document.busy.md#setup-section) or later steps.
3.  **Execute Setup:** Follow the instructions in the `# [Setup](./document.busy.md#setup-section)` section, establishing any required context, persona, or initial state. Persist any specified state to memory files.
4.  **Enforce Strict Execution:** All defined [Operation]s MUST be executed precisely as their steps dictate, including any [Checklist] sections they define.
5.  **Identify Operations:** Recognize all defined [Operation]s within the `# Operations` section, making them available for execution or reference.
6.  **Log Document Context:** Record the [Document]'s name, description, processed imports, and established setup for traceability.

### [Checklist]
- Frontmatter parsed and `Name`/`Description` captured.
- Imports resolved and integrated into context; unresolved imports produce a clear [error] and halt execution prior to Setup.
- Setup executed; any state persisted as specified.
- All Operations identified and made available.
- Document context logged (including resolved imports and setup notes).

## [ListOperations](./operation.md)
Parses the [Document] to find all defined [Operation]s under the `# Operations` section. 
### [Steps](./operation.md)
1.  Parse the document.
2.  Identify all `## Headings` under `# Operations`.
3.  Present the results to the user.

### [Checklist]
- The output MUST be presented as a numbered list.
- Each number MUST correspond to an operation.
- The user MUST be able to invoke an operation by its number.
- Returns only operations defined under `# Operations`.
- Output formatted as a numbered list.
- Each item clearly maps to an invocable operation.
