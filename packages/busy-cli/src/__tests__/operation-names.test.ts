import { describe, expect, it } from 'vitest';
import { validateOperationNames } from '../validation/operation-names.js';

describe('Operation lower camelCase names', () => {
  it.each(['PrepareUpdate', 'prepare_update', 'prepare-update', 'prepare update', '1prepare'])('rejects %s with a line number', name => {
    expect(validateOperationNames(`# Operations\n## ${name}`)).toEqual([expect.stringContaining('Line 2:')]);
  });
  it.each(['prepareUpdate', 'preparePersonalDailyCheckin', 'prepareMondayL10', 'review'])('accepts %s', name => {
    expect(validateOperationNames(`# [Operations](core/document.busy.md#operations-section)\n## [${name}](core/operation.busy.md)`)).toEqual([]);
  });
  it('recognizes reference-style Operations headings', () => {
    expect(validateOperationNames('[Operations]: core/document.busy.md#operations-section\n# [Operations]\n## BadName')).toHaveLength(1);
  });
  it('recognizes typed operations outside Operations', () => {
    expect(validateOperationNames('[Op]: core/operation.busy.md\n## [BadName][Op]')).toHaveLength(1);
  });
  it('ignores code and stops at the next top-level section', () => {
    expect(validateOperationNames('# Operations\n```md\n## BadName\n```\n~~~md\n## BadName\n~~~\n\n    ## BadName\n\n# Display\n## Ordinary output heading')).toEqual([]);
  });
  it('ignores Tool actions and local concepts', () => {
    expect(validateOperationNames('# [Tools]\n## SEND_EMAIL\n# Local Definitions\n## Project')).toEqual([]);
  });
  it('does not treat a fenced Operations heading as a section', () => {
    expect(validateOperationNames('```md\n# Operations\n```\n## Ordinary output heading')).toEqual([]);
  });
});
