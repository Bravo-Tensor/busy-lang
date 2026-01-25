# @busy/parser

TypeScript library + CLI that parses Busy markdown workspaces into a typed graph.

## Features

- ✅ Parse Busy markdown files with YAML frontmatter
- ✅ Build hierarchical section trees
- ✅ Extract Local Definitions with inheritance
- ✅ Resolve reference-style imports
- ✅ Create typed edge graph (ref, calls, extends, imports)
- ✅ Build minimal execution contexts for operations
- ✅ Export to JSON and DOT graph formats

## Installation

```bash
npm install @busy/parser
```

## CLI Usage

### Load and validate workspace

```bash
busyctx load "busy-v2/**/*.busy.md" --dump repo.json
```

### Build operation context

```bash
busyctx context "Document#evaluatedocument" -o context.json --maxDefChars 2000
```

### Export graph

```bash
busyctx graph --format dot > repo.dot
```

## API Usage

```typescript
import { loadRepo, buildContext } from '@busy/parser';

// Load workspace
const repo = await loadRepo(['busy-v2/**/*.busy.md']);

console.log(`Loaded ${repo.docs.length} documents`);
console.log(`Found ${Object.keys(repo.localdefs).length} local definitions`);
console.log(`Created ${repo.edges.length} edges`);

// Build execution context for an operation
const context = buildContext(repo, 'Document#evaluatedocument', {
  maxDefChars: 2000,
  includeChildren: true
});

console.log(`Operation: ${context.operation.title}`);
console.log(`Definitions: ${context.defs.length}`);
console.log(`Calls: ${context.calls.length}`);
```

## Data Model

### Documents & Sections

- **BusyDocument**: Top-level markdown file with frontmatter
- **Section**: Hierarchical heading structure (`#` - `######`)
- **LocalDef**: Definitions under "Local Definitions" section

### Edges

- **imports**: Document imports another document
- **calls**: Section/operation calls another operation
- **extends**: LocalDef extends another definition
- **ref**: General reference link

### Context Payload

Minimal execution context for an operation:
- Operation section (ref, title, content)
- Required local definitions (with transitive closure)
- Callable sub-operations
- Symbol table for imports

## Frontmatter Support

Handles both plain strings and markdown link syntax:

```yaml
---
Name: Document
Type: [Concept]
Description: The core document type
Tags: [core, foundation]
Extends: [ConceptBase]
---
```

Automatically strips brackets: `[Concept]` → `Concept`

## File Extensions

Supports both `.md` and `.busy.md` extensions. Import references to `.md` files automatically resolve to `.busy.md` files.

## Example Output

For `busy-v2/**/*.busy.md`:
- ✓ 15 documents loaded
- ✓ 45 local definitions
- ✓ 137 imports resolved
- ✓ 173 edges created
  - 137 import edges
  - 26 call edges
  - 10 ref edges

## Development

```bash
npm install
npm run build
npm run dev  # watch mode
npm test
```

## License

ISC
