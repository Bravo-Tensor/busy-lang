import {
  SymbolKind,
  Range,
  SymbolInformation,
  Location,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { BusyDocumentManager, HeadingInfo, ParsedDocument } from '../document-manager';

export class SymbolProvider {
  constructor(private documentManager: BusyDocumentManager) {}

  provideDocumentSymbols(document: TextDocument): SymbolInformation[] {
    const parsed = this.documentManager.getDocument(document.uri);
    if (!parsed) return [];

    const symbols: SymbolInformation[] = [];
    const uri = document.uri;

    // Add frontmatter as a symbol
    if (parsed.frontmatter) {
      symbols.push({
        name: parsed.frontmatter.name || 'Frontmatter',
        kind: SymbolKind.Namespace,
        location: Location.create(uri, this.lineRange(0)),
        containerName: parsed.frontmatter.type || undefined,
      });
    }

    // Add headings as flat symbols
    for (const heading of parsed.headings) {
      const { name, kind } = this.getSymbolInfo(heading, parsed);
      symbols.push({
        name,
        kind,
        location: Location.create(uri, this.lineRange(heading.line)),
        containerName: parsed.frontmatter?.name || undefined,
      });
    }

    return symbols;
  }

  private getSymbolInfo(heading: HeadingInfo, parsed: ParsedDocument): { name: string; kind: SymbolKind } {
    let kind: SymbolKind = SymbolKind.String;
    let name = heading.text;

    // Extract name from brackets if present
    const bracketMatch = heading.text.match(/^\[([^\]]+)\]/);
    if (bracketMatch) {
      name = bracketMatch[1];
    }

    // Determine kind based on section type
    if (/^\[?Imports\]?/.test(heading.text)) {
      kind = SymbolKind.Module;
    } else if (/^\[?Setup\]?/.test(heading.text)) {
      kind = SymbolKind.Constructor;
    } else if (/^\[?Local Definitions\]?/.test(heading.text)) {
      kind = SymbolKind.Namespace;
    } else if (/^\[?Operations\]?/.test(heading.text)) {
      kind = SymbolKind.Class;
    } else if (/^\[?Triggers\]?/.test(heading.text)) {
      kind = SymbolKind.Event;
    } else if (/^\[?Tools\]?/.test(heading.text)) {
      kind = SymbolKind.Interface;
    }

    // Check if it's an operation definition
    const opMatch = heading.text.match(/^\[([^\]]+)\]\[Operation\]/);
    if (opMatch) {
      kind = SymbolKind.Function;
      name = opMatch[1];
    }

    // Check if it's a local definition
    const defMatch = heading.text.match(/^\[([^\]]+)\]$/);
    if (defMatch && parsed.localDefinitions.has(defMatch[1])) {
      kind = SymbolKind.Class;
    }

    // Check subsections
    if (/^\[?Inputs?\]?/i.test(heading.text)) {
      kind = SymbolKind.Field;
    } else if (/^\[?Outputs?\]?/i.test(heading.text)) {
      kind = SymbolKind.Field;
    } else if (/^\[?Steps\]?/i.test(heading.text)) {
      kind = SymbolKind.Array;
    } else if (/^\[?Checklist\]?/i.test(heading.text)) {
      kind = SymbolKind.Boolean;
    }

    return { name, kind };
  }

  async provideWorkspaceSymbols(query: string): Promise<SymbolInformation[]> {
    const symbols: SymbolInformation[] = [];
    const queryLower = query.toLowerCase();

    // Search all cached documents
    for (const doc of this.documentManager.getAllDocuments()) {
      // Add operations
      for (const op of doc.operations) {
        if (!query || op.name.toLowerCase().includes(queryLower)) {
          symbols.push({
            name: op.name,
            kind: SymbolKind.Function,
            location: {
              uri: doc.uri,
              range: this.lineRange(op.line),
            },
            containerName: doc.frontmatter?.name || undefined,
          });
        }
      }

      // Add imports
      for (const imp of doc.imports) {
        if (!query || imp.label.toLowerCase().includes(queryLower)) {
          symbols.push({
            name: imp.label,
            kind: SymbolKind.Module,
            location: {
              uri: doc.uri,
              range: this.lineRange(imp.line),
            },
            containerName: doc.frontmatter?.name || undefined,
          });
        }
      }

      // Add local definitions
      for (const def of doc.localDefinitions) {
        if (!query || def.toLowerCase().includes(queryLower)) {
          // Find the heading for this definition
          const heading = doc.headings.find((h) => {
            const match = h.text.match(/^\[([^\]]+)\]/);
            return match && match[1] === def;
          });

          symbols.push({
            name: def,
            kind: SymbolKind.Class,
            location: {
              uri: doc.uri,
              range: this.lineRange(heading?.line || 0),
            },
            containerName: doc.frontmatter?.name || undefined,
          });
        }
      }
    }

    // Also scan workspace files that aren't cached
    const workspaceFiles = await this.documentManager.scanWorkspace();
    for (const filePath of workspaceFiles) {
      const doc = this.documentManager.findDocument(filePath);
      if (!doc) continue;

      // Skip if already in cached documents
      if (this.documentManager.getDocument(URI.file(filePath).toString())) continue;

      for (const op of doc.operations) {
        if (!query || op.name.toLowerCase().includes(queryLower)) {
          symbols.push({
            name: op.name,
            kind: SymbolKind.Function,
            location: {
              uri: URI.file(filePath).toString(),
              range: this.lineRange(op.line),
            },
            containerName: doc.frontmatter?.name || undefined,
          });
        }
      }
    }

    return symbols;
  }

  private lineRange(line: number): Range {
    return {
      start: { line, character: 0 },
      end: { line, character: Number.MAX_VALUE },
    };
  }
}
