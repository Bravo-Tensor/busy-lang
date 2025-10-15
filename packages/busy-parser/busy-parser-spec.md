# Busy Parser & Context Builder — Development Requirements (v1.0)

> Purpose: Implement a small TypeScript library + CLI that parses Busy markdown workspaces into a typed graph (docs, sections, local definitions, imports, links), and produces a **minimal execution context** for any top‑level Operation to feed into an LLM agent.

---

## 0) Scope & Goals

**In-scope**

* Parse Busy markdown files (e.g., `workspace.md`, `role.md`, `operation.md`, `document.md`, `busy-formatting-rules.md`).
* Extract front‑matter, headings, and content; build a hierarchical section tree per document.
* Promote the **"Local Definitions"** section into first‑class `LocalDef` nodes that can **extend** other definitions.
* Parse **reference-style imports** and **inline links**; resolve into a typed **edge graph** (`ref`, `calls`, `extends`, `imports`).
* Provide a resolver to build a **minimal context payload** for a given operation `docId#slug` (the op, required local defs + ancestors, and callable sub‑operations).
* Offer a small API + CLI to load, inspect, and export context JSON for agents.

**Out-of-scope (v1)**

* Editing/writing back to markdown.
* Full WYSIWYG rendering or web UI.
* Sophisticated semantic classification of links beyond the provided heuristics.

---

## 1) Inputs & Conventions

* **Files**: UTF‑8 Markdown with optional front‑matter (YAML). File names may not equal `Name`; `docId` derives from front‑matter `Name` (preferred) or filename.
* **Front‑matter fields** (case-sensitive unless noted):

  * `Name: string` (required)
  * `Type: string[]` e.g., `["Document"]`, `["Concept"]`, `["Operation"]`, `["Checklist"]`, `["Tool"]`, `["Playbook"]`
  * `Extends?: string[]` (optional; names of parents this concept/def extends)
  * `Description?: string`
  * `Tags?: string[]`
* **Headings**: `#`–`######` define a nested section tree.
* **Local Definitions** section: a section whose heading text **equals** `Local Definitions` (case-insensitive) or whose slug matches `local-definitions-section`. All subheadings beneath it define `LocalDef` nodes.
* **Inline structured blocks** under a local definition heading (optional):

  ```yaml busy
  Extends: ["RoleBase"]
  Tags: ["persona", "style"]
  ```

  Accept `yaml` or `json` fenced blocks with an info string containing `busy`.

---

## 2) Data Model (TypeScript types)

> Implement with Zod for runtime validation, but expose ergonomic TS types.

```ts
export type DocId = string;   // normalized from Name (spaces→_)
export type Slug = string;    // github-slugger of heading text

export type Section = {
  kind: "section";
  id: string;           // `${docId}#${slug}`
  docId: DocId;
  slug: Slug;
  title: string;
  depth: number;        // 1..6
  path: string;         // absolute path
  lineStart: number;
  lineEnd: number;
  tags: string[];
  attrs: Record<string, unknown>; // placeholder for future per-section attrs
  content: string;      // markdown slice under this heading up to next sibling
  children: Section[];
};

export type ConceptBase = {
  kind: "concept" | "document" | "operation" | "checklist" | "tool" | "playbook";
  id: DocId;            // == docId
  docId: DocId;
  slug: string;         // doc-level slug (lowercased docId)
  name: string;         // front-matter Name
  description?: string;
  types: string[];      // front-matter Type
  extends: string[];    // normalized parents (by Name)
  tags: string[];
  attrs: Record<string, unknown>; // raw fm for now
  path: string;
  lineStart: number;
  lineEnd: number;
};

export type BusyDocument = ConceptBase & {
  kind: "document";
  sections: Section[];
};

export type LocalDef = {
  kind: "localdef";
  id: string;           // `${docId}::${slug}`
  docId: DocId;
  name: string;         // subheading text
  slug: Slug;
  depth: number;
  path: string;
  lineStart: number;
  lineEnd: number;
  tags: string[];
  attrs: Record<string, unknown>; // parsed from fenced block or key: value lines
  extends: string[];    // names/ids of parents
  content: string;      // markdown slice of the def body
};

