# Knit Workflow V2 Implementation Plan

## Overview

This implementation plan covers the core architectural changes needed to transform knit from branch-based reconciliation to in-place reconciliation with recursive change detection.

**Scope**: Phases 1-3 only (excluding integration points like pre-commit hooks and NPM scripts)

## Phase 1: Core Architecture Changes (Week 1-2)

### Task 1.1: Enhance ReconcileOptions Interface
**File**: `src/types.ts`
**Effort**: 1 day

```typescript
// Add new interface properties
interface ReconcileOptions {
  mode: 'in-place' | 'branch' | 'dry-run';
  autoApply: boolean;
  safeOnly: boolean;
  interactive: boolean;
  stagedOnly: boolean;
  baseBranch?: string;
  createBranch: boolean;  // false by default
}

// Update ReconciliationSession to track mode
interface ReconciliationSession {
  // ... existing properties
  mode: 'in_place' | 'branch';
  reconciliationBranch: string; // Can be same as sourceBranch now
}
```

### Task 1.2: Update GitReconciler.startReconciliation()
**File**: `src/reconciliation/git-reconciler.ts`
**Effort**: 2-3 days

```typescript
async startReconciliation(options: ReconcileOptions = {}): Promise<ReconciliationSession> {
  const config = {
    mode: 'in-place',
    createBranch: false,
    autoApply: true,
    safeOnly: false,
    interactive: false,
    stagedOnly: false,
    ...options
  };
  
  const currentBranch = this.gitManager.getCurrentBranch();
  this.validateBranch(currentBranch);
  
  if (config.createBranch) {
    return this.reconcileWithNewBranch(currentBranch, config);
  } else {
    return this.reconcileInPlace(currentBranch, config);
  }
}

private validateBranch(currentBranch: string): void {
  if (currentBranch === 'main' || currentBranch === 'master') {
    throw new Error('Cannot reconcile on main branch. Create a feature branch first.');
  }
}
```

### Task 1.3: Implement reconcileInPlace() Method
**File**: `src/reconciliation/git-reconciler.ts`
**Effort**: 2-3 days

```typescript
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
    reconciliationBranch: currentBranch, // Same branch
    changes,
    results: [],
    mode: 'in_place',
    autoApplied: 0,
    reviewed: 0,
    rejected: 0
  };
  
  return session;
}
```

## Phase 2: Enhanced Git Integration (Week 2-3)

### Task 2.1: Implement Parent Branch Detection  
**File**: `src/core/git-integration.ts`
**Effort**: 2 days

```typescript
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

private getCurrentCommit(): string {
  return execSync('git rev-parse HEAD', {
    cwd: this.projectRoot,
    encoding: 'utf-8'
  }).trim();
}
```

### Task 2.2: Implement Recursive Change Detection
**File**: `src/core/git-integration.ts`  
**Effort**: 3-4 days

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

private getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only', {
      cwd: this.projectRoot,
      encoding: 'utf-8'
    });
    return output.trim().split('\n').filter(line => line.length > 0);
  } catch {
    return [];
  }
}

private getUnstagedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only', {
      cwd: this.projectRoot,
      encoding: 'utf-8'
    });
    return output.trim().split('\n').filter(line => line.length > 0);
  } catch {
    return [];
  }
}

private createChangeEvent(file: string, type: 'staged' | 'unstaged'): ChangeEvent {
  return {
    filepath: file,
    oldHash: '', // Will be computed based on git state
    newHash: '',
    timestamp: new Date(),
    changeType: 'content',
    gitDiff: this.getDiffForFile(file, type)
  };
}

private getDiffForFile(file: string, type: 'staged' | 'unstaged'): string {
  const flag = type === 'staged' ? '--cached' : '';
  try {
    return execSync(`git diff ${flag} -- ${file}`, {
      cwd: this.projectRoot,
      encoding: 'utf-8'
    });
  } catch {
    return '';
  }
}
```

### Task 2.3: Add Staged-Only Mode Support
**File**: `src/core/git-integration.ts`
**Effort**: 1 day

```typescript
/**
 * Get only staged changes for pre-commit integration
 */
getStagedChanges(): ChangeEvent[] {
  const stagedFiles = this.getStagedFiles();
  return stagedFiles.map(file => this.createChangeEvent(file, 'staged'));
}
```

## Phase 3: CLI Updates and Error Handling (Week 3-4)

### Task 3.1: Update CLI Command Interface
**File**: `src/cli/index.ts`
**Effort**: 2-3 days

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .command('reconcile')
  .description('Reconcile dependencies')
  .option('--mode <type>', 'Reconcile mode: in-place (default), branch, dry-run', 'in-place')
  .option('--auto-apply', 'Apply safe changes automatically', true)
  .option('--no-auto-apply', 'Disable automatic application of changes')
  .option('--safe-only', 'Only auto-apply SAFE_AUTO_APPLY changes', false)
  .option('--interactive', 'Prompt for each change', false)
  .option('--staged-only', 'Only reconcile staged changes', false)
  .option('--base-branch <name>', 'Compare against specific branch (default: auto-detect)')
  .option('--create-branch', 'Create reconciliation branch (legacy mode)', false)
  .option('--dry-run', 'Show what would change without applying', false)
  .action(async (options) => {
    try {
      const reconciler = new GitReconciler(/* ... */);
      const session = await reconciler.startReconciliation(options);
      
      if (options.dryRun) {
        console.log('Dry run - changes that would be made:');
        session.results.forEach(result => {
          console.log(`  ${result.metadata.targetFile}: ${result.reasoning}`);
        });
      } else {
        await reconciler.processReconciliation(session, options.autoApply);
        console.log(`✅ Reconciliation completed on branch: ${session.sourceBranch}`);
      }
    } catch (error) {
      console.error(`❌ Reconciliation failed: ${error.message}`);
      process.exit(1);
    }
  });
```

