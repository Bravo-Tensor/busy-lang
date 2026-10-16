These are frozen real BUSY sources plus one explicitly synthetic Tool caller harness. The sources come from `busy/base/busy-assistant.busy.md`, `busy/base/workspace-agent.busy.md`, the shared core definitions, and the real File/Logging Tool contracts.

At capture time, the originals contained shared-core self-linked definition headings and an uppercase operation name rejected by the CLI. The Busy Assistant also had an unresolved ValidateDocument shortcut and a six-dash opening delimiter tolerated by its metadata parser. These frozen fixture copies correct those issues. The necessary canonical core headings were subsequently corrected in commit `bfa90e0`, preserving anchors and prose. The Tool contracts use the current core Tool action heading schema; provider mappings, path restrictions, examples, tables and fenced code remain intact. [provenance.json](provenance.json) records original SHA-256 hashes and every fixture correction. Compilation rejects invalid sources rather than quietly normalizing them.

Run from this folder after building `busy-cli` (or use an installed `busy` executable):

```sh
busy run compile busy/base/busy-assistant.busy.md --entry createDocument
busy run compile busy/base/workspace-agent.busy.md --entry assumeWorkspaceRole
busy run compile tool-roundtrip.busy.md --entry roundTrip
```

Set `OPENROUTER_API_KEY` or pass `--key-file`. The command reports the required initial bindings. Use `busy run start FILE --entry OPERATION --inputs inputs.json` to load the cached program and receive its first exchange. Repeating compilation reuses the cache until the source, model or compiler contract changes.

The committed `.draft.json` files are accepted live Luna drafts; `.runner.json` files are their lowered interpretations. They support offline regression tests. Load an explicit interpretation with `--interpretation loop.runner.json`, `locals.runner.json`, or `tools.runner.json` for the corresponding source. The three cases exercise:

- `createDocument`: caller-reported validation failures, repair, and return to the original validator with the revised document.
- `assumeWorkspaceRole`: real Persona, Traits, Principles and Skillset definitions in Setup and later context.
- `roundTrip`: a synthetic workflow using the complete real File Tool and Logging Tool contracts. Tool actions remain work for the caller; the runner does not read, write, or log through those providers.

The tests simulate caller replies. Static compilation and a completed exchange receipt do not prove that actual external work happened or that every semantic choice is correct. The caller may inspect or cancel whenever the next context does not fit its observations.
