/**
 * Tests for BusyRuntime - BUSY v2.0 Main Runtime Orchestrator
 * Tests runtime coordination, playbook execution, and component integration
 */

import { 
  BusyRuntime, 
  RuntimeConfig, 
  PlaybookExecution,
  StepExecution 
} from '../../src/runtime/busy-runtime';
import { ExecutionPolicy } from '../../src/runtime/execution-manager';
import { CapabilityDefinition, ResponsibilityDefinition } from '../../src/runtime/capability-resolver';
import { ResourceDefinition } from '../../src/runtime/resource-manager';

describe('BusyRuntime', () => {
  let runtime: BusyRuntime;
  let mockConfig: RuntimeConfig;

  beforeEach(() => {
    const executionPolicy: ExecutionPolicy = {
      defaultChain: ['algorithmic', 'ai', 'human'],
      allowHumanOverride: true,
      maxRetries: 3,
      executionTimeout: 5000,
      availableTypes: ['algorithmic', 'ai', 'human']
    };

    mockConfig = {
      executionPolicy,
      resourceConfig: {
        maxConcurrentAllocations: 10,
        defaultReservationMinutes: 15
      },
      capabilityConfig: {
        enableMarketplace: true,
        cacheResolutions: true
      }
    };

    runtime = new BusyRuntime(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize with capabilities, responsibilities, and resources', async () => {
      const capabilities: CapabilityDefinition[] = [
        {
          name: 'qualify-lead',
          description: 'Assess lead potential',
          method: 'Review lead information and score',
          inputs: [
            {
              name: 'raw_lead',
              type: 'data',
              format: 'lead_info',
              fields: [
                { name: 'company_name', type: 'string', required: true }
              ]
            }
          ],
          outputs: [
            {
              name: 'qualified_lead',
              type: 'data',
              format: 'qualification_result',
              fields: [
                { name: 'status', type: 'string', required: true }
              ]
            }
          ]
        }
      ];

      const responsibilities: ResponsibilityDefinition[] = [
        {
          name: 'maintain-quality',
          description: 'Monitor lead quality',
          method: 'Track and alert on quality metrics',
          inputs: [],
          outputs: [],
          monitoringType: 'continuous'
        }
      ];

      const resources: ResourceDefinition[] = [
        {
          name: 'jane_doe',
          characteristics: {
            type: 'person',
            role: 'sales_rep',
            capabilities: ['qualify-lead']
          }
        }
      ];

      const initSpy = jest.fn();
      runtime.on('runtime:initialized', initSpy);

      await runtime.initialize({
        capabilities,
        responsibilities,
        resources
      });

      expect(initSpy).toHaveBeenCalledWith({
        capabilities: 1,
        responsibilities: 1,
        resources: 1,
        providers: 0
      });
    });

    it('should handle partial initialization data', async () => {
      await runtime.initialize({
        capabilities: [
          {
            name: 'test-capability',
            description: 'Test capability',
            method: 'Test method',
            inputs: [],
            outputs: []
          }
        ]
      });

      // Should not throw error and should emit event
      const spy = jest.fn();
      runtime.on('runtime:initialized', spy);
      
      await runtime.initialize({});
      
      expect(spy).toHaveBeenCalledWith({
        capabilities: 0,
        responsibilities: 0,
        resources: 0,
        providers: 0
      });
    });
  });

  describe('playbook execution', () => {
    beforeEach(async () => {
      // Initialize with test data
      await runtime.initialize({
        capabilities: [
          {
            name: 'qualify-lead',
            description: 'Lead qualification',
            method: 'Qualify the lead based on criteria',
            inputs: [],
            outputs: []
          }
        ],
        resources: [
          {
            name: 'sales_rep',
            characteristics: {
              type: 'person',
              capabilities: ['qualify-lead']
            }
          }
        ]
      });
    });

    it('should execute playbook successfully', async () => {
      const startSpy = jest.fn();
      const completedSpy = jest.fn();
      
      runtime.on('playbook:started', startSpy);
      runtime.on('playbook:completed', completedSpy);

      // Mock the loadPlaybookDefinition method
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'test-playbook',
        steps: [
          {
            name: 'qualify_lead',
            method: 'Review and qualify the incoming lead',
            requirements: []
          }
        ]
      });

      // Mock step execution
      jest.spyOn(runtime as any, 'executeStep').mockResolvedValue({
        id: 'step-1',
        name: 'qualify_lead',
        status: 'completed',
        method: 'Review and qualify the incoming lead',
        inputs: { lead_id: 123 },
        outputs: { status: 'qualified' },
        requirements: [],
        allocatedResources: [],
        warnings: [],
        errors: []
      });

      const execution = await runtime.executePlaybook('test-playbook', { lead_id: 123 });

      expect(execution.status).toBe('completed');
      expect(execution.playbookName).toBe('test-playbook');
      expect(execution.inputs).toEqual({ lead_id: 123 });
      expect(execution.steps).toHaveLength(1);
      
      expect(startSpy).toHaveBeenCalledWith(expect.objectContaining({
        playbookName: 'test-playbook'
      }));
      expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed'
      }));
    });

    it('should handle playbook execution failures', async () => {
      const failedSpy = jest.fn();
      runtime.on('playbook:failed', failedSpy);

      // Mock loadPlaybookDefinition to return playbook with failing step
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'failing-playbook',
        steps: [
          {
            name: 'failing_step',
            method: 'This step will fail',
            requirements: []
          }
        ]
      });

      // Mock step execution to throw error
      jest.spyOn(runtime as any, 'executeStep').mockRejectedValue(
        new Error('Step execution failed')
      );

      await expect(runtime.executePlaybook('failing-playbook', {}))
        .rejects.toThrow('Step execution failed');

      expect(failedSpy).toHaveBeenCalledWith({
        execution: expect.objectContaining({ status: 'failed' }),
        error: expect.any(Error)
      });
    });

    it('should pass outputs between steps', async () => {
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'multi-step-playbook',
        steps: [
          {
            name: 'step1',
            method: 'First step',
            requirements: []
          },
          {
            name: 'step2', 
            method: 'Second step',
            requirements: []
          }
        ]
      });

      const executeStepSpy = jest.spyOn(runtime as any, 'executeStep')
        .mockResolvedValueOnce({
          id: 'step-1',
          name: 'step1',
          status: 'completed',
          method: 'First step',
          inputs: {},
          outputs: { intermediate_result: 'from_step1' },
          requirements: [],
          allocatedResources: [],
          warnings: [],
          errors: []
        })
        .mockResolvedValueOnce({
          id: 'step-2',
          name: 'step2',
          status: 'completed',
          method: 'Second step',
          inputs: { intermediate_result: 'from_step1' },
          outputs: { final_result: 'completed' },
          requirements: [],
          allocatedResources: [],
          warnings: [],
          errors: []
        });

      const execution = await runtime.executePlaybook('multi-step-playbook', {});

      expect(execution.status).toBe('completed');
      expect(execution.outputs.final_result).toBe('completed');
      
      // Verify step 2 received output from step 1
      expect(executeStepSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: 'step2' }),
        expect.objectContaining({ intermediate_result: 'from_step1' })
      );
    });
  });

  describe('step execution', () => {
    beforeEach(async () => {
      await runtime.initialize({
        resources: [
          {
            name: 'test_resource',
            characteristics: {
              type: 'test',
              capabilities: ['test-capability']
            }
          }
        ]
      });

      // Register resource instance
      runtime['resourceManager'].registerInstance('test_resource', { 
        status: 'available' 
      });
    });

    it('should execute step with resource allocation', async () => {
      const stepExecution: StepExecution = {
        id: 'test-step',
        name: 'test_step',
        status: 'pending',
        method: 'Execute test step',
        inputs: { test_input: 'value' },
        outputs: {},
        requirements: [
          {
            name: 'test_req',
            priority: [
              {
                type: 'specific',
                specific: 'test_resource'
              }
            ]
          }
        ],
        allocatedResources: [],
        warnings: [],
        errors: []
      };

      // Mock execution manager
      jest.spyOn(runtime['executionManager'], 'executeStep').mockResolvedValue({
        success: true,
        outputs: { result: 'test_output' },
        executionType: 'algorithmic',
        duration: 100,
        logs: []
      });

      const result = await runtime.executeStep(stepExecution, { test_input: 'value' });

      expect(result.status).toBe('completed');
      expect(result.outputs.result).toBe('test_output');
      expect(result.allocatedResources).toHaveLength(1);
    });

    it('should handle resource allocation failures', async () => {
      const stepExecution: StepExecution = {
        id: 'test-step',
        name: 'test_step',
        status: 'pending',
        method: 'Execute test step',
        inputs: {},
        outputs: {},
        requirements: [
          {
            name: 'impossible_req',
            priority: [
              {
                type: 'specific',
                specific: 'non_existent_resource'
              }
            ]
          }
        ],
        allocatedResources: [],
        warnings: [],
        errors: []
      };

      await expect(runtime.executeStep(stepExecution, {}))
        .rejects.toThrow('Resource allocation failed');

      expect(stepExecution.status).toBe('failed');
      expect(stepExecution.errors.length).toBeGreaterThan(0);
    });

    it('should emit step events', async () => {
      const startSpy = jest.fn();
      const completedSpy = jest.fn();
      
      runtime.on('step:started', startSpy);
      runtime.on('step:completed', completedSpy);

      const stepExecution: StepExecution = {
        id: 'test-step',
        name: 'test_step',
        status: 'pending',
        method: 'Execute test step',
        inputs: {},
        outputs: {},
        requirements: [],
        allocatedResources: [],
        warnings: [],
        errors: []
      };

      jest.spyOn(runtime['executionManager'], 'executeStep').mockResolvedValue({
        success: true,
        outputs: {},
        executionType: 'algorithmic',
        duration: 50,
        logs: []
      });

      await runtime.executeStep(stepExecution, {});

      expect(startSpy).toHaveBeenCalledWith(stepExecution);
      expect(completedSpy).toHaveBeenCalledWith(stepExecution);
    });
  });

  describe('execution management', () => {
    let execution: PlaybookExecution;

    beforeEach(async () => {
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'test-playbook',
        steps: [
          {
            name: 'test_step',
            method: 'Test step method',
            requirements: []
          }
        ]
      });

      jest.spyOn(runtime as any, 'executeStep').mockResolvedValue({
        id: 'step-1',
        name: 'test_step',
        status: 'completed',
        method: 'Test step method',
        inputs: {},
        outputs: {},
        requirements: [],
        allocatedResources: [],
        warnings: [],
        errors: []
      });

      execution = await runtime.executePlaybook('test-playbook', {});
    });

    it('should get execution status', () => {
      const status = runtime.getExecutionStatus(execution.id);
      expect(status).toEqual(execution);
    });

    it('should list active executions', () => {
      const activeExecutions = runtime.listActiveExecutions();
      expect(activeExecutions).toContain(execution);
    });

    it('should pause execution', async () => {
      const pausedSpy = jest.fn();
      runtime.on('playbook:paused', pausedSpy);

      // Start a new execution that we can pause
      const runningExecution = { ...execution, status: 'running' as const };
      runtime['activeExecutions'].set(runningExecution.id, runningExecution);

      const result = await runtime.pauseExecution(runningExecution.id);

      expect(result).toBe(true);
      expect(runningExecution.status).toBe('paused');
      expect(pausedSpy).toHaveBeenCalledWith(runningExecution);
    });

    it('should resume execution', async () => {
      const resumedSpy = jest.fn();
      runtime.on('playbook:resumed', resumedSpy);

      // Create paused execution
      const pausedExecution = { ...execution, status: 'paused' as const };
      runtime['activeExecutions'].set(pausedExecution.id, pausedExecution);

      const result = await runtime.resumeExecution(pausedExecution.id);

      expect(result).toBe(true);
      expect(pausedExecution.status).toBe('running');
      expect(resumedSpy).toHaveBeenCalledWith(pausedExecution);
    });

    it('should cancel execution', async () => {
      const cancelledSpy = jest.fn();
      runtime.on('playbook:cancelled', cancelledSpy);

      const result = await runtime.cancelExecution(execution.id);

      expect(result).toBe(true);
      expect(runtime.getExecutionStatus(execution.id)).toBeNull();
      expect(cancelledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    it('should release resources when cancelling execution', async () => {
      // Create execution with allocated resources
      const executionWithResources = {
        ...execution,
        steps: [
          {
            id: 'step-1',
            name: 'test_step',
            status: 'completed' as const,
            method: 'Test method',
            inputs: {},
            outputs: {},
            requirements: [],
            allocatedResources: [{ resourceId: 'test-resource' }],
            warnings: [],
            errors: []
          }
        ]
      };

      runtime['activeExecutions'].set(executionWithResources.id, executionWithResources);

      const releaseResourcesSpy = jest.spyOn(runtime['resourceManager'], 'releaseResources');

      await runtime.cancelExecution(executionWithResources.id);

      expect(releaseResourcesSpy).toHaveBeenCalledWith('step-1');
    });
  });

  describe('runtime statistics', () => {
    it('should provide runtime statistics', () => {
      const stats = runtime.getRuntimeStats();

      expect(stats).toHaveProperty('activeExecutions');
      expect(stats).toHaveProperty('completedExecutions');
      expect(stats).toHaveProperty('resourceUtilization');
      expect(stats).toHaveProperty('capabilityMarketplace');
      expect(stats).toHaveProperty('executionPolicies');
      
      expect(typeof stats.activeExecutions).toBe('number');
      expect(typeof stats.completedExecutions).toBe('number');
    });

    it('should accurately count executions', async () => {
      // Mock playbook execution
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'stats-test',
        steps: []
      });

      // Create completed execution
      await runtime.executePlaybook('stats-test', {});

      // Create running execution
      const runningExecution = await runtime.executePlaybook('stats-test', {});
      runningExecution.status = 'running';
      runtime['activeExecutions'].set(runningExecution.id, runningExecution);

      const stats = runtime.getRuntimeStats();

      expect(stats.activeExecutions).toBe(1);
      expect(stats.completedExecutions).toBe(1);
    });
  });

  describe('configuration management', () => {
    it('should update runtime configuration', () => {
      const configSpy = jest.fn();
      runtime.on('config:updated', configSpy);

      const newConfig = {
        executionPolicy: {
          ...mockConfig.executionPolicy,
          maxRetries: 5
        }
      };

      runtime.updateConfig(newConfig);

      expect(configSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          executionPolicy: expect.objectContaining({ maxRetries: 5 })
        })
      );
    });

    it('should update execution manager policy', () => {
      const updatePolicySpy = jest.spyOn(runtime['executionManager'], 'updatePolicy');

      const newPolicy: ExecutionPolicy = {
        defaultChain: ['human', 'ai'],
        allowHumanOverride: false,
        maxRetries: 1,
        executionTimeout: 1000,
        availableTypes: ['human', 'ai']
      };

      runtime.updateConfig({ executionPolicy: newPolicy });

      expect(updatePolicySpy).toHaveBeenCalledWith(newPolicy);
    });
  });

  describe('shutdown', () => {
    it('should gracefully shutdown runtime', async () => {
      const shutdownSpy = jest.fn();
      runtime.on('runtime:shutdown', shutdownSpy);

      // Create some active executions
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'test-playbook',
        steps: []
      });

      const execution1 = await runtime.executePlaybook('test-1', {});
      const execution2 = await runtime.executePlaybook('test-2', {});

      execution1.status = 'running';
      execution2.status = 'running';
      runtime['activeExecutions'].set(execution1.id, execution1);
      runtime['activeExecutions'].set(execution2.id, execution2);

      await runtime.shutdown();

      expect(runtime.listActiveExecutions()).toHaveLength(0);
      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe('event forwarding', () => {
    it('should forward execution manager events', () => {
      const executionCompletedSpy = jest.fn();
      const executionFailedSpy = jest.fn();

      runtime.on('execution:completed', executionCompletedSpy);
      runtime.on('execution:failed', executionFailedSpy);

      // Simulate events from execution manager
      runtime['executionManager'].emit('execution:completed', { test: 'data' });
      runtime['executionManager'].emit('execution:failed', { error: 'test' });

      expect(executionCompletedSpy).toHaveBeenCalledWith({ test: 'data' });
      expect(executionFailedSpy).toHaveBeenCalledWith({ error: 'test' });
    });

    it('should forward resource manager events', () => {
      const resourcesAllocatedSpy = jest.fn();
      const resourcesReleasedSpy = jest.fn();

      runtime.on('resources:allocated', resourcesAllocatedSpy);
      runtime.on('resources:released', resourcesReleasedSpy);

      runtime['resourceManager'].emit('resources:allocated', { stepId: 'test' });
      runtime['resourceManager'].emit('resources:released', { stepId: 'test' });

      expect(resourcesAllocatedSpy).toHaveBeenCalledWith({ stepId: 'test' });
      expect(resourcesReleasedSpy).toHaveBeenCalledWith({ stepId: 'test' });
    });

    it('should forward capability resolver events', () => {
      const capabilitiesResolvedSpy = jest.fn();

      runtime.on('capabilities:resolved', capabilitiesResolvedSpy);

      runtime['capabilityResolver'].emit('capabilities:resolved', { 
        context: { requiredCapabilities: [], availableProviders: [] },
        result: { success: true, resolvedCapabilities: new Map(), unresolved: [], conflicts: [], warnings: [] }
      });

      expect(capabilitiesResolvedSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      const badCapability = {
        name: '', // Invalid empty name
        description: 'Bad capability',
        method: 'Bad method',
        inputs: [],
        outputs: []
      };

      // Should not throw error even with bad data
      await expect(runtime.initialize({
        capabilities: [badCapability as any]
      })).resolves.not.toThrow();
    });

    it('should handle execution errors in step processing', async () => {
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'error-playbook',
        steps: [
          {
            name: 'error_step',
            method: 'This will cause an error',
            requirements: []
          }
        ]
      });

      // Mock executeStep to throw an error
      jest.spyOn(runtime as any, 'executeStep').mockRejectedValue(
        new Error('Simulated step error')
      );

      await expect(runtime.executePlaybook('error-playbook', {}))
        .rejects.toThrow('Simulated step error');
    });
  });
});