export type ImportDef = {
  kind: "importdef";
  docId: DocId;         // owner document of this import table
  label: string;        // e.g., "Concept"
  target: string;       // raw href: "./concept.md" or "./doc.md#slug"
  resolved?: { docId?: DocId; slug?: Slug };
};

export type EdgeRole = "ref" | "calls" | "extends" | "imports";
export type Edge = { from: string; to: string; role: EdgeRole };

export type Repo = {
  docs: BusyDocument[];
  concepts: ConceptBase[]; // includes BusyDocument entries
  localdefs: Record<string, LocalDef>;
  imports: ImportDef[];
  byId: Record<string, Section | LocalDef | ConceptBase>;
  byDoc: Record<DocId, { doc: BusyDocument; bySlug: Record<Slug, Section> }>;
  edges: Edge[];         // fully typed relations
};

export type ContextPayload = {
  operation: {
    ref: string;        // canonical "docId#slug"
    title: string;
    content: string;
    attrs: Record<string, unknown>;
  };
  defs: Array<Pick<LocalDef, "id" | "name" | "content" | "extends">>;
  calls: Array<{ ref: string; title?: string }>; // callable sub-ops
  symbols: Record<string, { docId?: DocId; slug?: Slug }>; // import symbol table used
};
```

### Indexing & Identity Rules

* **Node IDs**:

  * Doc/Concept: `id = docId` (stable, from `Name` or filename)
  * Section: `id = ${docId}#${slug}`
  * LocalDef: `id = ${docId}::${slug}`
* **Namespace**: `LocalDef` ids are namespaced by document; two defs with the same slug in different docs are distinct.

---

## 3) Parsing Pipeline

### 3.1 Front‑matter

* Use `gray-matter` to parse YAML.
* Normalize:

  * `docId = slugify(Name).replace(/-/g, "_")` or `basename(file)` if `Name` absent.
  * `types = Type ?? []` (preserve original casing but compare case-insensitively).
  * `extends = unique([...(Extends ?? []), ...inferredFromTypes])`.
* Infer `kind` from `types` (lowercased):

  * includes `document` → `kind = "document"`
  * includes `operation` → `kind = "operation"`
  * etc.; default `kind = "concept"`

### 3.2 Section Tree

* Parse with `remark-parse`.
* Extract headings with positions; build a depth-aware tree (`Section[]`).
* `content` for a section is text between its heading line **and** the line before the next sibling heading.

### 3.3 Local Definitions Extraction

* Find the **Local Definitions** section by title match (case-insensitive) or slug `local-definitions-section`.
* For every subheading beneath it (depth ≥ currentDepth+1):

  * Create a `LocalDef` with:

    * `name` from heading text, `slug` via github-slugger
    * `content` slice (from next line after heading to next heading at same or higher depth)
    * `attrs` parsed from the first fenced block of type `yaml busy` or `json busy` immediately following the heading (optional). Also parse a fallback `key: value` paragraph.
    * `extends` from `attrs.Extends` or inline patterns: lines starting with `Extends:` or `_Extends:_` (case-insensitive), values as comma/array list.
  * Index into `repo.localdefs` and `repo.byId`.
  * For each parent in `extends`, add `Edge{role:"extends", from: localdef.id, to: resolveSymbol(parent)}` (see resolution below).

### 3.4 Reference-Style Imports

* Visit `definition` nodes (reference link definitions):

  * Example: `[Role]: ./role.md` or `[RunChecklist]: ./checklist.md#runchecklist`
  * Record an `ImportDef {docId, label, target}`.
  * Resolve `target` into `{docId, slug}` using the workspace file map (relative paths) and add `Edge{role:"imports", from: docId, to: resolvedNodeId}` (optional).
* Build a **symbol table** per doc: `symbols[label] = {docId?, slug?}`.

### 3.5 Inline Links & Edge Typing

* Visit `link` nodes inside each section's content. For each:

  * If `href` is relative and points to `./x.md#y` or `#y`: resolve to `{docId, slug}` → node id `${docId}#${slug}`.
  * If it's a **reference link** `[Label]` and the doc has an `ImportDef` for that label, resolve via the symbol table.
  * Otherwise record as external (`to = href`) — optionally create pseudo-node ids for external URLs if you want a pure node graph.
