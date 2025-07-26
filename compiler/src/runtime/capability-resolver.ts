/**
 * Capability Resolver - BUSY v2.0 Runtime
 * Handles capability discovery, matching, and marketplace functionality
 */

import { EventEmitter } from 'events';

export interface CapabilityDefinition {
  name: string;
  description: string;
  method: string;
  inputs: InputOutputSpec[];
  outputs: InputOutputSpec[];
  version?: string;
  provider?: string;
  tags?: string[];
}

export interface ResponsibilityDefinition {
  name: string;
  description: string;
  method: string;
  inputs: InputOutputSpec[];
  outputs: InputOutputSpec[];
  version?: string;
  provider?: string;
  monitoringType: 'continuous' | 'periodic' | 'event-driven';
}

export interface InputOutputSpec {
  name: string;
  type: 'data' | 'document' | 'decision' | 'physical' | 'notification' | 'alert' | 'report';
  format?: string;
  fields: FieldSpec[];
}

export interface FieldSpec {
  name: string;
  type: string;
  required: boolean;
}

export interface CapabilityProvider {
  id: string;
  name: string;
  type: 'role' | 'tool' | 'service' | 'external';
  capabilities: string[];
  availability: 'always' | 'scheduled' | 'on-demand';
  metadata: Record<string, any>;
}

export interface CapabilityMatch {
  capability: CapabilityDefinition;
  provider: CapabilityProvider;
  matchScore: number;
  compatibilityIssues: string[];
}

export interface ResolutionContext {
  requiredCapabilities: string[];
  availableProviders: CapabilityProvider[];
  constraints?: Record<string, any>;
  preferredProvider?: string;
}

export interface ResolutionResult {
  success: boolean;
  resolvedCapabilities: Map<string, CapabilityMatch>;
  unresolved: string[];
  conflicts: CapabilityConflict[];
  warnings: string[];
}

export interface CapabilityConflict {
  capability: string;
  reason: string;
  conflictingProviders: string[];
  suggestedResolution: string;
}

/**
 * Manages capability definitions, resolution, and marketplace functionality
 */
export class CapabilityResolver extends EventEmitter {
  private capabilities: Map<string, CapabilityDefinition>;
  private responsibilities: Map<string, ResponsibilityDefinition>;
  private providers: Map<string, CapabilityProvider>;
  private resolutionCache: Map<string, ResolutionResult>;

  constructor() {
    super();
    this.capabilities = new Map();
    this.responsibilities = new Map();
    this.providers = new Map();
    this.resolutionCache = new Map();
  }

  /**
   * Register capability definitions
   */
  registerCapability(definition: CapabilityDefinition): void {
    this.capabilities.set(definition.name, definition);
    this.invalidateCache();
    this.emit('capability:registered', definition);
  }

  /**
   * Register responsibility definitions
   */
  registerResponsibility(definition: ResponsibilityDefinition): void {
    this.responsibilities.set(definition.name, definition);
    this.invalidateCache();
    this.emit('responsibility:registered', definition);
  }

  /**
   * Register capability provider
   */
  registerProvider(provider: CapabilityProvider): void {
    this.providers.set(provider.id, provider);
    this.invalidateCache();
    this.emit('provider:registered', provider);
  }

  /**
   * Resolve capabilities for a role or step
   */
  async resolveCapabilities(context: ResolutionContext): Promise<ResolutionResult> {
    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first
    const cached = this.resolutionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result: ResolutionResult = {
      success: true,
      resolvedCapabilities: new Map(),
      unresolved: [],
      conflicts: [],
      warnings: []
    };

    // Resolve each required capability
    for (const capabilityName of context.requiredCapabilities) {
      const resolution = await this.resolveSingleCapability(capabilityName, context);
      
      if (resolution.success) {
        result.resolvedCapabilities.set(capabilityName, resolution.match!);
        if (resolution.warnings) {
          result.warnings.push(...resolution.warnings);
        }
      } else {
        result.unresolved.push(capabilityName);
        result.success = false;
        
        if (resolution.conflict) {
          result.conflicts.push(resolution.conflict);
        }
      }
    }

    // Check for provider conflicts
    const conflicts = this.detectProviderConflicts(result.resolvedCapabilities);
    result.conflicts.push(...conflicts);
    
    if (conflicts.length > 0) {
      result.success = false;
    }

    // Cache result
    this.resolutionCache.set(cacheKey, result);
    
    this.emit('capabilities:resolved', { context, result });
    return result;
  }

