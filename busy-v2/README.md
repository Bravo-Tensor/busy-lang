# busy-lang

Busy language docs, onboarding helpers, and CLI tooling.

## Prerequisites
- Node.js >= 16
- Gemini CLI installed and on your `PATH` (for example `npm install -g gemini-cli`)

## Installation
```bash
npm install busy-lang
```

## Commands
### `busy-gemini`
Prepares the current workspace (copies the bundled `GEMINI.md` and syncs `commands/` into `.gemini/commands/`) and then launches the Gemini CLI with `/get-busy`.

```bash
npx busy-gemini
```

Pass an initial prompt to send it straight to `/get-busy`:

```bash
npx busy-gemini "Help me plan a BUSY onboarding workshop"
```

Select a model with `-m`/`--model` or by setting `BUSY_GEMINI_MODEL`:

```bash
npx busy-gemini -m gemini-2.5-flash "Summarize our BUSY roles"
```

The command runs Gemini CLI in non-interactive mode by default; add `--interactive` (or `-i`) to stay in the chat interface after the initial response.

Pass `--check` to only perform the onboarding sync without launching Gemini.

### `busy-watch`
Watches a directory and runs the command you provide whenever files change.

```bash
npx busy-watch --watch ./src --command "npm test" --debounce 400
```

## License
GPL-3.0-or-later
