---
Name: Validate Command
Type: [View]
Description: How to use the busy validate command to check BUSY documents for structural errors, broken imports, and missing sections.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Document]:../../../busy/core/document.busy.md
[CLI Overview]:./overview.busy.md
[Home]:../home.busy.md

# Setup

This view covers the `busy validate` command in detail — its options, what it checks, and how to interpret its output.

# Display

## Validate Command

`busy validate` checks a BUSY document for structural correctness. It's the first tool to run when authoring or debugging a document.

### Basic Usage

```bash
busy validate <file>
```

Example:
```bash
busy validate ./models/customer.busy.md
```

Output on success:
```
✓ Valid BUSY document: Customer
  Type: Model
  Description: Represents a customer in the system...

✓ Validation passed
```

### Options

| Flag | Description |
|------|-------------|
| `--resolve-imports` | Also validate that all imports can be resolved to real files |

### What Gets Checked

The validate command checks these aspects of a document:

**1. Frontmatter**
- `---` delimiters present at the top of the file
- `Name` field exists and is a non-empty string
- `Type` field exists (e.g., `[Document]`, `[Model]`, `[View]`)
- `Description` field exists

**2. Structure**
- The document can be parsed as valid Markdown
- Sections follow the expected heading hierarchy
- Standard sections are recognizable (Imports, Setup, Local Definitions, Operations)

**3. Operations**
- Operations have parseable step lists
- Warning if an operation has zero steps

**4. Imports** (with `--resolve-imports`)
- Each import path resolves to a real file
- Imported files are themselves valid BUSY documents
- Anchor references resolve to actual headings

### Interpreting Output

**Warnings** (⚠) are non-fatal observations:
```
⚠ Operation "processOrder" has no steps
⚠ Document has operations but no imports
```

**Errors** (✗) mean the document is invalid:
```
✗ File not found: ./models/missing.busy.md
✗ Validation failed: Missing required frontmatter field: Name
✗ Import resolution failed: Cannot resolve ./broken-path.busy.md
```

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Missing frontmatter | No `---` delimiters at top | Add YAML frontmatter with Name, Type, Description |
| Missing required field | Frontmatter lacks Name, Type, or Description | Add the missing field |
| Import resolution failed | Path doesn't resolve to a file | Fix the relative path or create the target file |
| Anchor not found | `#anchor` doesn't match any heading | Check heading text and anchor casing |

### Workflow Tips

- **Run validate early and often** — catch structural issues before they cascade
- **Use `--resolve-imports` before committing** — ensures no broken links
- **Combine with `busy check`** — validate checks one file, check validates the whole workspace
- **Pipe to CI** — `busy validate` exits with code 1 on failure, making it CI-friendly
