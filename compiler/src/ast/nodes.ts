/**
 * AST Node Definitions for BUSY Language
 * Represents the structure of parsed BUSY files in a compiler-friendly format
 */

import type { SourcePosition, SourceRange } from '@/utils/yaml-utils';

/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  /** Node type identifier */
  type: string;
  
  /** Source location information */
  location?: SourceLocation;
  
  /** Parent node reference */
  parent?: ASTNode;
  
  /** Child nodes */
  children?: ASTNode[];
}

/**
 * Source location information for AST nodes
 */
export interface SourceLocation {
  /** Source file path */
  file: string;
  
  /** Position in source */
  position?: SourcePosition;
  
  /** Range in source */
  range?: SourceRange;
  
  /** Path in YAML structure */
  path: (string | number)[];
}

/**
 * Root AST node representing the entire BUSY repository
 */
export interface BusyAST extends ASTNode {
  type: 'BusyAST';
  
  /** All parsed files */
  files: Map<string, BusyFileNode>;
  
  /** Symbol table with all definitions */
  symbols: SymbolTable;
  
  /** Dependency graph */
  dependencies: DependencyGraph;
  
  /** Repository metadata */
  metadata: RepositoryMetadata;
}

/**
 * Repository metadata
 */
export interface RepositoryMetadata {
  rootPath: string;
  totalFiles: number;
  layers: ('L0' | 'L1' | 'L2')[];
  organizations: string[];
  teams: string[];
}

/**
 * File-level AST node
 */
export interface BusyFileNode extends ASTNode {
  type: 'BusyFile';
  
  /** File path */
  filePath: string;
  
  /** File metadata */
  metadata: FileMetadata;
  
  /** Imports declared in this file */
  imports: ImportNode[];
  
  /** Content node (team, role, playbook, or document) */
  content: TeamNode | RoleNode | PlaybookNode | DocumentNode;
  
  /** Namespace information */
  namespace: NamespaceInfo;
}

/**
 * File metadata
 */
export interface FileMetadata {
  version: string;
  name: string;
  description: string;
  layer: 'L0' | 'L1' | 'L2';
}

/**
 * Namespace information
 */
export interface NamespaceInfo {
  org: string;
  layer: 'L0' | 'L1' | 'L2';
  team: string;
  category: 'team' | 'role' | 'playbook';
}

/**
 * Import node
 */
export interface ImportNode extends ASTNode {
  type: 'Import';
  
  /** Import type */
  importType: 'tool' | 'advisor';
  
  /** Tool or advisor name */
  name: string;
  
  /** Capability needed from tool or advisor */
  capability: string;
}

/**
 * Team node
 */
export interface TeamNode extends ASTNode {
  type: 'Team';
  
  /** Team name */
  name: string;
  
  /** Team type */
  teamType: 'stream-aligned' | 'enabling' | 'complicated-subsystem' | 'platform';
  
  /** Description */
  description: string;
  
  /** Roles defined in team */
  roles: RoleNode[];
  
  /** Playbooks defined in team */
  playbooks: PlaybookNode[];
  
  /** Resource allocations */
  resources: ResourceNode[];
  
  /** Governance structure */
  governance?: GovernanceNode;
  
  /** External and internal interfaces */
  interfaces?: TeamInterfacesNode;
  
  /** Success metrics */
  successMetrics: string[];
}

/**
 * Role node
 */
export interface RoleNode extends ASTNode {
  type: 'Role';
  
  /** Role name (identifier) */
  name: string;
  
  /** Parent role for inheritance */
  inheritsFrom?: string;
  
  /** Description */
  description: string;
  
  /** Onboarding steps */
  onboarding: OnboardingStepNode[];
  
  /** Tasks defined in role */
  tasks: TaskNode[];
  
  /** Responsibilities */
  responsibilities: string[];
  
  /** Role interfaces */
  interfaces?: RoleInterfaceNode;
}

/**
 * Playbook node
 */
export interface PlaybookNode extends ASTNode {
  type: 'Playbook';
  
  /** Playbook name (identifier) */
  name: string;
  
  /** Description */
  description: string;
  
  /** Execution cadence */
  cadence: CadenceNode;
  
  /** Input deliverables */
  inputs: DeliverableNode[];
  
  /** Output deliverables */
  outputs: DeliverableNode[];
  
  /** Process steps */
  steps: TaskNode[];
  
  /** Issue resolution strategies */
  issueResolution: ResolutionNode[];
}

/**
 * Document node
 */
export interface DocumentNode extends ASTNode {
  type: 'Document';
  
  /** File metadata */
  metadata: FileMetadata;
  
  /** Content organization type */
  contentType: 'structured' | 'narrative';
  
  /** Document sections (for structured content) */
  sections?: DocumentSectionNode[];
  
  /** Free-form content (for narrative documents) */
  narrativeContent?: string;
}

/**
 * Document section node
 */
export interface DocumentSectionNode extends ASTNode {
  type: 'DocumentSection';
  
