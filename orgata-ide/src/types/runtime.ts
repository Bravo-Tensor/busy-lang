import { BusyProcess, ProcessMetrics, Permission } from './conversation';

export interface ValidationRule {
  type: string;
  condition: string;
  message: string;
}

export interface ProcessInstance {
  id: string;
  busyProcess: BusyProcess;
  currentState: ProcessState;
  startTime: Date;
  expectedCompletion: Date;
  assignedPersonnel: Person[];
  activeSteps: StepExecution[];
  completedSteps: StepExecution[];
  blockedSteps: StepExecution[];
  performance: ProcessMetrics;
  modificationHistory: ProcessModification[];
  context: ExecutionContext;
}

export interface ProcessState {
  status: 'initializing' | 'running' | 'paused' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  progress: number;
  lastUpdated: Date;
  stateData: Record<string, any>;
  checkpoints: StateCheckpoint[];
}

export interface StateCheckpoint {
  id: string;
  timestamp: Date;
  stepId: string;
  stateSnapshot: Record<string, any>;
  canRollback: boolean;
}

export interface StepExecution {
  id: string;
  stepDefinition: BusyStep;
  status: 'pending' | 'active' | 'waiting' | 'completed' | 'failed' | 'skipped';
  assignedTo: Person | AIAgent;
  startTime?: Date;
  completionTime?: Date;
  duration?: number;
  dependencies: StepDependency[];
  outputs: StepOutput[];
  quality: QualityMetrics;
  blockers: Blocker[];
}

export interface BusyStep {
  id: string;
  name: string;
  type: 'human' | 'ai' | 'system' | 'external';
  description: string;
  inputs: StepInput[];
  outputs: StepOutput[];
  requirements: StepRequirement[];
  estimatedDuration: number;
  qualityGates: QualityGate[];
}

export interface StepInput {
  name: string;
  type: string;
  required: boolean;
  source: string;
  validation?: ValidationRule[];
}

export interface StepOutput {
  name: string;
  type: string;
  description: string;
  value?: any;
  timestamp?: Date;
  quality?: QualityScore;
}

export interface StepRequirement {
  type: 'skill' | 'resource' | 'approval' | 'system';
  description: string;
  critical: boolean;
  alternatives?: string[];
}

export interface StepDependency {
  stepId: string;
  type: 'blocks' | 'enables' | 'informs';
  condition?: string;
}

export interface QualityGate {
  id: string;
  name: string;
  criteria: QualityCriteria[];
  required: boolean;
  autoCheck: boolean;
}

export interface QualityCriteria {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  threshold: number;
  weight: number;
}

export interface QualityMetrics {
  overall: number;
  accuracy: number;
  completeness: number;
  timeliness: number;
  customerSatisfaction?: number;
  defects: QualityDefect[];
}

export interface QualityDefect {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected: Date;
  resolved?: Date;
}

export interface QualityScore {
  value: number;
  breakdown: Record<string, number>;
  timestamp: Date;
  assessor: string;
}

// Personnel and Resource Management
export interface Person {
  id: string;
  name: string;
  email: string;
  roles: BusinessRole[];
  skills: Skill[];
  availability: Availability;
  workload: WorkloadInfo;
  performance: PersonPerformance;
}

export interface BusinessRole {
  id: string;
  name: string;
  responsibilities: string[];
  permissions: Permission[];
  level: 'junior' | 'mid' | 'senior' | 'lead' | 'manager';
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  lastUsed?: Date;
}

export interface Availability {
  status: 'available' | 'busy' | 'away' | 'offline';
  capacity: number; // 0-100%
  nextAvailable: Date;
  workingHours: TimeRange[];
  timeZone: string;
}

export interface TimeRange {
  start: string;
  end: string;
  dayOfWeek: number;
}

export interface WorkloadInfo {
  currentTasks: number;
  totalCapacity: number;
  utilization: number;
  burnoutRisk: 'low' | 'medium' | 'high';
  productivityTrend: 'improving' | 'stable' | 'declining';
}

export interface PersonPerformance {
  averageTaskDuration: number;
  qualityScore: number;
  onTimeDelivery: number;
  collaborationScore: number;
  lastEvaluation: Date;
  trends: PerformanceTrend[];
}

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  period: string;
}

// AI Agent System
export interface AIAgent {
  id: string;
  name: string;
  type: 'conversational' | 'analytical' | 'execution' | 'quality';
  capabilities: AICapability[];
  configuration: AIConfiguration;
  performance: AIPerformance;
  status: 'active' | 'idle' | 'training' | 'offline';
}

export interface AICapability {
  name: string;
  description: string;
  confidence: number;
  domain: string[];
}

export interface AIConfiguration {
  model: string;
  parameters: Record<string, any>;
  prompts: AIPrompt[];
  constraints: AIConstraint[];
}

export interface AIPrompt {
  type: 'system' | 'user' | 'assistant';
  content: string;
  context: string[];
}

export interface AIConstraint {
  type: 'ethical' | 'business' | 'technical' | 'regulatory';
  rule: string;
  enforcement: 'strict' | 'advisory';
}

export interface AIPerformance {
  accuracy: number;
  responseTime: number;
  userSatisfaction: number;
  taskSuccessRate: number;
  lastTraining: Date;
}

// Task Management System
export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'human' | 'ai' | 'system' | 'external';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: Person | AIAgent;
  dueDate: Date;
  estimatedDuration: number;
  actualDuration?: number;
  status: TaskStatus;
  dependencies: TaskDependency[];
  requiredResources: Resource[];
  deliverables: Deliverable[];
  qualityGates: QualityGate[];
  context: TaskContext;
}

