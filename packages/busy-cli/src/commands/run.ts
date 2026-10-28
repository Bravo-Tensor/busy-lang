import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { compileRun } from '../runner/program.js';
import { CompilationFailure, generateRun, type CompilationOptions } from '../runner/compiler.js';
import { prepareRun, checkPreparedRun } from '../runner/preparation.js';
import { BusyRunner } from '../runner/store.js';
import type { Values } from '../runner/schema.js';

async function jsonFile(file: string): Promise<unknown> {
  return JSON.parse(file === '-' ? readFileSync(0, 'utf8') : await readFile(file.replace(/^@/, ''), 'utf8'));
}

export function registerRunCommands(program: Command): void {
  const run = program.command('run').description('Compile and run caller-executed BUSY instructions')
    .option('--db <file>', 'SQLite session database', process.env.BUSY_RUNNER_DB || join(homedir(), '.busy', 'runs.sqlite'));
  const execute = async (action: (runner: BusyRunner) => unknown | Promise<unknown>): Promise<void> => {
    let runner: BusyRunner | undefined;
    try {
      runner = await BusyRunner.open(resolve(run.opts<{ db: string }>().db));
      console.log(JSON.stringify(await action(runner), null, 2));
    } catch (error) {
      console.error(error instanceof CompilationFailure ? JSON.stringify(error.toJSON(), null, 2) : error instanceof Error ? error.message : error);
      process.exitCode = 1;
    } finally { runner?.close(); }
  };
  const compilationOptions = (command: Command) => command.option('--entry <operation>', 'Generate IR for this operation; reuse it until source or compiler changes')
    .option('--model <id>', 'OpenRouter structured-output model (default: openai/gpt-6-luna)')
    .option('--key-file <file>', 'OpenRouter credential file (or use OPENROUTER_API_KEY)')
    .option('--cache-dir <directory>', 'Compiled artifacts and draft diagnostics (default: .busy/compiled)')
    .option('--refresh', 'Generate again even when a compiled artifact is cached');
  run.command('prepare').description('Prepare an offline caller instruction cursor or lower an authored constrained draft; no provider')
    .argument('<file>', 'BUSY source file').requiredOption('--entry <operation>', 'Defining operation')
    .option('--draft <file>', 'Authored constrained draft JSON; otherwise use a caller instruction cursor')
    .option('--out <file>', 'Interpretation output; defaults to colocated single-entry or named multi-entry path')
    .action(async (file: string, options: { entry: string; draft?: string; out?: string }) => {
      try {
        if (options.out && !options.out.endsWith('.json')) throw new Error('--out must be a JSON file');
        const result = await prepareRun(file, { entry: options.entry,
          ...(options.draft ? { draft: await jsonFile(options.draft) } : {}),
          ...(options.out ? { interpretationFile: resolve(options.out) } : {}) });
        await writeFile(result.interpretationFile, JSON.stringify(result.interpretation, null, 2) + '\n');
        console.log(JSON.stringify({ interpretationFile: result.interpretationFile, programId: result.id,
          sourceHash: result.sourceHash, interpretationHash: result.interpretationHash,
          meaning: 'Prepared exchanges only; caller owns decisions, nested work and execution.' }, null, 2));
      } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
    });
  run.command('check').description('Validate prepared IR, source coverage and bindings without starting a run')
    .argument('<file>', 'BUSY source file').option('--interpretation <file>', 'Prepared IR; default sibling for a single entry')
    .action(async (file: string, options: { interpretation?: string }) => {
      try {
        const result = await checkPreparedRun(file, options.interpretation);
        console.log(JSON.stringify({ entry: result.entry, programId: result.id, sourceHash: result.sourceHash,
          interpretationHash: result.interpretationHash, coverage: 'passed', bindings: 'passed' }, null, 2));
      } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
    });
  compilationOptions(run.command('compile').description('Generate a constrained draft, check it and cache the compiled program')
    .argument('<file>', 'BUSY source file').option('--out <file>', 'Also write the accepted prepared IR to this JSON file'))
    .action(async (file: string, options: CompilationOptions & { out?: string }) => {
      try {
        if (!options.entry) throw new Error('compile requires --entry OPERATION');
        if (options.out && !options.out.endsWith('.json')) throw new Error('--out must be a JSON file, not a BUSY source');
        const result = await generateRun(file, options);
        if (options.out) {
          await writeFile(resolve(options.out), JSON.stringify(result.program.interpretation, null, 2) + '\n');
        }
        console.log(JSON.stringify({ artifactFile: result.artifactFile, cacheHit: result.cacheHit, programId: result.program.id,
          entry: result.program.entry, inputs: result.program.operations[result.program.entry].inputs,
          outputs: result.program.operations[result.program.entry].outputs, compilation: result.program.compilation }, null, 2));
      } catch (error) {
        console.error(error instanceof CompilationFailure ? JSON.stringify(error.toJSON(), null, 2) : error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });
  compilationOptions(run.command('start').description('Load a BUSY program and return its first context and expected response')
    .argument('<file>', 'BUSY source file')
    .requiredOption('--inputs <file>', 'Starting values as JSON; - reads stdin')
    .option('--interpretation <file>', 'Prepared IR; defaults to the adjacent .runner.json file'))
    .action((file: string, options: Partial<CompilationOptions> & { inputs: string; interpretation?: string }) => execute(async runner => {
      if (options.entry && options.interpretation) throw new Error('Choose --entry or --interpretation');
      const inputs = await jsonFile(options.inputs) as Values;
      const compiled = options.entry ? (await generateRun(file, { ...options, entry: options.entry })).program : await compileRun(file, options.interpretation);
      return runner.start(compiled, inputs);
    }));
  run.command('sense').description('Read the current exchange without advancing').argument('<id>', 'Run ID')
    .action((id: string) => execute(runner => runner.sense(id)));
  run.command('emit').description('Accept a caller reply and return the next exchange')
    .argument('<id>', 'Run ID').argument('<token>', 'Token from the current sense')
    .argument('<reply>', 'JSON, @file, or - for stdin')
    .action((id: string, token: string, reply: string) => execute(async runner =>
      runner.emit(id, token, reply === '-' || reply.startsWith('@') ? await jsonFile(reply) : JSON.parse(reply))));
  run.command('fail').description('Return a reported step failure to the caller without advancing; retain stack and partial effects')
    .argument('<id>', 'Run ID').argument('<token>', 'Token from the current sense')
    .argument('<failure>', 'Failure JSON with reason and optional evidence/partialEffects string arrays; @file or - for stdin')
    .action((id: string, token: string, failure: string) => execute(async runner =>
      runner.fail(id, token, failure === '-' || failure.startsWith('@') ? await jsonFile(failure) : JSON.parse(failure))));
  run.command('resume').description('Explicitly retry the same failed instruction with a fresh token; does not undo partial effects')
    .argument('<id>', 'Run ID').argument('<token>', 'Recovery token from the failed sense')
    .option('--values <file>', 'Correct current frame bindings as JSON; - reads stdin')
    .action((id: string, token: string, options: { values?: string }) => execute(async runner =>
      runner.resume(id, token, options.values ? await jsonFile(options.values) as Values : {})));
  for (const name of ['inspect', 'history', 'receipt'] as const) {
    run.command(name).description({ inspect: 'Inspect source, call stack, bindings and history', history: 'Read the session event log', receipt: 'Export the exchange receipt' }[name])
      .argument('<id>', 'Run ID').action((id: string) => execute(runner => runner[name](id)));
  }
  run.command('cancel').description('Stop a run and retain its history').argument('<id>', 'Run ID').argument('<reason>', 'Reason for stopping')
    .action((id: string, reason: string) => execute(runner => runner.cancel(id, reason)));
  compilationOptions(run.command('restart').description('Start a new run from the pinned program, or an edited source file')
    .argument('<id>', 'Run ID').option('--file <file>', 'Load a new source version')
    .option('--interpretation <file>', 'Prepared IR for --file')
    .option('--inputs <file>', 'Replace the original starting values; - reads stdin'))
    .action((id: string, options: Partial<CompilationOptions> & { file?: string; interpretation?: string; inputs?: string }) => execute(async runner => {
      if ((options.interpretation || options.entry) && !options.file) throw new Error('--interpretation and --entry require --file');
      if (options.entry && options.interpretation) throw new Error('Choose --entry or --interpretation');
      const old = runner.inspect(id);
      const compiled = options.file ? options.entry ? (await generateRun(options.file, { ...options, entry: options.entry })).program : await compileRun(options.file, options.interpretation) : old.program;
      return runner.start(compiled, options.inputs ? await jsonFile(options.inputs) as Values : old.inputs, id);
    }));
  run.command('list').description('List persisted runs').action(() => execute(runner => runner.list()));
}
