import { describe, it, expect } from 'vitest';

import { parseDocument } from '../parser';
import { parseFrontMatter } from '../parsers/frontmatter';
import { parseTriggers } from '../parsers/triggers';
import {
  extractYamlFrontmatter,
  parseYamlFrontmatterBlock,
  stringifyYamlFrontmatter,
} from '../parsers/yaml-frontmatter';
import { parsePackageManifest } from '../package/manifest';
import { parsePackageRegistry } from '../registry/index';

describe('YAML frontmatter parsing through js-yaml 4', () => {
  it('parses only the first frontmatter block when the body contains horizontal rules', () => {
    const content = `---
Name: HorizontalRuleDoc
Type: [Document]
Description: Has body separators
---

# Body

---

This horizontal rule must not be parsed as a YAML document.
`;

    const doc = parseDocument(content);

    expect(doc.metadata).toEqual({
      name: 'HorizontalRuleDoc',
      type: '[Document]',
      description: 'Has body separators',
    });
  });

  it('preserves parser frontmatter normalization and body slicing semantics', () => {
    const content = `---
Name: Parser Frontmatter
Type:
  - "[Document]"
  - "[Playbook]"
Extends: [BaseThing]
Tags:
  - "[security]"
  - automation
Description: Parser coverage
CustomField: retained
---

# Display

Hello.
`;

    const parsed = parseFrontMatter(content, '/tmp/parser-frontmatter.busy.md');

    expect(parsed.docId).toBe('parser_frontmatter');
    expect(parsed.kind).toBe('document');
    expect(parsed.types).toEqual(['Document', 'Playbook']);
    expect(parsed.extends).toEqual(['BaseThing', 'Document', 'Playbook']);
    expect(parsed.frontmatter.Tags).toEqual(['security', 'automation']);
    expect(parsed.frontmatter.CustomField).toBe('retained');
    expect(parsed.content.startsWith('\n\n# Display')).toBe(true);
  });

  it('supports frontmatter triggers parsed from YAML arrays', () => {
    const content = `---
Name: Triggered
Type: [Document]
Triggers:
  - event_type: github.alert.opened
    operation: TriageAlert
    filter:
      severity: high
    queue_when_paused: false
---

# Triggers

- Set alarm for 9am on Monday to run WeeklyReview
`;

    const triggers = parseTriggers(content);

    expect(triggers).toHaveLength(2);
    expect(triggers[0]).toMatchObject({
      triggerType: 'event',
      eventType: 'github.alert.opened',
      operation: 'TriageAlert',
      filter: { severity: 'high' },
      queueWhenPaused: false,
    });
    expect(triggers[1]).toMatchObject({
      triggerType: 'alarm',
      operation: 'WeeklyReview',
      schedule: '0 9 * * 1',
    });
  });

  it('parses package manifests and registries through the shared js-yaml path', () => {
    const packageManifest = `---
Name: busy-v2
Type: Package
Version: v1.2.3
Description: Shared package
---

# Package Contents

## Core

- [Document](./core/document.busy.md) - Base document
`;

    const registry = `---
Name: workspace
Type: [Package]
Description: Registry
---

# Dependencies

## Core Library

### busy-v2

Shared package.

| Field | Value |
|-------|-------|
| Source | https://example.test/package.busy.md |
| Provider | url |
| Cached | .libraries/busy-v2 |
| Version | v1.2.3 |
| Fetched | 2026-06-19T00:00:00Z |
`;

    expect(parsePackageManifest(packageManifest)).toMatchObject({
      name: 'busy-v2',
      type: 'Package',
      version: 'v1.2.3',
      description: 'Shared package',
      documents: [{ name: 'Document', relativePath: './core/document.busy.md' }],
    });

    expect(parsePackageRegistry(registry)).toMatchObject({
      metadata: {
        name: 'workspace',
        type: ['Package'],
        description: 'Registry',
      },
      packages: [{ id: 'busy-v2', provider: 'url', version: 'v1.2.3' }],
    });
  });

  it('can stringify frontmatter and parse it back with js-yaml 4', () => {
    const serialized = stringifyYamlFrontmatter(
      {
        Name: 'Writable Doc',
        Type: ['Document', 'View'],
        Description: 'Round-trips through js-yaml 4',
        Tags: ['security', 'frontmatter'],
      },
      '# Display\n\nBody.'
    );

    const extracted = extractYamlFrontmatter(serialized);

    expect(extracted?.content).toBe('\n# Display\n\nBody.');
    expect(extracted?.data).toEqual({
      Name: 'Writable Doc',
      Type: ['Document', 'View'],
      Description: 'Round-trips through js-yaml 4',
      Tags: ['security', 'frontmatter'],
    });
    expect(parseYamlFrontmatterBlock(extracted!.block)).toEqual(extracted?.data);
  });
});
