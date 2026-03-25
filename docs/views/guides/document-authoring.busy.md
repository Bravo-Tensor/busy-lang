---
Name: Document Authoring Guide
Type: [View]
Description: Step-by-step guide to writing a BUSY document — frontmatter, imports, sections, operations, and checklists.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Document]:../../../busy/core/document.busy.md
[Operation]:../../../busy/core/operation.busy.md
[Checklist]:../../../busy/core/checklist.busy.md
[Home]:../home.busy.md

# Setup

This guide walks through creating a BUSY document from scratch. It covers the required structure, section ordering, and authoring conventions.

# Display

## Document Authoring Guide

Every BUSY document follows a fixed structure that parsers, agents, and the CLI all depend on. This guide covers each section in order.

### 1. Frontmatter

Every BUSY file starts with YAML frontmatter delimited by `---`. Three fields are required:

```yaml
---
Name: My Document
Type: [Playbook]
Description: A brief description of what this document defines.
---
```

**Rules:**
- `Name` — a human-readable name for the document
- `Type` — a bracketed reference to the BUSY type (e.g., `[Document]`, `[Model]`, `[View]`, `[Playbook]`, `[Tool]`, `[Config]`, `[Checklist]`, `[Concept]`)
- `Description` — one or two sentences explaining purpose

The parser rejects documents with missing or malformed frontmatter.

### 2. Imports Section

Immediately after frontmatter, define imports using reference-style Markdown links:

```markdown
# Imports

[Document]:./core/document.busy.md
[Operation]:./core/operation.busy.md
[MyModel]:./models/customer.busy.md
[Steps]:./core/operation.busy.md#steps-section
```

**Rules:**
- One import per line in the format `[Alias]:relative/path.busy.md`
- Paths must resolve to real files. The parser halts on broken imports.
- Use `#anchor` to reference a specific heading within the target file
- The `# Imports` heading must appear even if there are no external imports
- Only import assets that exist. For future concepts, mention them in prose instead.

### 3. Setup Section

The Setup section establishes prerequisites and context. Agents always process this section before executing any operations.

```markdown
# Setup

This playbook requires access to the customer database. 
Ensure the Data Tool is configured before running any operations.
```

If no setup is needed, say so explicitly:

```markdown
# Setup

No setup required.
```

### 4. Local Definitions Section

Introduce new concepts under `# Local Definitions` using level-2 headings. These become addressable nodes that other files can reference.

```markdown
# Local Definitions

## Priority Level
A classification for incoming requests: Low, Medium, High, or Critical.

## Escalation Threshold
The number of hours before an unresolved request is automatically escalated.
```

**Rules:**
- Each definition uses a `##` heading with a descriptive name
- Definitions should be self-contained explanations
- Other documents can import and reference these definitions by anchor
- Keep definitions under Local Definitions — don't scatter them through other sections

### 5. Operations Section

Operations are the callable units of work. Each operation has a name, optional inputs, ordered steps, optional outputs, and an optional checklist.

```markdown
# Operations

## reviewRequest

### Input
- `request_id`: The ID of the request to review
- `urgency`: Priority level override (optional)

### Steps
1. Retrieve the request by ID from the data store
2. Evaluate the request content against the review criteria
3. Assign a priority level based on the evaluation
4. Record the review decision in the audit log

### Output
- Review decision with assigned priority and reviewer notes

### Checklist
- Request retrieved successfully
- Priority assigned
- Decision logged
```

**Rules:**
- Operation names use `##` headings with verb-noun clarity (e.g., `reviewRequest`, `generateReport`)
- Steps are numbered and imperative — tell the agent exactly what to do
- Inputs and Outputs use `###` subheadings within the operation
- Checklists are acceptance criteria — observable, evidence-based items an agent can verify
- Reference imported concepts in steps rather than embedding their logic inline

### Complete Example

Here is a minimal but complete BUSY document:

```markdown
---
Name: Invoice Processor
Type: [Document]
Description: Processes incoming invoices and routes them for approval.
---

# Imports

[Document]:./core/document.busy.md
[Operation]:./core/operation.busy.md

# Setup

This document handles invoice processing. Requires access to 
the accounting system and the approval workflow.

# Local Definitions

## Approval Threshold
Invoices above $10,000 require director-level approval. 
Below that amount, manager approval is sufficient.

# Operations

## processInvoice

### Input
- `invoice_data`: The raw invoice to process

### Steps
1. Validate the invoice has all required fields (vendor, amount, date)
2. Check the amount against the Approval Threshold
3. Route to the appropriate approver based on the threshold
4. Record the routing decision

### Output
- Routing confirmation with approver assignment

### Checklist
- All required fields present
- Correct approver assigned based on threshold
- Routing recorded in audit trail
```

### Common Mistakes

- **Missing `# Imports` heading** — The heading is required even with zero imports
- **Inline links instead of reference links** — Use `[Concept]:path` at the top, then `[Concept]` in body text
- **Self-referential anchors** — Section links must not point back to the same heading
- **Steps without numbers** — Steps must be a numbered list, not bullets
- **Duplicate concept names** — Every concept should map to exactly one definition or import
