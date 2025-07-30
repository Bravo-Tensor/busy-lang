# Orgata Core Framework - Class Diagram

## Core Abstractions

```typescript
// Base serializable data with schema validation
interface Input<T = any> {
  readonly data: T;
  readonly schema: JsonSchema;
  validate(): ValidationResult;
  serialize(): string;
}

interface Output<T = any> {
  readonly data: T;
  readonly schema: JsonSchema;
  validate(): ValidationResult;
  serialize(): string;
}

// Capability - interface for an Operation
interface Capability<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly outputSchema: JsonSchema;
}

// Context provides runtime environment and handles all messaging
interface Context {
  // Infrastructure and capability access
  readonly capabilities: Map<string, Capability>;
  readonly infrastructure: InfrastructureServices;
  
  // Execution tracking
  readonly executionDepth: number;
  readonly parent?: Context;
  readonly executionId: string;
  
  // Capability resolution
  getCapability<T extends Capability>(name: string): T;
  
  // Messaging and routing - Context handles all I/O flow
  sendInput<T>(operation: Operation, input: Input<T>): Promise<Output<T>>;
  sendMessage(target: Context, message: Message): Promise<void>;
  broadcast(message: Message, scope: MessageScope): Promise<void>;
  
  // Context lifecycle management
  getContextForOperation(operation: Operation): Context;
  spawn(modifications?: ContextModifications): Context;
}

// Infrastructure services abstraction
interface InfrastructureServices {
  readonly logger: Logger;
  readonly auth: AuthorizationService;
  readonly persistence: PersistenceService;
  readonly messaging: MessagingService;
  readonly resourceInjector: ResourceInjector;
}
```

## Operation Framework

```typescript
// Implementation - the actual code that does the work
interface Implementation<TInput = any, TOutput = any> {
  // Single method that Context calls with injected resources
  execute(
    input: TInput, 
    resources: InjectedResources
  ): Promise<TOutput>;
}

// Resources that Context injects into Implementation
interface InjectedResources {
  readonly capabilities: Map<string, Capability>;
  //readonly tools: Map<string, Tool>; Don't think we need this yet, just use Capability as a tool
  readonly config: OperationConfig;
  readonly logger: Logger;
  readonly context: Context;
  // Any other resources the implementation needs
}

// Operation - composed of Context + Implementation
class Operation<TInput = any, TOutput = any> implements Capability<TInput, TOutput> {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly inputSchema: JsonSchema,
    public readonly outputSchema: JsonSchema,
    private readonly implementation: Implementation<TInput, TOutput>,
    private readonly context: Context
  ) {}

  // Context handles the actual execution flow
  async execute(input: Input<TInput>): Promise<Output<TOutput>> {
    return this.context.sendInput(this, input);
  }
}

// Base Context implementation showing how it orchestrates execution
abstract class BaseContext implements Context {
  async sendInput<T>(operation: Operation, input: Input<T>): Promise<Output<T>> {
    try {
      // Validate input
      const validation = input.validate();
      if (!validation.isValid) {
        throw new ValidationError(validation.errors);
      }
      
      // Log operation start
      this.logOperation('start', { 
        operation: operation.name, 
        inputSize: JSON.stringify(input.data).length 
      });
      
      // Authorization check
      if (!this.checkAuthorization(operation.name, 'execute')) {
        throw new AuthorizationError(`Not authorized to execute ${operation.name}`);
      }
      
      // Get implementation and inject resources
      const implementation = operation['implementation'];
      const resources = this.infrastructure.resourceInjector.inject(operation, this);
      
      // Execute implementation
      const result = await implementation.execute(input.data, resources);
      
      // Wrap in Output
      const output = new Output(result, operation.outputSchema);
      
      // Validate output
      const outputValidation = output.validate();
      if (!outputValidation.isValid) {
        throw new ValidationError(outputValidation.errors);
      }
      
      // Log completion
      this.logOperation('complete', { 
        operation: operation.name, 
        outputSize: JSON.stringify(result).length 
      });
      
      return output;
      
    } catch (error) {
      // Log error
      this.logOperation('error', { 
        operation: operation.name, 
        error: error.message 
      });
      
      // Context can handle exceptions, retry, fallback, etc.
      throw error;
    }
  }
  
  // ... other Context methods
}
```

## OperationSet Framework

