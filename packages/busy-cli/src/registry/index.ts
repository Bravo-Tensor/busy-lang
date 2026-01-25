/**
 * Package Registry for package.busy.md
 *
 * Parses and manages the package registry file.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';

/**
 * Package entry in the registry
 */
export interface PackageEntry {
  id: string;
  description: string;
  source: string;
  provider: string;
  cached: string;
  version: string;
  fetched: string;
  integrity?: string;
  category: string;
}

/**
 * Registry metadata from frontmatter
 */
export interface RegistryMetadata {
  name: string;
  type: string;
  description: string;
}

/**
 * Parsed package registry
 */
export interface ParsedRegistry {
  metadata: RegistryMetadata;
  packages: PackageEntry[];
}

/**
 * Derive entry ID from URL
 *
 * If URL has #anchor, use anchor as ID
 * Else, use filename without extension
 * Slugify result (lowercase, hyphens)
 */
export function deriveEntryId(url: string): string {
  // Check for anchor
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const anchor = url.slice(hashIndex + 1);
    return slugify(anchor);
  }

  // Use filename without extension
  const urlPath = url.split('?')[0]; // Remove query params
  const filename = path.basename(urlPath);
  const nameWithoutExt = filename.replace(/\.busy\.md$/, '').replace(/\.md$/, '');
  return slugify(nameWithoutExt);
}

/**
 * Derive category from URL path
 */
export function deriveCategory(url: string): string {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('/core/')) {
    return 'Core Library';
  }
  if (lowerUrl.includes('/tools/')) {
    return 'Tools';
  }
  if (lowerUrl.includes('/concepts/')) {
    return 'Concepts';
  }

  return 'Packages';
}

/**
 * Slugify a string (lowercase, replace spaces with hyphens)
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse a field/value table
 */
function parseFieldTable(content: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Match table rows: | Field | Value |
  const rowPattern = /\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/g;
  let match;

  while ((match = rowPattern.exec(content)) !== null) {
    const field = match[1].trim();
    const value = match[2].trim();

    // Skip header row
    if (field === 'Field' || field.startsWith('-')) {
      continue;
    }

    fields[field] = value;
  }

  return fields;
}

/**
 * Parse package.busy.md content
 */
