import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadRepo } from '../loader.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '__fixtures__', 'view-config');

// ── Fixtures ────────────────────────────────────────────────────────

const MODEL_DOC = `---
Name: Prospect
Type: [Model]
Description: An agent who has initiated contact
---

# Imports

# Local Definitions

## ProspectFields
- \`agent_name\` — Full name
- \`stage\` — discovery | trial | subscriber
- \`health_status\` — healthy | at_risk | churned

# Setup

A Prospect represents an agent in the early funnel.
`;

const VIEW_DOC = `---
Name: Prospect Pipeline
Type: [View]
Description: Dashboard view of all prospects in the conversion funnel
---

# Imports
[Prospect]:./prospect.busy.md

# Local Definitions

## ProspectRow
A summary row combining Prospect data.
- \`name\` — from [Prospect].agent_name
- \`stage\` — from [Prospect].stage
- \`health\` — from [Prospect].health_status

# Display

## Pipeline Summary
| Stage | Count |
|-------|-------|
{{#each stageSummary}}
| {{stage}} | {{count}} |
{{/each}}

## All Prospects
{{#each prospects}}
- **{{name}}** — {{stage}} ({{health}})
{{/each}}

# Operations

## refreshView
Reload prospect data from the database.

### Steps
1. Query all active prospects
2. Compute stage summary counts
3. Sort by days in stage descending
`;

const VIEW_NO_TEMPLATE = `---
Name: Simple View
Type: [View]
Description: A view without an explicit display section
---

# Imports
[Prospect]:./prospect.busy.md

# Local Definitions

## SimpleRow
- \`name\` — from [Prospect].agent_name

# Operations

## refresh
Reload data.
`;

const VIEW_WITH_LORE = `---
Name: Listing Detail
Type: [View]
Description: Competitive context for a specific listing
Lore:
  Route: /market-monitoring/listing/:listingId
  Permission: premium
---

# Imports
[Prospect]:./prospect.busy.md

# Local Definitions

## ListingFields
- \`address\` — Street address
- \`dom\` — Days on market

# Display

## Listing: {{address}}
Days on market: {{dom}}
`;

const CONFIG_DOC = `---
Name: Canon SDLC
Type: [Config]
Description: Process configuration for the Canon SDLC wizard
---

# Imports

# Local Definitions

## PhaseDefinition
- \`id\` — Phase identifier
- \`title\` — Display title
- \`steps\` — Array of step definitions

## StepDefinition
- \`id\` — Step identifier
- \`title\` — Display title
- \`content\` — Instructions markdown
- \`actions\` — Array of action definitions

# Setup

The Canon SDLC defines a 6-phase software development lifecycle.
Phases: Intake, Shape, Spec, Implement, Review, Ship.
`;

const VIEW_WITH_PARAMS = `---
Name: Prospect Status Card
Type: [View]
Description: Reusable component that renders prospect status
Params:
  - prospect: object (required)
  - show_hook: boolean
---

# Display

**{{prospect.agent_name}}** — {{prospect.lifecycle_state}}

{{#if show_hook}}
Hook delivered: {{prospect.hook_type}}
{{/if}}
`;

const VIEW_WITH_PARAMS_OBJECT_STYLE = `---
Name: Pricing Card
Type: [View]
Description: Pricing component
Params:
  - prospect: object (required)
  - hooks: array
---

# Display

Pricing for **{{prospect.agent_name}}**
`;

// ── Setup / Teardown ────────────────────────────────────────────────

function setupFixtures() {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'prospect.busy.md'), MODEL_DOC);
  writeFileSync(join(FIXTURES_DIR, 'prospect-pipeline.busy.md'), VIEW_DOC);
  writeFileSync(join(FIXTURES_DIR, 'simple-view.busy.md'), VIEW_NO_TEMPLATE);
  writeFileSync(join(FIXTURES_DIR, 'listing-detail.busy.md'), VIEW_WITH_LORE);
  writeFileSync(join(FIXTURES_DIR, 'canon-sdlc.busy.md'), CONFIG_DOC);
  writeFileSync(join(FIXTURES_DIR, 'prospect-status-card.busy.md'), VIEW_WITH_PARAMS);
  writeFileSync(join(FIXTURES_DIR, 'pricing-card.busy.md'), VIEW_WITH_PARAMS_OBJECT_STYLE);
}

function cleanFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

// ── Tests ───────────────────────────────────────────────────────────

