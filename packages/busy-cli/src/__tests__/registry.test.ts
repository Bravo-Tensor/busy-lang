/**
 * Package Registry Tests
 *
 * Tests for package.busy.md parsing and manipulation.
 * TDD approach for package manager implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// We'll implement these after tests
import {
  PackageRegistry,
  PackageEntry,
  parsePackageRegistry,
  deriveEntryId,
  deriveCategory,
} from '../registry/index.js';

const SAMPLE_PACKAGE_BUSY_MD = `---
Name: package
Type: Document
Description: Package registry for this workspace
---

# Local Definitions

## Dependency

An installed BUSY package.

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL to package.busy.md or file |
| Provider | Yes | github, gitlab, url |
| Cached | Yes | Local path in .libraries/ |
| Version | Yes | Semantic version or tag |
| Fetched | Yes | ISO 8601 timestamp |
| Integrity | No | sha256:{hash} |

---

# Dependencies

## Core Library

### executeprompt

Execute a prompt operation.

| Field | Value |
|-------|-------|
| Source | https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt |
| Provider | github |
| Cached | .libraries/busy-lang/busy-v2/core/prompt.md |
| Version | v0.3.1 |
| Fetched | 2026-01-21T10:30:00Z |
| Integrity | sha256:abc123def456 |

[Source][executeprompt_src] | [Local][executeprompt_local]

[executeprompt_src]: https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt
[executeprompt_local]: .libraries/busy-lang/busy-v2/core/prompt.md

## Tools

### emit-event

Emit an event to the runtime.

| Field | Value |
|-------|-------|
| Source | https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/tools/emit-event.busy.md |
| Provider | github |
| Cached | .libraries/busy-lang/busy-v2/tools/emit-event.busy.md |
| Version | v0.3.1 |
| Fetched | 2026-01-21T10:30:00Z |
`;

describe('parsePackageRegistry', () => {
  it('should parse frontmatter', () => {
    const registry = parsePackageRegistry(SAMPLE_PACKAGE_BUSY_MD);

    expect(registry.metadata.name).toBe('package');
    expect(registry.metadata.type).toBe('Document');
    expect(registry.metadata.description).toBe('Package registry for this workspace');
  });

  it('should parse package entries', () => {
    const registry = parsePackageRegistry(SAMPLE_PACKAGE_BUSY_MD);

    expect(registry.packages).toHaveLength(2);

    const executeprompt = registry.packages.find(p => p.id === 'executeprompt');
    expect(executeprompt).toBeDefined();
    expect(executeprompt?.source).toBe('https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt');
    expect(executeprompt?.provider).toBe('github');
    expect(executeprompt?.cached).toBe('.libraries/busy-lang/busy-v2/core/prompt.md');
    expect(executeprompt?.version).toBe('v0.3.1');
    expect(executeprompt?.fetched).toBe('2026-01-21T10:30:00Z');
    expect(executeprompt?.integrity).toBe('sha256:abc123def456');
    expect(executeprompt?.category).toBe('Core Library');
    expect(executeprompt?.description).toBe('Execute a prompt operation.');
  });

  it('should parse entries without optional fields', () => {
    const registry = parsePackageRegistry(SAMPLE_PACKAGE_BUSY_MD);

    const emitEvent = registry.packages.find(p => p.id === 'emit-event');
    expect(emitEvent).toBeDefined();
    expect(emitEvent?.integrity).toBeUndefined();
  });

  it('should handle empty registry', () => {
    const emptyRegistry = `---
Name: package
Type: Document
Description: Empty package registry
---

# Local Definitions

## Dependency

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Dependencies

No dependencies installed.
`;

    const registry = parsePackageRegistry(emptyRegistry);

    expect(registry.packages).toHaveLength(0);
  });
});

describe('PackageRegistry', () => {
  let tempDir: string;
  let registry: PackageRegistry;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-registry-test-'));
    registry = new PackageRegistry(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should create package.busy.md with defaults', async () => {
      await registry.init();

      const packagePath = path.join(tempDir, 'package.busy.md');
      const exists = await fs.stat(packagePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should not overwrite existing package.busy.md', async () => {
      const packagePath = path.join(tempDir, 'package.busy.md');
      await fs.writeFile(packagePath, 'existing content');

      await registry.init();

      const content = await fs.readFile(packagePath, 'utf-8');
      expect(content).toBe('existing content');
    });
  });

  describe('load', () => {
    it('should load existing package.busy.md', async () => {
      const packagePath = path.join(tempDir, 'package.busy.md');
      await fs.writeFile(packagePath, SAMPLE_PACKAGE_BUSY_MD);

      await registry.load();

      const packages = registry.getPackages();
      expect(packages).toHaveLength(2);
    });

    it('should throw if package.busy.md does not exist', async () => {
      await expect(registry.load()).rejects.toThrow();
    });
  });

  describe('getPackage', () => {
    beforeEach(async () => {
      const packagePath = path.join(tempDir, 'package.busy.md');
      await fs.writeFile(packagePath, SAMPLE_PACKAGE_BUSY_MD);
      await registry.load();
    });

    it('should get package by id', () => {
      const pkg = registry.getPackage('executeprompt');

      expect(pkg).toBeDefined();
      expect(pkg?.source).toContain('prompt.md#executeprompt');
    });

    it('should return undefined for non-existent package', () => {
      const pkg = registry.getPackage('nonexistent');
      expect(pkg).toBeUndefined();
    });
  });

  describe('addPackage', () => {
    beforeEach(async () => {
      await registry.init();
      await registry.load();
    });

    it('should add a new package', () => {
      const entry: PackageEntry = {
        id: 'new-package',
        description: 'A new package',
        source: 'https://github.com/org/repo/blob/main/file.md',
        provider: 'github',
        cached: '.libraries/repo/file.md',
        version: 'v1.0.0',
        fetched: new Date().toISOString(),
        category: 'Packages',
      };

      registry.addPackage(entry);

      const pkg = registry.getPackage('new-package');
      expect(pkg).toEqual(entry);
    });

    it('should update existing package', () => {
      const entry: PackageEntry = {
        id: 'test-package',
        description: 'Test',
        source: 'https://example.com/file.md',
        provider: 'url',
        cached: '.libraries/file.md',
        version: 'v1.0.0',
        fetched: new Date().toISOString(),
        category: 'Packages',
      };

      registry.addPackage(entry);

      const updatedEntry = { ...entry, version: 'v2.0.0' };
      registry.addPackage(updatedEntry);

      const pkg = registry.getPackage('test-package');
      expect(pkg?.version).toBe('v2.0.0');
    });
  });

  describe('removePackage', () => {
    beforeEach(async () => {
      const packagePath = path.join(tempDir, 'package.busy.md');
      await fs.writeFile(packagePath, SAMPLE_PACKAGE_BUSY_MD);
      await registry.load();
    });

    it('should remove package by id', () => {
      const removed = registry.removePackage('executeprompt');

      expect(removed).toBe(true);
      expect(registry.getPackage('executeprompt')).toBeUndefined();
    });

    it('should return false for non-existent package', () => {
      const removed = registry.removePackage('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      await registry.init();
      await registry.load();
    });

    it('should save changes to package.busy.md', async () => {
      const entry: PackageEntry = {
        id: 'new-package',
        description: 'A new package',
        source: 'https://github.com/org/repo/blob/main/file.md',
        provider: 'github',
        cached: '.libraries/repo/file.md',
        version: 'v1.0.0',
        fetched: '2026-01-21T10:00:00Z',
        category: 'Packages',
      };

      registry.addPackage(entry);
      await registry.save();

      // Reload and verify
      const newRegistry = new PackageRegistry(tempDir);
      await newRegistry.load();

      const pkg = newRegistry.getPackage('new-package');
      expect(pkg).toBeDefined();
      expect(pkg?.version).toBe('v1.0.0');
    });
  });

  describe('getPackagesByCategory', () => {
    beforeEach(async () => {
      const packagePath = path.join(tempDir, 'package.busy.md');
      await fs.writeFile(packagePath, SAMPLE_PACKAGE_BUSY_MD);
      await registry.load();
    });

    it('should return packages in category', () => {
      const corePackages = registry.getPackagesByCategory('Core Library');
      expect(corePackages).toHaveLength(1);
      expect(corePackages[0].id).toBe('executeprompt');
    });

    it('should return empty array for non-existent category', () => {
      const packages = registry.getPackagesByCategory('Nonexistent');
      expect(packages).toHaveLength(0);
    });
  });

  describe('getCategories', () => {
    beforeEach(async () => {
      const packagePath = path.join(tempDir, 'package.busy.md');
      await fs.writeFile(packagePath, SAMPLE_PACKAGE_BUSY_MD);
      await registry.load();
    });

    it('should return all categories', () => {
      const categories = registry.getCategories();

      expect(categories).toContain('Core Library');
      expect(categories).toContain('Tools');
    });
  });
});

describe('deriveEntryId', () => {
  it('should use anchor if present', () => {
    const url = 'https://github.com/org/repo/blob/main/file.md#executeprompt';
    expect(deriveEntryId(url)).toBe('executeprompt');
  });

  it('should use filename without extension if no anchor', () => {
    const url = 'https://github.com/org/repo/blob/main/emit-event.busy.md';
    expect(deriveEntryId(url)).toBe('emit-event');
  });

  it('should handle .md extension', () => {
    const url = 'https://github.com/org/repo/blob/main/prompt.md';
    expect(deriveEntryId(url)).toBe('prompt');
  });

  it('should handle nested paths', () => {
    const url = 'https://github.com/org/repo/blob/main/tools/emit-event.busy.md';
    expect(deriveEntryId(url)).toBe('emit-event');
  });

  it('should slugify the result', () => {
    const url = 'https://github.com/org/repo/blob/main/My File.md';
    expect(deriveEntryId(url)).toBe('my-file');
  });

  it('should handle uppercase anchors', () => {
    const url = 'https://github.com/org/repo/blob/main/file.md#ExecutePrompt';
    expect(deriveEntryId(url)).toBe('executeprompt');
  });
});

describe('deriveCategory', () => {
  it('should return Core Library for /core/ path', () => {
    const url = 'https://github.com/org/repo/blob/main/core/prompt.md';
    expect(deriveCategory(url)).toBe('Core Library');
  });

  it('should return Tools for /tools/ path', () => {
    const url = 'https://github.com/org/repo/blob/main/tools/emit.md';
    expect(deriveCategory(url)).toBe('Tools');
  });

  it('should return Concepts for /concepts/ path', () => {
    const url = 'https://github.com/org/repo/blob/main/concepts/operation.md';
    expect(deriveCategory(url)).toBe('Concepts');
  });

  it('should return Packages as default', () => {
    const url = 'https://github.com/org/repo/blob/main/other/file.md';
    expect(deriveCategory(url)).toBe('Packages');
  });

  it('should handle case insensitively', () => {
    const url = 'https://github.com/org/repo/blob/main/CORE/prompt.md';
    expect(deriveCategory(url)).toBe('Core Library');
  });
});