  /** Section name */
  name: string;
  
  /** Section type */
  sectionType: 'text' | 'list' | 'table' | 'form';
  
  /** Structured fields (for form sections) */
  fields?: DocumentFieldNode[];
  
  /** Content (for text sections) */
  content?: string;
}

/**
 * Document field node
 */
export interface DocumentFieldNode extends ASTNode {
  type: 'DocumentField';
  
  /** Field name */
  name: string;
  
  /** Field data type */
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'select';
  
  /** Whether field is required */
  required: boolean;
  
  /** Options for select fields */
  options?: string[];
}

/**
 * Task node
 */
export interface TaskNode extends ASTNode {
  type: 'Task';
  
  /** Task name (identifier) */
  name: string;
  
  /** Description */
  description: string;
  
  /** Execution type */
  executionType: 'algorithmic' | 'ai_agent' | 'human' | 'human_creative';
  
  /** Input deliverables */
  inputs: DeliverableNode[];
  
  /** Output deliverables */
  outputs: DeliverableNode[];
  
  /** Estimated duration */
  estimatedDuration?: string;
  
  /** Algorithm name (for algorithmic tasks) */
  algorithm?: string;
  
  /** AI agent prompt */
  agentPrompt?: string;
  
  /** Context gathering sources */
  contextGathering?: string[];
  
  /** UI type (for human tasks) */
  uiType?: 'form' | 'meeting' | 'writing_session' | 'strategy_session';
  
  /** Facilitation details */
  facilitation?: FacilitationNode;
  
  /** Issue handling */
  issues: IssueNode[];
  
  /** Tags */
  tags: string[];
  
  /** Hierarchical subtasks */
  subtasks?: TaskNode[];
}

/**
 * Deliverable node
 */
export interface DeliverableNode extends ASTNode {
  type: 'Deliverable';
  
  /** Deliverable name (identifier) */
  name: string;
  
  /** Deliverable type */
  deliverableType: 'document' | 'data';
  
  /** Document definition reference (for document type) */
  documentDefinition?: string;
  
  /** Format specification */
  format: string;
  
  /** Schema definition */
  schema?: SchemaNode;
  
  /** Required fields */
  requiredFields: string[];
  
  /** Validation rules */
  validationRules: ValidationRuleNode[];
}

/**
 * Resource node
 */
export interface ResourceNode extends ASTNode {
  type: 'Resource';
  
  /** Resource type */
  resourceType: 'time' | 'people' | 'capital' | 'attention' | 'tooling';
  
  /** Allocation amount */
  allocation: number;
  
  /** Unit of measurement */
  unit: string;
  
  /** Constraints */
  constraints: unknown[];
}

/**
 * Governance node
 */
export interface GovernanceNode extends ASTNode {
  type: 'Governance';
  
  /** Escalation path */
  escalationPath?: string;
  
  /** Decision authority */
  decisionAuthority: string[];
}

/**
 * Team interfaces node
 */
export interface TeamInterfacesNode extends ASTNode {
  type: 'TeamInterfaces';
  
  /** External interfaces */
  external: string[];
  
  /** Internal interfaces */
  internal: string[];
}

/**
 * Role interface node
 */
export interface RoleInterfaceNode extends ASTNode {
  type: 'RoleInterface';
  
  /** Input deliverables */
  inputs: DeliverableNode[];
  
  /** Output deliverables */
  outputs: DeliverableNode[];
}

/**
 * Onboarding step node
 */
export interface OnboardingStepNode extends ASTNode {
  type: 'OnboardingStep';
  
  /** Step description */
  step: string;
  
  /** Duration */
  duration: string;
}

/**
 * Cadence node
 */
export interface CadenceNode extends ASTNode {
  type: 'Cadence';
  
  /** Frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand' | 'triggered';
  
  /** Cron schedule */
  schedule?: string;
  
  /** Trigger events */
  triggerEvents: string[];
}

/**
 * Schema node
 */
export interface SchemaNode extends ASTNode {
  type: 'Schema';
  
  /** Schema type */
  schemaType: 'json' | 'csv' | 'xml' | 'custom';
  
  /** Schema definition */
  definition?: string | object;
}

/**
 * Validation rule node
 */
export interface ValidationRuleNode extends ASTNode {
  type: 'ValidationRule';
  
  /** Rule type */
  ruleType: 'required' | 'format' | 'range' | 'dependency' | 'conflict';
  
  /** Condition expression */
  condition: string;
  
  /** Error message */
  errorMessage: string;
  
  /** Severity */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Facilitation node
 */
export interface FacilitationNode extends ASTNode {
  type: 'Facilitation';
  
  /** Meeting agenda */
  agenda: string[];
}

/**
 * Issue node
 */
export interface IssueNode extends ASTNode {
  type: 'Issue';
  
  /** Issue type */
  issueType: string;
  
  /** Resolution strategy */
  resolution: ResolutionNode;
}

/**
 * Resolution node
 */
export interface ResolutionNode extends ASTNode {
  type: 'Resolution';
  
