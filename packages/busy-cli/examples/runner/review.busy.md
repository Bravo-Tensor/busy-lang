---
Name: Review a release brief
Type: [Playbook]
Description: A small caller-executed review with an optional repair.
---

# Imports

[Document Tool]: ./document-tool.busy.md

# Setup

Confirm the workspace and document are the intended targets. Report readiness and any limits. If the scope is wrong, inspect or cancel the run. This demo authorizes edits to the supplied in-memory document only.

# Local Definitions

## Ready brief

A ready brief has a nonempty Owner field. An owner must be supplied by the caller; never invent a person's name.

# Operations

## reviewDocument

### Inputs

- workspace: Caller-authorized scope.
- document: Path and current document contents.

### Steps

1. Validate the document against Ready brief. Return the validation result and the evidence you used.
   - Use the supplied contents or your own authorized tools.
   - Report unknown when evidence is insufficient.
2. If validation fails, run repairDocument. Otherwise continue. Use your own history and judgment to choose; inspect or cancel if the sequence does not make sense.
3. Return a short handoff describing the resulting document and any remaining concerns.

### Checklist

- The document satisfies Ready brief, or any remaining failure is explicitly reported.
- Every claimed edit or validation is supported by the caller's evidence.

### Outputs

- document, validation, checklist, handoff

## repairDocument

### Inputs

- document, validation, workspace

### Steps

1. Repair the document using the Document Tool contract and the available evidence. You perform the work. Return the revised document and a receipt describing what you actually changed, or report why you could not repair it.
2. Validate the revised document against Ready brief. Return a fresh validation result with evidence.

### Checklist

- The repair stayed within the authorized scope.
- The returned validation describes the revised document.

### Outputs

- document, validation, repairReceipt, repairChecklist
