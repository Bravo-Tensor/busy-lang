import { describe, expect, it } from 'vitest';
import { validateHeadingLinks } from '../validation/heading-links.js';
const file = '/workspace/test.busy.md';
describe('heading self links', () => {
  it.each([
    '## [ReviewProject](#reviewproject)',
    '[R]: #reviewproject\n## [ReviewProject][R]',
    '[ReviewProject]: #reviewproject\n## [ReviewProject]',
    '[ReviewProject]: #reviewproject\n## [ReviewProject][]',
    '## ReviewProject\n## [ReviewProject](./test.busy.md#reviewproject-1)',
    '[ReviewProject](#reviewproject)\n-----',
  ])('rejects self-linked headings: %s', text => expect(validateHeadingLinks(text, file)).toHaveLength(1));
  it.each([
    'Run [ReviewProject](#reviewproject).\n## ReviewProject',
    'Run [ReviewProject](#reviewproject).\n## [ReviewProject](../core/operation.busy.md)',
    '[Imports]: ../core/document.busy.md#imports-section\n# [Imports]',
    '```md\n## [ReviewProject](#reviewproject)\n```',
    '## [ReviewProject](other.busy.md#reviewproject)',
    '## [ReviewProject](https://example.com/#reviewproject)',
  ])('accepts references that are not self-linked headings: %s', text => expect(validateHeadingLinks(text, file)).toEqual([]));
});
