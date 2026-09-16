import { parseDocument, resolveImports } from '../parser.js';
import { validateHeadingLinks } from './heading-links.js';
import { validateOperationNames } from './operation-names.js';
import { validateLocalLinks } from './local-links.js';

type Document = ReturnType<typeof parseDocument>;
interface ValidationContext { content: string; filePath: string; document: Document }
interface Check {
  id: string;
  severity: 'error' | 'warning';
  run(context: ValidationContext): string[];
}
export interface ValidationFinding { check: string; severity: 'error' | 'warning'; message: string }
export interface ValidationResult {
  document: Document;
  findings: ValidationFinding[];
  resolvedImports?: ReturnType<typeof resolveImports>;
}

// Register deterministic document checks here; callers need not know individual validators.
const checks: Check[] = [
  { id: 'heading-links', severity: 'error', run: c => validateHeadingLinks(c.content, c.filePath) },
  { id: 'operation-names', severity: 'error', run: c => validateOperationNames(c.content) },
  { id: 'local-links', severity: 'error', run: c => validateLocalLinks(c.content, c.filePath) },
  { id: 'operation-steps', severity: 'warning', run: c => c.document.operations
    .filter(op => op.steps.length === 0).map(op => `Operation "${op.name}" has no steps`) },
  { id: 'operation-imports', severity: 'warning', run: c => c.document.imports.length === 0 && c.document.operations.length > 0
    ? ['Document has operations but no imports'] : [] },
];

/** Parse once, run document checks, and optionally resolve transitive imports.
 * Parse failures throw because subsequent checks require a valid document structure.
 */
export function validateDocument(content: string, filePath: string, options: { resolveImports?: boolean } = {}): ValidationResult {
  const document = parseDocument(content);
  const context = { content, filePath, document };
  const findings = checks.flatMap(check => check.run(context).map(message => ({ check: check.id, severity: check.severity, message })));
  const result: ValidationResult = { document, findings };
  if (options.resolveImports) {
    try { result.resolvedImports = resolveImports(document, filePath); }
    catch (error) { findings.push({ check: 'import-resolution', severity: 'error', message: `Import resolution failed: ${error instanceof Error ? error.message : error}` }); }
  }
  return result;
}
