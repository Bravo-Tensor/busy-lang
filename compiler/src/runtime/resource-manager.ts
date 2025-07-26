/**
 * Resource Manager - BUSY v2.0 Runtime
 * Handles resource allocation, matching, and priority chain resolution
 */

import { EventEmitter } from 'events';

export interface ResourceDefinition {
  name: string;
  extends?: string;
  characteristics: Record<string, any>;
}

export interface ResourceRequirement {
  name: string;
  characteristics?: Record<string, any>;
  priority: PriorityItem[];
}

export interface PriorityItem {
  type: 'specific' | 'characteristics' | 'emergency';
  specific?: string;
  characteristics?: Record<string, any>;
  warning?: string;
}

export interface AllocatedResource {
  name: string;
  definition: ResourceDefinition;
  instance: any;
  allocatedAt: Date;
  allocatedTo: string;
  priority: number;
  warning?: string;
}

export interface ResourceAllocationResult {
  success: boolean;
  allocatedResources: AllocatedResource[];
  failures: ResourceAllocationFailure[];
  warnings: string[];
}

export interface ResourceAllocationFailure {
  requirementName: string;
  reason: string;
  availableAlternatives: string[];
}

export interface ResourceReservation {
  id: string;
  stepId: string;
  requirements: ResourceRequirement[];
  reservedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'allocated' | 'expired' | 'released';
}

/**
 * Manages resource definitions, allocation, and lifecycle
 */
export class ResourceManager extends EventEmitter {
  private resources: Map<string, ResourceDefinition>;
  private allocations: Map<string, AllocatedResource>;
  private reservations: Map<string, ResourceReservation>;
  private instances: Map<string, any>;

  constructor() {
    super();
    this.resources = new Map();
    this.allocations = new Map();
    this.reservations = new Map();
    this.instances = new Map();
  }

  /**
   * Register resource definitions
   */
  registerResource(definition: ResourceDefinition): void {
    // Resolve inheritance if extends is specified
    if (definition.extends) {
      const parent = this.resources.get(definition.extends);
      if (parent) {
        definition.characteristics = {
          ...parent.characteristics,
          ...definition.characteristics
        };
      }
    }

    this.resources.set(definition.name, definition);
    this.emit('resource:registered', definition);
  }

  /**
   * Register resource instances
   */
  registerInstance(resourceName: string, instance: any): void {
    this.instances.set(resourceName, instance);
    this.emit('instance:registered', { resourceName, instance });
  }

  /**
   * Allocate resources for a step
   */
  async allocateResources(
    stepId: string,
    requirements: ResourceRequirement[]
  ): Promise<ResourceAllocationResult> {
    const allocatedResources: AllocatedResource[] = [];
    const failures: ResourceAllocationFailure[] = [];
    const warnings: string[] = [];

    for (const requirement of requirements) {
      try {
        const result = await this.allocateResource(stepId, requirement);
        
        if (result.success) {
          allocatedResources.push(result.resource!);
          if (result.warning) {
            warnings.push(result.warning);
          }
        } else {
          failures.push({
            requirementName: requirement.name,
            reason: result.reason!,
            availableAlternatives: result.alternatives || []
          });
        }
      } catch (error) {
        failures.push({
          requirementName: requirement.name,
          reason: error instanceof Error ? error.message : 'Unknown error',
          availableAlternatives: []
        });
      }
    }

    const allocationResult: ResourceAllocationResult = {
      success: failures.length === 0,
      allocatedResources,
      failures,
      warnings
    };

    this.emit('resources:allocated', { stepId, result: allocationResult });
    return allocationResult;
  }

  /**
   * Release resources for a step
   */
  async releaseResources(stepId: string): Promise<void> {
    const releasedResources: AllocatedResource[] = [];

    for (const [key, allocation] of this.allocations) {
      if (allocation.allocatedTo === stepId) {
        this.allocations.delete(key);
        releasedResources.push(allocation);
      }
    }

    this.emit('resources:released', { stepId, resources: releasedResources });
  }