```typescript
// OperationSet - collection of Operations with shared Context
class OperationSet<TInput = any, TOutput = any> implements Capability<TInput, TOutput> {
  private readonly operations: Map<string, Operation>;
  private readonly sharedContext: Context;
  
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly inputSchema: JsonSchema,
    public readonly outputSchema: JsonSchema,
    operations: Operation[],
    parentContext: Context
  ) {
    this.operations = new Map(operations.map(op => [op.name, op]));
    // Create shared context for all operations in the set
    this.sharedContext = parentContext.spawn({
      metadata: { operationSet: this.name }
    });
  }
  
  getOperation(name: string): Operation | undefined {
    return this.operations.get(name);
  }
  
  // OperationSet itself can be a Capability if it has a primary operation
  async execute(input: Input<TInput>): Promise<Output<TOutput>> {
    // Subclasses define how to execute the set
    throw new Error('OperationSet must implement execute or be extended');
  }
}
```

## Process - OperationSet with Flow Control

```typescript
// Process - an OperationSet that includes flow control
class Process<TInput = any, TOutput = any> extends OperationSet<TInput, TOutput> {
  private readonly flowController: Operation<ProcessFlowInput, ProcessFlowOutput>;
  
  constructor(
    name: string,
    description: string,
    inputSchema: JsonSchema,
    outputSchema: JsonSchema,
    steps: Operation[],
    flowDefinition: FlowDefinition,
    parentContext: Context
  ) {
    // Create flow controller operation
    const flowImplementation = new FlowControllerImplementation(flowDefinition);
    const flowController = new Operation(
      `${name}-flow-controller`,
      `Flow control for ${name}`,
      processFlowInputSchema,
      processFlowOutputSchema,
      flowImplementation,
      parentContext
    );
    
    // Process has N steps + 1 flow controller
    super(name, description, inputSchema, outputSchema, [...steps, flowController], parentContext);
    this.flowController = flowController;
  }
  
  async execute(input: Input<TInput>): Promise<Output<TOutput>> {
    // Flow controller orchestrates the process
    const flowInput = new ProcessFlowInput({
      processInput: input,
      steps: Array.from(this.operations.values()).filter(op => op !== this.flowController)
    });
    
    const flowResult = await this.flowController.execute(flowInput);
    return flowResult.data.processOutput as Output<TOutput>;
  }
}

// Flow controller implementation
class FlowControllerImplementation implements Implementation<ProcessFlowInput, ProcessFlowOutput> {
  constructor(private readonly flowDefinition: FlowDefinition) {}
  
  async execute(
    input: ProcessFlowInput, 
    resources: InjectedResources
  ): Promise<ProcessFlowOutput> {
    let currentData = input.processInput;
    
    // Execute steps according to flow definition
    for (const stepDef of this.flowDefinition.steps) {
      const step = input.steps.find(s => s.name === stepDef.name);
      if (!step) throw new Error(`Step ${stepDef.name} not found`);
      
      // Check conditions
      if (stepDef.condition && !stepDef.condition.evaluate(currentData)) {
        continue;
      }
      
      // Transform input if needed
      const stepInput = stepDef.inputMapping 
        ? stepDef.inputMapping.transform(currentData)
        : currentData;
      
      // Execute step via Context messaging
      currentData = await resources.capabilities.get(step.name).execute(stepInput);
    }
    
    return {
      processOutput: currentData,
      executionTrace: resources.logger.getTrace()
    };
  }
}
```

## OrgataOperation - OperationSet with Mode Strategy

```typescript
// Operation modes
enum OperationMode {
  ALGORITHM = 'algorithm',
  AGENT = 'agent', 
  HUMAN = 'human'
}

// OrgataOperation - wraps business logic in three modes
class OrgataOperation<TInput = any, TOutput = any> extends OperationSet<TInput, TOutput> {
  private readonly strategyController: Operation<TInput, TOutput>;
  
  constructor(
    name: string,
    description: string,
    inputSchema: JsonSchema,
    outputSchema: JsonSchema,
    implementations: {
      algorithm?: Implementation<TInput, TOutput>,
      agent?: AgentImplementation<TInput, TOutput>,
      human?: HumanImplementation<TInput, TOutput>
    },
    strategy: ControlStrategy,
    parentContext: Context
  ) {
    const operations: Operation[] = [];
    
    // Create operations for each mode provided
    if (implementations.algorithm) {
      operations.push(new Operation(
        `${name}-algorithm`,
        `Algorithm implementation of ${name}`,
        inputSchema,
        outputSchema,
        implementations.algorithm,
        parentContext
      ));
    }
    
    if (implementations.agent) {
      operations.push(new Operation(
        `${name}-agent`,
        `AI agent implementation of ${name}`,
        inputSchema,
        outputSchema,
        implementations.agent,
        parentContext
      ));
    }
    
    if (implementations.human) {
      operations.push(new Operation(
        `${name}-human`,
        `Human implementation of ${name}`,
        inputSchema,
        outputSchema,
        implementations.human,
        parentContext
      ));
    }
    
    // Create strategy controller
    const strategyImplementation = new StrategyControllerImplementation(strategy, operations);
    const strategyController = new Operation(
      `${name}-strategy`,
      `Strategy controller for ${name}`,
      inputSchema,
      outputSchema,
      strategyImplementation,
      parentContext
    );
    
    super(name, description, inputSchema, outputSchema, [...operations, strategyController], parentContext);
    this.strategyController = strategyController;
  }
  
  async execute(input: Input<TInput>): Promise<Output<TOutput>> {
    // Strategy controller handles mode selection and fallback
    return this.strategyController.execute(input);
  }
}

// Control strategy definition
interface ControlStrategy {
  readonly modes: OperationMode[];
  readonly fallbackRules: FallbackRule[];
  
  shouldFallback(error: Error, currentMode: OperationMode): boolean;
  getNextMode(currentMode: OperationMode): OperationMode | null;
}
```

