# CLAUDE.md

Project-specific instructions for Claude Code.

## busy-lsp Extension Development

When making changes to the VSCode extension (`packages/busy-lsp`):

### VSIX Refresh Loop

1. **Make code changes** in `packages/busy-lsp/src/`

2. **Bump version** in `packages/busy-lsp/package.json` (required - old versions get cached)

3. **Package and install**:
   ```bash
   cd packages/busy-lsp
   npx vsce package --no-dependencies
   code --install-extension busy-lsp-X.X.X.vsix --force
   ```

4. **Reload VSCode** (Cmd+Shift+P → "Developer: Reload Window")

The `--no-dependencies` flag is required due to npm workspace symlinks causing packaging errors.

### Common Gotchas

- Multiple providers may have duplicate methods (e.g., `getBracketRefAtPosition` exists in both `hover.ts` and `definition.ts`) - fix in all locations
- VSCode caches extensions by version - always bump the version number
