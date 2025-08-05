# Orgata Backend Service Architecture

This document defines the comprehensive architecture for exposing Orgata runtime as a backend service with dual protocol support.

## High-Level Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   MCP Protocol      │    │   REST API          │    │   WebSocket         │
│   (Development)     │    │   (Frontend)        │    │   (Real-time)       │
└─────────┬───────────┘    └─────────┬───────────┘    └─────────┬───────────┘
          │                          │                          │
          └──────────────┬───────────┴──────────────┬───────────┘
                         │                          │
                ┌────────▼──────────────────────────▼────────┐
                │        Protocol Adapter Layer              │
                │  (MCP Resources/Tools ↔ REST Endpoints)    │
                └────────────────┬───────────────────────────┘
                                 │
                ┌────────────────▼───────────────────────────┐
                │         Orgata Business Engine             │
                │    (Protocol-Agnostic Core Logic)         │
                └────────────────┬───────────────────────────┘
                                 │
                ┌────────────────▼───────────────────────────┐
                │        Orgata Framework Runtime            │
                │   (Operations, Contexts, Interventions)   │
                └────────────────────────────────────────────┘
```

## Core Components

### 1. Orgata Business Engine

The protocol-agnostic core that manages all business operations.

```typescript
interface OrgataBusinessEngine {
  // Runtime Management
  createRuntime(config: RuntimeConfig): Promise<string>;
  getRuntimeInfo(runtimeId: string): Promise<RuntimeInfo>;
  listRuntimes(): Promise<RuntimeInfo[]>;
  
  // Process Execution
  executePlaybook(runtimeId: string, playbookName: string, input: any): Promise<ExecutionHandle>;
  getExecutionStatus(executionId: string): Promise<ExecutionStatus>;
  pauseExecution(executionId: string): Promise<void>;
  resumeExecution(executionId: string): Promise<void>;
  
  // Intervention Management
  getPendingInterventions(executionId: string): Promise<InterventionRequest[]>;
  handleIntervention(executionId: string, interventionId: string, response: any): Promise<void>;
  
  // Schema Discovery
  getPlaybookSchema(runtimeId: string, playbookName: string): Promise<PlaybookSchema>;
  getRoleCapabilities(runtimeId: string, roleName: string): Promise<RoleCapabilities>;
  getOperationMetadata(runtimeId: string, operationName: string): Promise<OperationMetadata>;
  
  // State Management
  getProcessState(executionId: string): Promise<ProcessState>;
  getExecutionHistory(executionId: string): Promise<ExecutionHistory>;
  
  // Event Streaming
  subscribeToExecutionEvents(executionId: string, callback: EventCallback): Promise<void>;
  unsubscribeFromExecutionEvents(executionId: string): Promise<void>;
}
```

### 2. MCP Server Adapter

Exposes business engine through MCP protocol.

```typescript
class OrgataMCPServer implements MCPServer {
  constructor(private engine: OrgataBusinessEngine) {}

  // Resource Handlers
  async listResources(params?: ListResourcesParams): Promise<Resource[]> {
    const runtimes = await this.engine.listRuntimes();
    return this.mapRuntimesToResources(runtimes);
  }

  async readResource(uri: string): Promise<ResourceContent> {
    const parsed = this.parseResourceURI(uri);
    
    switch (parsed.type) {
      case 'runtime':
        return this.engine.getRuntimeInfo(parsed.id);
      case 'playbook':
        return this.engine.getPlaybookSchema(parsed.runtimeId, parsed.name);
      case 'execution':
        return this.engine.getExecutionStatus(parsed.id);
      case 'role':
        return this.engine.getRoleCapabilities(parsed.runtimeId, parsed.name);
      case 'operation':
        return this.engine.getOperationMetadata(parsed.runtimeId, parsed.name);
    }
  }

  // Tool Handlers
  async callTool(name: string, args: any): Promise<ToolResult> {
    switch (name) {
      case 'execute_playbook':
        return this.engine.executePlaybook(args.runtimeId, args.playbookName, args.input);
      case 'intervene_execution':
        return this.engine.handleIntervention(args.executionId, args.interventionId, args.response);
      case 'pause_execution':
        return this.engine.pauseExecution(args.executionId);
      case 'resume_execution':
        return this.engine.resumeExecution(args.executionId);
      case 'get_pending_interventions':
        return this.engine.getPendingInterventions(args.executionId);
    }
  }

