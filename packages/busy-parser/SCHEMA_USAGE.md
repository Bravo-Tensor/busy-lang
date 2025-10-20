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

## Getting Concept Context

The `getConceptContext` function provides a comprehensive view of all relationships for any concept in your repo. This is useful for understanding dependencies, analyzing the call graph, and building context-aware tools.

### Basic Usage

```typescript
import { loadRepo, getConceptContext } from '@busy/parser';
import type { ConceptContext } from '@busy/parser';

// Load your repo
const repo = await loadRepo(['**/*.busy.md']);

// Get context for a specific concept
const context: ConceptContext = getConceptContext(repo, 'my-doc::my-operation');

// The concept itself
console.log(context.concept.name);

// Outgoing relationships (what this concept depends on)
console.log('Calls:', context.calls);           // Operations this calls
console.log('Extends:', context.extends);       // Concepts this extends
console.log('Imports:', context.imports);       // Concepts this imports
console.log('References:', context.refs);       // Concepts this references

// Incoming relationships (what depends on this concept)
console.log('Called by:', context.calledBy);       // Operations that call this
console.log('Extended by:', context.extendedBy);   // Concepts that extend this
console.log('Imported by:', context.importedBy);   // Concepts that import this
console.log('Referenced by:', context.referencedBy); // Concepts that reference this

// Access content of imports and references directly
for (const importId of context.imports) {
  const content = context.contentMap[importId];
  console.log(`Import ${importId}:`, content);
}
```

### Understanding ConceptContext

```typescript
interface ConceptContext {
  // The concept itself (can be Section, LocalDef, Operation, or ConceptBase)
  concept: Section | LocalDef | Operation | ConceptBase;

  // Outgoing edges (what this concept uses/depends on)
  calls: string[];        // concepts this concept calls
  extends: string[];      // concepts this concept extends
  imports: string[];      // concepts this concept imports
  refs: string[];         // concepts this concept references

  // Incoming edges (what uses/depends on this concept)
  calledBy: string[];     // concepts that call this concept
  extendedBy: string[];   // concepts that extend this concept
  importedBy: string[];   // concepts that import this concept
  referencedBy: string[]; // concepts that reference this concept

  // All edges for advanced usage
  allEdges: {
    outgoing: Array<{ to: string; role: string }>;
    incoming: Array<{ from: string; role: string }>;
  };

  // Content map - actual content of imported and referenced concepts
  contentMap: Record<string, string>; // conceptId -> content
}
```

**Important Note on Operations and LocalDefs:**

When you call `getConceptContext` with an operation or localdef ID, the function automatically includes edges from:
1. The concept itself (e.g., `doc::operation`)
2. Its parent section (e.g., `doc#operation`)
3. Its parent document (e.g., `doc`)

This means operations inherit their document's imports, making all document-level definitions available in the `contentMap`. This is the expected behavior since imports are typically declared at the document level in the frontmatter.

### Use Cases

**1. Build a Dependency Graph**

```typescript
import { loadRepo, getConceptContext } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

// Analyze all operations and their dependencies
for (const [id, operation] of Object.entries(repo.operations)) {
  const context = getConceptContext(repo, id);

  console.log(`\n${operation.name}:`);
  console.log(`  Calls ${context.calls.length} operations`);
  console.log(`  Called by ${context.calledBy.length} operations`);
  console.log(`  Extends ${context.extends.length} concepts`);
}
```

**2. Find All Consumers of a Concept**

```typescript
import { loadRepo, getConceptContext } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

// Find everything that depends on a specific concept
const conceptId = 'document::evaluate-document';
const context = getConceptContext(repo, conceptId);

console.log(`Concept "${conceptId}" is used by:`);
console.log(`  ${context.calledBy.length} operations call it`);
console.log(`  ${context.extendedBy.length} concepts extend it`);
console.log(`  ${context.importedBy.length} documents import it`);
console.log(`  ${context.referencedBy.length} concepts reference it`);

// List all consumers
const allConsumers = new Set([
  ...context.calledBy,
  ...context.extendedBy,
  ...context.importedBy,
  ...context.referencedBy,
]);

console.log('\nAll consumers:', Array.from(allConsumers));
```

**3. Analyze Inheritance Hierarchies**

```typescript
import { loadRepo, getConceptContext, get } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

// Build complete inheritance tree for a concept
function getInheritanceTree(conceptId: string, depth = 0): void {
  const context = getConceptContext(repo, conceptId);
  const indent = '  '.repeat(depth);

  console.log(`${indent}${context.concept.name}`);

  // Show what it extends (parents)
  for (const parentId of context.extends) {
    const parent = get(repo, parentId);
    if (parent) {
      console.log(`${indent}  ⬆ extends: ${parent.name}`);
    }
  }

  // Show what extends it (children)
  for (const childId of context.extendedBy) {
    getInheritanceTree(childId, depth + 1);
  }
}

getInheritanceTree('document::operation');
```

