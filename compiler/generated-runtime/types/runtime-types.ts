
// Runtime types for process execution
export interface ProcessState {
  instanceId: number;
  playbookId: number;
  status: 'started' | 'in_progress' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  totalSteps: number;
  clientName: string | null;
  clientFolderPath: string | null;
  startedAt: Date;
  completedAt: Date | null;
  data: Record<string, any>;
}

export interface TaskExecutionContext {
  instanceId: number;
  taskId: number;
  step: number;
  inputData: Record<string, any>;
  previousOutputs: Record<string, any>[];
  processData: Record<string, any>;
}

export interface TaskExecutionResult {
  success: boolean;
  outputData: Record<string, any>;
  notes?: string;
  errors?: string[];
  nextStep?: number;
  shouldPause?: boolean;
}

export interface ClientFolder {
  path: string;
  processLog: string;
  documents: ClientDocument[];
  metadata: ClientFolderMetadata;
}

export interface ClientDocument {
  filename: string;
  content: string | Buffer;
  type: 'text' | 'json' | 'pdf' | 'image' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientFolderMetadata {
  processInstanceId: number;
  clientName: string;
  playbookName: string;
  createdAt: Date;
  lastUpdated: Date;
  version: number;
}

export interface ProcessDashboard {
  activeProcesses: ProcessState[];
  availablePlaybooks: PlaybookSummary[];
  recentActivity: ActivityLog[];
  statistics: ProcessStatistics;
}

export interface PlaybookSummary {
  id: number;
  name: string;
  description: string;
  teamName: string;
  estimatedDuration?: string;
  activeInstances: number;
}

export interface ActivityLog {
  id: number;
  timestamp: Date;
  instanceId: number;
  action: string;
  details: string;
  userId: string | null;
}

export interface ProcessStatistics {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  averageCompletionTime: number;
  successRate: number;
}

// Service interfaces
export interface ProcessExecutionService {
  startPlaybook(playbookId: number, initialData: Record<string, any>): Promise<ProcessState>;
  executeCurrentStep(instanceId: number, outputData: Record<string, any>): Promise<TaskExecutionResult>;
  getProcessState(instanceId: number): Promise<ProcessState>;
  pauseProcess(instanceId: number): Promise<void>;
  resumeProcess(instanceId: number): Promise<void>;
  cancelProcess(instanceId: number): Promise<void>;
}

export interface ClientFolderService {
  createClientFolder(processInstance: ProcessState): Promise<string>;
  updateProcessLog(instanceId: number): Promise<void>;
  saveDocument(instanceId: number, filename: string, content: string | Buffer): Promise<void>;
  getClientFolder(instanceId: number): Promise<ClientFolder>;
  archiveClientFolder(instanceId: number): Promise<string>;
}

export interface TaskExecutionService {
  executeAlgorithmicTask(context: TaskExecutionContext): Promise<TaskExecutionResult>;
  executeAIAgentTask(context: TaskExecutionContext): Promise<TaskExecutionResult>;
  executeHumanTask(context: TaskExecutionContext): Promise<TaskExecutionResult>;
  validateTaskOutput(taskId: number, outputData: Record<string, any>): Promise<ValidationResult>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}
