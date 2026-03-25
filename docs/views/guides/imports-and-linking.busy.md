---
Name: Imports and Linking Guide
Type: [View]
Description: How BUSY documents reference each other — import syntax, anchor resolution, and linking conventions.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Document]:../../../busy/core/document.busy.md
[Concept]:../../../busy/core/concept.busy.md
[Home]:../home.busy.md

# Setup

This guide covers how BUSY documents reference and link to each other through imports, how the parser resolves paths, and best practices for maintaining a clean import graph.

# Display

## Imports and Linking

BUSY documents form a typed graph through reference-style Markdown imports. The parser resolves every import at load time — broken links are treated as errors, not warnings.

### Import Syntax

Imports are reference-style Markdown link definitions placed immediately after the frontmatter:

```markdown
[Alias]:relative/path/to/file.busy.md
[Alias With Anchor]:relative/path/to/file.busy.md#section-name
```

**The alias** (text in brackets) is the name you'll use throughout the document to refer to the imported concept. Choose clear, descriptive aliases:

```markdown
# Good — clear what each import is
[Customer Model]:./models/customer.busy.md
[Order Processing]:./playbooks/order-processing.busy.md

# Bad — ambiguous aliases
[Doc1]:./models/customer.busy.md
[Ref]:./playbooks/order-processing.busy.md
```

### Path Resolution

All paths are **relative** to the importing file's location:

```
workspace/
├── core/
│   └── document.busy.md
├── models/
│   └── customer.busy.md
└── playbooks/
    └── onboarding.busy.md    ← importing from here
```

From `playbooks/onboarding.busy.md`:
```markdown
[Document]:../core/document.busy.md        ← go up one level, into core/
[Customer]:../models/customer.busy.md      ← go up one level, into models/
```

### Anchor References

Use `#anchor` to reference a specific heading within the target file. Anchors follow standard Markdown heading-to-anchor conversion (lowercase, hyphens for spaces):

```markdown
[Input Section]:../core/operation.busy.md#input-section
[Steps]:../core/operation.busy.md#steps-section
[Lifecycle]:./models/order.busy.md#lifecycle-section
```

The parser verifies the anchor resolves to an actual heading in the target file. Broken anchors halt execution.

### File Extension Rules

- BUSY documents use the `.busy.md` extension
- Import references to `.md` files automatically resolve to `.busy.md` if available
- Non-BUSY files (e.g., `README.md`, `CLAUDE.md`) should not be imported

### Using Imports in Body Text

After defining imports at the top, use the alias in square brackets throughout the document:

```markdown
# Imports

[Customer]:./models/customer.busy.md
[Order]:./models/order.busy.md

# Setup

This playbook processes a [Customer]'s [Order] through the
fulfillment pipeline.

# Operations

## fulfillOrder

### Steps
1. Retrieve the [Customer] record
2. Validate the [Order] has all required fields
3. Submit the [Order] for processing
```

### Cross-Reference Patterns

**Importing specific operations:**
```markdown
[EvaluateDocument]:./core/document.busy.md#evaluatedocument
```

**Importing local definitions from another file:**
```markdown
[Priority Level]:./shared/definitions.busy.md#priority-level
```

**Importing type definitions (for Type field in frontmatter):**
```markdown
[Playbook]:./core/playbook.busy.md
```

### Edge Types in the Graph

When the CLI builds a workspace graph, imports create typed edges:

| Edge Type | Meaning |
|-----------|---------|
| `imports` | Document A imports Document B |
| `calls` | An operation calls another operation |
| `extends` | A local definition extends an imported definition |
| `ref` | A general reference link to another document |

Use `busy graph --format tree` to see all edges in your workspace.

### Best Practices

- **Prefer reference definitions** at the top of the file — reuse them in prose. Inline links are harder for the parser to track.
- **Only import existing assets** — if you need to mention a future concept, reference it in prose without creating an import
- **Avoid duplicate concept names** — each concept should map to one definition or import
- **Keep imports organized** — group by category (types, models, operations) with blank lines between groups
- **Use the formatting checklist** — run the Busy Formatting Rules checklist after drafting or revising a document to catch broken imports
