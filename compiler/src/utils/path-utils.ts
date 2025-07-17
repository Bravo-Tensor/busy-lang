/**
 * Path utilities for BUSY compiler
 * Handles file path operations, namespace validation, and directory structure
 */

import * as path from 'path';
import { glob } from 'glob';

/**
 * BUSY namespace structure validation
 * Expected: org/layer/team/(roles|playbooks|documents)/file.busy
 */
export interface NamespaceInfo {
  org: string;
  layer: 'L0' | 'L1' | 'L2';
  team: string;
  category: 'roles' | 'playbooks' | 'documents' | 'team';
  filename: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Parse BUSY file path and extract namespace information
 */
export function parseNamespace(filePath: string): NamespaceInfo {
  const normalized = path.normalize(filePath);
  const parts = normalized.split(path.sep);
  const errors: string[] = [];
  
  // Find the start of the namespace (look for L0, L1, or L2)
  const layerIndex = parts.findIndex(part => /^L[012]$/.test(part));
  
  if (layerIndex === -1) {
    errors.push('No valid layer (L0, L1, L2) found in path');
    return {
      org: '',
      layer: 'L0',
      team: '',
      category: 'team',
      filename: path.basename(filePath),
      isValid: false,
      errors
    };
  }
  
  const layer = parts[layerIndex] as 'L0' | 'L1' | 'L2';
  const org = layerIndex > 0 ? parts[layerIndex - 1] : '';
  
  if (layerIndex + 1 >= parts.length) {
    errors.push('Missing team directory after layer');
  }
  
  const team = layerIndex + 1 < parts.length ? parts[layerIndex + 1] : '';
  
  // Determine category (roles, playbooks, documents, or team file)
  let category: 'roles' | 'playbooks' | 'documents' | 'team' = 'team';
  const filename = path.basename(filePath, '.busy');
  
  if (layerIndex + 2 < parts.length) {
    const categoryPart = parts[layerIndex + 2];
    if (categoryPart === 'roles' || categoryPart === 'playbooks' || categoryPart === 'documents') {
      category = categoryPart;
    } else if (filename === 'team') {
      category = 'team';
    } else {
      errors.push(`Invalid category '${categoryPart}'. Expected 'roles', 'playbooks', 'documents', or team.busy file`);
    }
  } else if (filename === 'team') {
    category = 'team';
  }
  
  // Validate filename patterns
  if (category === 'roles' || category === 'playbooks' || category === 'documents') {
    if (!/^[a-z][a-z0-9-_]*$/.test(filename)) {
      errors.push(`Invalid filename '${filename}'. Must be lowercase with dashes/underscores only`);
    }
  }
  
  return {
    org,
    layer,
    team,
    category,
    filename,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Discover all .busy files in a directory
 */
export async function discoverBusyFiles(rootPath: string, ignorePatterns: string[] = []): Promise<string[]> {
  const patterns = [
    '**/*.busy'
  ];
  
  const options = {
    cwd: rootPath,
    absolute: true,
    ignore: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      ...ignorePatterns
    ]
  };
  
  const files = await glob(patterns, options);
  return files.sort();
}

/**
 * Group files by namespace structure
 */
export interface FileGroup {
  org: string;
  layer: 'L0' | 'L1' | 'L2';
  team: string;
  teamFile?: string;
  roles: string[];
  playbooks: string[];
  invalidFiles: Array<{ file: string; errors: string[] }>;
}

export function groupFilesByNamespace(files: string[]): FileGroup[] {
  const groups = new Map<string, FileGroup>();
  
  for (const file of files) {
    const namespace = parseNamespace(file);
    
    if (!namespace.isValid) {
      // Handle invalid files separately
      const key = `invalid-${path.dirname(file)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          org: 'invalid',
          layer: 'L0',
          team: 'invalid',
          roles: [],
          playbooks: [],
          invalidFiles: []
        });
      }
      groups.get(key)!.invalidFiles.push({ file, errors: namespace.errors });
      continue;
    }
    
    const key = `${namespace.org}/${namespace.layer}/${namespace.team}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        org: namespace.org,
        layer: namespace.layer,
        team: namespace.team,
        roles: [],
        playbooks: [],
        invalidFiles: []
      });
    }
    
    const group = groups.get(key)!;
    
    switch (namespace.category) {
      case 'team':
        group.teamFile = file;
        break;
      case 'roles':
        group.roles.push(file);
        break;
      case 'playbooks':
        group.playbooks.push(file);
        break;
    }
  }
  
  return Array.from(groups.values());
}

/**
 * Validate directory structure compliance
 */
export interface StructureValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function validateDirectoryStructure(groups: FileGroup[]): StructureValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  for (const group of groups) {
    if (group.org === 'invalid') {
      errors.push(...group.invalidFiles.flatMap(f => f.errors));
      continue;
    }
    
    const groupPath = `${group.org}/${group.layer}/${group.team}`;
    
    // Check for team file
    if (!group.teamFile) {
      warnings.push(`Missing team.busy file for ${groupPath}`);
      recommendations.push(`Create ${groupPath}/team.busy to document team charter and context`);
    }
    
    // Check for empty teams
    if (group.roles.length === 0 && group.playbooks.length === 0) {
      warnings.push(`Team ${groupPath} has no roles or playbooks defined`);
    }
    
    // Check for roles without playbooks
    if (group.roles.length > 0 && group.playbooks.length === 0) {
      recommendations.push(`Team ${groupPath} has roles but no playbooks - consider adding process workflows`);
    }
    
    // Check for playbooks without roles
    if (group.playbooks.length > 0 && group.roles.length === 0) {
      warnings.push(`Team ${groupPath} has playbooks but no roles - who will execute the processes?`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Convert relative path to absolute path
 */
export function resolveAbsolutePath(inputPath: string): string {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

/**
 * Get relative path from base directory
 */
export function getRelativePath(filePath: string, basePath: string): string {
  return path.relative(basePath, filePath);
}

/**
 * Check if path exists and is accessible
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create directory if it doesn't exist
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  const fs = await import('fs/promises');
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as { code?: string }).code !== 'EEXIST') {
      throw error;
    }
  }
}