describe('View and Config Types', () => {
  let repo: Awaited<ReturnType<typeof loadRepo>>;

  beforeAll(async () => {
    setupFixtures();
    repo = await loadRepo([join(FIXTURES_DIR, '*.busy.md')]);
  });

  afterAll(() => {
    cleanFixtures();
  });

  describe('Loading', () => {
    it('loads all 7 fixture documents', () => {
      expect(repo.concepts.length).toBe(7);
    });

    it('classifies Model as document', () => {
      const prospect = repo.concepts.find(c => c.name === 'Prospect');
      expect(prospect).toBeDefined();
      expect(prospect!.kind).toBe('document');
    });

    it('classifies View as view', () => {
      const pipeline = repo.concepts.find(c => c.name === 'Prospect Pipeline');
      expect(pipeline).toBeDefined();
      expect(pipeline!.kind).toBe('view');
    });

    it('classifies Config as config', () => {
      const config = repo.concepts.find(c => c.name === 'Canon SDLC');
      expect(config).toBeDefined();
      expect(config!.kind).toBe('config');
    });
  });

  describe('View Document', () => {
    it('has display content when Display section exists', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Pipeline'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.kind).toBe('view');
      if (viewDoc.kind === 'view') {
        expect(viewDoc.display).toBeDefined();
        expect(viewDoc.display).toContain('{{#each stageSummary}}');
        expect(viewDoc.display).toContain('{{#each prospects}}');
      }
    });

    it('has undefined display when no Display section', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Simple View'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.kind).toBe('view');
      if (viewDoc.kind === 'view') {
        expect(viewDoc.display).toBeUndefined();
      }
    });

    it('has imports resolved', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Pipeline'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.imports.length).toBeGreaterThan(0);
      expect(viewDoc.imports[0].label).toBe('Prospect');
    });

    it('has local definitions (ViewModel)', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Pipeline'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.localdefs.length).toBeGreaterThan(0);
      expect(viewDoc.localdefs[0].name).toBe('ProspectRow');
    });

    it('has operations (Controller)', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Pipeline'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.operations.length).toBeGreaterThan(0);
      expect(viewDoc.operations[0].name).toBe('refreshView');
    });

    it('creates import edges', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Pipeline'
      )!;
      const importEdges = repo.edges.filter(
        e => e.from === viewDocId && e.role === 'imports'
      );
      expect(importEdges.length).toBeGreaterThan(0);
    });

    it('has no meta when no extra frontmatter is present', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Pipeline'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.meta).toBeUndefined();
    });

    it('carries extra frontmatter through as meta (generic passthrough)', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Listing Detail'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.meta).toBeDefined();
      expect((viewDoc.meta as any).Lore).toEqual({
        Route: '/market-monitoring/listing/:listingId',
        Permission: 'premium',
      });
    });

    it('parses Params from frontmatter into typed params array', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Status Card'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.kind).toBe('view');
      if (viewDoc.kind === 'view') {
        expect(viewDoc.params).toBeDefined();
        expect(viewDoc.params).toHaveLength(2);
        expect(viewDoc.params![0]).toEqual({ name: 'prospect', type: 'object', required: true });
        expect(viewDoc.params![1]).toEqual({ name: 'show_hook', type: 'boolean', required: false });
      }
    });

    it('does not include Params in meta when params are parsed', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Status Card'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.meta?.Params).toBeUndefined();
    });

    it('parses Params with multiple required/optional params', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Pricing Card'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.kind).toBe('view');
      if (viewDoc.kind === 'view') {
        expect(viewDoc.params).toBeDefined();
        expect(viewDoc.params).toHaveLength(2);
        expect(viewDoc.params![0]).toEqual({ name: 'prospect', type: 'object', required: true });
        expect(viewDoc.params![1]).toEqual({ name: 'hooks', type: 'array', required: false });
      }
    });

    it('has no params when Params frontmatter is absent', () => {
      const viewDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Prospect Pipeline'
      )!;
      const viewDoc = repo.byFile[viewDocId].concept;
      expect(viewDoc.kind).toBe('view');
      if (viewDoc.kind === 'view') {
        expect(viewDoc.params).toBeUndefined();
      }
    });
  });

  describe('Config Document', () => {
    it('has local definitions', () => {
      const configDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Canon SDLC'
      )!;
      const configDoc = repo.byFile[configDocId].concept;
      expect(configDoc.localdefs.length).toBe(2);
    });

    it('has setup section', () => {
      const configDocId = Object.keys(repo.byFile).find(id =>
        repo.byFile[id].concept.name === 'Canon SDLC'
      )!;
      const configDoc = repo.byFile[configDocId].concept;
      expect(configDoc.setup).toBeDefined();
      expect(configDoc.setup.content).toContain('6-phase');
    });

    it('is distinct from regular document', () => {
      const configConcept = repo.concepts.find(c => c.name === 'Canon SDLC');
      const modelConcept = repo.concepts.find(c => c.name === 'Prospect');
      expect(configConcept!.kind).toBe('config');
      expect(modelConcept!.kind).toBe('document');
    });
  });

  describe('Graph Integrity', () => {
    it('view and config appear in byId', () => {
      const viewConcept = repo.concepts.find(c => c.name === 'Prospect Pipeline');
      const configConcept = repo.concepts.find(c => c.name === 'Canon SDLC');
      expect(repo.byId[viewConcept!.id]).toBeDefined();
      expect(repo.byId[configConcept!.id]).toBeDefined();
    });

    it('all four document types coexist', () => {
      const kinds = new Set(repo.concepts.map(c => c.kind));
      expect(kinds.has('document')).toBe(true);
      expect(kinds.has('view')).toBe(true);
      expect(kinds.has('config')).toBe(true);
    });
  });
});
