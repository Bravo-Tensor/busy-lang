import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { loadRepo } from '../loader.js';
import { compileLoreSite } from '../compiler/lore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '__fixtures__', 'lore-compiler');

const MODEL_DOC = `---
Name: Prospect
Type: [Model]
Description: Prospect record
---

# Imports
`;

const CONFIG_DOC = `---
Name: Site Config
Type: [Config]
Description: Site configuration
---

# Imports
`;

const VIEW_DATA_SOURCE_DOC = `---
Name: Pipeline Summary Source
Type: [View]
Description: Derived data source for pipeline summary
---

# Imports
[Prospect]:./prospect.busy.md

# Local Definitions

## SummaryRow
- \`stage\` — Stage name
- \`count\` — Count for stage
`;

const SETTINGS_VIEW_DOC = `---
Name: Settings
Type: [View]
Description: Settings page
---

# Imports
[SiteConfig]:./site-config.busy.md

# Display
## Settings

Update workspace settings here.
`;

const PIPELINE_VIEW_DOC = `---
Name: Prospect Pipeline
Type: [View]
Description: Prospect pipeline dashboard
---

# Imports
[Prospect]:./prospect.busy.md
[SiteConfig]:./site-config.busy.md
[PipelineSummary]:./pipeline-summary-source.busy.md

# Local Definitions

## ProspectRow
- \`name\` — Prospect name
- \`stage\` — Prospect stage

# Display
## Prospect Pipeline

### Pipeline Summary
[Settings](/should-not-be-used)
[Open Settings](./settings.busy.md)
[Jump to Summary](#pipeline-summary)
[External Docs](https://example.com/docs)

# Operations

## refreshView
Reload the page.

### Steps
1. Reload data

## exportCsv
Export rows to CSV.

### Steps
1. Gather rows
2. Write CSV
`;

const NON_RENDERABLE_VIEW_DOC = `---
Name: Hidden Composition
Type: [View]
Description: View without display section
---

# Imports
[Prospect]:./prospect.busy.md

# Local Definitions

## HiddenRow
- \`name\` — Prospect name
`;

function setupFixtures() {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'prospect.busy.md'), MODEL_DOC);
  writeFileSync(join(FIXTURES_DIR, 'site-config.busy.md'), CONFIG_DOC);
  writeFileSync(join(FIXTURES_DIR, 'pipeline-summary-source.busy.md'), VIEW_DATA_SOURCE_DOC);
  writeFileSync(join(FIXTURES_DIR, 'settings.busy.md'), SETTINGS_VIEW_DOC);
  writeFileSync(join(FIXTURES_DIR, 'prospect-pipeline.busy.md'), PIPELINE_VIEW_DOC);
  writeFileSync(join(FIXTURES_DIR, 'hidden-composition.busy.md'), NON_RENDERABLE_VIEW_DOC);
}

function cleanFixtures() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

describe('LORE compiler IR', () => {
  beforeAll(() => {
    setupFixtures();
  });

  afterAll(() => {
    cleanFixtures();
  });

  async function compile() {
    const repo = await loadRepo([join(FIXTURES_DIR, '*.busy.md')]);
    return compileLoreSite(repo, FIXTURES_DIR, {
      compilerVersion: 'test-1',
      permissionModelRef: 'site-policy.v1',
      permissions: {
        pages: {
          'prospect-pipeline': ['page:prospects:read'],
        },
        actions: {
          'prospect-pipeline:exportCsv': ['page:prospects:export'],
        },
        dataSources: {
          'prospect-pipeline:site-config': ['config:site:read'],
        },
      },
      navigation: {
        homePageId: 'prospect-pipeline',
        groups: {
          'prospect-pipeline': 'dashboard',
          'settings': 'admin',
        },
      },
    });
  }

  it('compiles only display-bearing Views into pages', async () => {
    const site = await compile();

    expect(site.siteId).toBe('lore-compiler');
    expect(site.pages.map((page) => page.pageId)).toEqual(['prospect-pipeline', 'settings']);
    expect(site.pages.every((page) => page.renderable)).toBe(true);
  });

  it('classifies Model, Config, and View imports as explicit data sources', async () => {
    const site = await compile();
    const page = site.pages.find((entry) => entry.pageId === 'prospect-pipeline');

    expect(page).toBeDefined();
    expect(page!.dataSources.map((source) => [source.sourceName, source.kind])).toEqual([
      ['PipelineSummary', 'view'],
      ['Prospect', 'model'],
      ['SiteConfig', 'config'],
    ]);
  });

  it('extracts explicit actions from links and operations', async () => {
    const site = await compile();
    const page = site.pages.find((entry) => entry.pageId === 'prospect-pipeline');

    expect(page).toBeDefined();
    expect(page!.actions.map((action) => [action.kind, action.label, action.target])).toEqual([
      ['navigate', 'Open Settings', '/settings'],
      ['navigate', 'Jump to Summary', '/prospect-pipeline#pipeline-summary'],
      ['open_external', 'External Docs', 'https://example.com/docs'],
      ['run_operation', 'exportCsv', 'exportCsv'],
      ['run_operation', 'refreshView', 'refreshView'],
    ]);
  });

  it('emits navigation and permission metadata', async () => {
    const site = await compile();
    const page = site.pages.find((entry) => entry.pageId === 'prospect-pipeline');
    const exportAction = page!.actions.find((action) => action.kind === 'run_operation' && action.target === 'exportCsv');
    const configSource = page!.dataSources.find((source) => source.kind === 'config');

    expect(site.navigation.homePageId).toBe('prospect-pipeline');
    expect(site.navigation.sidebar.map((item) => [item.pageId, item.group])).toEqual([
      ['prospect-pipeline', 'dashboard'],
      ['settings', 'admin'],
    ]);
    expect(site.permissionModelRef).toBe('site-policy.v1');
    expect(page!.requiredPermissions).toEqual(['page:prospects:read']);
    expect(exportAction!.requiredPermissions).toEqual(['page:prospects:export']);
    expect(configSource!.requiredPermissions).toEqual(['config:site:read']);
  });

  it('produces stable hashes across repeated compiles', async () => {
    const first = await compile();
    const second = await compile();

    expect(first.sourceHash).toBe(second.sourceHash);
    expect(first).toEqual(second);
  });
});
