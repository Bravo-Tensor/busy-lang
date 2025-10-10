---
Name: Playbook
Type: [Document]
Description: A structured [Document] that sequences [Operation]s (and other callable concepts) with optional branching, role switching, and reusable local steps.
---
# [Imports](./document.md#imports-section)

[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md
[Prompt]:./prompt.md
[Role]:./role.md
[Tool]:./tool.md
[Checklist]:./checklist.md
[RunChecklist]:./checklist.md#runchecklist
[Playbook]:./playbook.md
[Sequence Step]:./playbook.md#sequence-step
[Condition]:./playbook.md#condition
[Role Context]:./playbook.md#role-context
[Private Operation]:./playbook.md#private-operation
[ExecutePlaybook]:./playbook.md#executeplaybook
[ListPlaybookSteps]:./playbook.md#listplaybooksteps

# [Setup](./document.md#setup-section)
A [Playbook] extends the base [Document] pattern to describe a controlled flow of work. It arranges steps that may invoke other [Operation]s, [Prompt]s, [Document]s, or [Tool]s, optionally under a specified [Role Context]. Each step can be guarded by a lightweight [Condition] so that execution can branch or short-circuit. Treat the [Playbook] as an orchestrator: it does not embed heavy logic, but it clearly references the callable concepts to execute. When you encounter a [Playbook], always [EvaluateDocument](./document.md#evaluatedocument) first so that imports, setup state, and local definitions are loaded into context. If the [Playbook] ends with a `### [Checklist](./checklist.md#checklist)` section, treat it as a required post-run verification and execute the [Checklist].

# [Local Definitions](./document.md#local-definitions-section)
## Sequence Step
A single instruction in the playbook that identifies a callable target (operation/document/prompt/tool) and optional metadata such as inputs, role context, and condition.

## Condition
A boolean check that determines whether a [Sequence Step] should execute. Use simple statements that can be resolved from the available state or inputs. If the condition cannot be evaluated, return an [error](./operation.md#error) describing what data is missing.

## Role Context
Optional metadata for a [Sequence Step] that specifies which [Role] to assume before invoking the target. When provided, adopt the role (via `ExecuteRole`) for the duration of that step and then restore the prior context.

## Private Operation
A locally defined [Operation] within the [Playbook] that supports reuse across steps but is not meant to be exposed externally. Convention: prefix the operation heading with an underscore (e.g., `## _PrepareInbox`). Private operations can still be invoked by other steps within the same [Playbook].

# [Operations](./document.md#operations-section)

## [ExecutePlaybook][Operation]
When instructed to run a [Playbook], do the following:
1. **Evaluate Document:** Run [EvaluateDocument](./document.md#evaluatedocument) to load setup, state, and private operations.
2. **Identify Steps:** Parse the `# [Operations](./document.md#operations-section)` section for non-private [Sequence Step] definitions (e.g., headings describing `Step 1`, `Step A`, etc.) or follow an explicit steps table if provided. Maintain the declared order.
3. **Resolve Each Step:** For each step in order:
   - Evaluate its [Condition] (if any). If the condition is false, skip the step and log the decision.
   - If the step references a [Private Operation], execute it directly.
   - Otherwise, locate the referenced callable (another [Operation], [Prompt], [Document], or [Tool]) and gather required inputs.
   - If a [Role Context] is defined, invoke `ExecuteRole` for that role, run the callable, then restore the previous role/state.
   - Capture outputs or state updates as directed by the step definition.
4. **Handle Failures:** If any step cannot be resolved or produces an error, stop execution and return an [error](./operation.md#error) that includes the step name and details.
5. **Run Checklist:** After the main sequence completes, execute [RunChecklist] if the [Playbook] defines one so every verification item is confirmed.
6. **Summarize Results:** After all steps succeed, provide a concise summary of actions performed and outputs produced.

### [Checklist](./checklist.md#checklist)
- Document evaluated; private operations loaded.
- All steps resolved or skipped based on conditions with reasons logged.
- Failures reported with step names and details; execution halted appropriately.
- Checklist (if defined) executed after main sequence.
- Final summary produced and logged.

## [ListPlaybookSteps][Operation]
Enumerate the discrete [Sequence Step]s in this [Playbook].
1. Parse the [Playbook] after [EvaluateDocument].
2. Collect step headings (excluding [Private Operation]s) in execution order.
3. Present the list as a numbered outline including the target callable and any role context.
