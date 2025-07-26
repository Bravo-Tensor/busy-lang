# IDE Extension Compilation Fixes

## Issue
The VS Code extension in `src/ide/` was failing to compile with TypeScript errors related to:
1. Module resolution for `@/` paths
2. rootDir configuration conflicts
3. Unable to find imports from parent directories

## Solution
Updated `src/ide/tsconfig.json` to properly configure:

1. **rootDir**: Set to `"../../src"` to include all source files
2. **baseUrl**: Set to `"../../src"` to match the main project structure
3. **paths**: Added complete path mappings for all `@/` imports:
   ```json
   "@/*": ["*"],
   "@/ast/*": ["ast/*"],
   "@/analysis/*": ["analysis/*"],
   "@/core/*": ["core/*"],
   "@/symbols/*": ["symbols/*"],
   "@/utils/*": ["utils/*"],
   "@/config/*": ["config/*"],
   "@/runtime/*": ["runtime/*"]
   ```
4. **include**: Specified exact paths to include necessary source files
5. **exclude**: Added test files to prevent including unnecessary files

## Commands
- Compile: `npm run compile`
- Watch mode: `npm run watch`
- Prepare for publishing: `npm run vscode:prepublish`

## Output
Compiled JavaScript files are generated in the `out/` directory with source maps for debugging.