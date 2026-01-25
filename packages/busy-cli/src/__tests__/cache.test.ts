/**
 * Cache Manager Tests
 *
 * Tests for .libraries/ cache management.
 * TDD approach for package manager implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

// We'll implement these after tests
import {
  CacheManager,
  CachedFile,
  deriveCachePath,
  calculateIntegrity,
  verifyIntegrity,
} from '../cache/index.js';
import type { ParsedURL } from '../providers/base.js';

describe('CacheManager', () => {
  let tempDir: string;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    // Create a temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'busy-cache-test-'));
    cacheManager = new CacheManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('should create .libraries directory on init', async () => {
      await cacheManager.init();

      const librariesPath = path.join(tempDir, '.libraries');
      const exists = await fs.stat(librariesPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should not fail if .libraries already exists', async () => {
      const librariesPath = path.join(tempDir, '.libraries');
      await fs.mkdir(librariesPath, { recursive: true });

      await expect(cacheManager.init()).resolves.not.toThrow();
    });

    it('should return workspace root path', () => {
      expect(cacheManager.workspaceRoot).toBe(tempDir);
    });

    it('should return libraries path', () => {
      expect(cacheManager.librariesPath).toBe(path.join(tempDir, '.libraries'));
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('should save content to cache', async () => {
      const content = '# Test Content\n\nThis is test content.';
      const cachePath = 'core/test.md';

      const result = await cacheManager.save(cachePath, content);

      expect(result.path).toBe(cachePath);
      expect(result.fullPath).toBe(path.join(tempDir, '.libraries', cachePath));

      const savedContent = await fs.readFile(result.fullPath, 'utf-8');
      expect(savedContent).toBe(content);
    });

    it('should create nested directories', async () => {
      const content = 'content';
      const cachePath = 'deep/nested/path/file.md';

      await cacheManager.save(cachePath, content);

      const fullPath = path.join(tempDir, '.libraries', cachePath);
      const savedContent = await fs.readFile(fullPath, 'utf-8');
      expect(savedContent).toBe(content);
    });

    it('should calculate and return integrity hash', async () => {
      const content = 'test content for hash';
      const cachePath = 'test.md';

      const result = await cacheManager.save(cachePath, content);

      expect(result.integrity).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should overwrite existing file', async () => {
      const cachePath = 'test.md';

      await cacheManager.save(cachePath, 'original content');
      await cacheManager.save(cachePath, 'new content');

      const fullPath = path.join(tempDir, '.libraries', cachePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      expect(content).toBe('new content');
    });
  });

  describe('read', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('should read content from cache', async () => {
      const content = 'cached content';
      const cachePath = 'test.md';

      await cacheManager.save(cachePath, content);
      const result = await cacheManager.read(cachePath);

      expect(result).toBe(content);
    });

    it('should throw if file does not exist', async () => {
      await expect(cacheManager.read('nonexistent.md')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('should return true for existing file', async () => {
      await cacheManager.save('test.md', 'content');
      expect(await cacheManager.exists('test.md')).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      expect(await cacheManager.exists('nonexistent.md')).toBe(false);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('should delete cached file', async () => {
      await cacheManager.save('test.md', 'content');
      await cacheManager.delete('test.md');

      expect(await cacheManager.exists('test.md')).toBe(false);
    });

    it('should not throw if file does not exist', async () => {
      await expect(cacheManager.delete('nonexistent.md')).resolves.not.toThrow();
    });

    it('should clean up empty parent directories', async () => {
      await cacheManager.save('deep/nested/file.md', 'content');
      await cacheManager.delete('deep/nested/file.md');

      const nestedDir = path.join(tempDir, '.libraries', 'deep', 'nested');
      const exists = await fs.stat(nestedDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('should list all cached files', async () => {
      await cacheManager.save('file1.md', 'content1');
      await cacheManager.save('dir/file2.md', 'content2');
      await cacheManager.save('dir/subdir/file3.md', 'content3');

      const files = await cacheManager.list();

      expect(files).toHaveLength(3);
      expect(files).toContain('file1.md');
      expect(files).toContain('dir/file2.md');
      expect(files).toContain('dir/subdir/file3.md');
    });

    it('should return empty array for empty cache', async () => {
      const files = await cacheManager.list();
      expect(files).toHaveLength(0);
    });
  });

  describe('clean', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('should remove all cached files', async () => {
      await cacheManager.save('file1.md', 'content1');
      await cacheManager.save('dir/file2.md', 'content2');

      const removed = await cacheManager.clean();

      expect(removed).toBe(2);
      const files = await cacheManager.list();
      expect(files).toHaveLength(0);
    });

    it('should return 0 for empty cache', async () => {
      const removed = await cacheManager.clean();
      expect(removed).toBe(0);
    });
  });

  describe('verifyIntegrity', () => {
    beforeEach(async () => {
      await cacheManager.init();
    });

    it('should return true for matching integrity', async () => {
      const content = 'test content';
      const result = await cacheManager.save('test.md', content);

      const isValid = await cacheManager.verifyIntegrity('test.md', result.integrity);
      expect(isValid).toBe(true);
    });

    it('should return false for mismatched integrity', async () => {
      await cacheManager.save('test.md', 'content');

      const isValid = await cacheManager.verifyIntegrity('test.md', 'sha256:invalid');
      expect(isValid).toBe(false);
    });

    it('should return false for non-existent file', async () => {
      const isValid = await cacheManager.verifyIntegrity('nonexistent.md', 'sha256:any');
      expect(isValid).toBe(false);
    });
  });

  describe('getFullPath', () => {
    it('should return full path for cache path', () => {
      const fullPath = cacheManager.getFullPath('core/file.md');
      expect(fullPath).toBe(path.join(tempDir, '.libraries', 'core/file.md'));
    });
  });

  describe('getCachePath', () => {
    it('should return cache path from full path', () => {
      const fullPath = path.join(tempDir, '.libraries', 'core/file.md');
      const cachePath = cacheManager.getCachePath(fullPath);
      expect(cachePath).toBe('core/file.md');
    });

    it('should return null for paths outside cache', () => {
      const outsidePath = '/some/other/path/file.md';
      const cachePath = cacheManager.getCachePath(outsidePath);
      expect(cachePath).toBeNull();
    });
  });
});

describe('deriveCachePath', () => {
  describe('GitHub URLs', () => {
    it('should derive path from GitHub blob URL', () => {
      const parsed: ParsedURL = {
        provider: 'github',
        org: 'Bravo-Tensor',
        repo: 'busy-lang',
        ref: 'v0.3.1',
        path: 'busy-v2/core/prompt.md',
      };

      const cachePath = deriveCachePath(parsed);
      expect(cachePath).toBe('busy-lang/busy-v2/core/prompt.md');
    });

    it('should handle paths with directories', () => {
      const parsed: ParsedURL = {
        provider: 'github',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'src/deep/nested/file.md',
      };

      const cachePath = deriveCachePath(parsed);
      expect(cachePath).toBe('repo/src/deep/nested/file.md');
    });
  });

  describe('GitLab URLs', () => {
    it('should derive path from GitLab URL', () => {
      const parsed: ParsedURL = {
        provider: 'gitlab',
        org: 'group',
        repo: 'project',
        ref: 'main',
        path: 'docs/file.md',
      };

      const cachePath = deriveCachePath(parsed);
      expect(cachePath).toBe('project/docs/file.md');
    });
  });

  describe('Generic URLs', () => {
    it('should derive path from generic URL', () => {
      const parsed: ParsedURL = {
        provider: 'url',
        path: '/path/to/file.md',
        rawUrl: 'https://example.com/path/to/file.md',
      };

      const cachePath = deriveCachePath(parsed);
      expect(cachePath).toBe('example.com/path/to/file.md');
    });

    it('should handle URL with query params in path', () => {
      const parsed: ParsedURL = {
        provider: 'url',
        path: '/file.md',
        rawUrl: 'https://cdn.example.org/file.md',
      };

      const cachePath = deriveCachePath(parsed);
      expect(cachePath).toBe('cdn.example.org/file.md');
    });
  });
});

describe('calculateIntegrity', () => {
  it('should calculate sha256 hash of content', () => {
    const content = 'test content';
    const hash = calculateIntegrity(content);

    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should return same hash for same content', () => {
    const content = 'test content';
    const hash1 = calculateIntegrity(content);
    const hash2 = calculateIntegrity(content);

    expect(hash1).toBe(hash2);
  });

  it('should return different hash for different content', () => {
    const hash1 = calculateIntegrity('content1');
    const hash2 = calculateIntegrity('content2');

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', () => {
    const hash = calculateIntegrity('');
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should handle unicode content', () => {
    const hash = calculateIntegrity('こんにちは 世界');
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('verifyIntegrity', () => {
  it('should return true for matching hash', () => {
    const content = 'test content';
    const hash = calculateIntegrity(content);

    expect(verifyIntegrity(content, hash)).toBe(true);
  });

  it('should return false for mismatched hash', () => {
    const content = 'test content';
    const wrongHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

    expect(verifyIntegrity(content, wrongHash)).toBe(false);
  });

  it('should return false for invalid hash format', () => {
    const content = 'test content';

    expect(verifyIntegrity(content, 'invalid')).toBe(false);
    expect(verifyIntegrity(content, 'md5:abc123')).toBe(false);
  });
});
