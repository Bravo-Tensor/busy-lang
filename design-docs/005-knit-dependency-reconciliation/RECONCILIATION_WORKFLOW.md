# Reconciliation Workflow Design

## Overview

The reconciliation workflow leverages git branches to manage dependency reconciliation. All reconciliation changes are made on a dedicated branch, reviewed through standard git workflow, and merged back to maintain a clean, reviewable history.

## Git-Integrated Workflow

```
Primary Change → Reconciliation Branch → LLM Analysis → Git Review → Merge
      ↓                    ↓                ↓            ↓         ↓
   Feature Work        knit/reconcile   Apply Changes   PR Review  Complete
```

## Detailed Workflow

### 1. Primary Change Detection
```bash
# User makes changes on feature branch
git checkout feature/api-redesign
# ... make changes to design/api.md ...
git add design/api.md
git commit -m "Redesign API endpoints"

# Knit detects changes and initiates reconciliation
knit reconcile
```

**Change Detection Sources:**
- Manual trigger: `knit reconcile` after committing changes
- Git hook integration: automatic reconciliation on commit/merge
- Scheduled reconciliation: periodic dependency checking

### 2. Reconciliation Branch Creation
```bash
# Knit automatically creates reconciliation branch
git checkout -b knit/reconcile-$(date +%Y%m%d-%H%M%S)
# Branch naming: knit/reconcile-20240115-143022
```

**Branch Strategy:**
- **Isolation**: All reconciliation changes isolated from primary work
- **Traceability**: Clear naming shows reconciliation timestamp
- **Cleanup**: Automatic branch deletion after merge

### 3. Impact Analysis & LLM Reconciliation
```bash
# On reconciliation branch, analyze what changed
git diff feature/api-redesign -- design/api.md

# Knit identifies dependent files and applies LLM analysis
# Auto-applies safe changes, flags complex changes for review
knit analyze --auto-apply-safe
```

**Git-Aware Analysis:**
```typescript
function analyzeGitChanges(): GitImpactAnalysis {
  // Get diff from source branch
  const changes = execSync('git diff HEAD~1 --name-only').toString().split('\n');
  
  // For each changed file, find dependencies
  const analysis = changes.map(file => ({
    changedFile: file,
    gitDiff: execSync(`git diff HEAD~1 -- ${file}`).toString(),
    dependents: getDependentFiles(file),
    reconciliationNeeded: assessReconciliationNeed(file)
  }));
  
  return analysis;
}
```

**Change Types:**
- **Git-tracked changes**: Diff-based analysis from actual commits
- **Dependency propagation**: Systematic traversal of dependent files
- **Conflict detection**: LLM analysis of change compatibility

### 4. Git Review Process
```bash
# After LLM analysis and auto-application of safe changes
git add .
git commit -m "knit: reconcile dependencies for API redesign

Auto-applied:
- Updated src/api/routes.ts endpoint signatures
- Refreshed tests/api.test.ts test cases

Review required:
- Breaking change in client/api-client.ts requires manual attention"

# Create pull request for review
git push origin knit/reconcile-20240115-143022
gh pr create --base feature/api-redesign \
  --title "Dependency reconciliation for API redesign" \
  --body "Automated reconciliation of dependent files. Review breaking changes before merge."
```

**Review Workflow:**
1. **Automated Changes**: Safe updates applied automatically on reconciliation branch
2. **Flagged Changes**: Complex updates marked in commit message for reviewer attention
3. **Standard PR Review**: Use existing git workflow (GitHub, GitLab, etc.)
4. **Merge Back**: Approved reconciliation merged into original feature branch

### 5. Git-Integrated Conflict Resolution

**For Auto-Applied Changes:**
```bash
# Knit applies safe changes directly
echo "Updated endpoint signature" >> src/api/routes.ts
git add src/api/routes.ts
```

