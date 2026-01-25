/**
 * GitLab URL provider
 *
 * Handles URLs like:
 * - https://gitlab.com/org/repo/-/blob/ref/path/to/file.md
 * - https://gitlab.com/org/repo/-/tree/ref/path/to/dir
 */

import { Provider, ParsedURL, providerRegistry } from './base.js';

// Pattern for GitLab blob URLs
const BLOB_PATTERN = /gitlab\.com\/([^/]+)\/([^/]+)\/-\/blob\/([^/]+)\/(.+)/;

// Pattern for GitLab tree URLs
const TREE_PATTERN = /gitlab\.com\/([^/]+)\/([^/]+)\/-\/tree\/([^/]+)\/(.+)/;

// Pattern for GitLab raw URLs
const RAW_PATTERN = /gitlab\.com\/([^/]+)\/([^/]+)\/-\/raw\/([^/]+)\/(.+)/;

export class GitLabProvider implements Provider {
  name = 'gitlab';

  matches(url: string): boolean {
    // Use proper URL parsing to check the hostname
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'gitlab.com';
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
        provider: 'gitlab',
        org: match[1],
        repo: match[2],
        ref: match[3],
        path: match[4],
        anchor,
      };
    }

    // Try tree pattern
    match = urlWithoutAnchor.match(TREE_PATTERN);
    if (match) {
      return {
        provider: 'gitlab',
        org: match[1],
        repo: match[2],
        ref: match[3],
        path: match[4],
        anchor,
      };
    }

    // Try raw pattern
    match = urlWithoutAnchor.match(RAW_PATTERN);
    if (match) {
      return {
        provider: 'gitlab',
        org: match[1],
        repo: match[2],
        ref: match[3],
        path: match[4],
        anchor,
        rawUrl: urlWithoutAnchor,
      };
    }

    throw new Error(`Cannot parse GitLab URL: ${url}`);
  }

  getRawUrl(parsed: ParsedURL): string {
    if (parsed.rawUrl) {
      return parsed.rawUrl;
    }
    return `https://gitlab.com/${parsed.org}/${parsed.repo}/-/raw/${parsed.ref}/${parsed.path}`;
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
    // GitLab API for tags
    const apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${parsed.org}/${parsed.repo}`)}/repository/tags`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch tags from GitLab API: ${response.status}`);
    }

    const tags = await response.json() as Array<{ name: string }>;

    if (tags.length === 0) {
      throw new Error(`No tags found for ${parsed.org}/${parsed.repo}`);
    }

    return tags[0].name;
  }
}

// Create and register the GitLab provider
export const gitlabProvider = new GitLabProvider();
providerRegistry.register(gitlabProvider);