**4. Build Execution Context**

```typescript
import { loadRepo, getConceptContext, get } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

// Get all dependencies needed to execute an operation
function getExecutionContext(operationId: string) {
  const context = getConceptContext(repo, operationId);

  // Collect all direct dependencies
  const dependencies = new Set<string>();

  // Add all operations this calls
  context.calls.forEach(id => dependencies.add(id));

  // Add all imports
  context.imports.forEach(id => dependencies.add(id));

  // Add all references
  context.refs.forEach(id => dependencies.add(id));

  // Recursively get dependencies of dependencies
  const allDeps = new Set(dependencies);
  for (const depId of dependencies) {
    const depContext = getConceptContext(repo, depId);
    depContext.calls.forEach(id => allDeps.add(id));
    depContext.imports.forEach(id => allDeps.add(id));
  }

  return {
    operation: context.concept,
    directDependencies: Array.from(dependencies),
    allDependencies: Array.from(allDeps),
  };
}

const execContext = getExecutionContext('my-doc::my-operation');
console.log(`Operation requires ${execContext.allDependencies.length} dependencies`);
```

**5. Impact Analysis**

```typescript
import { loadRepo, getConceptContext } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

// Analyze impact of changing a concept
function analyzeImpact(conceptId: string) {
  const context = getConceptContext(repo, conceptId);

  // Find all concepts that would be affected by changes
  const directImpact = [
    ...context.calledBy,
    ...context.extendedBy,
    ...context.importedBy,
    ...context.referencedBy,
  ];

  // Calculate transitive impact
  const visited = new Set([conceptId]);
  const queue = [...directImpact];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;

    visited.add(current);
    const currentContext = getConceptContext(repo, current);

    queue.push(...currentContext.calledBy);
    queue.push(...currentContext.extendedBy);
  }

  return {
    directImpact: directImpact.length,
    totalImpact: visited.size - 1, // Exclude the concept itself
    affectedConcepts: Array.from(visited).filter(id => id !== conceptId),
  };
}

const impact = analyzeImpact('document::evaluate-document');
console.log(`Changing this concept would directly impact ${impact.directImpact} concepts`);
console.log(`Total transitive impact: ${impact.totalImpact} concepts`);
```

**6. Access Content of Imports and References**

The `contentMap` provides direct access to the content of all imported and referenced concepts, making it easy to build context-aware tools without additional lookups.

```typescript
import { loadRepo, getConceptContext } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

// Get context for an operation
const context = getConceptContext(repo, 'my-doc::my-operation');

// Access the content of imported concepts
for (const importId of context.imports) {
  const content = context.contentMap[importId];
  if (content) {
    console.log(`\nImported concept: ${importId}`);
    console.log(`Content:\n${content}`);
  }
}

// Access the content of referenced concepts
for (const refId of context.refs) {
  const content = context.contentMap[refId];
  if (content) {
    console.log(`\nReferenced concept: ${refId}`);
    console.log(`Content:\n${content}`);
  }
}
```

**7. Build Execution Payload with Dependencies**

Create a complete execution payload that includes all necessary context for running an operation:

```typescript
import { loadRepo, getConceptContext } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

function buildExecutionPayload(operationId: string) {
  const context = getConceptContext(repo, operationId);

  // Build a complete payload with the operation and all its dependencies
  return {
    operation: {
      id: context.concept.id,
      name: context.concept.name,
      content: 'content' in context.concept ? context.concept.content : '',
      steps: 'steps' in context.concept ? context.concept.steps : [],
    },
    // Include all imported definitions and their content
    imports: context.imports.map(id => ({
      id,
      content: context.contentMap[id] || '',
    })),
    // Include all referenced concepts and their content
    references: context.refs.map(id => ({
      id,
      content: context.contentMap[id] || '',
    })),
    // List operations that need to be available to call
    callableOperations: context.calls,
  };
}

const payload = buildExecutionPayload('my-doc::my-operation');
console.log('Execution payload ready with:');
console.log(`  ${payload.imports.length} imported definitions`);
console.log(`  ${payload.references.length} referenced concepts`);
console.log(`  ${payload.callableOperations.length} callable operations`);

// The payload now has all the content needed for execution
// without requiring additional repo lookups
```

**8. Generate AI Prompts with Full Context**

Use the content map to generate rich prompts for AI assistants:

