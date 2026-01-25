import { URI } from 'vscode-uri';
import * as path from 'path';
import * as fs from 'fs';

export interface ParsedFrontmatter {
  name?: string;
  type?: string;
  description?: string;
  extends?: string;
  tags?: string[];
  provider?: string;
  raw: string;
  endLine: number;
}

export interface ImportDefinition {
  label: string;
  path: string;
  anchor?: string;
  line: number;
}

export interface HeadingInfo {
  level: number;
  text: string;
  line: number;
  slug: string;
}

export interface OperationInfo {
  name: string;
  line: number;
  inputs: string[];
  outputs: string[];
  steps: string[];
}

export interface ParsedDocument {
  uri: string;
  content: string;
  frontmatter: ParsedFrontmatter | null;
  imports: ImportDefinition[];
  headings: HeadingInfo[];
  operations: OperationInfo[];
  localDefinitions: Set<string>;
  bracketRefs: Set<string>;
}

export class BusyDocumentManager {
  private documents: Map<string, ParsedDocument> = new Map();
  private workspaceRoot: string = '';

  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = root;
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  openDocument(uri: string, content: string): ParsedDocument {
    const parsed = this.parseDocument(uri, content);
    this.documents.set(uri, parsed);
    return parsed;
  }

  updateDocument(uri: string, content: string): ParsedDocument {
    const parsed = this.parseDocument(uri, content);
    this.documents.set(uri, parsed);
    return parsed;
  }

  closeDocument(uri: string): void {
    this.documents.delete(uri);
  }

  getDocument(uri: string): ParsedDocument | undefined {
    return this.documents.get(uri);
  }

  getAllDocuments(): ParsedDocument[] {
    return Array.from(this.documents.values());
  }

  // Parse a BUSY document and extract all relevant information
  private parseDocument(uri: string, content: string): ParsedDocument {
    const lines = content.split('\n');

    return {
      uri,
      content,
      frontmatter: this.parseFrontmatter(content),
      imports: this.parseImports(lines),
      headings: this.parseHeadings(lines),
      operations: this.parseOperations(lines),
      localDefinitions: this.parseLocalDefinitions(lines),
      bracketRefs: this.extractBracketRefs(content),
    };
  }

  // Parse YAML frontmatter
  private parseFrontmatter(content: string): ParsedFrontmatter | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yaml = match[1];
    const result: Record<string, string> = {};
    const yamlLines = yaml.split('\n');

