---
Name: File Tool
Type: [Tool]
Description: Read, write, and manage files in the workspace filesystem
Provider: runtime
---

# File Tool

> Workspace file operations for persistence. All paths are relative to the workspace root.
> Libraries are mounted read-only at `.libraries/`.

## [Capability]

- Read files from workspace or libraries
- Write files to workspace directories
- List directory contents
- Check file existence
- Delete files (workspace only, not libraries)

## [Invocation Contract]

**Provider**: Orgata Runtime
**Authentication**: None (workspace-scoped)
**Path Scope**: Workspace root, read-only for `.libraries/`

### Path Rules
- All paths are relative to workspace root
- Cannot escape workspace (no `../` above root)
- `.libraries/` is read-only
- `.workspace` file is protected (use workspace API)

## [Response Processing]

```bash
# For large files, truncate content
jq 'if .content and (.content | length > 10000)
    then .content = (.content | .[0:10000] + "\n[TRUNCATED]")
    else . end'
```

# Operations

## read_file

Read content from a file in the workspace.

### Inputs
- path: Relative path to file (required)
- encoding: File encoding (optional, default: "utf-8")

### Outputs
- content: File content as string
- size: File size in bytes
- modified: Last modified timestamp
- exists: Boolean (true if file was found)

### Examples
- read_file(path="input/data.json")
- read_file(path=".libraries/busy/core/operation.busy.md")
- read_file(path="documents/config.yaml", encoding="utf-8")

### Providers

#### runtime

Action: RUNTIME_READ_FILE
Parameters:
  path: path
  encoding: encoding

## write_file

Write content to a file in the workspace.

### Inputs
- path: Relative path to file (required)
- content: Content to write (required)
- mode: Write mode - "overwrite" or "append" (optional, default: "overwrite")
- create_dirs: Create parent directories if needed (optional, default: true)

### Outputs
- path: Path of written file
- size: Size of written content in bytes
- success: Boolean indicating success

### Examples
- write_file(path="output/report.md", content="# Report\n\nResults...")
- write_file(path="output/log.txt", content="New entry\n", mode="append")

### Providers

#### runtime

Action: RUNTIME_WRITE_FILE
Parameters:
  path: path
  content: content
  mode: mode
  create_dirs: create_dirs

## list_files

List files and directories in a workspace path.

### Inputs
- path: Relative directory path (optional, default: workspace root)
- pattern: Glob pattern to filter files (optional, e.g., "*.md")
- recursive: Include subdirectories (optional, default: false)

### Outputs
- files: List of file objects with name, path, size, type (file/directory)
- count: Total number of items

### Examples
- list_files(path="documents")
- list_files(path="input", pattern="*.json")
- list_files(pattern="**/*.busy.md", recursive=true)

### Providers

#### runtime

Action: RUNTIME_LIST_FILES
Parameters:
  path: path
  pattern: pattern
  recursive: recursive

## file_exists

Check if a file or directory exists.

### Inputs
- path: Relative path to check (required)

### Outputs
- exists: Boolean indicating existence
- type: "file", "directory", or null if not exists

### Examples
- file_exists(path="output/report.pdf")
- file_exists(path="documents/toolbox")

### Providers

#### runtime

Action: RUNTIME_FILE_EXISTS
Parameters:
  path: path

## delete_file

Delete a file from the workspace (not available for libraries).

### Inputs
- path: Relative path to file (required)

### Outputs
- success: Boolean indicating successful deletion
- error: Error message if failed

### Examples
- delete_file(path="output/temp.txt")

### Providers

#### runtime

Action: RUNTIME_DELETE_FILE
Parameters:
  path: path

---

## Directory Structure Reference

```
workspace/
├── .workspace           # Metadata (protected, use workspace API)
├── .checkpoints/        # LangGraph checkpoints (internal)
├── .libraries/          # Read-only library mounts
│   └── busy/            # Default BUSY library
├── documents/           # Operations, playbooks, custom content
│   └── toolbox/         # Workspace-local tools
├── input/               # Input data
└── output/              # Output data
```

## Security Notes

- Cannot write to `.libraries/` (read-only)
- Cannot modify `.workspace` directly (use workspace API)
- Cannot access paths outside workspace root
- Large file content is truncated in responses to preserve context
