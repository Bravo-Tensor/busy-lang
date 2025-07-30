// Operation and Implementation classes

import { 
  Operation, Implementation, Capability, Input, Output, Context,
  InjectedResources, JsonSchema, generateId
} from './types.js';

export class BasicOperation<TInput = any, TOutput = any> implements Operation<TInput, TOutput> {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly inputSchema: JsonSchema,
    public readonly outputSchema: JsonSchema,
    private readonly implementation: Implementation<TInput, TOutput>,
    private readonly context: Context
  ) {
    // Register this operation with its context
    this.context.capabilities.set(this.name, this);
  }

  async execute(input: Input<TInput>): Promise<Output<TOutput>> {
    // Delegate to context for orchestrated execution
    return this.context.sendInput<TOutput>(this, input as Input<any>);
  }

  getImplementation(): Implementation<TInput, TOutput> {
    return this.implementation;
  }

  // Metadata for debugging and introspection
  getMetadata(): OperationMetadata {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      implementationType: this.implementation.constructor.name,
      contextId: this.context.executionId
    };
  }
}

export interface OperationMetadata {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  implementationType: string;
  contextId: string;
}

// Base implementation with common utilities
export abstract class BaseImplementation<TInput, TOutput> implements Implementation<TInput, TOutput> {
  abstract execute(input: TInput, resources: InjectedResources): Promise<TOutput>;

  // Utility methods for common operations
  protected async getCapability<T extends Capability>(
    name: string, 
    resources: InjectedResources
  ): Promise<T> {
    const capability = resources.capabilities.get(name);
    if (!capability) {
      throw new Error(`Required capability '${name}' not available`);
    }
    return capability as T;
  }

  protected log(message: string, metadata: any, resources: InjectedResources): void {
    resources.logger.log({
      level: 'info',
      message,
      metadata
    });
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    resources: InjectedResources,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || resources.config.retryCount;
    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.log(`Attempt ${attempt} failed`, { error: (error as Error).message }, resources);
        
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Concrete implementation types
export class AlgorithmImplementation<TInput, TOutput> extends BaseImplementation<TInput, TOutput> {
  constructor(
    private readonly algorithm: (input: TInput, resources: InjectedResources) => Promise<TOutput>
  ) {
    super();
  }

  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    return this.algorithm(input, resources);
  }
}

export class HumanImplementation<TInput, TOutput> extends BaseImplementation<TInput, TOutput> {
  constructor(private readonly viewModel: any) {
    super();
  }

  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    const uiService = await this.getCapability<any>('ui-service', resources);
    
    const task = {
      id: generateId(),
      title: `Human Task: ${resources.context.executionId}`,
      viewModel: this.viewModel,
      input,
      timeout: resources.config.timeout
    };

    this.log('Presenting task to human', { taskId: task.id }, resources);
    
    const result = await uiService.presentTaskAndWait(task);
    
    this.log('Task completed by human', { taskId: task.id }, resources);
    
    return result as TOutput;
  }
}

// Operation Set for collections of operations
export class OperationSet<TInput = any, TOutput = any> implements Capability<TInput, TOutput> {
  protected readonly operations = new Map<string, Operation>();
  protected readonly sharedContext: Context;

  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly inputSchema: JsonSchema,
    public readonly outputSchema: JsonSchema,
    operations: Operation[],
    parentContext: Context
  ) {
    // Create shared context for all operations
    this.sharedContext = parentContext.spawn({
      metadata: { 
        operationSet: this.name,
        operationCount: operations.length
      }
    });

    // Add operations to the set
    operations.forEach(op => {
      this.operations.set(op.name, op);
      // Operations can access the shared context
      this.sharedContext.capabilities.set(op.name, op);
    });
  }

  getOperation(name: string): Operation | undefined {
    return this.operations.get(name);
  }

  getOperations(): Operation[] {
    return Array.from(this.operations.values());
  }

  getSharedContext(): Context {
    return this.sharedContext;
  }

  // Default implementation - subclasses should override
  async execute(input: Input<TInput>): Promise<Output<TOutput>> {
    throw new Error(`OperationSet '${this.name}' must implement execute() or be extended`);
  }

  // Utility methods for operation coordination
  protected async executeInSequence(
    operationNames: string[],
    initialInput: Input<any>
  ): Promise<Output<any>> {
    let currentInput = initialInput;

    for (const opName of operationNames) {
      const operation = this.getOperation(opName);
      if (!operation) {
        throw new Error(`Operation '${opName}' not found in set '${this.name}'`);
      }

      currentInput = await operation.execute(currentInput);
    }

    return currentInput;
  }

  // Metadata and introspection
  getMetadata(): OperationSetMetadata {
    return {
      name: this.name,
      description: this.description,
      operationCount: this.operations.size,
      operationNames: Array.from(this.operations.keys()),
      sharedContextId: this.sharedContext.executionId
    };
  }
}

export interface OperationSetMetadata {
  name: string;
  description: string;
  operationCount: number;
  operationNames: string[];
  sharedContextId: string;
}

// Simple process that extends OperationSet with sequential execution
export class SimpleProcess<TInput = any, TOutput = any> extends OperationSet<TInput, TOutput> {
  constructor(
    name: string,
    description: string,
    inputSchema: JsonSchema,
    outputSchema: JsonSchema,
    private readonly stepNames: string[],
    operations: Operation[],
    parentContext: Context
  ) {
    super(name, description, inputSchema, outputSchema, operations, parentContext);
  }

  async execute(input: Input<TInput>): Promise<Output<TOutput>> {
    // Execute operations in the specified sequence
    return this.executeInSequence(this.stepNames, input) as Promise<Output<TOutput>>;
  }
}