export interface TaskStatus {
  current: 'pending' | 'assigned' | 'in-progress' | 'review' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  lastUpdated: Date;
  blockers: Blocker[];
}

export interface TaskDependency {
  taskId: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  lag?: number;
}

export interface Resource {
  id: string;
  name: string;
  type: 'equipment' | 'software' | 'facility' | 'budget' | 'external-service';
  availability: ResourceAvailability;
  cost: number;
  requirements: string[];
}

export interface ResourceAvailability {
  status: 'available' | 'busy' | 'maintenance' | 'unavailable';
  capacity: number;
  schedule: ResourceSchedule[];
}

export interface ResourceSchedule {
  start: Date;
  end: Date;
  allocated: number;
  task: string;
}

export interface Deliverable {
  id: string;
  name: string;
  type: string;
  description: string;
  format: string;
  qualityStandards: QualityStandard[];
  dueDate: Date;
  status: DeliverableStatus;
}

export interface QualityStandard {
  name: string;
  criteria: string;
  measurement: string;
  threshold: number;
}

export interface DeliverableStatus {
  current: 'not-started' | 'in-progress' | 'review' | 'approved' | 'delivered';
  qualityScore?: number;
  feedback: string[];
}

export interface TaskContext {
  processInstanceId: string;
  stepId: string;
  businessContext: Record<string, any>;
  customerContext?: CustomerContext;
}

export interface CustomerContext {
  customerId: string;
  projectId: string;
  requirements: string[];
  preferences: Record<string, any>;
  history: CustomerInteraction[];
}

export interface CustomerInteraction {
  timestamp: Date;
  type: 'meeting' | 'email' | 'call' | 'review' | 'feedback';
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  actionItems: string[];
}

// Blocker and Issue Management
export interface Blocker {
  id: string;
  type: 'resource' | 'approval' | 'dependency' | 'technical' | 'external';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: BlockerImpact;
  resolutionPlan: ResolutionPlan;
  status: 'open' | 'in-progress' | 'resolved' | 'escalated';
  created: Date;
  resolved?: Date;
}

export interface BlockerImpact {
  affectedTasks: string[];
  delayEstimate: number;
  costImpact: number;
  qualityRisk: 'low' | 'medium' | 'high';
}

export interface ResolutionPlan {
  steps: ResolutionStep[];
  owner: string;
  targetDate: Date;
  alternatives: string[];
}

export interface ResolutionStep {
  description: string;
  owner: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed';
}

// Execution Context
export interface ExecutionContext {
  businessId: string;
  userId: string;
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  configuration: ExecutionConfiguration;
  monitoring: MonitoringConfig;
}

export interface ExecutionConfiguration {
  autoApprovalThreshold: number;
  qualityGateEnforcement: 'strict' | 'advisory' | 'disabled';
  notificationSettings: NotificationSettings;
  escalationRules: EscalationRule[];
}

export interface NotificationSettings {
  channels: NotificationChannel[];
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  types: NotificationType[];
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'slack' | 'teams' | 'webhook';
  address: string;
  priority: 'low' | 'medium' | 'high';
}

export interface NotificationType {
  event: string;
  enabled: boolean;
  threshold?: number;
}

export interface EscalationRule {
  condition: string;
  delay: number;
  escalateTo: string;
  action: 'notify' | 'assign' | 'pause' | 'cancel';
}

export interface MonitoringConfig {
  metricsCollection: boolean;
  performanceTracking: boolean;
  qualityMonitoring: boolean;
  alertThresholds: AlertThreshold[];
}

export interface AlertThreshold {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  value: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Process Modification Types
export interface ProcessModification {
  id: string;
  type: 'add_step' | 'remove_step' | 'modify_step' | 'reorder_steps' | 'change_assignment' | 'update_timeline';
  targetStep?: string;
  newStep?: BusyStep;
  parameters: ModificationParameters;
  requiredApprovals: ApprovalLevel[];
  impactAnalysis: ImpactAnalysis;
  rollbackPlan: RollbackPlan;
  status: ModificationStatus;
  timestamp: Date;
}

export interface ModificationParameters {
  changes: Record<string, any>;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  scope: 'step' | 'process' | 'system';
}

export interface ApprovalLevel {
  role: string;
  required: boolean;
  approved?: boolean;
  approver?: string;
  timestamp?: Date;
  comments?: string;
}

export interface ImpactAnalysis {
  scope: 'local' | 'process' | 'system' | 'organization';
  affectedComponents: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: number;
  costImpact: number;
  qualityRisk: 'low' | 'medium' | 'high';
  timeline: ImpactTimeline;
}

export interface ImpactTimeline {
  implementationTime: number;
  testingTime: number;
  rolloutTime: number;
  stabilizationTime: number;
}

export interface RollbackPlan {
  strategy: 'immediate' | 'graceful' | 'checkpoint';
  steps: RollbackStep[];
  dataRecovery: boolean;
  estimatedTime: number;
  risks: string[];
}

export interface RollbackStep {
  order: number;
  description: string;
  automated: boolean;
  estimatedTime: number;
  validation: string;
}

export interface ModificationStatus {
  current: 'proposed' | 'approved' | 'implementing' | 'testing' | 'deployed' | 'failed' | 'rolled-back';
  progress: number;
  lastUpdated: Date;
  issues: ModificationIssue[];
}

export interface ModificationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}