* **Classify** the edge role:

  * Default: `role = "ref"`.
  * Upgrade to `role = "calls"` when:

    * The **source section** is titled `Operation`, `Operations`, `Steps`, or its parent is an `Operation` doc/section.
    * OR the immediate surrounding text includes verbs: `run|call|invoke|execute|→` (simple regex, case-insensitive).
* Create `Edge {from: section.id, to: resolvedIdOrHref, role}`.

---

## 4) Resolution Rules

### 4.1 Symbol Resolution

* `resolveRef("docId#slug")` → section node id.
* `resolveRef("#slug")` → first matching section across docs (prefer current doc, then imported docs order).
* `resolveLocalDef("docId::slug")` → localdef id.
* `resolveSymbol(nameOrLabel)` used for `extends`:

  1. If name matches a `LocalDef` within the **same doc**, prefer that (`docId::slug`).
  2. Else, if name matches a **Concept/Doc Name**, return `docId`.
  3. Else, if current doc has an import `[Label]` matching the name, resolve via import mapping.
  4. Else, leave unresolved (record a warning).

### 4.2 Canonical Refs

* **Section ref**: `docId#slug`
* **LocalDef ref**: `docId::slug`

---

## 5) Minimal Context Builder

`buildContext(repo: Repo, opRef: string, opts?: { includeChildren?: boolean; maxDefChars?: number; }) => ContextPayload`

Algorithm:

1. **Seed**: resolve `opRef` to a `Section` (error if missing). Put into `context.operation` with `ref`, `title`, `content`, `attrs` (empty for v1 unless you add section-level attrs).
2. **Worklist**: collect outgoing edges from the seed section and (optionally) from its descendant sections if `includeChildren` is true.
3. **Defs closure**:

   * For every `Edge{role:"ref"}` pointing to a **LocalDef** or a section that *is* inside **Local Definitions**, include that `LocalDef`.
   * For each included LocalDef, traverse `extends` edges transitively to include all ancestors.
   * De‑duplicate and maintain topological order (parents before children) if possible.
4. **Calls**:

   * For every `Edge{role:"calls"}` to a section, add `{ref: "docId#slug", title}` to `context.calls` (do not inline their content; the agent can request them on demand).
5. **Symbols**:

   * Include the doc's import symbol table entries actually used during resolution so the agent can resolve short labels later if needed.
6. **Trimming** (optional):

   * If `maxDefChars` is set, trim `def.content` to that many characters with an ellipsis, preserving headings and code fences.

**Output example**

```json
{
  "operation": {
    "ref": "Operation#deploy-app",
    "title": "Deploy App",
    "content": "1. Build… 2. Push… 3. Rollout…",
    "attrs": {}
  },
  "defs": [
    {
      "id": "Role::persona",
      "name": "Persona",
      "content": "Tone: concise…",
      "extends": ["Role::rolebase"]
    },
    {
      "id": "Workspace::working-dirs",
      "name": "Working Dirs",
      "content": "/work/input, /work/output, /work/tmp",
      "extends": []
    }
  ],
  "calls": [
    { "ref": "Operation#provision-infra", "title": "Provision Infra" },
    { "ref": "Operation#verify", "title": "Verify" }
  ],
  "symbols": { "Role": { "docId": "Role" }, "Workspace": { "docId": "Workspace" } }
}
```

---

## 6) Public API Surface

```ts
// Load and index a workspace
async function loadRepo(globs: string[]): Promise<Repo>;

// Lookup helpers
function get(repo: Repo, ref: string): Section | LocalDef | ConceptBase | undefined; // "Doc", "Doc#slug", "Doc::slug", or "#slug"
function parentsOf(repo: Repo, nameOrRef: string): string[];   // for concepts/defs
function childrenOf(repo: Repo, nameOrRef: string): string[];

// Build minimal agent context
function buildContext(repo: Repo, opRef: string, opts?: BuildOpts): ContextPayload;

// Serialize context (pretty JSON)
function writeContext(file: string, ctx: ContextPayload): Promise<void>;
```

### CLI (bin: `busyctx`)

* `busyctx load "./busy/**/*.md" --dump repo.json` → loads + validates.
* `busyctx context Operation#deploy-app -o ctx.json --maxDefChars 2000` → emits context payload.
* `busyctx graph --format dot > repo.dot` → optional DOT graph (nodes: concepts, sections, localdefs; edges typed).

