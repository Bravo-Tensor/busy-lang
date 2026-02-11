import { Hover, MarkupKind, Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BusyDocumentManager, ParsedDocument } from '../document-manager';
import { URI } from 'vscode-uri';

export class HoverProvider {
  constructor(private documentManager: BusyDocumentManager) {}

  provideHover(document: TextDocument, position: Position): Hover | null {
    const text = document.getText();
    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const parsed = this.documentManager.getDocument(document.uri);
    if (!parsed) return null;

    // Check if we're hovering over a bracket reference
    const bracketRef = this.getBracketRefAtPosition(line, position.character);
    if (bracketRef) {
      return this.getHoverForBracketRef(bracketRef, parsed, document);
    }

    // Check if we're on an import definition line
    const importMatch = line.match(/^\[([^\]]+)\]:(.+)$/);
    if (importMatch) {
      return this.getHoverForImport(importMatch[1], importMatch[2], document);
    }

    // Check if we're on a heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      return this.getHoverForHeading(headingMatch[2], parsed);
    }

    return null;
  }

  private getBracketRefAtPosition(line: string, character: number): string | null {
    // Find all bracket references in the line
    const regex = /\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (character >= start && character <= end) {
        // Check what follows the bracket
        const afterBracket = line.slice(end);

        // If followed by ( it's an inline markdown link [text](url), not a BUSY reference
        if (afterBracket.startsWith('(')) {
          return null;
        }

        return match[1];
      }
    }
    return null;
  }

  private getHoverForBracketRef(
    ref: string,
    parsed: ParsedDocument,
    document: TextDocument
  ): Hover | null {
    // Check if it's an import
    const imp = parsed.imports.find((i) => i.label === ref);
    if (imp) {
      const resolvedPath = this.documentManager.resolveImportPath(document.uri, imp.path);
      const targetDoc = resolvedPath ? this.documentManager.findDocument(resolvedPath) : null;

      let contents = `**Import**: \`${ref}\`\n\n`;
      contents += `**Path**: \`${imp.path}\``;
      if (imp.anchor) {
        contents += `\`#${imp.anchor}\``;
      }
      contents += '\n\n';

      if (targetDoc?.frontmatter) {
        if (targetDoc.frontmatter.type) {
          contents += `**Type**: ${targetDoc.frontmatter.type}\n\n`;
        }
        if (targetDoc.frontmatter.description) {
          contents += `**Description**: ${targetDoc.frontmatter.description}\n`;
        }
      }

      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: contents,
        },
      };
    }

    // Check if it's a local definition
    if (parsed.localDefinitions.has(ref)) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Local Definition**: \`${ref}\`\n\nDefined in this document's Local Definitions section.`,
        },
      };
    }

    // Check if it's an operation
    const operation = parsed.operations.find((op) => op.name === ref);
    if (operation) {
      let contents = `**Operation**: \`${ref}\`\n\n`;
      if (operation.inputs.length > 0) {
        contents += `**Inputs**:\n${operation.inputs.map((i) => `- \`${i}\``).join('\n')}\n\n`;
      }
      if (operation.outputs.length > 0) {
        contents += `**Outputs**:\n${operation.outputs.map((o) => `- \`${o}\``).join('\n')}\n\n`;
      }
      if (operation.steps.length > 0) {
        contents += `**Steps**: ${operation.steps.length} step(s)`;
      }

      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: contents,
        },
      };
    }

    // Check common BUSY terms
    const busyTerms: Record<string, string> = {
      Document: 'A BUSY document that defines concepts, operations, and structure.',
      Operation: 'An executable unit with inputs, outputs, steps, and checklist.',
      Concept: 'A named definition that can be referenced throughout BUSY documents.',
      Tool: 'An external capability wrapper with provider mappings.',
      Playbook: 'A document with an ordered sequence of operations.',
      Input: 'Input parameters for an operation.',
      Output: 'Output values produced by an operation.',
      Steps: 'Sequential instructions that make up an operation.',
      Checklist: 'Verification items to confirm operation success.',
      Triggers: 'Time-based (alarm) or event-based automation declarations.',
    };

    if (ref in busyTerms) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**BUSY Concept**: \`${ref}\`\n\n${busyTerms[ref]}`,
        },
      };
    }

    // Unresolved reference
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**Unresolved Reference**: \`${ref}\`\n\n_No import or local definition found for this term._`,
      },
    };
  }

  private getHoverForImport(
    label: string,
    pathWithAnchor: string,
    document: TextDocument
  ): Hover | null {
    const [filePath, anchor] = pathWithAnchor.trim().split('#');
    const resolvedPath = this.documentManager.resolveImportPath(document.uri, filePath);

    let contents = `**Import Definition**: \`[${label}]\`\n\n`;
    contents += `**Path**: \`${filePath}\`\n`;

    if (anchor) {
      contents += `**Anchor**: \`#${anchor}\`\n`;
    }

    if (resolvedPath) {
      const targetDoc = this.documentManager.findDocument(resolvedPath);
      if (targetDoc?.frontmatter) {
        contents += '\n---\n\n';
        contents += `**Target Document**:\n`;
        if (targetDoc.frontmatter.name) {
          contents += `- Name: ${targetDoc.frontmatter.name}\n`;
        }
        if (targetDoc.frontmatter.type) {
          contents += `- Type: ${targetDoc.frontmatter.type}\n`;
        }
        if (targetDoc.frontmatter.description) {
          contents += `- Description: ${targetDoc.frontmatter.description}\n`;
        }
      }
    } else {
      contents += '\n\n_File not found_';
    }

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: contents,
      },
    };
  }

  private getHoverForHeading(headingText: string, parsed: ParsedDocument): Hover | null {
    // Check if heading defines an operation (match by name in parsed operations)
    const bracketMatch = headingText.match(/^\[([^\]]+)\]/);
    const operationName = bracketMatch ? bracketMatch[1] : headingText;
    const operation = parsed.operations.find((op) => op.name === operationName);
    if (operation) {
      let contents = `**Operation Definition**: \`${operation.name}\`\n\n`;
      if (operation.inputs.length > 0) {
        contents += `**Inputs**: ${operation.inputs.join(', ')}\n`;
      }
      if (operation.outputs.length > 0) {
        contents += `**Outputs**: ${operation.outputs.join(', ')}\n`;
      }
      contents += `**Steps**: ${operation.steps.length}`;

      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: contents,
        },
      };
    }

    // Standard section hover
    const sectionMatch = headingText.match(/^\[?([^\]]+)\]?/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      const sectionDescriptions: Record<string, string> = {
        Imports: 'Reference-style link definitions for external concepts.',
        Setup: 'Instructions executed before operations.',
        'Local Definitions': 'Reusable definitions scoped to this document.',
        Operations: 'Executable units with inputs, outputs, and steps.',
        Triggers: 'Automation declarations (alarms and events).',
        Tools: 'External capability wrappers with provider mappings.',
      };

      if (sectionName in sectionDescriptions) {
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**BUSY Section**: \`${sectionName}\`\n\n${sectionDescriptions[sectionName]}`,
          },
        };
      }
    }

    return null;
  }
}
