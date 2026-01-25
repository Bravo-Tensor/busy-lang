import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is built alongside the client in the same package
  const serverModule = context.asAbsolutePath(path.join('dist', 'server', 'server'));

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'busy' },
      { scheme: 'file', pattern: '**/*.busy.md' },
      { scheme: 'file', pattern: '**/*.busy' },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.busy.md'),
    },
  };

  client = new LanguageClient(
    'busyLanguageServer',
    'BUSY Language Server',
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
