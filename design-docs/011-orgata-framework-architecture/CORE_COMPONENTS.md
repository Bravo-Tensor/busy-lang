# Core Components Design

This document provides detailed specifications for the core Orgata framework components.

## 1. Operation

The basic unit of execution, composed of Context + Implementation.

```typescript
class Operation<TInput = any, TOutput = any> implements Capability<TInput, TOutput> {
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
    return this.context.sendInput(this, input);
  }

  // Internal access for Context
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

interface OperationMetadata {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  implementationType: string;
  contextId: string;
}
```

## 2. Context

The microruntime that handles all infrastructure concerns and orchestrates execution.

```typescript
abstract class BaseContext implements Context {
  protected readonly _capabilities = new Map<string, Capability>();
  protected readonly _executionTrace: ExecutionTraceEntry[] = [];

  constructor(
    public readonly infrastructure: InfrastructureServices,
    public readonly executionDepth: number = 0,
    public readonly parent?: Context,
    public readonly executionId: string = generateId()
  ) {}

  // Capability management
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
      traceEntry.error = error.message;
      this._executionTrace.push(traceEntry);

      const handledError = await this.handleExecutionError(operation, input, error);
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
      throw new ValidationError(`Input validation failed for ${operation.name}`, validation.errors);
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
    return {
      capabilities: this._capabilities,
      config: await this.getOperationConfig(operation.name),
      logger: this.createOperationLogger(operation.name),
      context: this
    };
  }

  // Monitored execution with timeout and metrics
  protected async executeWithMonitoring<TInput, TOutput>(
    implementation: Implementation<TInput, TOutput>,
    input: TInput,
    resources: InjectedResources
  ): Promise<TOutput> {
    const timeout = resources.config.timeout || 30000; // 30 second default
    
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
      throw new ValidationError(`Output validation failed for ${operation.name}`, validation.errors);
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
        return this.getChildContexts();
      case MessageScope.ALL:
        return [...this.getSiblingContexts(), ...this.getChildContexts()];
      default:
        return [];
    }
  }

  // Context lifecycle
  spawn(modifications?: ContextModifications): Context {
    const childCapabilities = modifications?.capabilities
      ? new Map([...this._capabilities, ...modifications.capabilities])
      : new Map(this._capabilities);

    const childContext = this.createChildContext(childCapabilities, modifications);
    this.registerChildContext(childContext);
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

  // Utility methods
  protected calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  protected async getOperationConfig(operationName: string): Promise<OperationConfig> {
    return {
      timeout: 30000,
      retryCount: 3,
      aiModel: 'gpt-4',
      ...await this.infrastructure.persistence.getConfig(`operations.${operationName}`)
    };
  }

  protected createOperationLogger(operationName: string): Logger {
    return this.infrastructure.logger.createChild(operationName);
  }

  protected abstract getSiblingContexts(): Context[];
  protected abstract getChildContexts(): Context[];
  protected abstract registerChildContext(child: Context): void;

  // Debugging and introspection
  getExecutionTrace(): ExecutionTraceEntry[] {
    return [...this._executionTrace];
  }

  getContextTree(): ContextTreeNode {
    return {
      contextId: this.executionId,
      executionDepth: this.executionDepth,
      capabilityCount: this._capabilities.size,
      children: this.getChildContexts().map(child => child.getContextTree())
    };
  }
}

// Production Context Implementation
class ProductionContext extends BaseContext {
  private readonly childContexts = new Set<Context>();

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
    return new ProductionContext(
      this.infrastructure,
      this.executionDepth + 1,
      this,
      generateId()
    );
  }

  protected getSiblingContexts(): Context[] {
    return this.parent ? 
      Array.from((this.parent as ProductionContext).childContexts).filter(ctx => ctx !== this) : 
      [];
  }

  protected getChildContexts(): Context[] {
    return Array.from(this.childContexts);
  }

  protected registerChildContext(child: Context): void {
    this.childContexts.add(child);
  }
}

interface ExecutionTraceEntry {
  operationName: string;
  startTime: Date;
  endTime?: Date;
  inputSize: number;
  outputSize?: number;
  status?: 'success' | 'error';
  error?: string;
}

interface ContextTreeNode {
  contextId: string;
  executionDepth: number;
  capabilityCount: number;
  children: ContextTreeNode[];
}
```

## 3. Implementation

The pure business logic component that Context executes.

