/**
 * BUSY Language Server - v2.0 IDE Support
 * Provides IDE features for BUSY language files including:
 * - Capability definitions and references
 * - Resource requirement hints
 * - Execution type preview
 * - Auto-completion for capabilities/responsibilities
 */

import { 
  createConnection, ProposedFeatures, InitializeParams, DidChangeConfigurationNotification,
  CompletionItem, CompletionItemKind, TextDocumentPositionParams, TextDocumentSyncKind,
  InitializeResult, HoverParams, Hover, TextDocumentPositionParams as LocationParams, Location, 
  CompletionParams, MarkupKind, Range, Position, Diagnostic, DiagnosticSeverity
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { BusyParser } from '../core/parser';
import { CapabilityDefinition, ResponsibilityDefinition } from '../runtime/capability-resolver';
import { ResourceDefinition } from '../runtime/resource-manager';
import * as yaml from 'yaml';

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Track document state
const documents: Map<string, TextDocument> = new Map();
const capabilities: Map<string, CapabilityDefinition> = new Map();
const responsibilities: Map<string, ResponsibilityDefinition> = new Map();
const resources: Map<string, ResourceDefinition> = new Map();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

interface BusyLanguageServerSettings {
  maxNumberOfProblems: number;
  enableCapabilityCompletion: boolean;
  enableResourceHints: boolean;
  enableExecutionPreview: boolean;
  showResponsibilityVisualization: boolean;
}

const defaultSettings: BusyLanguageServerSettings = {
  maxNumberOfProblems: 1000,
  enableCapabilityCompletion: true,
  enableResourceHints: true,
  enableExecutionPreview: true,
  showResponsibilityVisualization: true
};

let globalSettings: BusyLanguageServerSettings = defaultSettings;
const documentSettings: Map<string, Thenable<BusyLanguageServerSettings>> = new Map();

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['-', '"', '\'', ' ']
      },
      hoverProvider: true,
      definitionProvider: true,
    }
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event: any) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
  
  // Index all BUSY files in the workspace
  indexWorkspaceFiles();
});

connection.onDidChangeConfiguration((change: any) => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = <BusyLanguageServerSettings>(
      (change.settings.busyLanguageServer || defaultSettings)
    );
  }

  // Revalidate all open documents
  documents.forEach(document => {
    validateTextDocument(document);
  });
});

function getDocumentSettings(resource: string): Thenable<BusyLanguageServerSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'busyLanguageServer'
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Document lifecycle
connection.onDidOpenTextDocument((params: any) => {
  const document = TextDocument.create(
    params.textDocument.uri,
    params.textDocument.languageId,
    params.textDocument.version,
    params.textDocument.text
  );
  documents.set(params.textDocument.uri, document);
  validateTextDocument(document);
  indexDocumentDefinitions(document);
});

connection.onDidChangeTextDocument((params: any) => {
  const document = documents.get(params.textDocument.uri);
  if (document) {
    const updatedDocument = TextDocument.update(
      document,
      params.contentChanges,
      params.textDocument.version
    );
    documents.set(params.textDocument.uri, updatedDocument);
    validateTextDocument(updatedDocument);
    indexDocumentDefinitions(updatedDocument);
  }
});

connection.onDidCloseTextDocument((params: any) => {
  documents.delete(params.textDocument.uri);
  documentSettings.delete(params.textDocument.uri);
});

