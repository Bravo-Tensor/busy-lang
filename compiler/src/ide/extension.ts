/**
 * BUSY Language VS Code Extension
 * Provides IDE integration for BUSY v2.0 language files
 */

import * as path from 'path';
import { workspace, ExtensionContext, window, commands, ViewColumn } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Server module path
  const serverModule = context.asAbsolutePath(
    path.join('out', 'ide', 'language-server.js')
  );

  // Debug options for server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // Server options
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'busy' }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.busy')
    }
  };

  // Create language client
  client = new LanguageClient(
    'busyLanguageServer',
    'BUSY Language Server',
    serverOptions,
    clientOptions
  );

  // Register commands
  registerCommands(context);

  // Start the client
  client.start().then(() => {
    console.log('BUSY Language Server started successfully');
  }).catch((error) => {
    console.error('Failed to start BUSY Language Server:', error);
    window.showErrorMessage(`Failed to start BUSY Language Server: ${error.message}`);
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

function registerCommands(context: ExtensionContext) {
  // Show execution strategy preview
  const showExecutionPreview = commands.registerCommand('busy.showExecutionPreview', async () => {
    const editor = window.activeTextEditor;
    if (!editor) {
      window.showErrorMessage('No active BUSY file');
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'busy') {
      window.showErrorMessage('Current file is not a BUSY file');
      return;
    }

    // Create webview panel for execution preview
    const panel = window.createWebviewPanel(
      'busyExecutionPreview',
      'BUSY Execution Strategy Preview',
      ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = getExecutionPreviewHTML(document.fileName);
  });

  // Validate BUSY file
  const validateFile = commands.registerCommand('busy.validateFile', async () => {
    const editor = window.activeTextEditor;
    if (!editor) {
      window.showErrorMessage('No active BUSY file');
      return;
    }

    // Trigger validation through language server
    await commands.executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri);
    window.showInformationMessage('BUSY file validation completed');
  });

  // Show resource allocation graph
  const showResourceGraph = commands.registerCommand('busy.showResourceGraph', async () => {
    const editor = window.activeTextEditor;
    if (!editor) {
      window.showErrorMessage('No active BUSY file');
      return;
    }

    const panel = window.createWebviewPanel(
      'busyResourceGraph',
      'BUSY Resource Allocation Graph',
      ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = getResourceGraphHTML(editor.document.fileName);
  });

  // Migrate from v1.0 to v2.0
  const migrateFromV1 = commands.registerCommand('busy.migrateFromV1', async () => {
    const editor = window.activeTextEditor;
    if (!editor) {
      window.showErrorMessage('No active BUSY file');
      return;
    }

    const document = editor.document;
    const text = document.getText();

    // Check if it's a v1.0 file
    if (!text.includes('version: "1.0') && !text.includes("version: '1.0")) {
      window.showWarningMessage('File does not appear to be BUSY v1.0 format');
      return;
    }

    // Show migration guide
    const panel = window.createWebviewPanel(
      'busyMigrationGuide',
      'BUSY v1.0 to v2.0 Migration Guide',
      ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = getMigrationGuideHTML();
  });

  context.subscriptions.push(
    showExecutionPreview,
    validateFile,
    showResourceGraph,
    migrateFromV1
  );
}

function getExecutionPreviewHTML(fileName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BUSY Execution Strategy Preview</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .strategy-card {
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 16px;
                margin: 12px 0;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
            }
            .strategy-header {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
            }
            .strategy-icon {
                margin-right: 8px;
                width: 20px;
                height: 20px;
            }
            .confidence-bar {
                width: 100%;
                height: 8px;
                background-color: var(--vscode-progressBar-background);
                border-radius: 4px;
                overflow: hidden;
                margin: 8px 0;
            }
            .confidence-fill {
                height: 100%;
                transition: width 0.3s ease;
            }
            .high-confidence { background-color: var(--vscode-testing-iconPassed); }
            .medium-confidence { background-color: var(--vscode-testing-iconQueued); }
            .low-confidence { background-color: var(--vscode-testing-iconFailed); }
            .fallback-chain {
                display: flex;
                align-items: center;
                margin: 16px 0;
            }
            .fallback-step {
                padding: 8px 16px;
                border: 1px solid var(--vscode-button-border);
                border-radius: 4px;
                margin-right: 8px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            .fallback-arrow {
                margin: 0 8px;
                color: var(--vscode-descriptionForeground);
            }
        </style>
    </head>
    <body>
        <h1>🚀 Execution Strategy Preview</h1>
        <p><strong>File:</strong> ${fileName}</p>
        
        <div class="strategy-card">
            <div class="strategy-header">
                <span class="strategy-icon">⚡</span>
                Algorithmic Execution
            </div>
            <p>Deterministic code execution with predictable performance</p>
            <div class="confidence-bar">
                <div class="confidence-fill high-confidence" style="width: 85%"></div>
            </div>
            <p><strong>Confidence:</strong> 85% | <strong>Expected Duration:</strong> <100ms</p>
        </div>

        <div class="strategy-card">
            <div class="strategy-header">
                <span class="strategy-icon">🤖</span>
                AI Execution
            </div>
            <p>AI-powered processing for complex analysis and interpretation</p>
            <div class="confidence-bar">
                <div class="confidence-fill medium-confidence" style="width: 65%"></div>
            </div>
            <p><strong>Confidence:</strong> 65% | <strong>Expected Duration:</strong> 2-5s</p>
        </div>

        <div class="strategy-card">
            <div class="strategy-header">
                <span class="strategy-icon">👤</span>
                Human Execution
            </div>
            <p>Human judgment and decision-making for complex scenarios</p>
            <div class="confidence-bar">
                <div class="confidence-fill high-confidence" style="width: 95%"></div>
            </div>
            <p><strong>Confidence:</strong> 95% | <strong>Expected Duration:</strong> Minutes to hours</p>
        </div>

        <h2>🔄 Fallback Chain</h2>
        <div class="fallback-chain">
            <div class="fallback-step">Algorithmic</div>
            <span class="fallback-arrow">→</span>
            <div class="fallback-step">AI</div>
            <span class="fallback-arrow">→</span>
            <div class="fallback-step">Human</div>
        </div>

        <h2>📊 Method Analysis</h2>
        <div class="strategy-card">
            <p><strong>Complexity Score:</strong> Medium</p>
            <p><strong>Keywords Detected:</strong> calculate, review, validate, approve</p>
            <p><strong>Recommended Strategy:</strong> Algorithmic with AI fallback</p>
            <p><strong>Resource Requirements:</strong> Standard CPU, no special hardware needed</p>
        </div>
    </body>
    </html>
  `;
}

function getResourceGraphHTML(fileName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BUSY Resource Allocation Graph</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .resource-node {
                border: 2px solid var(--vscode-button-border);
                border-radius: 8px;
                padding: 12px;
                margin: 8px;
                display: inline-block;
                min-width: 150px;
                text-align: center;
                background-color: var(--vscode-button-background);
            }
            .resource-type-person { border-color: #4CAF50; }
            .resource-type-tool { border-color: #2196F3; }
            .resource-type-system { border-color: #FF9800; }
            
            .allocation-status {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-top: 8px;
            }
            .status-available { background-color: rgba(76, 175, 80, 0.2); }
            .status-allocated { background-color: rgba(255, 152, 0, 0.2); }
            .status-busy { background-color: rgba(244, 67, 54, 0.2); }
            
            .priority-chain {
                margin: 16px 0;
                padding: 12px;
                border-left: 4px solid var(--vscode-textLink-foreground);
                background-color: var(--vscode-editor-inactiveSelectionBackground);
            }
            
            .requirement {
                margin: 8px 0;
                padding: 8px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <h1>🗂️ Resource Allocation Graph</h1>
        <p><strong>File:</strong> ${fileName}</p>
        
        <h2>Available Resources</h2>
        <div class="resources-container">
            <div class="resource-node resource-type-person">
                <h3>👤 Jane Doe</h3>
                <p><strong>Type:</strong> Senior Sales Rep</p>
                <p><strong>Capabilities:</strong> qualify-lead, close-deals</p>
                <div class="allocation-status status-available">Available</div>
            </div>
            
            <div class="resource-node resource-type-person">
                <h3>👤 John Smith</h3>
                <p><strong>Type:</strong> Junior Sales Rep</p>
                <p><strong>Capabilities:</strong> qualify-lead</p>
                <div class="allocation-status status-allocated">Allocated</div>
            </div>
            
            <div class="resource-node resource-type-tool">
                <h3>🔧 Salesforce CRM</h3>
                <p><strong>Type:</strong> Software Tool</p>
                <p><strong>Capabilities:</strong> data-storage, reporting</p>
                <div class="allocation-status status-available">Available</div>
            </div>
            
            <div class="resource-node resource-type-system">
                <h3>💻 Meeting Room A</h3>
                <p><strong>Type:</strong> Physical Space</p>
                <p><strong>Capacity:</strong> 8 people</p>
                <div class="allocation-status status-busy">Busy until 3 PM</div>
            </div>
        </div>

        <h2>🎯 Priority Chains</h2>
        
        <div class="priority-chain">
            <h3>Sales Representative Requirement</h3>
            <div class="requirement">
                <strong>1st Priority:</strong> jane_doe (Specific)
                <span style="color: var(--vscode-testing-iconPassed);">✅ Available</span>
            </div>
            <div class="requirement">
                <strong>2nd Priority:</strong> experience_years > 2
                <span style="color: var(--vscode-descriptionForeground);">⚠️ Fallback</span>
            </div>
            <div class="requirement">
                <strong>3rd Priority:</strong> capabilities: [qualify-lead]
                <span style="color: var(--vscode-testing-iconFailed);">❌ Emergency Only</span>
            </div>
        </div>

        <div class="priority-chain">
            <h3>Meeting Space Requirement</h3>
            <div class="requirement">
                <strong>1st Priority:</strong> meeting_room_a (Specific)
                <span style="color: var(--vscode-testing-iconFailed);">❌ Busy</span>
            </div>
            <div class="requirement">
                <strong>2nd Priority:</strong> capacity >= 4
                <span style="color: var(--vscode-testing-iconPassed);">✅ Room B Available</span>
            </div>
        </div>

        <h2>📈 Utilization Statistics</h2>
        <div class="stats-container">
            <p><strong>Total Resources:</strong> 15</p>
            <p><strong>Currently Allocated:</strong> 6 (40%)</p>
            <p><strong>Available:</strong> 9 (60%)</p>
            <p><strong>Average Allocation Time:</strong> 2.5 hours</p>
        </div>
    </body>
    </html>
  `;
}

function getMigrationGuideHTML(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BUSY v1.0 to v2.0 Migration Guide</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                line-height: 1.6;
            }
            .migration-step {
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 16px;
                margin: 16px 0;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
            }
            .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 12px;
                margin: 8px 0;
                font-family: var(--vscode-editor-font-family);
                overflow-x: auto;
            }
            .before-after {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin: 16px 0;
            }
            .before, .after {
                padding: 12px;
                border-radius: 4px;
            }
            .before {
                background-color: rgba(244, 67, 54, 0.1);
                border-left: 4px solid #f44336;
            }
            .after {
                background-color: rgba(76, 175, 80, 0.1);
                border-left: 4px solid #4caf50;
            }
            .checklist {
                list-style: none;
                padding: 0;
            }
            .checklist li {
                padding: 4px 0;
            }
            .checklist li:before {
                content: "☐ ";
                margin-right: 8px;
            }
        </style>
    </head>
    <body>
        <h1>🔄 BUSY v1.0 to v2.0 Migration Guide</h1>
        
        <div class="migration-step">
            <h2>📋 Migration Overview</h2>
            <p>BUSY v2.0 introduces several key improvements:</p>
            <ul>
                <li><strong>Capability/Responsibility Model:</strong> Interface-driven architecture</li>
                <li><strong>Runtime Execution Strategy:</strong> Automatic fallback chains</li>
                <li><strong>Resource Management:</strong> First-class resource concepts</li>
                <li><strong>Method Field:</strong> Unified execution instructions</li>
            </ul>
        </div>

        <div class="migration-step">
            <h2>1️⃣ Version Declaration</h2>
            <div class="before-after">
                <div class="before">
                    <h4>❌ v1.0</h4>
                    <div class="code-block">version: "1.0.0"</div>
                </div>
                <div class="after">
                    <h4>✅ v2.0</h4>
                    <div class="code-block">version: "2.0"</div>
                </div>
            </div>
        </div>

        <div class="migration-step">
            <h2>2️⃣ Task → Step + Capability Migration</h2>
            <div class="before-after">
                <div class="before">
                    <h4>❌ v1.0 Task Definition</h4>
                    <div class="code-block">task:
  name: "qualify_lead"
  execution_type: "human"
  ui_type: "form"
  agent_prompt: "Review lead..."</div>
                </div>
                <div class="after">
                    <h4>✅ v2.0 Capability + Step</h4>
                    <div class="code-block">capability:
  name: "qualify-lead"
  method: |
    Review lead information and score...
    
step:
  name: "qualify_lead"
  method: |
    Review lead and determine qualification</div>
                </div>
            </div>
        </div>

        <div class="migration-step">
            <h2>3️⃣ Resource Requirements</h2>
            <div class="before-after">
                <div class="before">
                    <h4>❌ v1.0 Implicit Resources</h4>
                    <div class="code-block">resources:
  - type: "people"
    allocation: 2</div>
                </div>
                <div class="after">
                    <h4>✅ v2.0 Explicit Requirements</h4>
                    <div class="code-block">requirements:
  - name: "sales_rep"
    priority:
      - specific: "jane_doe"
      - characteristics:
          experience_years: ">2"</div>
                </div>
            </div>
        </div>

        <div class="migration-step">
            <h2>✅ Migration Checklist</h2>
            <ul class="checklist">
                <li>Update version to "2.0"</li>
                <li>Extract task definitions into capability files</li>
                <li>Convert responsibility strings to responsibility definitions</li>
                <li>Update role definitions to use capability/responsibility references</li>
                <li>Remove execution_type, ui_type, agent_prompt fields from steps</li>
                <li>Add method field to all steps with detailed instructions</li>
                <li>Define resources explicitly with characteristics</li>
                <li>Add resource requirements to steps with priority chains</li>
                <li>Update import statements for new syntax</li>
                <li>Test compilation with v2.0 compiler</li>
                <li>Validate runtime behavior matches expectations</li>
            </ul>
        </div>

        <div class="migration-step">
            <h2>🎯 Benefits After Migration</h2>
            <ul>
                <li><strong>Cleaner Separation:</strong> Business logic separated from implementation details</li>
                <li><strong>Better Reusability:</strong> Capabilities can be shared across teams/processes</li>
                <li><strong>Runtime Flexibility:</strong> Same specs work with different execution strategies</li>
                <li><strong>Resource Evolution:</strong> Can start specific and become abstract over time</li>
                <li><strong>Graceful Degradation:</strong> Built-in fallback chains for resilience</li>
            </ul>
        </div>
    </body>
    </html>
  `;
}