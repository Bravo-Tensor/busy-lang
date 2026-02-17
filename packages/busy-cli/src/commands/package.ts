/**
 * Package Management Commands
 *
 * Implementation of busy init, check, and package commands.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { CacheManager, calculateIntegrity, deriveCachePath } from '../cache/index.js';
import { PackageRegistry, PackageEntry, deriveEntryId, deriveCategory } from '../registry/index.js';
import { providerRegistry } from '../providers/index.js';
import { isPackageManifestUrl, fetchPackageFromManifest, fetchPackageFromLocalFolder } from '../package/manifest.js';

// Ensure providers are registered
import '../providers/local.js';
import '../providers/github.js';
import '../providers/gitlab.js';
import '../providers/url.js';

/**
 * Result of initWorkspace
 */
export interface InitResult {
  workspaceRoot: string;
  initialized: boolean;
  created: string[];
  skipped: string[];
}

/**
 * Result of checkWorkspace
 */
export interface CheckResult {
  workspaceRoot: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  packages: number;
}

/**
 * Result of addPackage
 */
export interface AddResult {
  id: string;
  source: string;
  provider: string;
  cached: string;
  version: string;
  integrity: string;
}

/**
 * Result of removePackage
 */
export interface RemoveResult {
  id: string;
  removed: boolean;
}

/**
 * Result of listPackages
 */
export interface ListResult {
  packages: PackageEntry[];
}

/**
 * Result of upgradePackage
 */
export interface UpgradeResult {
  id: string;
  upgraded: boolean;
  oldVersion: string;
  newVersion: string;
}

/**
 * Initialize a BUSY workspace
 */
export async function initWorkspace(workspaceRoot: string): Promise<InitResult> {
  const created: string[] = [];
  const skipped: string[] = [];

  // Initialize package registry
  const registry = new PackageRegistry(workspaceRoot);
  const packagePath = path.join(workspaceRoot, 'package.busy.md');

  const packageExists = await fs.stat(packagePath).then(() => true).catch(() => false);
  if (packageExists) {
    skipped.push('package.busy.md');
  } else {
    await registry.init();
    created.push('package.busy.md');
  }

  // Initialize cache manager
  const cache = new CacheManager(workspaceRoot);
  const librariesPath = path.join(workspaceRoot, '.libraries');

  const librariesExists = await fs.stat(librariesPath).then(() => true).catch(() => false);
  if (librariesExists) {
    skipped.push('.libraries');
  } else {
    await cache.init();
    created.push('.libraries');
  }

  return {
    workspaceRoot,
    initialized: true,
    created,
    skipped,
  };
}

/**
 * Check workspace coherence
 */
export async function checkWorkspace(workspaceRoot: string, options?: { skipExternal?: boolean }): Promise<CheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Load registry
  const registry = new PackageRegistry(workspaceRoot);
  try {
    await registry.load();
  } catch (error) {
    throw new Error(`Workspace not initialized: ${error instanceof Error ? error.message : error}`);
  }

  const cache = new CacheManager(workspaceRoot);
  const packages = registry.getPackages();

  // Check each package
  for (const pkg of packages) {
    // Check if cached file exists
    const cachePath = pkg.cached.startsWith('.libraries/')
      ? pkg.cached.slice('.libraries/'.length)
      : pkg.cached;

    const fullPath = path.join(workspaceRoot, pkg.cached);
    const exists = await fs.stat(fullPath).then(() => true).catch(() => false);

    if (!exists) {
      errors.push(`Package "${pkg.id}": cached file not found at ${pkg.cached}`);
      continue;
    }

    // Check integrity if specified
    if (pkg.integrity) {
      const isValid = await cache.verifyIntegrity(cachePath, pkg.integrity);
      if (!isValid) {
        warnings.push(`Package "${pkg.id}": integrity mismatch`);
      }
    }
  }

  return {
    workspaceRoot,
    valid: errors.length === 0,
    errors,
    warnings,
    packages: packages.length,
  };
}

/**
 * Add a package from URL or local folder
 *
 * If the URL points to a package.busy.md manifest, fetches the entire package.
 * If it's a local directory with --recursive (or without a manifest), copies all files.
 * Otherwise, fetches a single file.
 */