### Task 3.2: Enhanced Error Handling
**File**: `src/reconciliation/git-reconciler.ts`
**Effort**: 2 days

```typescript
/**
 * Enhanced error handling for in-place reconciliation
 */
private async handleReconciliationError(error: Error, session: ReconciliationSession): Promise<void> {
  console.error(`❌ Reconciliation failed: ${error.message}`);
  
  if (error.message.includes('merge conflict')) {
    console.log('\n📋 Conflict Resolution Options:');
    console.log('1. Resolve conflicts manually and run: knit reconcile --continue');
    console.log('2. Skip conflicting changes: knit reconcile --skip-conflicts');  
    console.log('3. Use branch mode instead: knit reconcile --create-branch');
  }
  
  if (error.message.includes('parent branch')) {
    console.log('\n📋 Parent Branch Options:');
    console.log('1. Specify parent explicitly: knit reconcile --base-branch main');
    console.log('2. Check available branches: git branch -a');
  }
  
  // Save session state for recovery
  await this.saveSession(session);
}

/**
 * Validate preconditions before reconciliation
 */
private async validatePreconditions(options: ReconcileOptions): Promise<void> {
  const gitStatus = this.gitManager.getGitStatus();
  const currentBranch = gitStatus.currentBranch;
  
  // Validate branch
  this.validateBranch(currentBranch);
  
  // Check for conflicts in working directory
  if (this.gitManager.hasUncommittedChanges() && !options.stagedOnly && !options.mode.includes('place')) {
    console.warn('⚠️  You have uncommitted changes. In-place mode will include them in analysis.');
    console.log('   Use --staged-only to reconcile only staged changes, or commit/stash changes first.');
  }
  
  // Verify parent branch detection
  try {
    const parentBranch = options.baseBranch || this.gitManager.getParentBranch(currentBranch);
    console.log(`📊 Analyzing changes since branching from: ${parentBranch}`);
  } catch (error) {
    throw new Error(`Parent branch detection failed: ${error.message}`);
  }
}
```

### Task 3.3: Update Configuration System
**File**: `src/core/knit-manager.ts`
**Effort**: 1-2 days

```typescript
interface KnitConfig {
  // ... existing config
  workflow: {
    mode: 'in-place' | 'branch';
    createBranch: boolean;
    autoApply: boolean;
    safeOnly: boolean;
  };
  git: {
    parentBranch: string; // 'auto-detect' or specific branch name
    allowMainBranch: boolean;
  };
  reconciliation: {
    includeUncommitted: boolean;
    includeStagedOnly: boolean;
  };
}

// Default configuration
const defaultConfig: KnitConfig = {
  workflow: {
    mode: 'in-place',
    createBranch: false,
    autoApply: true,
    safeOnly: false
  },
  git: {
    parentBranch: 'auto-detect',
    allowMainBranch: false
  },
  reconciliation: {
    includeUncommitted: true,
    includeStagedOnly: false
  },
  autoApplyThreshold: 0.8,
  // ... rest of existing config
};
```

## Testing Strategy

### Unit Tests
**Effort**: 2-3 days throughout implementation

```typescript
// Test files to create/update:
describe('EnhancedGitManager', () => {
  describe('getParentBranch', () => {
    it('should detect main as parent for feature branch');
    it('should detect develop as parent when main does not exist');
    it('should throw error for main branch');
    it('should throw error when no parent detected');
  });
  
  describe('getRecursiveChanges', () => {
    it('should include committed changes since parent');
    it('should include staged changes when present');
    it('should include unstaged changes when present');
    it('should handle empty change sets');
  });
});

describe('GitReconciler', () => {
  describe('reconcileInPlace', () => {
    it('should work on current branch');
    it('should analyze changes against parent branch');
    it('should handle staged-only mode');
    it('should validate branch before reconciliation');
  });
});
```

### Integration Tests
**Effort**: 1-2 days

```typescript
// Test scenarios:
describe('End-to-End Workflow', () => {
  it('should reconcile feature branch in-place');
  it('should handle pre-commit staged-only workflow');
  it('should work with multiple commits on feature branch');
  it('should handle merge conflicts gracefully');
});
```

## Rollout Plan

### Phase 1 Rollout (Week 1-2)
1. Implement core architecture changes
2. Basic unit testing
3. Manual testing with simple scenarios

### Phase 2 Rollout (Week 2-3) 
1. Enhanced git integration
2. Integration testing
3. Test with complex branching scenarios

### Phase 3 Rollout (Week 3-4)
1. CLI updates and error handling
2. End-to-end testing
3. Documentation updates
4. Final validation

## Success Criteria

### Functional Requirements
- ✅ In-place reconciliation works without creating branches
- ✅ Recursive change detection sees all changes since parent branch
- ✅ Staged-only mode works for pre-commit integration
- ✅ Comprehensive error handling and validation

### Performance Requirements  
- ✅ Reconciliation completes in <30s for typical projects
- ✅ Memory usage remains reasonable for large change sets
- ✅ Git operations are optimized and batched where possible

### User Experience Requirements
- ✅ Clear error messages guide users to resolution
- ✅ Progress feedback during long operations
- ✅ Intuitive command-line interface

This implementation plan provides a clear roadmap for delivering the core knit workflow improvements without advanced integration features, focusing on the essential architectural changes that solve the branch cascading and change detection problems.