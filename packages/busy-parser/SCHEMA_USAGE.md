# Using Busy Parser Schemas in Other Repos

The Busy Parser exports all Zod schemas for use in other projects. This allows you to validate and type-check Busy repo JSON files.

## Installation

```bash
npm install @busy/parser
```

## Usage Examples

### 1. Validate a Repo JSON File

```typescript
import { RepoSchema } from '@busy/parser';
import type { Repo } from '@busy/parser';

// Load your JSON file
const repoData = JSON.parse(fs.readFileSync('busy-v2-repo.json', 'utf-8'));

// Validate it
const repo: Repo = RepoSchema.parse(repoData);

// Now you have a fully typed and validated repo!
console.log(`Loaded ${repo.files.length} files`);
console.log(`Found ${repo.concepts.length} concepts`);
```

### 2. Validate Individual Entities

```typescript
import { OperationSchema, LocalDefSchema } from '@busy/parser';
import type { Operation, LocalDef } from '@busy/parser';

// Validate an operation
const operation: Operation = OperationSchema.parse({
  kind: 'operation',
  id: 'my-doc::my-operation',
  docId: 'my-doc',
  slug: 'my-operation',
  name: 'MyOperation',
  content: '...',
  types: [],
  extends: ['Operation'],
  sectionRef: 'my-doc#my-operation',
  steps: ['Step 1', 'Step 2'],
  checklist: ['Done?'],
});

// Validate a local definition
const localdef: LocalDef = LocalDefSchema.parse({
  kind: 'localdef',
  id: 'my-doc::my-def',
  docId: 'my-doc',
  slug: 'my-def',
  name: 'MyDef',
  content: 'Definition content...',
  types: [],
  extends: [],
  sectionRef: 'my-doc#definitions',
});
```

### 3. Safe Parsing with Error Handling

```typescript
import { RepoSchema } from '@busy/parser';

// Use safeParse to handle validation errors gracefully
const result = RepoSchema.safeParse(repoData);

if (result.success) {
  const repo = result.data;
  console.log('Valid repo!', repo);
} else {
  console.error('Validation failed:', result.error.issues);
}
```

### 4. Partial Validation

```typescript
import { OperationSchema } from '@busy/parser';

// Validate only specific fields
const PartialOperationSchema = OperationSchema.partial();

const partialOp = PartialOperationSchema.parse({
  id: 'my-doc::my-operation',
  name: 'MyOperation',
  // Other fields are optional
});
```

## Available Schemas

### Core Schemas
- `RepoSchema` - Full repository structure
- `FileSchema` - Parsed markdown file
- `SectionSchema` - Document section

### Concept Schemas
- `ConceptBaseSchema` - Base concept structure
- `BusyDocumentSchema` - Busy document
- `PlaybookSchema` - Playbook with sequence
- `LocalDefSchema` - Local definition
- `OperationSchema` - Operation
- `ImportDefSchema` - Import definition
- `SetupSchema` - Setup section

### ID Schemas
- `DocIdSchema` - Document ID (string)
- `SlugSchema` - Slug (string)
- `SectionIdSchema` - Section ID (string, format: `docId#slug`)
- `ConceptIdSchema` - Concept ID (string, format: `docId::slug`)

### Utility Schemas
- `EdgeSchema` - Graph edge
- `EdgeRoleSchema` - Edge role enum
- `ContextPayloadSchema` - Operation context
- `FrontMatterSchema` - Markdown frontmatter

## TypeScript Types

All schemas have corresponding TypeScript types exported:

```typescript
import type {
  Repo,
  File,
  Section,
  ConceptBase,
  BusyDocument,
  Playbook,
  LocalDef,
  Operation,
  ImportDef,
  Edge,
  ContextPayload,
  FrontMatter,
} from '@busy/parser';
```

## ID Format Reference

### Concept IDs (use `::`)
Concepts are domain model entities:
- Operations: `docId::operationSlug` (e.g., `my-doc::validate-input`)
- LocalDefs: `docId::defSlug` (e.g., `my-doc::input-schema`)
- Setup: `docId::setup` (e.g., `my-doc::setup`)
- Imports: `docId::import::label` (e.g., `my-doc::import::Operation`)

### Section IDs (use `#`)
Sections are markdown structure references:
- Format: `docId#sectionSlug` (e.g., `my-doc#operations`)
- Used in `sectionRef` fields to point to where a concept is defined

## Example: Querying a Repo

```typescript
import { RepoSchema } from '@busy/parser';
import type { Repo, Operation } from '@busy/parser';

// Load and validate
const repo: Repo = RepoSchema.parse(repoData);

// Find an operation by ID
const operation = repo.operations['my-doc::my-operation'];

// Get all operations in a file
const fileOps = Object.values(repo.operations)
  .filter(op => op.docId === 'my-doc');

// Find a section by slug in a file
const section = repo.byFile['my-doc']?.bySlug['operations'];

// Traverse edges
const callEdges = repo.edges.filter(e =>
  e.from === 'my-doc::my-operation' && e.role === 'calls'
);
```
