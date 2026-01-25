/**
 * Package Manifest Parser
 *
 * Parses package.busy.md files that define a package's contents.
 * A package manifest lists all documents that are part of the package.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import { CacheManager, calculateIntegrity } from '../cache/index.js';
import { PackageRegistry, PackageEntry } from '../registry/index.js';
import { providerRegistry } from '../providers/index.js';

// Ensure providers are registered
import '../providers/local.js';
import '../providers/github.js';
import '../providers/gitlab.js';
import '../providers/url.js';

/**
 * A document listed in a package manifest
 */
export interface PackageDocument {
  name: string;
  relativePath: string;
  type?: string;
  anchor?: string;
  description?: string;
  category?: string;
}

/**
 * Parsed package manifest
 */
export interface PackageManifest {
  name: string;
  type: string;
  version: string;
  description: string;
  documents: PackageDocument[];
}

/**
 * Result of fetching a package from manifest
 */
export interface FetchPackageResult {
  name: string;
  version: string;
  description: string;
  documents: PackageDocument[];
  cached: string;
  integrity: string;
}

/**
 * Check if a URL/path points to a package.busy.md manifest or a directory containing one
 */
export function isPackageManifestUrl(url: string): boolean {
  // Explicit package.busy.md reference
  if (url.endsWith('/package.busy.md') || url.includes('/package.busy.md#')) {
    return true;
  }
  if (url.endsWith('package.busy.md')) {
    return true;
  }
  // Local path that might be a directory - check if it looks like a local path without extension
  if ((url.startsWith('./') || url.startsWith('../') || url.startsWith('/')) && !url.endsWith('.md') && !url.endsWith('.busy')) {
    return true; // Treat as potential package directory
  }
  return false;
}

/**
 * Parse a Field/Value table and return a record
 */
function parseFieldValueTable(tableContent: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const rowPattern = /\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/g;
  let match;

  while ((match = rowPattern.exec(tableContent)) !== null) {
    const field = match[1].trim();
    const value = match[2].trim();

    // Skip header row and separator
    if (field === 'Field' || field.startsWith('-')) {
      continue;
    }

    fields[field] = value;
  }

  return fields;
}

/**
 * Parse a package manifest (package.busy.md content)
 *
 * Supports two formats:
 * 1. Table-based: H3 headers with Field/Value tables (Path, Type, Description)
 * 2. Link-based: Markdown links like - [Name](./path) - Description
 */
export function parsePackageManifest(content: string): PackageManifest {
  // Extract only first frontmatter block to avoid "multiple documents" error
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let frontmatter: Record<string, any> = {};
  let body = content;
  if (frontmatterMatch) {
    const { data } = matter(frontmatterMatch[0]);
    frontmatter = data;
    body = content.slice(frontmatterMatch[0].length);
  }

  const manifest: PackageManifest = {
    name: frontmatter.Name || frontmatter.name || 'unknown',
    type: frontmatter.Type || frontmatter.type || 'Package',
    version: frontmatter.Version || frontmatter.version || 'latest',
    description: frontmatter.Description || frontmatter.description || '',
    documents: [],
  };

  // Find Package Contents section
  const contentsMatch = body.match(/# Package Contents\n([\s\S]*?)(?=\n# |$)/);
  if (!contentsMatch) {
    return manifest;
  }

  const contentsBody = contentsMatch[1];
  let currentCategory: string | undefined;

  // Parse categories (H2 headers) and entries (H3 headers with tables)
  const categoryPattern = /## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g;
  let categoryMatch;

  while ((categoryMatch = categoryPattern.exec(contentsBody)) !== null) {
    currentCategory = categoryMatch[1].trim();
    const categoryContent = categoryMatch[2];

    // Parse entries (H3 headers with tables)
    const entryPattern = /### ([^\n]+)\n([\s\S]*?)(?=\n### |$)/g;
    let entryMatch;

    while ((entryMatch = entryPattern.exec(categoryContent)) !== null) {
      const name = entryMatch[1].trim();
      const entryContent = entryMatch[2];

      // Check if this entry uses table format (has | Path |)
      if (entryContent.includes('| Path |') || entryContent.includes('| Path |')) {
        const fields = parseFieldValueTable(entryContent);

        if (fields['Path']) {
          let relativePath = fields['Path'];
          let anchor: string | undefined;

          // Extract anchor if present
          const anchorIndex = relativePath.indexOf('#');
          if (anchorIndex !== -1) {
            anchor = relativePath.slice(anchorIndex + 1).toLowerCase();
            relativePath = relativePath.slice(0, anchorIndex);
          }

          manifest.documents.push({
            name,
            relativePath,
            type: fields['Type'],
            description: fields['Description'],
            anchor,
            category: currentCategory,
          });
        }
      }
    }
  }

  // If no table-based entries found, try link-based format
  if (manifest.documents.length === 0) {
    const lines = body.split('\n');
    currentCategory = undefined;

    for (const line of lines) {
      // Check for H2 headers (categories)
      const h2Match = line.match(/^## (.+)$/);
      if (h2Match) {
        currentCategory = h2Match[1].trim();
        continue;
      }

      // Check for markdown links in list items
      // Format: - [Name](./relative/path.md) - Description
      const linkMatch = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*(.+))?$/);
      if (linkMatch) {
        const name = linkMatch[1].trim();
        let relativePath = linkMatch[2].trim();
        const description = linkMatch[3]?.trim();

        // Extract anchor if present
        let anchor: string | undefined;
        const anchorIndex = relativePath.indexOf('#');
        if (anchorIndex !== -1) {
          anchor = relativePath.slice(anchorIndex + 1).toLowerCase();
          relativePath = relativePath.slice(0, anchorIndex);
        }

        manifest.documents.push({
          name,
          relativePath,
          anchor,
          description,
          category: currentCategory,
        });
      }
    }
  }

  return manifest;
}

