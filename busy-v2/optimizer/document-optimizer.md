---
Name: Document Optimizer
Type: [Playbook]
Description: Iteratively improves a BUSY [Document] via auto-generated examples, structured traces, scoring, and small targeted patches until convergence.
---
# [Imports](../core/document.md#imports-section)

[Playbook]:../core/playbook.md
[Document]:../core/document.md
[Operation]:../core/operation.md
[Checklist]:../core/checklist.md
[WorkspaceContext]:../core/workspace-context.md
[Trace]:../core/trace.md
[Trace Directory]:../core/workspace-context.md#trace-directory
[Run Directory]:../core/trace.md#run-directory
[ChecklistVerification]:../core/trace.md#checklistverification
[RecordChecklistVerification]:../core/trace.md#recordchecklistverification

# [Local Definitions](../core/document.md#local-definitions-section)

## ExampleSpec
Represents a generated example used to exercise a document operation.
- `operation` (string): Target operation name (e.g., `ExecutePlaybook`).
- `id` (string): Stable identifier for the example.
- `description` (string): Human-readable intent for the scenario.
- `inputs` (object, optional): Named inputs and their synthesized values.
- `preconditions` (array, optional): Preconditions to establish state before execution.
- `expected_order` (array): Normative step order extracted from the spec.
- `expected_statuses` (array): Expected status per step (`passed|failed|skipped`).
- `expected_errors` (array, optional): Expected error taxonomy entries with locations.
- `invariants` (array, optional): Must-hold conditions (e.g., “do not write outside .trace”).
- `checklist_items` (array, optional): Checklist items that this example is intended to verify.
[EvaluateDocument]:../core/document.md#evaluatedocument
[ExecuteOperation]:../core/operation.md#executeoperation
[TraceEntry]:../core/trace.md#traceentry

# [Setup](../core/document.md#setup-section)
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
 - `scoring.weights`: `{ status_match: 0.6, unexpected_error_rate: 0.3, checklist_pass_rate: 0.1 }` (used in [_ScoreRun]).
- `strict_mode`: `false` by default. When `true`:
    - Missing `### [Checklist](../core/checklist.md#checklist)` for an invoked operation counts as `checklist_pass_rate = 0` (not neutral).
    - Each checklist item must have explicit evidence + rationale (via [RecordChecklistVerification]); missing evidence marks the item `failed`.
     - Verify reference-style imports defined after frontmatter: file must exist and anchors (if present) must resolve; unresolved imports add `execution_error` and raise `unexpected_error_rate`.
     - Treat absent or empty instruction traces as order failures.

# [Operations](../core/document.md#operations-section)

## [OptimizeDocument][Operation]
- **Input:**
    - `target_doc` (string): Path to the [Document] to optimize.
    - `objective` (string|object): Natural-language goal and/or checklist-style expectations.
    - `max_iterations` (number, optional): Iteration budget.
    - `stop_delta` (number, optional): Minimum score improvement to keep iterating.
    - `autonomy` (string, optional): `manual` | `assisted` | `autonomous`.
    - `ancestor_scope` (string, optional): `self_only` | `nearest_ancestor` | `hierarchy`.
