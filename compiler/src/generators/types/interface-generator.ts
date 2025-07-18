import { AnalysisResult } from '../../analysis/types';
import { PlaybookNode, TaskNode, DocumentNode, DeliverableNode } from '../../ast/nodes';
import { promises as fs } from 'fs';
import path from 'path';

export interface TypeGenerationOptions {
  outputPath: string;
  generateRuntimeTypes: boolean;
  generateFormTypes: boolean;
}

export class TypeScriptInterfaceGenerator {
  constructor(private options: TypeGenerationOptions) {}

  async generateInterfaces(analysisResult: AnalysisResult): Promise<void> {
    const busyTypes = this.generateBusyTypes(analysisResult);
    const runtimeTypes = this.generateRuntimeTypes(analysisResult);
    const formTypes = this.generateFormTypes(analysisResult);

    // Ensure directories exist
    await fs.mkdir(path.join(this.options.outputPath, 'types'), { recursive: true });

    // Write main types file
    await fs.writeFile(
      path.join(this.options.outputPath, 'types', 'busy-types.ts'),
      busyTypes,
      'utf-8'
    );

    if (this.options.generateRuntimeTypes) {
      await fs.writeFile(
        path.join(this.options.outputPath, 'types', 'runtime-types.ts'),
        runtimeTypes,
        'utf-8'
      );
    }

    if (this.options.generateFormTypes) {
      await fs.writeFile(
        path.join(this.options.outputPath, 'types', 'form-types.ts'),
        formTypes,
        'utf-8'
      );
    }

    console.log('TypeScript interfaces generated successfully');
  }

  private generateBusyTypes(analysisResult: AnalysisResult): string {
    const interfaces = [];

    // Generate base types
    interfaces.push(`
// Base BUSY types
export interface BusyMetadata {
  name: string;
  description: string;
  layer: 'L0' | 'L1' | 'L2';
}

export interface BusyImport {
  tool?: string;
  advisor?: string;
  capability: string;
}

export interface BusyFile {
  version: string;
  metadata: BusyMetadata;
  imports?: BusyImport[];
}
`);

    // Generate team types
    interfaces.push(`
// Team types
export interface Team extends BusyFile {
  team: {
    name: string;
    type: 'stream-aligned' | 'enabling' | 'complicated-subsystem' | 'platform';
    description: string;
    resources?: Resource[];
    governance?: Governance;
    interfaces?: TeamInterfaces;
    success_metrics?: string[];
  };
}

export interface Resource {
  type: 'time' | 'people' | 'capital' | 'attention' | 'tooling';
  allocation: number;
  unit: string;
}

export interface Governance {
  escalation_path?: string;
  decision_authority?: string[];
}

export interface TeamInterfaces {
  external?: string[];
  internal?: string[];
}
`);

    // Generate role types
    interfaces.push(`
// Role types
export interface Role extends BusyFile {
  role: {
    name: string;
    description: string;
    inherits_from?: string;
    onboarding?: OnboardingStep[];
    responsibilities?: string[];
    tasks?: Task[];
  };
}

export interface OnboardingStep {
  step: string;
  duration: string;
}
`);

    // Generate playbook types
    interfaces.push(`
// Playbook types
export interface Playbook extends BusyFile {
  playbook: {
    name: string;
    description: string;
    cadence: PlaybookCadence;
    inputs?: Deliverable[];
    outputs?: Deliverable[];
    steps?: Task[];
    issue_resolution?: IssueResolution[];
  };
}

export interface PlaybookCadence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand' | 'triggered';
  schedule?: string;
  trigger_events?: string[];
}

export interface IssueResolution {
  type: 'escalate' | 'override' | 'delegate' | 'pause' | 'ai_assist';
  target?: string;
  conditions?: string[];
  timeout?: string;
  fallback?: IssueResolution;
}
`);

    // Generate task types
    interfaces.push(`
// Task types
export interface Task {
  name: string;
  description: string;
  execution_type: 'algorithmic' | 'ai_agent' | 'human' | 'human_creative';
  estimated_duration?: string;
  inputs?: Deliverable[];
  outputs?: Deliverable[];
  ui_type?: 'form' | 'meeting' | 'writing_session' | 'strategy_session';
  algorithm?: string;
  agent_prompt?: string;
  issues?: TaskIssue[];
  tags?: string[];
  subtasks?: Task[];
}

export interface TaskIssue {
  issue_type: string;
  resolution: IssueResolution;
}
`);

    // Generate deliverable types
    interfaces.push(`
// Deliverable types
export interface Deliverable {
  name: string;
  type: 'document' | 'data';
  format: string;
  schema?: DeliverableSchema;
  required_fields?: string[];
  validation_rules?: ValidationRule[];
}

export interface DeliverableSchema {
  type: 'json' | 'xml' | 'yaml';
  definition: string;
}

export interface ValidationRule {
  rule_type: 'required' | 'format' | 'range' | 'dependency' | 'conflict';
  condition: string;
  error_message: string;
  severity: 'error' | 'warning' | 'info';
}
`);

    // Generate document types
    interfaces.push(`
// Document types
export interface DocumentDefinition extends BusyFile {
  document: {
    metadata: {
      name: string;
      description: string;
      version: string;
    };
    content_type: 'structured' | 'narrative';
    sections?: DocumentSection[];
    narrative_content?: string;
  };
}

export interface DocumentSection {
  name: string;
  description: string;
  fields: DocumentField[];
}

export interface DocumentField {
  name: string;
  type: 'text' | 'email' | 'date' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
  validation?: string;
}
`);

    return interfaces.join('\n');
  }

  private generateRuntimeTypes(analysisResult: AnalysisResult): string {
    return `
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
`;
  }

  private generateFormTypes(analysisResult: AnalysisResult): string {
    const formTypes = [];

    // Generate specific form types for each playbook
    for (const playbook of analysisResult.ast.symbols.playbooks.values()) {
      const playbookName = this.pascalCase(playbook.name);
      
      formTypes.push(`
// ${playbookName} form types
export interface ${playbookName}FormData {
  // TODO: Generate from playbook inputs
  [key: string]: any;
}

export interface ${playbookName}StepData {
  // TODO: Generate from playbook steps
  [key: string]: any;
}
`);
    }

    // Generate form types for each task
    for (const task of analysisResult.ast.symbols.tasks.values()) {
      const taskName = this.pascalCase(task.name);
      formTypes.push(`
export interface ${taskName}FormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ${taskName}OutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}
`);
    }

    return `
// Generated form types for UI components
import { ReactNode } from 'react';
import { Task } from './busy-types';
import { ProcessState } from './runtime-types';

export interface FormFieldProps {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  options?: string[];
  validation?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export interface TaskFormProps {
  task: Task;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface ProcessStepProps {
  processState: ProcessState;
  currentTask: Task;
  onStepComplete: (outputData: Record<string, any>) => void;
  onStepBack?: () => void;
}

${formTypes.join('\n')}
`;
  }

  private getTypeScriptType(type: string, format: string): string {
    switch (type) {
      case 'document':
        return format === 'json' ? 'Record<string, any>' : 'string';
      case 'data':
        return format === 'json' ? 'Record<string, any>' : 'any';
      default:
        return 'any';
    }
  }

  private getTaskOutputType(task: TaskNode): string {
    if (task.outputs && task.outputs.length > 0) {
      return task.outputs.map(output => 
        this.getTypeScriptType(output.type, output.format)
      ).join(' | ');
    }
    return 'Record<string, any>';
  }

  private pascalCase(str: string): string {
    return str.replace(/(^|[-_])([a-z])/g, (_, __, letter) => letter.toUpperCase());
  }
}