```typescript
interface Implementation<TInput = any, TOutput = any> {
  execute(input: TInput, resources: InjectedResources): Promise<TOutput>;
}

interface InjectedResources {
  readonly capabilities: Map<string, Capability>;
  readonly config: OperationConfig;
  readonly logger: Logger;
  readonly context: Context;
}

interface OperationConfig {
  timeout: number;
  retryCount: number;
  aiModel: string;
  [key: string]: any;
}

// Base implementation with common utilities
abstract class BaseImplementation<TInput, TOutput> implements Implementation<TInput, TOutput> {
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
        lastError = error;
        this.log(`Attempt ${attempt} failed`, { error: error.message }, resources);
        
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Concrete implementation types
class AlgorithmImplementation<TInput, TOutput> extends BaseImplementation<TInput, TOutput> {
  constructor(
    private readonly algorithm: (input: TInput, resources: InjectedResources) => Promise<TOutput>
  ) {
    super();
  }

  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    return this.algorithm(input, resources);
  }
}

class AgentImplementation<TInput, TOutput> extends BaseImplementation<TInput, TOutput> {
  constructor(
    private readonly prompt: string,
    private readonly parser: (response: string) => TOutput
  ) {
    super();
  }

  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    const aiService = await this.getCapability<AIService>('ai-service', resources);
    
    const response = await this.withRetry(async () => {
      return aiService.complete({
        prompt: this.prompt,
        context: input,
        model: resources.config.aiModel
      });
    }, resources);

    return this.parser(response);
  }
}

class HumanImplementation<TInput, TOutput> extends BaseImplementation<TInput, TOutput> {
  constructor(private readonly viewModel: HumanTaskViewModel) {
    super();
  }

  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    const uiService = await this.getCapability<UIService>('ui-service', resources);
    
    const task: HumanTask = {
      id: generateId(),
      title: `Task: ${resources.context.executionId}`,
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
```

## 4. OperationSet

Collection of operations with shared context.

```typescript
class OperationSet<TInput = any, TOutput = any> implements Capability<TInput, TOutput> {
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

  protected async executeInParallel(
    operationNames: string[],
    input: Input<any>
  ): Promise<Output<any>[]> {
    const operations = operationNames.map(name => {
      const op = this.getOperation(name);
      if (!op) {
        throw new Error(`Operation '${name}' not found in set '${this.name}'`);
      }
      return op;
    });

    const results = await Promise.all(
      operations.map(op => op.execute(input))
    );

    return results;
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

interface OperationSetMetadata {
  name: string;
  description: string;
  operationCount: number;
  operationNames: string[];
  sharedContextId: string;
}
```

## 5. SequentialOperationFlow

A basic flow controller operation that executes operations in sequence.

