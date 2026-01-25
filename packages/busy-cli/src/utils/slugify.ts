import GithubSlugger from 'github-slugger';

const slugger = new GithubSlugger();

/**
 * Normalize a Name into a DocId
 * Replaces spaces with underscores and removes dashes
 */
export function normalizeDocId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

/**
 * Create a slug from heading text using github-slugger
 */
export function createSlug(text: string): string {
  slugger.reset();
  return slugger.slug(text);
}

/**
 * Get basename of a file path without extension
 */
export function getBasename(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.replace(/\.md$/, '');
}
