#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
let watchDir;
let command;
let debounceMs = 250;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if ((arg === '--watch' || arg === '-w') && args[i + 1]) {
    watchDir = args[++i];
  } else if ((arg === '--command' || arg === '-c') && args[i + 1]) {
    command = args[++i];
  } else if ((arg === '--debounce' || arg === '-d') && args[i + 1]) {
    debounceMs = Number(args[++i]);
  }
}

if (!watchDir || !command) {
  console.error('Usage: node file-watcher.js --watch <dir> --command "<shell command>" [--debounce <ms>]');
  process.exit(1);
}

const absoluteWatchDir = path.resolve(watchDir);
if (!fs.existsSync(absoluteWatchDir) || !fs.statSync(absoluteWatchDir).isDirectory()) {
  console.error(`Watcher: expected directory at ${absoluteWatchDir}`);
  process.exit(1);
}

console.log(`[watcher] watching ${absoluteWatchDir}`);
const triggers = new Map();
let running = false;
let pending = false;
let pendingFile = null;
let pendingEvent = null;

function schedule(filePath, eventType) {
  const existing = triggers.get(filePath);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    triggers.delete(filePath);
    runCommand(filePath, eventType);
  }, debounceMs);
  triggers.set(filePath, timer);
}

function runCommand(filePath, eventType) {
  if (running) {
    pending = true;
    pendingFile = filePath;
    pendingEvent = eventType;
    return;
  }
  running = true;
  console.log(`[watcher] ${eventType} ${filePath}`);
  const child = spawn(command, {
    cwd: absoluteWatchDir,
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      WATCHED_EVENT: eventType,
      WATCHED_FILE: filePath,
      WATCH_ROOT: absoluteWatchDir,
    },
  });
  child.on('exit', (code, signal) => {
    running = false;
    if (code === 0) {
      console.log('[watcher] command completed');
    } else {
      console.error(`[watcher] command failed (${code ?? signal ?? 'unknown'})`);
    }
    if (pending) {
      pending = false;
      const nextFile = pendingFile;
      const nextEvent = pendingEvent;
      pendingFile = null;
      pendingEvent = null;
      runCommand(nextFile, nextEvent);
    }
  });
}

try {
  fs.watch(absoluteWatchDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(absoluteWatchDir, filename);
    schedule(fullPath, eventType);
  });
} catch (err) {
  console.error('[watcher] failed to start fs.watch. Recursion may not be supported on this platform.');
  console.error(err.message);
  process.exit(1);
}

process.on('SIGINT', () => {
  console.log('\n[watcher] shutting down');
  process.exit(0);
});
