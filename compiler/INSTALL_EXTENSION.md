# Installing BUSY Language Support Extension in VS Code

The extension has been packaged as: `busy-language-support.vsix`

## Installation Methods

### Method 1: Command Line (if VS Code is in PATH)
```bash
code --install-extension /Users/paullorsbach/Workspace/Repos/busy-lang/compiler/busy-language-support.vsix
```

### Method 2: VS Code GUI
1. Open VS Code
2. Go to Extensions view (Cmd+Shift+X on Mac)
3. Click the "..." menu at the top of the Extensions view
4. Select "Install from VSIX..."
5. Navigate to `/Users/paullorsbach/Workspace/Repos/busy-lang/compiler/`
6. Select `busy-language-support.vsix`
7. Click "Install"

### Method 3: Using the CLI Tool
From the project root:
```bash
npm run ide:install
```

## Features Once Installed

After installation, you'll get:
- **Syntax highlighting** for `.busy` files
- **Auto-completion** for capabilities and responsibilities
- **Hover information** showing detailed documentation
- **Go to definition** for capability/resource references
- **Validation** with error diagnostics
- **Commands**:
  - `BUSY: Show Execution Strategy Preview`
  - `BUSY: Validate BUSY File`
  - `BUSY: Show Resource Graph`
  - `BUSY: Migrate from v1.0 to v2.0`

## Verify Installation
1. Open a `.busy` file
2. You should see syntax highlighting
3. Try typing a capability name to see auto-completion
4. Hover over elements to see documentation

## Troubleshooting
- If the extension doesn't activate, restart VS Code
- Check the Output panel > "BUSY Language Server" for any errors
- Ensure you have `.busy` files with proper YAML structure