/**
 * Resolve a relative path from a manifest to an absolute URL
 */
function resolveDocumentUrl(manifestUrl: string, relativePath: string): string {
  // Get the base URL (directory containing the manifest)
  const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/'));

  // Handle ./ prefix
  let cleanPath = relativePath;
  if (cleanPath.startsWith('./')) {
    cleanPath = cleanPath.slice(2);
  }

  return `${baseUrl}/${cleanPath}`;
}

/**
 * Fetch a package from its manifest URL or local path
 */
export async function fetchPackageFromManifest(
  workspaceRoot: string,
  manifestUrl: string
): Promise<FetchPackageResult> {
  // Find provider for the manifest URL
  const provider = providerRegistry.findProvider(manifestUrl);
  if (!provider) {
    throw new Error(`No provider found for URL: ${manifestUrl}`);
  }

  // Parse the manifest URL to get raw URL
  const parsedManifest = provider.parse(manifestUrl);

  // Fetch the manifest content
  const manifestContent = await provider.fetch(manifestUrl);

  // Parse the manifest
  const manifest = parsePackageManifest(manifestContent);

  // Initialize cache
  const cache = new CacheManager(workspaceRoot);
  await cache.init();

  // Calculate the base path/URL for resolving relative paths
  const rawManifestUrl = provider.getRawUrl(parsedManifest);
  const basePath = rawManifestUrl.substring(0, rawManifestUrl.lastIndexOf('/'));
  const isLocal = provider.name === 'local';

  // Fetch all documents listed in the manifest
  const fetchedDocs: string[] = [];
  let combinedContent = '';

  for (const doc of manifest.documents) {
    // Resolve the document path
    let docRelativePath = doc.relativePath;
    if (docRelativePath.startsWith('./')) {
      docRelativePath = docRelativePath.slice(2);
    }

    const docPath = `${basePath}/${docRelativePath}`;

    try {
      let content: string;

      if (isLocal) {
        // Use local file system for local packages
        content = await fs.readFile(docPath, 'utf-8');
      } else {
        // Use fetch for remote packages
        const response = await fetch(docPath);
        if (!response.ok) {
          console.warn(`Warning: Failed to fetch ${docPath}: ${response.status}`);
          continue;
        }
        content = await response.text();
      }

      combinedContent += content;

      // Save to cache under package name
      const cachePath = path.join(manifest.name, docRelativePath);
      await cache.save(cachePath, content);

      fetchedDocs.push(docRelativePath);
    } catch (error) {
      console.warn(`Warning: Failed to fetch ${doc.name}: ${error}`);
    }
  }

  // Save the manifest itself
  const manifestCachePath = path.join(manifest.name, 'package.busy.md');
  await cache.save(manifestCachePath, manifestContent);

  // Calculate integrity hash of all content
  const integrity = calculateIntegrity(combinedContent);

  // Add to local package registry
  const registry = new PackageRegistry(workspaceRoot);
  try {
    await registry.load();
  } catch {
    await registry.init();
    await registry.load();
  }

  // Use absolute path for local sources
  const resolvedSource = isLocal ? parsedManifest.path : manifestUrl;

  const entry: PackageEntry = {
    id: manifest.name,
    description: manifest.description,
    source: resolvedSource,
    provider: provider.name,
    cached: `.libraries/${manifest.name}`,
    version: manifest.version,
    fetched: new Date().toISOString(),
    integrity,
    category: 'Packages',
  };

  registry.addPackage(entry);
  await registry.save();

  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    documents: manifest.documents,
    cached: `.libraries/${manifest.name}`,
    integrity,
  };
}
