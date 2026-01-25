---
Name: Checklist
Type: [Document]
Description: A required verification sequence appended to an [Operation] or [Playbook] that confirms all critical outcomes before completion.
---
# [Imports](./document.busy.md#imports-section)

[Checklist]:./checklist.busy.md
[Operation]:./operation.busy.md
[Playbook]:./playbook.busy.md
[error]:./operation.busy.md#error
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section

# [Setup](./document.busy.md#setup-section)
A [Checklist] captures the non-negotiable confirmations that must occur immediately after the main body of an [Operation] or [Playbook]. Author it as a `### Checklist` (or `## Checklist` for documents without subsections) positioned at the end of the callable definition. Each bullet represents a verification statement written in the imperative voice so the agent can actively confirm it has been satisfied. A [Checklist] is not optional; if it is present, it must always be executed once the primary steps succeed.

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Checklist Section]
[Checklist Section]:./checklist.busy.md#checklist-section
List of [Checklist Item] that are to be verified, in no particular order. This means they could be done in parallel.

## [Checklist Item]
[Checklist Item]:./checklist.busy.md#checklist-item
A single verification statement inside the [Checklist]. Items should be concrete, observable outcomes (e.g., "Repository lint passes without warnings") rather than vague sentiments. Prefer actionable wording so the agent can demonstrate evidence for each item.

# [Operations](./document.busy.md#operations-section)
## [RunChecklist][Operation]

### [Input][Input Section]
- `checklist`: The [Checklist] associated with the just-completed callable.

### [Steps][Steps Section]
1. **Locate the Checklist:** After completing the main steps, identify the `Checklist` section and enumerate every [Checklist Item].
2. **Verify Sequentially:** Address each item in order, gathering evidence or logs that demonstrate the outcome is satisfied. If verification fails, stop and return an [error] describing the gap.
3. **Record Evidence:** Document how each verification was satisfied (e.g., test output, file diff, user confirmation) so downstream consumers understand the proof of completion.
4. **Confirm Completion:** Once all items are verified, explicitly state that the [Checklist] has been completed and summarize any findings uncovered during verification.

### [Output][Output Section]
- Verification summary detailing outcomes for each [Checklist Item] or an error explaining unmet requirements.

### [Checklist][Checklist Section]
- All checklist items enumerated and verified in order.
- Evidence recorded for each item or an [error] returned specifying the missing verification.
- Final confirmation of checklist completion logged or reported to the caller.
