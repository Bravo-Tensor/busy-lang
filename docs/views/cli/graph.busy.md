---
Name: Graph Command
Type: [View]
Description: How to use the busy graph command to visualize workspace dependencies — JSON, tree, and DOT output formats.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Document]:../../../busy/core/document.busy.md
[CLI Overview]:./overview.busy.md
[Home]:../home.busy.md

# Setup

This view covers the `busy graph` command — how to generate, filter, and interpret workspace dependency graphs.

# Display

## Graph Command

`busy graph` outputs the full dependency graph of a BUSY workspace. It discovers all `.busy.md` files, parses their imports, and produces a graph of nodes (documents) and edges (relationships).

### Basic Usage

```bash
busy graph [directory]
```

Defaults to the current directory. Output defaults to JSON.

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | Output format: `json`, `tree`, or `dot` | `json` |
| `--filter <type>` | Filter nodes by type (e.g., `Model`, `View`, `Playbook`) | none |
| `-o, --output <file>` | Write output to a file instead of stdout | stdout |

### Output Formats

#### Tree Format

The most readable format for quick inspection:

```bash
busy graph --format tree
```

```
my-workspace (15 documents, 42 edges)
├── core/ (3 docs)
│   ├── [Concept] Document (8 importers, 2 imports)
│   ├── [Concept] Operation (6 importers, 1 imports)
│   └── [Document] Checklist (4 importers, 1 imports)
├── models/ (4 docs)
│   ├── [Model] Customer (3 importers, 2 imports)
│   └── [Model] Order (2 importers, 3 imports)
├── playbooks/ (2 docs)
│   └── [Playbook] Onboarding (0 importers, 5 imports)
└── views/ (2 docs)
    └── [View] Dashboard (0 importers, 4 imports)
```

Each node shows:
- **Type** in brackets
- **Name** from frontmatter
- **Importers** — how many other documents import this one
- **Imports** — how many documents this one imports

#### DOT Format

For Graphviz visualization:

```bash
busy graph --format dot > workspace.dot
dot -Tpng workspace.dot -o workspace.png
```

Produces a directed graph where:
- Nodes are labeled `[Type] Name`
- Edges are labeled with the relationship type (`imports`, `calls`, `ref`, `extends`)

#### JSON Format

Full machine-readable output with statistics:

```bash
busy graph --format json -o graph.json
```

The JSON includes:
- `workspace` — workspace name
- `stats` — document count, edge count, type distribution, orphans, circular imports
- `nodes` — array of all documents with type, path, import/importer counts
- `edges` — array of all relationships with from, to, and role

### Filtering by Type

Focus on specific document types:

```bash
# Show only Models
busy graph --filter Model --format tree

# Show only Views
busy graph --filter View --format tree

# Show only Playbooks
busy graph --filter Playbook --format tree
```

The filter matches against the document's Type field (case-insensitive).

### Graph Statistics

The JSON output includes useful statistics:

| Stat | Meaning |
|------|---------|
| `documents` | Total number of `.busy.md` files |
| `edges` | Total relationships between documents |
| `importEdges` | Import-specific edges |
| `types` | Count of documents by type |
| `orphans` | Documents with no imports and no importers |
| `mostImported` | Top 5 most-imported documents |
| `circularImports` | Detected circular import chains |

### Interpreting the Graph

**Orphaned documents** (no imports, no importers) may indicate:
- A document that's not integrated into the workspace
- A standalone reference that should be imported somewhere
- A file that can be safely removed

**Circular imports** are detected and reported but don't prevent the graph from building. They may indicate:
- Two documents that should be merged
- A missing abstraction that both documents depend on

**High importer count** indicates a foundational document — changes to it affect many dependents.

### Tips

- **Run `busy graph --format tree` regularly** — it's the quickest way to understand workspace structure
- **Check for orphans** — they often indicate missing imports or dead documents
- **Use DOT format for documentation** — generate visual diagrams for team onboarding
- **Filter by type when debugging** — narrow focus to just Models, Views, etc.
