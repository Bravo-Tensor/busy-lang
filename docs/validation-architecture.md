# Parsing and validation architecture

## Layers and ownership

1. **Markdown source model** (`parsers/markdown.ts`): parse with remark into an MDAST and retain source positions, reference definitions, and GitHub heading anchors. Code blocks remain code nodes. Duplicate headings receive document-scoped slugs. This layer describes source syntax; it does not decide what is an Operation.
2. **BUSY structure** (`parsers/sections.ts`, `parsers/operations.ts`): lower the source into sections and discover operation declarations. `operationSections` is shared by the compatibility document parser, the graph loader, and operation validation. An Operations section and an explicit Operation-typed heading are declaration forms. Ordinary View output headings and Tool actions are not operations.
3. **Workspace graph** (`loader.ts`): index documents, sections, operations, imports, symbols, and edges. It uses the same source parser and section/operation lowering. Link extraction receives the full source AST with section boundaries, so reference definitions are available and fenced examples are not reparsed as prose. This representation supports cross-document BUSY relationships and inherited operations.
4. **Validation** (`validation/index.ts`): orchestrate checks and return identified findings. Source checks inspect the shared Markdown model; BUSY naming checks inspect shared operation declarations. The CLI reads files and renders the report. Semantic review consumes deterministic results and assesses intent and conceptual consistency.

## Which representation a rule uses

| Rule | Representation | Reason |
|---|---|---|
| Frontmatter validity | Existing metadata parser/schema | Preserve compatibility API behavior |
| Heading self-link | Markdown heading and resolved link destination | A body invocation is different from a declaration heading |
| Local file/anchor existence | Markdown source and destination anchor indexes | An anchor may target an ordinary heading, not a BUSY concept |
| Operation name | BUSY operation declarations | Do not infer operations independently in a validator |
| Missing steps/imports | Parsed BUSY document | Existing warnings retained |
| Inheritance, call targets, type relationships | Workspace graph | These require BUSY identities and cross-document context; not established by a source-link pass |
| Intent, useful outputs, coherent procedure | Semantic review | Requires judgment beyond syntactic existence |

## Current boundaries

`parseDocument` remains the public compatibility projection; `loadRepo` remains the richer graph projection. This change unifies their operation discovery, not every field or public schema. Setup/local-definition extraction and some operation-body parsing in the compatibility API remain legacy paths. Further changes should extend the shared lowering rather than introduce independent discovery in validators.

`validateDocument` parses the input Markdown once and shares it across its source checks and BUSY lowering. Local-link validation caches each directly referenced target's source anchors for that run. Optional recursive `resolveImports` remains a separate legacy traversal with its existing warnings; it is not a graph-validity proof.

The graph's existing symbol/edge resolver is not yet a universal file/URL resolver. Source file/anchor validation therefore belongs below it and does not claim that a target has the right BUSY type. The next graph-level rules should use indexed BUSY identities and edges, with explicit diagnostics for unresolved edges, rather than treating a Markdown link as a validated call.

`busy check` currently checks registered package cache availability and integrity. Its historical “Workspace is coherent” output does not establish complete link or graph validity. `busy graph` builds a graph; it does not run a complete graph-validation suite.

External URLs, dynamic template destinations, and unresolved Markdown reference labels are outside the direct local-link check. The semantic report must state uncovered cases instead of independently repeating covered checks or inventing missing operations.

## Regression evidence

Tests compare operation identities across `parseDocument` and `loadRepo`, verify shared duplicate-heading anchors, retain local-call edges, and exclude fenced headings and links. Existing parser, graph, CLI, and validator tests remain part of the suite.