- **Steps:**
    1. Log entry: `timestamp | Document Optimizer -> OptimizeDocument | begin target={{target_doc}}`.
    2. [EvaluateDocument] for `target_doc` to load its [Setup](../core/document.md#setup-section) and identify its [Operations](../core/document.md#operations-section).
    3. Resolve `doc_type` from the frontmatter `Type` (e.g., `[Document]`, `[Operation]`, `[Playbook]`, `[Tool]`, `[Prompt]`, `[Role]`, `[Test]`, `[WorkspaceContext]`, `[Trace]`).
    4. Initialize `run_id` and defaults for `max_iterations`, `stop_delta`, `autonomy`, `ancestor_scope`, `verbosity`.
    4. Call [Trace#CreateRunDirectory](../core/trace.md#createrundirectory) with `run_id`; write `run.json` manifest (target, objective, settings).
    5. Temporarily set Workspace `Log Level` to `verbose` for this run; on completion, restore prior level.
    7. For `iteration` in `1..max_iterations`:
        - Call [_GenerateExamples] with `target_doc`, `doc_type`, and `objective` → `examples` (plus `holdout`). Save to `runs/<run_id>/examples/` and `holdout/` with a generator manifest describing type-specific cases.
        - Call [_RunExamples] with `examples` → structured traces (append to [Trace] `optimizer.ndjson` after scoring) and per-example instruction traces under `runs/<run_id>/trial-traces/` and `trial-instructions/`.
        - Call [_VerifyChecklist] to enumerate and verify `### [Checklist](../core/checklist.md#checklist)` items corresponding to the invoked operation in `target_doc`; for each item, record a [ChecklistVerification] under `runs/<run_id>/checklists/` and attach a summary to the human-readable trial log.
        - If `strict_mode` is enabled, call [_PreflightStrictChecks] to validate imports/anchors and instruction-trace presence, recording violations under `runs/<run_id>/logs/` and annotating example errors.
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

### [Checklist](../core/checklist.md#checklist)
- Confirm `.trace/optimizer.ndjson` contains entries for each example executed.
- Confirm final report shows a non-decreasing best score across iterations.
- Confirm each applied patch includes a rationale citing trace evidence.
- Confirm [Run Directory] `.trace/runs/<run_id>/` exists with examples, trial traces, candidates, patches, iterations, and logs populated.
- Confirm Workspace `Log Level` was set to `verbose` during the run and restored afterward.

## [_GenerateExamples][Operation]
- **Input:** `target_doc`, `doc_type` (optional), `objective`, `run_id`.
- **Steps:**
    1. Parse frontmatter to extract `Name`, `Type`, and `Description`; if `doc_type` is not provided, derive it from `Type`. If unknown, treat as a generic `[Document]` for generation purposes.
    2. Analyze structure:
        - Collect [Operations] via [Document#ListOperations](../core/document.md#listoperations).
        - For each operation heading, extract normative steps by reading ordered lists under the operation (e.g., “When … it should: 1., 2., 3.”).
        - Detect `Input:` blocks either under the operation body or via a `## Input` local definition pattern; capture input names and hints.
        - Detect `### [Checklist](../core/checklist.md#checklist)` items and record their text for verification.
        - Mine `# [Setup](../core/document.md#setup-section)` and “[Local Definitions](../core/document.md#local-definitions-section)” for defaults (e.g., `Trace Directory`, paths, autonomy) to seed inputs.
    3. Synthesize inputs (heuristics):
        - Paths: prefer workspace‑relative paths; if hints include “Trace Directory”, set to `.trace`.
        - Enumerations: choose nominal and edge values (first/last); include an invalid value for negative cases.
        - Free‑text: derive minimal and longer variants from `Description` keywords.
        - Missing inputs: generate cases where one required input is omitted to trigger a clear [error].
    4. Generate examples per operation ensuring coverage:
        - Happy path: all inputs present; `expected_statuses` all `passed`; `expected_order` equals normative order.
        - Missing input: omit one required input; `expected_errors` include `missing_input` at the earliest step that requires it; subsequent steps `skipped`.
        - Policy/guard rails: craft a case that would violate a constraint (e.g., out‑of‑order attempt), expecting the spec to enforce correct behavior. Treat the violation as `negative` with `expected_statuses` reflecting the enforcement.
        - Checklist coverage: ensure each checklist item appears in at least one example’s `checklist_items` with planned evidence sources (e.g., files written, logs appended, outputs returned).
        - Type‑aware priors (when recognizable):
            • `[Document]`: include `EvaluateDocument` (well‑formed, unresolved import per policy) and `ListOperations` (some ops, none).
            • `[Operation]`: include `ExecuteOperation` (missing inputs, nested op reference) and `RunChecklist` enforcement.
            • `[Playbook]`: include `ExecutePlaybook` (condition false skip, role context, private op) and `ListPlaybookSteps`.
            • `[Tool]`: include `InvokeTool` (missing inputs, simulate vs. run) and `DescribeCapability`.
            • `[Prompt]`: include `ExecutePrompt` orchestration cases.
            • `[Role]`: include `ExecuteRole` with and without incoming task.
            • `[Test]`: include `RunTestSuite` sandbox behavior and `RunTest` teardown.
            • `[WorkspaceContext]`: include `InitializeWorkspace` and `SetOperatingMode`.
            • `[Trace]`: include `RecordTraceEntry` and `SummarizeRun` round‑trip.
        - Unknown/custom types: fall back to generic coverage over discovered operations and their steps using the heuristics above.
    5. Reserve holdout examples that exercise different branches than the selection set (e.g., a different missing input, a different checklist item focus).
    6. Persist artifacts:
        - Write `examples/examples.json` (array of ExampleSpec) and `holdout/holdout.json`.
        - Write `examples/generation.json` capturing `doc_type`, discovered operations, extracted inputs, checklists, and coverage matrix (steps × examples, checklist × examples).
    7. Return the `examples` and `holdout` sets.

## [_RunExamples][Operation]
- **Input:** `examples`, `run_id`, `iteration`, `target_doc`, `trace_file`.
- **Steps:**
    1. For each example:
        - Execute the referenced [Operation] following [ExecuteOperation](../core/operation.md#executeoperation) strictly.
        - For each instruction/step executed, record an instruction-level trace:
            - Append `{ index, expected, observed, status, notes }` using [Trace#RecordStepTrace](../core/trace.md#recordsteptrace) to `trial-traces/example-<id>.ndjson`.
            - Write a human-readable `trial-instructions/example-<id>.md` capturing every instruction with timing and outcomes.
        - If the target operation defines a `### [Checklist](../core/checklist.md#checklist)`, enumerate each item in order and for each:
            - Produce evidence and a short rationale derived from observed steps or artifacts.
            - Append a [ChecklistVerification] line using [RecordChecklistVerification] to `checklists/example-<id>.jsonl` and mirror a summary into the human-readable log.
        - Capture run-level results, errors, and metrics; defer emitting the final [TraceEntry] until scoring so it can include `order_ok`, `score_components`, `checklist_verifications`, and computed `score`.
        - Persist any intermediate artifacts (e.g., resolved imports, evaluated setup state) under `runs/<run_id>/logs/` via [Trace#RecordArtifact](../core/trace.md#recordartifact).
    2. Echo brief summaries to `trace.log` for readability.

### [Checklist](../core/checklist.md#checklist)
- For every example, a `trial-traces/example-<id>.ndjson` file exists with instruction-level entries.
- For every example, a `trial-instructions/example-<id>.md` file exists with human-readable steps and timings.
- A corresponding [TraceEntry] exists in `optimizer.ndjson`.

## [_ScoreRun][Operation]
- **Input:** Traces for `run_id` and `iteration`, plus `objective` and `scoring.weights`.
- **Steps:**
    1. For each example, derive `status_match`, `unexpected_error_rate`, and `checklist_pass_rate` from the instruction-level traces and checklist results; verify order-of-operations to compute `order_ok`.
       - If `strict_mode` and the invoked operation has no `### [Checklist](../core/checklist.md#checklist)`, set `checklist_pass_rate = 0`.
       - If `strict_mode` and any checklist item lacks evidence, mark that item `failed` and lower `checklist_pass_rate` accordingly.
       - If `strict_mode` and unresolved imports/anchors were detected, add an `execution_error` to errors and increase `unexpected_error_rate`.
    2. Compute per-example scores using the default formula and weights:
       `score_example = order_ok * (w_s*status_match + w_e*(1 - unexpected_error_rate) + w_c*checklist_pass_rate)`.
    3. Aggregate the iteration score as the mean of per-example scores; compute pass/fail totals and error taxonomy breakdowns.
    4. Persist results:
        - Write `iterations/iteration-<n>/scores.json` containing per-example `score_components`, `order_ok`, `score`, and weights.
        - Update `iterations/iteration-<n>/manifest.json` with `mean_score`, `weights`, and error breakdowns.
    5. For each example, compose and append a final [TraceEntry] to the `trace_file` including `order_ok`, `score_components`, and `score` using [Trace#RecordTraceEntry](../core/trace.md#recordtraceentry).
    6. Return the iteration `mean_score` and a concise breakdown for reporting.

## [_PreflightStrictChecks][Operation]
- **Input:** `run_id`, `target_doc`.
- **Steps:**
    1. Parse reference-style imports directly below frontmatter, lines formatted as `[Alias]: path[#anchor]`.
    2. For each import, resolve path relative to `target_doc`; if the file does not exist, record a violation.
    3. If an anchor fragment is present, scan the target file’s headings and confirm the anchor resolves (normalize case/punctuation). Record any unresolved anchors as violations.
    4. Confirm instruction-level trace files exist for each example; if any are missing or empty, record an order verification violation.
    5. Write violations as JSON into `runs/<run_id>/logs/strict-violations.json` for downstream scoring.

## [_VerifyChecklist][Operation]
- **Input:** `run_id`, `iteration`, `target_doc`.
- **Steps:**
    1. For each example, locate the invoked operation’s `### [Checklist](../core/checklist.md#checklist)` in `target_doc` (if any) and ensure each item has a corresponding [ChecklistVerification] record.
    2. If any item lacks evidence or a rationale, record a `checklist_failure` in errors and mark its verification `failed` with an explanatory note.
    3. Summarize per-example checklist pass/fail counts for inclusion in scoring (`checklist_pass_rate`).

## [_VerifyOrderOfOperations][Operation]
- **Input:** `run_id`, `iteration`, `target_doc`.
- **Steps:**
    1. For each example's instruction trace, reconstruct expected order based on [EvaluateDocument] (frontmatter → imports → setup → operations) and the target operation's own defined steps via [ExecuteOperation].
    2. Compare observed order to expected; allow no reordering unless explicitly permitted by the spec.
    3. Record any mismatches as `checklist_failure` with details under `trial-traces/` and an explanatory markdown under `trial-instructions/`.
    4. Return a summary with counts of order matches/mismatches for inclusion in scoring.

### [Checklist](../core/checklist.md#checklist)
- Each example has a computed expected sequence derived from [EvaluateDocument] and [ExecuteOperation].
- Any mismatch is recorded as `checklist_failure` with explicit indices and step names.

## [_ProposePatches][Operation]
- **Input:** `target_doc`, `ancestor_scope`, traces, `objective`.
- **Steps:**
    1. Attribute failures to likely edit sites using step text, operation names, and error patterns.
    2. Synthesize minimal diffs with clear rationales. Patch types: clarify step wording, reorder steps, add defaults in [Setup](../core/document.md#setup-section), refine [Checklist](../core/checklist.md#checklist) items.
    3. Respect `ancestor_scope`:
        - `self_only`: only `target_doc` allowed.
        - `nearest_ancestor`: allow directly imported documents affecting failing ops.
        - `hierarchy`: walk import chain; cap breadth to 1–2 layers.
    4. Save each candidate diff, rationale, and affected files list to `runs/<run_id>/candidates/iteration-<n>/`.
    5. Return a small set of patch candidates.

## [_SimulateAndSelect][Operation]
- **Input:** `candidates`, `holdout`, `run_id`, `iteration`.
- **Steps:**
    1. For each candidate, simulate the patch in-memory (without writing to disk) and run the `holdout` subset.
    2. Score each candidate on the holdout; select the highest-scoring patch (tie-break on fewer regressions).
    3. Persist simulation traces and scores to `runs/<run_id>/iterations/iteration-<n>/`.
    4. Return `chosen_candidate` and its `chosen_score`.

## [_ApplyOrStage][Operation]
- **Input:** `chosen_candidate`, `autonomy`.
- **Steps:**
    1. If `autonomy == manual`: stage the diff for approval without applying; include rationale and affected files; save to `runs/<run_id>/patches/`.
    2. If `autonomy == assisted`: auto-apply local `target_doc` patches; stage ancestor edits for approval; write both applied and staged artifacts.
    3. If `autonomy == autonomous`: apply patch and prepare a rollback patch if the next iteration regresses; write both to `runs/<run_id>/patches/`.

## [_ConvergenceCheck][Operation]
- **Input:** `best_score`, `chosen_score`, `stop_delta`, `iteration`, `max_iterations`.
- **Steps:**
    1. If `iteration >= max_iterations`: stop.
    2. If `chosen_score <= best_score + stop_delta`: stop (no meaningful improvement).
    3. Otherwise continue.

### [Checklist](../core/checklist.md#checklist)
- Ensure stop criteria triggered only when score improvement is below `stop_delta` or the iteration budget is exhausted.
- Ensure any staged or applied patches include minimal diffs and rationale.
