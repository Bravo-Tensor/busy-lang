/**
 * Core types for Orgata Framework
 * 
 * Based on design specification:
 * - Framework API Specification: ../../design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md
 */

import { EventEmitter } from 'eventemitter3';

// =============================================================================
// Core Enums and Primitives
// =============================================================================

export enum ProcessStatus {
  NOT_STARTED = 'not_started',
  RUNNING = 'running', 
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum StepType {
  HUMAN = 'human',
  AGENT = 'agent', 
  ALGORITHM = 'algorithm'
}

export enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  NUMBER = 'number',
  DATE = 'date',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE_UPLOAD = 'file_upload',
  CURRENCY = 'currency',
  PHONE = 'phone',
  URL = 'url',
  JSON = 'json',
  CUSTOM = 'custom'
}

export enum OverrideType {
  SKIP_STEP = 'skip_step',
  MODIFY_UI = 'modify_ui',
  CHANGE_DATA = 'change_data', 
  ALTER_FLOW = 'alter_flow',
  BYPASS_VALIDATION = 'bypass_validation'
}

export enum ExceptionType {
  STEP_SKIPPED = 'step_skipped',
  VALIDATION_OVERRIDDEN = 'validation_overridden',
  MANUAL_DATA_PROVIDED = 'manual_data_provided',
  FLOW_MODIFIED = 'flow_modified',
  UI_BYPASSED = 'ui_bypassed'
}

// =============================================================================
// Configuration Interfaces
// =============================================================================

export interface ProcessConfig {
  name: string;
  description?: string;
  layer: 'L0' | 'L1' | 'L2';
  estimatedDuration?: string;
  metadata?: Record<string, any>;
  validation?: ProcessValidation;
  permissions?: ProcessPermissions;
}

export interface StepConfig {
  id: string;
  name: string;
  description: string;
  type: StepType;
  metadata?: Record<string, any>;
}

export interface HumanStepConfig extends StepConfig {
  model: FormModel;
  view: ComponentDefinition;
  validation?: ValidationRules;
}

export interface AgentStepConfig extends StepConfig {
  prompt: AgentPrompt;
  context: AgentContext;
  constraints?: AgentConstraints;
}

export interface AlgorithmStepConfig extends StepConfig {
  implementation: AlgorithmImplementation;
  parameters?: AlgorithmParameters;
}

// =============================================================================
// Context and Execution Interfaces
// =============================================================================

export interface ProcessContext {
  processId: string;
  userId: string;
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  businessContext: BusinessContext;
  permissions: UserPermissions;
  preferences: UserPreferences;
}

export interface StepContext extends ProcessContext {
  stepId: string;
  stepType: StepType;
  inputData: any;
  previousStepResults: Map<string, StepResult>;
  requiredOutputs: OutputRequirement[];
  validationRules: ValidationRule[];
  startTime: Date;
  userAgent?: string;
}

export interface BusinessContext {
  industry: string;
  businessSize: 'solo' | 'small' | 'medium' | 'enterprise';
  organizationId: string;
  currentProcesses: Map<string, any>;
  userRole: string;
}

export interface UserPermissions {
  canSkipSteps: boolean;
  canOverrideValidation: boolean;
  canModifyProcess: boolean;
  canViewAuditTrail: boolean;
  allowedActions: string[];
}

export interface UserPreferences {
  uiTheme: 'light' | 'dark';
  language: string;
  timezone: string;
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}

// =============================================================================
// Result and Response Interfaces  
// =============================================================================

export interface ProcessResult {
  success: boolean;
  processId: string;
  completedSteps: string[];
  finalData: any;
  metadata: ProcessMetadata;
  auditTrail: AuditEntry[];
  exceptions?: ProcessException[];
}

export interface StepResult {
  success: boolean;
  data: any;
  metadata: StepMetadata;
  nextStepId?: string;
  errors?: StepError[];
  warnings?: StepWarning[];
}

export interface ProcessMetadata {
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  executionMode: string;
  version: string;
}