  // Prompt Handlers
  async getPrompt(name: string, args: any): Promise<PromptResult> {
    switch (name) {
      case 'generate_operation_prompt':
        return this.generateOperationPrompt(args.operationMetadata);
      case 'validate_business_logic':
        return this.generateValidationPrompt(args.playbookSchema);
      case 'suggest_process_improvements':
        return this.generateImprovementPrompt(args.executionHistory);
    }
  }
}
```

### 3. REST API Server

Provides HTTP/WebSocket access to business engine.

```typescript
class OrgataRestServer {
  constructor(private engine: OrgataBusinessEngine) {}

  setupRoutes() {
    // Runtime Management
    this.app.get('/api/v1/runtimes', this.listRuntimes.bind(this));
    this.app.get('/api/v1/runtimes/:id', this.getRuntime.bind(this));
    this.app.post('/api/v1/runtimes', this.createRuntime.bind(this));

    // Process Execution
    this.app.post('/api/v1/runtimes/:id/executions', this.executePlaybook.bind(this));
    this.app.get('/api/v1/executions/:id', this.getExecution.bind(this));
    this.app.post('/api/v1/executions/:id/pause', this.pauseExecution.bind(this));
    this.app.post('/api/v1/executions/:id/resume', this.resumeExecution.bind(this));

    // Intervention Management
    this.app.get('/api/v1/executions/:id/interventions', this.getPendingInterventions.bind(this));
    this.app.post('/api/v1/executions/:id/interventions/:interventionId', this.handleIntervention.bind(this));

    // Schema Discovery
    this.app.get('/api/v1/runtimes/:id/playbooks/:name/schema', this.getPlaybookSchema.bind(this));
    this.app.get('/api/v1/runtimes/:id/roles/:name', this.getRoleCapabilities.bind(this));
    this.app.get('/api/v1/runtimes/:id/operations/:name', this.getOperationMetadata.bind(this));

    // WebSocket for real-time updates
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('subscribe_execution', async (executionId: string) => {
        await this.engine.subscribeToExecutionEvents(executionId, (event) => {
          socket.emit('execution_event', event);
        });
      });

      socket.on('unsubscribe_execution', async (executionId: string) => {
        await this.engine.unsubscribeFromExecutionEvents(executionId);
      });
    });
  }
}
```

## Protocol Mapping

### MCP Resource URI Patterns

- **`orgata://runtime/{runtime-id}`** - Runtime instance metadata
- **`orgata://playbook/{runtime-id}/{playbook-name}`** - Playbook definition and schema
- **`orgata://role/{runtime-id}/{role-name}`** - Role capabilities and permissions
- **`orgata://execution/{execution-id}`** - Process execution state and history
- **`orgata://operation/{runtime-id}/{operation-name}`** - Operation metadata and schema

### MCP Tools

```typescript
interface MCPToolDefinitions {
  execute_playbook: {
    description: "Start execution of a business playbook";
    inputSchema: {
      runtimeId: string;
      playbookName: string;
      input: any;
      executionOptions?: ExecutionOptions;
    };
  };

  intervene_execution: {
    description: "Provide human intervention in a running process";
    inputSchema: {
      executionId: string;
      interventionId: string;
      response: any;
      notes?: string;
    };
  };

  pause_execution: {
    description: "Pause a running process execution";
    inputSchema: {
      executionId: string;
    };
  };

  resume_execution: {
    description: "Resume a paused process execution";
    inputSchema: {
      executionId: string;
    };
  };

  get_pending_interventions: {
    description: "Get all pending human interventions for an execution";
    inputSchema: {
      executionId: string;
    };
  };
}
```

### REST API Endpoints

