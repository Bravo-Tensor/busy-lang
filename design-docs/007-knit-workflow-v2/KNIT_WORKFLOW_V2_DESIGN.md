# Knit Workflow V2 Design Specification

## Architecture Overview

The new knit workflow shifts from a "branch-based reconciliation" model to an "in-place reconciliation" model that works directly on the current branch and analyzes cumulative changes since branching from the parent.

### Core Philosophy Changes

**From:** Create reconciliation branch → Analyze recent commits → Merge back  
**To:** Work in-place on current branch → Analyze all changes vs parent → Apply directly

## Design Components

### 1. Enhanced ReconcileOptions Interface

```typescript
interface ReconcileOptions {
  mode: 'in-place' | 'branch' | 'dry-run';
  autoApply: boolean;
  safeOnly: boolean;
  interactive: boolean;
  stagedOnly: boolean;
  baseBranch?: string;
  createBranch: boolean;  // false by default now
  delegate: boolean;  // NEW: Enable delegation mode
  delegateFormat: 'structured' | 'commands' | 'interactive';  // NEW: Delegation output format
}
```

**Key Changes:**
- `mode`: Defaults to 'in-place' instead of creating branches
- `createBranch`: Explicit opt-in for legacy branch creation behavior
- `stagedOnly`: Support for pre-commit hook integration
- `baseBranch`: Manual override for parent branch detection

### 2. Enhanced Git Integration

#### Smart Parent Branch Detection

```typescript
class EnhancedGitManager extends GitManager {
  /**
   * Detect parent branch using merge-base
   */
  getParentBranch(currentBranch: string): string {
    if (currentBranch === 'main' || currentBranch === 'master') {
      throw new Error('Cannot reconcile on main branch. Create a feature branch first.');
    }
    
    // Try common parent branches in order of preference
    const candidateParents = ['main', 'master', 'develop'];
    
    for (const parent of candidateParents) {
      try {
        const mergeBase = execSync(`git merge-base HEAD ${parent}`, {
          cwd: this.projectRoot,
          encoding: 'utf-8'
        }).trim();
        
        // Verify parent exists and is not the same as current
        if (mergeBase && mergeBase !== this.getCurrentCommit()) {
          return parent;
        }
      } catch {
        continue; // Try next candidate
      }
    }
    
    throw new Error('Could not detect parent branch. Use --base-branch to specify.');
  }
}
```

#### Recursive Change Analysis

```typescript
/**
 * Get all changes since branch diverged from parent
 */
getRecursiveChanges(baseBranch?: string): ChangeEvent[] {
  const currentBranch = this.getCurrentBranch();
  const parentBranch = baseBranch || this.getParentBranch(currentBranch);
  
  // Include working directory changes
  const workingDirChanges = this.getWorkingDirectoryChanges();
  const committedChanges = this.analyzeChanges(parentBranch, 'HEAD');
  
  return [...committedChanges, ...workingDirChanges];
}

/**
 * Get uncommitted changes (staged + unstaged)
 */
private getWorkingDirectoryChanges(): ChangeEvent[] {
  const changes: ChangeEvent[] = [];
  
  // Staged changes
  const stagedFiles = this.getStagedFiles();
  for (const file of stagedFiles) {
    changes.push(this.createChangeEvent(file, 'staged'));
  }
  
  // Unstaged changes  
  const unstagedFiles = this.getUnstagedFiles();
  for (const file of unstagedFiles) {
    changes.push(this.createChangeEvent(file, 'unstaged'));
  }
  
  return changes;
}
```

### 3. In-Place Reconciliation Engine

#### Core Reconciliation Flow

```typescript
/**
 * Modified reconciliation entry point
 */
async startReconciliation(options: ReconcileOptions = {}): Promise<ReconciliationSession> {
  const config = {
    mode: 'in-place',
    createBranch: false,
    autoApply: true,
    ...options
  };
  
  const currentBranch = this.gitManager.getCurrentBranch();
  
  // Prevent reconcile on main branch
  if (currentBranch === 'main' || currentBranch === 'master') {
    throw new Error('Cannot reconcile on main branch. Create a feature branch first.');
  }
  
  if (config.createBranch) {
    return this.reconcileWithNewBranch(currentBranch, config);
  } else {
    return this.reconcileInPlace(currentBranch, config);
  }
}

/**
 * In-place reconciliation implementation
 */
private async reconcileInPlace(currentBranch: string, config: ReconcileOptions): Promise<ReconciliationSession> {
  const parentBranch = config.baseBranch || this.gitManager.getParentBranch(currentBranch);
  
  // Get ALL changes since branching from parent
  const changes = config.stagedOnly 
    ? this.gitManager.getStagedChanges()
    : this.gitManager.getRecursiveChanges(parentBranch);
    
  const session: ReconciliationSession = {
    id: this.generateSessionId(),
    started: new Date(),
    status: 'in_progress',
    sourceBranch: currentBranch,
    reconciliationBranch: currentBranch, // Same branch now
    changes,
    results: [],
    mode: 'in_place'
  };
  
  // Process changes in-place
  for (const change of session.changes) {
    await this.processFileChange(session, change, config.autoApply);
  }
  
  return session;
}
```

