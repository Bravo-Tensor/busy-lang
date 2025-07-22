/**
 * Orgata Framework - React-like framework for business processes
 * 
 * Main entry point for the @orgata/framework package.
 * Exports all core classes, types, and utilities.
 * 
 * Based on design specification:
 * - Framework Architecture: ../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 * - API Specification: ../design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md
 */

// =============================================================================
// Core Classes
// =============================================================================

export { Process } from './core/Process';
export { Step, HumanStep, AgentStep, AlgorithmStep } from './core/Step';

// =============================================================================
// State Management
// =============================================================================

export { ProcessState } from './state/ProcessState';
export {
  StepDataEvent,
  StepNavigationEvent,
  StepSkippedEvent,
  StatusChangeEvent,
  ExceptionEvent
} from './state/ProcessState';

// =============================================================================
// Types and Interfaces
// =============================================================================

export type {
  // Core Configuration Types
  ProcessConfig,
  StepConfig,
  HumanStepConfig,
  AgentStepConfig,
  AlgorithmStepConfig,

  // Context and Execution Types
  ProcessContext,
  StepContext,
  BusinessContext,
  UserPermissions,
  UserPreferences,

  // Result Types
  ProcessResult,
  StepResult,
  ProcessMetadata,
  StepMetadata,
  StepError,
  StepWarning,

  // Form and UI Types
  FormModel,
  FormField,
  FieldValidation,
  FieldOption,
  ConditionalLogic,
  LayoutConfig,
  ValidationConfig,
  ComponentDefinition,
  ComponentProps,
  ComponentStyling,
  ComponentBehavior,

  // AI Agent Types
  AgentPrompt,
  AgentContext,
  AgentResponse,
  AgentConstraints,
  PromptContext,
  PromptConstraints,
  BusinessData,

  // Algorithm Types
  AlgorithmImplementation,
  AlgorithmParameters,
  AlgorithmInput,
  AlgorithmOutput,

  // State Management Types
  StepData,
  ProcessEvent,
  ProcessException,
  ExceptionImpact,
  ExceptionResolution,

  // Validation Types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationRule,
  ValidationCondition,

  // Override and Flexibility Types
  OverrideRequest,
  OverrideResult,
  OverrideImplementation,
  ConsequenceAnalysis,
  DataRequirement,

  // Audit Types
  AuditEntry,
  AuditAction,
  AuditDetails,
  AuditImpact,

  // Utility Types
  OutputRequirement,
  InputRequirement,
  UIConstraints,
  StepExecutor,
  ValidationFunction,
  EventHandler
} from './types';

// =============================================================================
// Enums
// =============================================================================

export {
  ProcessStatus,
  StepType,
  FieldType,
  OverrideType,
  ExceptionType
} from './types';

// =============================================================================
// Re-exports
// =============================================================================

export { EventEmitter } from './types';

// =============================================================================
// Framework Version and Metadata
// =============================================================================

export const FRAMEWORK_VERSION = '0.1.0';
export const FRAMEWORK_NAME = '@orgata/framework';

export const FRAMEWORK_METADATA = {
  name: FRAMEWORK_NAME,
  version: FRAMEWORK_VERSION,
  description: 'React-like framework for business processes with complete flexibility',
  philosophy: 'Facilitate, Never Constrain',
  features: [
    'Immutable state management with event sourcing',
    'Complete audit trail and exception tracking',
    'AI-powered flexibility and override system',
    'Never rewrite history - forward-only updates',
    'Universal step skipping with manual data provision',
    'Three specialized step types: Human, Agent, Algorithm'
  ],
  designDocs: [
    '../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md',
    '../design-docs/008-orgata-framework/FRAMEWORK_API_SPECIFICATION.md',
    '../design-docs/008-orgata-framework/IMPLEMENTATION_PLAN.md'
  ]
} as const;