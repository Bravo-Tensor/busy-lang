import { z } from 'zod';

/**
 * Required: name, type, description
 * Optional: provider (for tool documents)
 */
export const MetadataSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  provider: z.string().optional(),
}).strict(); // Use strict to reject extra fields like extends/tags

export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Steps have stepNumber, instruction, and optional operationReferences
 */
export const StepSchema = z.object({
  stepNumber: z.number().int().min(1),
  instruction: z.string().min(1),
  operationReferences: z.array(z.string()).optional(),
});

export type Step = z.infer<typeof StepSchema>;

export const ChecklistSchema = z.object({
  items: z.array(z.string()),
});

export type Checklist = z.infer<typeof ChecklistSchema>;

/**
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
  kind: 'concept' | 'document' | 'operation' | 'checklist' | 'tool' | 'playbook' | 'view' | 'config' | 'localdef' | 'importdef' | 'setup';
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
  kind: z.enum(['concept', 'document', 'operation', 'checklist', 'tool', 'playbook', 'view', 'config', 'localdef', 'importdef', 'setup']),
  id: ConceptIdSchema,
  docId: DocIdSchema,
  slug: z.string(),
  name: z.string(),
  content: z.string(),
  types: z.array(ConceptIdSchema),
  extends: z.array(ConceptIdSchema),
  sectionRef: SectionIdSchema,
  meta: z.record(z.unknown()).optional(),  // Extra frontmatter for downstream consumers
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

// Used for graph-based representation
export const OperationSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('operation'),
    inputs: z.array(z.string()).default([]),
    outputs: z.array(z.string()).default([]),
    steps: z.array(StepSchema),
    checklist: ChecklistSchema.optional(),
});


// ImportDef schema - extends ConceptBase (leaf node, no children)
export const ImportDefSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('importdef'),
    label: z.string(),
    target: SectionIdSchema,
    resolved: ConceptIdSchema.optional(),
});

export const BusyDocumentSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('document'),
    imports: z.array(ImportDefSchema),
    localdefs: z.array(LocalDefSchema),
    setup: SetupSchema.optional(),
    description: z.string().optional(),
    triggers: z.array(TriggerSchema).default([]),
    tools: z.array(ToolSchema).default([]),
    operations: z.array(OperationSchema)
  })


export const PlaybookSchema = BusyDocumentSchema.extend({
    kind: z.literal('playbook'),
    sequence: z.array(ConceptIdSchema), // Ordered array of operation references
  })

// View param schema — typed parameters for component views
export const ViewParamSchema = z.object({
    name: z.string(),
    type: z.string().default('string'),  // object, string, boolean, array, etc.
    required: z.boolean().default(false),
  })

export type ViewParam = z.infer<typeof ViewParamSchema>;

// Views follow MVC: imports=Model, localDefs=ViewModel, template=View, operations=Controller
export const ViewSchema = BusyDocumentSchema.extend({
    kind: z.literal('view'),
    display: z.string().optional(),           // Markdown template (optional — LORE can generate)
    params: z.array(ViewParamSchema).optional(), // Typed params for component views
  })

export const ConfigSchema = BusyDocumentSchema.extend({
    kind: z.literal('config'),
  })

export const ToolDocumentSchema = BusyDocumentSchema.extend({ kind: z.literal('tool') });
export type ToolDocument = z.infer<typeof ToolDocumentSchema>;
export type ParsedDocument = BusyDocument | Playbook | View | Config | ToolDocument;

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

export const RepoSchema = z.object({
  files: z.array(FileSchema), // Parsed files with their sections
  concepts: z.array(ConceptBaseSchema), // All concepts (BusyDocuments, Playbooks, etc.)
  localdefs: z.record(LocalDefSchema),
  operations: z.record(OperationSchema),
  imports: z.array(ImportDefSchema),
  byId: z.record(z.union([SectionSchema, LocalDefSchema, OperationSchema, ConceptBaseSchema])),
  byFile: z.record( // Renamed from byDoc for clarity
    z.object({
      concept: z.union([BusyDocumentSchema, PlaybookSchema, ViewSchema, ConfigSchema, ToolDocumentSchema]), // The concept defined in this file
      bySlug: z.record(SectionSchema),
    })
  ),
  edges: z.array(EdgeSchema),
});

export const ContextPayloadSchema = z.object({
  operation: OperationSchema,
  calls: z.array(ConceptIdSchema),
  symbols: z.record(
    z.object({
      docId: DocIdSchema.optional(),
      slug: SlugSchema.optional(),
    })
  ),
});

// TypeScript types inferred from schemas


export type DocId = z.infer<typeof DocIdSchema>;
export type Slug = z.infer<typeof SlugSchema>;
// Section and ConceptBase types defined above to avoid circular references
export type BusyDocument = z.infer<typeof BusyDocumentSchema>;
export type Playbook = z.infer<typeof PlaybookSchema>;
export type View = z.infer<typeof ViewSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type LocalDef = z.infer<typeof LocalDefSchema>;
export type Operation = z.infer<typeof OperationSchema>;
export type ImportDef = z.infer<typeof ImportDefSchema>;
export type EdgeRole = z.infer<typeof EdgeRoleSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type File = z.infer<typeof FileSchema>;
export type Repo = z.infer<typeof RepoSchema>;
export type ContextPayload = z.infer<typeof ContextPayloadSchema>;


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
}).passthrough();  // Preserve unknown fields for downstream consumers (Lore, Knit, etc.)

export type FrontMatter = z.infer<typeof FrontMatterSchema>;
