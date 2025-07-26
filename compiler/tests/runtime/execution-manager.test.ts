/**
 * Tests for ExecutionManager - BUSY v2.0 Runtime
 * Tests execution strategy selection, fallback chains, and policy management
 */

import { ExecutionManager, ExecutionPolicy, ExecutionContext, ExecutionResult } from '../../src/runtime/execution-manager';

describe('ExecutionManager', () => {
  let executionManager: ExecutionManager;
  let mockPolicy: ExecutionPolicy;

  beforeEach(() => {
    mockPolicy = {
      defaultChain: ['algorithmic', 'ai', 'human'],
      allowHumanOverride: true,
      maxRetries: 3,
      executionTimeout: 5000,
      availableTypes: ['algorithmic', 'ai', 'human']
    };
    
    executionManager = new ExecutionManager(mockPolicy);
  });

  describe('executeStep', () => {
    const mockContext: ExecutionContext = {
      stepId: 'test-step-1',
      method: 'Test execution method with calculation',
      inputs: { value: 42 },
      resources: []
    };

    it('should successfully execute with algorithmic strategy', async () => {
      // Mock successful algorithmic execution
      jest.spyOn(executionManager as any, 'executeAlgorithmic')
        .mockResolvedValue({
          success: true,
          outputs: { result: 'calculated' },
          executionType: 'algorithmic',
          duration: 100,
          logs: []
        });

      const result = await executionManager.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.executionType).toBe('algorithmic');
      expect(result.outputs.result).toBe('calculated');
    });

    it('should fallback to AI when algorithmic fails', async () => {
      // Mock algorithmic failure
      jest.spyOn(executionManager as any, 'executeAlgorithmic')
        .mockResolvedValue({
          success: false,
          outputs: {},
          executionType: 'algorithmic',
          duration: 50,
          logs: [],
          error: {
            code: 'NO_IMPLEMENTATION',
            message: 'No algorithmic implementation available',
            retryable: false,
            fallbackSuggested: true
          }
        });

      // Mock successful AI execution
      jest.spyOn(executionManager as any, 'executeAI')
        .mockResolvedValue({
          success: true,
          outputs: { result: 'ai-processed' },
          executionType: 'ai',
          duration: 2000,
          logs: []
        });

      const result = await executionManager.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.executionType).toBe('ai');
      expect(result.outputs.result).toBe('ai-processed');
    });

    it('should fallback to human when both algorithmic and AI fail', async () => {
      // Mock algorithmic failure
      jest.spyOn(executionManager as any, 'executeAlgorithmic')
        .mockResolvedValue({
          success: false,
          outputs: {},
          executionType: 'algorithmic',
          duration: 50,
          logs: [],
          error: {
            code: 'NO_IMPLEMENTATION',
            message: 'No algorithmic implementation available',
            retryable: false,
            fallbackSuggested: true
          }
        });

      // Mock AI failure
      jest.spyOn(executionManager as any, 'executeAI')
        .mockResolvedValue({
          success: false,
          outputs: {},
          executionType: 'ai',
          duration: 3000,
          logs: [],
          error: {
            code: 'AI_SERVICE_ERROR',
            message: 'AI service failed',
            retryable: true,
            fallbackSuggested: true
          }
        });

      // Mock successful human execution
      jest.spyOn(executionManager as any, 'executeHuman')
        .mockResolvedValue({
          success: true,
          outputs: { result: 'human-completed' },
          executionType: 'human',
          duration: 60000,
          logs: []
        });

      const result = await executionManager.executeStep(mockContext);

      expect(result.success).toBe(true);
      expect(result.executionType).toBe('human');
      expect(result.outputs.result).toBe('human-completed');
    });

    it('should throw error when all strategies fail', async () => {
      // Mock all strategies failing
      jest.spyOn(executionManager as any, 'executeAlgorithmic')
        .mockResolvedValue({
          success: false,
          outputs: {},
          executionType: 'algorithmic',
          duration: 50,
          logs: [],
          error: { code: 'NO_IMPLEMENTATION', message: 'Not available', retryable: false, fallbackSuggested: true }
        });

      jest.spyOn(executionManager as any, 'executeAI')
        .mockResolvedValue({
          success: false,
          outputs: {},
          executionType: 'ai',
          duration: 3000,
          logs: [],
          error: { code: 'AI_SERVICE_ERROR', message: 'AI failed', retryable: true, fallbackSuggested: true }
        });

      jest.spyOn(executionManager as any, 'executeHuman')
        .mockResolvedValue({
          success: false,
          outputs: {},
          executionType: 'human',
          duration: 5000,
          logs: [],
          error: { code: 'HUMAN_TASK_ERROR', message: 'Human task failed', retryable: true, fallbackSuggested: false }
        });

      await expect(executionManager.executeStep(mockContext))
        .rejects.toThrow('All execution strategies failed');
    });
  });

  describe('requestHumanOverride', () => {
    it('should allow human override when policy permits', async () => {
      const stepId = 'test-step';
      const userId = 'user123';

      // Set up active execution
      executionManager['activeExecutions'].set(stepId, {
        stepId,
        method: 'Test method',
        inputs: {},
        resources: []
      });

      // Mock successful human execution
      jest.spyOn(executionManager as any, 'executeHuman')
        .mockResolvedValue({
          success: true,
          outputs: { result: 'human-override' },
          executionType: 'human',
          duration: 30000,
          logs: []
        });

      const result = await executionManager.requestHumanOverride(stepId, userId);

      expect(result).toBe(true);
    });

    it('should reject human override when policy forbids', async () => {
      // Create policy that disallows human override
      const restrictivePolicy: ExecutionPolicy = {
        ...mockPolicy,
        allowHumanOverride: false
      };

      const restrictiveManager = new ExecutionManager(restrictivePolicy);
      const result = await restrictiveManager.requestHumanOverride('test-step', 'user123');

      expect(result).toBe(false);
    });

    it('should reject human override for non-existent step', async () => {
      const result = await executionManager.requestHumanOverride('non-existent-step', 'user123');

      expect(result).toBe(false);
    });
  });

  describe('updatePolicy', () => {
    it('should update execution policy at runtime', () => {
      const newPolicy: Partial<ExecutionPolicy> = {
        maxRetries: 5,
        executionTimeout: 10000
      };

      executionManager.updatePolicy(newPolicy);

      // Verify policy was updated (we can't directly access private field, but can test behavior)
      expect(executionManager['policy'].maxRetries).toBe(5);
      expect(executionManager['policy'].executionTimeout).toBe(10000);
    });
  });

  describe('execution strategies', () => {
    describe('algorithmic execution', () => {
      it('should handle successful algorithmic execution', async () => {
        const context: ExecutionContext = {
          stepId: 'test-step',
          method: 'calculate sum of inputs',
          inputs: { a: 5, b: 3 },
          resources: []
        };

        // Mock loadAlgorithmicImplementation to return a function
        jest.spyOn(executionManager as any, 'loadAlgorithmicImplementation')
          .mockResolvedValue((inputs: any) => ({ sum: inputs.a + inputs.b }));

        const result = await executionManager['executeAlgorithmic'](context);

        expect(result.success).toBe(true);
        expect(result.executionType).toBe('algorithmic');
        expect(result.outputs.sum).toBe(8);
      });

      it('should handle missing algorithmic implementation', async () => {
        const context: ExecutionContext = {
          stepId: 'test-step',
          method: 'complex operation',
          inputs: {},
          resources: []
        };

        // Mock loadAlgorithmicImplementation to return null
        jest.spyOn(executionManager as any, 'loadAlgorithmicImplementation')
          .mockResolvedValue(null);

        const result = await executionManager['executeAlgorithmic'](context);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NO_IMPLEMENTATION');
        expect(result.error?.fallbackSuggested).toBe(true);
      });
    });

    describe('AI execution', () => {
      it('should handle successful AI execution', async () => {
        const context: ExecutionContext = {
          stepId: 'test-step',
          method: 'analyze customer sentiment',
          inputs: { text: 'I love this product!' },
          resources: []
        };

        // Mock callAIService
        jest.spyOn(executionManager as any, 'callAIService')
          .mockResolvedValue({
            outputs: { sentiment: 'positive', confidence: 0.95 },
            logs: [{ timestamp: new Date(), level: 'info', message: 'AI analysis complete' }]
          });

        const result = await executionManager['executeAI'](context);

        expect(result.success).toBe(true);
        expect(result.executionType).toBe('ai');
        expect(result.outputs.sentiment).toBe('positive');
      });

      it('should handle AI service failure', async () => {
        const context: ExecutionContext = {
          stepId: 'test-step',
          method: 'analyze data',
          inputs: { data: 'test' },
          resources: []
        };

        // Mock callAIService to throw error
        jest.spyOn(executionManager as any, 'callAIService')
          .mockRejectedValue(new Error('AI service unavailable'));

        const result = await executionManager['executeAI'](context);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('AI_SERVICE_ERROR');
        expect(result.error?.retryable).toBe(true);
      });
    });

    describe('human execution', () => {
      it('should handle successful human execution', async () => {
        const context: ExecutionContext = {
          stepId: 'test-step',
          method: 'review and approve document',
          inputs: { document: 'contract.pdf' },
          resources: [],
          userId: 'user123'
        };

        // Mock createHumanTask
        jest.spyOn(executionManager as any, 'createHumanTask')
          .mockResolvedValue({
            outputs: { approved: true, notes: 'Looks good' },
            logs: [{ timestamp: new Date(), level: 'info', message: 'Task completed by user' }]
          });

        const result = await executionManager['executeHuman'](context);

        expect(result.success).toBe(true);
        expect(result.executionType).toBe('human');
        expect(result.outputs.approved).toBe(true);
      });

      it('should handle human task failure', async () => {
        const context: ExecutionContext = {
          stepId: 'test-step',
          method: 'make decision',
          inputs: {},
          resources: []
        };

        // Mock createHumanTask to throw error
        jest.spyOn(executionManager as any, 'createHumanTask')
          .mockRejectedValue(new Error('Task creation failed'));

        const result = await executionManager['executeHuman'](context);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('HUMAN_TASK_ERROR');
        expect(result.error?.retryable).toBe(true);
      });
    });
  });

  describe('execution chain building', () => {
    it('should build chain based on available types', () => {
      const chain = executionManager['buildExecutionChain']();

      expect(chain).toEqual(['algorithmic', 'ai', 'human']);
    });

    it('should filter unavailable types from chain', () => {
      // Update policy to exclude AI
      executionManager.updatePolicy({
        availableTypes: ['algorithmic', 'human']
      });

      const chain = executionManager['buildExecutionChain']();

      expect(chain).toEqual(['algorithmic', 'human']);
      expect(chain).not.toContain('ai');
    });
  });

  describe('retry logic', () => {
    it('should retry failed executions up to maxRetries', async () => {
      const mockStrategy = {
        type: 'algorithmic' as const,
        available: true,
        priority: 1,
        execute: jest.fn()
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockResolvedValueOnce({
            success: true,
            outputs: { result: 'success' },
            executionType: 'algorithmic',
            duration: 100,
            logs: []
          })
      };

      const context: ExecutionContext = {
        stepId: 'test-step',
        method: 'test method',
        inputs: {},
        resources: []
      };

      const result = await executionManager['executeWithRetry'](mockStrategy, context);

      expect(result.success).toBe(true);
      expect(mockStrategy.execute).toHaveBeenCalledTimes(3);
    });

    it('should fail after maxRetries attempts', async () => {
      const mockStrategy = {
        type: 'algorithmic' as const,
        available: true,
        priority: 1,
        execute: jest.fn().mockRejectedValue(new Error('Persistent failure'))
      };

      const context: ExecutionContext = {
        stepId: 'test-step',
        method: 'test method',
        inputs: {},
        resources: []
      };

      await expect(executionManager['executeWithRetry'](mockStrategy, context))
        .rejects.toThrow('Strategy algorithmic failed after 3 attempts');

      expect(mockStrategy.execute).toHaveBeenCalledTimes(3);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running executions', async () => {
      // Create manager with very short timeout
      const shortTimeoutPolicy: ExecutionPolicy = {
        ...mockPolicy,
        executionTimeout: 100 // 100ms
      };
      const timeoutManager = new ExecutionManager(shortTimeoutPolicy);

      const mockStrategy = {
        type: 'algorithmic' as const,
        available: true,
        priority: 1,
        execute: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 200)) // Takes 200ms
        )
      };

      const context: ExecutionContext = {
        stepId: 'test-step',
        method: 'slow operation',
        inputs: {},
        resources: []
      };

      await expect(timeoutManager['executeWithRetry'](mockStrategy, context))
        .rejects.toThrow('Execution timeout');
    });
  });

  describe('event emission', () => {
    it('should emit execution events', async () => {
      const mockContext: ExecutionContext = {
        stepId: 'test-step',
        method: 'test method',
        inputs: {},
        resources: []
      };

      const completedSpy = jest.fn();
      const attemptSpy = jest.fn();
      
      executionManager.on('execution:completed', completedSpy);
      executionManager.on('execution:attempt', attemptSpy);

      // Mock successful execution
      jest.spyOn(executionManager as any, 'executeAlgorithmic')
        .mockResolvedValue({
          success: true,
          outputs: { result: 'test' },
          executionType: 'algorithmic',
          duration: 100,
          logs: []
        });

      await executionManager.executeStep(mockContext);

      expect(attemptSpy).toHaveBeenCalledWith({
        context: mockContext,
        executionType: 'algorithmic'
      });
      expect(completedSpy).toHaveBeenCalled();
    });
  });
});