/**
 * Provider system for URL handling
 *
 * Providers handle fetching content from different URL sources (GitHub, GitLab, generic URLs).
 */

export interface ParsedURL {
  provider: string;
  org?: string;
  repo?: string;
  ref?: string;
  path: string;
  anchor?: string;
  rawUrl?: string;
}

export interface Provider {
  name: string;

  /**
   * Check if this provider handles the given URL
   */
  matches(url: string): boolean;

  /**
   * Parse URL into components
   */
  parse(url: string): ParsedURL;

  /**
   * Convert parsed URL to raw content URL
   */
  getRawUrl(parsed: ParsedURL): string;

  /**
   * Fetch content from URL
   */
  fetch(url: string): Promise<string>;

  /**
   * Get the latest version/tag for a repo (optional)
   */
  getLatestVersion?(parsed: ParsedURL): Promise<string>;
}

/**
 * Provider registry - manages all URL providers
 */
export class ProviderRegistry {
  private providers: Provider[] = [];

  /**
   * Register a provider
   */
  register(provider: Provider): void {
    this.providers.push(provider);
  }

  /**
   * Find provider that handles a URL
   */
  findProvider(url: string): Provider | undefined {
    return this.providers.find(p => p.matches(url));
  }

  /**
   * Get all registered providers
   */
  getProviders(): Provider[] {
    return [...this.providers];
  }
}

/**
 * Global provider registry instance
 */
export const providerRegistry = new ProviderRegistry();
