# busy-cli

TypeScript library and CLI for parsing, validating, resolving, and running BUSY documents.

## Existing commands

```sh
busy parse document.busy.md
busy validate document.busy.md
busy resolve document.busy.md
busy graph --help
busy automation-ir --help
```

The public API exports the canonical parser, repository loader, import resolver, context builders, and validators. The runner uses these same APIs.

## Caller-executed runs

A run presents **context** and **respondWith**. The caller uses its own tools, then returns values and/or a decision. BUSY records that exchange, updates local values, and advances the instruction pointer. Conditions and checklist judgments belong to the caller.

The runner requires Node.js 22.13+ with the built-in SQLite driver. It needs no server, Docker container, separate database installation, browser, or MCP service. Other CLI commands do not initialize SQLite.

From the repository root, build the CLI and start the example:

```sh
npm run build --workspace busy-cli
node packages/busy-cli/dist/cli/index.js run start packages/busy-cli/examples/runner/review.busy.md --inputs packages/busy-cli/examples/runner/inputs.json
```

Once using the built `busy` executable, the loop is:

```sh
busy run start review.busy.md --inputs inputs.json
busy run sense RUN_ID
busy run emit RUN_ID TOKEN @reply.json
```

`start` returns the first sense. `emit` accepts a reply and returns the next sense. `sense` rereads the current exchange without advancing or changing its token. Each invocation can be a separate process. Replies can be inline JSON, `@file.json`, or `-` for stdin. Input files also accept `-` for stdin.

Normal stdout is JSON with `runId`, `status`, `token`, `pointer`, and `packet`. The packet contains only `context` and `respondWith`. Completion returns `runId`, `status: "completed"`, and the caller-returned `result`. Errors go to stderr with a nonzero exit code. Malformed or stale replies do not advance the run.

### Follow the current instruction

Start or resume the run before performing new work that it is meant to guide. Read the current packet, carry out its instruction using the caller's own tools and judgment, then emit the requested values or decision. Return only fields allowed by `respondWith`. If required work or a child result is pending, leave the run at that exchange; do not advance it with a promise to fill in the evidence later.

An existing result may already satisfy an instruction. Review its relevance to the current inputs, revision and permissions, and identify it as reused prior evidence in the allowed reply or linked artifact. Retain its original actor, time, source revision and result, and say what was checked during this exchange. Do not repeat sound work solely to create a new receipt. A later exchange can record review or reuse of that evidence; it cannot establish that the earlier work was directed by this run.

Follow the source's order when invoking or dispatching another operation. Complete required preparation before dispatch, and keep the parent at the waiting exchange until the required child results are available. Separate callers can run their own CLI sessions and return their run IDs, reports and receipts to the parent; the CLI does not launch them automatically.

Preserve the actual replies, tool results and evidence limits. A `completed` receipt means the exchanges finished, not that every returned claim is verified or that an external release occurred. If an observation or the next instruction conflicts with the caller's history, inspect the run and resolve the mismatch before advancing; cancel or restart when appropriate.

### Inspect, cancel, or restart

```sh
busy run inspect RUN_ID
busy run history RUN_ID
busy run receipt RUN_ID
busy run cancel RUN_ID "The next context does not fit my observations"
busy run restart RUN_ID
busy run restart RUN_ID --file review.busy.md --inputs revised-inputs.json
busy run list
```

`inspect` includes the call stack, local values, source snapshots, prepared interpretation, and history. The receipt records each presented instruction and accepted reply. It does not independently verify external execution or semantic compliance. Completing a run means the declared exchanges finished, even if the caller reports failed checklist items.

A plain restart uses the original pinned program and starting inputs. `--file` loads an edited program; `--inputs` replaces starting values. Restart creates a new run and retains the old source and history. An active old run is cancelled only after the replacement is ready. Failed preparation leaves it intact.

SQLite state defaults to `.busy/runs.sqlite` in the current directory. Use the same directory across invocations, set `BUSY_RUNNER_DB`, or pass `busy run --db /path/to/runs.sqlite ...`. Each accepted reply and resulting transition are committed together. The sense token prevents two callers from advancing the same exchange twice; it does not make external tool work exactly-once.

### Prepared interpretation

You can author a `review.runner.json` beside `review.busy.md`, pass `--interpretation path.json`, or generate it with `busy run compile`. See [the hand-authored example](examples/runner/review.runner.json). Loading hand-authored IR makes no model calls.

The interpretation declares an entry operation and, for each operation, input/output bindings and steps. Each step identifies its source section or numbered item, context bindings, response schema, and next step or decision routes. A route may call another operation and name the step to resume afterward. Pointing back to an earlier step creates a caller-controlled loop; there is no automatic semantic evaluator or iteration cap.

Definitions use local names or import aliases. Tools use aliases resolving to BUSY Tool documents. An operation can set `ref` to an imported operation alias or canonical operation ID. Imports are discovered recursively from BUSY source, not listed in the IR. The loader pins each local dependency, checks anchors, rejects missing or dynamic/remote imports, and rejects ambiguous document IDs. Vendor remote dependencies locally first. Setup and Checklists are ordinary source-backed steps.

Local inline links to `.busy.md` files are also pinned, including BUSY context linked only from Setup. Remote prose citations remain exact source context for caller review; they are not declared imports. An alias to a Tool action anchor supplies the complete owning Tool contract, including Setup and provider binding. It remains an action for the caller's tool belt.

