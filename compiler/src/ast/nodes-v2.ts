/**
 * AST Node Definitions for BUSY Language v2.0
 * Updated for capability/responsibility model, resource management, and removed execution types
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
  
  /** Resource definitions */
  resources: ResourceDefinitionNode[];
  
  /** Capability definitions */
  capabilities: CapabilityNode[];
  
  /** Responsibility definitions */
  responsibilities: ResponsibilityNode[];
  
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
  category: 'team' | 'role' | 'playbook' | 'capability' | 'responsibility' | 'resource';
}

/**
 * Import node - updated for v2.0
 */
export interface ImportNode extends ASTNode {
  type: 'Import';
  
  /** Import type */
  importType: 'capability' | 'tool' | 'advisor';
  
  /** Name */
  name: string;
  
  /** Version specification (optional) */
  version?: string;
  
  /** Interface specification (for advisors) */
  interface?: string;
}

/**
 * Capability node - NEW in v2.0
 */
export interface CapabilityNode extends ASTNode {
  type: 'Capability';
  
  /** Capability name (identifier) */
  name: string;
  
  /** Description */
  description: string;
  
  /** Detailed execution method */
  method: string;
  
  /** Input specifications */
  inputs: InputOutputSpec[];
  
  /** Output specifications */
  outputs: InputOutputSpec[];
}

/**
 * Responsibility node - NEW in v2.0 (special type of capability)
 */
export interface ResponsibilityNode extends ASTNode {
  type: 'Responsibility';
  
  /** Responsibility name (identifier) */
  name: string;
  
  /** Description */
  description: string;
  
  /** Detailed method including monitoring and enforcement */
  method: string;
  
  /** Input specifications (often none for monitoring) */
  inputs: InputOutputSpec[];
  
  /** Output specifications (usually notifications/alerts) */
  outputs: InputOutputSpec[];
}

/**
 * Resource definition node - UPDATED for v2.0
 */
export interface ResourceDefinitionNode extends ASTNode {
  type: 'ResourceDefinition';
  
  /** Resource name (identifier) */
  name: string;
  
  /** Parent resource to extend from */
  extends?: string;
  
  /** Flexible characteristics */
  characteristics: Record<string, any>;
}

/**
 * Input/Output specification - NEW in v2.0
 */
export interface InputOutputSpec extends ASTNode {
  type: 'InputOutputSpec';
  
  /** Input/output name */
  name: string;
  
  /** Type */
  dataType: 'data' | 'document' | 'decision' | 'physical' | 'notification' | 'alert' | 'report';
  
  /** Format specification */
  format?: string;
  
  /** Field definitions for data types */
  fields: FieldSpec[];
}

/**
 * Field specification - NEW in v2.0
 */
export interface FieldSpec extends ASTNode {
  type: 'FieldSpec';
  
  /** Field name */
  name: string;
  
  /** Field type */
  fieldType: string;
  
  /** Whether required */
  required: boolean;
}

/**
 * Team node - UPDATED for v2.0
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
  
  /** Resource definitions/references */
  resources: ResourceDefinitionNode[];
  
  /** Governance structure */
  governance?: GovernanceNode;
  
  /** External and internal interfaces */
  interfaces?: TeamInterfacesNode;
  
  /** Success metrics */
  successMetrics: string[];
}

/**
 * Role node - UPDATED for v2.0
 */
export interface RoleNode extends ASTNode {
  type: 'Role';
  
  /** Role name (identifier) */
  name: string;
  
  /** Description */
  description: string;
  
  /** Capabilities this role provides */
  capabilities: string[];
  
  /** Responsibilities this role maintains */
  responsibilities: string[];
  
  /** Resources the role brings */
  bringsResources: ResourceDefinitionNode[];
}

/**
 * Playbook node - UPDATED for v2.0
 */
export interface PlaybookNode extends ASTNode {
  type: 'Playbook';
  
  /** Playbook name (identifier) */
  name: string;
  
  /** Description */
  description: string;
  
  /** Execution cadence */
  cadence: CadenceNode;
  
