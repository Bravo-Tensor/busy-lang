// Core types for the Orgata framework

export interface Input<T = any> {
  readonly data: T;
  readonly schema: JsonSchema;
  validate(): ValidationResult;
  serialize(): string;
}

export interface Output<T = any> {
  readonly data: T;
  readonly schema: JsonSchema;
  validate(): ValidationResult;
  serialize(): string;
}

export interface Capability<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly outputSchema: JsonSchema;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  default?: any;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface InjectedResources {
  readonly capabilities: Map<string, Capability>;
  readonly config: OperationConfig;
  readonly logger: Logger;
  readonly context: Context;
}

export interface OperationConfig {
  timeout: number;
  retryCount: number;
  aiModel?: string;
  [key: string]: any;
}

export interface Logger {
  log(entry: LogEntry): void;
  createChild(name: string): Logger;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface Message {
  readonly id: string;
  readonly type: string;
  readonly payload: any;
  readonly source: Context;
  readonly timestamp: Date;
}

export enum MessageScope {
  PARENT = 'parent',
  SIBLINGS = 'siblings', 
  CHILDREN = 'children',
  ALL = 'all'
}

// Context interface - will be implemented by BaseContext
export interface Context {
  readonly capabilities: Map<string, Capability>;
  readonly infrastructure: InfrastructureServices;
  readonly executionDepth: number;
  readonly parent?: Context;
  readonly executionId: string;
  
  getCapability<T extends Capability>(name: string): T;
  logOperation(operation: string, metadata: Record<string, any>): void;
  checkAuthorization(operation: string, resource: string): boolean;
  
  sendInput<T>(operation: Operation, input: Input<T>): Promise<Output<T>>;
  sendMessage(target: Context, message: Message): Promise<void>;
  broadcast(message: Message, scope: MessageScope): Promise<void>;
  
  getContextForOperation(operation: Operation): Context;
  spawn(modifications?: ContextModifications): Context;
}

export interface InfrastructureServices {
  readonly logger: Logger;
  readonly auth: AuthorizationService;
  readonly persistence: PersistenceService;
  readonly messaging: MessagingService;
  readonly resourceInjector: ResourceInjector;
  readonly interventionManager: import('./intervention/intervention-manager.js').InterventionManager;
}

export interface AuthorizationService {
  checkPermission(request: AuthRequest): boolean;
}

export interface AuthRequest {
  operation: string;
  resource: string;
  contextId: string;
  executionDepth: number;
}

export interface PersistenceService {
  getConfig(key: string): Promise<any>;
  setConfig(key: string, value: any): Promise<void>;
}

export interface MessagingService {
  send(targetId: string, message: Message): Promise<void>;
}

export interface ResourceInjector {
  inject(operation: Operation, context: Context): Promise<InjectedResources>;
}

export interface ContextModifications {
  readonly capabilities?: Map<string, Capability>;
  readonly metadata?: Record<string, any>;
}

// Forward declarations
export interface Operation<TInput = any, TOutput = any> extends Capability<TInput, TOutput> {
  execute(input: Input<TInput>): Promise<Output<TOutput>>;
  getImplementation(): Implementation<TInput, TOutput>;
}

export interface Implementation<TInput = any, TOutput = any> {
  execute(input: TInput, resources: InjectedResources): Promise<TOutput>;
}

// Utility function
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}