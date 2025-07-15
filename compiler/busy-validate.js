#!/usr/bin/env node

/**
 * BUSY Compiler CLI - Quick validation wrapper
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const targetPath = args[0] || '../examples/solo-photography-business';

console.log('🚀 BUSY Language Compiler v0.1.0');
console.log('Running validation against:', targetPath);
console.log('');

// Run the TypeScript validation script
const scriptPath = path.join(__dirname, 'src', 'quick-validate.ts');
const child = spawn('npx', ['ts-node', scriptPath, targetPath], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('error', (error) => {
  console.error('Failed to start validation:', error.message);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code);
});