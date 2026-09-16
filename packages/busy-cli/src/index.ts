export { validateDocument } from './validation/index.js';
export type { ValidationFinding, ValidationResult } from './validation/index.js';
// Main exports
export { loadRepo } from './loader.js';
export { parseDocument, parseSource, resolveImports } from './parser.js';
export type { ParsedSource } from './parser.js';
export { loadWorkspaceAutomationIR } from './commands/automation-ir.js';
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
  Trigger,
  ParsedDocument,
  Tool,
  ToolDocument,
} from './types/schema.js';

export type {
  WorkspaceAutomationDocument,
  WorkspaceAutomationStats,
  WorkspaceAutomationIR,
  LoadWorkspaceAutomationIROptions,
} from './commands/automation-ir.js';

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
