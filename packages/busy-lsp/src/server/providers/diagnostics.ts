import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import * as path from 'path';
import * as fs from 'fs';
import { BusyDocumentManager, ParsedDocument } from '../document-manager';

export class DiagnosticsProvider {
  constructor(private documentManager: BusyDocumentManager) {}

  async validate(textDocument: TextDocument): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const content = textDocument.getText();
    const lines = content.split('\n');
    const uri = textDocument.uri;

    const parsed = this.documentManager.getDocument(uri);
    if (!parsed) return diagnostics;

    // Run all validation rules
    this.validateFrontmatter(parsed, lines, diagnostics);
    this.validateImportsSection(parsed, lines, diagnostics);
    this.validateSetupSection(parsed, lines, diagnostics);
    this.validateSectionOrder(parsed, lines, diagnostics);
    this.validateImportPaths(parsed, uri, diagnostics);
    this.validateBracketReferences(parsed, lines, diagnostics);
    this.validateUnusedImports(parsed, lines, diagnostics);
    this.validateOperations(parsed, lines, diagnostics);
    this.validateVariableNaming(parsed, lines, diagnostics);

    return diagnostics;
  }

  // BUSY001-004: Frontmatter validation
  private validateFrontmatter(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    const content = parsed.content;

    // BUSY001: Frontmatter must exist
    if (!content.startsWith('---')) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.lineRange(0),
        message: 'BUSY document must start with frontmatter (---)',
        source: 'busy',
        code: 'BUSY001',
      });
      return;
    }

    if (!parsed.frontmatter) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.lineRange(0),
        message: 'Frontmatter must be closed with ---',
        source: 'busy',
        code: 'BUSY001',
      });
      return;
    }

    // BUSY002: Name field required
    if (!parsed.frontmatter.name) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.lineRange(1),
        message: "Frontmatter missing required 'Name' field",
        source: 'busy',
        code: 'BUSY002',
      });
    }

    // BUSY003: Type field required and must be bracketed
    if (!parsed.frontmatter.type) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.lineRange(1),
        message: "Frontmatter missing required 'Type' field",
        source: 'busy',
        code: 'BUSY003',
      });
    } else if (!parsed.frontmatter.type.match(/^\[.+\]$/)) {
      const typeLine = this.findLineContaining(lines, 'Type:');
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.lineRange(typeLine),
        message: `Type must be a bracketed reference (e.g., [Playbook]), got: ${parsed.frontmatter.type}`,
        source: 'busy',
        code: 'BUSY003',
      });
    }

    // BUSY004: Description field required
    if (!parsed.frontmatter.description) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.lineRange(1),
        message: "Frontmatter missing required 'Description' field",
        source: 'busy',
        code: 'BUSY004',
      });
    }
  }

  // BUSY010-012: Imports section validation
  private validateImportsSection(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    // Find imports section
    const importsLine = this.findHeadingLine(parsed.headings, /^\[?Imports\]?/);

    // BUSY010: Imports section must exist
    if (importsLine === -1) {
      const reportLine = parsed.frontmatter ? parsed.frontmatter.endLine : 0;
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: this.lineRange(reportLine),
        message: "Document must have '# [Imports]' section after frontmatter",
        source: 'busy',
        code: 'BUSY010',
      });
      return;
    }

    // BUSY011: Imports must be first heading
    if (parsed.headings.length > 0 && parsed.headings[0].line !== importsLine) {
      const firstHeading = parsed.headings[0];
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: this.lineRange(firstHeading.line),
        message: `First heading must be Imports section, found: ${firstHeading.text}`,
        source: 'busy',
        code: 'BUSY011',
      });
    }

    // BUSY012: Validate import format
    const importsEnd = this.findNextHeadingLine(parsed.headings, importsLine);
    for (let i = importsLine + 1; i < importsEnd && i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() && !line.startsWith('#') && !line.trim().startsWith('<!--')) {
        if (!line.match(/^\[.+\]:.+$/)) {
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: this.lineRange(i),
            message: `Invalid import format. Expected [Alias]:path, got: ${line}`,
            source: 'busy',
            code: 'BUSY012',
          });
        }
      }
    }
  }

  // BUSY020: Setup section validation
  private validateSetupSection(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    const setupLine = this.findHeadingLine(parsed.headings, /^\[?Setup\]?/);

    if (setupLine === -1) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: this.lineRange(0),
        message: "Document should have '# [Setup]' section",
        source: 'busy',
        code: 'BUSY020',
      });
    }
  }

  // BUSY050: Section ordering
  private validateSectionOrder(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    const order = ['Imports', 'Setup', 'Local Definitions', 'Operations'];
    const h1Headings = parsed.headings.filter((h) => h.level === 1);
    let lastIndex = -1;

    for (const heading of h1Headings) {
      const sectionMatch = heading.text.match(/^\[?([^\]]+)\]?/);
      if (!sectionMatch) continue;

      const sectionName = sectionMatch[1];
      const orderIndex = order.findIndex(
        (s) => sectionName.includes(s) || s.includes(sectionName)
      );

      if (orderIndex !== -1 && orderIndex < lastIndex) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: this.lineRange(heading.line),
          message: `Section '${sectionName}' is out of order. Expected order: ${order.join(' -> ')}`,
          source: 'busy',
          code: 'BUSY050',
        });
      }
      if (orderIndex !== -1) {
        lastIndex = orderIndex;
      }
    }
  }

  // BUSY042: Validate import paths exist
  private validateImportPaths(
    parsed: ParsedDocument,
    uri: string,
    diagnostics: Diagnostic[]
  ): void {
    const documentPath = URI.parse(uri).fsPath;
    const documentDir = path.dirname(documentPath);

    for (const imp of parsed.imports) {
      // Skip URLs
      if (imp.path.startsWith('http://') || imp.path.startsWith('https://')) {
        continue;
      }

      const fullPath = path.resolve(documentDir, imp.path);
      if (!fs.existsSync(fullPath)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: this.lineRange(imp.line),
          message: `Import [${imp.label}] references non-existent file: ${imp.path}`,
          source: 'busy',
          code: 'BUSY042',
        });
      }
    }
  }

  // BUSY040: All bracket references must resolve
  private validateBracketReferences(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    const importLabels = new Set(parsed.imports.map((i) => i.label));
    const localDefs = parsed.localDefinitions;

    // Extract internal anchors from headings (bracketed terms and plain heading text)
    const internalAnchors = new Set<string>();
    for (const h of parsed.headings) {
      // Extract all [Term] patterns from heading (handles inline links too)
      const bracketRegex = /\[([^\]]+)\]/g;
      let match;
      while ((match = bracketRegex.exec(h.text)) !== null) {
        internalAnchors.add(match[1]);
      }
      // Also add plain heading text (for non-bracketed headings like "### Steps")
      const plainText = h.text.replace(/\[([^\]]+)\](\([^)]*\))?/g, '').trim();
      if (plainText) {
        internalAnchors.add(plainText);
      }
    }

    // Build a combined set of all valid references for case suggestions
    const allValidRefs = new Set([...importLabels, ...localDefs, ...internalAnchors]);

    for (const ref of parsed.bracketRefs) {
      // Skip if it's an exact match
      if (importLabels.has(ref) || localDefs.has(ref) || internalAnchors.has(ref)) {
        continue;
      }

      // Check for case mismatch - find if there's a case-insensitive match
      const refLower = ref.toLowerCase();
      const caseSuggestion = [...allValidRefs].find((v) => v.toLowerCase() === refLower);

      // Find ALL occurrences of this reference in the document
      const locations = this.findAllBracketRefLocations(lines, ref);
      for (const result of locations) {
        let message: string;
        let data: { suggestion?: string; range?: Range } | undefined;

        if (caseSuggestion) {
          message = `Case mismatch: [${ref}] should be [${caseSuggestion}]`;
          data = { suggestion: caseSuggestion, range: result.range };
        } else {
          message = `Unresolved reference: [${ref}]. No import or local definition found.`;
        }

        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: result.range,
          message,
          source: 'busy',
          code: 'BUSY040',
          data,
        });
      }
    }
  }

  // Helper: Find ALL occurrences of standalone bracket ref (skipping fenced code blocks)
  private findAllBracketRefLocations(lines: string[], ref: string): { line: number; range: Range }[] {
    const results: { line: number; range: Range }[] = [];
    const escaped = this.escapeRegex(ref);
    // Match [ref] but NOT followed by ( or : (which would make it a link)
    const pattern = new RegExp(`\\[${escaped}\\](?!\\s*[:(])`, 'g');

    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track fenced code blocks (``` or ~~~)
      if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip lines inside code blocks
      if (inCodeBlock) continue;

      // Skip inline code by checking if match is inside backticks
      let match;
      while ((match = pattern.exec(line)) !== null) {
        // Check if this match is inside inline code
        const beforeMatch = line.substring(0, match.index);
        const backtickCount = (beforeMatch.match(/`/g) || []).length;
        if (backtickCount % 2 === 1) {
          // Odd number of backticks before = inside inline code
          continue;
        }

        results.push({
          line: i,
          range: {
            start: { line: i, character: match.index },
            end: { line: i, character: match.index + match[0].length },
          },
        });
      }
      // Reset lastIndex for next line
      pattern.lastIndex = 0;
    }
    return results;
  }

  // BUSY041: Unused imports
  private validateUnusedImports(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    const importsLine = this.findHeadingLine(parsed.headings, /^\[?Imports\]?/);
    if (importsLine === -1) return;

    const importsEnd = this.findNextHeadingLine(parsed.headings, importsLine);
    const bodyContent = lines.slice(importsEnd).join('\n');

    for (const imp of parsed.imports) {
      const usageRegex = new RegExp(`\\[${this.escapeRegex(imp.label)}\\]`);
      if (!bodyContent.match(usageRegex)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Hint,
          range: this.lineRange(imp.line),
          message: `Import [${imp.label}] is defined but never used in the document`,
          source: 'busy',
          code: 'BUSY041',
        });
      }
    }
  }

  // BUSY030-032: Operations validation
  private validateOperations(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    for (const op of parsed.operations) {
      // BUSY032: Operation names must be CamelCase
      const camelCasePattern = /^[A-Z][a-zA-Z0-9]*$/;
      if (!camelCasePattern.test(op.name)) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: this.lineRange(op.line),
          message: `Operation name '${op.name}' should be CamelCase (e.g., CreateInstance, UpdateRecord)`,
          source: 'busy',
          code: 'BUSY032',
        });
      }
    }
  }

  // BUSY070: Variable naming validation
  private validateVariableNaming(
    parsed: ParsedDocument,
    lines: string[],
    diagnostics: Diagnostic[]
  ): void {
    let inInputOrOutput = false;
    let currentSection = '';
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      // Check for Input/Output sections
      const inputOutputMatch = line.match(/^###\s+\[?(Input|Output)s?\]?/i);
      if (inputOutputMatch) {
        inInputOrOutput = true;
        currentSection = inputOutputMatch[1];
        continue;
      }

      // Exit section on next heading
      if (inInputOrOutput && line.match(/^#{1,3}\s+/)) {
        inInputOrOutput = false;
        currentSection = '';
        continue;
      }

      // Check variable definitions
      if (inInputOrOutput && line.trim().startsWith('- ')) {
        const varMatch = line.match(/^-\s+(`?)([a-zA-Z_][a-zA-Z0-9_]*)\1:/);
        if (varMatch) {
          const hasBackticks = varMatch[1] === '`';
          const identifier = varMatch[2];
          const isSnakeCase = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(identifier);
          const isUpperSnakeCase = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(identifier);

          if (!hasBackticks || (!isSnakeCase && !isUpperSnakeCase)) {
            diagnostics.push({
              severity: DiagnosticSeverity.Hint,
              range: this.lineRange(i),
              message: `Variable '${identifier}' in [${currentSection}] section should be wrapped in backticks and use snake_case`,
              source: 'busy',
              code: 'BUSY070',
            });
          }
        }
      }
    }
  }

  // Helper: Create a range for a line
  private lineRange(line: number): Range {
    return {
      start: { line, character: 0 },
      end: { line, character: Number.MAX_VALUE },
    };
  }

  // Helper: Find line containing text
  private findLineContaining(lines: string[], text: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(text)) return i;
    }
    return -1;
  }

  // Helper: Find heading line by pattern
  private findHeadingLine(
    headings: { line: number; text: string }[],
    pattern: RegExp
  ): number {
    for (const h of headings) {
      if (pattern.test(h.text)) return h.line;
    }
    return -1;
  }

  // Helper: Find next heading after a line
  private findNextHeadingLine(
    headings: { line: number }[],
    afterLine: number
  ): number {
    for (const h of headings) {
      if (h.line > afterLine) return h.line;
    }
    return Number.MAX_VALUE;
  }

  // Helper: Escape regex special characters
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