For a corpus, retain canonical document IR for every source and a separate prepared interpretation for each defining runnable entry. Files containing only models, packages, or Tool contracts remain context documents. A template may have genuine review operations alongside its fenced template content. For multiple entries, use explicit `--interpretation path/to/operation.runner.json`; the adjacent `.runner.json` default supports one chosen entry. Inherited model fields and rules remain resolved source context; the runner does not expand them into executable steps.

The response schema supports objects (with explicit properties, required fields, and no extra properties), arrays, strings with optional enums, booleans, finite numbers, and null. Unsupported schema keywords fail preparation. The schema describes the caller reply, not its tool belt.

Program identities include source/dependency contents, interpretation, source location, and the lowered steps. Saved runs use their stored snapshots even after source files change or disappear. The author must keep the prepared interpretation consistent with edited prose; the runner checks structure, not meaning.

MCP transport and inherited-operation execution are deferred. Reference a parent operation explicitly instead of interpreting an inherited override. No ECG is involved; caller session history supplies continuity.

### Generate and cache IR

The CLI executable and the source repository's BUSY library pin are separate dependencies. CLI 0.6.1 has no `run` command. Use an explicitly selected runner-capable build and verify `busy run --help`; the package version alone does not identify an unpublished or locally modified build. Record the CLI commit/build identity separately from the source revision and library pins. Changing the executable does not fix invalid core Markdown or authorize changing a consumer's gitlinks.

```sh
# OPENROUTER_API_KEY may be used instead of --key-file.
busy run compile operation.busy.md --entry performOperation --key-file /path/to/key.txt
busy run start operation.busy.md --entry performOperation --inputs inputs.json
# Optional: export the accepted interpretation for inspection or offline use.
busy run compile operation.busy.md --entry performOperation --out operation.runner.json
```

Compilation uses OpenRouter `openai/gpt-6-luna` by default (`--model` overrides it). It makes one constrained draft request and, if structural checks fail, at most one repair request. HTTP failures are not retried; each request times out after 60 seconds and is capped at 12,000 output tokens and 300 KB of request data. These are paid calls that send the resolved source context to OpenRouter. A cache hit needs no key and makes no calls. Generation requires an explicit `--entry`; the existing prepared-IR start remains available.

For secure file-based authentication, keep the key outside the repository in a private file readable only by its owner, for example `~/.config/busy/openrouter-key.txt` with mode `0600`, and pass `--key-file` to `compile` or generated `start`. Do not put the key itself in command arguments, checked-in configuration, replies or logs. `OPENROUTER_API_KEY` is also supported. Source validation happens before provider generation, so a source-stage failure has not tested authentication; a provider-stage missing-key failure needs one of these supported credential routes. No default secret-file path is loaded automatically.

Code constructs the catalog through BUSY's parser, resolver and context APIs. It owns source spans, scoped definition/tool identities and response-schema lowering. The model chooses binding names, relevant context and routes. Checks cover source validity, instruction coverage, route/schema shape and binding availability on every path. They do not establish semantic fidelity or truth. Scalar returns and string arrays keep the draft small; richer artifacts can be returned as text. The runtime still asks only for `context` and `respondWith`.

Artifacts are stored in `.busy/compiled/` (`--cache-dir` changes it). The key covers the entry, complete transitive source contents, model, prompt, schema and compiler version. `--refresh` regenerates explicitly. Accepted programs and failed attempts retain exact source snapshots, drafts, diagnostics and usage, without the credential. Treat these files as private source material. The accepted artifact is re-lowered against the current source before cache reuse. `compile` reports the required input names so the caller can prepare its starting values.

See [the real fixtures](examples/runner/real/README.md) for the validate/fix loop, Local Definitions and Tool contracts. The frozen source copies record their Markdown corrections and original hashes. Shared core definition headings were corrected separately while preserving anchors and body prose. Tool contracts are supplied as context for the caller's tool belt. They are not converted into automatic runtime invocations.

### Future recovery review

An unexpected observation may indicate bad execution, missing data, or an interpretation that misunderstood the source. `inspect` already retains the pinned source, IR, current bindings, stack and session history; generated programs also point to their compiler evidence. Compiler failures identify source, provider, interpretation or source-clarification stages. Rejected replies leave the run at the same exchange, where the caller can inspect or cancel.

A future recovery reviewer can compare those three inputs and recommend an IR repair, more evidence, or a source clarification. It must stop before editing the BUSY source and give the agent/author a concrete clarification proposal. No recovery agent or automatic source repair is implemented here. Reported validation failures remain ordinary returned data and caller decisions; cancellation is a separate CLI command, not a normal return with missing outputs.

## Library API

```ts
import { compileRun, BusyRunner } from "busy-cli";

const program = await compileRun("review.busy.md");
const runner = await BusyRunner.open(".busy/runs.sqlite");
try {
  const sense = runner.start(program, startingValues);
  // The caller processes sense.packet and produces a reply.
  const next = runner.emit(sense.runId, sense.token!, callerReply);
} finally {
  runner.close();
}
```

`loadResolvedRepo(file)` uses the existing import resolver to return a repository index and its parsed source snapshots. `buildRepo(sources)` indexes already-parsed sources. The runner uses `buildContext` and `getConceptContext` for operations, import symbols, definitions, and tool contracts. SQLite is loaded only when opening a runner, so a later MCP adapter can call the same runtime without a separate parser or HTTP layer.

## Development

```sh
npm run build --workspace busy-cli
rtk npm test --workspace busy-cli -- --run
```

The CLI tests build and invoke the real executable in separate processes. Runner tests cover nested calls, caller-controlled loops, imported context, source pinning, stale replies, transactional rollback, cancellation, and restart.
