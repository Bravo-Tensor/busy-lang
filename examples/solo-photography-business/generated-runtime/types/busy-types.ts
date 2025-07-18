
// Base BUSY types
export interface BusyMetadata {
  name: string;
  description: string;
  layer: 'L0' | 'L1' | 'L2';
}

export interface BusyImport {
  tool?: string;
  advisor?: string;
  capability: string;
}

export interface BusyFile {
  version: string;
  metadata: BusyMetadata;
  imports?: BusyImport[];
}


// Team types
export interface Team extends BusyFile {
  team: {
    name: string;
    type: 'stream-aligned' | 'enabling' | 'complicated-subsystem' | 'platform';
    description: string;
    resources?: Resource[];
    governance?: Governance;
    interfaces?: TeamInterfaces;
    success_metrics?: string[];
  };
}

export interface Resource {
  type: 'time' | 'people' | 'capital' | 'attention' | 'tooling';
  allocation: number;
  unit: string;
}

export interface Governance {
  escalation_path?: string;
  decision_authority?: string[];
}

export interface TeamInterfaces {
  external?: string[];
  internal?: string[];
}


// Role types
export interface Role extends BusyFile {
  role: {
    name: string;
    description: string;
    inherits_from?: string;
    onboarding?: OnboardingStep[];
    responsibilities?: string[];
    tasks?: Task[];
  };
}

export interface OnboardingStep {
  step: string;
  duration: string;
}


// Playbook types
export interface Playbook extends BusyFile {
  playbook: {
    name: string;
    description: string;
    cadence: PlaybookCadence;
    inputs?: Deliverable[];
    outputs?: Deliverable[];
    steps?: Task[];
    issue_resolution?: IssueResolution[];
  };
}

export interface PlaybookCadence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand' | 'triggered';
  schedule?: string;
  trigger_events?: string[];
}

export interface IssueResolution {
  type: 'escalate' | 'override' | 'delegate' | 'pause' | 'ai_assist';
  target?: string;
  conditions?: string[];
  timeout?: string;
  fallback?: IssueResolution;
}


// Task types
export interface Task {
  name: string;
  description: string;
  execution_type: 'algorithmic' | 'ai_agent' | 'human' | 'human_creative';
  estimated_duration?: string;
  inputs?: Deliverable[];
  outputs?: Deliverable[];
  ui_type?: 'form' | 'meeting' | 'writing_session' | 'strategy_session';
  algorithm?: string;
  agent_prompt?: string;
  issues?: TaskIssue[];
  tags?: string[];
  subtasks?: Task[];
}

export interface TaskIssue {
  issue_type: string;
  resolution: IssueResolution;
}


// Deliverable types
export interface Deliverable {
  name: string;
  type: 'document' | 'data';
  format: string;
  schema?: DeliverableSchema;
  required_fields?: string[];
  validation_rules?: ValidationRule[];
}

export interface DeliverableSchema {
  type: 'json' | 'xml' | 'yaml';
  definition: string;
}

export interface ValidationRule {
  rule_type: 'required' | 'format' | 'range' | 'dependency' | 'conflict';
  condition: string;
  error_message: string;
  severity: 'error' | 'warning' | 'info';
}


// Document types
export interface DocumentDefinition extends BusyFile {
  document: {
    metadata: {
      name: string;
      description: string;
      version: string;
    };
    content_type: 'structured' | 'narrative';
    sections?: DocumentSection[];
    narrative_content?: string;
  };
}

export interface DocumentSection {
  name: string;
  description: string;
  fields: DocumentField[];
}

export interface DocumentField {
  name: string;
  type: 'text' | 'email' | 'date' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
  validation?: string;
}