// Completion provider
connection.onCompletion(
  async (params: CompletionParams): Promise<CompletionItem[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const settings = await getDocumentSettings(params.textDocument.uri);
    if (!settings.enableCapabilityCompletion) {
      return [];
    }

    const text = document.getText();
    const position = params.position;
    const context = getCompletionContext(text, position);

    const completions: CompletionItem[] = [];

    switch (context.type) {
      case 'capability-reference':
        // Complete capability names in role definitions
        capabilities.forEach((capability, name) => {
          completions.push({
            label: name,
            kind: CompletionItemKind.Function,
            detail: capability.description,
            documentation: {
              kind: MarkupKind.Markdown,
              value: `**Capability**: ${name}\\n\\n${capability.description}\\n\\n**Method**:\\n\`\`\`\\n${capability.method}\\n\`\`\``
            },
            insertText: `"${name}"`
          });
        });
        break;

      case 'responsibility-reference':
        // Complete responsibility names in role definitions
        responsibilities.forEach((responsibility, name) => {
          completions.push({
            label: name,
            kind: CompletionItemKind.Interface,
            detail: responsibility.description,
            documentation: {
              kind: MarkupKind.Markdown,
              value: `**Responsibility**: ${name}\\n\\n${responsibility.description}\\n\\n**Monitoring**: ${responsibility.monitoringType}`
            },
            insertText: `"${name}"`
          });
        });
        break;

      case 'resource-name':
        // Complete resource names in requirements
        resources.forEach((resource, name) => {
          completions.push({
            label: name,
            kind: CompletionItemKind.Property,
            detail: `Resource: ${resource.characteristics.type || 'unknown'}`,
            documentation: {
              kind: MarkupKind.Markdown,
              value: `**Resource**: ${name}\\n\\n**Characteristics**:\\n${formatCharacteristics(resource.characteristics)}`
            },
            insertText: `"${name}"`
          });
        });
        break;

      case 'characteristics-field':
        // Complete common characteristic names
        const commonCharacteristics = [
          'type', 'capabilities', 'experience_years', 'availability', 
          'capacity', 'location', 'cost_per_hour', 'reliability_score'
        ];
        
        commonCharacteristics.forEach(char => {
          completions.push({
            label: char,
            kind: CompletionItemKind.Field,
            detail: `Characteristic: ${char}`,
            insertText: `${char}: `
          });
        });
        break;

      case 'step-field':
        // Complete step fields including new v2.0 fields
        const stepFields = [
          { name: 'name', value: 'name: ""' },
          { name: 'method', value: 'method: |\\n  ' },
          { name: 'requirements', value: 'requirements:\\n  - name: ""' },
          { name: 'inputs', value: 'inputs:\\n  - name: ""' },
          { name: 'outputs', value: 'outputs:\\n  - name: ""' }
        ];

        stepFields.forEach(field => {
          completions.push({
            label: field.name,
            kind: CompletionItemKind.Keyword,
            detail: `Step field: ${field.name}`,
            insertText: field.value
          });
        });
        break;
    }

    return completions;
  }
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

// Hover provider
connection.onHover(
  async (params: HoverParams): Promise<Hover | null> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }

    const settings = await getDocumentSettings(params.textDocument.uri);
    const position = params.position;
    const wordRange = getWordRangeAtPosition(document, position);
    
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);
    const context = getHoverContext(document, position);

    // Capability hover
    if (context.isCapabilityReference && capabilities.has(word)) {
      const capability = capabilities.get(word)!;
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Capability**: ${word}\\n\\n${capability.description}\\n\\n**Method**:\\n\`\`\`\\n${capability.method}\\n\`\`\`\\n\\n**Inputs**: ${capability.inputs.length}\\n**Outputs**: ${capability.outputs.length}`
        },
        range: wordRange
      };
    }

    // Responsibility hover
    if (context.isResponsibilityReference && responsibilities.has(word)) {
      const responsibility = responsibilities.get(word)!;
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Responsibility**: ${word}\\n\\n${responsibility.description}\\n\\n**Monitoring**: ${responsibility.monitoringType}\\n\\n**Method**:\\n\`\`\`\\n${responsibility.method}\\n\`\`\``
        },
        range: wordRange
      };
    }

    // Resource hover
    if (context.isResourceReference && resources.has(word)) {
      const resource = resources.get(word)!;
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**Resource**: ${word}\\n\\n**Characteristics**:\\n${formatCharacteristics(resource.characteristics)}${resource.extends ? `\\n\\n**Extends**: ${resource.extends}` : ''}`
        },
        range: wordRange
      };
    }

    // Execution type preview
    if (settings.enableExecutionPreview && context.isMethodField) {
      const methodText = getMethodText(document, position);
      if (methodText) {
        const executionHint = analyzeExecutionComplexity(methodText);
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: `**Execution Analysis**\\n\\n${executionHint.analysis}\\n\\n**Suggested Strategy**: ${executionHint.strategy}\\n\\n**Confidence**: ${executionHint.confidence}%`
          }
        };
      }
    }

    return null;
  }
);

// Definition provider
connection.onDefinition(
  (params: LocationParams): Location[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    const position = params.position;
    const wordRange = getWordRangeAtPosition(document, position);
    
    if (!wordRange) {
      return [];
    }

    const word = document.getText(wordRange);
    
    // Find definition across all indexed documents
    const locations: Location[] = [];
    
    documents.forEach((doc, uri) => {
      const definitions = findDefinitionInDocument(doc, word);
      definitions.forEach(def => {
        locations.push({
          uri: uri,
          range: def.range
        });
      });
    });

    return locations;
  }
);

// Document validation
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  try {
    // Parse YAML
    const doc = yaml.parseDocument(text);
    if (doc.errors.length > 0) {
      doc.errors.forEach(error => {
        const diagnostic: Diagnostic = {
          severity: DiagnosticSeverity.Error,
          range: {
            start: textDocument.positionAt(error.pos[0]),
            end: textDocument.positionAt(error.pos[1])
          },
          message: error.message,
          source: 'busy-language-server'
        };
        diagnostics.push(diagnostic);
      });
    }

    // Validate v2.0 structure
    const parsed = doc.toJS();
    if (parsed) {
      validateBusyDocument(parsed, textDocument, diagnostics, settings);
    }

  } catch (error) {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: textDocument.positionAt(0),
        end: textDocument.positionAt(text.length)
      },
      message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: 'busy-language-server'
    };
    diagnostics.push(diagnostic);
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function validateBusyDocument(
  parsed: any, 
  document: TextDocument, 
  diagnostics: Diagnostic[], 
  settings: BusyLanguageServerSettings
): void {
  // Check version
  if (!parsed.version || parsed.version !== '2.0') {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      message: 'Document should use BUSY version "2.0"',
      source: 'busy-language-server'
    });
  }

  // Validate capability references
  if (parsed.role?.capabilities) {
    parsed.role.capabilities.forEach((capName: string, index: number) => {
      if (!capabilities.has(capName)) {
        // Find the exact line where this capability is referenced
        const lines = document.getText().split('\n');
        let targetLine = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`"${capName}"`) || lines[i].includes(`'${capName}'`)) {
            targetLine = i;
            break;
          }
        }
        
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: { 
            start: { line: targetLine, character: 0 }, 
            end: { line: targetLine, character: lines[targetLine]?.length || 0 } 
          },
          message: `Capability '${capName}' is not defined`,
          source: 'busy-language-server'
        });
      }
    });
  }

  // Validate responsibility references
  if (parsed.role?.responsibilities) {
    parsed.role.responsibilities.forEach((respName: string, index: number) => {
      if (!responsibilities.has(respName)) {
        // Find the exact line where this responsibility is referenced
        const lines = document.getText().split('\n');
        let targetLine = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`"${respName}"`) || lines[i].includes(`'${respName}'`)) {
            targetLine = i;
            break;
          }
        }
        
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: { 
            start: { line: targetLine, character: 0 }, 
            end: { line: targetLine, character: lines[targetLine]?.length || 0 } 
          },
          message: `Responsibility '${respName}' is not defined`,
          source: 'busy-language-server'
        });
      }
    });
  }

  // Validate resource requirements
  if (parsed.playbook?.steps) {
    parsed.playbook.steps.forEach((step: any, stepIndex: number) => {
      if (step.requirements) {
        step.requirements.forEach((req: any, reqIndex: number) => {
          if (req.priority) {
            req.priority.forEach((priorityItem: any, priIndex: number) => {
              if (priorityItem.specific && !resources.has(priorityItem.specific)) {
                diagnostics.push({
                  severity: DiagnosticSeverity.Warning,
                  range: { start: { line: stepIndex + reqIndex + priIndex + 20, character: 0 }, end: { line: stepIndex + reqIndex + priIndex + 20, character: 50 } },
                  message: `Resource '${priorityItem.specific}' is not defined`,
                  source: 'busy-language-server'
                });
              }
            });
          }
        });
      }
    });
  }
}

// Index document definitions
function indexDocumentDefinitions(document: TextDocument): void {
  try {
    const text = document.getText();
    const parsed = yaml.parse(text);

    if (!parsed) return;

    // Index capabilities (v2.0 structure)
    if (parsed.capabilities) {
      parsed.capabilities.forEach((cap: any) => {
        // Handle both nested (capability.name) and flat (name) structures
        const capDef = cap.capability || cap;
        if (capDef && capDef.name) {
          capabilities.set(capDef.name, {
            name: capDef.name,
            description: capDef.description || '',
            method: capDef.method || '',
            inputs: capDef.inputs || [],
            outputs: capDef.outputs || []
          });
        }
      });
    }
    
    // Index capabilities from team structure
    if (parsed.team?.capabilities) {
      parsed.team.capabilities.forEach((cap: any) => {
        const capDef = cap.capability || cap;
        if (capDef && capDef.name) {
          capabilities.set(capDef.name, {
            name: capDef.name,
            description: capDef.description || '',
            method: capDef.method || '',
            inputs: capDef.inputs || [],
            outputs: capDef.outputs || []
          });
        }
      });
    }

    // Index responsibilities (v2.0 structure)
    if (parsed.responsibilities) {
      parsed.responsibilities.forEach((resp: any) => {
        const respDef = resp.responsibility || resp;
        if (respDef && respDef.name) {
          responsibilities.set(respDef.name, {
            name: respDef.name,
            description: respDef.description || '',
            method: respDef.method || '',
            inputs: respDef.inputs || [],
            outputs: respDef.outputs || [],
            monitoringType: respDef.monitoringType || 'continuous'
          });
        }
      });
    }
    
    // Index responsibilities from team structure
    if (parsed.team?.responsibilities) {
      parsed.team.responsibilities.forEach((resp: any) => {
        const respDef = resp.responsibility || resp;
        if (respDef && respDef.name) {
          responsibilities.set(respDef.name, {
            name: respDef.name,
            description: respDef.description || '',
            method: respDef.method || '',
            inputs: respDef.inputs || [],
            outputs: respDef.outputs || [],
            monitoringType: respDef.monitoringType || 'continuous'
          });
        }
      });
    }

    // Index resources (v2.0 structure)
    if (parsed.resources) {
      parsed.resources.forEach((res: any) => {
        const resDef = res.resource || res;
        if (resDef && resDef.name) {
          resources.set(resDef.name, {
            name: resDef.name,
            extends: resDef.extends,
            characteristics: resDef.characteristics || {}
          });
        }
      });
    }
    
    // Index resources from team structure
    if (parsed.team?.resources) {
      parsed.team.resources.forEach((res: any) => {
        const resDef = res.resource || res;
        if (resDef && resDef.name) {
          resources.set(resDef.name, {
            name: resDef.name,
            extends: resDef.extends,
            characteristics: resDef.characteristics || {}
          });
        }
      });
    }

  } catch (error) {
    // Ignore parsing errors during indexing
  }
}

// Helper functions
function getCompletionContext(text: string, position: Position): { type: string; context?: any } {
  const lines = text.split('\n');
  const currentLine = lines[position.line] || '';
  const beforeCursor = currentLine.substring(0, position.character);

  // Check context patterns
  if (beforeCursor.includes('capabilities:') || beforeCursor.match(/- $/)) {
    return { type: 'capability-reference' };
  }
  
  if (beforeCursor.includes('responsibilities:')) {
    return { type: 'responsibility-reference' };
  }
  
  if (beforeCursor.includes('requirements:') || beforeCursor.includes('name:')) {
    return { type: 'resource-name' };
  }
  
  if (beforeCursor.includes('characteristics:')) {
    return { type: 'characteristics-field' };
  }
  
  if (beforeCursor.includes('step:') || beforeCursor.includes('steps:')) {
    return { type: 'step-field' };
  }

  return { type: 'unknown' };
}

function getHoverContext(document: TextDocument, position: Position): {
  isCapabilityReference: boolean;
  isResponsibilityReference: boolean; 
  isResourceReference: boolean;
  isMethodField: boolean;
} {
  const text = document.getText();
  const lines = text.split('\n');
  
  // Look at surrounding lines for context
  let context = '';
  for (let i = Math.max(0, position.line - 5); i <= Math.min(lines.length - 1, position.line + 5); i++) {
    context += lines[i] + '\n';
  }

  return {
    isCapabilityReference: context.includes('capabilities:'),
    isResponsibilityReference: context.includes('responsibilities:'),
    isResourceReference: context.includes('requirements:') || context.includes('specific:'),
    isMethodField: context.includes('method:')
  };
}

function getWordRangeAtPosition(document: TextDocument, position: Position): Range | null {
  const text = document.getText();
  const lines = text.split('\n');
  const line = lines[position.line];
  
  if (!line) return null;

  const wordRegex = /[\w-]+/g;
  let match;
  
  while ((match = wordRegex.exec(line)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;
    
    if (position.character >= start && position.character <= end) {
      return {
        start: { line: position.line, character: start },
        end: { line: position.line, character: end }
      };
    }
  }

  return null;
}

function getMethodText(document: TextDocument, position: Position): string | null {
  const text = document.getText();
  const lines = text.split('\n');
  
  // Look for method: | or method: > blocks
  for (let i = position.line; i >= 0; i--) {
    const line = lines[i];
    if (line.includes('method:')) {
      // Collect multi-line method text
      let methodText = '';
      for (let j = i + 1; j < lines.length; j++) {
        const methodLine = lines[j];
        if (methodLine.match(/^\s{2,}/)) {
          methodText += methodLine.trim() + ' ';
        } else {
          break;
        }
      }
      return methodText.trim();
    }
  }
  
  return null;
}

function analyzeExecutionComplexity(methodText: string): {
  analysis: string;
  strategy: string;
  confidence: number;
} {
  const algorithmicKeywords = ['calculate', 'compute', 'parse', 'validate', 'transform'];
  const aiKeywords = ['analyze', 'classify', 'interpret', 'understand', 'generate'];
  const humanKeywords = ['review', 'approve', 'decide', 'negotiate', 'communicate'];

  let algorithmicScore = 0;
  let aiScore = 0;
  let humanScore = 0;

  const words = methodText.toLowerCase().split(/\s+/);
  
  words.forEach(word => {
    if (algorithmicKeywords.some(k => word.includes(k))) algorithmicScore++;
    if (aiKeywords.some(k => word.includes(k))) aiScore++;
    if (humanKeywords.some(k => word.includes(k))) humanScore++;
  });

  const total = algorithmicScore + aiScore + humanScore;
  const maxScore = Math.max(algorithmicScore, aiScore, humanScore);
  
  let strategy = 'human';
  let analysis = 'Requires human judgment and decision-making';
  
  if (maxScore === algorithmicScore && algorithmicScore > 0) {
    strategy = 'algorithmic';
    analysis = 'Can be implemented with deterministic algorithms';
  } else if (maxScore === aiScore && aiScore > 0) {
    strategy = 'ai';  
    analysis = 'Requires AI analysis and interpretation';
  }

  const confidence = total > 0 ? Math.round((maxScore / total) * 100) : 50;

  return { analysis, strategy, confidence };
}

function formatCharacteristics(characteristics: Record<string, any>): string {
  return Object.entries(characteristics)
    .map(([key, value]) => `- **${key}**: ${JSON.stringify(value)}`)
    .join('\\n');
}

function findDefinitionInDocument(document: TextDocument, word: string): Array<{ range: Range }> {
  const text = document.getText();
  const definitions: Array<{ range: Range }> = [];
  
  // Look for capability/responsibility/resource definitions
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    if (line.includes(`name: "${word}"`) || line.includes(`name: ${word}`)) {
      definitions.push({
        range: {
          start: { line: lineIndex, character: 0 },
          end: { line: lineIndex, character: line.length }
        }
      });
    }
  });

  return definitions;
}

// Workspace indexing
async function indexWorkspaceFiles(): Promise<void> {
  try {
    const workspaceFolders = await connection.workspace.getWorkspaceFolders();
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.replace('file://', '');
      await indexDirectoryRecursively(folderPath, fs, path);
    }
    
    connection.console.log(`Indexed workspace: ${capabilities.size} capabilities, ${responsibilities.size} responsibilities, ${resources.size} resources`);
  } catch (error) {
    connection.console.log(`Error indexing workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function indexDirectoryRecursively(dirPath: string, fs: any, path: any): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await indexDirectoryRecursively(fullPath, fs, path);
      } else if (entry.name.endsWith('.busy')) {
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const document = TextDocument.create(
            `file://${fullPath}`,
            'busy',
            1,
            content
          );
          indexDocumentDefinitions(document);
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
}

// Start the server
connection.listen();