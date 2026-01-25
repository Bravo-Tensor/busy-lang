/**
 * Local File Provider
 *
 * Provider for local file system paths (relative or absolute).
 * Handles both individual files and directories containing package.busy.md.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Provider, ParsedURL, providerRegistry } from './base.js';

export class LocalProvider implements Provider {
  name = 'local';

  /**
   * Working directory for resolving relative paths
   */
  private workingDir: string;

  constructor(workingDir?: string) {
    this.workingDir = workingDir || process.cwd();
  }

  setWorkingDir(dir: string): void {
    this.workingDir = dir;
  }

  matches(url: string): boolean {
    // Match relative paths (./  ../)
    if (url.startsWith('./') || url.startsWith('../')) {
      return true;
    }
    // Match absolute paths
    if (url.startsWith('/')) {
      return true;
    }
    // Match paths that look like local directories or files (no protocol)
    if (!url.includes('://') && !url.startsWith('http')) {
      // Check if it looks like a path (contains / or ends with .md or .busy.md)
      if (url.includes('/') || url.endsWith('.md') || url.endsWith('.busy')) {
        return true;
      }
    }
    return false;
  }

  parse(url: string): ParsedURL {
    // Extract anchor if present
    const [pathWithoutAnchor, anchor] = url.split('#');

    // Resolve to absolute path
    let absolutePath = path.isAbsolute(pathWithoutAnchor)
      ? pathWithoutAnchor
      : path.resolve(this.workingDir, pathWithoutAnchor);

    return {
      provider: 'local',
      path: absolutePath,
      anchor,
      rawUrl: url,
    };
  }

  getRawUrl(parsed: ParsedURL): string {
    // If path is a directory, return path to package.busy.md
    // This is checked synchronously by checking if path ends with .md or .busy
    const p = parsed.path;
    if (!p.endsWith('.md') && !p.endsWith('.busy')) {
      return path.join(p, 'package.busy.md');
    }
    return p;
  }

  async fetch(url: string): Promise<string> {
    const parsed = this.parse(url);
    let targetPath = parsed.path;

    // Check if path is a directory
    try {
      const stat = await fs.stat(targetPath);
      if (stat.isDirectory()) {
        // Look for package.busy.md in the directory
        targetPath = path.join(targetPath, 'package.busy.md');
      }
    } catch {
      // Path doesn't exist yet, try as-is
    }

    // Read the file
    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read local file ${targetPath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Resolve a path to an absolute path
   */
  resolvePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.resolve(this.workingDir, relativePath);
  }

  /**
   * Check if a path points to a package directory (contains package.busy.md)
   */
  async isPackageDirectory(dirPath: string): Promise<boolean> {
    const manifestPath = path.join(dirPath, 'package.busy.md');
    try {
      await fs.access(manifestPath);
      return true;
    } catch {
      return false;
    }
  }

  // Local files don't support version resolution
  async getLatestVersion(_parsed: ParsedURL): Promise<string> {
    throw new Error('Local provider does not support version resolution');
  }
}

// Create and register the local provider (registered first for priority)
export const localProvider = new LocalProvider();
providerRegistry.register(localProvider);
