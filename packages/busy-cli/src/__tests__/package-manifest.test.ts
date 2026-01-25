/**
 * Package Manifest Tests
 *
 * Tests for package.busy.md manifest-based package installation.
 * Packages are defined by their own package.busy.md that lists all documents.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  parsePackageManifest,
  PackageManifest,
  PackageDocument,
  fetchPackageFromManifest,
  isPackageManifestUrl,
} from '../package/manifest.js';
import { initWorkspace, addPackage } from '../commands/package.js';

// Sample remote package.busy.md content
const SAMPLE_PACKAGE_MANIFEST = `---
Name: busy-v2
Type: Package
Version: v0.3.1
Description: BUSY document standard library
---

# Package Contents

## Core

Core document types and concepts.

- [Document](./core/document.busy.md) - Base document type
- [Operation](./core/operation.busy.md) - Operation definitions
- [Concept](./core/concept.busy.md) - Concept definitions
- [Checklist](./core/checklist.busy.md) - Checklist definitions

## Tools

Tool definitions for runtime integration.

- [Event Tool](./toolbox/event-tool.busy.md) - Event emission
- [File Tool](./toolbox/file-tool.busy.md) - File operations

## Base

Base configurations and agents.

- [Busy Assistant](./base/busy-assistant.busy.md) - Default assistant
`;

describe('parsePackageManifest', () => {
  it('should parse package metadata from frontmatter', () => {
    const manifest = parsePackageManifest(SAMPLE_PACKAGE_MANIFEST);

    expect(manifest.name).toBe('busy-v2');
    expect(manifest.type).toBe('Package');
    expect(manifest.version).toBe('v0.3.1');
    expect(manifest.description).toBe('BUSY document standard library');
  });

  it('should extract all document links', () => {
    const manifest = parsePackageManifest(SAMPLE_PACKAGE_MANIFEST);

    expect(manifest.documents.length).toBe(7);

    const docNames = manifest.documents.map(d => d.name);
    expect(docNames).toContain('Document');
    expect(docNames).toContain('Operation');
    expect(docNames).toContain('Event Tool');
    expect(docNames).toContain('Busy Assistant');
  });

  it('should preserve relative paths', () => {
    const manifest = parsePackageManifest(SAMPLE_PACKAGE_MANIFEST);

    const doc = manifest.documents.find(d => d.name === 'Document');
    expect(doc?.relativePath).toBe('./core/document.busy.md');
  });

  it('should categorize documents', () => {
    const manifest = parsePackageManifest(SAMPLE_PACKAGE_MANIFEST);

    const coreDoc = manifest.documents.find(d => d.name === 'Document');
    expect(coreDoc?.category).toBe('Core');

    const toolDoc = manifest.documents.find(d => d.name === 'Event Tool');
    expect(toolDoc?.category).toBe('Tools');
  });

  it('should handle package with no documents', () => {
    const emptyManifest = `---
Name: empty-package
Type: Package
Version: v1.0.0
Description: An empty package
---

# Package Contents

No documents yet.
`;

    const manifest = parsePackageManifest(emptyManifest);

    expect(manifest.name).toBe('empty-package');
    expect(manifest.documents.length).toBe(0);
  });

  it('should handle anchors in document links', () => {
    const manifestWithAnchors = `---
Name: test-package
Type: Package
Version: v1.0.0
Description: Test
---

# Package Contents

- [ExecutePrompt](./core/prompt.busy.md#executeprompt) - Execute a prompt
- [RunChecklist](./core/checklist.busy.md#runchecklist) - Run a checklist
`;

    const manifest = parsePackageManifest(manifestWithAnchors);

    expect(manifest.documents.length).toBe(2);

    const execPrompt = manifest.documents.find(d => d.name === 'ExecutePrompt');
    expect(execPrompt?.relativePath).toBe('./core/prompt.busy.md');
    expect(execPrompt?.anchor).toBe('executeprompt');
  });

  it('should parse table-based format', () => {
    const tableManifest = `---
Name: busy-v2
Type: Document
Version: v0.4.0
Description: Standard library
---

# Local Definitions

## Package Document

| Field | Required | Description |
|-------|----------|-------------|
| Path | Yes | Relative path |

---

# Package Contents

## Core

### Document

| Field | Value |
|-------|-------|
| Path | ./core/document.busy.md |
| Type | Concept |
| Description | Base document type |

### Operation

| Field | Value |
|-------|-------|
| Path | ./core/operation.busy.md |
| Type | Concept |
| Description | Operation definitions |

## Tools

### Event Tool

| Field | Value |
|-------|-------|
| Path | ./toolbox/event-tool.busy.md |
| Type | Tool |
| Description | Emit events |
`;

    const manifest = parsePackageManifest(tableManifest);

    expect(manifest.name).toBe('busy-v2');
    expect(manifest.type).toBe('Document');
    expect(manifest.version).toBe('v0.4.0');
    expect(manifest.documents.length).toBe(3);

    const doc = manifest.documents.find(d => d.name === 'Document');
    expect(doc?.relativePath).toBe('./core/document.busy.md');
    expect(doc?.type).toBe('Concept');
    expect(doc?.description).toBe('Base document type');
    expect(doc?.category).toBe('Core');

    const tool = manifest.documents.find(d => d.name === 'Event Tool');
    expect(tool?.category).toBe('Tools');
    expect(tool?.type).toBe('Tool');
  });

  it('should handle table format with anchors in Path', () => {
    const tableWithAnchors = `---
Name: test
Type: Document
Version: v1.0.0
Description: Test
---

# Package Contents

## Core

### ExecutePrompt

| Field | Value |
|-------|-------|
| Path | ./core/prompt.busy.md#executeprompt |
| Type | Operation |
`;

    const manifest = parsePackageManifest(tableWithAnchors);

    expect(manifest.documents.length).toBe(1);
    const doc = manifest.documents[0];
    expect(doc.name).toBe('ExecutePrompt');
    expect(doc.relativePath).toBe('./core/prompt.busy.md');
    expect(doc.anchor).toBe('executeprompt');
  });
});

describe('isPackageManifestUrl', () => {
  it('should detect package.busy.md URLs', () => {
    expect(isPackageManifestUrl('https://github.com/org/repo/blob/main/package.busy.md')).toBe(true);
    expect(isPackageManifestUrl('https://github.com/org/repo/blob/main/pkg/package.busy.md')).toBe(true);
  });

  it('should not match regular file URLs', () => {
    expect(isPackageManifestUrl('https://github.com/org/repo/blob/main/file.md')).toBe(false);
    expect(isPackageManifestUrl('https://github.com/org/repo/blob/main/package.md')).toBe(false);
  });
});

describe('fetchPackageFromManifest', () => {
  let tempDir: string;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-manifest-test-'));
    await initWorkspace(tempDir);
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should fetch package manifest and all documents', async () => {
    // Mock responses for manifest and documents
    const mockResponses: Record<string, string> = {
      'https://raw.githubusercontent.com/org/repo/v1.0.0/busy-v2/package.busy.md': `---
Name: busy-v2
Type: Package
Version: v1.0.0
Description: Test package
---

# Package Contents

## Core

- [Document](./core/document.busy.md) - Document type
- [Operation](./core/operation.busy.md) - Operation type
`,
      'https://raw.githubusercontent.com/org/repo/v1.0.0/busy-v2/core/document.busy.md': `---
Name: Document
Type: Concept
Description: Base document type
---

# Document

A document is...
`,
      'https://raw.githubusercontent.com/org/repo/v1.0.0/busy-v2/core/operation.busy.md': `---
Name: Operation
Type: Concept
Description: Operation definition
---

# Operation

An operation is...
`,
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const content = mockResponses[url];
      if (content) {
        return { ok: true, text: () => Promise.resolve(content) };
      }
      return { ok: false, status: 404, statusText: 'Not Found' };
    });

    const manifestUrl = 'https://github.com/org/repo/blob/v1.0.0/busy-v2/package.busy.md';
    const result = await fetchPackageFromManifest(tempDir, manifestUrl);

    expect(result.name).toBe('busy-v2');
    expect(result.version).toBe('v1.0.0');
    expect(result.documents.length).toBe(2);
    expect(result.cached).toBe('.libraries/busy-v2');

    // Verify files were cached
    const docPath = path.join(tempDir, '.libraries', 'busy-v2', 'core', 'document.busy.md');
    const docExists = await fs.stat(docPath).then(() => true).catch(() => false);
    expect(docExists).toBe(true);

    const opPath = path.join(tempDir, '.libraries', 'busy-v2', 'core', 'operation.busy.md');
    const opExists = await fs.stat(opPath).then(() => true).catch(() => false);
    expect(opExists).toBe(true);
  });

  it('should add package to local registry', async () => {
    const mockResponses: Record<string, string> = {
      'https://raw.githubusercontent.com/org/repo/v1.0.0/pkg/package.busy.md': `---
Name: test-pkg
Type: Package
Version: v1.0.0
Description: Test
---

# Package Contents

- [File](./file.busy.md) - A file
`,
      'https://raw.githubusercontent.com/org/repo/v1.0.0/pkg/file.busy.md': '# File\n\nContent',
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const content = mockResponses[url];
      if (content) {
        return { ok: true, text: () => Promise.resolve(content) };
      }
      return { ok: false, status: 404, statusText: 'Not Found' };
    });

    const manifestUrl = 'https://github.com/org/repo/blob/v1.0.0/pkg/package.busy.md';
    await fetchPackageFromManifest(tempDir, manifestUrl);

    // Check local package.busy.md was updated
    const localRegistry = await fs.readFile(path.join(tempDir, 'package.busy.md'), 'utf-8');
    expect(localRegistry).toContain('test-pkg');
    expect(localRegistry).toContain('v1.0.0');
  });

  it('should handle nested directory structures', async () => {
    const mockResponses: Record<string, string> = {
      'https://raw.githubusercontent.com/org/repo/main/package.busy.md': `---
Name: nested-pkg
Type: Package
Version: v2.0.0
Description: Nested structure
---

# Package Contents

- [Deep File](./a/b/c/deep.busy.md) - Deeply nested
`,
      'https://raw.githubusercontent.com/org/repo/main/a/b/c/deep.busy.md': '# Deep\n\nNested content',
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const content = mockResponses[url];
      if (content) {
        return { ok: true, text: () => Promise.resolve(content) };
      }
      return { ok: false, status: 404, statusText: 'Not Found' };
    });

    const manifestUrl = 'https://github.com/org/repo/blob/main/package.busy.md';
    const result = await fetchPackageFromManifest(tempDir, manifestUrl);

    // Verify nested file was cached
    const deepPath = path.join(tempDir, '.libraries', 'nested-pkg', 'a', 'b', 'c', 'deep.busy.md');
    const deepExists = await fs.stat(deepPath).then(() => true).catch(() => false);
    expect(deepExists).toBe(true);
  });
});

describe('addPackage with manifest', () => {
  let tempDir: string;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-add-manifest-test-'));
    await initWorkspace(tempDir);
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect and handle package.busy.md URLs', async () => {
    const mockResponses: Record<string, string> = {
      'https://raw.githubusercontent.com/org/repo/v1.0.0/package.busy.md': `---
Name: my-package
Type: Package
Version: v1.0.0
Description: My package
---

# Package Contents

- [Doc](./doc.busy.md) - A document
`,
      'https://raw.githubusercontent.com/org/repo/v1.0.0/doc.busy.md': '# Doc\n\nContent',
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const content = mockResponses[url];
      if (content) {
        return { ok: true, text: () => Promise.resolve(content) };
      }
      return { ok: false, status: 404, statusText: 'Not Found' };
    });

    // addPackage should auto-detect package.busy.md and use manifest flow
    const result = await addPackage(tempDir, 'https://github.com/org/repo/blob/v1.0.0/package.busy.md');

    expect(result.id).toBe('my-package');
    expect(result.version).toBe('v1.0.0');

    // Verify the package was cached as a directory
    const docPath = path.join(tempDir, '.libraries', 'my-package', 'doc.busy.md');
    const exists = await fs.stat(docPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should still handle single file URLs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Single File\n\nContent'),
    });

    // Non-manifest URL should work as before
    const result = await addPackage(tempDir, 'https://github.com/org/repo/blob/v1.0.0/file.md');

    expect(result.id).toBe('file');
    expect(result.cached).toContain('file.md');
  });
});
