import { z } from 'zod';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Values = Record<string, Json>;
export const jsonValue: z.ZodType<Json> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(), z.array(jsonValue), z.record(jsonValue),
]));
const name = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
  .refine(value => !['constructor', 'prototype', '__proto__'].includes(value), 'Reserved binding name');

export interface ReplySchema {
  type: 'object' | 'array' | 'string' | 'boolean' | 'number' | 'null';
  properties?: Record<string, ReplySchema>;
  required?: string[];
  additionalProperties?: false;
  enum?: string[];
  items?: ReplySchema;
}
export const replySchema: z.ZodType<ReplySchema> = z.lazy(() => z.union([
  z.object({ type: z.literal('object'), properties: z.record(name, replySchema), required: z.array(name), additionalProperties: z.literal(false) }).strict()
    .refine(s => s.required.every(key => Object.hasOwn(s.properties, key)), 'Required property has no schema'),
  z.object({ type: z.literal('array'), items: replySchema }).strict(),
  z.object({ type: z.literal('string'), enum: z.array(z.string()).nonempty().optional() }).strict(),
  z.object({ type: z.enum(['boolean', 'number', 'null']) }).strict(),
]));
const route = z.object({ call: name.optional(), next: name.nullable() }).strict();
export const interpretationSchema = z.object({
  version: z.literal(1),
  provenance: z.string().optional(),
  entry: name,
  operations: z.record(name, z.object({
    ref: z.string().optional(),
    inputs: z.array(name),
    outputs: z.array(name),
    steps: z.array(z.object({
      id: name,
      source: z.object({ operation: z.string().optional(), section: z.string(), item: z.number().int().positive().optional() }).strict(),
      context: z.array(name.refine(n => !['instruction', 'definitions', 'tools'].includes(n), 'Reserved context field')),
      definitions: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      respondWith: replySchema,
      next: name.nullable().optional(),
      routes: z.record(route).optional(),
    }).strict()).nonempty(),
  }).strict()),
}).strict();
export type Interpretation = z.infer<typeof interpretationSchema>;
export type PreparedStep = Interpretation['operations'][string]['steps'][number];

export function checkReply(value: unknown, schema: ReplySchema, path = 'reply'): asserts value is Json {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (type !== schema.type || (type === 'number' && !Number.isFinite(value))) throw new Error(`${path}: expected ${schema.type}`);
  if (schema.enum && !schema.enum.includes(value as string)) throw new Error(`${path}: choose ${schema.enum.join(' or ')}`);
  if (type === 'object') {
    const object = value as Record<string, unknown>;
    for (const key of schema.required!) if (!Object.hasOwn(object, key)) throw new Error(`${path}.${key}: required`);
    for (const [key, child] of Object.entries(object)) {
      if (!Object.hasOwn(schema.properties!, key)) throw new Error(`${path}.${key}: unexpected field`);
      checkReply(child, schema.properties![key], `${path}.${key}`);
    }
  }
  if (type === 'array') (value as unknown[]).forEach((child, i) => checkReply(child, schema.items!, `${path}[${i}]`));
}
export function selectValues(names: string[], values: Values): Values {
  return Object.fromEntries(names.map(name => {
    if (!Object.hasOwn(values, name)) throw new Error(`Missing context value: ${name}`);
    return [name, values[name]];
  }));
}
