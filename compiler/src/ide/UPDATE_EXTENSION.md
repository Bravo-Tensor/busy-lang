# VS Code Extension Update - Workspace Indexing Fix

## Issue Resolved

The language server was only indexing capability definitions from files that were currently open in VS Code. If you had the `expeditor.busy` role file open but not the `team.busy` file, the server couldn't find the capability definitions, leading to false "not defined" errors.

## Fix Applied

✅ **Added Workspace-Wide Indexing**: The language server now automatically indexes all `.busy` files in the workspace when it starts  
✅ **Multi-File Support**: Definitions from any file in the workspace are now available for validation  
✅ **Automatic Discovery**: No need to manually open the team file to get capability definitions  

## Installation Steps

1. **Uninstall Previous Version**:
   ```bash
   code --uninstall-extension busy-lang.busy-language-support
   # or manually uninstall via VS Code Extensions panel
   ```

2. **Install Updated Version**:
   ```bash
   code --install-extension busy-language-support-2.0.1.vsix
   ```

3. **Restart VS Code** completely (not just reload window)

4. **Open Workspace**: Make sure you open the folder containing your BUSY files as a workspace

## Verification

After installing the updated extension:

1. **Open the workspace** containing your BUSY files
2. **Open `/roles/expeditor.busy`** 
3. **Check the Output panel**:
   - Go to View → Output
   - Select "BUSY Language Server" from the dropdown
   - You should see: `"Indexed workspace: 4 capabilities, 2 responsibilities, 0 resources"`

4. **Verify no errors**: The `communicate-with-servers` capability should no longer show as undefined

## Troubleshooting

If you still see errors:

1. **Check workspace is open**: Make sure you opened the folder containing BUSY files as a workspace, not individual files
2. **Check Output panel**: Look for indexing messages in the BUSY Language Server output
3. **Try reloading**: Use Cmd/Ctrl+Shift+P → "Developer: Reload Window"
4. **Check file structure**: Ensure your `team.busy` file contains the capability definitions

## What Changed

- Added `indexWorkspaceFiles()` function that runs on server initialization
- Recursively scans workspace for all `.busy` files
- Indexes capabilities/responsibilities/resources from all discovered files
- Provides debug output showing indexing results