# Knit System Design

## Architecture Overview

Knit implements a distributed dependency reconciliation system using git-inspired change detection with LLM-powered conflict resolution.

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File System  │    │ Dependency      │    │ Reconciliation  │
│   Watcher       │───▶│ Graph           │───▶│ Engine          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Content Hash    │    │ State Manager   │    │ Human Review    │
│ Tracker         │    │ (.knit/)        │    │ Queue           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Data Structures

### Dependency Graph
```json
{
  "dependencies": {
    "design/api.md": {
      "watches": ["src/api/routes.ts", "tests/api.test.ts"],
      "watched_by": [],
      "reconciliation_rules": {
        "auto_apply_threshold": 0.8,
        "require_review": ["breaking_changes", "contradictions"]
      }
    },
    "src/api/routes.ts": {
      "watches": [],
      "watched_by": ["design/api.md", "tests/api.test.ts"],
      "last_reconciled_hash": "sha256:abc123..."
    }
  }
}
```

### State Tracking (.knit/)
```
project/
├── .knit/
│   ├── config.json           # Global knit configuration
│   ├── dependencies.json     # Dependency graph
│   ├── reconciliation/       # Pending reconciliations
│   │   ├── pending.json      # Queue of changes to process
│   │   └── review/           # Changes requiring human review
│   └── state/               # Reconciled state tracking
│       ├── design-api.md.hash
│       └── src-api-routes.ts.hash
└── [project files...]
```

## Change Detection Algorithm

### Git-Inspired Hashing
1. **Content Normalization**: Strip whitespace, normalize line endings
2. **Semantic Hashing**: Hash meaningful content (ignore formatting)
3. **Timestamp Tracking**: Track when files were last reconciled
4. **Delta Calculation**: Compare current hash vs. last reconciled hash

### Efficient Monitoring
```typescript
interface FileWatcher {
  watchedFiles: Map<string, WatchConfig>;
  
  onFileChange(filepath: string): void {
    const newHash = calculateContentHash(filepath);
    const lastHash = getLastReconciledHash(filepath);
    
    if (newHash !== lastHash) {
      triggerReconciliation(filepath, newHash, lastHash);
    }
  }
}
```

## Dependency Resolution

### Propagation Strategy
1. **Change Origin**: File A changes
2. **Immediate Dependencies**: Find all files that watch A
3. **Transitive Dependencies**: Find files that watch those files
4. **Bounded Propagation**: Limit to N hops (default: 3)
5. **Cycle Detection**: Prevent infinite loops

### Reconciliation Phases
```
File Change → Impact Analysis → Conflict Detection → Human Review → State Update
     ↓              ↓               ↓                ↓              ↓
   Hash Δ      Dependency     LLM Analysis    Review Queue    Update Hashes
            Propagation      Classification   (if needed)    Mark Reconciled
```

## Conflict Classification

### Automatic Application (Safe)
- **Documentation updates**: Comments, README changes
- **Non-breaking additions**: New optional parameters
- **Formatting changes**: Code style, structure
- **Test updates**: Test cases reflecting implementation

### Review Required (Risky)
- **Breaking changes**: Interface modifications
- **Contradictory requirements**: New constraints conflict with existing
- **Architecture changes**: Fundamental assumptions modified
- **Uncertain impact**: LLM confidence below threshold

### Escalation Criteria
```typescript
enum ConflictType {
  SAFE_AUTO_APPLY = "safe",           // Auto-apply with notification
  REVIEW_RECOMMENDED = "review",       // Flag for review but allow auto-apply
  REVIEW_REQUIRED = "required",        // Block until human approval
  MANUAL_RESOLUTION = "manual"         // Requires human-driven resolution
}
```

## File System Integration

### Minimal Overhead
- **No daemon required**: Command-driven execution
- **Filesystem watches**: Use native OS file watching (inotify/FSEvents)
- **Incremental processing**: Only process changed files
- **Lazy evaluation**: Calculate dependencies on-demand

### Git Compatibility
- **Ignore patterns**: Respect .gitignore
- **Atomic operations**: Coordinate with git operations
- **Branch awareness**: Track reconciliation per git branch
- **Commit integration**: Include reconciliation in commit messages

## Performance Characteristics

### Scalability Targets
- **File count**: Support 10,000+ files
- **Dependency depth**: Up to 5 levels deep
- **Reconciliation time**: <5 seconds for typical changes
- **Memory usage**: <100MB for large projects

### Optimization Strategies
- **Incremental hashing**: Only hash changed files
- **Parallel processing**: Reconcile independent branches simultaneously
- **Caching**: Cache LLM responses for similar conflicts
- **Batching**: Group related changes for efficient processing

## Security Considerations

### File Access
- **Sandboxed execution**: Limit file system access to project directory
- **Permission validation**: Verify read/write permissions before operations
- **Path traversal protection**: Validate all file paths

### LLM Integration
- **Content filtering**: Strip sensitive information before LLM analysis
- **API key security**: Secure storage and transmission of credentials
- **Response validation**: Validate LLM responses before application

## Error Handling

### Graceful Degradation
- **LLM unavailable**: Fall back to manual conflict marking
- **File system errors**: Continue with available files
- **Dependency cycles**: Break cycles with human intervention
- **Corrupted state**: Rebuild from file system scan

### Recovery Mechanisms
- **State validation**: Verify .knit/ directory integrity
- **Automatic repair**: Rebuild corrupted state files
- **Manual override**: Allow human correction of any state
- **Rollback capability**: Undo reconciliation if needed