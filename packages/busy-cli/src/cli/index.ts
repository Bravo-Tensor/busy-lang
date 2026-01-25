#!/usr/bin/env node

import { Command } from 'commander';
import { parseDocument, resolveImports } from '../parser.js';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  initWorkspace,
  checkWorkspace,
  addPackage,
  removePackage,
  upgradePackage,
  listPackages,
  getPackageInfo,
} from '../commands/package.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(await readFile(resolve(__dirname, '../../package.json'), 'utf-8'));

const program = new Command();

program
  .name('busy')
  .description('BUSY Document Parser CLI')
  .version(packageJson.version);

// Parse command - parse a single BUSY document
program
  .command('parse')
  .description('Parse a BUSY document and output its structure as JSON')
  .argument('<file>', 'Path to the BUSY markdown file')
  .option('-o, --output <file>', 'Output file for parsed JSON')
  .option('--pretty', 'Pretty-print JSON output', true)
  .option('--no-pretty', 'Compact JSON output')
  .action(async (file: string, options) => {
    try {
      const filePath = resolve(file);

      if (!existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }

      const content = await readFile(filePath, 'utf-8');
      const doc = parseDocument(content);

      const output = options.pretty
        ? JSON.stringify(doc, null, 2)
        : JSON.stringify(doc);

      if (options.output) {
        await writeFile(options.output, output, 'utf-8');
        console.log(`✓ Parsed ${basename(file)}`);
        console.log(`  Type: ${doc.metadata.type}`);
        console.log(`  Imports: ${doc.imports.length}`);
        console.log(`  Definitions: ${doc.definitions.length}`);
        console.log(`  Operations: ${doc.operations.length}`);
        console.log(`  Triggers: ${doc.triggers.length}`);
        if ('tools' in doc) {
          console.log(`  Tools: ${doc.tools.length}`);
        }
        console.log(`✓ Written to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (err) {
      console.error('Error parsing document:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Validate command - validate a BUSY document
program
  .command('validate')
  .description('Validate a BUSY document (check frontmatter, structure, imports)')
  .argument('<file>', 'Path to the BUSY markdown file')
  .option('--resolve-imports', 'Also validate that imports can be resolved')
  .action(async (file: string, options) => {
    try {
      const filePath = resolve(file);

      if (!existsSync(filePath)) {
        console.error(`✗ File not found: ${filePath}`);
        process.exit(1);
      }

      const content = await readFile(filePath, 'utf-8');

      // Parse document (this validates frontmatter and structure)
      const doc = parseDocument(content);

      console.log(`✓ Valid BUSY document: ${doc.metadata.name}`);
      console.log(`  Type: ${doc.metadata.type}`);
      console.log(`  Description: ${doc.metadata.description.slice(0, 60)}${doc.metadata.description.length > 60 ? '...' : ''}`);

      // Check for common issues
      const warnings: string[] = [];
      const errors: string[] = [];

      // Check if operations have steps
      for (const op of doc.operations) {
        if (op.steps.length === 0) {
          warnings.push(`Operation "${op.name}" has no steps`);
        }
      }

      // Check for empty imports
      if (doc.imports.length === 0 && doc.operations.length > 0) {
        warnings.push('Document has operations but no imports');
      }

      // Validate imports if requested
      if (options.resolveImports) {
        console.log('\nResolving imports...');
        try {
          const resolved = resolveImports(doc, filePath);
          console.log(`✓ Resolved ${Object.keys(resolved).length} imports`);

          for (const [name, resolvedDoc] of Object.entries(resolved)) {
            console.log(`  - ${name}: ${resolvedDoc.metadata.name} (${resolvedDoc.metadata.type})`);
          }
        } catch (err) {
          errors.push(`Import resolution failed: ${err instanceof Error ? err.message : err}`);
        }
      }

      // Print warnings and errors
      if (warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of warnings) {
          console.log(`  ⚠ ${warning}`);
        }
      }

      if (errors.length > 0) {
        console.log('\nErrors:');
        for (const error of errors) {
          console.log(`  ✗ ${error}`);
        }
        process.exit(1);
      }

      console.log('\n✓ Validation passed');
    } catch (err) {
      console.error(`✗ Validation failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// Resolve command - resolve imports in a document
program
  .command('resolve')
  .description('Resolve all imports in a BUSY document recursively')
  .argument('<file>', 'Path to the BUSY markdown file')
  .option('-o, --output <file>', 'Output file for resolved imports JSON')
  .option('--flat', 'Output flat list of resolved documents')
  .action(async (file: string, options) => {
    try {
      const filePath = resolve(file);

      if (!existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }

      const content = await readFile(filePath, 'utf-8');
      const doc = parseDocument(content);

      console.log(`Resolving imports for: ${doc.metadata.name}`);

      const resolved = resolveImports(doc, filePath);
      const count = Object.keys(resolved).length;

      console.log(`✓ Resolved ${count} imports`);

      let output: string;
      if (options.flat) {
        // Flat list of document names and their metadata
        const flat = Object.entries(resolved).map(([name, resolvedDoc]) => ({
          conceptName: name,
          name: resolvedDoc.metadata.name,
          type: resolvedDoc.metadata.type,
          operations: resolvedDoc.operations.map(op => op.name),
        }));
        output = JSON.stringify(flat, null, 2);
      } else {
        // Full resolved documents
        output = JSON.stringify(resolved, null, 2);
      }

      if (options.output) {
        await writeFile(options.output, output, 'utf-8');
        console.log(`✓ Written to ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (err) {
      console.error('Error resolving imports:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Info command - quick document info
program
  .command('info')
  .description('Show quick information about a BUSY document')
  .argument('<file>', 'Path to the BUSY markdown file')
  .action(async (file: string) => {
    try {
      const filePath = resolve(file);

      if (!existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }

      const content = await readFile(filePath, 'utf-8');
      const doc = parseDocument(content);

      console.log(`\n📄 ${doc.metadata.name}`);
      console.log(`${'─'.repeat(40)}`);
      console.log(`Type:        ${doc.metadata.type}`);
      console.log(`Description: ${doc.metadata.description}`);
      if (doc.metadata.provider) {
        console.log(`Provider:    ${doc.metadata.provider}`);
      }
      console.log(`${'─'.repeat(40)}`);
      console.log(`Imports:     ${doc.imports.length}`);
      if (doc.imports.length > 0) {
        for (const imp of doc.imports) {
          console.log(`  - [${imp.conceptName}]: ${imp.path}${imp.anchor ? '#' + imp.anchor : ''}`);
        }
      }
      console.log(`Definitions: ${doc.definitions.length}`);
      if (doc.definitions.length > 0) {
        for (const def of doc.definitions) {
          console.log(`  - ${def.name}`);
        }
      }
      console.log(`Operations:  ${doc.operations.length}`);
      if (doc.operations.length > 0) {
        for (const op of doc.operations) {
          console.log(`  - ${op.name} (${op.steps.length} steps${op.checklist ? `, ${op.checklist.items.length} checklist items` : ''})`);
        }
      }
      console.log(`Triggers:    ${doc.triggers.length}`);
      if (doc.triggers.length > 0) {
        for (const trigger of doc.triggers) {
          if (trigger.triggerType === 'alarm') {
            console.log(`  - ⏰ ${trigger.schedule} → ${trigger.operation}`);
          } else {
            console.log(`  - 📡 ${trigger.eventType}${trigger.filter ? ` (filtered)` : ''} → ${trigger.operation}`);
          }
        }
      }
      if ('tools' in doc && doc.tools.length > 0) {
        console.log(`Tools:       ${doc.tools.length}`);
        for (const tool of doc.tools) {
          const providers = tool.providers ? Object.keys(tool.providers).join(', ') : 'none';
          console.log(`  - ${tool.name} (providers: ${providers})`);
        }
      }
      console.log('');
    } catch (err) {
      console.error('Error reading document:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Init command - initialize a BUSY workspace
program
  .command('init')
  .description('Initialize a new BUSY workspace with package.busy.md')
  .option('-d, --dir <directory>', 'Directory to initialize', '.')
  .action(async (options) => {
    try {
      const workspaceRoot = resolve(options.dir);
      const result = await initWorkspace(workspaceRoot);

      console.log('\nInitializing BUSY workspace...\n');

      if (result.created.length > 0) {
        for (const item of result.created) {
          console.log(`  ✓ Created ${item}`);
        }
      }

      if (result.skipped.length > 0) {
        for (const item of result.skipped) {
          console.log(`  - Skipped ${item} (already exists)`);
        }
      }

      console.log('\n✓ Workspace initialized');
    } catch (err) {
      console.error('Error initializing workspace:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Check command - validate workspace coherence
program
  .command('check')
  .description('Validate workspace coherence (check packages, links, integrity)')
  .option('-d, --dir <directory>', 'Workspace directory', '.')
  .option('--skip-external', 'Skip validation of external URLs')
  .option('-v, --verbose', 'Show all checks, not just errors')
  .action(async (options) => {
    try {
      const workspaceRoot = resolve(options.dir);
      const result = await checkWorkspace(workspaceRoot, {
        skipExternal: options.skipExternal,
      });

      console.log('\nChecking workspace...\n');
      console.log(`  Dependencies: ${result.packages}`);

      if (result.errors.length > 0) {
        console.log('\nErrors:');
        for (const error of result.errors) {
          console.log(`  ✗ ${error}`);
        }
      }

      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of result.warnings) {
          console.log(`  ⚠ ${warning}`);
        }
      }

      if (result.valid) {
        console.log('\n✓ Workspace is coherent');
      } else {
        console.log('\n✗ Workspace has errors');
        process.exit(1);
      }
    } catch (err) {
      console.error('✗ Check failed:', err instanceof Error ? err.message : err);
      process.exit(2);
    }
  });

// Package command group
const packageCmd = program
  .command('package')
  .description('Manage packages in the workspace');

// Package add
packageCmd
  .command('add')
  .description('Add a package from URL')
  .argument('<url>', 'URL to the BUSY document')
  .option('-d, --dir <directory>', 'Workspace directory', '.')
  .action(async (url: string, options) => {
    try {
      const workspaceRoot = resolve(options.dir);

      console.log(`\nAdding package from: ${url}\n`);

      const result = await addPackage(workspaceRoot, url);

      console.log(`  ID:       ${result.id}`);
      console.log(`  Provider: ${result.provider}`);
      console.log(`  Version:  ${result.version}`);
      console.log(`  Cached:   ${result.cached}`);

      console.log(`\n✓ Package added: ${result.id}`);
    } catch (err) {
      console.error('Error adding package:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Package remove
packageCmd
  .command('remove')
  .description('Remove a package')
  .argument('<name>', 'Package ID to remove')
  .option('-d, --dir <directory>', 'Workspace directory', '.')
  .action(async (name: string, options) => {
    try {
      const workspaceRoot = resolve(options.dir);

      console.log(`\nRemoving package: ${name}\n`);

      const result = await removePackage(workspaceRoot, name);

      if (result.removed) {
        console.log('  ✓ Removed from package.busy.md');
        console.log('  ✓ Removed cached file');
        console.log(`\n✓ Package removed: ${name}`);
      } else {
        console.log(`  Package not found: ${name}`);
        process.exit(1);
      }
    } catch (err) {
      console.error('Error removing package:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Package upgrade
packageCmd
  .command('upgrade')
  .description('Upgrade a package to latest version')
  .argument('[name]', 'Package ID to upgrade (omit for all)')
  .option('-d, --dir <directory>', 'Workspace directory', '.')
  .option('--all', 'Upgrade all packages')
  .action(async (name: string | undefined, options) => {
    try {
      const workspaceRoot = resolve(options.dir);

      if (options.all || !name) {
        // Upgrade all packages
        console.log('\nChecking for updates...\n');

        const { packages } = await listPackages(workspaceRoot);
        let upgraded = 0;

        for (const pkg of packages) {
          try {
            const result = await upgradePackage(workspaceRoot, pkg.id);
            if (result.upgraded) {
              console.log(`  ✓ ${pkg.id}: ${result.oldVersion} → ${result.newVersion}`);
              upgraded++;
            } else {
              console.log(`  - ${pkg.id}: ${result.oldVersion} (up to date)`);
            }
          } catch (err) {
            console.log(`  ✗ ${pkg.id}: ${err instanceof Error ? err.message : err}`);
          }
        }

        console.log(`\n✓ Upgraded ${upgraded} package(s)`);
      } else {
        // Upgrade single package
        console.log(`\nUpgrading package: ${name}\n`);

        const result = await upgradePackage(workspaceRoot, name);

        if (result.upgraded) {
          console.log(`  Old version: ${result.oldVersion}`);
          console.log(`  New version: ${result.newVersion}`);
          console.log(`\n✓ Package upgraded: ${name}`);
        } else {
          console.log(`  Already at latest version: ${result.newVersion}`);
        }
      }
    } catch (err) {
      console.error('Error upgrading package:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Package list
packageCmd
  .command('list')
  .description('List installed packages')
  .option('-d, --dir <directory>', 'Workspace directory', '.')
  .action(async (options) => {
    try {
      const workspaceRoot = resolve(options.dir);
      const result = await listPackages(workspaceRoot);

      console.log('\nDependencies:');
      if (result.packages.length === 0) {
        console.log('  (none)');
      } else {
        for (const pkg of result.packages) {
          console.log(`  ${pkg.id.padEnd(20)} ${pkg.version.padEnd(12)} ${pkg.provider.padEnd(10)} ${pkg.cached}`);
        }
      }

      console.log(`\nTotal: ${result.packages.length} dependency(s)`);
    } catch (err) {
      console.error('Error listing packages:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// Package info
packageCmd
  .command('info')
  .description('Show package details')
  .argument('<name>', 'Package ID')
  .option('-d, --dir <directory>', 'Workspace directory', '.')
  .action(async (name: string, options) => {
    try {
      const workspaceRoot = resolve(options.dir);
      const pkg = await getPackageInfo(workspaceRoot, name);

      if (!pkg) {
        console.log(`Package not found: ${name}`);
        process.exit(1);
      }

      console.log(`\nPackage: ${pkg.id}\n`);
      console.log('| Field     | Value |');
      console.log('|-----------|-------|');
      console.log(`| Source    | ${pkg.source} |`);
      console.log(`| Provider  | ${pkg.provider} |`);
      console.log(`| Cached    | ${pkg.cached} |`);
      console.log(`| Version   | ${pkg.version} |`);
      console.log(`| Fetched   | ${pkg.fetched} |`);
      if (pkg.integrity) {
        console.log(`| Integrity | ${pkg.integrity} |`);
      }
      console.log('');
    } catch (err) {
      console.error('Error getting package info:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
