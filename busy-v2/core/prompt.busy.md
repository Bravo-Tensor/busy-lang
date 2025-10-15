---
Name: Prompt
Type: [Document]
Description: A specialized [Document] designed as an entry point for an LLM, orchestrating other documents, concepts, and operations to form a complete instruction set.
---

# [Imports](./document.busy.md#imports-section)
[Document]:./document.busy.md
[Concept]:./concept.busy.md
[Operation]:./operation.busy.md
[Prompt]:./prompt.busy.md
[prompt text]:./prompt.busy.md#prompt-text
[Operations]:./document.busy.md#operations-section

# [Local Definitions](./document.busy.md#local-definitions-section)
## Prompt Text
The text that is being provided to be executed by an LLM as a user. The [Operations] and any other [Concept]s required for the [Document] to process the [prompt text] may be explicitly provided, in part or whole, or may need to be inferred in real time to meet the format and control flow of a [Document].

# [Setup](./document.busy.md#setup-section)
A [Prompt] is a top-level [Document] that an LLM will directly interact with. Its primary purpose is to define the overall task, import necessary contextual elements, and guide the LLM through a series of [Operation]s to achieve a specific goal. It extends the base [Document] structure by emphasizing its role as an executable instruction set for the LLM.

# [Operations](./document.busy.md#operations-section)

## [ExecutePrompt][Operation]
When an LLM executes a [Prompt], it should:
1.  **Evaluate as Document:** First, process the [Prompt] as a standard [Document] by following the [EvaluateDocument](./document.busy.md#evaluatedocument) [Operation] defined in [Document].
2.  **Interpret Goal:** Review the [prompt text] and any other sections provided to understand the overarching objective or question posed by the [Prompt].
3.  **Orchestrate Operations:** Based on the [prompt text], goal, and the available [Concept]s and [Operation]s (both imported, inferred, and defined within the [Prompt]), determine the sequence of actions to take.
4.  **Execute Defined Operations:** Systematically execute the [Operation]s defined within its `# [Operations](./document.busy.md#operations-section)` section, or imported or inferred [Operation]s, as needed to fulfill the prompt's objective.
5.  **Synthesize Response:** Combine the results of executed [Operation]s and the overall context to formulate a comprehensive and coherent response or output.
6.  **Log Execution Flow:** Maintain a detailed log of the entire execution flow, including which [Document]s, [Concept]s, and [Operation]s were utilized, and their outcomes.

### [Checklist](./checklist.busy.md#checklist)
- Evaluated as a [Document] and [Setup](./document.busy.md#setup-section) completed.
- Goal interpreted from [prompt text] and context.
- Necessary operations orchestrated and executed in order.
- Final response synthesized and returned.
- Execution flow logged with key actions and results.
