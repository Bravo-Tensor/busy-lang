#!/usr/bin/env node
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  Hover,
  Definition,
  DocumentSymbol,
  SymbolKind,
  DiagnosticSeverity,
  Diagnostic,
  MarkupKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { BusyDocumentManager } from './document-manager';
import { DiagnosticsProvider } from './providers/diagnostics';
import { CompletionProvider } from './providers/completion';
import { HoverProvider } from './providers/hover';
import { DefinitionProvider } from './providers/definition';
import { SymbolProvider } from './providers/symbols';
import { CodeActionProvider } from './providers/codeActions';

// Create connection and document manager
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const documentManager = new BusyDocumentManager();

// Providers
let diagnosticsProvider: DiagnosticsProvider;
let completionProvider: CompletionProvider;
let hoverProvider: HoverProvider;
let definitionProvider: DefinitionProvider;
let symbolProvider: SymbolProvider;
let codeActionProvider: CodeActionProvider;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const workspaceFolders = params.workspaceFolders;

  // Initialize document manager with workspace
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootUri = workspaceFolders[0].uri;
    const rootPath = URI.parse(rootUri).fsPath;
    documentManager.setWorkspaceRoot(rootPath);
  }

  // Initialize providers
  diagnosticsProvider = new DiagnosticsProvider(documentManager);
  completionProvider = new CompletionProvider(documentManager);
  hoverProvider = new HoverProvider(documentManager);
  definitionProvider = new DefinitionProvider(documentManager);
  symbolProvider = new SymbolProvider(documentManager);
  codeActionProvider = new CodeActionProvider();

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['[', ':', '#', '/'],
      },
      hoverProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeActionProvider: {
        codeActionKinds: ['quickfix'],
      },
    },
  };
});

connection.onInitialized(() => {
  connection.console.log('BUSY Language Server initialized');
});

// Document lifecycle
documents.onDidOpen((event) => {
  const uri = event.document.uri;
  if (isBusyDocument(uri)) {
    documentManager.openDocument(uri, event.document.getText());
    validateDocument(event.document);
  }
});

documents.onDidChangeContent((change) => {
  const uri = change.document.uri;
  if (isBusyDocument(uri)) {
    documentManager.updateDocument(uri, change.document.getText());
    validateDocument(change.document);
  }
});

documents.onDidClose((event) => {
  const uri = event.document.uri;
  documentManager.closeDocument(uri);
  connection.sendDiagnostics({ uri, diagnostics: [] });
});

// Validation
async function validateDocument(document: TextDocument): Promise<void> {
  const diagnostics = await diagnosticsProvider.validate(document);
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

// Completion
connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document || !isBusyDocument(document.uri)) {
    return [];
  }
  return completionProvider.provideCompletions(document, params.position);
});

connection.onCompletionResolve((item) => {
  return completionProvider.resolveCompletion(item);
});

// Hover
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document || !isBusyDocument(document.uri)) {
    return null;
  }
  return hoverProvider.provideHover(document, params.position);
});

// Go to Definition
connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document || !isBusyDocument(document.uri)) {
    return null;
  }
  return definitionProvider.provideDefinition(document, params.position);
});

// Document Symbols (Outline)
connection.onDocumentSymbol((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document || !isBusyDocument(document.uri)) {
    return [];
  }
  return symbolProvider.provideDocumentSymbols(document);
});

// Workspace Symbols
connection.onWorkspaceSymbol((params) => {
  return symbolProvider.provideWorkspaceSymbols(params.query);
});

// Code Actions (Quick Fixes)
connection.onCodeAction((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document || !isBusyDocument(document.uri)) {
    return [];
  }
  return codeActionProvider.provideCodeActions(document, params.range, params.context.diagnostics);
});

// Helper to check if a document is a BUSY file
function isBusyDocument(uri: string): boolean {
  return uri.endsWith('.busy.md') || uri.endsWith('.busy');
}

// Start listening
documents.listen(connection);
connection.listen();
