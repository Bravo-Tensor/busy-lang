/**
 * Provider System Exports
 *
 * URL providers for fetching content from different sources.
 * Registration order matters - specific providers (GitHub, GitLab)
 * should be registered before the generic URL provider.
 */

// Base types and registry
export {
  Provider,
  ParsedURL,
  ProviderRegistry,
  providerRegistry,
} from './base.js';

// Local file provider (registered first for priority)
export { LocalProvider, localProvider } from './local.js';

// Specific providers
export { GitHubProvider, githubProvider } from './github.js';
export { GitLabProvider, gitlabProvider } from './gitlab.js';

// Generic URL provider (registered last as fallback)
export { URLProvider, urlProvider } from './url.js';