### 4. Enhanced Command Interface

#### New Command Structure

```bash
knit reconcile [options]

Options:
  --mode <type>         Reconcile mode: in-place (default), branch, dry-run
  --auto-apply          Apply safe changes automatically (default: true)
  --safe-only          Only auto-apply SAFE_AUTO_APPLY changes
  --interactive        Prompt for each change (default: false)  
  --staged-only        Only reconcile staged changes
  --base-branch <name> Compare against specific branch (default: auto-detect)
  --create-branch      Create reconciliation branch (legacy mode)
  --dry-run            Show what would change without applying
```

#### Usage Examples

```bash
# Default: work in-place on current branch
knit reconcile

# Create reconciliation branch (legacy behavior)
knit reconcile --create-branch

# Pre-commit integration: only staged changes
knit reconcile --staged-only --auto-apply --safe-only

# Interactive review of all changes
knit reconcile --interactive

# See what would change without applying
knit reconcile --dry-run --verbose

# Force specific base branch
knit reconcile --base-branch develop
```

## Workflow Comparison

### Current Workflow (Problems)

```bash
# 1. Feature work
git checkout -b feature/api-update
vim design/api.md
git commit -m "Update API design"

# 2. Reconcile (creates branch cascade)
knit reconcile
# Creates: knit/reconcile-20240115-143022 (branched from feature/api-update)

# 3. More feature work
git checkout feature/api-update  
vim src/api/routes.ts
git commit -m "Implement API changes"

# 4. Another reconcile (creates nested branch)
knit reconcile
# Creates: knit/reconcile-20240115-151030 (branched from knit/reconcile-20240115-143022)

# Result: Complex nested branches that are hard to review
```

### New Workflow V2 (Solutions)

```bash
# 1. Feature work
git checkout -b feature/api-update
vim design/api.md
vim src/api/routes.ts

# 2. Reconcile in-place (sees ALL changes since branching from main)
knit reconcile
# ✅ Auto-applied 2 safe changes to dependent files
# ⚠️  1 change needs review

# 3. Continue working and commit everything together
git add .
git commit -m "Complete API update with reconciled dependencies"

# 4. Push single clean PR for review
git push origin feature/api-update

# Result: Single branch with complete, reviewable history
```

## Error Handling & Edge Cases

### Main Branch Protection

```typescript
private validateBranch(currentBranch: string): void {
  if (currentBranch === 'main' || currentBranch === 'master') {
    throw new Error(
      'Cannot reconcile on main branch. Create a feature branch first.\n' +
      'Example: git checkout -b feature/your-changes'
    );
  }
}
```

### Parent Branch Detection Failure

```typescript
private handleParentDetectionFailure(): void {
  throw new Error(
    'Could not auto-detect parent branch. Specify with --base-branch.\n' +
    'Example: knit reconcile --base-branch main'
  );
}
```

### Merge Conflicts During In-Place Application

```typescript
private async handleInPlaceConflicts(conflicts: ConflictEvent[]): Promise<void> {
  console.log('⚠️  Merge conflicts detected during in-place reconciliation:');
  
  for (const conflict of conflicts) {
    console.log(`   ${conflict.file}: ${conflict.description}`);
  }
  
  console.log('\nOptions:');
  console.log('1. Resolve conflicts manually and run: knit reconcile --continue');
  console.log('2. Skip conflicting changes: knit reconcile --skip-conflicts');  
  console.log('3. Use branch mode instead: knit reconcile --create-branch');
  
  process.exit(1);
}
```

## Configuration Changes

### New Default Configuration

```json
{
  "workflow": {
    "mode": "in-place",
    "createBranch": false,
    "autoApply": true,
    "safeOnly": false
  },
  "git": {
    "parentBranch": "auto-detect",
    "allowMainBranch": false
  },
  "autoApplyThreshold": 0.8,
  "reconciliation": {
    "includeUncommitted": true,
    "includeStagedOnly": false
  }
}
```

### Configuration Commands

```bash
# Set default mode
knit config --set workflow.mode=in-place

# Disable auto-apply by default
knit config --set workflow.autoApply=false

# Set specific parent branch
knit config --set git.parentBranch=develop

# Configure auto-apply threshold
knit config --set autoApplyThreshold=0.9
```