---

## 7) Implementation Details

* **Libraries**: `zod`, `gray-matter`, `unified/remark-parse`, `unist-util-visit`, `github-slugger`, `fast-glob`.
* **Performance**: aim to parse 500 files (<10MB total) in <2s cold on M-series laptop. Cache file mtime → skip unchanged.
* **Determinism**: Stable traversal order: sort files by path; within docs, sections by source order.
* **Logging**: `debug` logger namespace `busy:*`. Warnings for unresolved imports/extends with file:line context.
* **Config**: `busy.config.json` (optional) to tweak heuristics: titles that imply `calls`, the Local Definitions heading alias list, trimming limits, etc.

---

## 8) Acceptance Criteria (Checklist)

**Parsing & Indexing**

* [ ] Front‑matter fields mapped to `ConceptBase`; `kind` inferred correctly for Document/Operation/etc.
* [ ] Section tree built with correct `depth`, `lineStart/End`, and `content` slices.
* [ ] Local Definitions under the designated section are promoted to `LocalDef` with correct `id`, `slug`, `content`.
* [ ] Inline `yaml busy`/`json busy` blocks parsed into `attrs`; `Extends` recognized.
* [ ] Reference-style imports collected and resolved to `{docId, slug}` when available.
* [ ] Inline links resolved; edges emitted with roles `ref`/`calls` per heuristics.

**Context Builder**

* [ ] Given an op ref, the output includes the op section, only reachable local defs (+ transitive parents), and a list of calls.
* [ ] Output payload ≤ configured token/char budget when trimming is enabled.
* [ ] Unresolved refs do not crash; they are reported in warnings and excluded.

**API & CLI**

* [ ] `loadRepo` returns a `Repo` consistent with types; invalid files throw Zod errors with file:line context.
* [ ] `get`, `parentsOf`, `childrenOf` work for docs, sections, and localdefs.
* [ ] CLI commands run on a sample Busy workspace and produce expected JSON artifacts.

**Tests**

* [ ] Unit tests for: front‑matter mapping, section slicing, localdef extraction, imports resolution, link classification, context closure.
* [ ] Fixture covering: nested Local Definitions, multiple inheritance, cross-doc calls, unresolved imports, external links.

---

## 9) Heuristics & Edge Cases

* **Multiple inheritance** for `LocalDef.extends` is allowed; order preserved as declared.
* **Name vs Label collisions**: Prefer same‑doc `LocalDef` > imported label > global concept by `Name`.
* **Relative links** `(#slug)` resolve against current doc; `./x.md#y` resolves via workspace path map.
* **External links**: keep as string target (optionally model as pseudo-nodes with `kind: "url"`).
* **Case-insensitive matching** for the Local Definitions heading; slug alias list configurable.
* **Markdown quirks**: Ensure code fences inside sections are preserved intact in `content` slices.

---

## 10) Deliverables

1. **Package**: `@busy/parser` (ESM + types) with exported API.
2. **CLI**: `busyctx` with commands above.
3. **Docs**: README with quickstart and examples; schema diagrams.
4. **Tests**: Jest or Vitest suite with fixtures.
5. **Examples**: Two sample context JSON payloads built from provided `operation.md` and `workspace.md`.

---

## 11) Future Extensions (non-blocking)

* Propagate **section-level attributes** via fenced blocks (e.g., `Inputs`, `Outputs`, `Preconditions`).
* Add a **prompt composer** that formats `ContextPayload` into a ready system prompt.
* Add a **watch mode** to re-build on file changes.
* Optional **semantic ranking** to include only defs most relevant to an op (BM25/miniLM).

---

### Appendix A — Link Role Classifier (v1 regex)

* If source section (or its parent) title matches `/^operations?|steps?$/i` → `calls`.
* If link text or adjacent text matches `\b(run|call|invoke|execute|do|→)\b` → `calls`.
* Else → `ref`.

### Appendix B — Config (`busy.config.json`)

```json
{
  "localDefinitionsAliases": ["Local Definitions", "Definitions", "Glossary"],
  "callHeuristicTitles": ["Operation", "Operations", "Steps"],
  "callHeuristicVerbs": ["run", "call", "invoke", "execute", "→"],
  "maxDefChars": 2000
}
```

---

**End of v1.0**
