// Test-focused Context implementation with enhanced introspection
import { BaseContext } from '../../context.js';
import { 
  Context, InfrastructureServices, Capability, Operation, Input, Output,
  ContextModifications, generateId
} from '../../types.js';
import { 
  ConsoleLogger, SimpleAuthService, InMemoryPersistenceService, 
  SimpleMessagingService, BasicResourceInjector
} from '../../infrastructure.js';
import { InterventionManager } from '../../intervention/intervention-manager.js';
import { OperationOrchestrator, OperationExecutionContext } from '../../intervention/operation-orchestrator.js';

// Lightweight test infrastructure
export class TestInfrastructure implements InfrastructureServices {
  public readonly logger = new ConsoleLogger('TEST');
  public readonly auth = new SimpleAuthService();
  public readonly persistence = new InMemoryPersistenceService();
  public readonly messaging = new SimpleMessagingService();
  public readonly resourceInjector = new BasicResourceInjector();
  public readonly interventionManager = InterventionManager.getInstance();
}

// Test Context with enhanced debugging and minimal overhead
export class TestContext extends BaseContext {
  private readonly _assertionHooks: Array<(operation: string, data: any) => void> = [];
  private readonly _executionEvents: Array<{event: string, operation?: string, data?: any, timestamp: Date}> = [];
  private readonly _orchestrator: OperationOrchestrator;

  constructor(
    capabilities?: Map<string, Capability>,
    infrastructure?: InfrastructureServices,
    executionDepth: number = 0,
    parent?: Context
  ) {
    super(
      infrastructure || new TestInfrastructure(),
      executionDepth,
      parent,
      generateId()
    );

    // Initialize orchestrator
    this._orchestrator = new OperationOrchestrator(this.infrastructure.interventionManager);

    // Add provided capabilities
    if (capabilities) {
      capabilities.forEach((capability, name) => {
        this._capabilities.set(name, capability);
      });
    }
  }

  // Enhanced error handling for testing
  protected async doHandleError(operation: Operation, input: Input<any>, error: Error): Promise<Error | null> {
    this._executionEvents.push({
      event: 'error',
      operation: operation.name,
      data: { message: error.message, input: input.data },
      timestamp: new Date()
    });

    // Allow intervention system to handle errors
    return error;
  }

  // Context creation for operations
  getContextForOperation(operation: Operation): Context {
    // For testing, create isolated contexts to avoid interference
    return this.spawn();
  }

  // Child context creation
  protected createChildContext(
    capabilities: Map<string, Capability>,
    modifications?: ContextModifications
  ): Context {
    const childContext = new TestContext(
      capabilities,
      this.infrastructure,
      this.executionDepth + 1,
      this
    );

    return childContext;
  }

  // Intervention-aware operation execution
  async sendInputWithInterventions<T>(operation: Operation, input: Input<T>): Promise<Output<T>> {
    // Create execution context
    const executionContext: OperationExecutionContext = {
      operationSet: new Map([[operation.name, operation]]),
      operationNames: [operation.name],
      sharedContext: this,
      processName: `Test-${operation.name}`
    };

    // Use orchestrator for intervention support
    const result = await this._orchestrator.executeOperationWithIntervention(
      operation,
      input,
      0,
      operation.name,
      this,
      executionContext
    );

    return result.output;
  }

  // Testing-specific enhancements
  addAssertionHook(hook: (operation: string, data: any) => void): void {
    this._assertionHooks.push(hook);
  }

  logOperation(operation: string, metadata: Record<string, any>): void {
    super.logOperation(operation, metadata);
    
    // Track execution events for testing
    this._executionEvents.push({
      event: 'operation',
      operation,
      data: metadata,
      timestamp: new Date()
    });

    // Trigger assertion hooks
    this._assertionHooks.forEach(hook => hook(operation, metadata));
  }

  // Test introspection methods
  getExecutionEvents(): Array<{event: string, operation?: string, data?: any, timestamp: Date}> {
    return [...this._executionEvents];
  }

  getOperationHistory(): string[] {
    return this._executionEvents
      .filter(event => event.event === 'operation' && event.operation)
      .map(event => event.operation!);
  }

  getErrorHistory(): Array<{operation: string, message: string, timestamp: Date}> {
    return this._executionEvents
      .filter(event => event.event === 'error')
      .map(event => ({
        operation: event.operation!,
        message: event.data?.message || 'Unknown error',
        timestamp: event.timestamp
      }));
  }

  // Reset state for fresh tests
  reset(): void {
    this._executionEvents.length = 0;
    this._assertionHooks.length = 0;
    // Clear execution trace from parent
    (this as any)._executionTrace.length = 0;
  }

  // Simplified factory for common test scenarios
  static createWithInterventions(capabilities?: Map<string, Capability>): TestContext {
    const context = new TestContext(capabilities);
    
    // Pre-configure for intervention testing
    const interventionManager = context.infrastructure.interventionManager;
    interventionManager.reset();
    
    return context;
  }

  static createMinimal(): TestContext {
    return new TestContext();
  }
}