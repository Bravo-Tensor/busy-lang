#!/usr/bin/env node

import { Command } from 'commander';
import { loadRepo } from '../loader.js';
import { buildContext, writeContext } from '../builders/context.js';
import { writeFile } from 'fs/promises';

const program = new Command();

program
  .name('busyctx')
  .description('Busy Parser & Context Builder CLI')
  .version('0.1.0');

// Load command
program
  .command('load')
  .description('Load and validate a Busy workspace')
  .argument('<globs...>', 'Glob patterns for markdown files')
  .option('--dump <file>', 'Dump the repo to a JSON file')
  .action(async (globs: string[], options) => {
    try {
      console.log(`Loading workspace from: ${globs.join(', ')}`);

      const repo = await loadRepo(globs);

      console.log(`✓ Loaded ${repo.docs.length} documents`);
      console.log(`✓ Found ${Object.keys(repo.localdefs).length} local definitions`);
      console.log(`✓ Found ${Object.keys(repo.operations).length} operations`);
      console.log(`✓ Found ${repo.imports.length} imports`);
      console.log(`✓ Created ${repo.edges.length} edges`);

      if (options.dump) {
        await writeFile(options.dump, JSON.stringify(repo, null, 2), 'utf-8');
        console.log(`✓ Dumped repo to ${options.dump}`);
      }
    } catch (err) {
      console.error('Error loading workspace:', err);
      process.exit(1);
    }
  });

// Context command
program
  .command('context')
  .description('Build execution context for an operation (or all operations if no ref provided)')
  .argument('[opRef]', 'Operation reference (e.g., "Operation#deploy-app"). If omitted, generates context for all operations.')
  .option('-g, --glob <patterns...>', 'Glob patterns for markdown files', ['**/*.md'])
  .option('-o, --output <file>', 'Output file for context JSON')
  .option('--maxDefChars <number>', 'Maximum characters per definition', parseInt)
  .option('--includeChildren', 'Include edges from child sections')
  .action(async (opRef: string | undefined, options) => {
    try {
      const repo = await loadRepo(options.glob);

      // If no opRef provided, generate context for all operations
      if (!opRef) {
        console.log(`Building context for all ${Object.keys(repo.operations).length} operations`);

        const allContexts: Record<string, unknown> = {};

        for (const [id, operation] of Object.entries(repo.operations)) {
          try {
            const context = buildContext(repo, id, {
              maxDefChars: options.maxDefChars,
              includeChildren: options.includeChildren,
            });

            allContexts[id] = context;
            console.log(`✓ ${operation.name} (${context.defs.length} defs, ${context.calls.length} calls)`);
          } catch (err) {
            console.error(`✗ Failed to build context for ${id}: ${err}`);
          }
        }

        if (options.output) {
          await writeFile(options.output, JSON.stringify(allContexts, null, 2), 'utf-8');
          console.log(`\n✓ All contexts written to ${options.output}`);
        } else {
          console.log(JSON.stringify(allContexts, null, 2));
        }
      } else {
        // Single operation context
        console.log(`Building context for operation: ${opRef}`);

        const context = buildContext(repo, opRef, {
          maxDefChars: options.maxDefChars,
          includeChildren: options.includeChildren,
        });

        console.log(`✓ Operation: ${context.operation.title}`);
        console.log(`✓ Included ${context.defs.length} definitions`);
        console.log(`✓ Found ${context.calls.length} callable operations`);

        if (options.output) {
          await writeContext(options.output, context);
          console.log(`✓ Context written to ${options.output}`);
        } else {
          console.log(JSON.stringify(context, null, 2));
        }
      }
    } catch (err) {
      console.error('Error building context:', err);
      process.exit(1);
    }
  });

// Graph command
program
  .command('graph')
  .description('Export graph in DOT format')
  .option('-g, --glob <patterns...>', 'Glob patterns for markdown files', ['**/*.md'])
  .option('--format <format>', 'Output format', 'dot')
  .action(async (options) => {
    try {
      const repo = await loadRepo(options.glob);

      if (options.format === 'dot') {
        console.log('digraph BusyRepo {');
        console.log('  rankdir=LR;');
        console.log('  node [shape=box];');
        console.log('');

        // Nodes
        for (const doc of repo.docs) {
          console.log(`  "${doc.id}" [label="${doc.name}\\n(${doc.kind})"];`);
        }

        for (const [id, localdef] of Object.entries(repo.localdefs)) {
          console.log(`  "${id}" [label="${localdef.name}\\n(localdef)" shape=ellipse];`);
        }

        console.log('');

        // Edges
        for (const edge of repo.edges) {
          const color =
            edge.role === 'calls'
              ? 'blue'
              : edge.role === 'extends'
              ? 'green'
              : edge.role === 'imports'
              ? 'orange'
              : 'gray';

          console.log(
            `  "${edge.from}" -> "${edge.to}" [label="${edge.role}" color="${color}"];`
          );
        }

        console.log('}');
      }
    } catch (err) {
      console.error('Error generating graph:', err);
      process.exit(1);
    }
  });

program.parse();
