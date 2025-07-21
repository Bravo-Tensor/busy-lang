export interface ConversationIntent {
  type: 'discovery' | 'modification' | 'analysis' | 'execution' | 'help';
  confidence: number;
  entities: ExtractedEntity[];
  businessContext: BusinessContext;
  originalText: string;
}

export interface ExtractedEntity {
  type: 'process' | 'role' | 'timeline' | 'resource' | 'metric';
  value: string;
  busyFileReference?: string;
  confidence: number;
}

export interface BusinessContext {
  industry: string;
  businessSize: 'solo' | 'small' | 'medium' | 'enterprise';
  currentProcesses: Map<string, BusyProcess>;
  executionMetrics: ProcessMetrics[];
  recentModifications: ModificationHistory[];
  userRole: UserRole;
  conversationGoals: string[];
  sessionId: string;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  userInput: string;
  aiResponse: AIResponse;
  intent: ConversationIntent;
  context: BusinessContext;
  actions: BusyFileModification[];
  feedback?: UserFeedback;
}

export interface AIResponse {
  message: string;
  proposedActions: BusyFileModification[];
  knitAnalysis?: KnitImpactAnalysis;
  confidenceLevel: number;
  requiresApproval: boolean;
  visualizations?: ProcessVisualization[];
  suggestedQuestions?: string[];
}

export interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  helpful: boolean;
  comments?: string;
  actionTaken: 'approved' | 'rejected' | 'modified' | 'deferred';
}

// Business Process Types
export interface BusyProcess {
  id: string;
  name: string;
  type: string;
  layer: 'L0' | 'L1' | 'L2';
  domain: string;
  filePath: string;
  content: string;
  metadata: ProcessMetadata;
  dependencies: ProcessDependency[];
  performance: ProcessPerformance;
}

export interface ProcessMetadata {
  version: string;
  lastModified: Date;
  author: string;
  description: string;
  tags: string[];
  estimatedDuration: number;
  complexity: 'low' | 'medium' | 'high';
}

export interface ProcessDependency {
  id: string;
  type: 'requires' | 'uses' | 'produces';
  target: string;
  critical: boolean;
}

export interface ProcessPerformance {
  executionCount: number;
  averageDuration: number;
  successRate: number;
  lastExecuted?: Date;
  bottlenecks: string[];
}

// Interview Framework Types
export interface InterviewTemplate {
  industry: string;
  questions: DiscoveryQuestion[];
  followUpLogic: QuestionFlow;
  busyTemplates: BusyProcessTemplate[];
}

export interface DiscoveryQuestion {
  id: string;
  text: string;
  type: 'open' | 'choice' | 'scale' | 'priority';
  options?: string[];
  dependsOn?: string[];
  mapsTo: BusyElementMapping;
  priority: 'high' | 'medium' | 'low';
}

export interface BusyElementMapping {
  busyElement: string;
  attribute: string;
  transformation?: (value: any) => any;
}

export interface QuestionFlow {
  [key: string]: string[];
}

export interface BusyProcessTemplate {
  id: string;
  name: string;
  industry: string;
  layer: 'L0' | 'L1' | 'L2';
  template: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description: string;
}

// Modification Types
export interface BusyFileModification {
  id: string;
  type: 'create' | 'update' | 'delete';
  filePath: string;
  changes: FileChange[];
  reason: string;
  impact: ModificationImpact;
  timestamp: Date;
}

export interface FileChange {
  operation: 'add' | 'remove' | 'modify';
  path: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

export interface ModificationImpact {
  scope: 'local' | 'module' | 'system';
  affectedProcesses: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: number;
  breakingChanges: boolean;
}

export interface ModificationHistory {
  id: string;
  timestamp: Date;
  modifications: BusyFileModification[];
  userContext: string;
  outcome: 'success' | 'partial' | 'failed' | 'reverted';
  metrics: ModificationMetrics;
}

export interface ModificationMetrics {
  timeToImplement: number;
  processesAffected: number;
  performanceImpact: number;
  userSatisfaction: number;
}

// Process Visualization Types
export interface ProcessVisualization {
  type: 'flowchart' | 'timeline' | 'dependency-graph' | 'metrics-dashboard';
  data: any;
  config: VisualizationConfig;
}

export interface VisualizationConfig {
  width?: number;
  height?: number;
  interactive: boolean;
  theme: 'light' | 'dark';
  animation: boolean;
}

// Metrics and Analytics Types
export interface ProcessMetrics {
  processId: string;
  timestamp: Date;
  duration: number;
  efficiency: number;
  qualityScore: number;
  resourceUtilization: number;
  customerSatisfaction?: number;
  errors: ProcessError[];
}

export interface ProcessError {
  type: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

// User Management Types
export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
  businessDomains: string[];
}

export interface Permission {
  action: 'read' | 'write' | 'execute' | 'approve' | 'admin';
  scope: 'own' | 'team' | 'organization';
  resource: 'processes' | 'modifications' | 'analytics' | 'settings';
}

// Knit Integration Types
export interface KnitImpactAnalysis {
  hasBreakingChanges: boolean;
  requiresApproval: boolean;
  dependentProcesses: DependentProcess[];
  reconciliationPlan: ReconciliationAction[];
  riskAssessment: RiskAssessment;
  estimatedTime: number;
}

export interface DependentProcess {
  processId: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  changesRequired: ProcessChange[];
  autoReconcilable: boolean;
}

export interface ProcessChange {
  type: string;
  description: string;
  automated: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ReconciliationAction {
  id: string;
  type: 'auto-apply' | 'review-required' | 'manual-intervention';
  description: string;
  processId: string;
  changes: ProcessChange[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface RiskAssessment {
  overall: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  mitigations: RiskMitigation[];
}

export interface RiskFactor {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
}

export interface RiskMitigation {
  riskType: string;
  strategy: string;
  effectiveness: number;
  cost: 'low' | 'medium' | 'high';
}