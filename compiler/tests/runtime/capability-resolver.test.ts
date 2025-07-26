/**
 * Tests for CapabilityResolver - BUSY v2.0 Runtime
 * Tests capability discovery, resolution, and marketplace functionality
 */

import { 
  CapabilityResolver, 
  CapabilityDefinition, 
  ResponsibilityDefinition,
  CapabilityProvider,
  ResolutionContext
} from '../../src/runtime/capability-resolver';

describe('CapabilityResolver', () => {
  let resolver: CapabilityResolver;
  let mockCapability: CapabilityDefinition;
  let mockResponsibility: ResponsibilityDefinition;
  let mockProvider: CapabilityProvider;

  beforeEach(() => {
    resolver = new CapabilityResolver();

    mockCapability = {
      name: 'qualify-lead',
      description: 'Assess lead potential and fit',
      method: 'Review lead information and score against criteria',
      inputs: [
        {
          name: 'raw_lead',
          type: 'data',
          format: 'lead_info',
          fields: [
            { name: 'company_name', type: 'string', required: true },
            { name: 'contact_email', type: 'string', required: true }
          ]
        }
      ],
      outputs: [
        {
          name: 'qualified_lead',
          type: 'data',
          format: 'qualification_result',
          fields: [
            { name: 'status', type: 'string', required: true },
            { name: 'score', type: 'number', required: true }
          ]
        }
      ]
    };

    mockResponsibility = {
      name: 'maintain-lead-quality',
      description: 'Ensure lead qualification accuracy stays above 80%',
      method: 'Monitor qualification accuracy and alert when below threshold',
      inputs: [],
      outputs: [
        {
          name: 'quality_alert',
          type: 'notification',
          format: 'alert',
          fields: [
            { name: 'current_accuracy', type: 'number', required: true },
            { name: 'trend', type: 'string', required: true }
          ]
        }
      ],
      monitoringType: 'continuous'
    };

    mockProvider = {
      id: 'sales-rep-jane',
      name: 'Jane Doe - Senior Sales Rep',
      type: 'role',
      capabilities: ['qualify-lead', 'close-deals'],
      availability: 'always',
      metadata: {
        experience_years: 5,
        success_rate: 0.85,
        location: 'NYC'
      }
    };
  });

  describe('capability registration', () => {
    it('should register capability definitions', () => {
      resolver.registerCapability(mockCapability);

      const retrieved = resolver.getCapability('qualify-lead');
      expect(retrieved).toEqual(mockCapability);
    });

    it('should register responsibility definitions', () => {
      resolver.registerResponsibility(mockResponsibility);

      const retrieved = resolver.getCapability('maintain-lead-quality');
      expect(retrieved).toEqual(mockResponsibility);
    });

    it('should register capability providers', () => {
      resolver.registerProvider(mockProvider);

      const providers = resolver.getProvidersForCapability('qualify-lead');
      expect(providers).toHaveLength(1);
      expect(providers[0]).toEqual(mockProvider);
    });

    it('should emit events when registering definitions', () => {
      const capabilitySpy = jest.fn();
      const responsibilitySpy = jest.fn();
      const providerSpy = jest.fn();

      resolver.on('capability:registered', capabilitySpy);
      resolver.on('responsibility:registered', responsibilitySpy);
      resolver.on('provider:registered', providerSpy);

      resolver.registerCapability(mockCapability);
      resolver.registerResponsibility(mockResponsibility);
      resolver.registerProvider(mockProvider);

      expect(capabilitySpy).toHaveBeenCalledWith(mockCapability);
      expect(responsibilitySpy).toHaveBeenCalledWith(mockResponsibility);
      expect(providerSpy).toHaveBeenCalledWith(mockProvider);
    });
  });

  describe('capability resolution', () => {
    beforeEach(() => {
      resolver.registerCapability(mockCapability);
      resolver.registerProvider(mockProvider);
    });

    it('should resolve available capabilities successfully', async () => {
      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [mockProvider]
      };

      const result = await resolver.resolveCapabilities(context);

      expect(result.success).toBe(true);
      expect(result.resolvedCapabilities.size).toBe(1);
      expect(result.unresolved).toHaveLength(0);
      
      const match = result.resolvedCapabilities.get('qualify-lead');
      expect(match?.capability).toEqual(mockCapability);
      expect(match?.provider).toEqual(mockProvider);
    });

    it('should handle undefined capability definitions', async () => {
      const context: ResolutionContext = {
        requiredCapabilities: ['unknown-capability'],
        availableProviders: [mockProvider]
      };

      const result = await resolver.resolveCapabilities(context);

      expect(result.success).toBe(false);
      expect(result.unresolved).toContain('unknown-capability');
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toBe('Capability definition not found');
    });

    it('should handle missing providers', async () => {
      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [] // No providers available
      };

      const result = await resolver.resolveCapabilities(context);

      expect(result.success).toBe(false);
      expect(result.unresolved).toContain('qualify-lead');
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].reason).toBe('No available providers');
    });

    it('should use preferred provider when specified', async () => {
      const alternativeProvider: CapabilityProvider = {
        id: 'sales-rep-john',
        name: 'John Smith - Junior Sales Rep',
        type: 'role',
        capabilities: ['qualify-lead'],
        availability: 'scheduled',
        metadata: { experience_years: 1 }
      };

      resolver.registerProvider(alternativeProvider);

      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [mockProvider, alternativeProvider],
        preferredProvider: 'sales-rep-john'
      };

      const result = await resolver.resolveCapabilities(context);

      expect(result.success).toBe(true);
      const match = result.resolvedCapabilities.get('qualify-lead');
      expect(match?.provider.id).toBe('sales-rep-john');
    });

    it('should cache resolution results', async () => {
      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [mockProvider]
      };

      // First call
      const result1 = await resolver.resolveCapabilities(context);
      
      // Second call with same context should use cache
      const result2 = await resolver.resolveCapabilities(context);

      expect(result1).toEqual(result2);
      expect(result2.success).toBe(true);
    });

    it('should emit resolution events', async () => {
      const eventSpy = jest.fn();
      resolver.on('capabilities:resolved', eventSpy);

      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [mockProvider]
      };

      await resolver.resolveCapabilities(context);

      expect(eventSpy).toHaveBeenCalledWith({
        context,
        result: expect.objectContaining({ success: true })
      });
    });
  });

  describe('provider scoring', () => {
    it('should score providers based on availability', async () => {
      const alwaysProvider: CapabilityProvider = {
        id: 'always-available',
        name: 'Always Available Provider',
        type: 'service',
        capabilities: ['qualify-lead'],
        availability: 'always',
        metadata: {}
      };

      const scheduledProvider: CapabilityProvider = {
        id: 'scheduled-provider',
        name: 'Scheduled Provider',
        type: 'role',
        capabilities: ['qualify-lead'],
        availability: 'scheduled',
        metadata: {}
      };

      resolver.registerCapability(mockCapability);
      resolver.registerProvider(alwaysProvider);
      resolver.registerProvider(scheduledProvider);

      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [alwaysProvider, scheduledProvider]
      };

      const result = await resolver.resolveCapabilities(context);

      expect(result.success).toBe(true);
      const match = result.resolvedCapabilities.get('qualify-lead');
      expect(match?.provider.id).toBe('always-available'); // Should prefer always available
    });

    it('should apply constraint scoring', async () => {
      const constrainedProvider: CapabilityProvider = {
        id: 'constrained-provider',
        name: 'Constrained Provider',
        type: 'role',
        capabilities: ['qualify-lead'],
        availability: 'on-demand',
        metadata: {
          location: 'NYC',
          clearance_level: 'high'
        }
      };

      resolver.registerCapability(mockCapability);
      resolver.registerProvider(mockProvider);
      resolver.registerProvider(constrainedProvider);

      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [mockProvider, constrainedProvider],
        constraints: {
          location: 'NYC',
          clearance_level: 'high'
        }
      };

      const result = await resolver.resolveCapabilities(context);

      expect(result.success).toBe(true);
      const match = result.resolvedCapabilities.get('qualify-lead');
      expect(match?.provider.id).toBe('constrained-provider');
    });
  });

  describe('conflict detection', () => {
    it('should detect provider overload conflicts', async () => {
      const limitedProvider: CapabilityProvider = {
        id: 'limited-provider',
        name: 'Limited Availability Provider',
        type: 'role',
        capabilities: ['qualify-lead', 'close-deals'],
        availability: 'on-demand', // Not always available
        metadata: {}
      };

      const capability2: CapabilityDefinition = {
        name: 'close-deals',
        description: 'Close sales deals',
        method: 'Negotiate and finalize sales agreements',
        inputs: [],
        outputs: []
      };

      resolver.registerCapability(mockCapability);
      resolver.registerCapability(capability2);
      resolver.registerProvider(limitedProvider);

      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead', 'close-deals'],
        availableProviders: [limitedProvider]
      };

      const result = await resolver.resolveCapabilities(context);

      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].reason).toContain('cannot handle multiple capabilities simultaneously');
    });
  });

  describe('capability search', () => {
    beforeEach(() => {
      resolver.registerCapability(mockCapability);
      resolver.registerResponsibility(mockResponsibility);
    });

    it('should find capabilities by search term', () => {
      const results = resolver.findCapabilities('lead');

      expect(results).toHaveLength(2); // Both capability and responsibility contain 'lead'
      expect(results.some(c => c.name === 'qualify-lead')).toBe(true);
      expect(results.some(c => c.name === 'maintain-lead-quality')).toBe(true);
    });

    it('should filter by provider', () => {
      const capabilityWithProvider: CapabilityDefinition = {
        ...mockCapability,
        provider: 'test-provider'
      };

      resolver.registerCapability(capabilityWithProvider);

      const results = resolver.findCapabilities('lead', { provider: 'test-provider' });

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe('test-provider');
    });

    it('should filter by tags', () => {
      const taggedCapability: CapabilityDefinition = {
        ...mockCapability,
        tags: ['sales', 'qualification']
      };

      resolver.registerCapability(taggedCapability);

      const results = resolver.findCapabilities('lead', { tags: ['sales'] });

      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('sales');
    });

    it('should filter by type', () => {
      const capabilityResults = resolver.findCapabilities('lead', { type: 'capability' });
      const responsibilityResults = resolver.findCapabilities('lead', { type: 'responsibility' });

      expect(capabilityResults.some(c => c.name === 'qualify-lead')).toBe(true);
      expect(capabilityResults.some(c => c.name === 'maintain-lead-quality')).toBe(false);

      expect(responsibilityResults.some(c => c.name === 'maintain-lead-quality')).toBe(true);
      expect(responsibilityResults.some(c => c.name === 'qualify-lead')).toBe(false);
    });

    it('should sort results by relevance', () => {
      const exactMatch: CapabilityDefinition = {
        name: 'lead',
        description: 'Lead management',
        method: 'Manage leads',
        inputs: [],
        outputs: []
      };

      resolver.registerCapability(exactMatch);

      const results = resolver.findCapabilities('lead');

      expect(results[0].name).toBe('lead'); // Exact match should be first
    });
  });

  describe('compatibility validation', () => {
    it('should validate compatible capability interfaces', () => {
      const providedCapability: CapabilityDefinition = {
        name: 'qualify-lead',
        description: 'Lead qualification service',
        method: 'AI-powered lead qualification',
        inputs: [
          {
            name: 'raw_lead',
            type: 'data',
            format: 'lead_info',
            fields: [
              { name: 'company_name', type: 'string', required: true },
              { name: 'contact_email', type: 'string', required: true },
              { name: 'phone', type: 'string', required: false } // Extra field is OK
            ]
          }
        ],
        outputs: [
          {
            name: 'qualified_lead',
            type: 'data',
            format: 'qualification_result',
            fields: [
              { name: 'status', type: 'string', required: true },
              { name: 'score', type: 'number', required: true }
            ]
          }
        ]
      };

      const result = resolver.validateCompatibility(mockCapability, providedCapability);

      expect(result.compatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect input type mismatches', () => {
      const incompatibleCapability: CapabilityDefinition = {
        name: 'qualify-lead',
        description: 'Incompatible qualification',
        method: 'Basic qualification',
        inputs: [
          {
            name: 'raw_lead',
            type: 'document', // Wrong type
            format: 'lead_info',
            fields: [
              { name: 'company_name', type: 'string', required: true }
            ]
          }
        ],
        outputs: mockCapability.outputs
      };

      const result = resolver.validateCompatibility(mockCapability, incompatibleCapability);

      expect(result.compatible).toBe(false);
      expect(result.issues.some(issue => issue.includes('Input type mismatch'))).toBe(true);
    });

    it('should detect missing required fields', () => {
      const incompleteCapability: CapabilityDefinition = {
        name: 'qualify-lead',
        description: 'Incomplete qualification',
        method: 'Basic qualification',
        inputs: [
          {
            name: 'raw_lead',
            type: 'data',
            format: 'lead_info',
            fields: [
              { name: 'company_name', type: 'string', required: true }
              // Missing contact_email
            ]
          }
        ],
        outputs: mockCapability.outputs
      };

      const result = resolver.validateCompatibility(mockCapability, incompleteCapability);

      expect(result.compatible).toBe(false);
      expect(result.issues.some(issue => issue.includes('Missing required field: contact_email'))).toBe(true);
    });
  });

  describe('marketplace functionality', () => {
    beforeEach(() => {
      resolver.registerCapability(mockCapability);
      resolver.registerResponsibility(mockResponsibility);
      resolver.registerProvider(mockProvider);

      const additionalProvider: CapabilityProvider = {
        id: 'sales-manager',
        name: 'Sales Manager',
        type: 'role',
        capabilities: ['qualify-lead', 'approve-deals'],
        availability: 'scheduled',
        metadata: {}
      };

      resolver.registerProvider(additionalProvider);
    });

    it('should provide marketplace statistics', () => {
      const info = resolver.getMarketplaceInfo();

      expect(info.totalCapabilities).toBe(2); // capability + responsibility
      expect(info.totalProviders).toBe(2);
      expect(info.capabilitiesByProvider['Jane Doe - Senior Sales Rep']).toBe(2);
      expect(info.mostPopularCapabilities[0].name).toBe('qualify-lead');
      expect(info.mostPopularCapabilities[0].providerCount).toBe(2);
    });

    it('should track provider availability', () => {
      const info = resolver.getMarketplaceInfo();

      expect(info.providerAvailability['Jane Doe - Senior Sales Rep']).toBe('always');
      expect(info.providerAvailability['Sales Manager']).toBe('scheduled');
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      resolver.registerCapability(mockCapability);
      resolver.registerProvider(mockProvider);
    });

    it('should invalidate cache when registering new capabilities', async () => {
      const context: ResolutionContext = {
        requiredCapabilities: ['qualify-lead'],
        availableProviders: [mockProvider]
      };

      // First resolution
      await resolver.resolveCapabilities(context);

      // Register new capability (should invalidate cache)
      const newCapability: CapabilityDefinition = {
        name: 'new-capability',
        description: 'New capability',
        method: 'Do something new',
        inputs: [],
        outputs: []
      };

      resolver.registerCapability(newCapability);

      // Cache should be cleared (we can't test this directly, but behavior should be consistent)
      const result = await resolver.resolveCapabilities(context);
      expect(result.success).toBe(true);
    });
  });
});