```typescript
import { loadRepo, getConceptContext } from '@busy/parser';

const repo = await loadRepo(['**/*.busy.md']);

function generateOperationPrompt(operationId: string): string {
  const context = getConceptContext(repo, operationId);

  let prompt = `# Operation: ${context.concept.name}\n\n`;

  if ('content' in context.concept) {
    prompt += `## Description\n${context.concept.content}\n\n`;
  }

  // Add imported definitions
  if (context.imports.length > 0) {
    prompt += `## Available Definitions\n\n`;
    for (const importId of context.imports) {
      const content = context.contentMap[importId];
      if (content) {
        prompt += `### ${importId}\n${content}\n\n`;
      }
    }
  }

  // Add referenced concepts
  if (context.refs.length > 0) {
    prompt += `## Referenced Concepts\n\n`;
    for (const refId of context.refs) {
      const content = context.contentMap[refId];
      if (content) {
        prompt += `### ${refId}\n${content}\n\n`;
      }
    }
  }

  // Add callable operations
  if (context.calls.length > 0) {
    prompt += `## Callable Operations\n\n`;
    prompt += context.calls.map(id => `- ${id}`).join('\n');
  }

  return prompt;
}

const prompt = generateOperationPrompt('my-doc::my-operation');
console.log(prompt);
// This prompt now includes all the context needed for an AI to understand
// and execute the operation without manual content gathering
```

## Merging and Extending Repos

### Loading Core Library + User Files

```typescript
import { loadRepo, mergeRepos, loadRepoFromJSON } from '@busy/parser';
import fs from 'fs';

// Option 1: Load both from scratch and merge
const coreRepo = await loadRepo(['./busy-v2/**/*.busy.md']);
const userRepo = await loadRepo(['./my-busy-files/**/*.busy.md']);
const mergedRepo = mergeRepos(coreRepo, userRepo);

// Option 2: Load pre-parsed core library from JSON
const coreRepoJSON = fs.readFileSync('./busy-v2-repo.json', 'utf-8');
const coreRepo = loadRepoFromJSON(coreRepoJSON);
const userRepo = await loadRepo(['./my-busy-files/**/*.busy.md']);
const mergedRepo = mergeRepos(coreRepo, userRepo);

console.log(`Total files: ${mergedRepo.files.length}`);
console.log(`Total concepts: ${mergedRepo.concepts.length}`);
```

### Extending a Base Repo

```typescript
import { extendRepo, loadRepo, loadRepoFromJSON } from '@busy/parser';

// Load base repo (e.g., from published JSON)
const baseRepo = loadRepoFromJSON(
  fs.readFileSync('./busy-core.json', 'utf-8')
);

// Parse additional files
const extensionRepo = await loadRepo(['./extensions/**/*.busy.md']);

// Extend base with additional files
const extendedRepo = extendRepo(baseRepo, extensionRepo);
```

### Incremental Updates

```typescript
import { mergeRepos, loadRepo } from '@busy/parser';

// Start with existing repo
let repo = loadRepoFromJSON(fs.readFileSync('./current-repo.json', 'utf-8'));

// Add new files
const newFilesRepo = await loadRepo(['./new-files/**/*.busy.md']);
repo = mergeRepos(repo, newFilesRepo);

// Save updated repo
fs.writeFileSync('./current-repo.json', JSON.stringify(repo, null, 2));
```

### Merge Behavior

When merging repos, **later repos override earlier ones**:

- **Files**: Replaced by docId (later file wins)
- **Concepts**: Replaced by id (later concept wins)
- **LocalDefs**: Replaced by id (later def wins)
- **Operations**: Replaced by id (later op wins)
- **Imports**: Deduplicated by id, kept per document
- **Edges**: Deduplicated by (from, to, role) tuple

Example:
```typescript
import { mergeRepos } from '@busy/parser';

// Core library has operation: 'document::evaluate-document'
const coreRepo = loadRepoFromJSON('./core.json');

// User overrides with custom implementation
const userRepo = await loadRepo(['./my-evaluate-document.busy.md']);

// User version takes precedence
const merged = mergeRepos(coreRepo, userRepo);
// merged.operations['document::evaluate-document'] is now the user's version
```

### Use Cases

**1. Core Library + User Extensions**
```typescript
// Load published core library
const core = loadRepoFromJSON('./node_modules/@busy/core/repo.json');
// Add user's custom documents
const user = await loadRepo(['./my-docs/**/*.busy.md']);
// Combined library
const repo = mergeRepos(core, user);
```

**2. Multi-Layer Architecture**
```typescript
// Layer 1: Base framework
const base = loadRepoFromJSON('./busy-base.json');
// Layer 2: Domain library
const domain = loadRepoFromJSON('./busy-domain.json');
// Layer 3: Project-specific
const project = await loadRepo(['./project/**/*.busy.md']);
// Merge all layers
const repo = mergeRepos(base, domain, project);
```

**3. Testing with Fixtures**
```typescript
// Real production repo
const prodRepo = await loadRepo(['./src/**/*.busy.md']);
// Test fixtures that override specific operations
const testRepo = await loadRepo(['./test/fixtures/**/*.busy.md']);
// Test environment with mocked operations
const testEnvRepo = mergeRepos(prodRepo, testRepo);
```
