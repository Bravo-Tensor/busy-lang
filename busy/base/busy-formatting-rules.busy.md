---
Name: Busy Formatting Rules
Type: [Checklist]
Description: Verification checklist to ensure any BUSY [Document] follows required structural conventions.
---

# [Imports](../core/document.busy.md#imports-section)
[Document]:../core/document.busy.md
[Operation]:../core/operation.busy.md
[Checklist]:../core/checklist.busy.md
[EvaluateDocument]:../core/document.busy.md#evaluatedocument
[RunChecklist]:../core/checklist.busy.md#runchecklist
[Steps]:../core/operation.busy.md#steps-section
[Input]:../core/operation.busy.md#input-section
[Output]:../core/operation.busy.md#output-section

# [Setup](../core/checklist.busy.md#setup)
Use this [Checklist] whenever you draft or revise a BUSY [Document]. It focuses on structural, linking, and ordering requirements expected by [EvaluateDocument]. If a [Document] intentionally diverges, record that exception in its [Setup](../core/document.busy.md#setup-section) or companion guidance.

Apply the target's type-specific schema before the generic checks below. In particular, [Tool action documents](../core/tool.busy.md#tool-action-document-structure) use a literal `# [Tools]` section, bare action identifiers, plural Inputs/Outputs, and provider mappings. These action-schema headings are exceptions to the generic heading-link rules. A callable Tool action is not automatically an Operation and does not require Steps, a Checklist, or an Operations section. Apply Operation requirements only to actual Operations, including any separately defined in a Tool. Report a genuine conflict between source definitions as uncertainty, not as a definite violation.

Structural heading and concept-definition requirements apply to the enclosing BUSY document, not fenced or indented code blocks containing examples or template output. Review template content for reference resolution, variable consistency, and intended output usability without requiring its ordinary Markdown headings to be BUSY concept links.

# [Operations](../core/checklist.busy.md#operations)

## runBusyFormattingRules

### [Input]
- `target_doc`: Path or identifier of the BUSY [Document] under review.

### [Steps]
1. Load `target_doc` and review it using the [EvaluateDocument] execution order (frontmatter → [Imports](../core/document.busy.md#imports-section) → [Setup](../core/document.busy.md#setup-section) → [Operations](../core/document.busy.md#operations-section)).
2. Compare the [Document] against each item in this [Checklist], capturing evidence of compliance or deviation.
3. Flag violations or ambiguities that require follow-up action.
4. Invoke [RunChecklist] to confirm every verification item has been evaluated.

### [Output]
- Formatting assessment summary referencing checklist results and any identified gaps.

### [Checklist](../core/checklist.busy.md#checklist)
1. Frontmatter and Imports
   1. Confirm frontmatter appears at the very top, delimited by `---`, and defines `Name`, `Type`, and `Description`.
   2. Confirm the frontmatter `Type` is a bracketed reference to the correct BUSY concept (e.g., `[Playbook]`, `[Tool]`).
   3. Confirm reference-style imports follow immediately after the frontmatter, one per line as `[Alias]:relative/path[#anchor]`.
   4. Verify each import path exists and any anchor resolves to a heading within the target file.
   5. Confirm a `# [Imports](../core/document.busy.md#imports-section)` heading appears directly above the reference definitions (even when no external imports are required).
2. Concept References
   1. Confirm every section heading outside `# Local Definitions` wraps its title in a link to the concept it invokes (e.g., `# [Setup](path)`); if a heading is unlinked, ensure it introduces a new concept first defined under `# Local Definitions`.
   2. Confirm any local concepts are grouped under `# Local Definitions` using level-2 headings (`## ConceptName`) with canonical names so they can be referenced internally or externally.
   3. Verify new concepts are introduced only under `# Local Definitions`, and any later references link back to that definition or an import.
   4. Confirm concept references in prose are linked to their defining [Document]s (e.g., `[Operation]`, `[Checklist]`), or establish them under `# Local Definitions` before reuse.
   5. Confirm section links do not point back to the same heading (no self-referential anchors); they must reference a canonical concept definition or imported/local definition anchor. This restriction applies to a link in the heading itself, not a body reference that invokes a local operation. Resolve shortcut, collapsed, and full reference-style links through their definitions before judging them; a resolved `[Imports]` heading is linked just as an inline link is.
3. Sections and Operations
   1. Confirm a `# [Setup](../core/document.busy.md#setup-section)` section is present and either establishes required context or explicitly states when no setup actions are needed.
   2. When the [Document] defines Operations, confirm a `# [Operations](../core/document.busy.md#operations-section)` section exists. Provider-backed Tool actions alone do not trigger this requirement.
   3. Confirm every [Operation] uses a level-2 heading (`##`) that links to its defining concept, states its intent, and lists numbered, imperative steps.
   4. Confirm Operation identifiers use lower camelCase: begin with a lowercase ASCII letter, use only letters and digits, and capitalize subsequent words. Apply to actual Operation declarations and references, not Tool action identifiers or code examples.
   5. Verify [Operation]s reference other BUSY assets through the defined imports instead of inline paths or unresolved links.
   6. Confirm [Operation]s that require verification conclude with a `### [Checklist](../core/checklist.busy.md#checklist)` of actionable, observable items.
4. Execution Order and Persistence
   1. Confirm instructions that persist files or state identify destinations (e.g., memory files, workspace paths) per BUSY conventions.
   2. Verify the [Document] respects the [EvaluateDocument] order overall: frontmatter → imports → [Setup](../core/document.busy.md#setup-section) → [Operations](../core/document.busy.md#operations-section) (plus optional locals/teardown as needed), with no stray directives outside that flow.
