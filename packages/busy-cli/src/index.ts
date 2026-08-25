// Main exports
export { loadRepo } from './loader.js';
export { parseDocument, resolveImports } from './parser.js';
export { loadWorkspaceAutomationIR } from './commands/automation-ir.js';
export { compileBusyDocument } from './compiler/compile-document.js';
export { compileBusyWorkspace } from './compiler/compile-workspace.js';
export { buildContext, writeContext, get, parentsOf, childrenOf, getConceptContext } from './builders/context.js';
export { mergeRepos, extendRepo, loadRepoFromJSON } from './merge.js';

// Type exports
export type {
  DocId,
  Slug,
  Section,
  ConceptBase,
  BusyDocument,
  Playbook,
  View,
  ViewParam,
  Config,
  LocalDef,
  Operation,
  ImportDef,
  EdgeRole,
  Edge,
  File,
  Repo,
  ContextPayload,
  FrontMatter,
  Metadata,
  Import,
  Trigger,
  NewOperation,
  Tool,
  ToolDocument,
} from './types/schema.js';

export type {
  WorkspaceAutomationDocument,
  WorkspaceAutomationStats,
  WorkspaceAutomationIR,
  LoadWorkspaceAutomationIROptions,
} from './commands/automation-ir.js';

export type {
  BusyChecklistItemIR,
  BusyConditionIR,
  BusyDiagnostic,
  BusyDiagnosticSeverity,
  BusyDocumentIR,
  BusyDocumentKind,
  BusyEmitIR,
  BusyFieldIR,
  BusyImportIR,
  BusyMetadataIR,
  BusyModelIR,
  BusyOperationIR,
  BusyRoleContextIR,
  BusySectionIR,
  BusySourceSpan,
  BusyStepIR,
  BusyTriggerIR,
  BusyWorkspaceIR,
  BusyWorkspaceStats,
  CompileBusyWorkspaceOptions,
} from './compiler/types.js';

export type { BuildOpts, ConceptContext } from './builders/context.js';

// Zod Schema exports for validation in other repos
export {
  DocIdSchema,
  SlugSchema,
  SectionIdSchema,
  ConceptIdSchema,
  SectionSchema,
  ConceptBaseSchema,
  LocalDefSchema,
  SetupSchema,
  OperationSchema,
  ImportDefSchema,
  BusyDocumentSchema,
  PlaybookSchema,
  EdgeRoleSchema,
  EdgeSchema,
  FileSchema,
  RepoSchema,
  ContextPayloadSchema,
  FrontMatterSchema,
} from './types/schema.js';