  /** Resolution type */
  resolutionType: 'escalate' | 'override' | 'delegate' | 'pause' | 'ai_assist';
  
  /** Target for resolution */
  target?: string;
  
  /** Conditions for resolution */
  conditions: string[];
  
  /** Timeout duration */
  timeout?: string;
  
  /** Fallback resolution */
  fallback?: ResolutionNode;
  
  /** AI agent prompt (for ai_assist) */
  agentPrompt?: string;
  
  /** Context gathering sources */
  contextGathering?: string[];
}

/**
 * Symbol table containing all definitions
 */
export interface SymbolTable {
  /** All defined roles */
  roles: Map<string, RoleSymbol>;
  
  /** All defined playbooks */
  playbooks: Map<string, PlaybookSymbol>;
  
  /** All defined tasks */
  tasks: Map<string, TaskSymbol>;
  
  /** All defined deliverables */
  deliverables: Map<string, DeliverableSymbol>;
  
  /** All imported tools */
  tools: Map<string, ToolSymbol>;
  
  /** All imported advisors */
  advisors: Map<string, AdvisorSymbol>;
  
  /** All defined teams */
  teams: Map<string, TeamSymbol>;
  
  /** All defined documents */
  documents: Map<string, DocumentSymbol>;
}

/**
 * Base symbol interface
 */
export interface Symbol {
  /** Symbol name/identifier */
  name: string;
  
  /** Source file */
  file: string;
  
  /** Symbol type */
  symbolType: SymbolType;
  
  /** AST node reference */
  node: ASTNode;
  
  /** References to this symbol */
  references: SymbolReference[];
  
  /** Whether symbol is used */
  isUsed: boolean;
  
  /** Namespace context */
  namespace: NamespaceInfo;
}

/**
 * Symbol types
 */
export type SymbolType = 'role' | 'playbook' | 'task' | 'deliverable' | 'tool' | 'advisor' | 'team' | 'document';

/**
 * Symbol reference
 */
export interface SymbolReference {
  /** File containing the reference */
  file: string;
  
  /** Location of reference */
  location: SourceLocation;
  
  /** Type of reference */
  referenceType: 'input' | 'output' | 'inheritance' | 'call' | 'import' | 'escalation' | 'team_membership';
  
  /** Context of reference */
  context?: string;
}

/**
 * Specific symbol types
 */
export interface RoleSymbol extends Symbol {
  symbolType: 'role';
  node: RoleNode;
  parentRole?: string;
  childRoles: string[];
  tasks: string[];
}

export interface PlaybookSymbol extends Symbol {
  symbolType: 'playbook';
  node: PlaybookNode;
  steps: string[];
  triggerEvents: string[];
}

export interface TaskSymbol extends Symbol {
  symbolType: 'task';
  node: TaskNode;
  inputs: string[];
  outputs: string[];
  executionType: TaskNode['executionType'];
}

export interface DeliverableSymbol extends Symbol {
  symbolType: 'deliverable';
  node: DeliverableNode;
  producers: SymbolReference[];
  consumers: SymbolReference[];
  deliverableType: DeliverableNode['deliverableType'];
  format: string;
}

export interface ToolSymbol extends Symbol {
  symbolType: 'tool';
  node: ImportNode;
  capability: string;
}

export interface AdvisorSymbol extends Symbol {
  symbolType: 'advisor';
  node: ImportNode;
  capability: string;
}

export interface TeamSymbol extends Symbol {
  symbolType: 'team';
  node: TeamNode;
  teamType: TeamNode['teamType'];
  roles: string[];
  playbooks: string[];
}

export interface DocumentSymbol extends Symbol {
  symbolType: 'document';
  node: DocumentNode;
  contentType: DocumentNode['contentType'];
  sections: string[];
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  /** All nodes in the graph */
  nodes: Map<string, DependencyNode>;
  
  /** Edges representing dependencies */
  edges: DependencyEdge[];
  
  /** Detected circular dependencies */
  cycles: CyclicDependency[];
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  /** Unique identifier */
  id: string;
  
  /** Node type */
  nodeType: SymbolType;
  
  /** Source file */
  file: string;
  
  /** Symbol reference */
  symbol: Symbol;
  
  /** Direct dependencies */
  dependencies: string[];
  
  /** Direct dependents */
  dependents: string[];
}

/**
 * Dependency edge
 */
export interface DependencyEdge {
  /** Source node */
  from: string;
  
  /** Target node */
  to: string;
  
  /** Edge type */
  edgeType: 'input' | 'output' | 'inheritance' | 'escalation' | 'import';
  
  /** Edge metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Circular dependency
 */
export interface CyclicDependency {
  /** Nodes involved in cycle */
  nodes: string[];
  
  /** Edges forming the cycle */
  edges: DependencyEdge[];
  
  /** Cycle type */
  cycleType: 'inheritance' | 'data_flow' | 'escalation';
}