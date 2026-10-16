---
Name: Tool Round Trip Harness
Type: [Playbook]
Description: A synthetic caller workflow exercising the real File Tool and Logging Tool contracts.
---

# [Imports](./busy/core/document.busy.md#imports-section)

[File Tool]: ./busy/toolbox/file-tool.busy.md
[Logging Tool]: ./busy/toolbox/logging-tool.busy.md
[Input]: ./busy/core/operation.busy.md#input-section
[Steps]: ./busy/core/operation.busy.md#steps-section
[Output]: ./busy/core/operation.busy.md#output-section
[Checklist]: ./busy/core/checklist.busy.md#checklist-section

# [Setup](./busy/core/document.busy.md#setup-section)

Confirm the caller has the required runtime tools and a workspace. Use only the paths supplied by the caller and respect the File Tool path scope. If the tools are unavailable, cancel the run with an explanation.

# [Operations](./busy/core/document.busy.md#operations-section)

## roundTrip

### [Input]

- source_path: Workspace-relative input file.
- output_path: Workspace-relative destination file.

### [Steps]

1. Read source_path using [File Tool] readFile and retain the returned content.
2. Write the content to output_path using [File Tool] writeFile and retain the returned path.
3. Use [Logging Tool] logInfo to record the output path and retain the log identifier.

### [Output]

- Written file path and log identifier reported by the caller.

### [Checklist]

- [ ] The content was read and written without modification.
- [ ] Both paths respect the File Tool workspace rules.
- [ ] A log identifier was returned.
