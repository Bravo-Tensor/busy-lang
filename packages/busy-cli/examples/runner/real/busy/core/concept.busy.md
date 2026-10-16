---
Name: Concept
Type: [Concept]
Description: A fundamental idea or abstraction within the prompt framework, explicitly defined and referenceable.
---
# [Imports](./document.busy.md#imports-section)

[Concept]:./concept.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section

# [Setup](./document.busy.md#setup-section)
A [Concept] is a named idea or abstraction that holds explicit meaning within the project's scope. It serves as a building block for [Document]s and [Operation]s.

Import vs. reference policy:
- References to [Concept]s inside prose may occasionally point to placeholders or namespaces that are not materialized yet; treat these as soft references to guide interpretation.
- Imports declared in a [Document]'s `Imports` section MUST resolve deterministically. Unresolved imports during [EvaluateDocument](./document.busy.md#evaluatedocument) constitute an [error](./operation.busy.md#error) and should halt processing before [Setup](./document.busy.md#setup-section).

# [Operations](./document.busy.md#operations-section)

## evaluateConcept

### [Input][Input Section]
- `concept_reference`: The linked [Concept] encountered during execution.

### [Steps][Steps Section]
1. **Identify the Concept:** Recognize the referenced [Concept] (e.g., `[MyConcept][Concept]`).  
   *Note: Prefer reference-style links defined at the top of the file (e.g., `[ReferenceName]: ./path/to/file.busy.md#anchor`).*
2. **Locate Definition:** Follow the link to the concept's definition. When the target file or anchor is a namespace placeholder, treat it as guidance rather than a hard failure.
3. **Integrate Context:** Incorporate the definition and any associated context into working memory for the current task.
4. **Apply Meaning:** Use the integrated understanding to interpret and apply the [Concept] consistently throughout the active [Document] or [Operation].

### [Output][Output Section]
- Contextual understanding of the [Concept] ready to be applied consistently during execution.
