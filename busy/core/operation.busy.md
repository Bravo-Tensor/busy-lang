---
Name: Operation
Type: [Concept]
Description: A defined unit of work, task, or series of steps to be executed by an LLM.
---
# [Imports](./document.busy.md#imports-section)

[Operation]:./operation.busy.md
[Concept]:./concept.busy.md
[Document]:./document.busy.md
[Tool]:./tool.busy.md
[Event]:./tool.busy.md#events
[Events]:./tool.busy.md#events
[Checklist]:./checklist.busy.md
[RunChecklist]:./checklist.busy.md#runchecklist

# [Setup](./document.busy.md#setup-section)
An [Operation] represents a specific task or set of instructions that an LLM is expected to perform. It can be referenced and called from other [Document]s or [Concept]s. When you encounter an [Operation], read the entire definition first, and
1. [Evaluate any concepts](./concept.busy.md#evaluateconcept) you come across.
2. Note any [Input]s required for the [Operation] to succeed or provided as special requests.
3. Review all the [Steps] and verify you understand how to execute the [Operation].
4. Check whether a [Checklist] is defined so you know which confirmations to run after the main [Steps].

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Input]
[Input]:./operation.busy.md#input
A single piece of data or state required for an [Operation] to proceed. May be explicit or implicit, potentially even in [Concept] format.

## [Input Section]
[Input Section]:./operation.busy.md#input-section
The section header (`### [Input]`) where [Input]s are defined within an [Operation]. Lists all [Input]s required for the [Operation] to succeed. May come in the form of a "hint" or additional context, or a special request to modify the standard process or [Output].

## [Output]
[Output]:./operation.busy.md#output
A single result, artifact, or state change produced by an [Operation].

## [Output Section]
[Output Section]:./operation.busy.md#output-section
The section header (`### [Output]`) where [Output]s are defined within an [Operation]. Lists what should be returned or created at completion. The caller may also request a certain format via an [Input].

## [Error]
[Error]:./operation.busy.md#error
A failure condition. If you are unclear what to do, or unable to perform the [Operation], return with an [Error] which clearly describes the issue and context so it can be troubleshooted.

## [Steps]
[Steps]:./operation.busy.md#steps
The ordered list of instructions to execute within an [Operation].

## [Steps Section]
[Steps Section]:./operation.busy.md#steps-section
The section header (`### [Steps]`) containing the [Steps] to complete the [Operation]. May reference other [Operation]s - if so, execute that operation fully before continuing.

## [Trigger]
[Trigger]:./operation.busy.md#trigger
A declaration that an [Operation] should execute in response to a specific [Event].

## [Triggers Section]
[Triggers Section]:./operation.busy.md#triggers-section
The section header (`### [Triggers]`) where [Trigger]s are declared within an [Operation]. Lists what [Event]s cause this [Operation] to execute.

Operations can declare what [Event]s trigger their execution. Triggers reference [Event]s documented in [Tool] definitions (see [tool.busy.md Events section](./tool.busy.md#events)) and specify how event data maps to operation inputs.

**Architecture**: [Tool]s generate [Event]s → [Operation]s declare [Trigger]s → [Trigger]s map Event outputs to Operation inputs.

### Trigger Declaration

Operations declare triggers using a `### [Triggers]` section within the Operation definition (alongside `### [Input]`, `### [Steps]`, etc.):

```markdown
## ProcessNewEmail[Operation]

### [Triggers]
- event_type: gmail_new_message
  filters:
    from: "*@company.com"
  queue_when_paused: true

### [Input]
- message_id: The email message identifier (from trigger event)
- from: Sender email address (from trigger event)

### [Steps]
1. Retrieve the full message content
2. Process the email...
```

**Trigger Fields**:
- `event_type` (required): Event identifier from a Tool's [Events] section
- `filters` (optional): Field-based conditions for selective matching (supports wildcards, AND logic)
- `queue_when_paused` (optional): Queue events when workspace paused (true) or drop them (false)

**Multiple Triggers**: Operations can declare multiple triggers to respond to different event types.

### Event-to-Input Mapping

Event data automatically maps to operation inputs by matching field names. Event fields become available as operation inputs when the trigger fires.

**Example**: `gmail_new_message` event provides fields like `message_id`, `from`, `subject` → Operation can reference these in its [Input] section.

### Trigger Discovery

Builder/Architect agents discover triggers by reading Operation definitions within Documents, tracing `event_type` to Tool Events sections, and identifying required Tool configurations (connections, credentials, alarms).

### Declaration vs Configuration

- **Declaration** (this document): Operations declare trigger requirements in their `### [Triggers]` section
- **Configuration** (workspace .workspace file): Workspace configures runtime event-to-operation routing based on declarations

# [Operations](./document.busy.md#operations-section)

## [ExecuteOperation][Operation]

### [Input][Input Section]
- `operation_definition`: The BUSY [Operation] to execute.
- `provided_inputs` (optional): Data values or state supplied by the caller to satisfy [Input] requirements.

### [Steps][Steps Section]
When an LLM is instructed to execute an [Operation], it should:
1.  **Identify Inputs:** Collect and identify the values of the [Input] data or state required for the [Operation] to proceed. Log these [Input]s and their sources.
2.  **Search for Missing Inputs:** If required [Input]s are not explicitly provided, search the current context (e.g., parent [Document], memory files) for the necessary data. If you are unable to confidently identify any remaining [Input]s required, then return an [Error].
3.  **Execute Steps:** Follow the defined [Steps] or instructions within the [Operation]. **IMPORTANT: Follow each step strictly!** If you run into an unexpected issue, stop and return an [Error]. If another [Operation] is referenced in the step [execute that operation](./operation.busy.md#executeoperation) in its own scope, providing any [Input]s it needs, then wait for it to return to proceed.
4.  **Manage State:** If the [Operation] defines its own variables or state, store them appropriately (e.g., in memory files like AGENT.md, CLAUDE.md, GEMINI.md) for the duration of the [Operation] or as specified.
5.  **Log Actions:** Record all significant actions taken, intermediate results, and final outcomes of the [Operation] for transparency and debugging.
6.  **Handle Outputs:** If the [Operation] produces an [Output], make it available to the calling context or store it as specified.
7.  **Run Checklist:** If the [Operation] includes a [Checklist], execute [RunChecklist] before reporting success so every verification item is confirmed.

### [Output][Output Section]
- Completed operation result plus any state changes or artifacts specified by the [Operation], with trace logs documenting actions taken.

### [Checklist](./checklist.busy.md#checklist)
- [Input]s identified and their sources logged.
- Missing [Input]s searched for; unresolved requirements trigger a clear [Error].
- [Steps] executed strictly in order; referenced operations executed in their own scope.
- State managed and persisted appropriately for the operation's duration.
- Significant actions and outcomes logged for traceability.
- [Output]s handled per specification (returned or stored).
- [Checklist] (if present) executed via [RunChecklist] before completion.
