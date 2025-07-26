/**
 * Tests for ResourceManager - BUSY v2.0 Runtime
 * Tests resource allocation, priority chain resolution, and resource lifecycle management
 */

import { 
  ResourceManager, 
  ResourceDefinition, 
  ResourceRequirement,
  PriorityItem
} from '../../src/runtime/resource-manager';

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;
  let mockResource: ResourceDefinition;
  let mockRequirement: ResourceRequirement;

  beforeEach(() => {
    resourceManager = new ResourceManager();

    mockResource = {
      name: 'jane_doe',
      characteristics: {
        type: 'person',
        role: 'senior_sales_rep',
        experience_years: 5,
        capabilities: ['qualify-lead', 'close-deals'],
        location: 'NYC',
        availability_hours: '9-17'
      }
    };

    mockRequirement = {
      name: 'sales_rep',
      characteristics: {
        capabilities: ['qualify-lead'],
        experience_years: '>2'
      },
      priority: [
        {
          type: 'specific',
          specific: 'jane_doe'
        },
        {
          type: 'characteristics',
          characteristics: {
            experience_years: '>2',
            capabilities: ['qualify-lead']
          }
        },
        {
          type: 'emergency',
          characteristics: {
            capabilities: ['qualify-lead']
          },
          warning: 'Using emergency resource allocation'
        }
      ]
    };
  });

  describe('resource registration', () => {
    it('should register resource definitions', () => {
      resourceManager.registerResource(mockResource);

      const resources = resourceManager.findMatchingResources({ type: 'person' });
      expect(resources).toHaveLength(1);
      expect(resources[0]).toEqual(mockResource);
    });

    it('should register resource instances', () => {
      resourceManager.registerResource(mockResource);
      
      const instance = {
        id: 'jane_doe_instance',
        name: 'Jane Doe',
        email: 'jane@company.com',
        status: 'available'
      };

      resourceManager.registerInstance('jane_doe', instance);

      // Verify instance is registered (we can't directly access private field)
      expect(resourceManager['instances'].has('jane_doe')).toBe(true);
    });

    it('should handle resource inheritance with extends', () => {
      const parentResource: ResourceDefinition = {
        name: 'sales_team_member',
        characteristics: {
          type: 'person',
          department: 'sales',
          base_capabilities: ['communicate', 'use-crm']
        }
      };

      const childResource: ResourceDefinition = {
        name: 'senior_sales_rep',
        extends: 'sales_team_member',
        characteristics: {
          role: 'senior_rep',
          experience_years: 5,
          capabilities: ['qualify-lead', 'close-deals']
        }
      };

      resourceManager.registerResource(parentResource);
      resourceManager.registerResource(childResource);

      const retrieved = resourceManager.findMatchingResources({ type: 'person' })[0];
      expect(retrieved.characteristics.department).toBe('sales'); // Inherited
      expect(retrieved.characteristics.role).toBe('senior_rep'); // Own property
      expect(retrieved.characteristics.base_capabilities).toEqual(['communicate', 'use-crm']); // Inherited
    });

    it('should emit events when registering resources', () => {
      const resourceSpy = jest.fn();
      const instanceSpy = jest.fn();

      resourceManager.on('resource:registered', resourceSpy);
      resourceManager.on('instance:registered', instanceSpy);

      resourceManager.registerResource(mockResource);
      resourceManager.registerInstance('jane_doe', { status: 'available' });

      expect(resourceSpy).toHaveBeenCalledWith(mockResource);
      expect(instanceSpy).toHaveBeenCalledWith({
        resourceName: 'jane_doe',
        instance: { status: 'available' }
      });
    });
  });

  describe('resource allocation', () => {
    beforeEach(() => {
      resourceManager.registerResource(mockResource);
      resourceManager.registerInstance('jane_doe', { status: 'available' });
    });

    it('should successfully allocate resources with specific priority', async () => {
      const stepId = 'test-step-1';
      const requirements = [mockRequirement];

      const result = await resourceManager.allocateResources(stepId, requirements);

      expect(result.success).toBe(true);
      expect(result.allocatedResources).toHaveLength(1);
      expect(result.failures).toHaveLength(0);
      
      const allocated = result.allocatedResources[0];
      expect(allocated.name).toBe('sales_rep');
      expect(allocated.definition.name).toBe('jane_doe');
      expect(allocated.allocatedTo).toBe(stepId);
      expect(allocated.priority).toBe(10); // Specific priority
    });

    it('should fallback to characteristics when specific resource unavailable', async () => {
      // Don't register instance, making specific resource unavailable
      const alternativeResource: ResourceDefinition = {
        name: 'john_smith',
        characteristics: {
          type: 'person',
          role: 'sales_rep',
          experience_years: 3,
          capabilities: ['qualify-lead']
        }
      };

      resourceManager.registerResource(alternativeResource);
      resourceManager.registerInstance('john_smith', { status: 'available' });

      const stepId = 'test-step-2';
      const result = await resourceManager.allocateResources(stepId, [mockRequirement]);

      expect(result.success).toBe(true);
      const allocated = result.allocatedResources[0];
      expect(allocated.definition.name).toBe('john_smith');
      expect(allocated.priority).toBe(5); // Characteristics priority
    });

    it('should use emergency allocation with warning', async () => {
      // Register only a basic resource that matches emergency criteria
      const basicResource: ResourceDefinition = {
        name: 'basic_rep',
        characteristics: {
          type: 'person',
          capabilities: ['qualify-lead']
          // No experience_years - doesn't match normal characteristics
        }
      };

      resourceManager.registerResource(basicResource);
      resourceManager.registerInstance('basic_rep', { status: 'available' });

      const stepId = 'test-step-3';
      const result = await resourceManager.allocateResources(stepId, [mockRequirement]);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Using emergency resource allocation');
      const allocated = result.allocatedResources[0];
      expect(allocated.definition.name).toBe('basic_rep');
      expect(allocated.priority).toBe(1); // Emergency priority
    });

    it('should fail when no matching resources available', async () => {
      const impossibleRequirement: ResourceRequirement = {
        name: 'impossible_resource',
        priority: [
          {
            type: 'specific',
            specific: 'non_existent_resource'
          },
          {
            type: 'characteristics',
            characteristics: {
              impossible_capability: ['does-not-exist']
            }
          }
        ]
      };

      const stepId = 'test-step-4';
      const result = await resourceManager.allocateResources(stepId, [impossibleRequirement]);

      expect(result.success).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].requirementName).toBe('impossible_resource');
      expect(result.failures[0].reason).toContain('No matching resources found');
    });

    it('should handle multiple resource requirements', async () => {
      const meetingRoom: ResourceDefinition = {
        name: 'conference_room_a',
        characteristics: {
          type: 'meeting_space',
          capacity: 8,
          equipment: ['projector', 'whiteboard'],
          location: 'floor_2'
        }
      };

      const roomRequirement: ResourceRequirement = {
        name: 'meeting_space',
        priority: [
          {
            type: 'specific',
            specific: 'conference_room_a'
          }
        ]
      };

      resourceManager.registerResource(meetingRoom);
      resourceManager.registerInstance('conference_room_a', { status: 'available' });

      const stepId = 'test-step-5';
      const result = await resourceManager.allocateResources(stepId, [mockRequirement, roomRequirement]);

      expect(result.success).toBe(true);
      expect(result.allocatedResources).toHaveLength(2);
      expect(result.allocatedResources.some(r => r.name === 'sales_rep')).toBe(true);
      expect(result.allocatedResources.some(r => r.name === 'meeting_space')).toBe(true);
    });

    it('should emit allocation events', async () => {
      const allocationSpy = jest.fn();
      resourceManager.on('resources:allocated', allocationSpy);

      const stepId = 'test-step-6';
      await resourceManager.allocateResources(stepId, [mockRequirement]);

      expect(allocationSpy).toHaveBeenCalledWith({
        stepId,
        result: expect.objectContaining({ success: true })
      });
    });
  });

  describe('resource release', () => {
    it('should release allocated resources', async () => {
      resourceManager.registerResource(mockResource);
      resourceManager.registerInstance('jane_doe', { status: 'available' });

      const stepId = 'test-step-7';
      
      // Allocate resource
      await resourceManager.allocateResources(stepId, [mockRequirement]);
      
      // Release resource
      const releaseSpy = jest.fn();
      resourceManager.on('resources:released', releaseSpy);
      
      await resourceManager.releaseResources(stepId);

      expect(releaseSpy).toHaveBeenCalledWith({
        stepId,
        resources: expect.arrayContaining([
          expect.objectContaining({ name: 'sales_rep' })
        ])
      });
    });

    it('should make resources available after release', async () => {
      resourceManager.registerResource(mockResource);
      resourceManager.registerInstance('jane_doe', { status: 'available' });

      const stepId = 'test-step-8';
      
      // Allocate resource
      await resourceManager.allocateResources(stepId, [mockRequirement]);
      
      // Try to allocate same resource to different step (should fail)
      const stepId2 = 'test-step-9';
      const result1 = await resourceManager.allocateResources(stepId2, [mockRequirement]);
      expect(result1.success).toBe(false); // Resource is busy
      
      // Release resource
      await resourceManager.releaseResources(stepId);
      
      // Try to allocate again (should succeed)
      const result2 = await resourceManager.allocateResources(stepId2, [mockRequirement]);
      expect(result2.success).toBe(true); // Resource is now available
    });
  });

  describe('resource reservation', () => {
    beforeEach(() => {
      resourceManager.registerResource(mockResource);
      resourceManager.registerInstance('jane_doe', { status: 'available' });
    });

    it('should create resource reservations', async () => {
      const stepId = 'test-step-10';
      const expirationMinutes = 15;

      const reservation = await resourceManager.reserveResources(
        stepId, 
        [mockRequirement], 
        expirationMinutes
      );

      expect(reservation.stepId).toBe(stepId);
      expect(reservation.requirements).toEqual([mockRequirement]);
      expect(reservation.status).toBe('pending');
      expect(reservation.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should emit reservation events', async () => {
      const reservationSpy = jest.fn();
      resourceManager.on('resources:reserved', reservationSpy);

      const stepId = 'test-step-11';
      await resourceManager.reserveResources(stepId, [mockRequirement]);

      expect(reservationSpy).toHaveBeenCalledWith(
        expect.objectContaining({ stepId, status: 'pending' })
      );
    });

    it('should expire reservations after timeout', async (done) => {
      const expirationSpy = jest.fn();
      resourceManager.on('reservation:expired', expirationSpy);

      const stepId = 'test-step-12';
      await resourceManager.reserveResources(stepId, [mockRequirement], 0.01); // 0.6 seconds

      setTimeout(() => {
        expect(expirationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ stepId, status: 'expired' })
        );
        done();
      }, 100); // Wait 100ms for expiration
    });
  });

  describe('characteristic matching', () => {
    beforeEach(() => {
      resourceManager.registerResource(mockResource);
    });

    it('should match exact values', () => {
      const matches = resourceManager.findMatchingResources({ type: 'person' });
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('jane_doe');
    });

    it('should match capability arrays', () => {
      const matches = resourceManager.findMatchingResources({ 
        capabilities: ['qualify-lead'] 
      });
      expect(matches).toHaveLength(1);
    });

    it('should handle numeric comparisons', () => {
      const experienced = resourceManager.findMatchingResources({ 
        experience_years: '>3' 
      });
      expect(experienced).toHaveLength(1);

      const tooExperienced = resourceManager.findMatchingResources({ 
        experience_years: '>10' 
      });
      expect(tooExperienced).toHaveLength(0);

      const lessThanSix = resourceManager.findMatchingResources({ 
        experience_years: '<6' 
      });
      expect(lessThanSix).toHaveLength(1);
    });

    it('should score matches by relevance', () => {
      const exactMatch: ResourceDefinition = {
        name: 'exact_match',
        characteristics: {
          type: 'person',
          experience_years: 5,
          capabilities: ['qualify-lead']
        }
      };

      const partialMatch: ResourceDefinition = {
        name: 'partial_match',
        characteristics: {
          type: 'person',
          capabilities: ['qualify-lead'] // Missing experience_years
        }
      };

      resourceManager.registerResource(exactMatch);
      resourceManager.registerResource(partialMatch);

      const matches = resourceManager.findMatchingResources({
        type: 'person',
        experience_years: 5,
        capabilities: ['qualify-lead']
      });

      expect(matches[0].name).toBe('exact_match'); // Should be first due to higher score
      expect(matches[1].name).toBe('jane_doe'); // Original resource
      expect(matches[2].name).toBe('partial_match'); // Should be last due to lower score
    });
  });

  describe('utilization statistics', () => {
    beforeEach(() => {
      resourceManager.registerResource(mockResource);
      resourceManager.registerInstance('jane_doe', { status: 'available' });

      const meetingRoom: ResourceDefinition = {
        name: 'conference_room_a',
        characteristics: {
          type: 'meeting_space',
          capacity: 8
        }
      };

      resourceManager.registerResource(meetingRoom);
      resourceManager.registerInstance('conference_room_a', { status: 'available' });
    });

    it('should provide accurate utilization statistics', async () => {
      // Initially no allocations
      let stats = resourceManager.getUtilizationStats();
      expect(stats.totalResources).toBe(2);
      expect(stats.allocatedResources).toBe(0);
      expect(stats.availableResources).toBe(2);
      expect(stats.utilizationRate).toBe(0);

      // Allocate one resource
      await resourceManager.allocateResources('step-1', [mockRequirement]);

      stats = resourceManager.getUtilizationStats();
      expect(stats.allocatedResources).toBe(1);
      expect(stats.availableResources).toBe(1);
      expect(stats.utilizationRate).toBe(0.5);
    });

    it('should track allocations by type', async () => {
      const roomRequirement: ResourceRequirement = {
        name: 'meeting_space',
        priority: [
          {
            type: 'specific',
            specific: 'conference_room_a'
          }
        ]
      };

      await resourceManager.allocateResources('step-1', [mockRequirement]);
      await resourceManager.allocateResources('step-2', [roomRequirement]);

      const stats = resourceManager.getUtilizationStats();
      expect(stats.allocationsByType.person).toBe(1);
      expect(stats.allocationsByType.meeting_space).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle allocation errors gracefully', async () => {
      const problematicRequirement: ResourceRequirement = {
        name: 'problematic',
        priority: [
          {
            type: 'specific',
            specific: 'jane_doe'
          }
        ]
      };

      // Don't register the resource - this should cause an error
      const stepId = 'error-step';
      const result = await resourceManager.allocateResources(stepId, [problematicRequirement]);

      expect(result.success).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].requirementName).toBe('problematic');
    });

    it('should provide alternative suggestions when allocation fails', async () => {
      const similarResource: ResourceDefinition = {
        name: 'similar_resource',
        characteristics: {
          type: 'person',
          capabilities: ['qualify-lead'] // Similar to what we're looking for
        }
      };

      resourceManager.registerResource(similarResource);

      const impossibleRequirement: ResourceRequirement = {
        name: 'impossible',
        characteristics: {
          capabilities: ['qualify-lead']
        },
        priority: [
          {
            type: 'specific',
            specific: 'non_existent'
          }
        ]
      };

      const result = await resourceManager.allocateResources('step-1', [impossibleRequirement]);

      expect(result.success).toBe(false);
      expect(result.failures[0].availableAlternatives).toContain('similar_resource');
    });
  });

  describe('priority chain logic', () => {
    beforeEach(() => {
      resourceManager.registerResource(mockResource);
      resourceManager.registerInstance('jane_doe', { status: 'available' });

      const juniorRep: ResourceDefinition = {
        name: 'john_smith',
        characteristics: {
          type: 'person',
          role: 'junior_sales_rep',
          experience_years: 1,
          capabilities: ['qualify-lead']
        }
      };

      resourceManager.registerResource(juniorRep);
      resourceManager.registerInstance('john_smith', { status: 'available' });
    });

    it('should try priorities in order', async () => {
      // Allocate jane_doe to make her unavailable
      await resourceManager.allocateResources('step-1', [mockRequirement]);

      // Try to allocate again - should fall back to characteristics match
      const result = await resourceManager.allocateResources('step-2', [mockRequirement]);

      expect(result.success).toBe(false); // john_smith doesn't meet experience requirement
    });

    it('should provide priority-specific warnings', async () => {
      // Create requirement that will use emergency allocation
      const emergencyRequirement: ResourceRequirement = {
        name: 'sales_rep',
        priority: [
          {
            type: 'specific',
            specific: 'non_existent'
          },
          {
            type: 'characteristics',
            characteristics: {
              experience_years: '>10' // No one matches this
            }
          },
          {
            type: 'emergency',
            characteristics: {
              capabilities: ['qualify-lead']
            },
            warning: 'Using emergency fallback'
          }
        ]
      };

      const result = await resourceManager.allocateResources('step-1', [emergencyRequirement]);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Using emergency fallback');
    });
  });
});