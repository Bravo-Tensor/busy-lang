# BUSY Language Compiler

A static analysis compiler and validator for the BUSY language - a domain-specific language for describing business organizations as code.

## Overview

The BUSY compiler provides comprehensive validation, analysis, and tooling for BUSY language repositories. It ensures interface coherence, dependency resolution, and workflow completeness across your business process definitions.

## Features

- **📝 YAML Parsing**: Full YAML parsing with position tracking for detailed error reporting
- **🌲 AST Generation**: Complete abstract syntax tree with symbol table and dependency graph
- **🔍 Static Analysis**: Interface coherence, dead code detection, and workflow validation
- **⚡ Performance**: Multi-pass compilation with parallel processing and caching
- **🎯 Multiple Output Formats**: Console, JSON, and HTML reporting
- **👀 Watch Mode**: Continuous validation during development
- **🔧 Configurable**: Extensive configuration options and custom rules

## Installation

```bash
npm install -g @busy-lang/compiler
```

## Quick Start

### Validate a BUSY repository
```bash
# Install dependencies
npm install

# Validate the photography business example  
./busy-validate.js

# Validate specific path
./busy-validate.js /path/to/busy/files

# Example output:
# 🚀 BUSY Language Compiler v0.1.0
# 📁 Found 15 .busy files
# ✅ All files valid
# 📊 Validation passed
```

### Specialized Analysis
```bash
# Check interface coherence only
busy-check interfaces ./my-business

# Analyze dependency resolution
busy-check dependencies ./my-business

# Find dead code
busy-check deadcode ./my-business

# Validate workflow completeness
busy-check workflows ./my-business
```

### Watch Mode for Development
```bash
# Watch for changes and validate continuously
busy-check watch ./my-business

# Custom debounce delay
busy-check watch --debounce 1000
```

## Command Reference

### Global Options
- `-v, --verbose`: Enable verbose output
- `-c, --config <path>`: Configuration file path
- `--no-color`: Disable colored output

### Validate Command
```bash
busy-check validate [path] [options]
```

**Options:**
- `-f, --format <type>`: Output format (`console`, `json`, `html`)
- `-o, --output <file>`: Output file path
- `--strict`: Treat warnings as errors
- `--allow-errors`: Continue validation despite errors
- `--max-errors <n>`: Maximum errors before stopping
- `--no-cache`: Disable compilation cache
- `--only <rules>`: Run only specified rules (comma-separated)
- `--exclude <rules>`: Exclude specified rules (comma-separated)

### Analysis Commands
- `busy-check interfaces [path]`: Interface coherence analysis
- `busy-check dependencies [path]`: Dependency resolution analysis
- `busy-check deadcode [path]`: Dead code detection
- `busy-check workflows [path]`: Workflow completeness analysis

### Watch Command
```bash
busy-check watch [path] [options]
```

**Options:**
- `--debounce <ms>`: Debounce delay in milliseconds (default: 500)

## Configuration

Create a `.busy.json` configuration file in your repository root:

```json
{
  "rules": {
    "interfaceCoherence": "error",
    "deadCodeDetection": "warning",
    "resourceValidation": "info",
    "workflowCompleteness": "error",
    "typeChecking": "error",
    "importValidation": "error",
    "inheritanceValidation": "error"
  },
  "ignore": [
    "*/deprecated/*",
    "*/examples/*"
  ],
  "maxErrors": 100,
  "maxWarnings": 1000,
  "parallelProcessing": true,
  "cacheEnabled": true,
  "outputFormat": "console"
}
```

### Configuration Options

#### Rule Severities
- `"error"`: Blocks compilation
- `"warning"`: Reported but doesn't block
- `"info"`: Informational only
- `"off"`: Disabled

#### Available Rules
- **`interfaceCoherence`**: Validates deliverable input/output matching
- **`deadCodeDetection`**: Finds unused roles, playbooks, and deliverables
- **`resourceValidation`**: Checks resource allocation consistency
- **`workflowCompleteness`**: Ensures all workflows have entry/exit points
- **`typeChecking`**: Validates deliverable type compatibility
- **`importValidation`**: Checks tool and advisor imports
- **`inheritanceValidation`**: Validates role inheritance chains

