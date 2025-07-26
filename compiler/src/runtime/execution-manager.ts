/**
 * Execution Strategy Manager - BUSY v2.0 Runtime
 * Handles dynamic execution type switching and fallback chains
 */

import { EventEmitter } from 'events';

export interface ExecutionContext {
  stepId: string;
  method: string;
  inputs: Record<string, any>;
  resources: AllocatedResource[];
  timeout?: number;
  userId?: string;
}

export interface ExecutionResult {
  success: boolean;
  outputs: Record<string, any>;
  executionType: ExecutionType;
  duration: number;
  logs: ExecutionLog[];
  error?: ExecutionError;
}

export interface ExecutionError {
  code: string;
  message: string;
  retryable: boolean;
  fallbackSuggested: boolean;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface AllocatedResource {
  name: string;
  type: string;
  instance: any;
  characteristics: Record<string, any>;
}

export type ExecutionType = 'algorithmic' | 'ai' | 'human';

export interface ExecutionStrategy {
  type: ExecutionType;
  available: boolean;
  priority: number;
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

export interface ExecutionPolicy {
  /** Default execution chain order */
  defaultChain: ExecutionType[];
  
  /** Allow human override at any point */
  allowHumanOverride: boolean;
  
  /** Maximum retry attempts per execution type */
  maxRetries: number;
  
  /** Timeout for each execution attempt (ms) */
  executionTimeout: number;
  
  /** Available execution types for this deployment */
  availableTypes: ExecutionType[];
}

/**
 * Manages execution strategy selection and fallback chains
 */
export class ExecutionManager extends EventEmitter {
  private strategies: Map<ExecutionType, ExecutionStrategy>;
  private policy: ExecutionPolicy;
  private activeExecutions: Map<string, ExecutionContext>;

  constructor(policy: ExecutionPolicy) {
    super();
    this.policy = policy;
    this.strategies = new Map();
    this.activeExecutions = new Map();
    
    this.initializeStrategies();
  }

  /**
   * Execute a step with automatic fallback chain
   */
  async executeStep(context: ExecutionContext): Promise<ExecutionResult> {
    this.activeExecutions.set(context.stepId, context);
    
    try {
      const result = await this.executeWithFallback(context);
      this.emit('execution:completed', { context, result });
      return result;
    } catch (error) {
      this.emit('execution:failed', { context, error });
      throw error;
    } finally {
      this.activeExecutions.delete(context.stepId);
    }
  }

  /**
   * Allow human override of current execution
   */
  async requestHumanOverride(stepId: string, userId: string): Promise<boolean> {
    if (!this.policy.allowHumanOverride) {
      return false;
    }

    const context = this.activeExecutions.get(stepId);
    if (!context) {
      return false;
    }

    // Cancel current execution and switch to human
    this.emit('execution:override', { stepId, userId, originalContext: context });
    
    const humanStrategy = this.strategies.get('human');
    if (!humanStrategy?.available) {
      return false;
    }

    try {
      const result = await humanStrategy.execute({
        ...context,
        userId
      });
      
      this.emit('execution:completed', { context, result });
      return true;
    } catch (error) {
      this.emit('execution:failed', { context, error });
      return false;
    }
  }

  /**
   * Get execution status for a step
   */
  getExecutionStatus(stepId: string): ExecutionContext | null {
    return this.activeExecutions.get(stepId) || null;
  }

  /**
   * Update execution policy at runtime
   */
  updatePolicy(policy: Partial<ExecutionPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    this.emit('policy:updated', this.policy);
  }

  /**
   * Execute with fallback chain
   */
  private async executeWithFallback(context: ExecutionContext): Promise<ExecutionResult> {
    const chain = this.buildExecutionChain();
    let lastError: ExecutionError | undefined;

    for (const executionType of chain) {
      const strategy = this.strategies.get(executionType);
      
      if (!strategy?.available) {
        continue;
      }

      try {
        this.emit('execution:attempt', { context, executionType });
        
        const result = await this.executeWithRetry(strategy, context);
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error;
        
        // If not retryable, try next strategy
        if (!result.error?.retryable) {
          continue;
        }
        
      } catch (error) {
        lastError = {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          fallbackSuggested: true
        };
      }
    }

    // All strategies failed
    throw new Error(`All execution strategies failed. Last error: ${lastError?.message}`);
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(
    strategy: ExecutionStrategy,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    let attempts = 0;
    
    while (attempts < this.policy.maxRetries) {
      attempts++;
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Execution timeout')), this.policy.executionTimeout);
        });

        return await Promise.race([
          strategy.execute(context),
          timeoutPromise
        ]);
        
      } catch (error) {
        if (attempts >= this.policy.maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    throw new Error(`Strategy ${strategy.type} failed after ${this.policy.maxRetries} attempts`);
  }

  /**
   * Build execution chain based on policy
   */
  private buildExecutionChain(): ExecutionType[] {
    return this.policy.defaultChain.filter(type => 
      this.policy.availableTypes.includes(type) &&
      this.strategies.get(type)?.available
    );
  }

  /**
   * Initialize execution strategies
   */
  private initializeStrategies(): void {
    // Algorithmic execution strategy
    this.strategies.set('algorithmic', {
      type: 'algorithmic',
      available: true,
      priority: 1,
      execute: async (context) => this.executeAlgorithmic(context)
    });

    // AI execution strategy
    this.strategies.set('ai', {
      type: 'ai',
      available: process.env.AI_SERVICE_ENABLED === 'true',
      priority: 2,
      execute: async (context) => this.executeAI(context)
    });

    // Human execution strategy
    this.strategies.set('human', {
      type: 'human',
      available: true,
      priority: 3,
      execute: async (context) => this.executeHuman(context)
    });
  }

  /**
   * Execute algorithmic implementation
   */
  private async executeAlgorithmic(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      // Look for generated algorithmic implementation
      const implementation = await this.loadAlgorithmicImplementation(context.stepId);
      
      if (!implementation) {
        return {
          success: false,
          outputs: {},
          executionType: 'algorithmic',
          duration: Date.now() - startTime,
          logs,
          error: {
            code: 'NO_IMPLEMENTATION',
            message: 'No algorithmic implementation available',
            retryable: false,
            fallbackSuggested: true
          }
        };
      }

      logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Executing algorithmic implementation',
        metadata: { stepId: context.stepId }
      });

