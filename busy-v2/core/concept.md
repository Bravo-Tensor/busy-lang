---
Name: Concept
Description: A fundamental idea or abstraction within the prompt framework, explicitly defined and referenceable.
---
[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md

# Setup
A [Concept] is a named idea or abstraction that holds explicit meaning within the project's scope. It serves as a building block for [Document]s and [Operation]s.

# Operations

## EvaluateConcept
When an LLM encounters a [Concept], it should:
1.  **Identify the Concept:** Recognize the named [Concept] (e.g., `[MyConcept][Concept]`).
    *Note: All references to other [Concept]s, [Document]s, or [Operation]s should use the preferred markdown reference style: define the link at the top (e.g., `[ReferenceName]:(./path/to/file.md#optional-anchor)`) and then refer to it as `[ReferenceName]` or `[LocalAlias][ReferenceName]`. Inline links are acceptable but less preferred.*
2.  **Locate Definition:** If this is the first time you've seen the [Concept], follow the provided link to its explicit definition. The definition file or anchor may not actually exist. This is fine, as the link to that resource could simply be a namespace or placeholder for the [Concept].
3.  **Integrate Context:** Interpret and incorporate the definition and any associated context into its working memory for the current task.
4.  **Apply Meaning:** Use the integrated definition to interpret and apply the [Concept]'s meaning consistently throughout the execution of the [Document] or [Operation] where it is referenced.