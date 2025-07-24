# Orgata Runtime Service - Comprehensive Data Models

**Created**: July 2025  
**Status**: Design Phase  
**Scope**: Complete data model specification for team-based Orgata Runtime Services

## Overview

The Orgata Runtime Service acts as the centralized source of truth for each team's business processes, exposing data through three interface types:
- **Human → UI**: Web interfaces for process management
- **AI/Agent → MCP**: Model Context Protocol for intelligent assistance
- **Code → API**: Programmatic access for integrations

Each team operates their own service instance with git-like workflow capabilities for collaborative process development.

## Core Architecture Principles

1. **Team-Based Isolation**: Each team has their own service instance
2. **Multi-Interface Access**: Same data exposed through UI, MCP, and API
3. **Git-Like Workflows**: Branch, propose, review, merge business process changes
4. **Instance + Definition Separation**: Business definitions vs. runtime execution data
5. **Compliance & Audit**: Complete audit trail for regulatory requirements

---

## Business Definition Models

### 1. Organization & Team Structure

#### **Organization**
```typescript
interface Organization {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
  compliance_requirements: ComplianceRequirement[];
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}
```

#### **Team**
```typescript
interface Team {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  service_endpoint: string;
  members: TeamMember[];
  permissions: TeamPermissions;
  settings: TeamSettings;
  created_at: Date;
  updated_at: Date;
}

interface TeamMember {
  user_id: string;
  role: TeamRole;
  permissions: Permission[];
  joined_at: Date;
  status: 'active' | 'inactive' | 'pending';
}
```

#### **Roles & Functions**
```typescript
interface Role {
  id: string;
  team_id: string;
  name: string;
  description: string;
  functions: RoleFunction[];
  capabilities: Capability[];
  hierarchy_level: number;
  reports_to?: string; // role_id
  created_at: Date;
  updated_at: Date;
  version: string;
}

interface RoleFunction {
  id: string;
  name: string;
  description: string;
  category: 'primary' | 'secondary' | 'occasional';
  required_skills: Skill[];
  estimated_time_allocation: number; // percentage
  decision_authority: DecisionAuthority[];
}

interface Capability {
  id: string;
  name: string;
  type: 'skill' | 'system_access' | 'approval_authority' | 'resource_access';
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  prerequisites: string[]; // capability_ids
}
```

### 2. Business Process Definitions

#### **Playbooks**
```typescript
interface Playbook {
  id: string;
  team_id: string;
  name: string;
  description: string;
  category: string;
  layer: 'L0' | 'L1' | 'L2';
  steps: PlaybookStep[];
  metadata: PlaybookMetadata;
  dependencies: PlaybookDependency[];
  compliance_tags: string[];
  estimated_duration: Duration;
  resource_requirements: ResourceRequirement[];
  created_at: Date;
  updated_at: Date;
  version: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
}

interface PlaybookStep {
  id: string;
  name: string;
  description: string;
  type: 'human' | 'agent' | 'algorithm';
  execution_type: 'sequential' | 'parallel' | 'conditional';
  assigned_role?: string; // role_id
  estimated_duration: Duration;
  inputs: StepInput[];
  outputs: StepOutput[];
  validation_rules: ValidationRule[];
  dependencies: StepDependency[];
  automation_config?: AutomationConfig;
  ui_config?: UIConfig;
  agent_config?: AgentConfig;
}
```

#### **Documents & Schemas**
```typescript
interface Document {
  id: string;
  team_id: string;
  name: string;
  type: 'template' | 'form' | 'contract' | 'policy' | 'procedure' | 'report';
  category: string;
  schema: DocumentSchema;
  template_content?: string;
  required_fields: DocumentField[];
  optional_fields: DocumentField[];
  validation_rules: ValidationRule[];
  access_permissions: Permission[];
  retention_policy: RetentionPolicy;
  compliance_tags: string[];
  created_at: Date;
  updated_at: Date;
  version: string;
}

interface DocumentSchema {
  id: string;
  name: string;
  version: string;
  fields: SchemaField[];
  relationships: SchemaRelationship[];
  constraints: SchemaConstraint[];
  metadata: Record<string, any>;
}
```

