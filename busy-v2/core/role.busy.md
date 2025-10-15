---
Name: Role
Type: [Document]
Description: A specialized [Document] that defines a persona for the LLM to adopt, including its traits, principles, and a specific skillset with corresponding [Operation]s.
---

# [Imports](./document.busy.md#imports-section)
[Concept]:./concept.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Prompt]:./prompt.busy.md
[Role]:./role.busy.md
[Checklist]:./checklist.busy.md

# [Local Definitions](./document.busy.md#local-definitions-section)
[Persona]:./role.busy.md#persona
[Traits]:./role.busy.md#traits
[Principles]:./role.busy.md#principles
[Skillset]:./role.busy.md#skillset

## Persona
A high-level description of the character, personality, and communication style the LLM should adopt.

## Traits
A list of specific personality characteristics or qualities that define the [Role]'s behavior.

## Principles
A set of core rules, guidelines, or a code of conduct that the [Role] must adhere to in all its actions and responses.

## Skillset
A list of abilities, areas of expertise, and specialized knowledge that the [Role] possesses.

# [Setup](./document.busy.md#setup-section)
A [Role] is a specialized [Document] that allows the LLM to assume a consistent persona. When a [Role] [Document] is active, the LLM MUST embody the defined [Persona], consistently exhibiting its [Traits] and adhering to its [Principles]. The `# [Setup](./document.busy.md#setup-section)` section of a [Role] is responsible for this initial transformation. Review both the inputs of this invocation as well as the context available through the lens of this [Role].

# [Operations](./document.busy.md#operations-section)

## [ExecuteRole][Operation]
This is the primary [Operation] for a [Role] [Document]. It determines the [Role]'s behavior based on the execution context.

1.  **Assume Persona:** First, process the [Role] as a standard [Document] by following the [EvaluateDocument](./document.busy.md#evaluatedocument) [Operation]. This includes executing the `# [Setup](./document.busy.md#setup-section)` section to internalize the [Persona], [Traits], and [Principles]. Log the assumption of the [Role].
2.  **Check for Incoming Task:** Determine if a specific [Prompt] or [Operation] was provided alongside the [Role] invocation, or if a more implicit/unstructured task was requested. If the latter, be sure to infer the task and map it into the conceptual structure of an [Operation]. If you are unable to do so without removing ambiguity, then return an [error](./operation.busy.md#error).
3.  **Execute Task (if provided):** If an incoming task exists, the [Role] seamlessly proceeds to execute that [Prompt] or [Operation], applying its unique [Persona] and [Skillset] to the task at hand.
4.  **Introduce Self (if no task):** If the [Role] was executed without a specific task, it must greet the user in character, introduce itself, and present a "menu" of the [Operation]s it is capable of performing by invoking the [ListOperations](./document.busy.md#listoperations) [Operation].

### [Checklist](./checklist.busy.md#checklist)
- [Persona] assumed ([Traits] and [Principles] internalized) and logged.
- If a task was provided: executed the task under the role context; otherwise presented a concise menu of available [Operation]s.
- Any state or outputs produced are clearly attributed to this [Role].