  /**
   * Find all capabilities matching a pattern
   */
  findCapabilities(searchTerm: string, filters?: {
    provider?: string;
    tags?: string[];
    type?: 'capability' | 'responsibility';
  }): CapabilityDefinition[] {
    const results: CapabilityDefinition[] = [];
    
    // Search capabilities
    if (!filters?.type || filters.type === 'capability') {
      for (const capability of this.capabilities.values()) {
        if (this.matchesSearch(capability, searchTerm, filters)) {
          results.push(capability);
        }
      }
    }

    // Search responsibilities (if requested)
    if (!filters?.type || filters.type === 'responsibility') {
      for (const responsibility of this.responsibilities.values()) {
        // Convert responsibility to capability format for consistency
        const capabilityView: CapabilityDefinition = {
          name: responsibility.name,
          description: responsibility.description,
          method: responsibility.method,
          inputs: responsibility.inputs,
          outputs: responsibility.outputs,
          version: responsibility.version,
          provider: responsibility.provider,
          tags: ['responsibility', ...(responsibility as any).tags || []]
        };
        
        if (this.matchesSearch(capabilityView, searchTerm, filters)) {
          results.push(capabilityView);
        }
      }
    }

    return results.sort((a, b) => this.calculateSearchScore(b, searchTerm) - this.calculateSearchScore(a, searchTerm));
  }

