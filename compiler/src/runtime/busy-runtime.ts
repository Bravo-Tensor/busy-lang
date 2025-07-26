/**
 * BUSY Runtime - Main orchestrator for v2.0
 * Coordinates execution, resource management, and capability resolution
 */

import { EventEmitter } from 'events';
import { ExecutionManager, ExecutionContext, ExecutionResult, ExecutionPolicy } from './execution-manager';
import { ResourceManager, ResourceDefinition, ResourceRequirement, ResourceAllocationResult } from './resource-manager';
import { CapabilityResolver, CapabilityDefinition, ResponsibilityDefinition, CapabilityProvider } from './capability-resolver';

export interface RuntimeConfig {
  executionPolicy: ExecutionPolicy;
  resourceConfig?: {
    maxConcurrentAllocations?: number;
    defaultReservationMinutes?: number;
  };
  capabilityConfig?: {
    enableMarketplace?: boolean;
    cacheResolutions?: boolean;
  };
}

export interface PlaybookExecution {
  id: string;
  playbookName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentStep?: string;
  startTime: Date;
  endTime?: Date;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  steps: StepExecution[];
  metadata: Record<string, any>;
}

export interface StepExecution {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  method: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  requirements: ResourceRequirement[];
  allocatedResources: any[];
  executionResult?: ExecutionResult;
  startTime?: Date;
  endTime?: Date;
  warnings: string[];
  errors: string[];
}

/**
 * Main BUSY Runtime that orchestrates all v2.0 components
 */
export class BusyRuntime extends EventEmitter {
  private executionManager: ExecutionManager;
  private resourceManager: ResourceManager;
  private capabilityResolver: CapabilityResolver;
  private config: RuntimeConfig;
  
  private activeExecutions: Map<string, PlaybookExecution>;
  private stepCounter: number = 0;

