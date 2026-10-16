import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { RunProgram } from './program.js';

export const sha256Bytes = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
export async function listSourceFiles(directory: string, excludedDirectories: string[] = []): Promise<string[]> {
  const excluded = new Set(excludedDirectories.map(p => path.resolve(p)));
  const result: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && !excluded.has(path.resolve(file))) result.push(...await listSourceFiles(file, excludedDirectories));
    else if (entry.isFile()) result.push(file);
  }
  return result.sort();
}
export async function fingerprintFiles(root: string, files: string[]): Promise<{ sha256: string; files: [string, string][] }> {
  const rows: [string, string][] = [];
  const realRoot = await fs.realpath(root);
  for (const file of [...files].sort()) {
    const relative = path.relative(root, path.resolve(root, file));
    if (relative.startsWith('../') || path.isAbsolute(relative)) throw new Error('Fingerprint file escapes root: ' + file);
    const realRelative = path.relative(realRoot, await fs.realpath(path.resolve(root, file)));
    if (realRelative.startsWith('../') || path.isAbsolute(realRelative)) throw new Error('Fingerprint symlink escapes root: ' + file);
    rows.push([file, sha256Bytes(await fs.readFile(path.resolve(root, file)))]);
  }
  return { sha256: sha256Bytes(JSON.stringify(rows)), files: rows };
}
export function portableRunProgram(program: RunProgram, root: string): Omit<RunProgram, 'id'> {
  const { id: _id, entryFile, interpretationFile, ...rest } = program;
  return { ...rest, entryFile: path.relative(root, entryFile), interpretationFile: path.relative(root, interpretationFile) };
}
export async function getRunnerIdentity(): Promise<{ packageName: string; packageVersion: string; nodeVersion: string; build: Awaited<ReturnType<typeof fingerprintFiles>> }> {
  const packageRoot = path.resolve(import.meta.dirname, '../..');
  const pkg = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const dist = path.join(packageRoot, 'dist');
  const files = (await listSourceFiles(dist)).map(file => path.relative(dist, file));
  if (!files.includes('runner/program.js')) throw new Error('Runner build is missing');
  return { packageName: pkg.name, packageVersion: pkg.version, nodeVersion: process.version, build: await fingerprintFiles(dist, files) };
}

export async function checkFileFingerprint(root: string, expected: Awaited<ReturnType<typeof fingerprintFiles>>): Promise<void> {
  const actual = await fingerprintFiles(root, expected.files.map(([file]) => file));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('File fingerprint changed');
}
