# Parsing and validation architecture

## One pipeline

```text
Markdown bytes
  -> Markdown source AST and source indexes
  -> canonical BUSY document and sections
  -> workspace indexes, resolved symbols, inheritance, and edges
```

`parseSource(content, filePath)` owns document lowering. It returns the canonical BUSY document, its Markdown source model, and its sections. `parseDocument` returns that same document. `loadRepo` calls `parseSource` and indexes those entities; it does not parse or construct a second document model. `validateDocument` also calls `parseSource` and validates those representations.

There is no compatibility document schema or alternate parser path. The `New*`/`Legacy*` document and operation schemas and the separate lightweight import/definition schemas are removed. Callers use canonical `ParsedDocument`, `Operation`, `ImportDef`, and `LocalDef` types.

## Responsibilities

1. **Markdown source model** (`parsers/markdown.ts`): remark MDAST, source locations, reference definitions, and document-scoped GitHub heading anchors. Code blocks remain code nodes; duplicate headings get unique anchors.
2. **BUSY lowering** (`parser.ts` and `parsers/*`): frontmatter, sections, imports, local definitions, setup, typed document properties, operation declarations, structured steps, inputs, outputs, checklists, Tool actions, and triggers. Domain-specific field parsers operate within this one lowering path. Regex may interpret a field's language; it must not introduce an alternate document/operation discovery path.
3. **Workspace graph** (`loader.ts`): index the canonical entities and build symbol/import/reference relationships and inheritance. Inherited operations are represented consistently in both document operations and the operation index. Graph link extraction uses the complete source AST with section boundaries, retaining reference definitions and excluding fenced examples.
4. **Validation** (`validation/index.ts`): registered checks against the appropriate representation, returning identified findings. The CLI owns file input and report rendering. Semantic review consumes deterministic results and evaluates conceptual consistency.

## Rule placement

| Rule | Representation |
|---|---|
| Frontmatter shape | Canonical frontmatter schema |
| Heading self-link | Markdown heading and link destination |
| Direct local file/anchor existence | Source links and destination anchor indexes |
| Operation naming | Canonical BUSY operation declarations |
| Missing operation steps/imports | Canonical BUSY document |
| Inheritance, call targets, type relationships | Workspace graph |
| Intent, useful outputs, coherent procedure | Semantic review |

A Markdown anchor can target an ordinary heading. Proving it exists does not prove that it is a BUSY Operation or a valid call target. Graph-level rules should use canonical identities and edges rather than infer types from raw link text.

## Public model changes

Document fields are `id`, `docId`, `kind`, `name`, `description`, `types`, `extends`, `imports`, `localdefs`, `setup`, `operations`, `triggers`, and `tools`, plus kind-specific fields and extra frontmatter in `meta`. Setup is a canonical entity with content, not a string. Import entities have `label` and `target`; their source target contains any anchor. Operations have graph identity plus structured steps, inputs, outputs, and an optional checklist. Tool provider frontmatter is retained in `meta.Provider`.

CLI parse/resolve/info, automation export, graph loading, public exports, and tests consume this model. Automation export may format metadata for its output contract; it does not have an alternate parsing implementation. The old parse JSON shape is intentionally not supported.

## Validation coverage

Direct local-link validation checks files and heading anchors in inline links and reference definitions. It excludes code blocks, external URLs, dynamic template URLs, and unresolved Markdown reference labels. Optional recursive import traversal uses the same canonical parser and reports transitive import warnings; it is not a complete graph-validity proof.

`busy check` currently checks registered package cache availability and integrity. Its historical “Workspace is coherent” output does not establish complete link or graph validity. `busy graph` indexes relationships; it does not run a complete graph-validation suite. These command scopes are not changed by this parsing migration.

## Regression evidence

Tests compare entire document entities and operations from standalone parsing, validation, and graph indexing for Document, Playbook, View, Config, and Tool. Tests also cover structured operation payloads, duplicate anchors, references, excluded fenced examples, metadata, imports, definitions, setup, triggers, Tool actions, serialization, and graph/schema integrity.
