"""Wrapper orchestration tests; BUSY rule tests belong in busy-lang."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('validator', Path(__file__).with_name('validate-busy.py'))
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class WrapperTests(unittest.TestCase):
    def exercise(self, technical=0, semantic='pass'):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            workspace = root / 'workspace'
            workspace.mkdir()
            (workspace / 'test.busy.md').write_text('target')
            for name, text in [('busy/base/review-document.busy.md', 'LIBRARY REVIEW OPERATION'), ('busy/base/review-document.schema.json', '{}'), ('packages/busy-cli/dist/cli/index.js', '// CLI')]:
                p = root / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(text)
            report = root / 'report.md'

            def fake(command, cwd, timeout, prompt=None):
                if command[0] == 'node':
                    return technical, 'CLI evidence'
                self.assertIn('LIBRARY REVIEW OPERATION', prompt)
                self.assertIn('CLI evidence', prompt)
                self.assertIn('read-only', command)
                self.assertIn('hooks', command)
                if semantic == 'unavailable':
                    return 1, 'Unavailable'
                result = dict(summary='Review complete', limitations=[], findings=[])
                if semantic == 'error':
                    result['findings'] = [dict(severity='error', file='test.busy.md', line=1, detail='Library finding', rule='Library rule', suggestion='Correction')]
                Path(command[command.index('--output-last-message') + 1]).write_text('invalid' if semantic == 'malformed' else json.dumps(result))
                return 0, ''

            with patch('sys.argv', ['validate', '--workspace', str(workspace), '--busy-repo', str(root), '--report', str(report)]), patch.object(validator, 'run', side_effect=fake), contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                code = validator.main()
            return code, report.read_text()

    def test_success(self):
        self.assertEqual(self.exercise()[0], 0)

    def test_cli_failure_retained(self):
        code, report = self.exercise(technical=1)
        self.assertEqual(code, 1)
        self.assertIn('CLI evidence', report)

    def test_semantic_findings_retained(self):
        self.assertEqual(self.exercise(semantic='error')[0], 1)

    def test_incomplete_never_passes(self):
        for mode in ('unavailable', 'malformed'):
            with self.subTest(mode=mode):
                self.assertEqual(self.exercise(semantic=mode)[0], 2)


if __name__ == '__main__':
    unittest.main()
