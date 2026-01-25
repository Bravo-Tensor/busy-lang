import {
  CodeAction,
  CodeActionKind,
  Diagnostic,
  Range,
  TextEdit,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class CodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range,
    diagnostics: Diagnostic[]
  ): CodeAction[] {
    const actions: CodeAction[] = [];

    for (const diagnostic of diagnostics) {
      // Handle case mismatch suggestions (BUSY040 with suggestion data)
      if (diagnostic.code === 'BUSY040' && diagnostic.data?.suggestion) {
        const suggestion = diagnostic.data.suggestion as string;
        const editRange = diagnostic.data.range as Range || diagnostic.range;

        actions.push({
          title: `Change to [${suggestion}]`,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          isPreferred: true,
          edit: {
            changes: {
              [document.uri]: [
                TextEdit.replace(editRange, `[${suggestion}]`),
              ],
            },
          },
        });
      }
    }

    return actions;
  }
}
