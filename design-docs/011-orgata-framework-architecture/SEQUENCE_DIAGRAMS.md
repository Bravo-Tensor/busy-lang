# Orgata Framework - Sequence Diagrams

This document illustrates key execution flows in the Orgata runtime framework, showing how compiled BUSY specifications wire together and execute.

## 1. BUSY Compilation to Runtime Objects

```mermaid
sequenceDiagram
    participant BUSY as BUSY File
    participant Compiler
    participant Factory as RuntimeFactory
    participant Context as RootContext
    participant Op as Operation
    participant Impl as Implementation
    participant Set as OperationSet

    BUSY->>Compiler: Parse playbook definition
    Compiler->>Compiler: Generate Implementation classes
    Compiler->>Factory: Create runtime objects
    
    Factory->>Context: Create root Context
    Context->>Context: Initialize infrastructure services
    
    Factory->>Impl: new AlgorithmImplementation(code)
    Factory->>Op: new Operation(name, impl, context)
    Op->>Context: Register capability
    
    Factory->>Set: new Process/OrgataOperation
    Set->>Context: spawn shared context
    Set->>Set: Add operations to collection
    
    Factory-->>BUSY: Runtime objects ready
```

## 2. Simple Operation Execution

```mermaid
sequenceDiagram
    participant Client
    participant Op as Operation
    participant Ctx as Context
    participant Impl as Implementation
    participant Infra as Infrastructure

    Client->>Op: execute(input)
    Op->>Ctx: sendInput(this, input)
    
    Ctx->>Ctx: validate input
    Ctx->>Infra: logOperation('start')
    Ctx->>Infra: checkAuthorization()
    
    Ctx->>Infra: resourceInjector.inject()
    Infra-->>Ctx: resources
    
    Ctx->>Impl: execute(input.data, resources)
    Note over Impl: Business logic executes
    Impl-->>Ctx: result
    
    Ctx->>Ctx: wrap in Output
    Ctx->>Ctx: validate output
    Ctx->>Infra: logOperation('complete')
    
    Ctx-->>Op: output
    Op-->>Client: output
```

## 3. Process Execution with Multiple Steps

```mermaid
sequenceDiagram
    participant Client
    participant Process
    participant FlowCtrl as FlowController
    participant Ctx as SharedContext
    participant Op1 as Operation1
    participant Op2 as Operation2
    participant Op3 as Operation3

    Client->>Process: execute(input)
    Process->>FlowCtrl: execute(flowInput)
    
    Note over FlowCtrl: Flow controller orchestrates
    
    FlowCtrl->>Ctx: Get Operation1
    FlowCtrl->>Op1: execute(input)
    Op1->>Ctx: sendInput(this, input)
    Ctx->>Ctx: Execute Op1 logic
    Ctx-->>Op1: output1
    Op1-->>FlowCtrl: output1
    
    FlowCtrl->>FlowCtrl: Check conditions for Op2
    FlowCtrl->>Op2: execute(output1)
    Op2->>Ctx: sendInput(this, output1)
    Ctx->>Ctx: Execute Op2 logic
    Ctx-->>Op2: output2
    Op2-->>FlowCtrl: output2
    
    FlowCtrl->>Op3: execute(output2)
    Op3->>Ctx: sendInput(this, output2)
    Ctx->>Ctx: Execute Op3 logic
    Ctx-->>Op3: output3
    Op3-->>FlowCtrl: output3
    
    FlowCtrl-->>Process: processOutput
    Process-->>Client: output
```

## 4. OrgataOperation with Mode Fallback

```mermaid
sequenceDiagram
    participant Client
    participant OrgOp as OrgataOperation
    participant StratCtrl as StrategyController
    participant Ctx as Context
    participant AlgOp as AlgorithmOp
    participant AgentOp as AgentOp
    participant HumanOp as HumanOp

    Client->>OrgOp: execute(input)
    OrgOp->>StratCtrl: execute(input)
    
    Note over StratCtrl: Try Algorithm first
    StratCtrl->>AlgOp: execute(input)
    AlgOp->>Ctx: sendInput(this, input)
    Ctx->>Ctx: Execute algorithm
    Ctx-->>AlgOp: Error: LowConfidence
    AlgOp-->>StratCtrl: Error
    
    Note over StratCtrl: Fallback to Agent
    StratCtrl->>StratCtrl: shouldFallback(error, ALGORITHM)
    StratCtrl->>AgentOp: execute(input)
    AgentOp->>Ctx: sendInput(this, input)
    Ctx->>Ctx: Execute AI prompt
    Ctx-->>AgentOp: Error: HighComplexity
    AgentOp-->>StratCtrl: Error
    
    Note over StratCtrl: Fallback to Human
    StratCtrl->>StratCtrl: shouldFallback(error, AGENT)
    StratCtrl->>HumanOp: execute(input)
    HumanOp->>Ctx: sendInput(this, input)
    Ctx->>Ctx: Present UI task
    Note over Ctx: Wait for human input
    Ctx-->>HumanOp: output
    HumanOp-->>StratCtrl: output
    
    StratCtrl-->>OrgOp: output
    OrgOp-->>Client: output
```