**For Review-Required Changes:**
```bash
# Knit creates placeholder commits with guidance
git commit --allow-empty -m "knit: REVIEW REQUIRED - Breaking change in client/api-client.ts

Change: Removed deprecated 'userId' parameter from /users endpoint
Impact: Client code still references removed parameter
Action: Update client to use new 'id' parameter or maintain backward compatibility

File: client/api-client.ts:45
Suggested fix: Replace 'userId' with 'id' in request payload"
```

### 4. Conflict Classification Engine

**Classification Logic:**
```typescript
interface ReconciliationResult {
  classification: ConflictType;
  confidence: number;
  reasoning: string;
  proposedChanges?: string;
  contradictions: string[];
  requiresReview: boolean;
}

function classifyReconciliation(analysis: LLMAnalysis): ConflictType {
  // Breaking changes always require review
  if (analysis.category === 'breaking' || analysis.contradictions.length > 0) {
    return ConflictType.REVIEW_REQUIRED;
  }
  
  // Low confidence requires review
  if (analysis.confidence < 0.7) {
    return ConflictType.REVIEW_RECOMMENDED;
  }
  
  // Documentation and non-breaking implementation safe for auto-apply
  if (analysis.category === 'documentation' || 
      (analysis.category === 'implementation' && analysis.confidence > 0.9)) {
    return ConflictType.SAFE_AUTO_APPLY;
  }
  
  return ConflictType.REVIEW_RECOMMENDED;
}
```

### 5. Human Review Interface

**Review Queue Structure:**
```json
{
  "pending_reviews": [
    {
      "id": "review_001",
      "timestamp": "2024-01-15T10:30:00Z",
      "changed_file": "design/api.md",
      "dependent_file": "src/api/routes.ts",
      "classification": "REVIEW_REQUIRED",
      "reasoning": "Breaking change: endpoint signature modified",
      "contradictions": [
        "New required parameter conflicts with existing client usage"
      ],
      "proposed_changes": "// diff of proposed changes",
      "human_decision": null
    }
  ]
}
```

**Review Commands:**
```bash
# Show pending reviews
knit review

# Approve specific review
knit approve review_001

# Reject with reason
knit reject review_001 "Need to maintain backward compatibility"

# Modify and approve
knit edit review_001  # Opens editor for manual changes
knit approve review_001

# Batch approve safe changes
knit approve --safe  # Only REVIEW_RECOMMENDED items
```

### 6. Resolution Application

**Auto-Application (Safe Changes):**
```typescript
async function applyReconciliation(result: ReconciliationResult): Promise<void> {
  if (result.classification === ConflictType.SAFE_AUTO_APPLY) {
    await applyChanges(result.proposedChanges);
    await updateReconciledState(result.dependentFile);
    logReconciliation(result, 'auto_applied');
  }
}
```

**Manual Resolution:**
```typescript
interface HumanDecision {
  action: 'approve' | 'reject' | 'modify';
  modifiedChanges?: string;
  reasoning: string;
  timestamp: Date;
}

async function applyHumanDecision(
  reviewId: string, 
  decision: HumanDecision
): Promise<void> {
  const review = getReview(reviewId);
  
  switch (decision.action) {
    case 'approve':
      await applyChanges(review.proposedChanges);
      break;
    case 'modify':
      await applyChanges(decision.modifiedChanges);
      break;
    case 'reject':
      // No changes applied, mark as manually resolved
      break;
  }
  
  await updateReconciledState(review.dependentFile);
  logReconciliation(review, decision.action, decision.reasoning);
}
```

## State Management

### Reconciliation Tracking
```json
{
  "reconciliations": {
    "session_001": {
      "started": "2024-01-15T10:00:00Z",
      "status": "in_progress",
      "changes": [
        {
          "file": "design/api.md",
          "hash_before": "sha256:abc123",
          "hash_after": "sha256:def456",
          "dependents_processed": ["src/api/routes.ts"],
          "auto_applied": 2,
          "reviewed": 1,
          "rejected": 0
        }
      ]
    }
  }
}
```

