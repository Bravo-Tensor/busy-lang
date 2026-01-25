import {
  Definition,
  Location,
  Position,
  Range,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { BusyDocumentManager, ParsedDocument } from '../document-manager';

export class DefinitionProvider {
  constructor(private documentManager: BusyDocumentManager) {}

  provideDefinition(
    document: TextDocument,
    position: Position
  ): Definition | null {
    const text = document.getText();
    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const parsed = this.documentManager.getDocument(document.uri);
    if (!parsed) return null;

    // Check if we're on an inline markdown link [text](url)
    const inlineLink = this.getInlineLinkAtPosition(line, position.character);
    if (inlineLink) {
      return this.getDefinitionForInlineLink(inlineLink, document);
    }

    // Check if we're on a bracket reference
    const bracketRef = this.getBracketRefAtPosition(line, position.character);
    if (bracketRef) {
      return this.getDefinitionForBracketRef(bracketRef, parsed, document);
    }

    return null;
  }

  private getInlineLinkAtPosition(
    line: string,
    character: number
  ): { text: string; url: string } | null {
    // Match [text](url) pattern
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (character >= start && character <= end) {
        return {
          text: match[1],
          url: match[2],
        };
      }
    }
    return null;
  }

  private getDefinitionForInlineLink(
    link: { text: string; url: string },
    document: TextDocument
  ): Definition | null {
    // Parse anchor from URL
    const hashIndex = link.url.indexOf('#');
    const filePath = hashIndex !== -1 ? link.url.slice(0, hashIndex) : link.url;
    const anchor = hashIndex !== -1 ? link.url.slice(hashIndex + 1) : undefined;

    // Resolve the path
    const resolvedPath = this.documentManager.resolveImportPath(document.uri, filePath);
    if (!resolvedPath) {
      return null;
    }

    const targetUri = URI.file(resolvedPath).toString();
    const targetDoc = this.documentManager.findDocument(resolvedPath);

    // If there's an anchor, find the heading
    // Priority: exact slug > second bracket > fuzzy match
    if (anchor && targetDoc) {
      const anchorLower = anchor.toLowerCase();

      // 1. First try exact slug match
      let heading = targetDoc.headings.find((h) => h.slug === anchorLower);

      // 2. Then try second bracket content: # [Name][Type Section]
      if (!heading) {
        heading = targetDoc.headings.find((h) => {
          const secondBracket = h.text.match(/^\[[^\]]+\]\[([^\]]+)\]/);
          if (secondBracket) {
            const secondSlug = secondBracket[1]
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-');
            return secondSlug === anchorLower;
          }
          return false;
        });
      }

      // 3. Finally try fuzzy match on heading text
      if (!heading) {
        heading = targetDoc.headings.find((h) => {
          const textSlug = h.text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
          return textSlug.includes(anchorLower);
        });
      }

      if (heading) {
        return {
          uri: targetUri,
          range: this.lineRange(heading.line),
        };
      }
    }

    // Default to start of file
    return {
      uri: targetUri,
      range: this.lineRange(0),
    };
  }

  private getBracketRefAtPosition(line: string, character: number): string | null {
    const regex = /\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (character >= start && character <= end) {
        // Check what follows the bracket
        const afterBracket = line.slice(end);

        // If followed by ( it's an inline markdown link - skip unless cursor is exactly on the text
        // Import definitions [Name]: are still valid references
        if (afterBracket.startsWith('(')) {
          // This is an inline link [text](url), not a BUSY reference
          // The URL is already explicit, so don't treat it as a reference
          return null;
        }

        return match[1];
      }
    }
    return null;
  }

  private getDefinitionForBracketRef(
    ref: string,
    parsed: ParsedDocument,
    document: TextDocument
  ): Definition | null {
    // Check if it's an import - go to the target file
    const imp = parsed.imports.find((i) => i.label === ref);
    if (imp) {
      const resolvedPath = this.documentManager.resolveImportPath(document.uri, imp.path);
      if (resolvedPath) {
        const targetUri = URI.file(resolvedPath).toString();
        const targetDoc = this.documentManager.findDocument(resolvedPath);

        // If there's an anchor, find the heading
        if (imp.anchor && targetDoc) {
          const heading = targetDoc.headings.find(
            (h) => h.slug === imp.anchor || h.text.toLowerCase().includes(imp.anchor!.toLowerCase())
          );
          if (heading) {
            return {
              uri: targetUri,
              range: this.lineRange(heading.line),
            };
          }
        }

        // Default to start of file
        return {
          uri: targetUri,
          range: this.lineRange(0),
        };
      }
    }

    // Check if it's a local definition - go to the heading
    if (parsed.localDefinitions.has(ref)) {
      // Find the heading that defines this term
      for (const heading of parsed.headings) {
        const bracketMatch = heading.text.match(/^\[([^\]]+)\]/);
        if (bracketMatch && bracketMatch[1] === ref) {
          return {
            uri: document.uri,
            range: this.lineRange(heading.line),
          };
        }
        // Also check for plain headings like "## Input Section"
        if (heading.text.includes(ref)) {
          return {
            uri: document.uri,
            range: this.lineRange(heading.line),
          };
        }
      }
    }

    // Check if it's an operation defined in this document
    const operation = parsed.operations.find((op) => op.name === ref);
    if (operation) {
      return {
        uri: document.uri,
        range: this.lineRange(operation.line),
      };
    }

    // Check if it's an internal heading anchor
    const heading = parsed.headings.find((h) => {
      const bracketMatch = h.text.match(/^\[([^\]]+)\]/);
      return bracketMatch && bracketMatch[1] === ref;
    });
    if (heading) {
      return {
        uri: document.uri,
        range: this.lineRange(heading.line),
      };
    }

    // Try to find the reference in other open documents
    const allDocs = this.documentManager.getAllDocuments();
    for (const otherDoc of allDocs) {
      if (otherDoc.uri === document.uri) continue;

      // Check imports
      const otherImp = otherDoc.imports.find((i) => i.label === ref);
      if (otherImp) {
        return {
          uri: otherDoc.uri,
          range: this.lineRange(otherImp.line),
        };
      }

      // Check operations
      const otherOp = otherDoc.operations.find((op) => op.name === ref);
      if (otherOp) {
        return {
          uri: otherDoc.uri,
          range: this.lineRange(otherOp.line),
        };
      }

      // Check local definitions
      if (otherDoc.localDefinitions.has(ref)) {
        for (const heading of otherDoc.headings) {
          const bracketMatch = heading.text.match(/^\[([^\]]+)\]/);
          if (bracketMatch && bracketMatch[1] === ref) {
            return {
              uri: otherDoc.uri,
              range: this.lineRange(heading.line),
            };
          }
        }
      }
    }

    return null;
  }

  private lineRange(line: number): Range {
    return {
      start: { line, character: 0 },
      end: { line, character: Number.MAX_VALUE },
    };
  }
}
