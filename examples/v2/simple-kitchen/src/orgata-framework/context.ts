// Context implementation - the microruntime for operations

import { 
  Context, InfrastructureServices, Capability, Operation, Input, Output,
  Message, MessageScope, ContextModifications, InjectedResources,
  ValidationError, generateId
} from './types.js';
import { DataOutput } from './input-output.js';
import { AuthorizationError, TimeoutError, CapabilityNotFoundError } from './infrastructure.js';

interface ExecutionTraceEntry {
  operationName: string;
  startTime: Date;
  endTime?: Date;
  inputSize: number;
  outputSize?: number;
  status?: 'success' | 'error';
  error?: string;
}

export abstract class BaseContext implements Context {
  protected readonly _capabilities = new Map<string, Capability>();
  protected readonly _executionTrace: ExecutionTraceEntry[] = [];
  protected readonly childContexts = new Set<Context>();

  constructor(
    public readonly infrastructure: InfrastructureServices,
    public readonly executionDepth: number = 0,
    public readonly parent?: Context,
    public readonly executionId: string = generateId()
  ) {
    // Register message handler for this context
    if (infrastructure.messaging && 'registerHandler' in infrastructure.messaging) {
      (infrastructure.messaging as any).registerHandler(
        this.executionId,
        this.handleMessage.bind(this)
      );
    }
  }

  get capabilities(): Map<string, Capability> {
    return this._capabilities;
  }

  getCapability<T extends Capability>(name: string): T {
    const capability = this._capabilities.get(name);
    if (!capability) {
      throw new CapabilityNotFoundError(`Capability '${name}' not found in context ${this.executionId}`);
    }
    return capability as T;
  }

  // Core execution orchestration
  async sendInput<T>(operation: Operation, input: Input<T>): Promise<Output<T>> {
    const traceEntry: ExecutionTraceEntry = {
      operationName: operation.name,
      startTime: new Date(),
      inputSize: this.calculateSize(input.data)
    };

    try {
      // Pre-execution validation and setup
      await this.preExecution(operation, input);

      // Get implementation and prepare resources
      const implementation = operation.getImplementation();
      const resources = await this.prepareResources(operation);

      // Execute with monitoring
      const result = await this.executeWithMonitoring(implementation, input.data, resources);

      // Post-execution processing
      const output = await this.postExecution(operation, result);

      // Update trace
      traceEntry.endTime = new Date();
      traceEntry.outputSize = this.calculateSize(output.data);
      traceEntry.status = 'success';
      this._executionTrace.push(traceEntry);

      return output as Output<T>;

    } catch (error) {
      // Error handling and recovery
      traceEntry.endTime = new Date();
      traceEntry.status = 'error';
      traceEntry.error = (error as Error).message;
      this._executionTrace.push(traceEntry);

      const handledError = await this.handleExecutionError(operation, input, error as Error);
      if (handledError) {
        throw handledError;
      }

      throw error;
    }
  }

