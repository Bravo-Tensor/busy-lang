export { validateDocument } from './validation/index.js';
export type { ValidationFinding, ValidationResult } from './validation/index.js';
// Main exports
export { loadRepo, loadResolvedRepo, buildRepo } from './loader.js';
export type { RepoSource } from './loader.js';
export { parseDocument, parseSource, resolveImports } from './parser.js';
export type { ParsedSource, ResolveImportOptions } from './parser.js';
export { compileRun } from './runner/program.js';
export { generateRun, CompilationFailure, defaultCompilerModel } from './runner/compiler.js';
export type { CompilationOptions, CompilationResult } from './runner/compiler.js';
export type { RunProgram, RunStep } from './runner/program.js';
export { BusyRunner } from './runner/store.js';
export type { RunExchange, RunEvent, Sense, Frame } from './runner/store.js';
export type { Interpretation, PreparedStep, ReplySchema, Json, Values } from './runner/schema.js';
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

export { prepareRun, checkPreparedRun, createCursorDraft } from './runner/preparation.js';
export { loadRunSource, lowerRun, canonical } from './runner/program.js';
export { buildCompilationCatalog, lowerConstrainedDraft, checkCoverage } from './runner/compiler.js';
export type { CompilationCatalog } from './runner/compiler.js';
export { checkBindings } from './runner/checks.js';

export { resolveGuidanceClosure } from './runner/guidance.js';
export type { GuidancePolicy, GuidanceClosure, GuidanceFile, GuidanceLink } from './runner/guidance.js';
export { sha256Bytes, listSourceFiles, fingerprintFiles, portableRunProgram, getRunnerIdentity } from './runner/identity.js';
export { checkGuidanceClosure } from './runner/guidance.js';
export { checkFileFingerprint } from './runner/identity.js';
export { parseMarkdown } from './parsers/markdown.js';
