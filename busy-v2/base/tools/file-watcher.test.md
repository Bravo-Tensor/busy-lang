---
Name: File Watcher Tool Tests
Type: [Test]
Description: Validates the File Watcher tool documentation by exercising its describe and invoke operations with realistic inputs and cleanup.
---
[Document]:../../core/document.md
[EvaluateDocument]:../../core/document.md#evaluatedocument
[Operation]:../../core/operation.md
[Test]:../../core/test.md
[RunTest]:../../core/test.md#runtest
[RunTestSuite]:../../core/test.md#runtestsuite
[InvokeFileWatcher]:./file-watcher.md#invokefilewatcher
[DescribeFileWatcher]:./file-watcher.md#describefilewatcher

# Setup
1. [EvaluateDocument] for `./file-watcher.md` so the tool's capability and operations are loaded.
2. Define `watchDir` as `./base/tools/.tmp/file-watcher-watch` relative to the repository root.
3. Ensure the `.tmp` directory exists so temporary watch paths can be created during tests.

# Teardown
- Remove the `./base/tools/.tmp/file-watcher-watch` directory if it still exists after a test case.
- Clear any environment variables set during the test runs (`WATCHED_ROOT`, `WATCHED_FILE`, `WATCHED_EVENT`).

# Operations

## DescribeFileWatcherSummarizesContract

### Given (Arrange)
- Confirm the File Watcher tool document has been evaluated and the operations are available in context.
- Note the expected summary details: capability (monitor directory and trigger command), required inputs (`--watch`, `--command`), optional debounce flag, and Node-based execution.

### When (Act)
- Execute [DescribeFileWatcher] and capture the returned summary text.

### Then (Assert)
- Verify the summary states that the tool watches a directory and triggers a command on file events.
- Verify the summary enumerates the required inputs (`--watch`, `--command`) and mentions the optional `--debounce` parameter.
- Verify the summary identifies the execution mode as a Node CLI invocation of `base/tools/file-watcher.js` or equivalent wording.

## InvokeFileWatcherBuildsNodeCommand

### Given (Arrange)
- Create the `watchDir` path (`./base/tools/.tmp/file-watcher-watch`) if it does not already exist.
- Define the command to run on change as `echo watcher triggered`.
- Prepare invocation parameters: `--watch ${watchDir}`, `--command "echo watcher triggered"`, and `--debounce 1000`.

### When (Act)
- Invoke [InvokeFileWatcher] with the prepared parameters and capture the resulting command or execution transcript.

### Then (Assert)
- Confirm the invocation resolves to a Node command targeting `base/tools/file-watcher.js` with the provided arguments.
- Confirm the invocation documents the emitted environment variables (`WATCHED_ROOT`, `WATCHED_FILE`, `WATCHED_EVENT`).
- Confirm the invocation includes the custom debounce value when present and defaults otherwise.