export interface StepMetadata {
  completedAt: Date;
  duration?: number;
  userAgent?: string;
  overrides?: OverrideRecord[];
  
  // Agent-specific metadata
  requiresHumanReview?: boolean;
  agentConfidence?: number;
  reasoning?: string;
  confidence?: number;
  requiresReview?: boolean;
  
  // Algorithm-specific metadata
  requiresManualReview?: boolean;
  algorithmVersion?: string;
  executionTime?: number;
  requiresManualIntervention?: boolean;
  error?: string;
}

export interface StepError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface StepWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// =============================================================================
// Form and UI Interfaces
// =============================================================================

export interface FormModel {
  fields: FormField[];
  layout: LayoutConfig;
  validation: ValidationConfig;
  metadata: FormMetadata;
}

export interface FormField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  validation: FieldValidation[];
  defaultValue?: any;
  options?: FieldOption[];
  conditionalLogic?: ConditionalLogic;
}

export interface FieldValidation {
  type: string;
  value?: any;
  message: string;
}

export interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ConditionalLogic {
  condition: string;
  action: 'show' | 'hide' | 'require' | 'disable';
  dependsOn: string[];
}

export interface LayoutConfig {
  type: string;
  columns: number;
  sections?: LayoutSection[];
}

export interface LayoutSection {
  title: string;
  fields: string[];
  collapsible?: boolean;
}

export interface ValidationConfig {
  strategy: 'on-submit' | 'on-blur' | 'real-time';
  showErrorsOn: 'always' | 'after-submit' | 'after-interaction';
}

export interface FormMetadata {
  version: string;
  generatedFrom: string;
  customizations?: Record<string, any>;
}

export interface ComponentDefinition {
  type: string;
  props: ComponentProps;
  children?: ComponentDefinition[];
  styling?: ComponentStyling;
  behavior?: ComponentBehavior;
}

export interface ComponentProps {
  [key: string]: any;
}

export interface ComponentStyling {
  className?: string;
  style?: Record<string, any>;
  theme?: string;
}

export interface ComponentBehavior {
  onClick?: string;
  onChange?: string;
  onSubmit?: string;
  validation?: ValidationBehavior;
}

export interface ValidationBehavior {
  realTime: boolean;
  debounceMs: number;
  showErrors: boolean;
}

// =============================================================================
// AI Agent Interfaces
// =============================================================================

export interface AgentPrompt {
  systemPrompt: string;
  userPrompt: string;
  context: PromptContext;
  constraints: PromptConstraints;
  examples?: PromptExample[];
}

export interface PromptContext {
  businessDomain: string;
  expectedFormat: string;
  qualityCriteria: string[];
}

export interface PromptConstraints {
  maxTokens: number;
  temperature: number;
  requireStructuredOutput: boolean;
}

export interface PromptExample {
  input: string;
  output: string;
  explanation: string;
}

export interface AgentContext {
  processContext: ProcessContext;
  stepContext: StepContext;
  businessData: BusinessData;
  previousResults: AgentResult[];
  availableTools: AgentTool[];
}

export interface BusinessData {
  [key: string]: any;
}

export interface AgentResult {
  stepId: string;
  result: any;
  confidence: number;
  timestamp: Date;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface AgentResponse {
  content: string;
  confidence: number;
  reasoning: string;
  structuredData?: any;
  suggestedActions?: SuggestedAction[];
  requiresHumanReview: boolean;
}

export interface SuggestedAction {
  type: string;
  description: string;
  confidence: number;
}

export interface AgentConstraints {
  timeout: number;
  retryAttempts: number;
  fallbackToHuman: boolean;
}

// =============================================================================
// Algorithm Interfaces
// =============================================================================

export interface AlgorithmImplementation {
  type: string;
  config: Record<string, any>;
  version: string;
}

export interface AlgorithmParameters {
  [key: string]: any;
}

export interface AlgorithmInput {
  [key: string]: any;
}

export interface AlgorithmOutput {
  [key: string]: any;
}

// =============================================================================
// State Management Interfaces
// =============================================================================

export interface StepData {
  stepId: string;
  data: any;
  timestamp: Date;
  source: 'user' | 'agent' | 'algorithm' | 'manual';
  validated: boolean;
}

export interface ProcessEvent {
  id: string;
  processId: string;
  timestamp: Date;
  userId?: string;
  type: string;
  data: any;
}

export interface ProcessException {
  id: string;
  type: ExceptionType;
  stepId: string;
  timestamp: Date;
  userId: string;
  reason: string;
  impact: ExceptionImpact;
  resolution?: ExceptionResolution;
  auditTrail: AuditEntry[];
}

export interface ExceptionImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSteps: string[];
  estimatedDelay: number;
  riskFactors: string[];
}

