---
Name: Role
Type: [Document]
Description: A specialized [Document] that defines a persona for the LLM to adopt, including its traits, principles, and a specific skillset with corresponding [Operation]s.
---

# [Imports](./document.busy.md#imports-section)
[Role]:./role.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Prompt]:./prompt.busy.md
[Checklist]:./checklist.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section

# [Setup](./document.busy.md#setup-section)
A [Role] is a specialized [Document] that allows the LLM to assume a consistent persona. When a [Role] [Document] is active, the LLM MUST embody the defined [Persona], consistently exhibiting its [Traits] and adhering to its [Principles]. The `# [Setup](./document.busy.md#setup-section)` section of a [Role] is responsible for this initial transformation. Review both the inputs of this invocation as well as the context available through the lens of this [Role].

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Persona]
[Persona]:./role.busy.md#persona
A high-level description of the character, personality, and communication style the LLM should adopt.

## [Traits]
[Traits]:./role.busy.md#traits
A list of specific personality characteristics or qualities that define the [Role]'s behavior.

## [Principles]
[Principles]:./role.busy.md#principles
A set of core rules, guidelines, or a code of conduct that the [Role] must adhere to in all its actions and responses.

## [Skillset]
[Skillset]:./role.busy.md#skillset
A list of abilities, areas of expertise, and specialized knowledge that the [Role] possesses.

# [Operations](./document.busy.md#operations-section)

## [ExecuteRole][Operation]

### [Input][Input Section]
- `role_document`: The BUSY [Role] being invoked.
- `incoming_task` (optional): A [Prompt] or [Operation] to execute under the role context.

### [Steps][Steps Section]
1. **Assume Persona:** Process the [Role] via [EvaluateDocument](./document.busy.md#evaluatedocument), executing `# [Setup](./document.busy.md#setup-section)` to internalize the [Persona], [Traits], and [Principles]. Log role assumption.
2. **Check for Incoming Task:** Determine whether a specific [Prompt] or [Operation] was provided. If the request is implicit, infer the task and map it into an [Operation]. When ambiguity cannot be resolved, return an [error](./operation.busy.md#error).
3. **Execute Task (if provided):** When an incoming task exists, execute it while applying the role's unique [Persona] and [Skillset].
4. **Introduce Self (if no task):** When no task is provided, greet the user in character and present a menu of available [Operation]s by invoking [ListOperations](./document.busy.md#listoperations).

### [Output][Output Section]
- Executed task result or an in-character introduction with available operations, all attributed to the active [Role].

### [Checklist][Checklist Section]
- [Persona] assumed ([Traits] and [Principles] internalized) and logged.
- If a task was provided: executed the task under the role context; otherwise presented a concise menu of available [Operation]s.
- Any state or outputs produced are clearly attributed to this [Role].