#### **BUSY Files**
```typescript
interface BusyFile {
  id: string;
  team_id: string;
  file_path: string;
  content: string;
  parsed_ast: any; // AST representation
  compilation_metadata: CompilationMetadata;
  dependencies: BusyFileDependency[];
  linked_playbooks: string[]; // playbook_ids
  linked_documents: string[]; // document_ids
  validation_results: ValidationResult[];
  created_at: Date;
  updated_at: Date;
  version: string;
  branch: string;
  commit_hash: string;
}
```

### 3. Business Rules & Constraints

#### **Business Rules**
```typescript
interface BusinessRule {
  id: string;
  team_id: string;
  name: string;
  description: string;
  category: 'validation' | 'approval' | 'escalation' | 'automation' | 'compliance';
  rule_definition: RuleDefinition;
  applies_to: RuleScope[];
  priority: number;
  is_active: boolean;
  exceptions: RuleException[];
  created_at: Date;
  updated_at: Date;
  version: string;
}

interface RuleDefinition {
  conditions: RuleCondition[];
  actions: RuleAction[];
  logic_operator: 'AND' | 'OR' | 'NOT';
  execution_timing: 'before' | 'during' | 'after' | 'continuous';
}
```

#### **Templates & Patterns**
```typescript
interface Template {
  id: string;
  team_id: string;
  name: string;
  type: 'playbook_template' | 'step_template' | 'document_template' | 'role_template';
  category: string;
  template_data: any;
  parameters: TemplateParameter[];
  usage_count: number;
  rating: number;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  version: string;
}
```

---

## Instance & Runtime Data Models

### 1. Process Execution

#### **Process Instances**
```typescript
interface ProcessInstance {
  id: string;
  playbook_id: string;
  team_id: string;
  name: string;
  status: 'not_started' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  current_step_id?: string;
  initiated_by: string; // user_id
  assigned_to?: string; // user_id
  context: ProcessContext;
  variables: ProcessVariable[];
  step_executions: StepExecution[];
  start_time?: Date;
  end_time?: Date;
  estimated_completion: Date;
  actual_duration?: Duration;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

interface StepExecution {
  id: string;
  process_instance_id: string;
  step_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'overridden';
  assigned_to?: string; // user_id
  input_data: any;
  output_data: any;
  start_time?: Date;
  end_time?: Date;
  duration?: Duration;
  exceptions: ExecutionException[];
  overrides: ExecutionOverride[];
  audit_trail: AuditEntry[];
  created_at: Date;
  updated_at: Date;
}
```

#### **Tasks & Assignments**
```typescript
interface Task {
  id: string;
  process_instance_id?: string;
  step_execution_id?: string;
  team_id: string;
  title: string;
  description: string;
  type: 'manual' | 'review' | 'approval' | 'data_entry' | 'decision' | 'escalation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'escalated';
  assigned_to?: string; // user_id
  assigned_by: string; // user_id
  due_date?: Date;
  estimated_effort: Duration;
  actual_effort?: Duration;
  tags: string[];
  attachments: Attachment[];
  comments: TaskComment[];
  created_at: Date;
  updated_at: Date;
}
```

### 2. Issues & Exceptions

#### **Issues**
```typescript
interface Issue {
  id: string;
  team_id: string;
  process_instance_id?: string;
  step_execution_id?: string;
  title: string;
  description: string;
  type: 'bug' | 'process_deviation' | 'performance' | 'compliance' | 'resource' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated';
  reported_by: string; // user_id
  assigned_to?: string; // user_id
  root_cause?: string;
  resolution?: string;
  resolution_time?: Duration;
  impact_assessment: ImpactAssessment;
  related_issues: string[]; // issue_ids
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
}

interface ProcessException {
  id: string;
  process_instance_id: string;
  step_execution_id?: string;
  type: 'validation_failure' | 'timeout' | 'resource_unavailable' | 'manual_override' | 'business_rule_violation';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  context: any;
  handled: boolean;
  resolution_strategy?: string;
  created_at: Date;
  resolved_at?: Date;
}
```

### 3. Audit & Logging

