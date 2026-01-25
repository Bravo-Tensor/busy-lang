/**
 * Generic URL provider
 *
 * Fallback provider for direct HTTP(S) URLs that don't match specific providers.
 */

import { Provider, ParsedURL, providerRegistry } from './base.js';

export class URLProvider implements Provider {
  name = 'url';

  matches(url: string): boolean {
    // Match any HTTP(S) URL as fallback
    return url.startsWith('http://') || url.startsWith('https://');
  }

  parse(url: string): ParsedURL {
    // Extract anchor if present
    const [urlWithoutAnchor, anchor] = url.split('#');

    // Parse URL to extract path
    const urlObj = new URL(urlWithoutAnchor);

    return {
      provider: 'url',
      path: urlObj.pathname,
      anchor,
      rawUrl: urlWithoutAnchor,
    };
  }

  getRawUrl(parsed: ParsedURL): string {
    return parsed.rawUrl || parsed.path;
  }

  async fetch(url: string): Promise<string> {
    const parsed = this.parse(url);
    const fetchUrl = parsed.rawUrl || url;

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fetchUrl}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  // Generic URLs don't support version resolution
  async getLatestVersion(_parsed: ParsedURL): Promise<string> {
    throw new Error('Generic URL provider does not support version resolution');
  }
}

// Create and register the URL provider (registered last as fallback)
export const urlProvider = new URLProvider();
providerRegistry.register(urlProvider);
