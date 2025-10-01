# busy-lang

Busy language docs, onboarding helpers, and CLI tooling.

## Prerequisites
- Node.js >= 16 (Node 18+ recommended)
- npm 8+ or another Node.js package manager

## Install
Add `busy-lang` to your project (most teams install it as a dev dependency):

```bash
npm install --save-dev busy-lang
```

You can also run the CLI ad-hoc without installing by prefixing commands with `npx busy-lang@latest`.

## Set Up a Workspace
From the root of the workspace you want to prepare, run:

```bash
npx busy-gemini-setup
```

The setup command will:
- ensure `GEMINI.md` exists and contains the canonical Busy core block.
- sync bundled commands into `.gemini/commands/` so Gemini CLI can discover them.
- copy Busy reference documents into `.busy/` for local imports and tooling.

Re-run the command whenever you upgrade `busy-lang` to pull in the latest docs and command definitions.

## Commands
### `busy-gemini-setup`
Bootstraps the current directory with Busy assets and keeps them up to date.

```bash
npx busy-gemini-setup
```

If the package is installed locally you can also invoke it via `npm exec busy-gemini-setup`.

## License
GPL-3.0-or-later
