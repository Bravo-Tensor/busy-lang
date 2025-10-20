// Main exports
export { loadRepo } from './loader.js';
export { buildContext, writeContext, get, parentsOf, childrenOf, getConceptContext } from './builders/context.js';
export { mergeRepos, extendRepo, loadRepoFromJSON } from './merge.js';

// Type exports
export type {
  DocId,
  Slug,
  Section,
  ConceptBase,
  BusyDocument,
  LocalDef,
  Operation,
  ImportDef,
  EdgeRole,
  Edge,
  File,
  Repo,
  ContextPayload,
  FrontMatter,
} from './types/schema.js';

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
