# Knit - Bidirectional Dependency Reconciliation

Knit is a tool that maintains coherence between related files by providing bidirectional dependency reconciliation with git-integrated workflow. When any file changes, knit ensures dependent files remain consistent through automated analysis and human-supervised reconciliation.

## Core Concept

Like git tracks file versions over time, **knit tracks file consistency across dependencies**:
- Git: `file(t1) → file(t2) → file(t3)` (temporal versioning)
- Knit: `design.md ↔ component.ts ↔ test.spec.ts` (spatial consistency)

## Key Features

- **Git-style change detection** using content hashing
- **Bidirectional propagation** of changes through dependency graph
- **LLM-powered reconciliation** with human oversight for complex changes
- **Git-integrated workflow** using branches and standard PR review
- **Conflict classification** (safe auto-apply vs. review required)
- **Simple file-based implementation** with no external dependencies

## Installation

```bash
npm install -g knit
```

## Quick Start

### 1. Initialize knit in your project
```bash
cd your-project
knit init
```

### 2. Set up dependencies
```bash
# Design document influences implementation
knit link design/api.md src/api/routes.ts

# Implementation should update tests
knit link src/api/routes.ts tests/api.test.ts

# Create bidirectional relationship
knit link src/components/Button.tsx src/components/Button.stories.tsx
```

### 3. Make changes and reconcile
```bash
# Make changes to design document
git add design/api.md
git commit -m "Update API design"

# Reconcile dependencies
knit reconcile
# Output: Created reconciliation branch: knit/reconcile-20240115-143022
# Output: Auto-applied 2 safe changes, 1 flagged for review

# Review and merge reconciliation
git push origin knit/reconcile-20240115-143022
gh pr create --base main --title "Dependency reconciliation for API updates"
```

## Workflow

The knit workflow integrates seamlessly with git:

```bash
# 1. Feature work
git checkout -b feature/new-api
# ... make changes to design documents ...
git commit -m "Design new API endpoints"

# 2. Reconcile dependencies
knit reconcile
# Creates knit/reconcile-TIMESTAMP branch with dependency updates

# 3. Review reconciliation (standard git workflow)
git push origin knit/reconcile-TIMESTAMP
gh pr create --base feature/new-api --title "Auto-reconciliation: API dependencies"

# 4. Merge reconciliation back
git checkout feature/new-api
git merge knit/reconcile-TIMESTAMP

# 5. Continue feature work or merge to main
```

## Commands

### Core Commands
```bash
knit init                           # Initialize dependency tracking
knit link <source> <target>         # Add dependency relationship
knit reconcile                      # Start reconciliation process
knit status                         # Show reconciliation status
knit merge [branch]                 # Merge reconciliation branch
```

### Dependency Management
```bash
knit link design.md implementation.ts     # Create dependency
knit unlink design.md implementation.ts   # Remove dependency
knit graph                               # Visualize dependencies
knit graph --format json                 # Export as JSON
```

### Git Integration
```bash
knit reconcile --auto-apply              # Auto-apply safe changes
knit reconcile --source-branch main      # Reconcile from specific branch
knit cleanup                             # Clean up old reconciliation branches
knit history                             # Show reconciliation history
```

### Configuration
```bash
knit config --list                       # Show all configuration
knit config --set llm.model=gpt-4       # Set LLM model
knit config --set autoApplyThreshold=0.9 # Set auto-apply threshold
```

## Configuration

Knit stores configuration in `.knit/config.json`:

```json
{
  "autoApplyThreshold": 0.8,
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "your-api-key"
  },
  "git": {
    "autoReconcile": false,
    "branchPrefix": "knit/reconcile"
  },
  "ignore": [
    ".git/**",
    "node_modules/**",
    "*.log"
  ]
}
```

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key for LLM analysis

## Reconciliation Process

1. **Change Detection**: Detects changes using git diff analysis
2. **Impact Analysis**: Finds dependent files through dependency graph
3. **LLM Analysis**: Analyzes each dependent file for needed updates
4. **Classification**: Categorizes changes as safe auto-apply or review required
5. **Application**: Auto-applies safe changes, flags complex changes for review
6. **Git Integration**: Creates reconciliation branch with clear commit messages

### Conflict Classification

- **SAFE_AUTO_APPLY**: Non-breaking changes with high confidence (>0.8)
- **REVIEW_RECOMMENDED**: Changes recommended but safe to auto-apply
- **REVIEW_REQUIRED**: Breaking changes, contradictions, or low confidence
- **NO_ACTION**: No update needed

## Examples

### Documentation → Code
```bash
knit link README.md src/api/index.ts
knit link docs/architecture.md src/core/
```

### Code → Tests
```bash
knit link src/components/ tests/components/
knit link src/api/routes.ts tests/api.integration.test.ts
```

### Design → Implementation
```bash
knit link design/user-flows.md src/pages/
knit link design/components.figma src/components/
```

### Bidirectional Relationships
```bash
# API spec influences both client and server
knit link api-spec.yaml client/api.ts
knit link api-spec.yaml server/routes.ts

# Changes in implementation should update design docs
knit link src/auth/service.ts design/auth-architecture.md
```

## Integration with Development Workflow

### With GitHub Actions
```yaml
name: Knit Reconciliation
on:
  push:
    branches: [main]
jobs:
  reconcile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install -g knit
      - run: knit reconcile --auto-apply
      - run: |
          if git diff --quiet; then
            echo "No reconciliation needed"
          else
            git push origin knit/reconcile-$(date +%Y%m%d-%H%M%S)
            gh pr create --title "Auto-reconciliation"
          fi
```

### With Git Hooks
```bash
# Set up automatic reconciliation on commit
knit config --set git.autoReconcile=true

# Manual hook setup
echo "knit reconcile --auto-apply" >> .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

## Project Structure

When knit is initialized, it creates:

```
.knit/
├── config.json          # Configuration
├── dependencies.json    # Dependency graph
├── reconciliation/      # Session data
│   └── [session-id].json
└── state/              # File hashes
    └── [file].hash
```

## Benefits

1. **Familiar Workflow**: Uses existing git/PR review processes
2. **Clean History**: Reconciliation changes are clearly separated and reviewable
3. **Team Collaboration**: Multiple reviewers can collaborate on reconciliation
4. **Rollback Capability**: Easy to revert reconciliation if needed
5. **Audit Trail**: Complete history of what was changed and why
6. **Tool Integration**: Works with existing git tooling (GitHub, GitLab, etc.)

## Requirements

- **Node.js** 18+ 
- **Git** repository
- **OpenAI API key** (for LLM analysis)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.