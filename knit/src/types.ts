// Core types for knit dependency reconciliation system

export interface DependencyGraph {
  dependencies: Record<string, FileDependency>;
  version: string;
  lastUpdated: Date;
}

export interface FileDependency {
  /** Files this file watches for changes */
  watches: string[];
  /** Files that watch this file for changes */
  watchedBy: string[];
  /** Last reconciled content hash */
  lastReconciledHash?: string;
  /** Reconciliation rules and configuration */
  reconciliationRules: ReconciliationRules;
}

export interface ReconciliationRules {
  /** Auto-apply changes with confidence above this threshold */
  autoApplyThreshold: number;
  /** Categories requiring human review */
  requireReview: ConflictType[];
  /** Custom rules for this file type */
  customRules?: Record<string, any>;
}

export interface ChangeEvent {
  filepath: string;
  oldHash: string;
  newHash: string;
  timestamp: Date;
  changeType: 'content' | 'metadata' | 'deletion';
  gitDiff?: string;
}

export interface ReconciliationResult {
  classification: ConflictType;
  confidence: number;
  reasoning: string;
  proposedChanges?: string;
  contradictions: string[];
  requiresReview: boolean;
  metadata: {
    sourceFile: string;
    targetFile: string;
    timestamp: Date;
    llmModel?: string;
    errorType?: string;
  };
}

export enum ConflictType {
  SAFE_AUTO_APPLY = 'safe',
  REVIEW_RECOMMENDED = 'review',
  REVIEW_REQUIRED = 'required',
  NO_ACTION = 'no_action'
}

export interface GitIntegration {
  currentBranch: string;
  reconciliationBranch?: string;
  hasUncommittedChanges: boolean;
  lastCommitHash: string;
}

export interface ReconciliationSession {
  id: string;
  started: Date;
  status: 'in_progress' | 'completed' | 'failed';
  sourceBranch: string;
  reconciliationBranch: string;
  changes: ChangeEvent[];
  results: ReconciliationResult[];
  autoApplied: number;
  reviewed: number;
  rejected: number;
  mode: 'in_place' | 'branch';
}

export interface ReconcileOptions {
  mode?: 'in-place' | 'branch' | 'dry-run';
  autoApply?: boolean;
  safeOnly?: boolean;
  interactive?: boolean;
  stagedOnly?: boolean;
  baseBranch?: string;
  createBranch?: boolean;
  delegate?: boolean;
  delegateFormat?: 'structured' | 'commands' | 'interactive';
}

export interface DelegationRequest {
  id: string;
  sourceFile: string;
  targetFile: string;
  changes: string;
  relationship: string;
  context: ProjectContext;
  prompt: string;
  confidence: number;
}

export interface ProjectContext {
  projectType: string;
  frameworks: string[];
  relatedFiles: string[];
  fileContent?: string;
}

export interface DelegationOutput {
  reconciliations: DelegationRequest[];
  summary: {
    totalRequests: number;
    highConfidence: number;
    requiresReview: number;
  };
}

export interface KnitConfig {
  /** Global auto-apply threshold */
  autoApplyThreshold: number;
  /** LLM configuration */
  llm: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };
  /** Git integration settings */
  git: {
    autoReconcile: boolean;
    branchPrefix: string;
    prTemplate?: string;
    parentBranch: string;
    allowMainBranch: boolean;
  };
  /** Workflow configuration */
  workflow: {
    mode: 'in-place' | 'branch';
    createBranch: boolean;
    autoApply: boolean;
    safeOnly: boolean;
  };
  /** Reconciliation behavior */
  reconciliation: {
    includeUncommitted: boolean;
    includeStagedOnly: boolean;
  };
  /** LLM delegation configuration */
  delegation: {
    enabled: boolean;
    defaultMode: 'structured' | 'commands' | 'interactive';
    contextLevel: 'minimal' | 'full';
  };
  /** Link analysis configuration */
  linkAnalysis: {
    autoAnalyzeNewFiles: boolean;
    confidenceThreshold: number;
    autoAddThreshold: number;
    patterns: 'default' | string; // Path to custom patterns or 'default'
    watchForChanges: boolean;
  };
  /** Claude Code integration */
  claudeIntegration: {
    enabled: boolean;
    commands: string[];
    autoTrigger: {
      onFileCreate: boolean;
      onSignificantChange: boolean;
      significantChangeThreshold: number;
    };
  };
  /** File patterns to ignore */
  ignore: string[];
  /** Custom reconciliation rules by file pattern */
  rules: Record<string, ReconciliationRules>;
}

export interface LLMAnalysis {
  needsUpdate: boolean;
  changesNeeded: string;
  category: 'documentation' | 'implementation' | 'interface' | 'breaking';
  confidence: number;
  contradictions: string[];
  classification: ConflictType;
  proposedDiff?: string;
}