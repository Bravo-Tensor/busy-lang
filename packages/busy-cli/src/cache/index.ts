/**
 * Cache Manager for .libraries/
 *
 * Manages local cache of fetched packages.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { ParsedURL } from '../providers/base.js';

/**
 * Result of saving a file to cache
 */
export interface CachedFile {
  path: string;
  fullPath: string;
  integrity: string;
}

/**
 * Calculate SHA256 integrity hash of content
 */
export function calculateIntegrity(content: string): string {
  const hash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  return `sha256:${hash}`;
}

/**
 * Verify content matches integrity hash
 */
export function verifyIntegrity(content: string, integrity: string): boolean {
  if (!integrity.startsWith('sha256:')) {
    return false;
  }

  const calculated = calculateIntegrity(content);
  return calculated === integrity;
}

/**
 * Derive cache path from parsed URL
 *
 * For GitHub/GitLab: {repo}/{path-from-blob}
 * For generic URLs: {domain}/{path}
 */
export function deriveCachePath(parsed: ParsedURL): string {
  if (parsed.provider === 'github' || parsed.provider === 'gitlab') {
    // Use repo name + path
    return `${parsed.repo}/${parsed.path}`;
  }

  // Generic URL - extract domain and path
  if (parsed.rawUrl) {
    try {
      const url = new URL(parsed.rawUrl);
      // Combine hostname with pathname (remove leading slash)
      const pathname = parsed.path.startsWith('/') ? parsed.path.slice(1) : parsed.path;
      return `${url.hostname}/${pathname}`;
    } catch {
      // Fallback to just using the path
      return parsed.path.startsWith('/') ? parsed.path.slice(1) : parsed.path;
    }
  }

  return parsed.path.startsWith('/') ? parsed.path.slice(1) : parsed.path;
}

/**
 * Cache Manager
 *
 * Manages the .libraries/ cache directory.
 */
export class CacheManager {
  private _workspaceRoot: string;
  private _librariesPath: string;

  constructor(workspaceRoot: string) {
    this._workspaceRoot = workspaceRoot;
    this._librariesPath = path.join(workspaceRoot, '.libraries');
  }

  /**
   * Get workspace root path
   */
  get workspaceRoot(): string {
    return this._workspaceRoot;
  }

  /**
   * Get .libraries path
   */
  get librariesPath(): string {
    return this._librariesPath;
  }

  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    await fs.mkdir(this._librariesPath, { recursive: true });
  }

  /**
   * Save content to cache
   */
  async save(cachePath: string, content: string): Promise<CachedFile> {
    const fullPath = this.getFullPath(cachePath);

    // Create parent directories
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write content
    await fs.writeFile(fullPath, content, 'utf-8');

    // Calculate integrity
    const integrity = calculateIntegrity(content);

    return {
      path: cachePath,
      fullPath,
      integrity,
    };
  }

  /**
   * Read content from cache
   */
  async read(cachePath: string): Promise<string> {
    const fullPath = this.getFullPath(cachePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Check if file exists in cache
   */
  async exists(cachePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(cachePath);
    try {
      await fs.stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file from cache
   */
  async delete(cachePath: string): Promise<void> {
    const fullPath = this.getFullPath(cachePath);

    try {
      await fs.unlink(fullPath);
    } catch (error: unknown) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      return;
    }

    // Clean up empty parent directories
    await this.cleanEmptyDirs(path.dirname(fullPath));
  }

  /**
   * List all cached files
   */
  async list(): Promise<string[]> {
    const files: string[] = [];

    try {
      await this.walkDir(this._librariesPath, files);
    } catch (error: unknown) {
      // Return empty if .libraries doesn't exist
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    return files;
  }

  /**
   * Remove all cached files
   */
  async clean(): Promise<number> {
    const files = await this.list();

    for (const file of files) {
      const fullPath = this.getFullPath(file);
      await fs.unlink(fullPath);
    }

    // Clean up all empty directories
    try {
      await this.cleanAllEmptyDirs(this._librariesPath);
    } catch {
      // Ignore errors during cleanup
    }

    return files.length;
  }

  /**
   * Verify integrity of cached file
   */
  async verifyIntegrity(cachePath: string, integrity: string): Promise<boolean> {
    try {
      const content = await this.read(cachePath);
      return verifyIntegrity(content, integrity);
    } catch {
      return false;
    }
  }

  /**
   * Get full filesystem path from cache path
   */
  getFullPath(cachePath: string): string {
    return path.join(this._librariesPath, cachePath);
  }

  /**
   * Get cache path from full filesystem path
   */
  getCachePath(fullPath: string): string | null {
    if (!fullPath.startsWith(this._librariesPath)) {
      return null;
    }

    const relativePath = path.relative(this._librariesPath, fullPath);

    // Make sure it's not outside (no .. components)
    if (relativePath.startsWith('..')) {
      return null;
    }

    return relativePath;
  }

  /**
   * Walk directory recursively to collect files
   */
  private async walkDir(dir: string, files: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.walkDir(fullPath, files);
      } else if (entry.isFile()) {
        const cachePath = this.getCachePath(fullPath);
        if (cachePath) {
          files.push(cachePath);
        }
      }
    }
  }

  /**
   * Clean up empty directories from a path up to .libraries
   */
  private async cleanEmptyDirs(dir: string): Promise<void> {
    // Don't go above .libraries
    if (dir === this._librariesPath || !dir.startsWith(this._librariesPath)) {
      return;
    }

    try {
      const entries = await fs.readdir(dir);
      if (entries.length === 0) {
        await fs.rmdir(dir);
        // Recurse to parent
        await this.cleanEmptyDirs(path.dirname(dir));
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clean all empty directories under .libraries
   */
  private async cleanAllEmptyDirs(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(dir, entry.name);
          await this.cleanAllEmptyDirs(subDir);

          // Try to remove if empty
          try {
            const subEntries = await fs.readdir(subDir);
            if (subEntries.length === 0) {
              await fs.rmdir(subDir);
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
}
