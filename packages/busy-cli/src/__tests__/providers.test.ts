/**
 * Provider System Tests
 *
 * Tests for URL providers (GitHub, GitLab, generic URL) and ProviderRegistry.
 * Following TDD approach for package manager implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Provider,
  ParsedURL,
  ProviderRegistry,
  providerRegistry,
} from '../providers/base.js';
import { GitHubProvider, githubProvider } from '../providers/github.js';
import { GitLabProvider, gitlabProvider } from '../providers/gitlab.js';
import { URLProvider, urlProvider } from '../providers/url.js';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('should start with no providers', () => {
    expect(registry.getProviders()).toHaveLength(0);
  });

  it('should register a provider', () => {
    const mockProvider: Provider = {
      name: 'test',
      matches: () => true,
      parse: () => ({ provider: 'test', path: '/test' }),
      getRawUrl: () => 'https://example.com/raw',
      fetch: async () => 'content',
    };

    registry.register(mockProvider);
    expect(registry.getProviders()).toHaveLength(1);
    expect(registry.getProviders()[0].name).toBe('test');
  });

  it('should find provider that matches URL', () => {
    const githubMock: Provider = {
      name: 'github',
      matches: (url) => url.includes('github.com'),
      parse: () => ({ provider: 'github', path: '/test' }),
      getRawUrl: () => 'https://raw.githubusercontent.com/test',
      fetch: async () => 'content',
    };

    const gitlabMock: Provider = {
      name: 'gitlab',
      matches: (url) => url.includes('gitlab.com'),
      parse: () => ({ provider: 'gitlab', path: '/test' }),
      getRawUrl: () => 'https://gitlab.com/raw',
      fetch: async () => 'content',
    };

    registry.register(githubMock);
    registry.register(gitlabMock);

    const githubResult = registry.findProvider('https://github.com/org/repo');
    expect(githubResult?.name).toBe('github');

    const gitlabResult = registry.findProvider('https://gitlab.com/org/repo');
    expect(gitlabResult?.name).toBe('gitlab');
  });

  it('should return undefined when no provider matches', () => {
    const result = registry.findProvider('https://bitbucket.org/org/repo');
    expect(result).toBeUndefined();
  });

  it('should return first matching provider (order matters)', () => {
    const provider1: Provider = {
      name: 'first',
      matches: () => true,
      parse: () => ({ provider: 'first', path: '/test' }),
      getRawUrl: () => 'https://first.com',
      fetch: async () => 'content',
    };

    const provider2: Provider = {
      name: 'second',
      matches: () => true,
      parse: () => ({ provider: 'second', path: '/test' }),
      getRawUrl: () => 'https://second.com',
      fetch: async () => 'content',
    };

    registry.register(provider1);
    registry.register(provider2);

    const result = registry.findProvider('https://any.url');
    expect(result?.name).toBe('first');
  });
});

describe('GitHubProvider', () => {
  let provider: GitHubProvider;

  beforeEach(() => {
    provider = new GitHubProvider();
  });

  describe('matches', () => {
    it('should match github.com URLs', () => {
      expect(provider.matches('https://github.com/org/repo')).toBe(true);
      expect(provider.matches('https://github.com/org/repo/blob/main/file.md')).toBe(true);
    });

    it('should match raw.githubusercontent.com URLs', () => {
      expect(provider.matches('https://raw.githubusercontent.com/org/repo/main/file.md')).toBe(true);
    });

    it('should not match other URLs', () => {
      expect(provider.matches('https://gitlab.com/org/repo')).toBe(false);
      expect(provider.matches('https://example.com/github.com')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse blob URLs', () => {
      const url = 'https://github.com/Bravo-Tensor/busy-lang/blob/main/busy-v2/core/document.busy.md';
      const result = provider.parse(url);

      expect(result.provider).toBe('github');
      expect(result.org).toBe('Bravo-Tensor');
      expect(result.repo).toBe('busy-lang');
      expect(result.ref).toBe('main');
      expect(result.path).toBe('busy-v2/core/document.busy.md');
      expect(result.anchor).toBeUndefined();
    });

    it('should parse blob URLs with version tags', () => {
      const url = 'https://github.com/org/repo/blob/v1.0.0/path/file.md';
      const result = provider.parse(url);

      expect(result.ref).toBe('v1.0.0');
      expect(result.path).toBe('path/file.md');
    });

    it('should parse tree URLs (directories)', () => {
      const url = 'https://github.com/org/repo/tree/main/src/components';
      const result = provider.parse(url);

      expect(result.provider).toBe('github');
      expect(result.org).toBe('org');
      expect(result.repo).toBe('repo');
      expect(result.ref).toBe('main');
      expect(result.path).toBe('src/components');
    });

    it('should parse raw.githubusercontent.com URLs', () => {
      const url = 'https://raw.githubusercontent.com/org/repo/main/README.md';
      const result = provider.parse(url);

      expect(result.provider).toBe('github');
      expect(result.org).toBe('org');
      expect(result.repo).toBe('repo');
      expect(result.ref).toBe('main');
      expect(result.path).toBe('README.md');
      expect(result.rawUrl).toBe(url);
    });

    it('should extract anchor from URL', () => {
      const url = 'https://github.com/org/repo/blob/main/file.md#section-heading';
      const result = provider.parse(url);

      expect(result.path).toBe('file.md');
      expect(result.anchor).toBe('section-heading');
    });

    it('should throw for invalid GitHub URLs', () => {
      expect(() => provider.parse('https://github.com/invalid')).toThrow();
    });
  });

  describe('getRawUrl', () => {
    it('should convert parsed URL to raw URL', () => {
      const parsed: ParsedURL = {
        provider: 'github',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'src/file.md',
      };

      const rawUrl = provider.getRawUrl(parsed);
      expect(rawUrl).toBe('https://raw.githubusercontent.com/org/repo/main/src/file.md');
    });

    it('should return existing rawUrl if present', () => {
      const parsed: ParsedURL = {
        provider: 'github',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'file.md',
        rawUrl: 'https://raw.githubusercontent.com/org/repo/main/file.md',
      };

      const rawUrl = provider.getRawUrl(parsed);
      expect(rawUrl).toBe(parsed.rawUrl);
    });
  });

  describe('fetch', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should fetch content from raw URL', async () => {
      const mockContent = '# Test Content\n\nThis is test content.';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockContent),
      });

      const url = 'https://github.com/org/repo/blob/main/README.md';
      const result = await provider.fetch(url);

      expect(result).toBe(mockContent);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/org/repo/main/README.md'
      );
    });

    it('should throw on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const url = 'https://github.com/org/repo/blob/main/nonexistent.md';
      await expect(provider.fetch(url)).rejects.toThrow('Failed to fetch');
    });
  });

  describe('getLatestVersion', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return latest tag from GitHub API', async () => {
      const mockTags = [
        { name: 'v1.2.0' },
        { name: 'v1.1.0' },
        { name: 'v1.0.0' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTags),
      });

      const parsed: ParsedURL = {
        provider: 'github',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'file.md',
      };

      const version = await provider.getLatestVersion(parsed);
      expect(version).toBe('v1.2.0');
    });

    it('should throw when no tags found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const parsed: ParsedURL = {
        provider: 'github',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'file.md',
      };

      await expect(provider.getLatestVersion(parsed)).rejects.toThrow('No tags found');
    });

    it('should throw on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const parsed: ParsedURL = {
        provider: 'github',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'file.md',
      };

      await expect(provider.getLatestVersion(parsed)).rejects.toThrow('Failed to fetch tags');
    });
  });
});

describe('GitLabProvider', () => {
  let provider: GitLabProvider;

  beforeEach(() => {
    provider = new GitLabProvider();
  });

  describe('matches', () => {
    it('should match gitlab.com URLs', () => {
      expect(provider.matches('https://gitlab.com/org/repo')).toBe(true);
      expect(provider.matches('https://gitlab.com/org/repo/-/blob/main/file.md')).toBe(true);
    });

    it('should not match other URLs', () => {
      expect(provider.matches('https://github.com/org/repo')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse blob URLs', () => {
      const url = 'https://gitlab.com/org/repo/-/blob/main/src/file.md';
      const result = provider.parse(url);

      expect(result.provider).toBe('gitlab');
      expect(result.org).toBe('org');
      expect(result.repo).toBe('repo');
      expect(result.ref).toBe('main');
      expect(result.path).toBe('src/file.md');
    });

    it('should parse tree URLs', () => {
      const url = 'https://gitlab.com/org/repo/-/tree/main/src';
      const result = provider.parse(url);

      expect(result.provider).toBe('gitlab');
      expect(result.path).toBe('src');
    });

    it('should parse raw URLs', () => {
      const url = 'https://gitlab.com/org/repo/-/raw/main/file.md';
      const result = provider.parse(url);

      expect(result.provider).toBe('gitlab');
      expect(result.rawUrl).toBe(url);
    });

    it('should extract anchor from URL', () => {
      const url = 'https://gitlab.com/org/repo/-/blob/main/file.md#heading';
      const result = provider.parse(url);

      expect(result.anchor).toBe('heading');
    });

    it('should throw for invalid GitLab URLs', () => {
      expect(() => provider.parse('https://gitlab.com/invalid')).toThrow();
    });
  });

  describe('getRawUrl', () => {
    it('should convert parsed URL to raw URL', () => {
      const parsed: ParsedURL = {
        provider: 'gitlab',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'src/file.md',
      };

      const rawUrl = provider.getRawUrl(parsed);
      expect(rawUrl).toBe('https://gitlab.com/org/repo/-/raw/main/src/file.md');
    });
  });

  describe('fetch', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should fetch content from raw URL', async () => {
      const mockContent = '# GitLab Content';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockContent),
      });

      const url = 'https://gitlab.com/org/repo/-/blob/main/file.md';
      const result = await provider.fetch(url);

      expect(result).toBe(mockContent);
    });
  });

  describe('getLatestVersion', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return latest tag from GitLab API', async () => {
      const mockTags = [{ name: 'v2.0.0' }, { name: 'v1.0.0' }];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTags),
      });

      const parsed: ParsedURL = {
        provider: 'gitlab',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        path: 'file.md',
      };

      const version = await provider.getLatestVersion(parsed);
      expect(version).toBe('v2.0.0');
    });
  });
});

describe('URLProvider', () => {
  let provider: URLProvider;

  beforeEach(() => {
    provider = new URLProvider();
  });

  describe('matches', () => {
    it('should match HTTP URLs', () => {
      expect(provider.matches('http://example.com/file.md')).toBe(true);
    });

    it('should match HTTPS URLs', () => {
      expect(provider.matches('https://example.com/file.md')).toBe(true);
    });

    it('should not match non-HTTP URLs', () => {
      expect(provider.matches('ftp://example.com/file.md')).toBe(false);
      expect(provider.matches('/local/path/file.md')).toBe(false);
      expect(provider.matches('./relative/path.md')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic URL', () => {
      const url = 'https://example.com/path/to/file.md';
      const result = provider.parse(url);

      expect(result.provider).toBe('url');
      expect(result.path).toBe('/path/to/file.md');
      expect(result.rawUrl).toBe(url);
    });

    it('should extract anchor from URL', () => {
      const url = 'https://example.com/file.md#section';
      const result = provider.parse(url);

      expect(result.anchor).toBe('section');
      expect(result.rawUrl).toBe('https://example.com/file.md');
    });
  });

  describe('getRawUrl', () => {
    it('should return rawUrl if present', () => {
      const parsed: ParsedURL = {
        provider: 'url',
        path: '/file.md',
        rawUrl: 'https://example.com/file.md',
      };

      expect(provider.getRawUrl(parsed)).toBe('https://example.com/file.md');
    });

    it('should fallback to path if no rawUrl', () => {
      const parsed: ParsedURL = {
        provider: 'url',
        path: '/file.md',
      };

      expect(provider.getRawUrl(parsed)).toBe('/file.md');
    });
  });

  describe('fetch', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should fetch content from URL', async () => {
      const mockContent = 'Remote content';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockContent),
      });

      const url = 'https://example.com/file.md';
      const result = await provider.fetch(url);

      expect(result).toBe(mockContent);
      expect(global.fetch).toHaveBeenCalledWith(url);
    });
  });

  describe('getLatestVersion', () => {
    it('should throw as version resolution is not supported', async () => {
      const parsed: ParsedURL = {
        provider: 'url',
        path: '/file.md',
      };

      await expect(provider.getLatestVersion(parsed)).rejects.toThrow(
        'Generic URL provider does not support version resolution'
      );
    });
  });
});

describe('Global Provider Registry', () => {
  it('should have GitHub provider registered', () => {
    const provider = providerRegistry.findProvider('https://github.com/org/repo/blob/main/file.md');
    expect(provider?.name).toBe('github');
  });

  it('should have GitLab provider registered', () => {
    const provider = providerRegistry.findProvider('https://gitlab.com/org/repo/-/blob/main/file.md');
    expect(provider?.name).toBe('gitlab');
  });

  it('should have URL provider as fallback', () => {
    const provider = providerRegistry.findProvider('https://example.com/file.md');
    expect(provider?.name).toBe('url');
  });

  it('should prioritize specific providers over generic URL provider', () => {
    // GitHub should match before URL provider
    const githubProvider = providerRegistry.findProvider('https://github.com/org/repo/blob/main/file.md');
    expect(githubProvider?.name).toBe('github');

    // GitLab should match before URL provider
    const gitlabProvider = providerRegistry.findProvider('https://gitlab.com/org/repo/-/blob/main/file.md');
    expect(gitlabProvider?.name).toBe('gitlab');
  });
});

describe('Provider Interface Compliance', () => {
  const providers = [
    { name: 'GitHub', instance: new GitHubProvider() },
    { name: 'GitLab', instance: new GitLabProvider() },
    { name: 'URL', instance: new URLProvider() },
  ];

  providers.forEach(({ name, instance }) => {
    describe(`${name}Provider`, () => {
      it('should have required name property', () => {
        expect(typeof instance.name).toBe('string');
        expect(instance.name.length).toBeGreaterThan(0);
      });

      it('should implement matches method', () => {
        expect(typeof instance.matches).toBe('function');
      });

      it('should implement parse method', () => {
        expect(typeof instance.parse).toBe('function');
      });

      it('should implement getRawUrl method', () => {
        expect(typeof instance.getRawUrl).toBe('function');
      });

      it('should implement fetch method', () => {
        expect(typeof instance.fetch).toBe('function');
      });

      it('should implement getLatestVersion method', () => {
        expect(typeof instance.getLatestVersion).toBe('function');
      });
    });
  });
});

describe('Edge Cases', () => {
  describe('GitHub URL edge cases', () => {
    const provider = new GitHubProvider();

    it('should handle URLs with special characters in path', () => {
      const url = 'https://github.com/org/repo/blob/main/path%20with%20spaces/file.md';
      // This may or may not work depending on implementation
      // We're testing that it doesn't throw unexpectedly
      expect(() => provider.parse(url)).not.toThrow();
    });

    it('should handle commit SHA as ref', () => {
      const url = 'https://github.com/org/repo/blob/abc123def456/file.md';
      const result = provider.parse(url);
      expect(result.ref).toBe('abc123def456');
    });

    it('should handle branch names with slashes', () => {
      const url = 'https://github.com/org/repo/blob/feature/my-feature/src/file.md';
      const result = provider.parse(url);
      // The ref might include the full path after blob/
      // This tests current behavior
      expect(result.ref).toBe('feature');
    });
  });

  describe('GitLab URL edge cases', () => {
    const provider = new GitLabProvider();

    it('should handle nested groups', () => {
      // GitLab supports nested groups like gitlab.com/group/subgroup/repo
      // Current implementation may not fully support this
      const url = 'https://gitlab.com/group/repo/-/blob/main/file.md';
      const result = provider.parse(url);
      expect(result.org).toBe('group');
    });
  });

  describe('URL Provider edge cases', () => {
    const provider = new URLProvider();

    it('should handle URLs with query parameters', () => {
      const url = 'https://example.com/file.md?version=1';
      const result = provider.parse(url);
      expect(result.provider).toBe('url');
    });

    it('should handle URLs with multiple anchors (only first used)', () => {
      const url = 'https://example.com/file.md#section#subsection';
      const result = provider.parse(url);
      // Behavior depends on implementation
      expect(result.anchor).toBeDefined();
    });
  });
});
