---
Name: Test
Type: [Document]
Description: A playbook-style [Document] for expressing Given/When/Then test cases that validate Busy concepts, prompts, tools, and workflows.
---
[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md
[Checklist]:./checklist.md
[RunChecklist]:./checklist.md#runchecklist
[Playbook]:./playbook.md
[Test]:./test.md
[Test Suite]:./test.md#test-suite
[Test Case]:./test.md#test-case
[Shared Setup]:./test.md#shared-setup
[Tear Down]:./test.md#tear-down
[Given]:./test.md#given-arrange
[When]:./test.md#when-act
[Then]:./test.md#then-assert
[Arrange]:./test.md#given-arrange
[Act]:./test.md#when-act
[Assert]:./test.md#then-assert
[RunTestSuite]:./test.md#runtestsuite
[RunTest]:./test.md#runtest
[ListTests]:./test.md#listtests

# Setup
A [Test] extends the base [Document] and [Playbook] patterns to describe executable specifications. It gathers multiple [Test Case] [Operation]s inside a single file so an agent can prepare state, exercise the subject under test, and verify outcomes. Import the [Document] or capability you want to validate, define any [Shared Setup], then model each scenario with explicit Given/When/Then (or Arrange/Act/Assert) sections. Optionally add a `# Teardown` section with [Tear Down] tasks that restore the environment after each case. Treat a [Test] file as a self-contained suite: it can be invoked end-to-end or case-by-case. Append a `### Checklist` section at the end of the suite so agents confirm sandbox, teardown, and reporting requirements every time it runs.

Before executing suite-level or case-level steps, materialize an isolated working copy in a directory named `.test` that lives directly under the directory where the suite is invoked. This sandbox should mirror the files and structure the tests require—typically a full replica of the current workspace—so that any modifications occur inside `.test` instead of the original project. Use the `.test` directory as the working root for subsequent operations.

Update the logging configuration in [workspace-context.md](./workspace-context.md) so that the `.test` sandbox runs with `verbose` log level and directs its sink to `.test/test.log`.

Name each suite to pair with the artifact it validates: if you are testing `widget.md`, create `widget.test.md` in the same directory. When several suites cover the same artifact, append a qualifier before `.test.md` (for example, `widget.integration.test.md`).

# Teardown
Use the `# Teardown` section to declare cleanup steps that reverse any state created during setup or execution. Keep the tasks idempotent so they can run even if a test fails midway, and clearly note any files, processes, or memory entries being removed. When the suite finishes, remove the `.test` workspace (or reset it) to ensure the next run starts from a clean replica.

# Local Definitions
## Test Suite
The entire [Document] authored with `Type: [Test]`. It may include imports, shared fixtures, and multiple [Test Case] definitions under `# Operations`.

## Test Case
A single `##` [Operation] under `# Operations` whose body is structured into Given/When/Then subsections. Each [Test Case] is executed independently and should clean up or isolate its own state.

## Shared Setup
Optional instructions placed in the [Test Suite]'s `# Setup` section to seed common context (fixtures, sample files, seeded memory). Shared setup should never mask dependencies that a [Test Case] needs to express explicitly.

## Tear Down
Cleanup steps declared under `# Teardown`. They run after each [Test Case] completes (even on failure) to remove temporary files, reset memory, or undo role switches. Keep them lightweight and safe to repeat.

## Given (Arrange)
Steps that prepare state for the [Test Case]. Use them to create required files, mock responses, or configure roles. Execute them before any action steps.

## When (Act)
The action under scrutiny. Usually a call to an [Operation], [Playbook], or [Tool]. Capture inputs and outputs so the assertions can reference them.

## Then (Assert)
Assertions that verify the observed behavior. Check outputs, side effects, logs, or state changes. If any expectation fails, halt the [Test Case] and return an [error](./operation.md#error) with details.

# Operations

## RunTestSuite
Execute every [Test Case] in the [Test Suite].

1. **Evaluate Document:** Run [EvaluateDocument](./document.md#evaluatedocument) so imports, [Shared Setup], and local concepts are loaded. During this phase, create the `.test` sandbox, replicate the required project assets into it, and enable verbose [logging level](./workspace-context.md#log-level) with the log sink set to `.test/test.log`.
2. **Collect Test Cases:** List all `##` headings under `# Operations` whose names do not start with `_`. Preserve their order unless an explicit dependency is documented.
3. **Run Sequentially:** For each collected [Test Case], call [RunTest](./test.md#runtest), ensuring that all actions stream detailed diagnostics to the configured log file. Allow the [Tear Down] steps to reset shared state between cases.
4. **Aggregate Results:** Track pass/fail for each [Test Case]. When a failure occurs, ensure [Tear Down] has executed before returning an [error](./operation.md#error) that includes the failing case name, failing phase (Given/When/Then), and diagnostic notes.
5. **Run Checklist:** After the suite completes, execute [RunChecklist] if a suite-level [Checklist] is defined so every verification item is satisfied.
6. **Summarize Success:** If all cases pass, return a concise report that lists each case and key assertions verified.

## RunTest
Execute a single [Test Case] from the [Test Suite].

1. **Evaluate Document:** Ensure the parent [Test Suite] has been processed via [EvaluateDocument](./document.md#evaluatedocument) so the `.test` sandbox exists, is populated with the workspace replica, and verbose logging from [workspace-context.md](./workspace-context.md) is active with `.test/test.log` as the sink.
2. **Locate Case:** Resolve the target [Test Case] by name or index. If it cannot be found, return an [error](./operation.md#error) describing the available cases.
3. **Parse Sections:** Within the [Test Case], identify the `### Given (Arrange)`, `### When (Act)`, and `### Then (Assert)` subsections. Accept synonyms (`Given`/`Arrange`, `When`/`Act`, `Then`/`Assert`) but require at least one step per subsection. If a subsection is missing, fail fast with an [error](./operation.md#error).
4. **Execute Given:** Perform the setup steps in order, invoking referenced [Operation]s, [Playbook]s, or [Tool]s as needed. Emit detailed diagnostics for each action to the log file and record created state so assertions can reference it.
5. **Execute When:** Carry out the primary action. Capture outputs, logs, and side effects for assertion while writing granular progress updates to the log.
6. **Evaluate Then:** Walk through each assertion. If an expectation cannot be verified, return an [error](./operation.md#error) that identifies the unmet check and relevant evidence, ensuring the failure context is logged verbosely.
7. **Tear Down:** Execute the `# Teardown` instructions (if present) to remove temporary state. Run this step even when earlier phases fail and include any cleanup issues in the final report, logging each teardown action.
8. **Run Checklist:** If the [Test Suite] defines a [Checklist], execute [RunChecklist] before returning so every verification item has evidence.
9. **Report Result:** On success, emit a brief summary outlining the action performed and the assertions satisfied, leaving the complete trace in the log file.

## ListTests
Enumerate the [Test Case]s defined in the [Test Suite].
1. Parse the [Test Suite] after [EvaluateDocument](./document.md#evaluatedocument).
2. Collect the headings for each non-private [Test Case] in declaration order.
3. Present them as a numbered list so callers can reference indices when invoking [RunTest].

### Checklist
- Confirm the `.test` sandbox was created before execution and cleaned up or reset according to `# Teardown`.
- Confirm `.test/test.log` captured verbose diagnostics for every [Test Case] run.
- Confirm the final report enumerates each [Test Case] outcome with supporting evidence or links to the log.
