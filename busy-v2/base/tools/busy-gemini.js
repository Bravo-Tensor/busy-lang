#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const cwd = process.cwd();
const packageRoot = path.resolve(__dirname, '..', '..');
const geminiCli = process.env.BUSY_GEMINI_CLI || 'gemini';
const args = process.argv.slice(2);
const options = {
  checkOnly: false,
  interactive: true,
  modelArgs: [],
  promptArgs: [],
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--check') {
    options.checkOnly = true;
    continue;
  }
  if (arg === '--interactive' || arg === '-i') {
    options.interactive = true;
    continue;
  }
  if (arg === '--non-interactive') {
    options.interactive = false;
    continue;
  }
  if (arg === '-m' || arg === '--model') {
    const value = args[i + 1];
    if (!value || value.startsWith('-')) {
      console.error('[busy-gemini] Expected a model identifier after', arg);
      process.exit(1);
    }
    options.modelArgs.push('-m', value);
    i += 1;
    continue;
  }
  if (arg.startsWith('--model=')) {
    const value = arg.split('=')[1];
    if (!value) {
      console.error('[busy-gemini] --model requires a value');
      process.exit(1);
    }
    options.modelArgs.push('-m', value);
    continue;
  }
  if (arg.startsWith('-m=')) {
    const value = arg.split('=')[1];
    if (!value) {
      console.error('[busy-gemini] -m requires a value');
      process.exit(1);
    }
    options.modelArgs.push('-m', value);
    continue;
  }
  options.promptArgs.push(arg);
}

if (!options.modelArgs.length && process.env.BUSY_GEMINI_MODEL) {
  options.modelArgs.push('-m', process.env.BUSY_GEMINI_MODEL);
}

async function pathExists(targetPath) {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

async function ensureGeminiConfig() {
  const source = path.join(packageRoot, 'GEMINI.md');
  const destination = path.join(cwd, 'GEMINI.md');
  const exists = await pathExists(destination);
  if (exists) return '[onboarding] GEMINI.md already present';
  await fs.promises.copyFile(source, destination);
  return '[onboarding] Copied default GEMINI.md to workspace root';
}

async function ensureCommandTemplates() {
  const sourceCommands = path.join(packageRoot, 'commands');
  const destinationRoot = path.join(cwd, '.gemini');
  const destinationCommands = path.join(destinationRoot, 'commands');
  await fs.promises.mkdir(destinationCommands, { recursive: true });
  await copyDirectory(sourceCommands, destinationCommands);
  return `[onboarding] Synced commands/ into ${destinationCommands}`;
}

async function copyDirectory(sourceDir, destinationDir) {
  const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(sourceDir, entry.name);
      const destinationPath = path.join(destinationDir, entry.name);
      if (entry.isDirectory()) {
        await fs.promises.mkdir(destinationPath, { recursive: true });
        await copyDirectory(sourcePath, destinationPath);
      } else if (entry.isFile()) {
        await fs.promises.copyFile(sourcePath, destinationPath);
      }
    })
  );
}

async function runGeminiCli({ modelArgs, promptArgs, interactive }) {
  return new Promise((resolve, reject) => {
    const geminiArgs = [...modelArgs];
    if (interactive) {
      geminiArgs.push('-i');
    }
    geminiArgs.push('/get-busy');
    geminiArgs.push(...promptArgs);

    const child = spawn(geminiCli, geminiArgs, {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.error('[busy-gemini] Gemini CLI not found. Install it (e.g., `npm install -g gemini-cli`) or set BUSY_GEMINI_CLI to the executable path.');
        resolve(1);
        return;
      }
      reject(err);
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`[busy-gemini] Gemini CLI terminated by signal ${signal}`);
        resolve(1);
      } else {
        resolve(code ?? 0);
      }
    });
  });
}

(async () => {
  try {
    const actions = [];
    actions.push(await ensureGeminiConfig());
    actions.push(await ensureCommandTemplates());
    actions.forEach((message) => console.log(message));

    if (options.checkOnly) {
      console.log('[busy-gemini] Check complete.');
      process.exit(0);
    }

    const modeLabel = options.interactive ? 'interactive' : 'non-interactive';
    console.log(`[busy-gemini] Launching Gemini CLI (${modeLabel}) with /get-busy`);
    const exitCode = await runGeminiCli({
      modelArgs: options.modelArgs,
      promptArgs: options.promptArgs,
      interactive: options.interactive,
    });
    process.exit(exitCode);
  } catch (err) {
    console.error('[busy-gemini] Failed to complete onboarding:', err.message);
    process.exit(1);
  }
})();