  /**
   * Get capability marketplace information
   */
  getMarketplaceInfo(): {
    totalCapabilities: number;
    totalProviders: number;
    capabilitiesByProvider: Record<string, number>;
    mostPopularCapabilities: { name: string; providerCount: number }[];
    providerAvailability: Record<string, string>;
  } {
    const capabilitiesByProvider: Record<string, number> = {};
    const capabilityProviderCount: Record<string, number> = {};
    const providerAvailability: Record<string, string> = {};

    // Count capabilities by provider
    for (const provider of this.providers.values()) {
      capabilitiesByProvider[provider.name] = provider.capabilities.length;
      providerAvailability[provider.name] = provider.availability;
      
      // Count providers per capability
      for (const capName of provider.capabilities) {
        capabilityProviderCount[capName] = (capabilityProviderCount[capName] || 0) + 1;
      }
    }

    // Find most popular capabilities
    const mostPopularCapabilities = Object.entries(capabilityProviderCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, providerCount]) => ({ name, providerCount }));

    return {
      totalCapabilities: this.capabilities.size + this.responsibilities.size,
      totalProviders: this.providers.size,
      capabilitiesByProvider,
      mostPopularCapabilities,
      providerAvailability
    };
  }

  /**
   * Validate capability interface compatibility
   */
  validateCompatibility(
    required: CapabilityDefinition,
    provided: CapabilityDefinition
  ): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check input compatibility
    for (const requiredInput of required.inputs) {
      const providedInput = provided.inputs.find(i => i.name === requiredInput.name);
      
      if (!providedInput) {
        issues.push(`Missing input: ${requiredInput.name}`);
        continue;
      }

      if (requiredInput.type !== providedInput.type) {
        issues.push(`Input type mismatch for ${requiredInput.name}: expected ${requiredInput.type}, got ${providedInput.type}`);
      }

      // Check field compatibility
      const fieldIssues = this.validateFieldCompatibility(requiredInput.fields, providedInput.fields);
      issues.push(...fieldIssues.map(issue => `Input ${requiredInput.name}: ${issue}`));
    }

    // Check output compatibility
    for (const requiredOutput of required.outputs) {
      const providedOutput = provided.outputs.find(o => o.name === requiredOutput.name);
      
      if (!providedOutput) {
        issues.push(`Missing output: ${requiredOutput.name}`);
        continue;
      }

      if (requiredOutput.type !== providedOutput.type) {
        issues.push(`Output type mismatch for ${requiredOutput.name}: expected ${requiredOutput.type}, got ${providedOutput.type}`);
      }

      // Check field compatibility
      const fieldIssues = this.validateFieldCompatibility(requiredOutput.fields, providedOutput.fields);
      issues.push(...fieldIssues.map(issue => `Output ${requiredOutput.name}: ${issue}`));
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Get capability definition
   */
  getCapability(name: string): CapabilityDefinition | ResponsibilityDefinition | null {
    return this.capabilities.get(name) || this.responsibilities.get(name) || null;
  }

  /**
   * Get all providers for a capability
   */
  getProvidersForCapability(capabilityName: string): CapabilityProvider[] {
    return Array.from(this.providers.values()).filter(
      provider => provider.capabilities.includes(capabilityName)
    );
  }

  /**
   * Resolve a single capability
   */
  private async resolveSingleCapability(
    capabilityName: string,
    context: ResolutionContext
  ): Promise<{
    success: boolean;
    match?: CapabilityMatch;
    conflict?: CapabilityConflict;
    warnings?: string[];
  }> {
    const capability = this.getCapability(capabilityName);
    if (!capability) {
      return {
        success: false,
        conflict: {
          capability: capabilityName,
          reason: 'Capability definition not found',
          conflictingProviders: [],
          suggestedResolution: `Register capability '${capabilityName}' or check spelling`
        }
      };
    }

    // Find available providers
    const availableProviders = this.getProvidersForCapability(capabilityName)
      .filter(provider => context.availableProviders.some(ap => ap.id === provider.id));

    if (availableProviders.length === 0) {
      return {
        success: false,
        conflict: {
          capability: capabilityName,
          reason: 'No available providers',
          conflictingProviders: [],
          suggestedResolution: `Register a provider for capability '${capabilityName}'`
        }
      };
    }

    // Select best provider
    const bestProvider = this.selectBestProvider(availableProviders, context);
    const matchScore = this.calculateProviderScore(bestProvider, context);

    const warnings: string[] = [];
    if (matchScore < 0.7) {
      warnings.push(`Provider ${bestProvider.name} has low compatibility score for ${capabilityName}`);
    }

    return {
      success: true,
      match: {
        capability: capability as CapabilityDefinition,
        provider: bestProvider,
        matchScore,
        compatibilityIssues: []
      },
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Select best provider based on context
   */
  private selectBestProvider(providers: CapabilityProvider[], context: ResolutionContext): CapabilityProvider {
    // Prefer specified provider if available
    if (context.preferredProvider) {
      const preferred = providers.find(p => p.id === context.preferredProvider);
      if (preferred) {
        return preferred;
      }
    }

    // Score all providers and select best
    return providers.reduce((best, current) => {
      const currentScore = this.calculateProviderScore(current, context);
      const bestScore = this.calculateProviderScore(best, context);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculate provider compatibility score
   */
  private calculateProviderScore(provider: CapabilityProvider, context: ResolutionContext): number {
    let score = 0.5; // Base score

    // Availability score
    switch (provider.availability) {
      case 'always':
        score += 0.3;
        break;
      case 'on-demand':
        score += 0.2;
        break;
      case 'scheduled':
        score += 0.1;
        break;
    }

    // Provider type score
    switch (provider.type) {
      case 'role':
        score += 0.1;
        break;
      case 'service':
        score += 0.1;
        break;
      case 'tool':
        score += 0.05;
        break;
      case 'external':
        score += 0.02;
        break;
    }

    // Apply constraints
    if (context.constraints) {
      for (const [key, value] of Object.entries(context.constraints)) {
        if (provider.metadata[key] === value) {
          score += 0.1;
        }
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect conflicts between providers
   */
  private detectProviderConflicts(resolvedCapabilities: Map<string, CapabilityMatch>): CapabilityConflict[] {
    const conflicts: CapabilityConflict[] = [];
    const providerUsage: Map<string, string[]> = new Map();

    // Group capabilities by provider
    for (const [capName, match] of resolvedCapabilities) {
      const providerId = match.provider.id;
      const caps = providerUsage.get(providerId) || [];
      caps.push(capName);
      providerUsage.set(providerId, caps);
    }

    // Check for overloaded providers
    for (const [providerId, capabilities] of providerUsage) {
      if (capabilities.length > 1) {
        const provider = this.providers.get(providerId);
        if (provider && provider.availability !== 'always') {
          conflicts.push({
            capability: capabilities.join(', '),
            reason: `Provider ${provider.name} cannot handle multiple capabilities simultaneously`,
            conflictingProviders: [providerId],
            suggestedResolution: 'Use different providers or schedule capabilities sequentially'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if capability matches search criteria
   */
  private matchesSearch(
    capability: CapabilityDefinition,
    searchTerm: string,
    filters?: { provider?: string; tags?: string[] }
  ): boolean {
    // Text search
    const searchLower = searchTerm.toLowerCase();
    const textMatch = capability.name.toLowerCase().includes(searchLower) ||
                     capability.description.toLowerCase().includes(searchLower);

    if (!textMatch) {
      return false;
    }

    // Provider filter
    if (filters?.provider && capability.provider !== filters.provider) {
      return false;
    }

    // Tags filter
    if (filters?.tags && filters.tags.length > 0) {
      const capabilityTags = capability.tags || [];
      const hasMatchingTag = filters.tags.some(tag => capabilityTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate search relevance score
   */
  private calculateSearchScore(capability: CapabilityDefinition, searchTerm: string): number {
    const searchLower = searchTerm.toLowerCase();
    let score = 0;

    // Exact name match
    if (capability.name.toLowerCase() === searchLower) {
      score += 10;
    }
    // Name starts with search term
    else if (capability.name.toLowerCase().startsWith(searchLower)) {
      score += 5;
    }
    // Name contains search term
    else if (capability.name.toLowerCase().includes(searchLower)) {
      score += 2;
    }

    // Description contains search term
    if (capability.description.toLowerCase().includes(searchLower)) {
      score += 1;
    }

    return score;
  }

  /**
   * Validate field compatibility
   */
  private validateFieldCompatibility(required: FieldSpec[], provided: FieldSpec[]): string[] {
    const issues: string[] = [];

    for (const reqField of required) {
      const provField = provided.find(f => f.name === reqField.name);
      
      if (!provField) {
        if (reqField.required) {
          issues.push(`Missing required field: ${reqField.name}`);
        }
        continue;
      }

      if (reqField.type !== provField.type) {
        issues.push(`Field type mismatch for ${reqField.name}: expected ${reqField.type}, got ${provField.type}`);
      }

      if (reqField.required && !provField.required) {
        issues.push(`Field ${reqField.name} should be required`);
      }
    }

    return issues;
  }

  /**
   * Generate cache key for resolution context
   */
  private generateCacheKey(context: ResolutionContext): string {
    const key = {
      capabilities: context.requiredCapabilities.sort(),
      providers: context.availableProviders.map(p => p.id).sort(),
      constraints: context.constraints,
      preferred: context.preferredProvider
    };
    
    return JSON.stringify(key);
  }

  /**
   * Invalidate resolution cache
   */
  private invalidateCache(): void {
    this.resolutionCache.clear();
  }
}