## Programmatic Usage

```typescript
import { BusyCompiler } from '@busy-lang/compiler';

const compiler = new BusyCompiler({
  rules: {
    interfaceCoherence: 'error',
    deadCodeDetection: 'warning'
  }
});

const result = await compiler.validate('./my-business');

if (result.summary.success) {
  console.log('✅ Validation passed');
} else {
  console.log('❌ Validation failed');
  console.log(`Errors: ${result.summary.errors}`);
  console.log(`Warnings: ${result.summary.warnings}`);
}
```

## Output Formats

### Console Output
Human-readable output with colors and formatting:
```
🔍 BUSY Validation Report
==================================================

📁 File Discovery
   Files found: 23
   Teams: 3 (L0: 2, L1: 1, L2: 0)
   Roles: 7, Playbooks: 6, Teams: 3

📝 YAML Parsing
   Successfully parsed: 23/23

🌲 AST Construction
   AST nodes: 156
   Symbols: 89
   Dependencies: 34

📊 Summary
──────────────────────────────
✅ Validation passed
Files processed: 23
Successfully parsed: 23
Duration: 145ms
```

### JSON Output
Machine-readable structured output:
```json
{
  "summary": {
    "totalFiles": 23,
    "successfullyParsed": 23,
    "errors": 0,
    "warnings": 2,
    "info": 5,
    "duration": 145,
    "success": true
  },
  "analysis": [
    {
      "rule": "deadCodeDetection",
      "issues": [
        {
          "severity": "warning",
          "code": "W001",
          "message": "Role 'unused_role' is defined but never invoked",
          "file": "L0/support/roles/unused-role.busy",
          "line": 1,
          "suggestion": "Remove role or add playbook that uses it"
        }
      ]
    }
  ]
}
```

### HTML Output
Rich interactive HTML report with:
- Visual dashboard with metrics
- Collapsible sections
- Issue filtering
- File navigation
- Dependency graphs (future)

## Directory Structure Requirements

BUSY repositories should follow this structure:

```
my-business/
├── L0/                     # Operational layer
│   ├── client-ops/
│   │   ├── team.busy      # Team charter
│   │   ├── roles/
│   │   │   ├── inquiry-manager.busy
│   │   │   └── project-coordinator.busy
│   │   └── playbooks/
│   │       ├── inquiry-to-booking.busy
│   │       └── client-onboarding.busy
│   └── creative-production/
│       ├── team.busy
│       └── ...
├── L1/                     # Management layer
└── L2/                     # Strategic layer
```

## Error Categories

### Errors (Block Compilation)
- **E001-E099**: Syntax and schema violations
- **E100-E199**: Type and interface mismatches
- **E200-E299**: Missing interface implementations
- **E300-E399**: Import resolution failures
- **E400-E499**: Inheritance errors

### Warnings (Don't Block)
- **W001-W099**: Dead code detection
- **W100-W199**: Resource allocation issues
- **W200-W299**: Quality concerns

### Info (Optimization Opportunities)
- **I001-I099**: Performance suggestions
- **I100-I199**: Best practice recommendations

## Performance

The compiler is optimized for large repositories:

- **Parallel Processing**: Files processed in parallel when possible
- **Incremental Analysis**: Only re-analyze changed files in watch mode
- **Caching**: Compilation results cached for faster subsequent runs
- **Memory Efficient**: Streaming processing for large files

### Performance Targets
- Small repos (1-10 files): <100ms
- Medium repos (10-100 files): <1s  
- Large repos (100-1000 files): <10s

## Documentation

The compiler includes comprehensive documentation organized into focused areas:

### For Users and Developers
- **[docs/](./docs/)** - Complete documentation suite
  - Language reference and syntax guide
  - Developer workflow and best practices  
  - Validation error reference and troubleshooting
  - Compiler architecture and implementation details

### For Project Evolution
- **[design-docs/](./design-docs/)** - Design documents for iterative improvements
  - Specification change proposals
  - Implementation planning and task breakdowns
  - Historical record of project evolution

Start with [docs/DOCUMENTATION_INDEX.md](./docs/DOCUMENTATION_INDEX.md) for a complete guide to available documentation.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.