```typescript
class SequentialOperationFlow<TInput = any, TOutput = any> extends BaseImplementation<FlowInput<TInput>, FlowOutput<TOutput>> {
  constructor(
    private readonly stepNames: string[],
    private readonly flowRules?: FlowRule[]
  ) {
    super();
  }

  async execute(
    input: FlowInput<TInput>, 
    resources: InjectedResources
  ): Promise<FlowOutput<TOutput>> {
    const trace: FlowTraceEntry[] = [];
    let currentData = input.initialInput;
    
    this.log('Starting sequential flow execution', {
      stepCount: this.stepNames.length,
      initialInputType: typeof currentData
    }, resources);

    for (let i = 0; i < this.stepNames.length; i++) {
      const stepName = this.stepNames[i];
      const traceEntry: FlowTraceEntry = {
        stepName,
        stepIndex: i,
        startTime: new Date()
      };

      try {
        // Check if step should be executed
        if (this.shouldSkipStep(stepName, currentData, resources)) {
          traceEntry.skipped = true;
          traceEntry.endTime = new Date();
          trace.push(traceEntry);
          this.log(`Skipping step ${stepName}`, { stepIndex: i }, resources);
          continue;
        }

        // Get the operation for this step
        const operation = resources.capabilities.get(stepName);
        if (!operation) {
          throw new Error(`Step operation '${stepName}' not found`);
        }

        this.log(`Executing step ${stepName}`, { 
          stepIndex: i, 
          inputType: typeof currentData 
        }, resources);

        // Execute the step
        const stepInput = this.prepareStepInput(stepName, currentData, resources);
        const stepOutput = await operation.execute(stepInput);

        // Update current data for next step
        currentData = stepOutput.data;
        
        traceEntry.endTime = new Date();
        traceEntry.inputSize = this.calculateDataSize(stepInput.data);
        traceEntry.outputSize = this.calculateDataSize(stepOutput.data);
        trace.push(traceEntry);

        this.log(`Completed step ${stepName}`, { 
          stepIndex: i,
          duration: traceEntry.endTime.getTime() - traceEntry.startTime.getTime()
        }, resources);

      } catch (error) {
        traceEntry.endTime = new Date();
        traceEntry.error = error.message;
        trace.push(traceEntry);

        this.log(`Step ${stepName} failed`, { 
          stepIndex: i, 
          error: error.message 
        }, resources);

        // Handle step failure
        const shouldContinue = await this.handleStepFailure(
          stepName, 
          i, 
          error, 
          currentData, 
          resources
        );

        if (!shouldContinue) {
          throw new FlowExecutionError(`Flow failed at step ${stepName}`, {
            stepName,
            stepIndex: i,
            error,
            trace
          });
        }
      }
    }

    return {
      finalOutput: currentData as TOutput,
      trace,
      completedSteps: trace.filter(entry => !entry.skipped && !entry.error).length,
      totalSteps: this.stepNames.length,
      duration: this.calculateTotalDuration(trace)
    };
  }

  private shouldSkipStep(
    stepName: string, 
    currentData: any, 
    resources: InjectedResources
  ): boolean {
    if (!this.flowRules) return false;

    const skipRule = this.flowRules.find(rule => 
      rule.type === 'skip' && rule.stepName === stepName
    );

    if (!skipRule) return false;

    return skipRule.condition(currentData, resources);
  }

  private prepareStepInput(
    stepName: string, 
    currentData: any, 
    resources: InjectedResources
  ): Input<any> {
    // Check for input transformation rules
    const transformRule = this.flowRules?.find(rule => 
      rule.type === 'transform' && rule.stepName === stepName
    );

    const transformedData = transformRule 
      ? transformRule.transform(currentData, resources)
      : currentData;

    return new DataInput(transformedData, this.inferSchema(transformedData));
  }

  private async handleStepFailure(
    stepName: string,
    stepIndex: number,
    error: Error,
    currentData: any,
    resources: InjectedResources
  ): Promise<boolean> {
    // Check for error handling rules
    const errorRule = this.flowRules?.find(rule => 
      rule.type === 'error' && rule.stepName === stepName
    );

    if (!errorRule) {
      return false; // Stop execution
    }

    return errorRule.handler(error, currentData, resources);
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private calculateTotalDuration(trace: FlowTraceEntry[]): number {
    if (trace.length === 0) return 0;
    
    const start = Math.min(...trace.map(entry => entry.startTime.getTime()));
    const end = Math.max(...trace.map(entry => (entry.endTime || entry.startTime).getTime()));
    
    return end - start;
  }

  private inferSchema(data: any): JsonSchema {
    // Simple schema inference - could be more sophisticated
    return {
      type: typeof data,
      description: `Inferred schema for ${typeof data}`
    };
  }
}

// Supporting types for SequentialOperationFlow
interface FlowInput<T> {
  initialInput: T;
  flowConfig?: FlowConfig;
}

interface FlowOutput<T> {
  finalOutput: T;
  trace: FlowTraceEntry[];
  completedSteps: number;
  totalSteps: number;
  duration: number;
}

interface FlowTraceEntry {
  stepName: string;
  stepIndex: number;
  startTime: Date;
  endTime?: Date;
  inputSize?: number;
  outputSize?: number;
  skipped?: boolean;
  error?: string;
}

interface FlowRule {
  type: 'skip' | 'transform' | 'error';
  stepName: string;
  condition?: (data: any, resources: InjectedResources) => boolean;
  transform?: (data: any, resources: InjectedResources) => any;
  handler?: (error: Error, data: any, resources: InjectedResources) => Promise<boolean>;
}

interface FlowConfig {
  stopOnError: boolean;
  parallelizable: boolean;
  timeout: number;
}

class FlowExecutionError extends Error {
  constructor(message: string, public readonly flowContext: any) {
    super(message);
    this.name = 'FlowExecutionError';
  }
}
```

These core components provide:

1. **Operation**: Clean composition of Context + Implementation with metadata and introspection
2. **Context**: Full-featured microruntime with execution orchestration, error handling, and resource management
3. **Implementation**: Pure business logic with utilities for common patterns
4. **OperationSet**: Flexible collection with shared context and coordination utilities
5. **SequentialOperationFlow**: Production-ready flow controller with tracing, error handling, and rule-based execution

The design enables testing, debugging, and production deployment while maintaining clean separation of concerns.