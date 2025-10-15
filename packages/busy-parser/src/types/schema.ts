import { z } from 'zod';

// Base types
export const DocIdSchema = z.string();
export const SlugSchema = z.string();

// Section schema
export const SectionSchema: z.ZodType<Section> = z.lazy(() =>
  z.object({
    kind: z.literal('section'),
    id: z.string(),
    docId: DocIdSchema,
    slug: SlugSchema,
    title: z.string(),
    depth: z.number().int().min(1).max(6),
    path: z.string(),
    lineStart: z.number(),
    lineEnd: z.number(),
    tags: z.array(z.string()),
    attrs: z.record(z.unknown()),
    extends: z.array(z.string()),
    content: z.string(),
    children: z.array(SectionSchema),
  })
);

// ConceptBase schema
export const ConceptBaseSchema = z.object({
  kind: z.enum(['concept', 'document', 'operation', 'checklist', 'tool', 'playbook', 'localdef', 'importdef']),
  id: DocIdSchema,
  docId: DocIdSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  types: z.array(z.string()),
  extends: z.array(z.string()),
  tags: z.array(z.string()),
  attrs: z.record(z.unknown()),
  path: z.string(),
  lineStart: z.number(),
  lineEnd: z.number(),
});

// BusyDocument schema
export const BusyDocumentSchema = ConceptBaseSchema.extend({
  kind: z.literal('document'),
  sections: z.array(SectionSchema),
});

// LocalDef schema - extends ConceptBase
export const LocalDefSchema = ConceptBaseSchema.extend({
  kind: z.literal('localdef'),
  depth: z.number(),
  content: z.string(),
});

// Operation schema - extends ConceptBase
export const OperationSchema = ConceptBaseSchema.extend({
  kind: z.literal('operation'),
  depth: z.number(),
  content: z.string(),
  steps: z.array(z.string()), // Parsed step items
  checklist: z.array(z.string()), // Parsed checklist items
});

// ImportDef schema - extends ConceptBase
export const ImportDefSchema = ConceptBaseSchema.extend({
  kind: z.literal('importdef'),
  label: z.string(),
  target: z.string(),
  resolved: z
    .object({
      docId: DocIdSchema.optional(),
      slug: SlugSchema.optional(),
    })
    .optional(),
});

// Edge schema
export const EdgeRoleSchema = z.enum(['ref', 'calls', 'extends', 'imports']);
export const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  role: EdgeRoleSchema,
});

// Repo schema
export const RepoSchema = z.object({
  docs: z.array(BusyDocumentSchema),
  concepts: z.array(ConceptBaseSchema),
  localdefs: z.record(LocalDefSchema),
  operations: z.record(OperationSchema),
  imports: z.array(ImportDefSchema),
  byId: z.record(z.union([SectionSchema, LocalDefSchema, OperationSchema, ConceptBaseSchema])),
  byDoc: z.record(
    z.object({
      doc: BusyDocumentSchema,
      bySlug: z.record(SectionSchema),
    })
  ),
  edges: z.array(EdgeSchema),
});

// ContextPayload schema
export const ContextPayloadSchema = z.object({
  operation: z.object({
    ref: z.string(),
    title: z.string(),
    content: z.string(),
    attrs: z.record(z.unknown()),
    steps: z.array(z.string()).optional(),
    checklist: z.array(z.string()).optional(),
  }),
  defs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      content: z.string(),
      extends: z.array(z.string()),
    })
  ),
  calls: z.array(
    z.object({
      ref: z.string(),
      title: z.string().optional(),
    })
  ),
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
export type Section = {
  kind: 'section';
  id: string;
  docId: DocId;
  slug: Slug;
  title: string;
  depth: number;
  path: string;
  lineStart: number;
  lineEnd: number;
  tags: string[];
  attrs: Record<string, unknown>;
  extends: string[];
  content: string;
  children: Section[];
};
export type ConceptBase = z.infer<typeof ConceptBaseSchema>;
export type BusyDocument = z.infer<typeof BusyDocumentSchema>;
export type LocalDef = z.infer<typeof LocalDefSchema>;
export type Operation = z.infer<typeof OperationSchema>;
export type ImportDef = z.infer<typeof ImportDefSchema>;
export type EdgeRole = z.infer<typeof EdgeRoleSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
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