  // Pre-execution hooks
  protected async preExecution<T>(operation: Operation, input: Input<T>): Promise<void> {
    // Input validation
    const validation = input.validate();
    if (!validation.isValid) {
      throw new ValidationError(`Input validation failed for ${operation.name}: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Authorization check
    if (!this.checkAuthorization(operation.name, 'execute')) {
      throw new AuthorizationError(`Not authorized to execute ${operation.name}`);
    }

    // Logging
    this.logOperation('start', {
      operation: operation.name,
      inputSize: this.calculateSize(input.data),
      contextId: this.executionId
    });
  }

  // Resource preparation and injection
  protected async prepareResources(operation: Operation): Promise<InjectedResources> {
    return this.infrastructure.resourceInjector.inject(operation, this);
  }

  // Monitored execution with timeout
  protected async executeWithMonitoring<TInput, TOutput>(
    implementation: any,
    input: TInput,
    resources: InjectedResources
  ): Promise<TOutput> {
    const timeout = resources.config.timeout || 30000;
    
    return Promise.race([
      implementation.execute(input, resources),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new TimeoutError(`Operation timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  // Post-execution processing
  protected async postExecution<T>(operation: Operation, result: T): Promise<Output<T>> {
    // Create output wrapper
    const output = new DataOutput(result, operation.outputSchema);

    // Output validation
    const validation = output.validate();
    if (!validation.isValid) {
      throw new ValidationError(`Output validation failed for ${operation.name}: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Success logging
    this.logOperation('complete', {
      operation: operation.name,
      outputSize: this.calculateSize(result),
      contextId: this.executionId
    });

    return output;
  }

  // Error handling and recovery
  protected async handleExecutionError(
    operation: Operation,
    input: Input<any>,
    error: Error
  ): Promise<Error | null> {
    // Log error
    this.logOperation('error', {
      operation: operation.name,
      error: error.message,
      contextId: this.executionId
    });

    // Context-specific error handling
    return this.doHandleError(operation, input, error);
  }

  // Abstract methods for Context implementations
  protected abstract doHandleError(operation: Operation, input: Input<any>, error: Error): Promise<Error | null>;
  
  // Messaging and coordination
  async sendMessage(target: Context, message: Message): Promise<void> {
    await this.infrastructure.messaging.send(target.executionId, message);
  }

  async broadcast(message: Message, scope: MessageScope): Promise<void> {
    const targets = this.resolveMessageTargets(scope);
    await Promise.all(targets.map(target => this.sendMessage(target, message)));
  }

  protected resolveMessageTargets(scope: MessageScope): Context[] {
    switch (scope) {
      case MessageScope.PARENT:
        return this.parent ? [this.parent] : [];
      case MessageScope.SIBLINGS:
        return this.getSiblingContexts();
      case MessageScope.CHILDREN:
        return Array.from(this.childContexts);
      case MessageScope.ALL:
        return [...this.getSiblingContexts(), ...Array.from(this.childContexts)];
      default:
        return [];
    }
  }

  protected handleMessage(message: Message): void {
    // Default message handling - log and ignore
    this.logOperation('message-received', {
      messageId: message.id,
      messageType: message.type,
      from: message.source.executionId
    });
  }

  // Context lifecycle
  spawn(modifications?: ContextModifications): Context {
    const childCapabilities = modifications?.capabilities
      ? new Map([...this._capabilities, ...modifications.capabilities])
      : new Map(this._capabilities);

    const childContext = this.createChildContext(childCapabilities, modifications);
    this.childContexts.add(childContext);
    return childContext;
  }

  protected abstract createChildContext(
    capabilities: Map<string, Capability>,
    modifications?: ContextModifications
  ): Context;

  // Infrastructure operations
  logOperation(operation: string, metadata: Record<string, any>): void {
    this.infrastructure.logger.log({
      level: 'info',
      operation,
      metadata: {
        ...metadata,
        contextId: this.executionId,
        executionDepth: this.executionDepth,
        timestamp: new Date().toISOString()
      }
    });
  }

  checkAuthorization(operation: string, resource: string): boolean {
    return this.infrastructure.auth.checkPermission({
      operation,
      resource,
      contextId: this.executionId,
      executionDepth: this.executionDepth
    });
  }

  // Context for operation - abstract method
  abstract getContextForOperation(operation: Operation): Context;

  // Utility methods
  protected calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  protected getSiblingContexts(): Context[] {
    if (!this.parent) return [];
    
    // Get all children of parent except this one
    return Array.from((this.parent as any).childContexts || [])
      .filter((ctx: unknown) => ctx !== this) as Context[];
  }

  // Debugging and introspection
  getExecutionTrace(): ExecutionTraceEntry[] {
    return [...this._executionTrace];
  }

  getContextTree(): any {
    return {
      contextId: this.executionId,
      executionDepth: this.executionDepth,
      capabilityCount: this._capabilities.size,
      children: Array.from(this.childContexts).map(child => (child as any).getContextTree())
    };
  }
}

// Production Context Implementation
export class ProductionContext extends BaseContext {
  getContextForOperation(operation: Operation): Context {
    // Production default: share context for efficiency
    return this;
  }

  protected async doHandleError(operation: Operation, input: Input<any>, error: Error): Promise<Error | null> {
    // Production error handling: log and re-throw
    return error;
  }

  protected createChildContext(
    capabilities: Map<string, Capability>,
    modifications?: ContextModifications
  ): Context {
    const childContext = new ProductionContext(
      this.infrastructure,
      this.executionDepth + 1,
      this,
      generateId()
    );

    // Copy capabilities to child
    capabilities.forEach((capability, name) => {
      childContext._capabilities.set(name, capability);
    });

    return childContext;
  }
}