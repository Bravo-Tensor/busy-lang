#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const packageRoot = path.resolve(__dirname, '..');

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

async function setupBusyWorkspace() {
  // Copy commands to .gemini/commands
  const sourceCommands = path.join(packageRoot, 'commands');
  const destinationGeminiCommands = path.join(cwd, '.gemini', 'commands');
  await fs.promises.mkdir(destinationGeminiCommands, { recursive: true });
  await copyDirectory(sourceCommands, destinationGeminiCommands);
  console.log(`[busy-gemini-setup] Synced commands to ${destinationGeminiCommands}`);

  // Copy busy files to .busy
  const destinationBusy = path.join(cwd, '.busy');
  await fs.promises.mkdir(destinationBusy, { recursive: true });

  const filesToCopy = ['base', 'core', 'commands', 'GEMINI.md'];

  for (const file of filesToCopy) {
    const sourcePath = path.join(packageRoot, file);
    const destinationPath = path.join(destinationBusy, file);
    const stats = await fs.promises.stat(sourcePath);
    if (stats.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await fs.promises.copyFile(sourcePath, destinationPath);
    }
  }
  console.log(`[busy-gemini-setup] Synced busy files to ${destinationBusy}`);
}

(async () => {
  try {
    await setupBusyWorkspace();
    console.log('[busy-gemini-setup] Workspace setup complete.');
    process.exit(0);
  } catch (err) {
    console.error('[busy-gemini-setup] Failed to setup workspace:', err.message);
    process.exit(1);
  }
})();