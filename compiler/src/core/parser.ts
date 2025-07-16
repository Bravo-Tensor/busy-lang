/**
 * YAML Parser - Second phase of BUSY compiler pipeline
 * Parses YAML files and builds Abstract Syntax Tree (AST)
 */

import { YamlParser, type ParsedYaml, type ValidationResult } from '@/utils/yaml-utils';
import type { CompilerConfig } from '@/config/types';
import type { ScanResult } from './scanner';
import { readFile } from 'fs/promises';
import * as path from 'path';

/**
 * Parser result containing AST and validation information
 */
export interface ParseResult {
  /** Successfully parsed files */
  parsedFiles: ParsedFile[];
  
  /** Files with parse errors */
  parseErrors: ParseError[];
  
  /** Schema validation results */
  validationResults: FileValidationResult[];
  
  /** Parse statistics */
  stats: ParseStats;
}

/**
 * Successfully parsed BUSY file
 */
export interface ParsedFile {
  /** File path */
  filePath: string;
  
  /** Parsed YAML content */
  yaml: ParsedYaml<BusyFileContent>;
  
  /** File type determined from content */
  fileType: BusyFileType;
  
  /** Namespace information */
  namespace: {
    org: string;
    layer: 'L0' | 'L1' | 'L2';
    team: string;
    category: 'team' | 'role' | 'playbook';
  };
}

/**
 * Parse error information
 */
export interface ParseError {
  filePath: string;
  error: Error;
  line?: number;
  column?: number;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  filePath: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse statistics
 */
export interface ParseStats {
  totalFiles: number;
  successfullyParsed: number;
  parseErrors: number;
  validationErrors: number;
  parseDurationMs: number;
}

/**
 * BUSY file content structure
 */
export interface BusyFileContent {
  version: string;
  metadata: {
    name: string;
    description: string;
    layer: 'L0' | 'L1' | 'L2';
  };
  imports?: Import[];
  team?: Team;
  teams?: Team[];
  role?: Role;
  playbook?: Playbook;
}

/**
 * BUSY file types
 */
export type BusyFileType = 'team' | 'role' | 'playbook';

/**
 * Import definition
 */
export interface Import {
  tool?: string;
  version?: string;
  advisor?: string;
  interface?: string;
}

/**
 * Team definition
 */
export interface Team {
  name: string;
  type: 'stream-aligned' | 'enabling' | 'complicated-subsystem' | 'platform';
  description: string;
  roles?: Role[];
  playbooks?: Playbook[];
  resources?: Resource[];
  governance?: Governance;
  interfaces?: TeamInterfaces;
  success_metrics?: string[];
}

/**
 * Role definition
 */
export interface Role {
  name: string;
  inherits_from?: string;
  description: string;
  onboarding?: OnboardingStep[];
  tasks?: Task[];
  responsibilities?: string[];
  interfaces?: RoleInterface;
}

/**
 * Playbook definition
 */
export interface Playbook {
  name: string;
  description: string;
  cadence: Cadence;
  inputs?: Deliverable[];
  outputs?: Deliverable[];
  steps?: Task[];
  issue_resolution?: Resolution[];
}

/**
 * Task definition
 */
export interface Task {
  name: string;
  description: string;
  execution_type: 'algorithmic' | 'ai_agent' | 'human' | 'human_creative';
  inputs?: Deliverable[];
  outputs?: Deliverable[];
  estimated_duration?: string;
  algorithm?: string;
  agent_prompt?: string;
  context_gathering?: string[];
  ui_type?: 'form' | 'meeting' | 'writing_session' | 'strategy_session';
  facilitation?: Facilitation;
  issues?: Issue[];
  tags?: string[];
}

/**
 * Deliverable specification
 */
export interface Deliverable {
  name: string;
  type: 'document' | 'data' | 'decision' | 'approval';
  format: string;
  schema?: SchemaDefinition;
  required_fields?: string[];
  validation_rules?: ValidationRule[];
}

/**
 * Other supporting interfaces
 */
export interface Resource {
  type: 'time' | 'people' | 'capital' | 'attention' | 'tooling';
  allocation: number;
  unit: string;
  constraints?: unknown[];
}

export interface Governance {
  escalation_path?: string;
  decision_authority?: string[];
}

export interface TeamInterfaces {
  external?: string[];
  internal?: string[];
}

export interface RoleInterface {
  inputs?: Deliverable[];
  outputs?: Deliverable[];
}

export interface OnboardingStep {
  step: string;
  duration: string;
}

export interface Cadence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand' | 'triggered';
  schedule?: string;
  trigger_events?: string[];
}

export interface SchemaDefinition {
  type: 'json' | 'csv' | 'xml' | 'custom';
  definition?: string | object;
}

