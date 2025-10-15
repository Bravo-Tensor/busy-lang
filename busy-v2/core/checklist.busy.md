---
Name: Checklist
Type: [Document]
Description: A required verification sequence appended to an [Operation] or [Playbook] that confirms all critical outcomes before completion.
---
# [Imports](./document.busy.md#imports-section)

[Concept]:./concept.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Playbook]:./playbook.busy.md
[Checklist]:./checklist.busy.md#checklist-section
[Checklist Item]:./checklist.busy.md#checklist-item
[error]:./operation.busy.md#error

# [Setup](./document.busy.md#setup-section)
A [Checklist] captures the non-negotiable confirmations that must occur immediately after the main body of an [Operation] or [Playbook]. Author it as a `### Checklist` (or `## Checklist` for documents without subsections) positioned at the end of the callable definition. Each bullet represents a verification statement written in the imperative voice so the agent can actively confirm it has been satisfied. A [Checklist] is not optional; if it is present, it must always be executed once the primary steps succeed.

# [Local Definitions](./document.busy.md#local-definitions-section)
## Checklist Section
List of [Checklist Item] that are to be verified, in no particular order. This means they could be done in parallel.

## Checklist Item
A single verification statement inside the [Checklist]. Items should be concrete, observable outcomes (e.g., "Repository lint passes without warnings") rather than vague sentiments. Prefer actionable wording so the agent can demonstrate evidence for each item.

# [Operations](./document.busy.md#operations-section)
## [RunChecklist][Operation]
When a callable defines a [Checklist], the agent must:
1. **Locate the Checklist:** After completing the main steps, identify the `Checklist` section and enumerate every [Checklist Item].
2. **Verify Sequentially:** Address each item in order, gathering evidence or logs that demonstrate the outcome is satisfied. If an item cannot be verified, stop and return an [error] describing the gap.
3. **Record Evidence:** Note how each verification was satisfied (e.g., test output, file diff, user confirmation) so downstream consumers understand the proof of completion.
4. **Confirm Completion:** Once all items are verified, explicitly state that the [Checklist] has been completed and summarize any findings uncovered during verification.

### [Checklist]
- All checklist items enumerated and verified in order.
- Evidence recorded for each item or an [error] returned specifying the missing verification.
- Final confirmation of checklist completion logged or reported to the caller.
