/**
 * CLI Package Management Tests
 *
 * Tests for busy init, check, and package commands.
 * TDD approach for package manager implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// We'll implement these commands
import {
  initWorkspace,
  checkWorkspace,
  addPackage,
  removePackage,
  upgradePackage,
  listPackages,
  getPackageInfo,
} from '../commands/package.js';

describe('initWorkspace', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cli-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create package.busy.md', async () => {
    const result = await initWorkspace(tempDir);

    const packagePath = path.join(tempDir, 'package.busy.md');
    const exists = await fs.stat(packagePath).then(() => true).catch(() => false);

    expect(exists).toBe(true);
    expect(result.created).toContain('package.busy.md');
  });

  it('should create .libraries directory', async () => {
    const result = await initWorkspace(tempDir);

    const librariesPath = path.join(tempDir, '.libraries');
    const exists = await fs.stat(librariesPath).then(() => true).catch(() => false);

    expect(exists).toBe(true);
    expect(result.created).toContain('.libraries');
  });

  it('should not overwrite existing package.busy.md', async () => {
    const packagePath = path.join(tempDir, 'package.busy.md');
    await fs.writeFile(packagePath, 'existing content');

    const result = await initWorkspace(tempDir);

    const content = await fs.readFile(packagePath, 'utf-8');
    expect(content).toBe('existing content');
    expect(result.skipped).toContain('package.busy.md');
  });

  it('should return workspace info', async () => {
    const result = await initWorkspace(tempDir);

    expect(result.workspaceRoot).toBe(tempDir);
    expect(result.initialized).toBe(true);
  });
});

describe('checkWorkspace', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cli-test-'));
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should pass for empty workspace', async () => {
    const result = await checkWorkspace(tempDir);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report missing cached files', async () => {
    // Add a package entry but don't create the cached file
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### test-package

Test package

| Field | Value |
|-------|-------|
| Source | https://example.com/file.md |
| Provider | url |
| Cached | .libraries/file.md |
| Version | v1.0.0 |
| Fetched | 2026-01-21T00:00:00Z |
`;

    await fs.writeFile(packagePath, content);

    const result = await checkWorkspace(tempDir);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('test-package'))).toBe(true);
    expect(result.errors.some(e => e.includes('cached file'))).toBe(true);
  });

  it('should pass when cached files exist', async () => {
    // Add a package entry with a cached file
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### test-package

Test package

| Field | Value |
|-------|-------|
| Source | https://example.com/file.md |
| Provider | url |
| Cached | .libraries/file.md |
| Version | v1.0.0 |
| Fetched | 2026-01-21T00:00:00Z |
`;

    await fs.writeFile(packagePath, content);

    // Create the cached file
    const cachePath = path.join(tempDir, '.libraries', 'file.md');
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, '# Cached content');

    const result = await checkWorkspace(tempDir);

    expect(result.valid).toBe(true);
  });

  it('should verify integrity when specified', async () => {
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### test-package

Test package

| Field | Value |
|-------|-------|
| Source | https://example.com/file.md |
| Provider | url |
| Cached | .libraries/file.md |
| Version | v1.0.0 |
| Fetched | 2026-01-21T00:00:00Z |
| Integrity | sha256:0000000000000000000000000000000000000000000000000000000000000000 |
`;

    await fs.writeFile(packagePath, content);

    // Create cached file with different content (integrity mismatch)
    const cachePath = path.join(tempDir, '.libraries', 'file.md');
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, '# Different content');

    const result = await checkWorkspace(tempDir);

    expect(result.warnings.some(w => w.includes('integrity'))).toBe(true);
  });

  it('should throw for uninitialized workspace', async () => {
    const uninitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-uninit-'));

    await expect(checkWorkspace(uninitDir)).rejects.toThrow();

    await fs.rm(uninitDir, { recursive: true, force: true });
  });
});

describe('addPackage', () => {
  let tempDir: string;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cli-test-'));
    await initWorkspace(tempDir);
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should add package from GitHub URL', async () => {
    const mockContent = '# Test Content\n\nThis is test content.';

    // Mock fetch for both raw content and API calls
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return {
          ok: true,
          text: () => Promise.resolve(mockContent),
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve([]),
      };
    });

    const url = 'https://github.com/org/repo/blob/v1.0.0/path/file.md';
    const result = await addPackage(tempDir, url);

    expect(result.id).toBe('file');
    expect(result.version).toBe('v1.0.0');
    expect(result.provider).toBe('github');

    // Verify cached file exists
    const cachePath = path.join(tempDir, result.cached);
    const exists = await fs.stat(cachePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should derive entry ID from anchor', async () => {
    const mockContent = '# Content';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockContent),
    });

    const url = 'https://github.com/org/repo/blob/main/file.md#my-section';
    const result = await addPackage(tempDir, url);

    expect(result.id).toBe('my-section');
  });

  it('should update package.busy.md', async () => {
    const mockContent = '# Content';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockContent),
    });

    const url = 'https://github.com/org/repo/blob/v1.0.0/file.md';
    await addPackage(tempDir, url);

    // Read package.busy.md and verify entry
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = await fs.readFile(packagePath, 'utf-8');

    expect(content).toContain('### file');
    expect(content).toContain('v1.0.0');
  });
});

describe('removePackage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cli-test-'));
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should remove package from registry', async () => {
    // Set up a package first
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### test-package

Test

| Field | Value |
|-------|-------|
| Source | https://example.com/file.md |
| Provider | url |
| Cached | .libraries/file.md |
| Version | v1.0.0 |
| Fetched | 2026-01-21T00:00:00Z |
`;

    await fs.writeFile(packagePath, content);

    // Create cached file
    const cachePath = path.join(tempDir, '.libraries', 'file.md');
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, '# Content');

    // Remove package
    const result = await removePackage(tempDir, 'test-package');

    expect(result.removed).toBe(true);
    expect(result.id).toBe('test-package');

    // Verify cached file is removed
    const exists = await fs.stat(cachePath).then(() => true).catch(() => false);
    expect(exists).toBe(false);

    // Verify registry entry is removed
    const newContent = await fs.readFile(packagePath, 'utf-8');
    expect(newContent).not.toContain('test-package');
  });

  it('should return false for non-existent package', async () => {
    const result = await removePackage(tempDir, 'nonexistent');

    expect(result.removed).toBe(false);
  });
});

describe('listPackages', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cli-test-'));
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should list all packages', async () => {
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### package-one

Test one

| Field | Value |
|-------|-------|
| Source | https://example.com/one.md |
| Provider | url |
| Cached | .libraries/one.md |
| Version | v1.0.0 |
| Fetched | 2026-01-21T00:00:00Z |

### package-two

Test two

| Field | Value |
|-------|-------|
| Source | https://example.com/two.md |
| Provider | github |
| Cached | .libraries/two.md |
| Version | v2.0.0 |
| Fetched | 2026-01-21T00:00:00Z |
`;

    await fs.writeFile(packagePath, content);

    const result = await listPackages(tempDir);

    expect(result.packages).toHaveLength(2);
    expect(result.packages.some(p => p.id === 'package-one')).toBe(true);
    expect(result.packages.some(p => p.id === 'package-two')).toBe(true);
  });

  it('should return empty array for empty registry', async () => {
    const result = await listPackages(tempDir);

    expect(result.packages).toHaveLength(0);
  });
});

describe('getPackageInfo', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cli-test-'));
    await initWorkspace(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return package details', async () => {
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### test-package

Test description

| Field | Value |
|-------|-------|
| Source | https://example.com/file.md |
| Provider | github |
| Cached | .libraries/file.md |
| Version | v1.5.0 |
| Fetched | 2026-01-21T10:30:00Z |
| Integrity | sha256:abc123 |
`;

    await fs.writeFile(packagePath, content);

    const result = await getPackageInfo(tempDir, 'test-package');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-package');
    expect(result?.version).toBe('v1.5.0');
    expect(result?.provider).toBe('github');
    expect(result?.integrity).toBe('sha256:abc123');
  });

  it('should return null for non-existent package', async () => {
    const result = await getPackageInfo(tempDir, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('upgradePackage', () => {
  let tempDir: string;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cli-test-'));
    await initWorkspace(tempDir);
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should upgrade package to latest version', async () => {
    // Set up existing package
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### test-package

Test

| Field | Value |
|-------|-------|
| Source | https://github.com/org/repo/blob/v1.0.0/file.md |
| Provider | github |
| Cached | .libraries/repo/file.md |
| Version | v1.0.0 |
| Fetched | 2026-01-21T00:00:00Z |
`;

    await fs.writeFile(packagePath, content);

    // Create cached file
    const cachePath = path.join(tempDir, '.libraries', 'repo', 'file.md');
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, '# Old content');

    // Mock fetch for tags API and content
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('api.github.com')) {
        return {
          ok: true,
          json: () => Promise.resolve([{ name: 'v2.0.0' }, { name: 'v1.0.0' }]),
        };
      }
      return {
        ok: true,
        text: () => Promise.resolve('# New content'),
      };
    });

    const result = await upgradePackage(tempDir, 'test-package');

    expect(result.upgraded).toBe(true);
    expect(result.oldVersion).toBe('v1.0.0');
    expect(result.newVersion).toBe('v2.0.0');
  });

  it('should return not upgraded if already latest', async () => {
    const packagePath = path.join(tempDir, 'package.busy.md');
    const content = `---
Name: package
Type: Document
Description: Test
---

# Definitions

## Package Entry

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL |

---

# Package Registry

## Packages

### test-package

Test

| Field | Value |
|-------|-------|
| Source | https://github.com/org/repo/blob/v2.0.0/file.md |
| Provider | github |
| Cached | .libraries/repo/file.md |
| Version | v2.0.0 |
| Fetched | 2026-01-21T00:00:00Z |
`;

    await fs.writeFile(packagePath, content);

    // Mock fetch - already at latest
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ name: 'v2.0.0' }]),
    });

    const result = await upgradePackage(tempDir, 'test-package');

    expect(result.upgraded).toBe(false);
    expect(result.oldVersion).toBe('v2.0.0');
    expect(result.newVersion).toBe('v2.0.0');
  });
});
