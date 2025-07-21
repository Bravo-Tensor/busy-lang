import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

export class HashTracker {
  private stateDir: string;

  constructor(knitDir: string) {
    this.stateDir = path.join(knitDir, 'state');
  }

  /**
   * Calculate content hash for a file (git-style)
   */
  async calculateFileHash(filepath: string): Promise<string> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return this.calculateContentHash(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return ''; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Calculate hash for content string
   */
  calculateContentHash(content: string): string {
    // Normalize content (similar to git's approach)
    const normalized = this.normalizeContent(content);
    
    // Create SHA-256 hash (similar to git but using SHA-256 instead of SHA-1)
    return createHash('sha256')
      .update(normalized)
      .digest('hex');
  }

  /**
   * Get stored hash for a file
   */
  async getStoredHash(filepath: string): Promise<string | null> {
    const hashFile = this.getHashFilePath(filepath);
    try {
      return await fs.readFile(hashFile, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Store hash for a file
   */
  async storeHash(filepath: string, hash: string): Promise<void> {
    const hashFile = this.getHashFilePath(filepath);
    await fs.mkdir(path.dirname(hashFile), { recursive: true });
    await fs.writeFile(hashFile, hash);
  }

  /**
   * Check if file has changed since last hash
   */
  async hasChanged(filepath: string): Promise<boolean> {
    const currentHash = await this.calculateFileHash(filepath);
    const storedHash = await this.getStoredHash(filepath);
    
    return currentHash !== storedHash;
  }

  /**
   * Update stored hash to current file content
   */
  async updateHash(filepath: string): Promise<string> {
    const currentHash = await this.calculateFileHash(filepath);
    await this.storeHash(filepath, currentHash);
    return currentHash;
  }

  /**
   * Get hash difference summary
   */
  async getHashDiff(filepath: string): Promise<{
    currentHash: string;
    storedHash: string | null;
    hasChanged: boolean;
  }> {
    const currentHash = await this.calculateFileHash(filepath);
    const storedHash = await this.getStoredHash(filepath);
    
    return {
      currentHash,
      storedHash,
      hasChanged: currentHash !== storedHash
    };
  }

  /**
   * Clean up stored hashes for files that no longer exist
   */
  async cleanup(existingFiles: string[]): Promise<number> {
    try {
      const hashFiles = await fs.readdir(this.stateDir);
      let cleaned = 0;

      for (const hashFile of hashFiles) {
        if (!hashFile.endsWith('.hash')) continue;
        
        const originalPath = this.decodeFilePath(hashFile);
        if (!existingFiles.includes(originalPath)) {
          await fs.unlink(path.join(this.stateDir, hashFile));
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return 0; // State directory doesn't exist
      }
      throw error;
    }
  }

  /**
   * Get all stored hashes
   */
  async getAllHashes(): Promise<Record<string, string>> {
    try {
      const hashFiles = await fs.readdir(this.stateDir);
      const hashes: Record<string, string> = {};

      for (const hashFile of hashFiles) {
        if (!hashFile.endsWith('.hash')) continue;
        
        const originalPath = this.decodeFilePath(hashFile);
        const hash = await fs.readFile(path.join(this.stateDir, hashFile), 'utf-8');
        hashes[originalPath] = hash;
      }

      return hashes;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {}; // State directory doesn't exist
      }
      throw error;
    }
  }

  private normalizeContent(content: string): string {
    // Normalize line endings and whitespace (similar to git's approach)
    return content
      .replace(/\r\n/g, '\n')  // Convert CRLF to LF
      .replace(/\r/g, '\n')    // Convert CR to LF
      .trim();                 // Remove leading/trailing whitespace
  }

  private getHashFilePath(filepath: string): string {
    // Encode filepath to safe filename
    const encoded = this.encodeFilePath(filepath);
    return path.join(this.stateDir, `${encoded}.hash`);
  }

  private encodeFilePath(filepath: string): string {
    // Convert filepath to safe filename by replacing special characters
    return filepath
      .replace(/[/\\]/g, '-')     // Replace slashes with dashes
      .replace(/[<>:""|?*]/g, '_') // Replace other special chars with underscores
      .replace(/\s+/g, '_')       // Replace spaces with underscores
      .toLowerCase();
  }

  private decodeFilePath(encodedName: string): string {
    // This is a simplified reverse - in practice, we'd need a more robust encoding
    // For now, we'll store a mapping file if needed
    return encodedName
      .replace(/\.hash$/, '')
      .replace(/-/g, '/')
      .replace(/_/g, ' ');
  }
}