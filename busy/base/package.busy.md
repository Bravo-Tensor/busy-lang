---
Name: Package
Type: [Concept]
Description: A collection of BUSY documents distributed together with a manifest
---

# [Imports]
[Concept]:../core/concept.busy.md
[Document]:../core/document.busy.md
[Tool]:../core/tool.busy.md
[Role]:../core/role.busy.md
[Checklist]:../core/checklist.busy.md

# Package

A Package is a distributable collection of BUSY documents. Each package has a `package.busy.md` manifest that declares its contents, version, and metadata.

## Purpose

- **Distribution** - Bundle related documents for sharing and reuse
- **Versioning** - Track changes with semantic versioning
- **Discovery** - List all documents with their types and descriptions
- **Installation** - Enable `busy package add` to fetch and cache

---

# Local Definitions

## Package Entry

A document included in a package manifest.

| Field | Required | Description |
|-------|----------|-------------|
| Path | Yes | Relative path to the document |
| Type | Yes | Document type (Concept, Document, Tool, Role, Checklist) |
| Description | No | Brief description of the document |

## Dependency

An installed package in a workspace.

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL to package.busy.md or file |
| Provider | Yes | github, gitlab, url |
| Cached | Yes | Local path in .libraries/ |
| Version | Yes | Semantic version or tag |
| Fetched | Yes | ISO 8601 timestamp |
| Integrity | No | sha256:{hash} |

---

# Package Manifest Structure

A package manifest (`package.busy.md`) follows this structure:

```markdown
---
Name: package-name
Type: [Package]
Version: v1.0.0
Description: Brief description
---

# [Imports]
[Package]:./base/package.busy.md

# Package Contents

## Category Name

### Document Name

| Field | Value |
|-------|-------|
| Path | ./path/to/document.busy.md |
| Type | Concept |
| Description | What this document provides |
```

## Sections

### Package Contents

Lists all documents included in this package, organized by category. Each entry specifies the relative path, document type, and optional description.

### Dependencies (optional)

Lists packages that this package depends on. Only present in workspace root manifests, not in published packages.