  /** Input specifications */
  inputs: InputOutputSpec[];
  
  /** Output specifications */
  outputs: InputOutputSpec[];
  
  /** Process steps */
  steps: StepNode[];
  
  /** Issue resolution strategies */
  issueResolution: ResolutionNode[];
}

/**
 * Step node - UPDATED for v2.0 (replaces TaskNode)
 */
export interface StepNode extends ASTNode {
  type: 'Step';
  
  /** Step name (identifier) */
  name: string;
  
  /** Description */
  description: string;
  
  /** Detailed execution method */
  method: string;
  
  /** Input specifications */
  inputs: InputOutputSpec[];
  
  /** Output specifications */
  outputs: InputOutputSpec[];
  
  /** Resource requirements */
  requirements: RequirementNode[];
  
  /** Temporary responsibilities for this step */
  responsibilities: string[];
  
  /** Issue handling */
  issues: IssueNode[];
  
  /** Estimated duration */
  estimatedDuration?: string;
}

/**
 * Requirement node - NEW in v2.0
 */
export interface RequirementNode extends ASTNode {
  type: 'Requirement';
  
  /** Local name for the resource */
  name: string;
  
  /** Characteristics to match on */
  characteristics?: Record<string, any>;
  
  /** Priority chain for fallback */
  priority: PriorityItem[];
}

/**
 * Priority item - NEW in v2.0
 */
export interface PriorityItem extends ASTNode {
  type: 'PriorityItem';
  
  /** Priority type */
  priorityType: 'specific' | 'characteristics' | 'emergency';
  
  /** Specific resource name */
  specific?: string;
  
  /** Characteristics to match */
  characteristics?: Record<string, any>;
  
  /** Warning message for emergency fallback */
  warning?: string;
}

/**
 * Document node - UNCHANGED from v1.0
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
 * Document section node - UNCHANGED from v1.0
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
 * Document field node - UNCHANGED from v1.0
 */
export interface DocumentFieldNode extends ASTNode {
  type: 'DocumentField';
  
  /** Field name */
  name: string;
  
  /** Field type */
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'select';
  
  /** Whether required */
  required: boolean;
  
  /** Options (for select fields) */
  options?: string[];
}

/**
 * Cadence node - UNCHANGED from v1.0
 */
export interface CadenceNode extends ASTNode {
  type: 'Cadence';
  
  /** Frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand' | 'triggered';
  
  /** Schedule (cron expression) */
  schedule?: string;
  
  /** Trigger events */
  triggerEvents: string[];
}

/**
 * Governance node - UNCHANGED from v1.0
 */
export interface GovernanceNode extends ASTNode {
  type: 'Governance';
  
  /** Escalation path */
  escalationPath?: string;
  
  /** Decision authority */
  decisionAuthority: string[];
}

/**
 * Team interfaces node - UNCHANGED from v1.0
 */
export interface TeamInterfacesNode extends ASTNode {
  type: 'TeamInterfaces';
  
  /** External interfaces */
  external: string[];
  
  /** Internal interfaces */
  internal: string[];
}

/**
 * Issue node - UPDATED for v2.0 (removed AI-specific fields)
 */
export interface IssueNode extends ASTNode {
  type: 'Issue';
  
  /** Issue type */
  issueType: string;
  
  /** Resolution strategy */
  resolution: ResolutionNode;
}

/**
 * Resolution node - UPDATED for v2.0 (removed AI-specific fields)
 */
export interface ResolutionNode extends ASTNode {
  type: 'Resolution';
  
  /** Resolution type */
  resolutionType: 'escalate' | 'override' | 'delegate' | 'pause';
  
  /** Target for resolution */
  target?: string;
  
  /** Conditions */
  conditions: string[];
  
  /** Timeout */
  timeout?: string;
  
  /** Fallback resolution */
  fallback?: ResolutionNode;
}

// Re-export symbols, dependency graph types (these would be imported from other files)
export type SymbolTable = any; // TODO: Import from symbols module
export type DependencyGraph = any; // TODO: Import from dependency module