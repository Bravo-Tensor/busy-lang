import fs from 'node:fs/promises';
import path from 'node:path';
import type { Nodes } from 'mdast';
import { parseMarkdown } from '../parsers/markdown.js';
import { sha256Bytes } from './identity.js';

export interface GuidancePolicy {
  version: number;
  roots: string[];
  pinnedLeaves: string[];
  excluded: string[];
  maxDocuments?: number;
  remoteReferences?: string;
  outsideBoundary?: string;
}
export interface GuidanceFile { source: string; state: 'present' | 'missing'; sha256?: string }
export interface GuidanceLink {
  from: string; href: string; target?: string;
  disposition: 'remote-or-scheme-reference' | 'local-guidance' | 'outside-repository' | 'generated-artifact' | 'BUSY-dependency-loader-boundary' | 'outside-guidance-boundary';
}
export interface GuidanceClosure { policy: GuidancePolicy; seeds: string[]; files: GuidanceFile[]; links: GuidanceLink[] }

const inBoundary = (file: string, boundary: string): boolean => {
  const relative = path.relative(path.resolve(boundary), path.resolve(file));
  return relative === '' || (!relative.startsWith('../') && !path.isAbsolute(relative));
};

/** Parsed local links only. Policy is caller-owned; this never fetches remote content. */
export async function resolveGuidanceClosure(root: string, seeds: string[], policy: GuidancePolicy): Promise<GuidanceClosure> {
  const queue = [...new Set(seeds)].sort(), seen = new Set(), files: GuidanceFile[] = [], links: GuidanceLink[] = [];
  const realRoot = await fs.realpath(root);
  while (queue.length) {
    const source = queue.shift()!;
    if (seen.has(source)) continue;
    seen.add(source);
    if (seen.size > (policy.maxDocuments ?? 256)) throw Error('Local guidance closure exceeds its explicit document limit');
    const file = path.resolve(root, source), relative = path.relative(root, file);
    if (relative.startsWith('../') || path.isAbsolute(relative)) throw Error('Guidance escapes repository: ' + source);
    let bytes;
    try {
      const real = path.relative(realRoot, await fs.realpath(file));
      if (real.startsWith('../') || path.isAbsolute(real)) throw Error('Guidance symlink escapes repository: ' + source);
      bytes = await fs.readFile(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      files.push({ source, state: 'missing' });
      continue;
    }
    files.push({ source, state: 'present', sha256: sha256Bytes(bytes) });
    if (policy.pinnedLeaves.includes(source)) continue;
    const nodes: Nodes[] = [parseMarkdown(bytes.toString()).tree];
    while (nodes.length) {
      const node = nodes.pop()!;
      if ('children' in node) nodes.push(...node.children);
      if ((node.type !== 'link' && node.type !== 'definition') || !node.url || node.url.startsWith('#')) continue;
      const href = node.url;
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
        links.push({ from: source, href, disposition: 'remote-or-scheme-reference' });
        continue;
      }
      const local = decodeURIComponent(href.split('#')[0].split('?')[0]);
      if (!local.endsWith('.md')) continue;
      const absolute = local.startsWith('/') ? path.resolve(root, '.' + local) : path.resolve(root, path.dirname(source), local);
      const target = path.relative(root, absolute);
      let disposition: GuidanceLink['disposition'] = 'local-guidance';
      if (target.startsWith('../') || path.isAbsolute(target)) disposition = 'outside-repository';
      else if (policy.excluded.some(p => inBoundary(target, p))) disposition = 'generated-artifact';
      else if (local.endsWith('.busy.md')) disposition = 'BUSY-dependency-loader-boundary';
      else if (!policy.roots.some(p => inBoundary(target, p)) && !policy.pinnedLeaves.includes(target)) disposition = 'outside-guidance-boundary';
      links.push({ from: source, href, target, disposition });
      if (disposition === 'local-guidance') queue.push(target);
    }
  }
  files.sort((a, b) => a.source.localeCompare(b.source));
  const unique = new Map(links.map(row => [JSON.stringify(row), row]));
  const orderedLinks = [...unique.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { policy, seeds: [...new Set(seeds)].sort(), files, links: orderedLinks };
}

/** Recompute links, hashes, missing targets and seed inventory against a captured closure. */
export async function checkGuidanceClosure(root: string, expected: GuidanceClosure, seeds = expected.seeds): Promise<GuidanceClosure> {
  const actual = await resolveGuidanceClosure(root, seeds, expected.policy);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Local guidance closure changed: file bytes, availability, links or inventory');
  return actual;
}
