---
Name: Document
Description: The most atomic and fundamental structural unit of the prompt framework, encapsulating concepts, setup, and operations.
---
[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md

# Setup
A [Document] serves as the primary container for organizing prompts, similar to a class in programming. Every framework concept, including other [Document]s, [Concept]s, and [Operation]s, is defined and managed within the scope of a [Document]. Always [read the entire document](./document.md#evaluatedocument) before executing any [Operations].

# Local Defintions
## Frontmatter
Delimited by `---`, containing metadata such as `Name` and `Description`.
## Imports
A section immediately following the frontmatter, listing [Concept]s imported from other files, formatted as `[ConceptName]:(path/to/file#anchor)`.
## Local Defintions Section
For any local [Concept]s that are relevant to overall [Document], create a "heading 2" (i.e. ##) in it's name (e.g. `## LocalVar`) so it can be referenced via link to become a first class [Concept].
## Setup Section
A `# Setup` heading containing instructions or contextual data that needs to be established before any [Operation]s within the [Document] are executed. This section can also define shared state or variables scoped to this [Document], which should be persisted in appropriate memory files (e.g., AGENT.md, CLAUDE.md, GEMINI.md).
## Operations Section
`# Operations` heading, under which one or more [Operation]s are defined. Each [Operation] is a callable [Concept] and is denoted by a `## Heading2`.

# Operations

## EvaluateDocument
When an LLM processes a [Document], it should:
1.  **Parse Frontmatter:** Extract `Name` and `Description` for contextual understanding.
2.  **Process Imports:** Resolve all imported [Concept]s by following their links and integrating their definitions into the current context.
3.  **Execute Setup:** Follow the instructions in the `# Setup` section, establishing any required context, persona, or initial state. Persist any specified state to memory files.
4.  **Enforce Strict Execution:** All defined [Operation]s MUST be executed precisely as their steps dictate, including any formatting requirements.
5.  **Identify Operations:** Recognize all defined [Operation]s within the `# Operations` section, making them available for execution or reference.
6.  **Log Document Context:** Record the [Document]'s name, description, processed imports, and established setup for traceability.

## ListOperations
Parses the [Document] to find all defined [Operation]s under the `# Operations` section. 
### Steps
1.  Parse the document.
2.  Identify all `## Headings` under `# Operations`.
3.  Present the results to the user.
### Output Format
- The output MUST be presented as a numbered list.
- Each number MUST correspond to an operation.
- The user MUST be able to invoke an operation by its number.