---
Name: Prompt
Type: [Document]
Description: A specialized [Document] designed as an entry point for an LLM, orchestrating other documents, concepts, and operations to form a complete instruction set.
---

# [Imports](./document.busy.md#imports-section)
[Prompt]:./prompt.busy.md
[Document]:./document.busy.md
[Concept]:./concept.busy.md
[Operation]:./operation.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Operations Section]:./document.busy.md#operations-section
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section

# [Setup](./document.busy.md#setup-section)
A [Prompt] is a top-level [Document] that an LLM will directly interact with. Its primary purpose is to define the overall task, import necessary contextual elements, and guide the LLM through a series of [Operation]s to achieve a specific goal. It extends the base [Document] structure by emphasizing its role as an executable instruction set for the LLM.

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Prompt Text]
[Prompt Text]:./prompt.busy.md#prompt-text
The text that is being provided to be executed by an LLM as a user. The [Operations Section] and any other [Concept]s required for the [Document] to process the [Prompt Text] may be explicitly provided, in part or whole, or may need to be inferred in real time to meet the format and control flow of a [Document].

# [Operations](./document.busy.md#operations-section)

## executePrompt

### [Input][Input Section]
- `prompt_document`: The BUSY [Prompt] being executed, including its [Prompt Text].

### [Steps][Steps Section]
1. **Evaluate as Document:** Process the [Prompt] using [EvaluateDocument](./document.busy.md#evaluatedocument) to load setup context and available [Operation]s.
2. **Interpret Goal:** Review the [Prompt Text] and supporting sections to understand the overarching objective or question.
3. **Orchestrate Operations:** Determine an execution plan using available [Concept]s and [Operation]s (imported, inferred, or locally defined) that satisfy the goal.
4. **Execute Defined Operations:** Run the required [Operation]s defined under `# [Operations](./document.busy.md#operations-section)` or imported from other documents, respecting their step order.
5. **Synthesize Response:** Combine outputs from executed [Operation]s and contextual information to produce a comprehensive response.
6. **Log Execution Flow:** Record which [Document]s, [Concept]s, and [Operation]s were utilized along with their outcomes.

### [Output][Output Section]
- Coherent response satisfying the prompt objective plus execution log entries detailing the operations performed.

### [Checklist][Checklist Section]
- Evaluated as a [Document] and [Setup](./document.busy.md#setup-section) completed.
- Goal interpreted from [Prompt Text] and context.
- Necessary operations orchestrated and executed in order.
- Final response synthesized and returned.
- Execution flow logged with key actions and results.