export function parsePackageRegistry(content: string): ParsedRegistry {
  // Extract only first frontmatter block to avoid "multiple documents" error
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let frontmatter: Record<string, any> = {};
  let body = content;
  if (frontmatterMatch) {
    const { data } = matter(frontmatterMatch[0]);
    frontmatter = data;
    body = content.slice(frontmatterMatch[0].length);
  }

  const metadata: RegistryMetadata = {
    name: frontmatter.Name || frontmatter.name || 'package',
    type: frontmatter.Type || frontmatter.type || 'Document',
    description: frontmatter.Description || frontmatter.description || '',
  };

  const packages: PackageEntry[] = [];

  // Find Dependencies section (or legacy Package Registry section)
  const registryMatch = body.match(/# (?:Dependencies|Package Registry)\n([\s\S]*?)(?=\n# |$)/);
  if (!registryMatch) {
    return { metadata, packages };
  }

  const registryContent = registryMatch[1];

  // Parse entries directly under Dependencies (H2 headers) or in categories (H3 headers)
  // Try H2 entries first (new format: ### package-name under # Dependencies)
  const h2EntryPattern = /## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g;
  let h2Match;

  while ((h2Match = h2EntryPattern.exec(registryContent)) !== null) {
    const entryId = h2Match[1].trim();
    const entryContent = h2Match[2];

    // Check if this is a category with H3 entries or a direct package entry
    if (entryContent.includes('### ')) {
      // This is a category, parse H3 entries
      const category = entryId;
      const entryPattern = /### ([^\n]+)\n([\s\S]*?)(?=\n### |$)/g;
      let entryMatch;

      while ((entryMatch = entryPattern.exec(entryContent)) !== null) {
        const pkgId = entryMatch[1].trim();
        const pkgContent = entryMatch[2];

        const descMatch = pkgContent.match(/^([\s\S]*?)(?=\n\|)/);
        const description = descMatch ? descMatch[1].trim() : '';

        const fields = parseFieldTable(pkgContent);

        if (fields['Source']) {
          packages.push({
            id: pkgId,
            description,
            source: fields['Source'],
            provider: fields['Provider'] || 'url',
            cached: fields['Cached'] || '',
            version: fields['Version'] || '',
            fetched: fields['Fetched'] || '',
            integrity: fields['Integrity'] || undefined,
            category,
          });
        }
      }
    } else {
      // This is a direct package entry (no category)
      const descMatch = entryContent.match(/^([\s\S]*?)(?=\n\|)/);
      const description = descMatch ? descMatch[1].trim() : '';

      const fields = parseFieldTable(entryContent);

      if (fields['Source']) {
        packages.push({
          id: entryId,
          description,
          source: fields['Source'],
          provider: fields['Provider'] || 'url',
          cached: fields['Cached'] || '',
          version: fields['Version'] || '',
          fetched: fields['Fetched'] || '',
          integrity: fields['Integrity'] || undefined,
          category: 'Packages',
        });
      }
    }
  }

  return { metadata, packages };
}

/**
 * Generate package.busy.md content
 */
function generateRegistryContent(
  metadata: RegistryMetadata,
  packages: PackageEntry[]
): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`Name: ${metadata.name}`);
  lines.push(`Type: ${metadata.type}`);
  lines.push(`Description: ${metadata.description}`);
  lines.push('---');
  lines.push('');

  // Imports section
  lines.push('# [Imports]');
  lines.push('');

  // Package Contents section
  lines.push('# Package Contents');
  lines.push('');
  lines.push('No local documents yet.');
  lines.push('');

  // Dependencies section
  lines.push('# Dependencies');
  lines.push('');

  if (packages.length === 0) {
    lines.push('No dependencies installed.');
    lines.push('');
    return lines.join('\n');
  }

  // Group packages by category
  const categories = new Map<string, PackageEntry[]>();

  for (const pkg of packages) {
    if (!categories.has(pkg.category)) {
      categories.set(pkg.category, []);
    }
    categories.get(pkg.category)!.push(pkg);
  }

  // Render each category
  for (const [category, pkgs] of categories) {
    lines.push(`## ${category}`);
    lines.push('');

    for (const pkg of pkgs) {
      lines.push(`### ${pkg.id}`);
      lines.push('');
      if (pkg.description) {
        lines.push(pkg.description);
        lines.push('');
      }
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push(`| Source | ${pkg.source} |`);
      lines.push(`| Provider | ${pkg.provider} |`);
      lines.push(`| Cached | ${pkg.cached} |`);
      lines.push(`| Version | ${pkg.version} |`);
      lines.push(`| Fetched | ${pkg.fetched} |`);
      if (pkg.integrity) {
        lines.push(`| Integrity | ${pkg.integrity} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

const DEFAULT_REGISTRY_CONTENT = `---
Name: workspace
Type: [Package]
Description: BUSY workspace package manifest
---

# [Imports]

# Package Contents

No local documents yet.

# Dependencies

No dependencies installed.
`;

/**
 * Package Registry Manager
 *
 * Manages the package.busy.md file in a workspace.
 */
export class PackageRegistry {
  private workspaceRoot: string;
  private registryPath: string;
  private metadata: RegistryMetadata;
  private packages: Map<string, PackageEntry>;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.registryPath = path.join(workspaceRoot, 'package.busy.md');
    this.metadata = {
      name: 'workspace',
      type: '[Package]',
      description: 'BUSY workspace package manifest',
    };
    this.packages = new Map();
  }

  /**
   * Initialize a new package.busy.md if it doesn't exist
   */
  async init(): Promise<void> {
    const exists = await fs.stat(this.registryPath).then(() => true).catch(() => false);
    if (!exists) {
      await fs.writeFile(this.registryPath, DEFAULT_REGISTRY_CONTENT, 'utf-8');
    }
  }

  /**
   * Load existing package.busy.md
   */
  async load(): Promise<void> {
    const content = await fs.readFile(this.registryPath, 'utf-8');
    const parsed = parsePackageRegistry(content);

    this.metadata = parsed.metadata;
    this.packages = new Map(parsed.packages.map(p => [p.id, p]));
  }

  /**
   * Save changes to package.busy.md
   */
  async save(): Promise<void> {
    const content = generateRegistryContent(
      this.metadata,
      Array.from(this.packages.values())
    );
    await fs.writeFile(this.registryPath, content, 'utf-8');
  }

  /**
   * Get all packages
   */
  getPackages(): PackageEntry[] {
    return Array.from(this.packages.values());
  }

  /**
   * Get package by ID
   */
  getPackage(id: string): PackageEntry | undefined {
    return this.packages.get(id);
  }

  /**
   * Add or update a package
   */
  addPackage(entry: PackageEntry): void {
    this.packages.set(entry.id, entry);
  }

  /**
   * Remove a package by ID
   */
  removePackage(id: string): boolean {
    return this.packages.delete(id);
  }

  /**
   * Get packages by category
   */
  getPackagesByCategory(category: string): PackageEntry[] {
    return Array.from(this.packages.values()).filter(p => p.category === category);
  }

  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const pkg of this.packages.values()) {
      categories.add(pkg.category);
    }
    return Array.from(categories);
  }
}
