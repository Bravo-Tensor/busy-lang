---
Name: Operation
Type: [Concept]
Description: A defined unit of work, task, or series of steps to be executed by an LLM.
---
[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md
[Checklist]:./checklist.md
[RunChecklist]:./checklist.md#runchecklist
[input]:./operation.md#input
[output]:./operation.md#output
[error]:./operation.md#error

# Local Definitions
## Input
Optional. Any inputs required for the [Operation] to succeed. May be explicit or implicit, potentially even in [Concept] format, which would give you a direct reference to the address of a value. May come in the form of a "hint" or additional context. May also come in the form of a special request to modify the standard process or [output].
## Output
Optional. Any outputs that should be returned or created at completion of the [Operation]. The caller/invoker of the [Operation] may also request a certain format or return request via an [input].
## Error
If you are unclear what to do, or if you are unable to perform the [Operation], return with an [error] which clearly describes the issue and context provided so it can be troubleshooted and resolved.

# Setup
An [Operation] represents a specific task or set of instructions that an LLM is expected to perform. It can be referenced and called from other [Document]s or [Concept]s. When you encounter an [Operation], read the entire definition first, and 
1. [Evaluate any concepts](./concept.md#evaluateconcept) you come across.
2. Note any [input]s required for the [Operation] to succeed or provided as special requests.
3. Review all the steps and verify you understand how to execute the [Operation].
4. Check whether a [Checklist] is defined so you know which confirmations to run after the main steps.
5. Log when you are entering an Operation and when you are leaving. ALWAYS do this regardless of [log level](./workspace-context.md#log-level)

# Operations

## ExecuteOperation
When an LLM is instructed to execute an [Operation], it should:
1.  **Identify Inputs:** Collect and identify the values of the [input] data or state required for the [Operation] to proceed. Log these [input]s and their sources.
2.  **Search for Missing Inputs:** If required inputs are not explicitly provided, search the current context (e.g., parent [Document], memory files) for the necessary data. If you are unable to confidently identify any remaining [input]s required, then return an [error].
3.  **Execute Steps:** Follow the defined steps or instructions within the [Operation]. **IMPORTANT: Follow each step strictly!** If you run into an unexpected issue, stop and return an [error]. If another [Operation] is referenced in the step [execute that operation](./operation.md#executeoperation) in its own scope, providing any inputs it needs, then wait for it to return to proceed.
4.  **Manage State:** If the [Operation] defines its own variables or state, store them appropriately (e.g., in memory files like AGENT.md, CLAUDE.md, GEMINI.md) for the duration of the [Operation] or as specified.
5.  **Log Actions:** Record all significant actions taken, intermediate results, and final outcomes of the [Operation] for transparency and debugging.
6.  **Handle Outputs:** If the [Operation] produces an [output], make it available to the calling context or store it as specified.
7.  **Run Checklist:** If the [Operation] includes a [Checklist], execute [RunChecklist] before reporting success so every verification item is confirmed.

### Checklist
- Inputs identified and their sources logged.
- Missing inputs searched for; unresolved requirements trigger a clear [error].
- Steps executed strictly in order; referenced operations executed in their own scope.
- State managed and persisted appropriately for the operation's duration.
- Significant actions and outcomes logged for traceability.
- Outputs handled per specification (returned or stored).
- Checklist (if present) executed via [RunChecklist] before completion.
