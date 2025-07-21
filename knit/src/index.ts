// Main exports for knit dependency reconciliation system

export { KnitManager } from './core/knit-manager';
export { DependencyGraphManager } from './core/dependency-graph';
export { GitManager } from './core/git-integration';
export { HashTracker } from './core/hash-tracker';
export { GitReconciler } from './reconciliation/git-reconciler';
export { LLMClient } from './reconciliation/llm-client';

export * from './types';

// Default export for programmatic usage
export { KnitManager as default } from './core/knit-manager';