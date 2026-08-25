# BUSY Semantic IR

`busy automation-ir <workspace>` compiles BUSY Markdown into
`busy.semantic-ir/v1`, the canonical automation boundary for runtimes and
external reasoning systems.

The semantic IR preserves:

- every BUSY document kind and raw frontmatter attributes;
- source hashes and line spans;
- resolved document and resource imports;
- operations with singular or plural typed input/output headings;
- flat numbered steps and nested `Step N` playbook structures;
- conditions, role contexts, triggers, emits, and checklist evidence items;
- model fields and lifecycle/rule/relationship/persistence sections; and
- compilation diagnostics, including unresolved imports and circular import
  components.

Use `--strict` when the result will drive execution. Strict compilation fails
on error diagnostics rather than allowing an agent to execute an incomplete
policy model. Warnings remain inspectable in the exported IR.

The older dependency graph can be attached temporarily with `--include-graph`.
Semantic consumers should use the canonical document/import/operation data and
must not reconstruct behavior from the legacy graph.

```bash
busy automation-ir ./workspace --strict -o workspace.busy-ir.json
```
