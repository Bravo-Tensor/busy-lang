import { execSync } from 'child_process';
import * as path from 'path';
import { GitIntegration, ChangeEvent } from '../types';

export class GitManager {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Check if current directory is a git repository
   */
  isGitRepository(): boolean {
    try {
      execSync('git rev-parse --git-dir', { 
        cwd: this.projectRoot, 
        stdio: 'ignore' 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current git status
   */
  getGitStatus(): GitIntegration {
    try {
      const currentBranch = execSync('git branch --show-current', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();

      const hasUncommittedChanges = this.hasUncommittedChanges();

      const lastCommitHash = execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();

      return {
        currentBranch,
        hasUncommittedChanges,
        lastCommitHash
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create reconciliation branch
   */
  createReconciliationBranch(baseBranch?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const branchName = `knit/reconcile-${timestamp}`;
    
    try {
      if (baseBranch) {
        execSync(`git checkout -b ${branchName} ${baseBranch}`, {
          cwd: this.projectRoot,
          stdio: 'ignore'
        });
      } else {
        execSync(`git checkout -b ${branchName}`, {
          cwd: this.projectRoot,
          stdio: 'ignore'
        });
      }

      return branchName;
    } catch (error) {
      throw new Error(`Failed to create reconciliation branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Switch to branch
   */
  switchToBranch(branchName: string): void {
    try {
      execSync(`git checkout ${branchName}`, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
    } catch (error) {
      throw new Error(`Failed to switch to branch ${branchName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get git diff for specific files
   */
  getDiff(fromRef: string, toRef: string, filepath?: string): string {
    try {
      const pathArg = filepath ? ` -- ${filepath}` : '';
      return execSync(`git diff ${fromRef}..${toRef}${pathArg}`, {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
    } catch (error) {
      throw new Error(`Failed to get git diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get changed files between refs
   */
  getChangedFiles(fromRef: string, toRef: string): string[] {
    try {
      const output = execSync(`git diff --name-only ${fromRef}..${toRef}`, {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
      
      return output.trim().split('\n').filter(line => line.length > 0);
    } catch (error) {
      throw new Error(`Failed to get changed files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze changes and create ChangeEvents
   */
  analyzeChanges(fromRef: string, toRef: string): ChangeEvent[] {
    const changedFiles = this.getChangedFiles(fromRef, toRef);
    const events: ChangeEvent[] = [];

    for (const file of changedFiles) {
      try {
        const gitDiff = this.getDiff(fromRef, toRef, file);
        
        // Get file hashes
        const oldHash = this.getFileHash(fromRef, file);
        const newHash = this.getFileHash(toRef, file);

        events.push({
          filepath: file,
          oldHash: oldHash || '',
          newHash: newHash || '',
          timestamp: new Date(),
          changeType: this.determineChangeType(gitDiff),
          gitDiff
        });
      } catch (error) {
        console.warn(`Warning: Could not analyze changes for ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return events;
  }

  /**
   * Get file hash at specific ref
   */
  private getFileHash(ref: string, filepath: string): string | null {
    try {
      return execSync(`git rev-parse ${ref}:${filepath}`, {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      }).trim();
    } catch {
      return null; // File doesn't exist at this ref
    }
  }

  /**
   * Determine change type from git diff
   */
  private determineChangeType(gitDiff: string): 'content' | 'metadata' | 'deletion' {
    if (gitDiff.includes('deleted file mode')) {
      return 'deletion';
    }
    
    // Simple heuristic: if diff has many +/- lines, it's content
    // Otherwise, it might be metadata (permissions, etc.)
    const lines = gitDiff.split('\n');
    const contentLines = lines.filter(line => line.startsWith('+') || line.startsWith('-'));
    
    return contentLines.length > 0 ? 'content' : 'metadata';
  }

  /**
   * Check if there are uncommitted changes
   */
  hasUncommittedChanges(): boolean {
    try {
      const output = execSync('git status --porcelain', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Commit changes with message
   */
  commit(message: string, files?: string[]): void {
    try {
      if (files && files.length > 0) {
        // Add specific files
        for (const file of files) {
          execSync(`git add ${file}`, {
            cwd: this.projectRoot,
            stdio: 'ignore'
          });
        }
      } else {
        // Add all changes
        execSync('git add .', {
          cwd: this.projectRoot,
          stdio: 'ignore'
        });
      }

      execSync(`git commit -m \"${message}\"`, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Merge branch into current branch
   */
  merge(branchName: string, message?: string): void {
    try {
      const mergeCommand = message 
        ? `git merge ${branchName} -m \"${message}\"`
        : `git merge ${branchName}`;
        
      execSync(mergeCommand, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
    } catch (error) {
      throw new Error(`Failed to merge branch ${branchName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete branch
   */
  deleteBranch(branchName: string, force = false): void {
    try {
      const deleteFlag = force ? '-D' : '-d';
      execSync(`git branch ${deleteFlag} ${branchName}`, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
    } catch (error) {
      throw new Error(`Failed to delete branch ${branchName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Push branch to remote
   */
  pushBranch(branchName: string, remote = 'origin'): void {
    try {
      execSync(`git push ${remote} ${branchName}`, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
    } catch (error) {
      throw new Error(`Failed to push branch ${branchName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if branch exists
   */
  branchExists(branchName: string): boolean {
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, {
        cwd: this.projectRoot,
        stdio: 'ignore'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of reconciliation branches
   */
  getReconciliationBranches(): string[] {
    try {
      const output = execSync('git branch --list \"knit/reconcile-*\"', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
      
      return output
        .split('\n')
        .map(line => line.replace(/^\*?\s+/, '').trim())
        .filter(line => line.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Clean up old reconciliation branches
   */
  cleanupReconciliationBranches(keepCount = 5): number {
    const branches = this.getReconciliationBranches();
    
    if (branches.length <= keepCount) {
      return 0;
    }

    // Sort by timestamp (newest first) and keep only the specified count
    const sortedBranches = branches.sort().reverse();
    const branchesToDelete = sortedBranches.slice(keepCount);

    let deleted = 0;
    for (const branch of branchesToDelete) {
      try {
        this.deleteBranch(branch, true);
        deleted++;
      } catch (error) {
        console.warn(`Warning: Could not delete branch ${branch}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return deleted;
  }
}