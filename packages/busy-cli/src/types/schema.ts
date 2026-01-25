import { z } from 'zod';

// =============================================================================
// NEW SCHEMAS - Matching busy-python models (source of truth)
// =============================================================================

/**
 * Metadata schema - matches busy-python Metadata model
 * Required: name, type, description
 * Optional: provider (for tool documents)
 * NOTE: Extends and Tags have been removed (not in busy-python)
 */
export const MetadataSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  provider: z.string().optional(),
}).strict(); // Use strict to reject extra fields like extends/tags

export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Import schema - matches busy-python Import model
 * Reference-style links: [ConceptName]: path/to/file.md[#anchor]
 */
export const ImportSchema = z.object({
  conceptName: z.string().min(1),
  path: z.string().min(1),
  anchor: z.string().optional(),
});

export type Import = z.infer<typeof ImportSchema>;

/**
 * LocalDefinition schema - matches busy-python LocalDefinition model
 */
export const LocalDefinitionSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
});

export type LocalDefinition = z.infer<typeof LocalDefinitionSchema>;

/**
 * Step schema - matches busy-python Step model
 * Steps have stepNumber, instruction, and optional operationReferences
 */
export const StepSchema = z.object({
  stepNumber: z.number().int().min(1),
  instruction: z.string().min(1),
  operationReferences: z.array(z.string()).optional(),
});

export type Step = z.infer<typeof StepSchema>;

/**
 * Checklist schema - matches busy-python Checklist model
 */
export const ChecklistSchema = z.object({
  items: z.array(z.string()),
});

export type Checklist = z.infer<typeof ChecklistSchema>;

/**
 * Trigger schema - matches busy-python Trigger model
 * Supports both time-based (alarm) and event-based triggers
 */
export const TriggerSchema = z.object({
  rawText: z.string(),
  triggerType: z.enum(['alarm', 'event']),
  schedule: z.string().optional(), // cron expression for alarms
  eventType: z.string().optional(), // event type for event triggers
  filter: z.record(z.string()).optional(), // filter criteria
  operation: z.string(), // operation to run
  queueWhenPaused: z.boolean().default(true),
});

export type Trigger = z.infer<typeof TriggerSchema>;

/**
 * Operation schema (NEW) - matches busy-python Operation model
 * Different from the old graph-based OperationSchema
 */
export const NewOperationSchema = z.object({
  name: z.string().min(1),
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
  steps: z.array(StepSchema).default([]),
  checklist: ChecklistSchema.optional(),
});

export type NewOperation = z.infer<typeof NewOperationSchema>;

/**
 * Tool schema - matches busy-python Tool model
 * Tools have provider mappings for external integrations
 */
export const ToolSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  examples: z.array(z.string()).optional(),
  providers: z.record(z.object({
    action: z.string(),
    parameters: z.record(z.any()).optional(),
  })).optional(),
});

export type Tool = z.infer<typeof ToolSchema>;

/**
 * BusyDocument schema (NEW) - matches busy-python BusyDocument model
 * This is the new document-centric schema, different from the graph-based one
 */
export const NewBusyDocumentSchema = z.object({
  metadata: MetadataSchema,
  imports: z.array(ImportSchema).default([]),
  definitions: z.array(LocalDefinitionSchema).default([]),
  setup: z.string().optional(),
  operations: z.array(NewOperationSchema).default([]),
  triggers: z.array(TriggerSchema).default([]),
});

export type NewBusyDocument = z.infer<typeof NewBusyDocumentSchema>;

/**
 * ToolDocument schema - extends BusyDocument with tools array
 */
export const ToolDocumentSchema = NewBusyDocumentSchema.extend({
  tools: z.array(ToolSchema).default([]),
});

export type ToolDocument = z.infer<typeof ToolDocumentSchema>;

// =============================================================================
// LEGACY SCHEMAS - Kept for graph functionality (may be refactored later)
// =============================================================================

// Base types
export const DocIdSchema = z.string();
export const SlugSchema = z.string();
export const SectionIdSchema = z.string(); //unique id in the parsed documents hierarchy.
export const ConceptIdSchema = z.string(); //conceptual reference, where it is in the object model eg: document.operations.evaluateDocument

// Define recursive types first to avoid circular reference errors
type Section = {
  kind: 'section';
  id: string;
  docId: string;
  slug: string;
  title: string;
  depth: number;
  path: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  children: Section[];
};

type ConceptBase = {
  kind: 'concept' | 'document' | 'operation' | 'checklist' | 'tool' | 'playbook' | 'localdef' | 'importdef' | 'setup';
  id: string;
  docId: string;
  slug: string;
  name: string;
  description?: string;
  types: string[];
  extends: string[];
  sectionRef: string;
  children: ConceptBase[];
};

// Section schema
export const SectionSchema: z.ZodType<Section> = z.lazy(() =>
  z.object({
    kind: z.literal('section'),
    id: SectionIdSchema,
    docId: DocIdSchema,
    slug: SlugSchema,
    title: z.string(),
    depth: z.number().int().min(1).max(6),
    path: z.string(),
    lineStart: z.number(),
    lineEnd: z.number(),
    content: z.string(),
    children: z.array(SectionSchema),
  })
);

// Export Section type
export type { Section };