```typescript
interface RestAPIEndpoints {
  // Runtime Management
  'GET /api/v1/runtimes': () => RuntimeInfo[];
  'GET /api/v1/runtimes/:id': (id: string) => RuntimeDetails;
  'POST /api/v1/runtimes': (config: RuntimeConfig) => { runtimeId: string };

  // Process Execution
  'POST /api/v1/runtimes/:id/executions': (id: string, body: ExecutePlaybookRequest) => ExecutionHandle;
  'GET /api/v1/executions/:id': (id: string) => ExecutionStatus;
  'POST /api/v1/executions/:id/pause': (id: string) => void;
  'POST /api/v1/executions/:id/resume': (id: string) => void;

  // Intervention Management
  'GET /api/v1/executions/:id/interventions': (id: string) => InterventionRequest[];
  'POST /api/v1/executions/:id/interventions/:interventionId': (
    id: string, 
    interventionId: string, 
    body: InterventionResponse
  ) => void;

  // Schema Discovery
  'GET /api/v1/runtimes/:id/playbooks/:name/schema': (id: string, name: string) => PlaybookSchema;
  'GET /api/v1/runtimes/:id/roles/:name': (id: string, name: string) => RoleCapabilities;
  'GET /api/v1/runtimes/:id/operations/:name': (id: string, name: string) => OperationMetadata;
}
```

## Environment Management

### MCP Roots Configuration

```typescript
interface MCPRootConfiguration {
  production: {
    name: 'Production Environment';
    description: 'Live business operations';
    runtimes: string[];
    permissions: ProductionPermissions;
  };
  
  staging: {
    name: 'Staging Environment';
    description: 'Pre-production testing';
    runtimes: string[];
    permissions: StagingPermissions;
  };
  
  simulation: {
    name: 'Simulation Environment';
    description: 'Safe testing and experimentation';
    runtimes: string[];
    permissions: SimulationPermissions;
  };
  
  development: {
    name: 'Development Environment';
    description: 'Development and debugging';
    runtimes: string[];
    permissions: DevelopmentPermissions;
  };
}
```

## Data Flow Patterns

### Process Execution Flow

```typescript
// 1. Frontend requests playbook execution
POST /api/v1/runtimes/kitchen-v1/executions
{
  "playbookName": "pbj-sandwich",
  "input": { "sandwichType": "classic" }
}

// 2. Business engine creates execution
const execution = await engine.executePlaybook('kitchen-v1', 'pbj-sandwich', input);

// 3. WebSocket events stream real-time updates
socket.emit('execution_event', {
  executionId: 'exec-123',
  type: 'step_completed',
  step: 'gather-ingredients',
  data: { ingredients: ['bread', 'peanut-butter', 'jelly'] }
});

// 4. Human intervention needed
socket.emit('execution_event', {
  executionId: 'exec-123',
  type: 'intervention_required',
  intervention: {
    id: 'int-456',
    type: 'human_decision',
    prompt: 'Which jelly flavor?',
    options: ['grape', 'strawberry', 'apricot']
  }
});

// 5. Frontend handles intervention
POST /api/v1/executions/exec-123/interventions/int-456
{
  "response": { "jelly_flavor": "grape" },
  "notes": "Customer preference"
}
```

### MCP Development Workflow

```typescript
// Developer using Claude Code to analyze business processes
const playbooks = await mcpClient.listResources('orgata://playbook/kitchen-v1/*');
const analysis = await mcpClient.callTool('suggest_process_improvements', {
  executionHistory: await mcpClient.readResource('orgata://execution/exec-123')
});

// AI-assisted operation development
const operationPrompt = await mcpClient.getPrompt('generate_operation_prompt', {
  operationMetadata: await mcpClient.readResource('orgata://operation/kitchen-v1/gather-ingredients')
});
```

## Security and Access Control

### Environment-Based Permissions

```typescript
interface EnvironmentPermissions {
  production: {
    read: ['runtime', 'playbook', 'execution', 'role'];
    write: ['execution', 'intervention'];
    admin: false;
  };
  
  development: {
    read: ['runtime', 'playbook', 'execution', 'role', 'operation'];
    write: ['runtime', 'execution', 'intervention'];
    admin: true;
  };
}
```

### API Authentication

```typescript
interface AuthenticationConfig {
  mcp: {
    method: 'token' | 'certificate';
    permissions: EnvironmentPermissions;
  };
  
  rest: {
    method: 'jwt' | 'api_key';
    permissions: EnvironmentPermissions;
  };
}
```

This architecture provides:

1. **Clean Protocol Separation**: MCP and REST serve different use cases
2. **Single Source of Truth**: Business engine handles all core logic
3. **Real-time Capability**: WebSocket support for live process monitoring
4. **Environment Isolation**: Clear separation of deployment contexts
5. **AI Integration**: Native MCP support for development workflows
6. **Scalable Design**: Protocol adapters can be scaled independently