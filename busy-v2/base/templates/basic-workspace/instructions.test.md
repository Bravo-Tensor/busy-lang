---
Name: Basic Workspace Test
Type: [Test]
Description: A test for the basic workspace instructions.
---

[Test]:/.busy/core/test.md
[InstructionsPrompt]:./instructions.md

# Operations

## Summarize File Test
### Given (Arrange)
1. Create a file named `test-payload.txt` in the `inbox/` directory with the content "This is a test payload for the summarizer."
2. Ensure the `outbox/` directory is empty.
3. Ensure the `logs/` directory is empty.
4. Ensure the `.trace/` directory is empty.

### When (Act)
1. Execute the [InstructionsPrompt] with the content of `inbox/test-payload.txt`.

### Then (Assert)
1. Verify that a summary file exists in the `outbox/` directory.
2. Verify that the content of the summary file contains a summary of the payload.
3. Verify that the file `logs/activity.log` exists.
4. Verify that `logs/activity.log` contains a "START" entry for `test-payload.txt`.
5. Verify that `logs/activity.log` contains a "COMPLETE" entry for `test-payload.txt`.
6. Verify that `.trace/trace.log` exists.
7. Verify that `.trace/trace.log` contains a line matching `timestamp | Document -> Operation | summary` for the executed response.

# Teardown
1. Delete the file `inbox/test-payload.txt`.
2. Delete the summary file from the `outbox/` directory.
3. Delete the file `logs/activity.log`.
4. Delete `.trace/trace.log`.