  constructor(config: RuntimeConfig) {
    super();
    this.config = config;
    this.activeExecutions = new Map();
    
    // Initialize managers
    this.executionManager = new ExecutionManager(config.executionPolicy);
    this.resourceManager = new ResourceManager();
    this.capabilityResolver = new CapabilityResolver();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize runtime with definitions
   */
  async initialize(data: {
    capabilities?: CapabilityDefinition[];
    responsibilities?: ResponsibilityDefinition[];
    resources?: ResourceDefinition[];
    providers?: CapabilityProvider[];
  }): Promise<void> {
    // Register capabilities
    if (data.capabilities) {
      for (const capability of data.capabilities) {
        this.capabilityResolver.registerCapability(capability);
      }
    }

    // Register responsibilities
    if (data.responsibilities) {
      for (const responsibility of data.responsibilities) {
        this.capabilityResolver.registerResponsibility(responsibility);
      }
    }

    // Register resources
    if (data.resources) {
      for (const resource of data.resources) {
        this.resourceManager.registerResource(resource);
      }
    }

    // Register providers
    if (data.providers) {
      for (const provider of data.providers) {
        this.capabilityResolver.registerProvider(provider);
      }
    }

    this.emit('runtime:initialized', { 
      capabilities: data.capabilities?.length || 0,
      responsibilities: data.responsibilities?.length || 0,
      resources: data.resources?.length || 0,
      providers: data.providers?.length || 0
    });
  }

  /**
   * Execute a playbook
   */
  async executePlaybook(
    playbookName: string,
    inputs: Record<string, any>,
    metadata: Record<string, any> = {}
  ): Promise<PlaybookExecution> {
    const executionId = `${playbookName}-${Date.now()}`;
    
    const execution: PlaybookExecution = {
      id: executionId,
      playbookName,
      status: 'pending',
      startTime: new Date(),
      inputs,
      outputs: {},
      steps: [],
      metadata
    };

    this.activeExecutions.set(executionId, execution);
    this.emit('playbook:started', execution);

    try {
      // Load playbook definition (mock for now)
      const playbookDef = await this.loadPlaybookDefinition(playbookName);
      
      execution.status = 'running';
      execution.steps = playbookDef.steps.map(stepDef => ({
        id: `step-${++this.stepCounter}`,
        name: stepDef.name,
        status: 'pending',
        method: stepDef.method,
        inputs: {},
        outputs: {},
        requirements: stepDef.requirements || [],
        allocatedResources: [],
        warnings: [],
        errors: []
      }));

      // Execute steps sequentially
      let currentInputs = inputs;
      
      for (const step of execution.steps) {
        try {
          const result = await this.executeStep(step, currentInputs);
          currentInputs = { ...currentInputs, ...result.outputs };
        } catch (error) {
          step.status = 'failed';
          step.errors.push(error instanceof Error ? error.message : 'Unknown error');
          execution.status = 'failed';
          throw error;
        }
      }

      execution.outputs = currentInputs;
      execution.status = 'completed';
      execution.endTime = new Date();

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      this.emit('playbook:failed', { execution, error });
      throw error;
    }

    this.emit('playbook:completed', execution);
    return execution;
  }

  /**
   * Execute a single step
   */
  async executeStep(step: StepExecution, inputs: Record<string, any>): Promise<StepExecution> {
    step.status = 'running';
    step.startTime = new Date();
    step.inputs = inputs;
    
    this.emit('step:started', step);

    try {
      // Allocate resources
      if (step.requirements.length > 0) {
        const allocation = await this.resourceManager.allocateResources(step.id, step.requirements);
        
        if (!allocation.success) {
          const errorMsg = `Resource allocation failed: ${allocation.failures.map(f => f.reason).join(', ')}`;
          step.errors.push(errorMsg);
          step.status = 'failed';
          throw new Error(errorMsg);
        }
        
        step.allocatedResources = allocation.allocatedResources;
        step.warnings.push(...allocation.warnings);
      }

      // Execute step
      const executionContext: ExecutionContext = {
        stepId: step.id,
        method: step.method,
        inputs: step.inputs,
        resources: step.allocatedResources
      };

      const result = await this.executionManager.executeStep(executionContext);
      
      step.executionResult = result;
      step.outputs = result.outputs;
      step.status = result.success ? 'completed' : 'failed';
      
      if (!result.success && result.error) {
        step.errors.push(result.error.message);
      }

    } catch (error) {
      step.status = 'failed';
      step.errors.push(error instanceof Error ? error.message : 'Unknown error');
      throw error;
      
    } finally {
      step.endTime = new Date();
      
      // Release resources
      if (step.allocatedResources.length > 0) {
        await this.resourceManager.releaseResources(step.id);
      }
      
      this.emit('step:completed', step);
    }

    return step;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): PlaybookExecution | null {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * List all active executions
   */
  listActiveExecutions(): PlaybookExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'paused';
    this.emit('playbook:paused', execution);
    return true;
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution || execution.status !== 'paused') {
      return false;
    }

    execution.status = 'running';
    this.emit('playbook:resumed', execution);
    
    // Continue from current step
    const currentStepIndex = execution.steps.findIndex(s => s.status === 'running' || s.status === 'pending');
    if (currentStepIndex >= 0) {
      // Resume execution logic would go here
    }

    return true;
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    // Release all allocated resources
    for (const step of execution.steps) {
      if (step.allocatedResources.length > 0) {
        await this.resourceManager.releaseResources(step.id);
      }
    }

    execution.status = 'failed';
    execution.endTime = new Date();
    
    this.activeExecutions.delete(executionId);
    this.emit('playbook:cancelled', execution);
    
    return true;
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats(): {
    activeExecutions: number;
    completedExecutions: number;
    resourceUtilization: any;
    capabilityMarketplace: any;
    executionPolicies: ExecutionPolicy;
  } {
    const activeCount = Array.from(this.activeExecutions.values())
      .filter(e => e.status === 'running').length;
    
    const completedCount = Array.from(this.activeExecutions.values())
      .filter(e => e.status === 'completed').length;

    return {
      activeExecutions: activeCount,
      completedExecutions: completedCount,
      resourceUtilization: this.resourceManager.getUtilizationStats(),
      capabilityMarketplace: this.capabilityResolver.getMarketplaceInfo(),
      executionPolicies: this.config.executionPolicy
    };
  }

  /**
   * Update runtime configuration
   */
  updateConfig(newConfig: Partial<RuntimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.executionPolicy) {
      this.executionManager.updatePolicy(newConfig.executionPolicy);
    }
    
    this.emit('config:updated', this.config);
  }

  /**
   * Shutdown runtime gracefully
   */
  async shutdown(): Promise<void> {
    // Cancel all active executions
    const activeIds = Array.from(this.activeExecutions.keys());
    for (const id of activeIds) {
      await this.cancelExecution(id);
    }

    this.emit('runtime:shutdown');
  }

  /**
   * Setup event handlers between managers
   */
  private setupEventHandlers(): void {
    // Forward execution manager events
    this.executionManager.on('execution:completed', (data) => {
      this.emit('execution:completed', data);
    });

    this.executionManager.on('execution:failed', (data) => {
      this.emit('execution:failed', data);
    });

    // Forward resource manager events
    this.resourceManager.on('resources:allocated', (data) => {
      this.emit('resources:allocated', data);
    });

    this.resourceManager.on('resources:released', (data) => {
      this.emit('resources:released', data);
    });

    // Forward capability resolver events
    this.capabilityResolver.on('capabilities:resolved', (data) => {
      this.emit('capabilities:resolved', data);
    });
  }

  /**
   * Load playbook definition (mock implementation)
   */
  private async loadPlaybookDefinition(playbookName: string): Promise<{
    name: string;
    steps: Array<{
      name: string;
      method: string;
      requirements?: ResourceRequirement[];
    }>;
  }> {
    // Mock implementation - would load from compiled playbook files
    return {
      name: playbookName,
      steps: [
        {
          name: 'example_step',
          method: 'Execute example step with given inputs',
          requirements: []
        }
      ]
    };
  }
}