---
Name: File Watcher Tool
Type: [Tool]
Description: Watches an inbox directory and invokes a command whenever files are added or updated.
---
[Tool]:../../core/tool.md
[InvokeTool]:../../core/tool.md#invoketool
[DescribeCapability]:../../core/tool.md#describecapability

# Setup
This [Tool] wraps the script `file-watcher.js` located in the same directory. The script uses Node.js to monitor a directory and run a shell command when files change. Ensure Node 18+ is available and the target command can be executed from this folder.

## Capability
Monitor an inbox directory and trigger a workflow (such as a Gemini CLI invocation) in response to file creation or modification events.

## Invocation Contract
Run the watcher script with the inbox path and command to execute.
- Interpreter: `node`
- Script: `base/tools/file-watcher.js`
- Example: `node base/tools/file-watcher.js --watch agents/editor/inbox --command "gemini --config instructions.md"`
- The command receives environment variables:
  - `WATCHED_ROOT`: absolute path to the watched directory.
  - `WATCHED_FILE`: absolute path to the file that triggered the event.
  - `WATCHED_EVENT`: raw `fs.watch` event name (`rename` or `change`).
- The script debounces events by 250ms (default) and serializes command execution.
- Optional flag: `--debounce <ms>` to adjust sensitivity.

## Inputs
- `--watch`: Relative or absolute path to the inbox directory.
- `--command`: Shell command to run when a change is detected. Quotes are required if the command contains spaces.
- Optional `--debounce`: Number of milliseconds to wait before firing the command.

## Outputs
- The invoked command handles output (writing to an outbox, logging, etc.).
- The watcher logs status messages to stdout/stderr.

## State
- None. Each invocation runs until interrupted. Use the host process manager to restart or supervise as needed.

# Operations

## InvokeFileWatcher
Execute [InvokeTool] for this [Tool] with the desired inbox path and command arguments.

## DescribeFileWatcher
Execute [DescribeCapability] to summarize when and why to use this [Tool].