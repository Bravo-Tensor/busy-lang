"""Run BUSY CLI validation and the library's review playbook; write one report.
Exit codes: 0 pass, 1 findings, 2 incomplete. No BUSY rules live here.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def run(command, cwd, timeout, prompt=None):
    try:
        r = subprocess.run(command, cwd=cwd, input=prompt, text=True,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
        return r.returncode, r.stdout
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 2, str(exc)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='*', type=Path)
    parser.add_argument('--workspace', type=Path, default=Path.cwd())
    parser.add_argument('--busy-repo', type=Path, default=Path(os.environ.get('BUSY_REPO', str(Path.home() / 'Workspace/Repos/busy-lang'))))
    parser.add_argument('--model', default='gpt-5.6-luna')
    parser.add_argument('--report', type=Path, default=Path.cwd() / 'busy-validation-report.md')
    parser.add_argument('--timeout', type=int, default=240)
    args = parser.parse_args()
    root, repo = args.workspace.resolve(), args.busy_repo.resolve()
    report = args.report.resolve()
    lines = ['# BUSY validation report', '', f'Generated: {datetime.now(timezone.utc).isoformat()}', f'Model: {args.model}', '']
    code = 2
    try:
        targets = sorted(set(p.resolve() for p in args.files)) if args.files else sorted(root.rglob('*.busy.md'))
        if args.timeout <= 0 or not targets or any(not p.is_file() or not p.is_relative_to(root) or not p.name.endswith('.busy.md') for p in targets):
            raise ValueError('Provide existing BUSY files inside --workspace and a positive timeout')
        playbook = repo / 'busy/base/review-document.busy.md'
        schema = repo / 'busy/base/review-document.schema.json'
        cli = repo / 'packages/busy-cli/dist/cli/index.js'
        if not all(p.is_file() for p in (playbook, schema, cli)):
            raise ValueError('BUSY checkout must include the review playbook/schema and a built CLI; run npm run build --workspace busy-cli')
        checks = []
        for command in ([['node', str(cli), 'validate', str(p), '--resolve-imports'] for p in targets] + [['node', str(cli), 'check', '--dir', str(root), '--skip-external']]):
            status, output = run(command, root, args.timeout)
            checks.append({'command': command, 'exit_code': status, 'output': output})
            lines += ['## Technical check', '', f'Command: `{command}`', f'Exit code: {status}', '', '````text', output, '````', '']
        with tempfile.TemporaryDirectory(prefix='busy-review-') as directory:
            temp = Path(directory)
            response = temp / 'review.json'
            prompt = ('Run ReviewDocuments from the supplied playbook. Read the target files, required imported context, and core definitions from the paths below. Return its structured review report.\n'
                      + playbook.read_text() + '\n' + json.dumps({'targets': list(map(str, targets)), 'library': str(repo / 'busy'), 'technical_results': checks}))
            command = ['codex', 'exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--disable', 'hooks', '--sandbox', 'read-only', '-m', args.model, '-c', 'model_reasoning_effort="low"', '-c', 'approval_policy="never"', '--output-schema', str(schema), '--output-last-message', str(response), '--cd', str(temp), '-']
            print(f'Reviewing {len(targets)} BUSY files with {args.model}…', file=sys.stderr, flush=True)
            status, output = run(command, temp, args.timeout, prompt)
            if status:
                raise RuntimeError(f'Codex review failed ({status}):\n{output[-6000:]}')
            review = json.loads(response.read_text())
            findings = review['findings']
            lines += ['## Semantic review', '', review['summary'], '']
            for f in findings:
                lines += [f'### {f["severity"]}: {f["file"]}:{f["line"]}', '', f['detail'], '', f'Rule: {f["rule"]}', '', f'Suggestion: {f["suggestion"]}', '']
            lines += ['## Limitations', '', *['- ' + x for x in review['limitations']]]
            code = 1 if any(c['exit_code'] for c in checks) or any(f['severity'] == 'error' for f in findings) else 0
    except (OSError, ValueError, KeyError, TypeError, RuntimeError) as exc:
        lines += ['## Incomplete validation', '', str(exc)]
    result = {0: 'PASS', 1: 'FAIL', 2: 'INCOMPLETE'}[code]
    lines.insert(2, f'**Result: {result}**\n')
    report.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', dir=report.parent, delete=False) as temp:
        temp.write('\n'.join(lines) + '\n')
        staging = Path(temp.name)
    staging.replace(report)
    print(f'{result}: {report}')
    return code


if __name__ == '__main__':
    sys.exit(main())