## Implementation Types

```typescript
// Algorithm implementation - pure code
class AlgorithmImplementation<TInput, TOutput> implements Implementation<TInput, TOutput> {
  constructor(
    private readonly algorithm: (input: TInput, resources: InjectedResources) => Promise<TOutput>
  ) {}
  
  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    return this.algorithm(input, resources);
  }
}

// Agent implementation - AI-powered
class AgentImplementation<TInput, TOutput> implements Implementation<TInput, TOutput> {
  constructor(
    private readonly prompt: string,
    private readonly outputParser: (response: string) => TOutput
  ) {}
  
  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    const aiService = resources.tools.get('ai-service') as AIService;
    const response = await aiService.complete({
      prompt: this.prompt,
      context: input,
      model: resources.config.aiModel || 'gpt-4'
    });
    
    return this.outputParser(response);
  }
}

// Human implementation - UI interaction
class HumanImplementation<TInput, TOutput> implements Implementation<TInput, TOutput> {
  constructor(
    private readonly viewModel: HumanTaskViewModel
  ) {}
  
  async execute(input: TInput, resources: InjectedResources): Promise<TOutput> {
    const uiService = resources.tools.get('ui-service') as UIService;
    
    const task = {
      id: generateId(),
      viewModel: this.viewModel,
      input: input,
      outputSchema: resources.config.outputSchema
    };
    
    // Block until human completes the task
    const result = await uiService.presentTaskAndWait(task);
    return result as TOutput;
  }
}
```

## Method Compilation

```typescript
// Method - plain English steps
interface Method {
  readonly steps: string[];
}

// Compiles Method text into Implementation
class MethodCompiler {
  compile<TInput, TOutput>(
    method: Method,
    context: CompilationContext
  ): Implementation<TInput, TOutput> {
    // For now, could use AI to generate code
    // Or map to predefined implementations
    // Or generate workflow calling other operations
    
    return new AlgorithmImplementation(async (input, resources) => {
      // Generated implementation based on method steps
      for (const step of method.steps) {
        // Process each step
      }
      return input as any; // Placeholder
    });
  }
}
```

## Supporting Types

```typescript
interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
}

interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  // ... other JSON Schema properties
}

interface Message {
  readonly id: string;
  readonly type: MessageType;
  readonly payload: any;
  readonly source: Context;
  readonly timestamp: Date;
}

enum MessageScope {
  PARENT = 'parent',
  SIBLINGS = 'siblings',
  CHILDREN = 'children',
  ALL = 'all'
}

interface FlowDefinition {
  readonly steps: StepDefinition[];
}

interface StepDefinition {
  readonly name: string;
  readonly condition?: Condition;
  readonly inputMapping?: InputMapping;
}

interface ContextModifications {
  readonly capabilities?: Map<string, Capability>;
  readonly metadata?: Record<string, any>;
  readonly middlewares?: Middleware[];
}
```

This simplified architecture:
1. **Operation = Context + Implementation** (clean separation)
2. **Context handles all I/O and messaging** (including exception handling)
3. **Implementation is just code** (single execute method)
4. **OperationSet provides shared Context** (elegant composition)
5. **Process is OperationSet with flow control** (natural hierarchy)
6. **OrgataOperation is OperationSet with mode strategy** (reuses pattern)

The key insight is that Context becomes the orchestrator/microruntime, while Implementation is pure business logic. This makes testing, mocking, and composition much cleaner.