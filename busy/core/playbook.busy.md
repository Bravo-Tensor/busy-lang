---
Name: Playbook
Type: [Document]
Description: A structured [Document] that sequences [Operation]s (and other callable concepts) with optional branching, role switching, and reusable local steps.
---
# [Imports](./document.busy.md#imports-section)

[Playbook]:./playbook.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Prompt]:./prompt.busy.md
[Role]:./role.busy.md
[Tool]:./tool.busy.md
[Checklist]:./checklist.busy.md
[RunChecklist]:./checklist.busy.md#runchecklist
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section

# [Setup](./document.busy.md#setup-section)
A [Playbook] extends the base [Document] pattern to describe a controlled flow of work. It arranges steps that may invoke other [Operation]s, [Prompt]s, [Document]s, or [Tool]s, optionally under a specified [Role Context]. Each step can be guarded by a lightweight [Condition] so that execution can branch or short-circuit. Treat the [Playbook] as an orchestrator: it does not embed heavy logic, but it clearly references the callable concepts to execute. When you encounter a [Playbook], always [EvaluateDocument](./document.busy.md#evaluatedocument) first so that imports, setup state, and local definitions are loaded into context. If the [Playbook] ends with a `### [Checklist][Checklist Section]` section, treat it as a required post-run verification and execute the [Checklist].

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Sequence Step]
[Sequence Step]:./playbook.busy.md#sequence-step
A single instruction in the playbook that identifies a callable target (operation/document/prompt/tool) and optional metadata such as inputs, role context, and condition.

## [Condition]
[Condition]:./playbook.busy.md#condition
A boolean check that determines whether a [Sequence Step] should execute. Use simple statements that can be resolved from the available state or inputs. If the condition cannot be evaluated, return an [error](./operation.busy.md#error) describing what data is missing.

## [Role Context]
[Role Context]:./playbook.busy.md#role-context
Optional metadata for a [Sequence Step] that specifies which [Role] to assume before invoking the target. When provided, adopt the role (via `ExecuteRole`) for the duration of that step and then restore the prior context.

## [Private Operation]
[Private Operation]:./playbook.busy.md#private-operation
A locally defined [Operation] within the [Playbook] that supports reuse across steps but is not meant to be exposed externally. Convention: prefix the operation heading with an underscore (e.g., `## _PrepareInbox`). Private operations can still be invoked by other steps within the same [Playbook].

# [Operations](./document.busy.md#operations-section)

## executePlaybook

### [Input][Input Section]
- `playbook_document`: The BUSY [Playbook] to execute.
- `initial_context` (optional): State or inputs shared across steps.

### [Steps][Steps Section]
1. **Evaluate Document:** Run [EvaluateDocument](./document.busy.md#evaluatedocument) to load setup, state, and private operations.
2. **Identify Steps:** Parse the `# [Operations](./document.busy.md#operations-section)` section for non-private [Sequence Step] definitions (e.g., `Step 1`, `Step A`) or reference an explicit steps table while preserving declared order.
3. **Resolve Each Step:** For each step in sequence:
   - Evaluate any [Condition]; skip and log when the condition is false.
   - Execute [Private Operation]s directly when referenced.
   - Otherwise, locate the referenced callable ([Operation], [Prompt], [Document], or [Tool]) and gather required inputs.
   - If a [Role Context] is defined, invoke `ExecuteRole` for that role, run the callable, then restore the prior role/state.
   - Capture outputs or state updates as directed by the step.
4. **Handle Failures:** When a step cannot be resolved or produces an error, stop execution and return an [error](./operation.busy.md#error) that includes the step name and details.
5. **Run Checklist:** After the main sequence completes, execute [RunChecklist] if the [Playbook] defines one.
6. **Summarize Results:** Provide a concise summary of actions performed and outputs produced.

### [Output][Output Section]
- Execution summary capturing completed steps, outputs, and any checklist results.

### [Checklist][Checklist Section]
- Document evaluated; private operations loaded.
- All steps resolved or skipped based on conditions with reasons logged.
- Failures reported with step names and details; execution halted appropriately.
- Checklist (if defined) executed after main sequence.
- Final summary produced and logged.

## listPlaybookSteps

### [Input][Input Section]
- `playbook_document`: The BUSY [Playbook] whose steps should be enumerated.

### [Steps][Steps Section]
1. Parse the [Playbook] after running [EvaluateDocument](./document.busy.md#evaluatedocument).
2. Collect step headings (excluding [Private Operation]s) in execution order.
3. Present the list as a numbered outline that includes each target callable and role context.

### [Output][Output Section]
- Numbered outline of [Sequence Step]s ready for orchestration or inspection.
