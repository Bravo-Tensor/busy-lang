---
Name: Document Optimizer
Type: [Playbook]
Description: Iteratively improves a BUSY [Document] via auto-generated examples, structured traces, scoring, and small targeted patches until convergence.
---

[Playbook]:../core/playbook.md
[Document]:../core/document.md
[Operation]:../core/operation.md
[Checklist]:../core/checklist.md
[WorkspaceContext]:../core/workspace-context.md
[Trace]:../core/trace.md
[Trace Directory]:../core/workspace-context.md#trace-directory
[Run Directory]:../core/trace.md#run-directory
[EvaluateDocument]:../core/document.md#evaluatedocument
[ExecuteOperation]:../core/operation.md#executeoperation
[TraceEntry]:../core/trace.md#traceentry

# Setup
This [Playbook] orchestrates a self-improvement loop for a target [Document]. Each iteration:
1) generates examples, 2) runs and records structured traces, 3) computes a score, 4) proposes minimal diffs to the target or its ancestors, 5) simulates candidates on a holdout, and 6) applies the best patch if it improves the score.

Default controls (may be overridden via inputs to `OptimizeDocument`):
- `max_iterations`: 5
- `stop_delta`: 0.01 (minimum improvement to continue)
- `autonomy`: `assisted` (see [WorkspaceContext] Autonomy Level)
- `trace_file`: `optimizer.ndjson` (under [Trace] [Trace Directory])
- `verbosity`: `verbose` (forces detailed, instruction-level traces for all trials)
    - On start, temporarily set Workspace `Log Level` to `verbose` for the duration of the run.
    - Record every artifact into a per-run [Run Directory].

# Operations

## OptimizeDocument
- **Input:**
    - `target_doc` (string): Path to the [Document] to optimize.
    - `objective` (string|object): Natural-language goal and/or checklist-style expectations.
    - `max_iterations` (number, optional): Iteration budget.
    - `stop_delta` (number, optional): Minimum score improvement to keep iterating.
    - `autonomy` (string, optional): `manual` | `assisted` | `autonomous`.
    - `ancestor_scope` (string, optional): `self_only` | `nearest_ancestor` | `hierarchy`.
