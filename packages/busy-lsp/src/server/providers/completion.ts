import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  Position,
  MarkupKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BusyDocumentManager } from '../document-manager';
import * as path from 'path';
import * as fs from 'fs';

export class CompletionProvider {
  constructor(private documentManager: BusyDocumentManager) {}

  provideCompletions(
    document: TextDocument,
    position: Position
  ): CompletionItem[] {
    const items: CompletionItem[] = [];
    const text = document.getText();
    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const linePrefix = line.substring(0, position.character);
    const parsed = this.documentManager.getDocument(document.uri);

    // Determine context
    if (this.isInFrontmatter(lines, position.line)) {
      return this.getFrontmatterCompletions(linePrefix);
    }

    // Bracket reference completions [
    if (linePrefix.endsWith('[') || linePrefix.match(/\[[^\]]*$/)) {
      return this.getBracketCompletions(parsed, document);
    }

    // Import path completions after [Label]:
    if (linePrefix.match(/^\[[^\]]+\]:\s*$/)) {
      return this.getPathCompletions(document);
    }

    // Anchor completions after #
    if (linePrefix.includes('#')) {
      return this.getAnchorCompletions(linePrefix, parsed, document);
    }

    // Section heading completions
    if (linePrefix.match(/^#+\s*$/)) {
      return this.getSectionCompletions(position.line, parsed);
    }

    return items;
  }

  resolveCompletion(item: CompletionItem): CompletionItem {
    // Add additional documentation if needed
    return item;
  }

  private isInFrontmatter(lines: string[], lineNum: number): boolean {
    let inFrontmatter = false;
    for (let i = 0; i <= lineNum && i < lines.length; i++) {
      if (i === 0 && lines[i] === '---') {
        inFrontmatter = true;
      } else if (inFrontmatter && lines[i] === '---') {
        return i > lineNum;
      }
    }
    return inFrontmatter;
  }

  private getFrontmatterCompletions(linePrefix: string): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Field completions
    if (!linePrefix.includes(':')) {
      const fields = [
        { name: 'Name', detail: 'Document name (required)' },
        { name: 'Type', detail: 'Document type as bracketed reference (required)' },
        { name: 'Description', detail: 'Brief description (required)' },
        { name: 'Extends', detail: 'Parent document to extend' },
        { name: 'Tags', detail: 'Comma-separated tags' },
        { name: 'Provider', detail: 'Provider for tool documents' },
      ];

      for (const field of fields) {
        items.push({
          label: field.name,
          kind: CompletionItemKind.Field,
          detail: field.detail,
          insertText: `${field.name}: `,
          insertTextFormat: InsertTextFormat.PlainText,
        });
      }
    }

    // Type value completions
    if (linePrefix.match(/^Type:\s*$/)) {
      const types = ['Document', 'Operation', 'Tool', 'Playbook', 'Concept', 'Role'];
      for (const type of types) {
        items.push({
          label: `[${type}]`,
          kind: CompletionItemKind.EnumMember,
          insertText: `[${type}]`,
        });
      }
    }

