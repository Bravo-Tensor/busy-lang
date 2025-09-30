#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const START_MARKER = '------------busy core start------------';
const END_MARKER = '------------busy core end------------';

const cwd = process.cwd();

function resolvePackageRoot() {
  const candidates = [__dirname, path.resolve(__dirname, '..')];
  for (const candidate of candidates) {
    const commandsDir = path.join(candidate, 'commands');
    const baseDir = path.join(candidate, 'base');
    if (fs.existsSync(commandsDir) && fs.existsSync(baseDir)) {
      return candidate;
    }
  }
  throw new Error(`Unable to locate BUSY package assets near ${__dirname}`);
}

const packageRoot = resolvePackageRoot();
const sourceGeminiPath = path.join(packageRoot, 'GEMINI.md');

async function copyDirectory(sourceDir, destinationDir) {
  await fs.promises.mkdir(destinationDir, { recursive: true });
  const entries = await fs.promises.readdir(sourceDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(sourceDir, entry.name);
      const destinationPath = path.join(destinationDir, entry.name);
      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, destinationPath);
      } else if (entry.isFile()) {
        await fs.promises.copyFile(sourcePath, destinationPath);
      }
    })
  );
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function extractCoreBlock(content) {
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    const block = content.slice(startIndex, endIndex + END_MARKER.length);
    return ensureTrailingNewline(block);
  }

  const inner = content.trim();
  const wrappedInner = inner ? `${inner}\n` : '';
  console.warn('[busy-gemini-setup] Busy core markers not found in source GEMINI.md; wrapping entire file.');
  return ensureTrailingNewline(`${START_MARKER}\n${wrappedInner}${END_MARKER}`);
}

function mergeCoreBlock(targetContent, coreBlock) {
  const coreWithNewline = ensureTrailingNewline(coreBlock);

  if (!targetContent) {
    return coreWithNewline;
  }

  const startIndex = targetContent.indexOf(START_MARKER);
  const endIndex = targetContent.indexOf(END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    const afterEndIndex = endIndex + END_MARKER.length;
    return `${targetContent.slice(0, startIndex)}${coreWithNewline}${targetContent.slice(afterEndIndex)}`;
  }

  const separator = targetContent.startsWith('\n') ? '' : '\n\n';
  return `${coreWithNewline}${separator}${targetContent}`;
}

async function syncGeminiCoreBlock() {
  const sourceContent = await fs.promises.readFile(sourceGeminiPath, 'utf8');
  const coreBlock = extractCoreBlock(sourceContent);

  const targetGeminiPath = path.join(cwd, 'GEMINI.md');
  let targetContent = '';
  try {
    targetContent = await fs.promises.readFile(targetGeminiPath, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  const mergedContent = mergeCoreBlock(targetContent, coreBlock);

  if (mergedContent !== targetContent) {
    await fs.promises.mkdir(path.dirname(targetGeminiPath), { recursive: true });
    await fs.promises.writeFile(targetGeminiPath, mergedContent);
    const relativeTargetPath = path.relative(cwd, targetGeminiPath) || 'GEMINI.md';
    console.log(`[busy-gemini-setup] Updated ${relativeTargetPath}`);
  } else {
    console.log('[busy-gemini-setup] GEMINI.md already up to date.');
  }
}

async function setupBusyWorkspace() {
  await syncGeminiCoreBlock();

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