### Atomic Commits
```bash
# Knit coordinates with git for atomic operations
knit commit "Reconcile API design changes"
# Results in:
# 1. Apply all approved reconciliations
# 2. Update .knit/ state
# 3. Git commit with reconciliation metadata
```

## Error Handling & Recovery

### LLM Failures
```typescript
async function handleLLMFailure(analysis: ChangeEvent): Promise<void> {
  // Fallback strategies
  const fallback = {
    classification: ConflictType.REVIEW_REQUIRED,
    reasoning: "LLM analysis unavailable - manual review required",
    confidence: 0.0
  };
  
  await queueForManualReview(analysis, fallback);
}
```

### Reconciliation Conflicts
```typescript
interface ReconciliationConflict {
  type: 'cycle_detected' | 'concurrent_changes' | 'state_corruption';
  affectedFiles: string[];
  resolutionStrategy: 'manual_intervention' | 'automatic_repair' | 'rollback';
}
```

### Recovery Procedures
1. **State Corruption**: Rebuild .knit/ from filesystem scan
2. **Dependency Cycles**: Break cycle with human intervention
3. **Concurrent Modifications**: Use last-writer-wins with conflict notification
4. **LLM Unavailable**: Queue all changes for manual review

## Metrics & Monitoring

### Success Metrics
- **Auto-application rate**: % of changes applied without human intervention
- **Reconciliation accuracy**: Human approval rate for LLM recommendations
- **Time to reconciliation**: Average time from change to resolution
- **Conflict detection rate**: % of actual conflicts identified

### Monitoring Dashboard
```typescript
interface ReconciliationMetrics {
  totalReconciliations: number;
  autoApplied: number;
  humanReviewed: number;
  averageConfidence: number;
  commonConflictTypes: string[];
  mostProblematicFiles: string[];
}
```

## Complete Git-Integrated Workflow Example

```bash
# 1. Start with feature work
git checkout -b feature/api-redesign
vim design/api.md  # Make design changes
git add design/api.md
git commit -m "Redesign user API endpoints"

# 2. Trigger reconciliation
knit reconcile
# Output: Created reconciliation branch: knit/reconcile-20240115-143022
# Output: Analyzing dependencies...
# Output: Auto-applied 3 safe changes, 1 flagged for review

# 3. Review reconciliation branch
git log --oneline
# abc123 knit: reconcile dependencies for API redesign  
# def456 Redesign user API endpoints

# 4. Push reconciliation for review
git push origin knit/reconcile-20240115-143022
gh pr create --base feature/api-redesign \
  --title "Auto-reconciliation: API redesign dependencies" \
  --body "Automated dependency updates. Please review flagged changes."

# 5. Reviewer reviews PR, approves/modifies
# 6. Merge reconciliation back to feature branch
git checkout feature/api-redesign
git merge knit/reconcile-20240115-143022
git branch -d knit/reconcile-20240115-143022

# 7. Continue with feature work or merge to main
git checkout main
git merge feature/api-redesign
```

## Updated Command Interface

```bash
# Core reconciliation
knit reconcile [--auto-apply] [--branch-name custom-name]

# Status and review  
knit status                    # Show current reconciliation state
knit review                    # Show flagged changes in current reconciliation
knit conflicts                 # Show unresolved conflicts

# Git integration
knit merge [branch]            # Merge reconciliation branch back
knit cleanup                   # Delete old reconciliation branches
knit config --auto-reconcile  # Set up git hooks for automatic reconciliation
```

## Benefits of Git-Integrated Approach

1. **Familiar Workflow**: Uses existing git/PR review processes
2. **Clean History**: Reconciliation changes are clearly separated and reviewable
3. **Rollback Capability**: Easy to revert reconciliation if needed
4. **Team Collaboration**: Multiple reviewers can collaborate on reconciliation
5. **Audit Trail**: Complete history of what was changed and why
6. **Tool Integration**: Works with existing git tooling (GitHub, GitLab, etc.)

This git-integrated workflow provides the bidirectional coherence benefits while maintaining familiar development practices and enabling team collaboration through standard review processes.