    return items;
  }

  private getBracketCompletions(
    parsed: ReturnType<BusyDocumentManager['getDocument']>,
    document: TextDocument
  ): CompletionItem[] {
    const items: CompletionItem[] = [];
    if (!parsed) return items;

    // Add imports as completions
    for (const imp of parsed.imports) {
      items.push({
        label: imp.label,
        kind: CompletionItemKind.Reference,
        detail: `Import: ${imp.path}${imp.anchor ? '#' + imp.anchor : ''}`,
        documentation: {
          kind: MarkupKind.Markdown,
          value: `Reference to imported concept from \`${imp.path}\``,
        },
      });
    }

    // Add local definitions
    for (const def of parsed.localDefinitions) {
      items.push({
        label: def,
        kind: CompletionItemKind.Class,
        detail: 'Local Definition',
      });
    }

    // Add operations
    for (const op of parsed.operations) {
      items.push({
        label: op.name,
        kind: CompletionItemKind.Function,
        detail: 'Operation',
        documentation: {
          kind: MarkupKind.Markdown,
          value: `**Operation**: ${op.name}\n\n` +
            (op.inputs.length ? `**Inputs**: ${op.inputs.join(', ')}\n` : '') +
            (op.outputs.length ? `**Outputs**: ${op.outputs.join(', ')}` : ''),
        },
      });
    }

    // Add common BUSY terms
    const commonTerms = [
      { label: 'Operation', detail: 'Operation concept' },
      { label: 'Document', detail: 'Document concept' },
      { label: 'Concept', detail: 'Generic concept' },
      { label: 'Tool', detail: 'Tool concept' },
      { label: 'Input', detail: 'Input section' },
      { label: 'Output', detail: 'Output section' },
      { label: 'Steps', detail: 'Steps section' },
      { label: 'Checklist', detail: 'Checklist section' },
    ];

    for (const term of commonTerms) {
      if (!items.some((i) => i.label === term.label)) {
        items.push({
          label: term.label,
          kind: CompletionItemKind.Keyword,
          detail: term.detail,
        });
      }
    }

    return items;
  }

  private getPathCompletions(document: TextDocument): CompletionItem[] {
    const items: CompletionItem[] = [];
    const workspaceRoot = this.documentManager.getWorkspaceRoot();
    const documentDir = path.dirname(document.uri.replace('file://', ''));

    // Suggest relative paths
    const dirs = [documentDir];
    if (workspaceRoot) {
      dirs.push(workspaceRoot);
    }

    const seen = new Set<string>();

    for (const dir of dirs) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;

          if (entry.isDirectory()) {
            const label = entry.name + '/';
            if (!seen.has(label)) {
              seen.add(label);
              items.push({
                label,
                kind: CompletionItemKind.Folder,
                insertText: label,
              });
            }
          } else if (entry.name.endsWith('.busy.md') || entry.name.endsWith('.busy')) {
            const relativePath = './' + entry.name;
            if (!seen.has(relativePath)) {
              seen.add(relativePath);
              items.push({
                label: relativePath,
                kind: CompletionItemKind.File,
                detail: 'BUSY document',
                insertText: relativePath,
              });
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return items;
  }

  private getAnchorCompletions(
    linePrefix: string,
    parsed: ReturnType<BusyDocumentManager['getDocument']>,
    document: TextDocument
  ): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Extract the path from the import line
    const pathMatch = linePrefix.match(/^\[([^\]]+)\]:\s*([^#]+)#/);
    if (!pathMatch) return items;

    const importPath = pathMatch[2].trim();
    const resolvedPath = this.documentManager.resolveImportPath(document.uri, importPath);

    if (resolvedPath) {
      const targetDoc = this.documentManager.findDocument(resolvedPath);
      if (targetDoc) {
        // Add all headings as anchor completions
        for (const heading of targetDoc.headings) {
          items.push({
            label: heading.slug,
            kind: CompletionItemKind.Reference,
            detail: `Heading: ${heading.text}`,
            documentation: {
              kind: MarkupKind.Markdown,
              value: `Level ${heading.level} heading: **${heading.text}**`,
            },
          });
        }
      }
    }

    return items;
  }

  private getSectionCompletions(
    lineNum: number,
    parsed: ReturnType<BusyDocumentManager['getDocument']>
  ): CompletionItem[] {
    const items: CompletionItem[] = [];

    // Determine which sections are already present
    const existingSections = new Set<string>();
    if (parsed) {
      for (const h of parsed.headings) {
        if (h.level === 1) {
          const match = h.text.match(/^\[?([^\]]+)\]?/);
          if (match) existingSections.add(match[1]);
        }
      }
    }

    // Suggest missing sections
    const sections = [
      { name: 'Imports', snippet: '[Imports](#imports-section)' },
      { name: 'Setup', snippet: '[Setup](#setup-section)' },
      { name: 'Local Definitions', snippet: '[Local Definitions](#local-definitions-section)' },
      { name: 'Operations', snippet: '[Operations](#operations-section)' },
      { name: 'Triggers', snippet: '[Triggers](#triggers-section)' },
      { name: 'Tools', snippet: '[Tools](#tools-section)' },
    ];

    for (const section of sections) {
      if (!existingSections.has(section.name)) {
        items.push({
          label: `# ${section.snippet}`,
          kind: CompletionItemKind.Snippet,
          detail: `Add ${section.name} section`,
          insertText: ` ${section.snippet}\n\n`,
          insertTextFormat: InsertTextFormat.PlainText,
        });
      }
    }

    // Operation subsection suggestions
    const opSubsections = [
      { name: 'Input', snippet: '### [Input][Input Section]\n- ' },
      { name: 'Output', snippet: '### [Output][Output Section]\n- ' },
      { name: 'Steps', snippet: '### [Steps][Steps Section]\n1. ' },
      { name: 'Checklist', snippet: '### [Checklist][Checklist Section]\n- ' },
    ];

    for (const sub of opSubsections) {
      items.push({
        label: `### [${sub.name}]`,
        kind: CompletionItemKind.Snippet,
        detail: `Add ${sub.name} subsection`,
        insertText: sub.snippet,
        insertTextFormat: InsertTextFormat.PlainText,
      });
    }

    return items;
  }
}
