---
Name: BUSY Documentation
Type: [View]
Description: Home page for the BUSY language documentation — authoring guides, CLI reference, and core type overview.
---

# Imports

[View]:../../busy/core/view.busy.md
[Document]:../../busy/core/document.busy.md
[Document Authoring]:./guides/document-authoring.busy.md
[Workspace Setup]:./guides/workspace-setup.busy.md
[Imports and Linking]:./guides/imports-and-linking.busy.md
[CLI Overview]:./cli/overview.busy.md
[Validate Command]:./cli/validate.busy.md
[Graph Command]:./cli/graph.busy.md
[Core Types]:./reference/core-types.busy.md
[Workspace Structure]:./reference/workspace-structure.busy.md

# Setup

This view is the entry point for the BUSY documentation site. It provides navigation to authoring guides, CLI reference, and core type documentation.

# Display

## Welcome to BUSY

BUSY treats Markdown as a typed language for modeling business operations. Every document, link, and heading is structured so that both humans and LLM agents can read, validate, and execute it deterministically.

A BUSY document is a Markdown file with:
- **YAML frontmatter** declaring Name, Type, and Description
- **Reference-style imports** linking to other BUSY documents
- **Standard sections** (Setup, Local Definitions, Operations) following a fixed evaluation order
- **The `.busy.md` extension** so parsers and tools can identify it

### Getting Started

If you're new to BUSY, start here:

- [Document Authoring Guide](./guides/document-authoring.busy.md) — How to write a `.busy.md` file from scratch
- [Imports and Linking](./guides/imports-and-linking.busy.md) — How documents reference each other
- [Workspace Setup](./guides/workspace-setup.busy.md) — How to organize files into a workspace

### CLI Reference

The `busy` CLI parses, validates, and graphs your workspace:

- [CLI Overview](./cli/overview.busy.md) — All available commands at a glance
- [Validate Command](./cli/validate.busy.md) — Check documents for structural errors
- [Graph Command](./cli/graph.busy.md) — Visualize workspace dependencies

### Type Reference

Every BUSY document has a Type. Learn what each one means:

- [Core Types](./reference/core-types.busy.md) — Document, View, Model, Playbook, Config, Tool, and more
- [Workspace Structure](./reference/workspace-structure.busy.md) — The `.workspace` config and folder conventions
