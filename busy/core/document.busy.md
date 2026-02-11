---
Name: Document
Type: [Concept]
Description: The most atomic and fundamental structural unit of the prompt framework, encapsulating concepts, setup, and operations.
---
# [Imports][Imports Section]
[Document]:./document.busy.md
[Concept]:./concept.busy.md
[Operation]:./operation.busy.md
[Checklist]:./checklist.busy.md
[Tool]:./tool.busy.md
[Playbook]:./playbook.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section
[error]:./operation.busy.md#error

# [Setup](#local-definitions-section)
A [Document] serves as the primary container for organizing prompts, similar to a class in programming. Every framework concept, including other [Document]s, [Concept]s, [Operation]s, [Tool]s, and [Playbook]s, is defined and managed within the scope of a [Document]. Always [read the entire document](./document.busy.md#evaluatedocument) before executing any [Operations].

# [Local Definitions](#local-definitions-section)

## [Concept Description]
[Concept Description]:./document.busy.md#concept-description
Frontmatter in the file, delimited by `---`, containing metadata such as `Name`, `Type`, and `Description`. `Type` identifies the document's specialization (e.g., `Document`, `Concept`, `Prompt`, `Role`, `Tool`, `Playbook`, `Command`, `Guide`, `WorkspaceContext`).

## [Imports Section]
[Imports Section]:./document.busy.md#imports-section
A section immediately following the frontmatter, listing [Concept]s imported from other files, formatted as `[ConceptName]:(path/to/file#anchor)`.
Import resolution policy:
- Paths are repository-relative or relative to the current document.
- Anchors must reference a valid heading within the target file.
- All imports must resolve deterministically; if any import cannot be resolved, this is an [error].

## [Local Definitions Section]
[Local Definitions Section]:./document.busy.md#local-definitions-section
For any local [Concept]s that are relevant to overall [Document], create a "heading 2" (i.e., `##`) in its name (e.g., `## LocalVar`) so it can be referenced via link to become a first-class [Concept]. Local Defintions are can also be thought as of "Exports" for the [Document]

## [Setup Section]
[Setup Section]:./document.busy.md#setup-section
A `# Setup` heading containing instructions or contextual data that needs to be established before any [Operation]s within the [Document] are executed. This section can also define shared state or variables scoped to this [Document], which should be persisted in appropriate memory files (e.g., AGENT.md, CLAUDE.md, GEMINI.md).

## [Operations Section]
[Operations Section]:./document.busy.md#operations-section
`# Operations` heading, under which one or more [Operation]s are defined. Each [Operation] is a callable [Concept] and is denoted by a level-2 heading (`##`). Each callable may conclude with a `### Checklist` that enumerates required verifications to execute.

# [Operations](#operations-section)

## evaluateDocument

### [Input][Input Section]
- `document`: The BUSY [Document] currently being evaluated.

### [Steps][Steps Section]
1. **Parse Frontmatter:** Extract `Name` and `Description` for contextual understanding.
2. **Process Imports:** Resolve imported [Concept]s by following their links and integrating definitions into the current context. If any import cannot be resolved (invalid path or anchor), immediately return an [error] describing the issue; do not execute [Setup](./document.busy.md#setup-section) or subsequent steps.
3. **Execute Setup:** Follow instructions under `# [Setup](./document.busy.md#setup-section)` to establish context, persona, or initial state. Persist specified state to appropriate memory files.
4. **Enforce Strict Execution:** Ensure that every defined [Operation] is executed exactly as described, including any associated [Checklist] sections.
5. **Identify Operations:** Discover all [Operation]s under `# [Operations](./document.busy.md#operations-section)` so they are available for execution or reference.
6. **Log Document Context:** Record the [Document]'s name, description, resolved imports, and established setup for traceability.

### [Output][Output Section]
- Fully evaluated document context, including resolved imports, established setup state, discovered operations, and trace metadata.

### [Checklist][Checklist Section]
- Frontmatter parsed and `Name`/`Description` captured.
- Imports resolved and integrated into context; unresolved imports produce a clear [error] and halt execution prior to Setup.
- Setup executed; any state persisted as specified.
- All Operations identified and made available.
- Document context logged (including resolved imports and setup notes).

## listOperations

### [Input][Input Section]
- `document`: The BUSY [Document] whose operations should be enumerated.

### [Steps][Steps Section]
1. Parse the document while respecting [EvaluateDocument] ordering.
2. Identify each `##` heading located under `# [Operations](./document.busy.md#operations-section)`.
3. Present the discovered operations to the caller.

### [Output][Output Section]
- Numbered list of [Operation] definitions found within the document's operations section.

### [Checklist][Checklist Section]
- The output MUST be presented as a numbered list.
- Each number MUST correspond to an operation.
- The user MUST be able to invoke an operation by its number.
- Returns only operations defined under `# Operations`.
- Output formatted as a numbered list.
- Each item clearly maps to an invocable operation.