export interface ValidationRule {
  rule_type: 'required' | 'format' | 'range' | 'dependency' | 'conflict';
  condition: string;
  error_message: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface Facilitation {
  agenda?: string[];
}

export interface Issue {
  issue_type: string;
  resolution: Resolution;
}

export interface Resolution {
  type: 'escalate' | 'override' | 'delegate' | 'pause' | 'ai_assist';
  target?: string;
  conditions?: string[];
  timeout?: string;
  fallback?: Resolution;
  agent_prompt?: string;
  context_gathering?: string[];
}

/**
 * BUSY Parser class
 */
export class Parser {
  private yamlParser: YamlParser;
  private config: CompilerConfig;
  private schemaPath: string;
  
  constructor(config: CompilerConfig) {
    this.config = config;
    this.yamlParser = new YamlParser();
    this.schemaPath = path.join(__dirname, '../../schemas/busy-schema.json');
  }
  
  /**
   * Parse all files from scan result
   */
  async parse(scanResult: ScanResult): Promise<ParseResult> {
    const startTime = Date.now();
    const parsedFiles: ParsedFile[] = [];
    const parseErrors: ParseError[] = [];
    const validationResults: FileValidationResult[] = [];
    
    // Parse files in parallel if enabled
    if (this.config.parallelProcessing) {
      const results = await Promise.allSettled(
        scanResult.files.map(file => this.parseFile(file))
      );
      
      for (const [index, result] of results.entries()) {
        const filePath = scanResult.files[index];
        
        if (result.status === 'fulfilled') {
          if (result.value.success && result.value.file) {
            parsedFiles.push(result.value.file);
          } else {
            parseErrors.push({
              filePath,
              error: result.value.error || new Error('Unknown parse error'),
              line: result.value.line,
              column: result.value.column
            });
          }
        } else {
          parseErrors.push({
            filePath,
            error: result.reason instanceof Error ? result.reason : new Error(String(result.reason))
          });
        }
      }
    } else {
      // Sequential parsing
      for (const filePath of scanResult.files) {
        try {
          const result = await this.parseFile(filePath);
          if (result.success && result.file) {
            parsedFiles.push(result.file);
          } else {
            parseErrors.push({
              filePath,
              error: result.error || new Error('Unknown parse error'),
              line: result.line,
              column: result.column
            });
          }
        } catch (error) {
          parseErrors.push({
            filePath,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
    
    // Validate schemas for successfully parsed files
    for (const parsedFile of parsedFiles) {
      const validationResult = await this.validateFileSchema(parsedFile);
      validationResults.push(validationResult);
    }
    
    const stats: ParseStats = {
      totalFiles: scanResult.files.length,
      successfullyParsed: parsedFiles.length,
      parseErrors: parseErrors.length,
      validationErrors: validationResults.filter(r => !r.isValid).length,
      parseDurationMs: Date.now() - startTime
    };
    
    return {
      parsedFiles,
      parseErrors,
      validationResults,
      stats
    };
  }
  
  /**
   * Parse a single BUSY file
   */
  private async parseFile(filePath: string): Promise<FileParseResult> {
    try {
      const yaml = await this.yamlParser.parseFile<BusyFileContent>(filePath);
      
      // Determine file type from content
      const fileType = this.determineFileType(yaml.data);
      if (!fileType) {
        return {
          success: false,
          error: new Error('Unable to determine file type - missing team, role, or playbook definition'),
        };
      }
      
      // Extract namespace information
      const namespace = this.extractNamespace(filePath, yaml.data);
      if (!namespace) {
        return {
          success: false,
          error: new Error('Unable to extract namespace information from file path or metadata'),
        };
      }
      
      return {
        success: true,
        file: {
          filePath,
          yaml,
          fileType,
          namespace
        }
      };
    } catch (error) {
      let line: number | undefined;
      let column: number | undefined;
      
      // Extract position information if available
      if (error instanceof Error && 'position' in error) {
        const pos = (error as any).position;
        line = pos?.line;
        column = pos?.column;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        line,
        column
      };
    }
  }
  
  /**
   * Determine file type from content
   */
  private determineFileType(content: BusyFileContent): BusyFileType | null {
    if (content.team || content.teams) return 'team';
    if (content.role) return 'role';
    if (content.playbook) return 'playbook';
    return null;
  }
  
  /**
   * Extract namespace information from file path and metadata
   */
  private extractNamespace(filePath: string, content: BusyFileContent): ParsedFile['namespace'] | null {
    // Use the path-utils namespace parser
    const { parseNamespace } = require('@/utils/path-utils');
    const namespaceInfo = parseNamespace(filePath);
    
    if (!namespaceInfo.isValid) {
      return null;
    }
    
    return {
      org: namespaceInfo.org,
      layer: content.metadata.layer,
      team: namespaceInfo.team,
      category: namespaceInfo.category as 'team' | 'role' | 'playbook'
    };
  }
  
  /**
   * Validate file against BUSY schema
   */
  private async validateFileSchema(parsedFile: ParsedFile): Promise<FileValidationResult> {
    try {
      const validationResult = await this.yamlParser.validateSchema(parsedFile.yaml, this.schemaPath);
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const error of validationResult.errors) {
        const position = error.position ? ` (line ${error.position.line}, column ${error.position.column})` : '';
        errors.push(`${error.message}${position}`);
      }
      
      // Additional semantic validation
      const semanticValidation = this.validateSemantics(parsedFile);
      errors.push(...semanticValidation.errors);
      warnings.push(...semanticValidation.warnings);
      
      return {
        filePath: parsedFile.filePath,
        isValid: validationResult.isValid && semanticValidation.errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        filePath: parsedFile.filePath,
        isValid: false,
        errors: [`Schema validation failed: ${(error as Error).message}`],
        warnings: []
      };
    }
  }
  
  /**
   * Perform semantic validation beyond schema
   */
  private validateSemantics(parsedFile: ParsedFile): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const content = parsedFile.yaml.data;
    
    // Validate version format
    if (!/^\d+\.\d+(\.\d+)?$/.test(content.version)) {
      errors.push(`Invalid version format '${content.version}'. Expected semver format (e.g., '1.0' or '1.0.0')`);
    }
    
    // Validate layer consistency
    if (content.metadata.layer !== parsedFile.namespace.layer) {
      errors.push(`Layer mismatch: metadata declares '${content.metadata.layer}' but file is in '${parsedFile.namespace.layer}' directory`);
    }
    
    // File-type specific validation
    switch (parsedFile.fileType) {
      case 'role':
        this.validateRole(content.role!, errors, warnings);
        break;
      case 'playbook':
        this.validatePlaybook(content.playbook!, errors, warnings);
        break;
      case 'team':
        this.validateTeam(content.team || content.teams![0], errors, warnings);
        break;
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate role-specific semantics
   */
  private validateRole(role: Role, errors: string[], warnings: string[]): void {
    // Validate role name format
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(role.name)) {
      errors.push(`Role name '${role.name}' must be kebab-case (lowercase with hyphens)`);
    }
    
    // Check for empty tasks
    if (!role.tasks || role.tasks.length === 0) {
      warnings.push(`Role '${role.name}' has no tasks defined`);
    }
    
    // Validate task names within role
    const taskNames = new Set<string>();
    for (const task of role.tasks || []) {
      if (taskNames.has(task.name)) {
        errors.push(`Duplicate task name '${task.name}' in role '${role.name}'`);
      }
      taskNames.add(task.name);
      
      this.validateTask(task, errors, warnings);
    }
  }
  
  /**
   * Validate playbook-specific semantics
   */
  private validatePlaybook(playbook: Playbook, errors: string[], warnings: string[]): void {
    // Validate playbook name format
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(playbook.name)) {
      errors.push(`Playbook name '${playbook.name}' must be kebab-case (lowercase with hyphens)`);
    }
    
    // Validate cadence
    if (playbook.cadence.frequency === 'triggered' && (!playbook.cadence.trigger_events || playbook.cadence.trigger_events.length === 0)) {
      warnings.push(`Triggered playbook '${playbook.name}' has no trigger events defined`);
    }
    
    // Validate steps
    if (!playbook.steps || playbook.steps.length === 0) {
      warnings.push(`Playbook '${playbook.name}' has no steps defined`);
    }
    
    // Validate step names within playbook
    const stepNames = new Set<string>();
    for (const step of playbook.steps || []) {
      if (stepNames.has(step.name)) {
        errors.push(`Duplicate step name '${step.name}' in playbook '${playbook.name}'`);
      }
      stepNames.add(step.name);
      
      this.validateTask(step, errors, warnings);
    }
  }
  
  /**
   * Validate team-specific semantics
   */
  private validateTeam(team: Team, errors: string[], warnings: string[]): void {
    // Teams should have either roles or playbooks (or both)
    const hasRoles = team.roles && team.roles.length > 0;
    const hasPlaybooks = team.playbooks && team.playbooks.length > 0;
    
    if (!hasRoles && !hasPlaybooks) {
      warnings.push(`Team '${team.name}' has no roles or playbooks defined`);
    }
  }
  
  /**
   * Validate task semantics
   */
  private validateTask(task: Task, errors: string[], warnings: string[]): void {
    // Validate task name format
    if (!/^[a-z][a-z0-9_]*$/.test(task.name)) {
      errors.push(`Task name '${task.name}' must be snake_case`);
    }
    
    // Validate execution type specific requirements
    switch (task.execution_type) {
      case 'algorithmic':
        if (!task.algorithm) {
          warnings.push(`Algorithmic task '${task.name}' should specify an algorithm`);
        }
        break;
      case 'ai_agent':
        if (!task.agent_prompt) {
          errors.push(`AI agent task '${task.name}' must specify an agent_prompt`);
        }
        break;
      case 'human':
        if (!task.ui_type) {
          warnings.push(`Human task '${task.name}' should specify a ui_type`);
        }
        break;
    }
    
    // Validate duration format
    if (task.estimated_duration && !/^\d+[mhd]$/.test(task.estimated_duration)) {
      errors.push(`Invalid duration format '${task.estimated_duration}' for task '${task.name}'. Use format like '30m', '2h', '1d'`);
    }
  }
}

/**
 * Internal parse result for single file
 */
interface FileParseResult {
  success: boolean;
  file?: ParsedFile;
  error?: Error;
  line?: number;
  column?: number;
}