export interface ExceptionResolution {
  strategy: string;
  implementedBy: string;
  timestamp: Date;
  effectiveness: number;
}

// =============================================================================
// Validation Interfaces
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field?: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationRule {
  type: string;
  field?: string;
  condition: ValidationCondition;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationCondition {
  operator: string;
  value: any;
  field?: string;
}

export interface ProcessValidation {
  requireAllSteps: boolean;
  allowSkipping: boolean;
  customRules: ValidationRule[];
}

export interface ProcessPermissions {
  execute: string[];
  modify: string[];
  view: string[];
  audit: string[];
}

export interface ValidationRules {
  fields: Record<string, FieldValidation[]>;
  custom: ValidationRule[];
}

// =============================================================================
// Override and Flexibility Interfaces
// =============================================================================

export interface OverrideRequest {
  type: OverrideType;
  stepId: string;
  userMessage: string;
  currentContext: ProcessContext;
  proposedChange?: any;
}

export interface OverrideResult {
  approved: boolean;
  implementation: OverrideImplementation;
  consequences: ConsequenceAnalysis;
  auditEntry: AuditEntry;
  alternatives?: OverrideAlternative[];
}

export interface OverrideImplementation {
  type: string;
  changes: Record<string, any>;
  instructions: string;
}

export interface ConsequenceAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  missingData: string[];
  affectedSteps: string[];
  suggestedMitigations: string[];
  dataRequirements: DataRequirement[];
}

export interface DataRequirement {
  field: string;
  type: string;
  required: boolean;
  description: string;
  source?: string;
}

export interface OverrideAlternative {
  description: string;
  implementation: OverrideImplementation;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OverrideRecord {
  type: OverrideType;
  timestamp: Date;
  reason: string;
  implementation: string;
}

// =============================================================================
// Audit and Tracking Interfaces
// =============================================================================

export interface AuditEntry {
  id: string;
  timestamp: Date;
  processId: string;
  stepId?: string;
  userId: string;
  action: AuditAction;
  details: AuditDetails;
  impact: AuditImpact;
}

export interface AuditAction {
  type: string;
  description: string;
  automated: boolean;
}

export interface AuditDetails {
  before?: any;
  after?: any;
  metadata: Record<string, any>;
}

export interface AuditImpact {
  scope: 'step' | 'process' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  categories: string[];
}

// =============================================================================
// Requirement Interfaces
// =============================================================================

export interface OutputRequirement {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: ValidationRule[];
}

export interface InputRequirement {
  name: string;
  type: string;
  required: boolean;
  source: string;
  transformation?: string;
}

export interface UIConstraints {
  allowFreeForm: boolean;
  skipValidation: boolean;
  maxFields?: number;
  requiredFields: string[];
}

// =============================================================================
// Utility Types
// =============================================================================

export type StepExecutor = (context: StepContext) => Promise<StepResult>;
export type ValidationFunction = (data: any) => ValidationResult;
export type EventHandler = (event: ProcessEvent) => void;

// =============================================================================
// Abstract Base Classes (for implementation)
// =============================================================================

export abstract class ProcessEventBase {
  abstract readonly id: string;
  abstract readonly processId: string;
  abstract readonly timestamp: Date;
  abstract readonly userId?: string;
  abstract readonly type: string;
  
  abstract apply(state: any): any;
}

// Re-export EventEmitter for convenience
export { EventEmitter };