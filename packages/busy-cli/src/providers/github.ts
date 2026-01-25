/**
 * GitHub URL provider
 *
 * Handles URLs like:
 * - https://github.com/org/repo/blob/ref/path/to/file.md
 * - https://github.com/org/repo/tree/ref/path/to/dir
 */

import { Provider, ParsedURL, providerRegistry } from './base.js';

// Pattern for GitHub blob URLs (single file)
const BLOB_PATTERN = /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/;

// Pattern for GitHub tree URLs (directory)
const TREE_PATTERN = /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/;

// Pattern for raw GitHub URLs
const RAW_PATTERN = /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;

export class GitHubProvider implements Provider {
  name = 'github';

  matches(url: string): boolean {
    // Use proper URL parsing to check the hostname
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'github.com' || parsed.hostname === 'raw.githubusercontent.com';
    } catch {
      return false;
    }
  }

  parse(url: string): ParsedURL {
    // Extract anchor if present
    const [urlWithoutAnchor, anchor] = url.split('#');

    // Try blob pattern first
    let match = urlWithoutAnchor.match(BLOB_PATTERN);
    if (match) {
      return {
        provider: 'github',
        org: match[1],
        repo: match[2],
        ref: match[3],
        path: match[4],
        anchor,
      };
    }

    // Try tree pattern (directory)
    match = urlWithoutAnchor.match(TREE_PATTERN);
    if (match) {
      return {
        provider: 'github',
        org: match[1],
        repo: match[2],
        ref: match[3],
        path: match[4],
        anchor,
      };
    }

    // Try raw URL pattern
    match = urlWithoutAnchor.match(RAW_PATTERN);
    if (match) {
      return {
        provider: 'github',
        org: match[1],
        repo: match[2],
        ref: match[3],
        path: match[4],
        anchor,
        rawUrl: urlWithoutAnchor,
      };
    }

    throw new Error(`Cannot parse GitHub URL: ${url}`);
  }

  getRawUrl(parsed: ParsedURL): string {
    if (parsed.rawUrl) {
      return parsed.rawUrl;
    }
    return `https://raw.githubusercontent.com/${parsed.org}/${parsed.repo}/${parsed.ref}/${parsed.path}`;
  }

  async fetch(url: string): Promise<string> {
    const parsed = this.parse(url);
    const rawUrl = this.getRawUrl(parsed);

    const response = await fetch(rawUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${rawUrl}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  async getLatestVersion(parsed: ParsedURL): Promise<string> {
    const apiUrl = `https://api.github.com/repos/${parsed.org}/${parsed.repo}/tags`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        // Add User-Agent header as required by GitHub API
        'User-Agent': 'busy-parser',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tags from GitHub API: ${response.status}`);
    }

    const tags = await response.json() as Array<{ name: string }>;

    if (tags.length === 0) {
      throw new Error(`No tags found for ${parsed.org}/${parsed.repo}`);
    }

    // Return the first (latest) tag
    // Note: GitHub API returns tags in reverse chronological order for most repos
    // For proper semver sorting, we'd need to parse and sort the tags
    return tags[0].name;
  }
}

// Create and register the GitHub provider
export const githubProvider = new GitHubProvider();
providerRegistry.register(githubProvider);