// ConceptBase schema - need to keep as regular object schema to allow .extend()
const ConceptBaseSchemaObject = z.object({
  kind: z.enum(['concept', 'document', 'operation', 'checklist', 'tool', 'playbook', 'localdef', 'importdef', 'setup']),
  id: ConceptIdSchema,
  docId: DocIdSchema,
  slug: z.string(),
  name: z.string(),
  content: z.string(),
  types: z.array(ConceptIdSchema),
  extends: z.array(ConceptIdSchema),
  sectionRef: SectionIdSchema,
});

export const ConceptBaseSchema: z.ZodType<ConceptBase> = z.lazy(() =>
  ConceptBaseSchemaObject.extend({
    children: z.array(ConceptBaseSchema),
  })
);

// Export ConceptBase type
export type { ConceptBase };

// LocalDef schema - extends ConceptBase (leaf node, no children)
export const LocalDefSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('localdef'),
});

// Setup schema - extends ConceptBase (leaf node, no children)
export const SetupSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('setup'),
});

// Operation schema (LEGACY) - extends ConceptBase (leaf node, no children)
// Used for graph-based representation
export const LegacyOperationSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('operation'),
    steps: z.array(z.string()), // Parsed step items (legacy: strings only)
    checklist: z.array(z.string()), // Parsed checklist items
});

// Keep OperationSchema as the legacy schema for backward compatibility with loader
export const OperationSchema = LegacyOperationSchema;

// ImportDef schema - extends ConceptBase (leaf node, no children)
export const ImportDefSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('importdef'),
    label: z.string(),
    target: SectionIdSchema,
    resolved: ConceptIdSchema.optional(),
});

// BusyDocument schema (LEGACY) - graph-based representation
export const LegacyBusyDocumentSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('document'),
    imports: z.array(ImportDefSchema),
    localdefs: z.array(LocalDefSchema),
    setup: SetupSchema,
    operations: z.array(LegacyOperationSchema)
  })

// Keep BusyDocumentSchema as the legacy schema for backward compatibility with loader
export const BusyDocumentSchema = LegacyBusyDocumentSchema;

// Playbook schema - extends LegacyBusyDocument with ordered sequence of operations
export const PlaybookSchema = LegacyBusyDocumentSchema.extend({
    kind: z.literal('playbook'),
    sequence: z.array(ConceptIdSchema), // Ordered array of operation references
  })

// Edge schema
export const EdgeRoleSchema = z.enum(['ref', 'calls', 'extends', 'imports']);
export const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  role: EdgeRoleSchema,
});

// File schema - represents a parsed markdown file with its sections
export const FileSchema = z.object({
  docId: DocIdSchema,
  path: z.string(),
  name: z.string(),
  sections: z.array(SectionSchema),
});

// Repo schema (uses legacy schemas for graph functionality)
export const RepoSchema = z.object({
  files: z.array(FileSchema), // Parsed files with their sections
  concepts: z.array(ConceptBaseSchema), // All concepts (BusyDocuments, Playbooks, etc.)
  localdefs: z.record(LocalDefSchema),
  operations: z.record(LegacyOperationSchema),
  imports: z.array(ImportDefSchema),
  byId: z.record(z.union([SectionSchema, LocalDefSchema, LegacyOperationSchema, ConceptBaseSchema])),
  byFile: z.record( // Renamed from byDoc for clarity
    z.object({
      concept: z.union([LegacyBusyDocumentSchema, PlaybookSchema]), // The concept defined in this file
      bySlug: z.record(SectionSchema),
    })
  ),
  edges: z.array(EdgeSchema),
});

// ContextPayload schema (uses legacy operation schema)
export const ContextPayloadSchema = z.object({
  operation: LegacyOperationSchema,
  calls: z.array(ConceptIdSchema),
  symbols: z.record(
    z.object({
      docId: DocIdSchema.optional(),
      slug: SlugSchema.optional(),
    })
  ),
});

// TypeScript types inferred from schemas

// New types (busy-python compatible) - exported at top of file:
// Metadata, Import, LocalDefinition, Step, Checklist, Trigger,
// NewOperation (aliased as Operation), Tool, NewBusyDocument (aliased as BusyDocument),
// ToolDocument

// Legacy graph-based types
export type DocId = z.infer<typeof DocIdSchema>;
export type Slug = z.infer<typeof SlugSchema>;
// Section and ConceptBase types defined above to avoid circular references
export type LegacyBusyDocument = z.infer<typeof LegacyBusyDocumentSchema>;
export type Playbook = z.infer<typeof PlaybookSchema>;
export type LocalDef = z.infer<typeof LocalDefSchema>;
export type LegacyOperation = z.infer<typeof LegacyOperationSchema>;
export type ImportDef = z.infer<typeof ImportDefSchema>;
export type EdgeRole = z.infer<typeof EdgeRoleSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type File = z.infer<typeof FileSchema>;
export type Repo = z.infer<typeof RepoSchema>;
export type ContextPayload = z.infer<typeof ContextPayloadSchema>;

// Keep legacy types as default for backward compatibility with loader
export type BusyDocument = LegacyBusyDocument;
export type Operation = LegacyOperation;

// Front-matter schema
// Type can be:
// - array of strings (plain): ["Document", "Concept"]
// - array with markdown links: ["[Document]", "[Concept]"]
// - single string (we'll normalize to array)
export const FrontMatterSchema = z.object({
  Name: z.string(),
  Type: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (typeof val === 'string') return [val];
      return val;
    }),
  Extends: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (typeof val === 'string') return [val];
      return val;
    }),
  Description: z.string().optional(),
  Tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (typeof val === 'string') return [val];
      return val;
    }),
});

export type FrontMatter = z.infer<typeof FrontMatterSchema>;
