import { describe, it, expect } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BusyDocumentManager } from '../document-manager';
import { CompletionProvider } from './completion';
import { HoverProvider } from './hover';

describe('busy-lsp view support consistency', () => {
  it('suggests Params in frontmatter field completions and [View] in Type completions', () => {
    const manager = new BusyDocumentManager();
    const provider = new CompletionProvider(manager);
    const uri = 'file:///workspace/example.busy.md';
    const content = `---
Name: Example View
Type: 

---

# [Imports](#imports-section)
`;
    const document = TextDocument.create(uri, 'busy', 1, content);
    manager.openDocument(uri, content);

    const fieldCompletions = provider.provideCompletions(document, { line: 3, character: 0 });
    expect(fieldCompletions.map((item) => item.label)).toContain('Params');

    const typeCompletions = provider.provideCompletions(document, { line: 2, character: 6 });
    expect(typeCompletions.map((item) => item.label)).toContain('[View]');
  });

  it('suggests Display as a top-level section completion', () => {
    const manager = new BusyDocumentManager();
    const provider = new CompletionProvider(manager);
    const uri = 'file:///workspace/view.busy.md';
    const content = `---
Name: Example View
Type: [View]
Description: Test view
---

# [Imports](#imports-section)

# [Setup](#setup-section)

# [Local Definitions](#local-definitions-section)

# `;
    const document = TextDocument.create(uri, 'busy', 1, content);
    manager.openDocument(uri, content);

    const completions = provider.provideCompletions(document, { line: 12, character: 2 });
    expect(completions.map((item) => item.label)).toContain('# [Display](#display-section)');
  });

  it('shows hover help for the Display section', () => {
    const manager = new BusyDocumentManager();
    const provider = new HoverProvider(manager);
    const uri = 'file:///workspace/view.busy.md';
    const content = `---
Name: Example View
Type: [View]
Description: Test view
---

# [Imports](#imports-section)

# [Display](#display-section)
Some content
`;
    const document = TextDocument.create(uri, 'busy', 1, content);
    manager.openDocument(uri, content);

    const hover = provider.provideHover(document, { line: 8, character: 4 });
    expect(hover?.contents).toBeDefined();
    const value = typeof hover?.contents === 'string'
      ? hover.contents
      : Array.isArray(hover?.contents)
        ? hover.contents[0]?.value ?? ''
        : hover?.contents.value ?? '';
    expect(value).toContain('BUSY Section');
    expect(value).toContain('Display');
    expect(value).toContain('Markdown presentation layout');
  });
});