## Benefits Analysis

### 1. Eliminates Branch Cascading
- **Before**: `feature/api → knit/reconcile-1 → knit/reconcile-2`
- **After**: `feature/api` (all work in single branch)

### 2. Comprehensive Change Analysis  
- **Before**: Only sees last commit (`HEAD~1 → HEAD`)
- **After**: Sees all changes since branching (`main → HEAD`)

### 3. Flexible Development Integration
- **Before**: Must commit before reconciling
- **After**: Works with staged/unstaged changes

### 4. Cleaner PR Reviews
- **Before**: Multiple reconciliation PRs hard to track
- **After**: Single PR with complete feature + reconciliation

### 5. Better Developer Experience
- **Before**: Complex branch management required
- **After**: Simple `knit reconcile` on current branch

## Risk Mitigation

### Working Directory Safety
- Always check for uncommitted changes before major operations
- Provide `--dry-run` mode to preview changes
- Clear error messages for conflicting states

### Git State Management  
- Verify git repository before any operations
- Detect and handle detached HEAD state
- Safe branch switching with conflict detection

### Reconciliation Failures
- Atomic operations where possible
- Clear rollback procedures for failed reconciliations
- Detailed logging for debugging complex failures

## Enhanced Features

### 6. Intelligent Link Analysis

The KnitManager now includes a LinkAnalyzer for automatic dependency discovery:

```typescript
class KnitManager {
  private linkAnalyzer: LinkAnalyzer;

  /**
   * Analyze file for dependency link suggestions
   */
  async analyzeLinks(filePath?: string, options: {
    threshold?: number;
    autoAdd?: boolean;
    projectSetup?: boolean;
  } = {}): Promise<void> {
    const threshold = options.threshold || 0.7;
    const autoAddThreshold = 0.85;

    if (options.projectSetup) {
      // Full project analysis
      const result = await this.linkAnalyzer.analyzeProject(threshold, autoAddThreshold);
      console.log(`📊 Found ${result.suggestions.length} total suggestions`);
      console.log(`🚀 Auto-added ${result.autoAdded.length} high-confidence links`);
    } else if (filePath) {
      // Single file analysis
      const suggestions = await this.linkAnalyzer.analyzeFile(filePath, threshold);
      if (options.autoAdd) {
        const highConfidence = suggestions.filter(s => s.confidence >= autoAddThreshold);
        for (const suggestion of highConfidence) {
          await this.addDependency(suggestion.sourceFile, suggestion.targetFile);
        }
      }
    }
  }

  /**
   * Set up knit with intelligent initial links for new projects
   */
  async setupProject(): Promise<void> {
    await this.initialize();
    await this.analyzeLinks(undefined, { projectSetup: true, autoAdd: true });
  }
}
```

### 7. Delegation Mode

The reconciliation system now supports delegating complex reconciliation tasks to external AI systems like Claude Code:

```typescript
interface DelegationOutput {
  reconciliations: ReconciliationRequest[];
  summary: {
    totalRequests: number;
    highConfidence: number;
    requiresReview: number;
  };
}

// Usage examples
async reconcile(options: ReconcileOptions = {}): Promise<void> {
  if (options.delegate) {
    const delegationOutput = await this.reconciler.processReconciliation(session, false, true);
    await this.outputDelegationRequests(delegationOutput, options.delegateFormat || 'structured');
    return;
  }
  
  // Normal reconciliation continues...
}
```

**Delegation Output Formats:**
- **Structured JSON**: Machine-readable format for AI processing
- **Commands**: Executable CLI commands  
- **Interactive**: Human-readable prompts with context

### 8. Enhanced Configuration

Extended configuration schema supports the new features:

```json
{
  "workflow": {
    "mode": "in-place",
    "createBranch": false,
    "autoApply": true,
    "safeOnly": false
  },
  "delegation": {
    "enabled": true,
    "defaultMode": "structured",
    "contextLevel": "full"
  },
  "linkAnalysis": {
    "autoAnalyzeNewFiles": true,
    "confidenceThreshold": 0.75,
    "autoAddThreshold": 0.85,
    "patterns": "default",
    "watchForChanges": true
  },
  "claudeIntegration": {
    "enabled": true,
    "commands": ["/knit-reconcile", "/knit-analyze", "/knit-setup"],
    "autoTrigger": {
      "onFileCreate": true,
      "onSignificantChange": true,
      "significantChangeThreshold": 0.3
    }
  }
}
```

This enhanced workflow provides intelligent automation while maintaining the flexibility and safety that developers need for complex dependency reconciliation scenarios.

This design provides a robust foundation for the improved knit workflow while maintaining safety and clarity in all operations.