## 5. Context Messaging Between Operations

```mermaid
sequenceDiagram
    participant Op1 as Operation1
    participant Ctx1 as Context1
    participant Ctx2 as Context2
    participant Op2 as Operation2
    participant Bus as MessageBus

    Op1->>Ctx1: Need to notify sibling
    Ctx1->>Ctx1: Create message
    Ctx1->>Bus: broadcast(message, SIBLINGS)
    
    Bus->>Bus: Find sibling contexts
    Bus->>Ctx2: deliver(message)
    
    Ctx2->>Ctx2: Process message
    Ctx2->>Op2: Trigger based on message
    Op2->>Op2: Execute if needed
    
    Note over Bus: Async messaging
    
    Op2->>Ctx2: Send response
    Ctx2->>Bus: sendMessage(ctx1, response)
    Bus->>Ctx1: deliver(response)
    Ctx1->>Op1: Response received
```

## 6. Context Spawning and Resource Sharing

```mermaid
sequenceDiagram
    participant Process
    participant ParentCtx as ParentContext
    participant SharedCtx as SharedContext
    participant Op1 as Operation1
    participant Op2 as Operation2
    participant Res as SharedResources

    Process->>ParentCtx: spawn(modifications)
    ParentCtx->>SharedCtx: Create child context
    SharedCtx->>SharedCtx: executionDepth = parent + 1
    SharedCtx->>SharedCtx: Link to parent
    
    Note over SharedCtx: Inherits capabilities
    
    Op1->>SharedCtx: Need database connection
    SharedCtx->>Res: Get shared resource
    Res-->>SharedCtx: Connection pool
    SharedCtx-->>Op1: Injected resources
    
    Op2->>SharedCtx: Need database connection
    SharedCtx->>Res: Get shared resource
    Note over Res: Reuse existing pool
    Res-->>SharedCtx: Same connection pool
    SharedCtx-->>Op2: Injected resources
    
    Note over SharedCtx: Shared state management
```

## 7. Complete Business Process Example

This shows a customer inquiry process from BUSY spec to execution:

```yaml
# BUSY specification
playbook:
  name: "handle-customer-inquiry"
  steps:
    - name: "receive-inquiry"
      execution_type: "human"
    - name: "analyze-sentiment"
      execution_strategy:
        modes: ["algorithm", "agent"]
    - name: "route-to-department"
      execution_type: "algorithm"
```

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Process
    participant Receive as ReceiveOp
    participant Analyze as AnalyzeOp
    participant Route as RouteOp
    participant Ctx as SharedContext

    User->>UI: Submit inquiry
    UI->>Process: execute(inquiryInput)
    
    Process->>Receive: execute(inquiryInput)
    Receive->>Ctx: Present form to user
    Note over User: Fills out form
    User->>UI: Submit form
    UI->>Ctx: Form data
    Ctx-->>Receive: inquiryData
    Receive-->>Process: inquiryData
    
    Process->>Analyze: execute(inquiryData)
    Note over Analyze: Try algorithm first
    Analyze->>Ctx: Run sentiment analysis
    Ctx->>Ctx: Low confidence result
    Note over Analyze: Fallback to AI
    Analyze->>Ctx: Run AI analysis
    Ctx-->>Analyze: sentimentResult
    Analyze-->>Process: sentimentResult
    
    Process->>Route: execute(sentimentResult)
    Route->>Ctx: Apply routing rules
    Ctx->>Ctx: Determine department
    Ctx-->>Route: routingDecision
    Route-->>Process: routingDecision
    
    Process-->>UI: Process complete
    UI-->>User: Confirmation
```

## Key Insights from Sequence Diagrams

1. **Context as Orchestrator**: Context handles all the complexity of execution, validation, resource injection, and messaging

2. **Clean Separation**: Operations don't know about infrastructure - they just receive injected resources

3. **Flexible Composition**: Process and OrgataOperation are just specialized OperationSets with control operations

4. **Unified Execution Model**: Everything goes through Context.sendInput(), providing consistent behavior

5. **Resource Efficiency**: Shared contexts enable resource pooling while maintaining isolation where needed

6. **Natural Fallback**: Strategy pattern is just another Operation that coordinates other Operations

The architecture enables business logic to remain simple while the framework handles all the complexity of distributed execution, error handling, and resource management.