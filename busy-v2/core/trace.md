---
Name: Trace
Type: [Document]
Description: Defines a structured, append-only trace format (NDJSON) and taxonomy used by BUSY documents and playbooks to log example runs, scores, and optimizer iterations.
---

[Document]:./document.md
[Operation]:./operation.md
[WorkspaceContext]:./workspace-context.md
[Trace Directory]:./workspace-context.md#trace-directory

# Setup
All traces are written under the current workspace's [Trace Directory]. Use human-readable logs for narrative (`trace.log`) and NDJSON for programmatic analysis (`optimizer.ndjson`, `runs.ndjson`). Append-only; do not delete or rewrite past entries mid-run.

# Local Definitions

## TraceEntry
An NDJSON object (one JSON per line) capturing a single example/run observation.

- `run_id` (string): Correlates entries belonging to the same overall run.
- `iteration` (number): Optimizer iteration or `0` for a one-off run.
- `example_id` (string): Identifier for the example input/output pair.
- `doc` (string): Path to the [Document] under test.
- `operation` (string): The invoked operation name, if applicable.
- `input` (object|string): Inputs provided to the run.
- `steps` (array): Each `{ step, expected, observed, status, notes }`.
- `errors` (array): Normalized error objects (see ErrorTaxonomy).
- `metrics` (object): `{ duration_ms, passes, fails, retries }`.
- `score` (number): Scalar fitness for the entry (0..1 recommended).
- `attribution` (object): `{ file, section, rationale }` pointing to likely edit sites.
- `timestamp` (string): ISO-8601 timestamp of the entry.

## ErrorTaxonomy
Normalized error categories for consistent analysis.

- `missing_input`: Required input not found or ambiguous.
- `invalid_input`: Input present but fails validation.
- `execution_error`: Unexpected failure during step execution.
- `checklist_failure`: One or more checklist items failed.
- `tool_failure`: External tool invocation failed.
- `timeout`: Operation exceeded expected duration.

## Files
Default files relative to the [Trace Directory]:

- `trace.log`: Human-readable narrative entries using `timestamp | Document -> Operation | summary`.
- `optimizer.ndjson`: Programmatic entries for optimizer iterations and example scoring.
- `runs.ndjson`: Programmatic entries for ad-hoc or non-optimizer example runs.

## Run Directory
A per-run folder under the [Trace Directory] for storing all artifacts with maximal transparency.

- Root: `.trace/runs/<run_id>/`
- Subfolders:
  - `examples/` — Generated examples and `examples.json` manifest.
  - `holdout/` — Holdout examples and `holdout.json`.
  - `trial-traces/` — NDJSON instruction-level traces per example (`example-<id>.ndjson`).
  - `trial-instructions/` — Human-readable step-by-step logs per example (`example-<id>.md`).
  - `candidates/` — Proposed patches, rationales, and sims per iteration.
  - `patches/` — Applied patches and rollback diffs.
  - `iterations/` — `iteration-<n>/manifest.json`, scores, and summaries.
  - `logs/` — Verbose internal processing logs.
- Top-level files:
  - `run.json` — Run manifest: target document, objective, autonomy, ancestor scope, start timestamp, versions.
  - `summary.json` — Final scores and outcome.

# Operations

## RecordTraceEntry
- **Input:** Target file name (e.g., `optimizer.ndjson`), a `TraceEntry` object.
- **Steps:**
    1. Ensure [Trace Directory] exists; create if missing.
    2. Serialize the `TraceEntry` to a single-line JSON string.
    3. Append the line to the target NDJSON file under [Trace Directory].
    4. Optionally add a brief summary line to `trace.log` for human readability.

## SummarizeRun
- **Input:** `run_id` and target NDJSON file (e.g., `optimizer.ndjson`).
- **Steps:**
    1. Collect all entries sharing the `run_id`.
    2. Compute aggregate metrics: mean score, pass/fail totals, error breakdown.
    3. Present a succinct summary for the user and write a summary line to `trace.log`.

## CreateRunDirectory
- **Input:** `run_id`, optional layout overrides.
- **Steps:**
    1. Ensure `.trace/runs/<run_id>/` exists with the subfolders listed in [Run Directory].
    2. Write `run.json` manifest capturing configuration, objective, and environment details.
    3. Write an initial `iterations/iteration-1/manifest.json` placeholder.

## RecordArtifact
- **Input:** `run_id`, `relative_path` (under the run directory), `content` (string or JSON), optional `binary` flag.
- **Steps:**
    1. Resolve absolute path under `.trace/runs/<run_id>/`.
    2. Create parent folders if missing; write `content` to the file.
    3. If JSON, ensure single-line NDJSON where appropriate; otherwise pretty-print if `.json`.

## RecordStepTrace
- **Input:** `run_id`, `example_id`, a step record `{ index, expected, observed, status, notes }`.
- **Steps:**
    1. Serialize the step record as one JSON line.
    2. Append to `trial-traces/example-<example_id>.ndjson` under the run directory.
