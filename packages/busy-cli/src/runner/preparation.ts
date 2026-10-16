import { resolve, dirname, basename, join } from 'node:path';
import { loadRunSource, lowerRun, compileRun, type RunProgram } from './program.js';
import { buildCompilationCatalog, lowerConstrainedDraft, checkCoverage, type CompilationCatalog } from './compiler.js';
import { checkBindings } from './checks.js';

/** An offline instruction cursor. Prose conditions and nested work stay caller-owned. */
export function createCursorDraft(catalog: CompilationCatalog, entry = catalog.entry): unknown {
  const sources = catalog.sourceCatalog.filter(s => s.owner === entry);
  // The shared document checklist closes the entry; it must not precede its work.
  const ordered = [...sources.filter(s => s.id !== `${entry}/document-checklist`),
    ...sources.filter(s => s.id === `${entry}/document-checklist`)];
  const inputs = ['inputContext', 'guidanceContext'];
  const field = (name: string) => ({ name, type: 'string', options: [] });
  const steps = ordered.map((source, index) => {
    const id = `instruction${index + 1}`, last = index === ordered.length - 1;
    return { id, sourceId: source.id, context: [...inputs, ...(index ? ['workNotes'] : [])],
      definitions: [], tools: [], returnValues: [field('workNotes'), ...(last ? [field('result')] : [])],
      next: null, routes: [
        { decision: 'instructionAddressed', next: last ? null : `instruction${index + 2}`, call: null },
        { decision: 'retryInstruction', next: id, call: null },
        { decision: 'blocked', next: id, call: null },
      ] };
  });
  if (!steps.length) throw new Error(`No addressable instructions for ${entry}`);
  return { issue: null, entry, operations: [{ name: entry, inputs, outputs: ['result'], steps }] };
}

/** Canonical source loading, constrained lowering and all structural checks; no provider. */
export async function prepareRun(file: string, options: { entry: string; draft?: unknown; interpretationFile?: string }): Promise<RunProgram> {
  const loaded = await loadRunSource(file);
  const catalog = buildCompilationCatalog(file, options.entry, loaded);
  const plan = lowerConstrainedDraft(catalog, options.draft ?? createCursorDraft(catalog));
  const diagnostics = [...checkCoverage(catalog, plan), ...checkBindings(plan)];
  if (diagnostics.length) throw new Error(diagnostics.join('; '));
  const root = loaded.sources.find(s => s.filePath === resolve(file))!.document;
  const defining = root.operations.filter(op => op.sectionRef.startsWith(root.docId + '#'));
  const stem = basename(file).replace(/(?:\.busy)?\.md$/, '');
  const output = options.interpretationFile ?? join(dirname(resolve(file)), `${stem}${defining.length === 1 ? '' : '.' + options.entry}.runner.json`);
  return lowerRun(file, plan, output, loaded);
}

/** Check coverage and bindings as well as the normal explicit-IR loading contract. */
export async function checkPreparedRun(file: string, interpretationFile?: string): Promise<RunProgram> {
  const program = await compileRun(file, interpretationFile);
  const loaded = await loadRunSource(file);
  const catalog = buildCompilationCatalog(file, program.entry, loaded);
  const diagnostics = [...checkCoverage(catalog, program.interpretation), ...checkBindings(program.interpretation)];
  if (diagnostics.length) throw new Error(diagnostics.join('; '));
  return program;
}