- **Steps:**
    1. Log entry: `timestamp | Document Optimizer -> OptimizeDocument | begin target={{target_doc}}`.
    2. [EvaluateDocument] for `target_doc` to load its Setup and identify its Operations.
    3. Initialize `run_id` and defaults for `max_iterations`, `stop_delta`, `autonomy`, `ancestor_scope`, `verbosity`.
    4. Call [Trace#CreateRunDirectory](../core/trace.md#createrundirectory) with `run_id`; write `run.json` manifest (target, objective, settings).
    5. Temporarily set Workspace `Log Level` to `verbose` for this run; on completion, restore prior level.
    6. For `iteration` in `1..max_iterations`:
        - Call [_GenerateExamples] with `target_doc` and `objective` → `examples` (plus `holdout`). Save to `runs/<run_id>/examples/` and `holdout/`.
        - Call [_RunExamples] with `examples` → structured traces (append to [Trace] `optimizer.ndjson`) and per-example instruction traces under `runs/<run_id>/trial-traces/` and `trial-instructions/`.
        - Call [_VerifyOrderOfOperations] over all example traces to ensure strict order adherence; record any mismatches as errors and artifacts under the run directory.
        - Call [_ScoreRun] with the collected traces and `objective` → `score` and breakdown. Write `iterations/iteration-<n>/manifest.json`.
        - If `iteration == 1`, set `best_score = score`.
        - Call [_ProposePatches] with `target_doc`, `ancestor_scope`, traces, and `objective` → `candidates` (diffs + rationale). Save candidates to `runs/<run_id>/candidates/iteration-<n>/`.
        - Call [_SimulateAndSelect] with `candidates` and `holdout` → `chosen_candidate` and `chosen_score`. Save simulation traces under `runs/<run_id>/iterations/iteration-<n>/`.
        - If `chosen_score <= best_score + stop_delta`: break (converged).
        - Call [_ApplyOrStage] with `chosen_candidate` and `autonomy` → apply or stage patch; write patch and rollback to `runs/<run_id>/patches/`.
        - Update `best_score = chosen_score`.
    7. Call [Trace#SummarizeRun](../core/trace.md#summarizerun) for `run_id`; write `summary.json` into the run directory.
    8. Return a concise report with final score, iterations executed, links to the [Run Directory], and any applied patches.

### Checklist
- Confirm `.trace/optimizer.ndjson` contains entries for each example executed.
- Confirm final report shows a non-decreasing best score across iterations.
- Confirm each applied patch includes a rationale citing trace evidence.
- Confirm [Run Directory] `.trace/runs/<run_id>/` exists with examples, trial traces, candidates, patches, iterations, and logs populated.
- Confirm Workspace `Log Level` was set to `verbose` during the run and restored afterward.

## _GenerateExamples
- **Input:** `target_doc`, `objective`, `run_id`.
- **Steps:**
    1. Parse `target_doc` [Operations] via [Document#ListOperations](../core/document.md#listoperations).
    2. For each operation, synthesize 3–5 examples covering base, edge, and negative cases consistent with the `objective`.
    3. Reserve 1–2 holdout examples per operation not used for patch selection.
    4. Persist generated `examples` to `runs/<run_id>/examples/` and `examples.json`; write `holdout/` and `holdout.json`.
    5. Return `examples` and a small `holdout` set.

## _RunExamples
- **Input:** `examples`, `run_id`, `iteration`, `target_doc`, `trace_file`.
- **Steps:**
    1. For each example:
        - Execute the referenced [Operation] following [ExecuteOperation](../core/operation.md#executeoperation) strictly.
        - For each instruction/step executed, record an instruction-level trace:
            - Append `{ index, expected, observed, status, notes }` using [Trace#RecordStepTrace](../core/trace.md#recordsteptrace) to `trial-traces/example-<id>.ndjson`.
            - Write a human-readable `trial-instructions/example-<id>.md` capturing every instruction with timing and outcomes.
        - Capture run-level results, errors, and metrics; compose a [TraceEntry] and call [Trace#RecordTraceEntry](../core/trace.md#recordtraceentry) into `trace_file`.
        - Persist any intermediate artifacts (e.g., resolved imports, evaluated setup state) under `runs/<run_id>/logs/` via [Trace#RecordArtifact](../core/trace.md#recordartifact).
    2. Echo brief summaries to `trace.log` for readability.

### Checklist
- For every example, a `trial-traces/example-<id>.ndjson` file exists with instruction-level entries.
- For every example, a `trial-instructions/example-<id>.md` file exists with human-readable steps and timings.
- A corresponding [TraceEntry] exists in `optimizer.ndjson`.

## _ScoreRun
- **Input:** Traces for `run_id` and `iteration`, plus `objective`.
- **Steps:**
    1. Compute a scalar score per example (e.g., checklist pass rate) and aggregate to an iteration score.
    2. Incorporate order-of-operations verification results as critical failures.
    3. Break down failures by ErrorTaxonomy for attribution.
    4. Persist `iterations/iteration-<n>/manifest.json` with scores and failure breakdown.
    5. Return `score` and a concise breakdown for reporting.

## _VerifyOrderOfOperations
- **Input:** `run_id`, `iteration`, `target_doc`.
- **Steps:**
    1. For each example's instruction trace, reconstruct expected order based on [EvaluateDocument] (frontmatter → imports → setup → operations) and the target operation's own defined steps via [ExecuteOperation].
    2. Compare observed order to expected; allow no reordering unless explicitly permitted by the spec.
    3. Record any mismatches as `checklist_failure` with details under `trial-traces/` and an explanatory markdown under `trial-instructions/`.
    4. Return a summary with counts of order matches/mismatches for inclusion in scoring.

### Checklist
- Each example has a computed expected sequence derived from [EvaluateDocument] and [ExecuteOperation].
- Any mismatch is recorded as `checklist_failure` with explicit indices and step names.

## _ProposePatches
- **Input:** `target_doc`, `ancestor_scope`, traces, `objective`.
- **Steps:**
    1. Attribute failures to likely edit sites using step text, operation names, and error patterns.
    2. Synthesize minimal diffs with clear rationales. Patch types: clarify step wording, reorder steps, add defaults in Setup, refine Checklists.
    3. Respect `ancestor_scope`:
        - `self_only`: only `target_doc` allowed.
        - `nearest_ancestor`: allow directly imported documents affecting failing ops.
        - `hierarchy`: walk import chain; cap breadth to 1–2 layers.
    4. Save each candidate diff, rationale, and affected files list to `runs/<run_id>/candidates/iteration-<n>/`.
    5. Return a small set of patch candidates.

## _SimulateAndSelect
- **Input:** `candidates`, `holdout`, `run_id`, `iteration`.
- **Steps:**
    1. For each candidate, simulate the patch in-memory (without writing to disk) and run the `holdout` subset.
    2. Score each candidate on the holdout; select the highest-scoring patch (tie-break on fewer regressions).
    3. Persist simulation traces and scores to `runs/<run_id>/iterations/iteration-<n>/`.
    4. Return `chosen_candidate` and its `chosen_score`.

## _ApplyOrStage
- **Input:** `chosen_candidate`, `autonomy`.
- **Steps:**
    1. If `autonomy == manual`: stage the diff for approval without applying; include rationale and affected files; save to `runs/<run_id>/patches/`.
    2. If `autonomy == assisted`: auto-apply local `target_doc` patches; stage ancestor edits for approval; write both applied and staged artifacts.
    3. If `autonomy == autonomous`: apply patch and prepare a rollback patch if the next iteration regresses; write both to `runs/<run_id>/patches/`.

## _ConvergenceCheck
- **Input:** `best_score`, `chosen_score`, `stop_delta`, `iteration`, `max_iterations`.
- **Steps:**
    1. If `iteration >= max_iterations`: stop.
    2. If `chosen_score <= best_score + stop_delta`: stop (no meaningful improvement).
    3. Otherwise continue.

### Checklist
- Ensure stop criteria triggered only when score improvement is below `stop_delta` or the iteration budget is exhausted.
- Ensure any staged or applied patches include minimal diffs and rationale.
