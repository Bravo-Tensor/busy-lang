// Basic infrastructure services implementation

import { 
  Logger, LogEntry, AuthorizationService, AuthRequest, 
  PersistenceService, MessagingService, ResourceInjector,
  InfrastructureServices, InjectedResources, OperationConfig,
  Message, Context, Operation, generateId
} from './types.js';
import { InterventionManager } from './intervention/intervention-manager.js';

export class ConsoleLogger implements Logger {
  constructor(private readonly prefix?: string) {}

  log(entry: LogEntry): void {
    const timestamp = new Date().toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    
    let message = `${timestamp} ${level} ${prefix}`;
    
    if (entry.operation) {
      message += `${entry.operation}: `;
    }
    
    if (entry.message) {
      message += entry.message;
    }
    
    if (entry.metadata) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }

    // Color coding for terminal
    switch (entry.level) {
      case 'error':
        console.error(`\x1b[31m${message}\x1b[0m`); // Red
        break;
      case 'warn':
        console.warn(`\x1b[33m${message}\x1b[0m`); // Yellow
        break;
      case 'info':
        console.info(`\x1b[36m${message}\x1b[0m`); // Cyan
        break;
      case 'debug':
        console.debug(`\x1b[90m${message}\x1b[0m`); // Gray
        break;
      default:
        console.log(message);
    }
  }

  createChild(name: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${name}` : name;
    return new ConsoleLogger(childPrefix);
  }
}

export class SimpleAuthService implements AuthorizationService {
  checkPermission(request: AuthRequest): boolean {
    // For our kitchen example, allow all operations
    // In production, this would check roles, permissions, etc.
    return true;
  }
}

export class InMemoryPersistenceService implements PersistenceService {
  private storage = new Map<string, any>();

  async getConfig(key: string): Promise<any> {
    return this.storage.get(key) || {};
  }

  async setConfig(key: string, value: any): Promise<void> {
    this.storage.set(key, value);
  }
}

export class SimpleMessagingService implements MessagingService {
  private messageHandlers = new Map<string, (message: Message) => void>();

  async send(targetId: string, message: Message): Promise<void> {
    const handler = this.messageHandlers.get(targetId);
    if (handler) {
      // Simulate async message delivery
      setTimeout(() => handler(message), 10);
    }
  }

  registerHandler(contextId: string, handler: (message: Message) => void): void {
    this.messageHandlers.set(contextId, handler);
  }

  unregisterHandler(contextId: string): void {
    this.messageHandlers.delete(contextId);
  }
}

export class BasicResourceInjector implements ResourceInjector {
  async inject(operation: Operation, context: Context): Promise<InjectedResources> {
    const config = await this.createOperationConfig(operation.name);
    const logger = context.infrastructure.logger.createChild(operation.name);

    return {
      capabilities: context.capabilities,
      config,
      logger,
      context
    };
  }

  private async createOperationConfig(operationName: string): Promise<OperationConfig> {
    return {
      timeout: 30000, // 30 seconds
      retryCount: 3,
      aiModel: 'gpt-4'
    };
  }
}

export class BasicInfrastructureServices implements InfrastructureServices {
  public readonly logger: Logger;
  public readonly auth: AuthorizationService;
  public readonly persistence: PersistenceService;
  public readonly messaging: MessagingService;
  public readonly resourceInjector: ResourceInjector;
  public readonly interventionManager: InterventionManager;

  constructor() {
    this.logger = new ConsoleLogger();
    this.auth = new SimpleAuthService();
    this.persistence = new InMemoryPersistenceService();
    this.messaging = new SimpleMessagingService();
    this.resourceInjector = new BasicResourceInjector();
    this.interventionManager = InterventionManager.getInstance();
  }
}

// Errors
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class CapabilityNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapabilityNotFoundError';
  }
}