export async function addPackage(workspaceRoot: string, url: string, options?: { recursive?: boolean }): Promise<AddResult> {
  // Check if this is a local directory that should use folder-based discovery
  if (url.startsWith('./') || url.startsWith('../') || url.startsWith('/') || (!url.includes('://') && !url.startsWith('http'))) {
    const resolvedPath = path.isAbsolute(url) ? url : path.resolve(process.cwd(), url);
    try {
      const stat = await fs.stat(resolvedPath);
      if (stat.isDirectory()) {
        const manifestExists = await fs.stat(path.join(resolvedPath, 'package.busy.md'))
          .then(() => true).catch(() => false);

        if (options?.recursive || !manifestExists) {
          // Use folder-based discovery: --recursive flag or no manifest available
          const result = await fetchPackageFromLocalFolder(workspaceRoot, resolvedPath);
          return {
            id: result.name,
            source: resolvedPath,
            provider: 'local',
            cached: result.cached,
            version: result.version,
            integrity: result.integrity,
          };
        }
        // Has manifest and not --recursive: fall through to manifest-based flow
      }
    } catch {
      // Not a directory or doesn't exist - fall through to normal handling
    }
  }

  // Check if this is a package manifest URL
  if (isPackageManifestUrl(url)) {
    // Use manifest-based package installation
    const result = await fetchPackageFromManifest(workspaceRoot, url);

    // Find provider for URL to get provider name and resolve source path
    const provider = providerRegistry.findProvider(url);
    const parsed = provider?.parse(url);

    // Use absolute path for local sources, original URL for remote
    const resolvedSource = provider?.name === 'local' && parsed
      ? parsed.path
      : url;

    return {
      id: result.name,
      source: resolvedSource,
      provider: provider?.name || 'url',
      cached: result.cached,
      version: result.version,
      integrity: result.integrity,
    };
  }

  // Single file installation (existing behavior)
  const provider = providerRegistry.findProvider(url);
  if (!provider) {
    throw new Error(`No provider found for URL: ${url}`);
  }

  // Parse URL
  const parsed = provider.parse(url);

  // Derive entry ID
  const entryId = deriveEntryId(url);

  // Derive cache path
  const cachePath = deriveCachePath(parsed);

  // Fetch content
  const content = await provider.fetch(url);

  // Save to cache
  const cache = new CacheManager(workspaceRoot);
  await cache.init();
  const saved = await cache.save(cachePath, content);

  // Derive category
  const category = deriveCategory(url);

  // Create package entry
  const entry: PackageEntry = {
    id: entryId,
    description: '',
    source: url,
    provider: provider.name,
    cached: `.libraries/${cachePath}`,
    version: parsed.ref || 'latest',
    fetched: new Date().toISOString(),
    integrity: saved.integrity,
    category,
  };

  // Load registry and add package
  const registry = new PackageRegistry(workspaceRoot);
  try {
    await registry.load();
  } catch {
    await registry.init();
    await registry.load();
  }

  registry.addPackage(entry);
  await registry.save();

  return {
    id: entryId,
    source: url,
    provider: provider.name,
    cached: entry.cached,
    version: entry.version,
    integrity: saved.integrity,
  };
}

/**
 * Remove a package
 */
export async function removePackage(workspaceRoot: string, packageId: string): Promise<RemoveResult> {
  // Load registry
  const registry = new PackageRegistry(workspaceRoot);
  await registry.load();

  // Get package info before removing
  const pkg = registry.getPackage(packageId);
  if (!pkg) {
    return { id: packageId, removed: false };
  }

  // Remove from registry
  registry.removePackage(packageId);
  await registry.save();

  // Remove cached file
  const cache = new CacheManager(workspaceRoot);
  const cachePath = pkg.cached.startsWith('.libraries/')
    ? pkg.cached.slice('.libraries/'.length)
    : pkg.cached;

  await cache.delete(cachePath);

  return { id: packageId, removed: true };
}

/**
 * List all packages
 */
export async function listPackages(workspaceRoot: string): Promise<ListResult> {
  // Load registry
  const registry = new PackageRegistry(workspaceRoot);
  await registry.load();

  const packages = registry.getPackages();

  return { packages };
}

/**
 * Get package info
 */
export async function getPackageInfo(workspaceRoot: string, packageId: string): Promise<PackageEntry | null> {
  // Load registry
  const registry = new PackageRegistry(workspaceRoot);
  await registry.load();

  return registry.getPackage(packageId) || null;
}

/**
 * Upgrade a package to latest version
 */
export async function upgradePackage(workspaceRoot: string, packageId: string): Promise<UpgradeResult> {
  // Load registry
  const registry = new PackageRegistry(workspaceRoot);
  await registry.load();

  // Get current package
  const pkg = registry.getPackage(packageId);
  if (!pkg) {
    throw new Error(`Package not found: ${packageId}`);
  }

  // Find provider
  const provider = providerRegistry.findProvider(pkg.source);
  if (!provider) {
    throw new Error(`No provider found for package source: ${pkg.source}`);
  }

  // Parse current URL
  const parsed = provider.parse(pkg.source);

  // Get latest version
  let latestVersion: string;
  try {
    if (provider.getLatestVersion) {
      latestVersion = await provider.getLatestVersion(parsed);
    } else {
      throw new Error('Provider does not support version resolution');
    }
  } catch (error) {
    throw new Error(`Failed to get latest version: ${error instanceof Error ? error.message : error}`);
  }

  const oldVersion = pkg.version;

  // Check if already at latest
  if (latestVersion === oldVersion) {
    return {
      id: packageId,
      upgraded: false,
      oldVersion,
      newVersion: latestVersion,
    };
  }

  // Build new URL with latest version
  const newUrl = pkg.source.replace(oldVersion, latestVersion);

  // Fetch new content
  const content = await provider.fetch(newUrl);

  // Save to cache
  const cache = new CacheManager(workspaceRoot);
  const cachePath = pkg.cached.startsWith('.libraries/')
    ? pkg.cached.slice('.libraries/'.length)
    : pkg.cached;

  const saved = await cache.save(cachePath, content);

  // Update package entry
  const updatedEntry: PackageEntry = {
    ...pkg,
    source: newUrl,
    version: latestVersion,
    fetched: new Date().toISOString(),
    integrity: saved.integrity,
  };

  registry.addPackage(updatedEntry);
  await registry.save();

  return {
    id: packageId,
    upgraded: true,
    oldVersion,
    newVersion: latestVersion,
  };
}
