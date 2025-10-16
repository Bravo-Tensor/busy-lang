import { z } from 'zod';

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

// Operation schema - extends ConceptBase (leaf node, no children)
export const OperationSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('operation'),
    steps: z.array(z.string()), // Parsed step items
    checklist: z.array(z.string()), // Parsed checklist items
});

// ImportDef schema - extends ConceptBase (leaf node, no children)
export const ImportDefSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('importdef'),
    label: z.string(),
    target: SectionIdSchema,
    resolved: ConceptIdSchema.optional(),
});

// BusyDocument schema
export const BusyDocumentSchema = ConceptBaseSchemaObject.extend({
    kind: z.literal('document'),
    imports: z.array(ImportDefSchema),
    localdefs: z.array(LocalDefSchema),
    setup: SetupSchema,
    operations: z.array(OperationSchema)
  })

// Playbook schema - extends BusyDocument with ordered sequence of operations
export const PlaybookSchema = BusyDocumentSchema.extend({
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

// Repo schema
export const RepoSchema = z.object({
  files: z.array(FileSchema), // Parsed files with their sections
  concepts: z.array(ConceptBaseSchema), // All concepts (BusyDocuments, Playbooks, etc.)
  localdefs: z.record(LocalDefSchema),
  operations: z.record(OperationSchema),
  imports: z.array(ImportDefSchema),
  byId: z.record(z.union([SectionSchema, LocalDefSchema, OperationSchema, ConceptBaseSchema])),
  byFile: z.record( // Renamed from byDoc for clarity
    z.object({
      concept: z.union([BusyDocumentSchema, PlaybookSchema]), // The concept defined in this file
      bySlug: z.record(SectionSchema),
    })
  ),
  edges: z.array(EdgeSchema),
});

// ContextPayload schema
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
});

export type FrontMatter = z.infer<typeof FrontMatterSchema>;