#### **Audit Logs**
```typescript
interface AuditEntry {
  id: string;
  team_id: string;
  entity_type: string; // 'process', 'step', 'task', 'document', etc.
  entity_id: string;
  action: string;
  actor_id: string; // user_id or 'system'
  actor_type: 'user' | 'agent' | 'system';
  before_state?: any;
  after_state?: any;
  context: AuditContext;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface ActivityLog {
  id: string;
  team_id: string;
  user_id?: string;
  activity_type: string;
  description: string;
  entity_references: EntityReference[];
  duration?: Duration;
  outcome: 'success' | 'failure' | 'partial';
  metadata: Record<string, any>;
  timestamp: Date;
}
```

#### **Performance Metrics**
```typescript
interface PerformanceMetric {
  id: string;
  team_id: string;
  metric_type: 'process_duration' | 'step_duration' | 'user_productivity' | 'system_utilization' | 'error_rate';
  entity_type: string;
  entity_id: string;
  time_period: TimePeriod;
  value: number;
  unit: string;
  context: MetricContext;
  recorded_at: Date;
}
```

---

## Collaboration & Workflow Models

### 1. Version Control & Branching

#### **Branches**
```typescript
interface Branch {
  id: string;
  team_id: string;
  name: string;
  type: 'main' | 'feature' | 'hotfix' | 'experiment';
  base_branch_id?: string;
  created_by: string; // user_id
  description: string;
  status: 'active' | 'merged' | 'abandoned' | 'stale';
  permissions: BranchPermission[];
  auto_merge_rules: AutoMergeRule[];
  created_at: Date;
  updated_at: Date;
  merged_at?: Date;
}

interface Commit {
  id: string;
  branch_id: string;
  author_id: string; // user_id
  message: string;
  changes: Change[];
  parent_commit_id?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}
```

#### **Change Proposals**
```typescript
interface ChangeProposal {
  id: string;
  team_id: string;
  branch_id: string;
  title: string;
  description: string;
  type: 'process_update' | 'new_process' | 'role_change' | 'document_update' | 'rule_change';
  proposed_by: string; // user_id
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'merged';
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact_assessment: ImpactAssessment;
  changes: ProposedChange[];
  reviewers: ChangeReviewer[];
  approval_chain: ApprovalStep[];
  discussion: DiscussionThread[];
  created_at: Date;
  updated_at: Date;
  approved_at?: Date;
  merged_at?: Date;
}

interface ChangeReview {
  id: string;
  change_proposal_id: string;
  reviewer_id: string; // user_id
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comments: ReviewComment[];
  rating?: number;
  reviewed_at?: Date;
  created_at: Date;
}
```

---

## Analytics & Reporting Models

### 1. Business Intelligence

#### **Dashboards**
```typescript
interface Dashboard {
  id: string;
  team_id: string;
  name: string;
  description: string;
  type: 'operational' | 'management' | 'executive' | 'compliance';
  widgets: DashboardWidget[];
  permissions: Permission[];
  refresh_interval: Duration;
  filters: DashboardFilter[];
  created_by: string; // user_id
  created_at: Date;
  updated_at: Date;
}

interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'list' | 'calendar' | 'heatmap';
  title: string;
  data_source: DataSource;
  configuration: WidgetConfiguration;
  position: WidgetPosition;
  refresh_interval?: Duration;
}
```

#### **Reports**
```typescript
interface Report {
  id: string;
  team_id: string;
  name: string;
  type: 'operational' | 'performance' | 'compliance' | 'financial' | 'custom';
  template_id?: string;
  parameters: ReportParameter[];
  schedule?: ReportSchedule;
  recipients: ReportRecipient[];
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
  data_sources: DataSource[];
  created_by: string; // user_id
  created_at: Date;
  last_generated_at?: Date;
}

interface ReportExecution {
  id: string;
  report_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  parameters: any;
  output_location?: string;
  error_message?: string;
  execution_time?: Duration;
  generated_by: string; // user_id or 'system'
  started_at: Date;
  completed_at?: Date;
}
```

### 2. Analytics