      const outputs = await implementation(context.inputs);

      return {
        success: true,
        outputs,
        executionType: 'algorithmic',
        duration: Date.now() - startTime,
        logs
      };

    } catch (error) {
      return {
        success: false,
        outputs: {},
        executionType: 'algorithmic',
        duration: Date.now() - startTime,
        logs,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          fallbackSuggested: true
        }
      };
    }
  }

  /**
   * Execute AI implementation
   */
  private async executeAI(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Executing AI implementation',
        metadata: { stepId: context.stepId }
      });

      // Call AI service with method instructions and inputs
      const aiResult = await this.callAIService({
        prompt: context.method,
        inputs: context.inputs,
        resources: context.resources
      });

      return {
        success: true,
        outputs: aiResult.outputs,
        executionType: 'ai',
        duration: Date.now() - startTime,
        logs: [...logs, ...aiResult.logs]
      };

    } catch (error) {
      return {
        success: false,
        outputs: {},
        executionType: 'ai',
        duration: Date.now() - startTime,
        logs,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'AI service failed',
          retryable: true,
          fallbackSuggested: true
        }
      };
    }
  }

  /**
   * Execute human implementation
   */
  private async executeHuman(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];

    try {
      logs.push({
        timestamp: new Date(),
        level: 'info',
        message: 'Creating human task',
        metadata: { stepId: context.stepId, userId: context.userId }
      });

      // Create human task in UI system
      const taskResult = await this.createHumanTask({
        stepId: context.stepId,
        instructions: context.method,
        inputs: context.inputs,
        resources: context.resources,
        userId: context.userId
      });

      return {
        success: true,
        outputs: taskResult.outputs,
        executionType: 'human',
        duration: Date.now() - startTime,
        logs: [...logs, ...taskResult.logs]
      };

    } catch (error) {
      return {
        success: false,
        outputs: {},
        executionType: 'human',
        duration: Date.now() - startTime,
        logs,
        error: {
          code: 'HUMAN_TASK_ERROR',
          message: error instanceof Error ? error.message : 'Human task failed',
          retryable: true,
          fallbackSuggested: false
        }
      };
    }
  }

  /**
   * Load generated algorithmic implementation
   */
  private async loadAlgorithmicImplementation(stepId: string): Promise<Function | null> {
    try {
      // In a real implementation, this would load from generated code
      const implementationPath = `./generated/${stepId}_algorithmic`;
      const module = await import(implementationPath);
      return module.default || module[stepId];
    } catch {
      return null;
    }
  }

  /**
   * Call AI service
   */
  private async callAIService(params: {
    prompt: string;
    inputs: Record<string, any>;
    resources: AllocatedResource[];
  }): Promise<{ outputs: Record<string, any>; logs: ExecutionLog[] }> {
    // Mock implementation - would call actual AI service
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          outputs: { result: 'AI processed result' },
          logs: [{
            timestamp: new Date(),
            level: 'info',
            message: 'AI processing completed'
          }]
        });
      }, 1000);
    });
  }

  /**
   * Create human task
   */
  private async createHumanTask(params: {
    stepId: string;
    instructions: string;
    inputs: Record<string, any>;
    resources: AllocatedResource[];
    userId?: string;
  }): Promise<{ outputs: Record<string, any>; logs: ExecutionLog[] }> {
    // Mock implementation - would create actual UI task
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          outputs: { result: 'Human completed result' },
          logs: [{
            timestamp: new Date(),
            level: 'info',
            message: 'Human task completed'
          }]
        });
      }, 2000);
    });
  }
}