    for (const line of yamlLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        result[key] = value;
      }
    }

    return {
      name: result.Name,
      type: result.Type,
      description: result.Description,
      extends: result.Extends,
      provider: result.Provider,
      tags: result.Tags ? result.Tags.split(',').map((t) => t.trim()) : undefined,
      raw: match[0],
      endLine: match[0].split('\n').length,
    };
  }

  // Parse import definitions
  private parseImports(lines: string[]): ImportDefinition[] {
    const imports: ImportDefinition[] = [];
    const regex = /^\[([^\]]+)\]:(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        const pathWithAnchor = match[2].trim();
        const anchorMatch = pathWithAnchor.match(/^([^#]+)(#(.+))?$/);
        imports.push({
          label: match[1],
          path: anchorMatch ? anchorMatch[1].trim() : pathWithAnchor,
          anchor: anchorMatch?.[3],
          line: i,
        });
      }
    }

    return imports;
  }

  // Parse all headings
  private parseHeadings(lines: string[]): HeadingInfo[] {
    const headings: HeadingInfo[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const text = match[2];
        headings.push({
          level: match[1].length,
          text,
          line: i,
          slug: this.slugify(text),
        });
      }
    }

    return headings;
  }

  // Parse operations from the Operations section
  private parseOperations(lines: string[]): OperationInfo[] {
    const operations: OperationInfo[] = [];
    let inOperations = false;
    let currentOp: OperationInfo | null = null;
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];

        // Check for Operations section start
        if (level === 1 && /^\[?Operations\]?/.test(text)) {
          inOperations = true;
          continue;
        }

        // Check for end of Operations section
        if (inOperations && level === 1) {
          if (currentOp) operations.push(currentOp);
          break;
        }

        // Operation definition (level 2)
        if (inOperations && level === 2) {
          if (currentOp) operations.push(currentOp);
          const nameMatch = text.match(/^\[([^\]]+)\]/);
          currentOp = {
            name: nameMatch ? nameMatch[1] : text,
            line: i,
            inputs: [],
            outputs: [],
            steps: [],
          };
          currentSection = '';
          continue;
        }

        // Subsections within operation (level 3)
        if (inOperations && level === 3 && currentOp) {
          if (/^\[?Inputs?\]?/i.test(text)) {
            currentSection = 'input';
          } else if (/^\[?Outputs?\]?/i.test(text)) {
            currentSection = 'output';
          } else if (/^\[?Steps\]?/i.test(text)) {
            currentSection = 'steps';
          } else {
            currentSection = '';
          }
          continue;
        }
      }

      // Parse content within operation sections
      if (inOperations && currentOp) {
        if (currentSection === 'input' && line.trim().startsWith('- ')) {
          const inputMatch = line.match(/^-\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?:/);
          if (inputMatch) currentOp.inputs.push(inputMatch[1]);
        } else if (currentSection === 'output' && line.trim().startsWith('- ')) {
          const outputMatch = line.match(/^-\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?:/);
          if (outputMatch) currentOp.outputs.push(outputMatch[1]);
        } else if (currentSection === 'steps' && /^\d+\./.test(line.trim())) {
          currentOp.steps.push(line.trim());
        }
      }
    }

    if (currentOp) operations.push(currentOp);
    return operations;
  }

  // Parse local definitions
  private parseLocalDefinitions(lines: string[]): Set<string> {
    const localDefs = new Set<string>();
    let inLocalDefs = false;
    let localDefsLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];

        if (/^\[?Local Definitions\]?/.test(text)) {
          inLocalDefs = true;
          localDefsLevel = level;
          continue;
        }

        if (inLocalDefs && level <= localDefsLevel) {
          inLocalDefs = false;
        }

        if (inLocalDefs && level > localDefsLevel) {
          // Extract term from [Term] or plain text
          const bracketMatch = text.match(/^\[([^\]]+)\]/);
          if (bracketMatch) {
            localDefs.add(bracketMatch[1]);
          } else {
            // Handle "Input Section" -> "Input"
            const sectionMatch = text.match(/^([A-Z][a-zA-Z\s&]+?)(?:\s+Section)?$/);
            if (sectionMatch) {
              localDefs.add(sectionMatch[1].trim());
            } else {
              localDefs.add(text.trim());
            }
          }
        }
      }
    }

    return localDefs;
  }

  // Extract bracket references from content
  private extractBracketRefs(content: string): Set<string> {
    const refs = new Set<string>();

    // Remove frontmatter
    let textToScan = content;
    const fmMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
    if (fmMatch) {
      textToScan = content.slice(fmMatch[0].length);
    }

    // Remove code blocks
    textToScan = textToScan.replace(/```[\s\S]*?```/g, '');
    textToScan = textToScan.replace(/~~~[\s\S]*?~~~/g, '');
    textToScan = textToScan.replace(/`[^`]+`/g, '');

    // Match [Term] but not [Term]: or [Term](url)
    const regex = /\[([^\]]+)\](?!\s*[:\(])/g;
    let match;
    while ((match = regex.exec(textToScan)) !== null) {
      const ref = match[1];
      if (ref !== ' ' && ref !== 'x' && ref !== 'X' && !ref.startsWith('#')) {
        refs.add(ref);
      }
    }

    return refs;
  }

  // Convert heading text to slug
  private slugify(text: string): string {
    // Extract text from brackets if present
    const bracketMatch = text.match(/^\[([^\]]+)\]/);
    const baseText = bracketMatch ? bracketMatch[1] : text;

    return baseText
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Resolve import path to absolute path
  resolveImportPath(documentUri: string, importPath: string): string | null {
    const documentPath = URI.parse(documentUri).fsPath;
    const documentDir = path.dirname(documentPath);

    // Handle relative paths
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const resolved = path.resolve(documentDir, importPath);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    // Try workspace-relative
    if (this.workspaceRoot) {
      const workspaceResolved = path.resolve(this.workspaceRoot, importPath);
      if (fs.existsSync(workspaceResolved)) {
        return workspaceResolved;
      }
    }

    return null;
  }

  // Find document by path (cached or load from disk)
  findDocument(filePath: string): ParsedDocument | null {
    // Check if already loaded
    for (const [uri, doc] of this.documents) {
      if (URI.parse(uri).fsPath === filePath) {
        return doc;
      }
    }

    // Try to load from disk
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const uri = URI.file(filePath).toString();
        return this.parseDocument(uri, content);
      } catch {
        return null;
      }
    }

    return null;
  }

  // Get all BUSY files in workspace
  async scanWorkspace(): Promise<string[]> {
    if (!this.workspaceRoot) return [];

    const files: string[] = [];

    const scan = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scan(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.busy.md') || entry.name.endsWith('.busy'))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore permission errors
      }
    };

    scan(this.workspaceRoot);
    return files;
  }
}