#### **Process Analytics**
```typescript
interface ProcessAnalytics {
  id: string;
  team_id: string;
  playbook_id: string;
  time_period: TimePeriod;
  metrics: ProcessMetrics;
  bottlenecks: Bottleneck[];
  trends: Trend[];
  recommendations: Recommendation[];
  calculated_at: Date;
}

interface ProcessMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration: Duration;
  median_duration: Duration;
  completion_rate: number;
  efficiency_score: number;
  resource_utilization: ResourceUtilization;
  cost_per_execution: number;
}
```

#### **User Analytics**
```typescript
interface UserAnalytics {
  id: string;
  team_id: string;
  user_id: string;
  time_period: TimePeriod;
  activity_metrics: UserActivityMetrics;
  performance_metrics: UserPerformanceMetrics;
  learning_progress: LearningProgress[];
  calculated_at: Date;
}

interface TeamAnalytics {
  id: string;
  team_id: string;
  time_period: TimePeriod;
  collaboration_metrics: CollaborationMetrics;
  productivity_metrics: ProductivityMetrics;
  quality_metrics: QualityMetrics;
  calculated_at: Date;
}
```

---

## Interface-Specific Models

### 1. UI Presentation Models

#### **UI Views**
```typescript
interface UIView {
  id: string;
  team_id: string;
  name: string;
  type: 'dashboard' | 'form' | 'list' | 'detail' | 'workflow' | 'calendar';
  entity_type: string;
  configuration: UIConfiguration;
  permissions: Permission[];
  customizations: UICustomization[];
  created_at: Date;
  updated_at: Date;
}

interface FormDefinition {
  id: string;
  name: string;
  version: string;
  fields: FormField[];
  layout: FormLayout;
  validation_rules: ValidationRule[];
  conditional_logic: ConditionalLogic[];
  styling: FormStyling;
  accessibility: AccessibilityConfig;
}
```

### 2. MCP Context Models

#### **Agent Context**
```typescript
interface AgentContext {
  id: string;
  team_id: string;
  agent_type: string;
  session_id: string;
  user_id: string;
  current_task?: string;
  available_actions: Action[];
  context_data: ContextData;
  conversation_history: ConversationEntry[];
  capabilities: AgentCapability[];
  constraints: AgentConstraint[];
  created_at: Date;
  updated_at: Date;
}

interface ContextData {
  current_process?: ProcessInstance;
  current_step?: StepExecution;
  user_role?: Role;
  team_context: TeamContext;
  recent_activity: ActivitySummary[];
  relevant_documents: DocumentReference[];
  applicable_rules: BusinessRule[];
}
```

### 3. API Response Models

#### **API Responses**
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: ResponseMetadata;
  links?: HATEOASLink[];
  timestamp: Date;
}

interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  links: PaginationLinks;
}
```

---

## Supporting Models

### 1. Common Types

#### **Time & Duration**
```typescript
interface Duration {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
}

interface TimePeriod {
  start_date: Date;
  end_date: Date;
  timezone: string;
}

interface Schedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'cron';
  expression?: string; // cron expression if type is 'cron'
  start_date?: Date;
  end_date?: Date;
  timezone: string;
}
```

#### **Permissions & Security**
```typescript
interface Permission {
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  granted_by?: string; // user_id
  granted_at?: Date;
  expires_at?: Date;
}

interface AccessControl {
  subject_id: string; // user_id or role_id
  subject_type: 'user' | 'role' | 'team';
  permissions: Permission[];
  restrictions: AccessRestriction[];
  effective_from: Date;
  effective_until?: Date;
}
```

#### **Metadata & Configuration**
```typescript
interface Metadata {
  tags: string[];
  categories: string[];
  custom_fields: CustomField[];
  annotations: Annotation[];
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
  version: string;
}

interface Configuration {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  scope: 'global' | 'team' | 'user' | 'process' | 'step';
  is_sensitive: boolean;
  validation_rules?: ValidationRule[];
}
```

---

## Summary

This comprehensive data model specification covers all aspects of the Orgata Runtime Service:

- **164 distinct data models** across 8 major categories
- **Multi-interface compatibility** (UI, MCP, API)
- **Team-based isolation** with git-like workflows  
- **Complete audit and compliance** capabilities
- **Advanced analytics and reporting** functionality
- **Extensible architecture** for future enhancements

The service acts as the single source of truth for each team's business processes while providing the flexibility and intelligence needed for modern business operations.