  /**
   * Reserve resources for future allocation
   */
  async reserveResources(
    stepId: string,
    requirements: ResourceRequirement[],
    expirationMinutes: number = 15
  ): Promise<ResourceReservation> {
    const reservationId = `${stepId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const reservation: ResourceReservation = {
      id: reservationId,
      stepId,
      requirements,
      reservedAt: new Date(),
      expiresAt,
      status: 'pending'
    };

    this.reservations.set(reservationId, reservation);
    this.emit('resources:reserved', reservation);

    // Set expiration timer
    setTimeout(() => {
      this.expireReservation(reservationId);
    }, expirationMinutes * 60 * 1000);

    return reservation;
  }

  /**
   * Get resource utilization statistics
   */
  getUtilizationStats(): {
    totalResources: number;
    allocatedResources: number;
    availableResources: number;
    utilizationRate: number;
    allocationsByType: Record<string, number>;
  } {
    const totalResources = this.resources.size;
    const allocatedResources = this.allocations.size;
    const availableResources = totalResources - allocatedResources;
    const utilizationRate = totalResources > 0 ? allocatedResources / totalResources : 0;

    const allocationsByType: Record<string, number> = {};
    for (const allocation of this.allocations.values()) {
      const type = allocation.definition.characteristics.type || 'unknown';
      allocationsByType[type] = (allocationsByType[type] || 0) + 1;
    }

    return {
      totalResources,
      allocatedResources,
      availableResources,
      utilizationRate,
      allocationsByType
    };
  }

  /**
   * Find resources matching characteristics
   */
  findMatchingResources(characteristics: Record<string, any>): ResourceDefinition[] {
    const matches: ResourceDefinition[] = [];

    for (const resource of this.resources.values()) {
      if (this.matchesCharacteristics(resource.characteristics, characteristics)) {
        matches.push(resource);
      }
    }

    return matches.sort((a, b) => this.calculateMatchScore(b, characteristics) - this.calculateMatchScore(a, characteristics));
  }

  /**
   * Allocate a single resource following priority chain
   */
  private async allocateResource(
    stepId: string,
    requirement: ResourceRequirement
  ): Promise<{
    success: boolean;
    resource?: AllocatedResource;
    reason?: string;
    warning?: string;
    alternatives?: string[];
  }> {
    // Try each priority item in order
    for (let i = 0; i < requirement.priority.length; i++) {
      const priorityItem = requirement.priority[i];
      const result = await this.tryAllocatePriorityItem(stepId, requirement.name, priorityItem);

      if (result.success) {
        return {
          success: true,
          resource: result.resource,
          warning: priorityItem.warning
        };
      }

      // If this was the last option and it failed, return failure
      if (i === requirement.priority.length - 1) {
        return {
          success: false,
          reason: result.reason,
          alternatives: this.getAlternativeSuggestions(requirement)
        };
      }
    }

    return {
      success: false,
      reason: 'No priority items specified',
      alternatives: []
    };
  }

  /**
   * Try to allocate based on a priority item
   */
  private async tryAllocatePriorityItem(
    stepId: string,
    requirementName: string,
    priorityItem: PriorityItem
  ): Promise<{
    success: boolean;
    resource?: AllocatedResource;
    reason?: string;
  }> {
    let candidates: ResourceDefinition[] = [];

    if (priorityItem.type === 'specific' && priorityItem.specific) {
      // Try to find specific resource
      const specific = this.resources.get(priorityItem.specific);
      if (specific) {
        candidates = [specific];
      }
    } else if (priorityItem.type === 'characteristics' && priorityItem.characteristics) {
      // Find resources matching characteristics
      candidates = this.findMatchingResources(priorityItem.characteristics);
    } else if (priorityItem.type === 'emergency' && priorityItem.characteristics) {
      // Emergency fallback with warning
      candidates = this.findMatchingResources(priorityItem.characteristics);
    }

    // Try to allocate from candidates
    for (const candidate of candidates) {
      if (this.isResourceAvailable(candidate.name)) {
        const instance = this.instances.get(candidate.name);
        
        const allocation: AllocatedResource = {
          name: requirementName,
          definition: candidate,
          instance,
          allocatedAt: new Date(),
          allocatedTo: stepId,
          priority: this.calculatePriority(priorityItem)
        };

        this.allocations.set(`${stepId}-${requirementName}`, allocation);
        
        return {
          success: true,
          resource: allocation
        };
      }
    }

    return {
      success: false,
      reason: candidates.length > 0 ? 'All matching resources are busy' : 'No matching resources found'
    };
  }

  /**
   * Check if resource is available for allocation
   */
  private isResourceAvailable(resourceName: string): boolean {
    // Check if resource is already allocated
    for (const allocation of this.allocations.values()) {
      if (allocation.definition.name === resourceName) {
        return false;
      }
    }

    // Check if resource instance exists
    return this.instances.has(resourceName);
  }

  /**
   * Check if resource characteristics match requirement
   */
  private matchesCharacteristics(
    resourceChars: Record<string, any>,
    requiredChars: Record<string, any>
  ): boolean {
    for (const [key, requiredValue] of Object.entries(requiredChars)) {
      const resourceValue = resourceChars[key];

      if (key === 'capabilities') {
        // Special handling for capabilities (array matching)
        if (!this.hasRequiredCapabilities(resourceChars.capabilities, requiredValue)) {
          return false;
        }
      } else if (typeof requiredValue === 'string' && requiredValue.startsWith('>')) {
        // Numeric comparison (e.g., ">5")
        const threshold = parseFloat(requiredValue.slice(1));
        if (typeof resourceValue !== 'number' || resourceValue <= threshold) {
          return false;
        }
      } else if (typeof requiredValue === 'string' && requiredValue.startsWith('<')) {
        // Numeric comparison (e.g., "<10")
        const threshold = parseFloat(requiredValue.slice(1));
        if (typeof resourceValue !== 'number' || resourceValue >= threshold) {
          return false;
        }
      } else if (requiredValue !== resourceValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if resource has required capabilities
   */
  private hasRequiredCapabilities(
    resourceCapabilities: string[] = [],
    requiredCapabilities: string | string[]
  ): boolean {
    const required = Array.isArray(requiredCapabilities) ? requiredCapabilities : [requiredCapabilities];
    return required.every(cap => resourceCapabilities.includes(cap));
  }

  /**
   * Calculate match score for sorting
   */
  private calculateMatchScore(resource: ResourceDefinition, characteristics: Record<string, any>): number {
    let score = 0;
    
    for (const [key, value] of Object.entries(characteristics)) {
      if (resource.characteristics[key] === value) {
        score += 10; // Exact match
      } else if (key === 'capabilities' && this.hasRequiredCapabilities(resource.characteristics.capabilities, value)) {
        score += 5; // Capability match
      }
    }

    return score;
  }

  /**
   * Calculate priority score
   */
  private calculatePriority(priorityItem: PriorityItem): number {
    switch (priorityItem.type) {
      case 'specific':
        return 10;
      case 'characteristics':
        return 5;
      case 'emergency':
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Get alternative resource suggestions
   */
  private getAlternativeSuggestions(requirement: ResourceRequirement): string[] {
    const alternatives: string[] = [];
    
    // Look for similar resources
    for (const resource of this.resources.values()) {
      if (requirement.characteristics) {
        const score = this.calculateMatchScore(resource, requirement.characteristics);
        if (score > 0) {
          alternatives.push(resource.name);
        }
      }
    }

    return alternatives.slice(0, 5); // Return top 5 alternatives
  }

  /**
   * Expire a resource reservation
   */
  private expireReservation(reservationId: string): void {
    const reservation = this.reservations.get(reservationId);
    if (reservation && reservation.status === 'pending') {
      reservation.status = 'expired';
      this.emit('reservation:expired', reservation);
    }
  }
}