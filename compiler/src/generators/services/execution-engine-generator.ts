import { AnalysisResult } from '../../analysis/types';
import { promises as fs } from 'fs';
import path from 'path';

export interface ExecutionEngineGenerationOptions {
  outputPath: string;
  includeAIAgents: boolean;
  includeFileSystem: boolean;
}

export class ExecutionEngineGenerator {
  constructor(private options: ExecutionEngineGenerationOptions) {}

  async generateExecutionEngine(analysisResult: AnalysisResult): Promise<void> {
    // Ensure services directory exists
    await fs.mkdir(path.join(this.options.outputPath, 'src/services'), { recursive: true });

    // Generate core execution services
    await this.generateProcessExecutionService(analysisResult);
    await this.generateTaskExecutionService(analysisResult);
    await this.generateWorkflowOrchestrator(analysisResult);
    await this.generateValidationService(analysisResult);
    await this.generateStateManager(analysisResult);
    
    if (this.options.includeFileSystem) {
      await this.generateClientFolderService(analysisResult);
    }

    console.log('Process execution engine generated successfully');
  }

  private async generateProcessExecutionService(analysisResult: AnalysisResult): Promise<void> {
    const serviceCode = `
import { prisma } from '../lib/prisma';
import { ProcessState, TaskExecutionResult, ProcessExecutionService } from '../../types/runtime-types';
import { WorkflowOrchestrator } from './workflow-orchestrator';
import { ClientFolderServiceImpl } from './client-folder-service';
import { StateManager } from './state-manager';

export class ProcessExecutionServiceImpl implements ProcessExecutionService {
  private orchestrator: WorkflowOrchestrator;
  private clientFolderService: ClientFolderServiceImpl;
  private stateManager: StateManager;

  constructor() {
    this.orchestrator = new WorkflowOrchestrator();
    this.clientFolderService = new ClientFolderServiceImpl();
    this.stateManager = new StateManager();
  }

  async startPlaybook(playbookId: number, initialData: Record<string, any>): Promise<ProcessState> {
    console.log(\`🚀 Starting playbook \${playbookId} with data:\`, initialData);

    try {
      // Get playbook details
      const playbook = await prisma.playbook.findUnique({
        where: { id: playbookId },
        include: { 
          tasks: { orderBy: { orderIndex: 'asc' } },
          team: true 
        }
      });

      if (!playbook) {
        throw new Error(\`Playbook \${playbookId} not found\`);
      }

      // Validate initial data against playbook requirements
      const validationResult = await this.orchestrator.validateInitialData(playbook, initialData);
      if (!validationResult.isValid) {
        throw new Error(\`Invalid initial data: \${validationResult.errors.join(', ')}\`);
      }

      // Create process instance
      const instance = await prisma.playbookInstance.create({
        data: {
          playbookId,
          status: 'started',
          clientName: initialData.clientName || 'Unnamed Client',
          currentStep: 0,
          dataJson: JSON.stringify(initialData)
        }
      });

      // Create client folder
      const clientFolderPath = await this.clientFolderService.createClientFolder({
        instanceId: instance.id,
        playbookId: instance.playbookId,
        status: instance.status as any,
        currentStep: instance.currentStep,
        totalSteps: playbook.tasks.length,
        clientName: instance.clientName,
        clientFolderPath: null,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt,
        data: JSON.parse(instance.dataJson || '{}')
      });

      // Update instance with client folder path
      await prisma.playbookInstance.update({
        where: { id: instance.id },
        data: { clientFolderPath }
      });

      // Record state transition
      await this.stateManager.recordTransition({
        instanceId: instance.id,
        instanceType: 'playbook',
        fromStatus: null,
        toStatus: 'started',
        notes: \`Started playbook: \${playbook.name}\`,
        metadata: { playbookName: playbook.name, teamName: playbook.team.name }
      });

      // Initialize first task if available
      if (playbook.tasks.length > 0) {
        await this.orchestrator.prepareNextTask(instance.id, playbook.tasks[0]);
      }

      const processState: ProcessState = {
        instanceId: instance.id,
        playbookId: instance.playbookId,
        status: instance.status as any,
        currentStep: instance.currentStep,
        totalSteps: playbook.tasks.length,
        clientName: instance.clientName,
        clientFolderPath,
        startedAt: instance.startedAt,
        completedAt: instance.completedAt,
        data: JSON.parse(instance.dataJson || '{}')
      };

      console.log(\`✅ Playbook started successfully. Instance ID: \${instance.id}\`);
      return processState;

    } catch (error) {
      console.error('❌ Error starting playbook:', error);
      throw error;
    }
  }

  async executeCurrentStep(instanceId: number, outputData: Record<string, any>): Promise<TaskExecutionResult> {
    console.log(\`🔄 Executing step for instance \${instanceId}\`);

    try {
      // Get current instance with all related data
      const instance = await prisma.playbookInstance.findUnique({
        where: { id: instanceId },
        include: { 
          playbook: { 
            include: { 
              tasks: { orderBy: { orderIndex: 'asc' } },
              team: true 
            } 
          } 
        }
      });

      if (!instance) {
        throw new Error(\`Process instance \${instanceId} not found\`);
      }

      if (instance.status === 'completed') {
        throw new Error('Process is already completed');
      }

      const currentTask = instance.playbook.tasks[instance.currentStep];
      if (!currentTask) {
        throw new Error(\`No task found at step \${instance.currentStep}\`);
      }

      // Execute the current task
      const executionResult = await this.orchestrator.executeTask({
        instanceId,
        taskId: currentTask.id,
        step: instance.currentStep,
        inputData: outputData,
        previousOutputs: await this.getPreviousOutputs(instanceId),
        processData: JSON.parse(instance.dataJson || '{}')
      });

      if (!executionResult.success) {
        throw new Error(\`Task execution failed: \${executionResult.errors?.join(', ')}\`);
      }

      // Record task completion
      await prisma.taskInstance.create({
        data: {
          playbookInstanceId: instanceId,
          taskId: currentTask.id,
          status: 'completed',
          inputDataJson: JSON.stringify(outputData),
          outputDataJson: JSON.stringify(executionResult.outputData),
          notes: executionResult.notes,
          startedAt: new Date(),
          completedAt: new Date()
        }
      });

      // Update process state
      const nextStep = executionResult.nextStep ?? instance.currentStep + 1;
      const isComplete = nextStep >= instance.playbook.tasks.length;
      const newStatus = isComplete ? 'completed' : 'in_progress';

      // Accumulate process data
      const processData = JSON.parse(instance.dataJson || '{}');
      processData[\`step_\${instance.currentStep}\`] = executionResult.outputData;

      await prisma.playbookInstance.update({
        where: { id: instanceId },
        data: {
          currentStep: nextStep,
          status: newStatus,
          completedAt: isComplete ? new Date() : null,
          dataJson: JSON.stringify(processData)
        }
      });

      // Record state transition
      await this.stateManager.recordTransition({
        instanceId,
        instanceType: 'playbook',
        fromStatus: instance.status,
        toStatus: newStatus,
        notes: \`Completed task: \${currentTask.name}\`,
        metadata: { 
          taskName: currentTask.name,
          stepNumber: instance.currentStep + 1,
          totalSteps: instance.playbook.tasks.length
        }
      });

      // Update client folder
      await this.clientFolderService.updateProcessLog(instanceId);

      // Save any generated documents
      if (executionResult.outputData.documents) {
        for (const [filename, content] of Object.entries(executionResult.outputData.documents)) {
          await this.clientFolderService.saveDocument(instanceId, filename, content as string);
        }
      }

      console.log(\`✅ Step executed successfully. \${isComplete ? 'Process completed!' : \`Next step: \${nextStep}\`}\`);

      return {
        success: true,
        outputData: executionResult.outputData,
        notes: executionResult.notes,
        nextStep,
        shouldPause: executionResult.shouldPause || false
      };

    } catch (error) {
      console.error('❌ Error executing step:', error);
      
      // Record error in state transitions
      await this.stateManager.recordTransition({
        instanceId,
        instanceType: 'playbook',
        fromStatus: null, // Will be filled by state manager
        toStatus: 'error',
        notes: \`Error executing step: \${error instanceof Error ? error.message : 'Unknown error'}\`,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return {
        success: false,
        outputData: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async getProcessState(instanceId: number): Promise<ProcessState> {
    const instance = await prisma.playbookInstance.findUnique({
      where: { id: instanceId },
      include: { 
        playbook: { 
          include: { tasks: { orderBy: { orderIndex: 'asc' } } }
        } 
      }
    });

    if (!instance) {
      throw new Error(\`Process instance \${instanceId} not found\`);
    }

    return {
      instanceId: instance.id,
      playbookId: instance.playbookId,
      status: instance.status as any,
      currentStep: instance.currentStep,
      totalSteps: instance.playbook.tasks.length,
      clientName: instance.clientName,
      clientFolderPath: instance.clientFolderPath,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      data: JSON.parse(instance.dataJson || '{}')
    };
  }

  async pauseProcess(instanceId: number): Promise<void> {
    await prisma.playbookInstance.update({
      where: { id: instanceId },
      data: { status: 'paused' }
    });

    await this.stateManager.recordTransition({
      instanceId,
      instanceType: 'playbook',
      fromStatus: 'in_progress',
      toStatus: 'paused',
      notes: 'Process paused by user'
    });
  }

  async resumeProcess(instanceId: number): Promise<void> {
    await prisma.playbookInstance.update({
      where: { id: instanceId },
      data: { status: 'in_progress' }
    });

    await this.stateManager.recordTransition({
      instanceId,
      instanceType: 'playbook',
      fromStatus: 'paused',
      toStatus: 'in_progress',
      notes: 'Process resumed by user'
    });
  }

  async cancelProcess(instanceId: number): Promise<void> {
    await prisma.playbookInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled', completedAt: new Date() }
    });

    await this.stateManager.recordTransition({
      instanceId,
      instanceType: 'playbook',
      fromStatus: null, // Will be filled by state manager
      toStatus: 'cancelled',
      notes: 'Process cancelled by user'
    });

    // Archive client folder
    await this.clientFolderService.archiveClientFolder(instanceId);
  }

  private async getPreviousOutputs(instanceId: number): Promise<Record<string, any>[]> {
    const taskInstances = await prisma.taskInstance.findMany({
      where: { playbookInstanceId: instanceId },
      orderBy: { createdAt: 'asc' }
    });

    return taskInstances.map(task => 
      task.outputDataJson ? JSON.parse(task.outputDataJson) : {}
    );
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/services/process-execution-service.ts'),
      serviceCode,
      'utf-8'
    );
  }

  private async generateTaskExecutionService(analysisResult: AnalysisResult): Promise<void> {
    const serviceCode = `
import { TaskExecutionContext, TaskExecutionResult, TaskExecutionService, ValidationResult } from '../../types/runtime-types';
import { prisma } from '../lib/prisma';

export class TaskExecutionServiceImpl implements TaskExecutionService {
  
  async executeAlgorithmicTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(\`🤖 Executing algorithmic task \${context.taskId}\`);

    try {
      const task = await prisma.task.findUnique({
        where: { id: context.taskId }
      });

      if (!task) {
        throw new Error(\`Task \${context.taskId} not found\`);
      }

      const config = task.configJson ? JSON.parse(task.configJson) : {};
      const algorithm = config.algorithm || 'default';

      // Execute based on algorithm type
      let result: Record<string, any>;
      
      switch (algorithm) {
        case 'data_validation':
          result = await this.executeDataValidation(context.inputData, config);
          break;
        case 'calculation':
          result = await this.executeCalculation(context.inputData, config);
          break;
        case 'data_transformation':
          result = await this.executeDataTransformation(context.inputData, config);
          break;
        case 'notification':
          result = await this.executeNotification(context.inputData, config);
          break;
        default:
          result = { processed: true, ...context.inputData };
      }

      return {
        success: true,
        outputData: result,
        notes: \`Algorithmic task executed with algorithm: \${algorithm}\`
      };

    } catch (error) {
      return {
        success: false,
        outputData: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async executeAIAgentTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(\`🧠 Executing AI agent task \${context.taskId}\`);

    try {
      const task = await prisma.task.findUnique({
        where: { id: context.taskId }
      });

      if (!task) {
        throw new Error(\`Task \${context.taskId} not found\`);
      }

      const config = task.configJson ? JSON.parse(task.configJson) : {};
      const agentPrompt = config.agentPrompt || 'Process the provided data';

      // For now, simulate AI agent execution
      // In a real implementation, this would call an AI service
      const result = await this.simulateAIAgentExecution(context.inputData, agentPrompt, config);

      return {
        success: true,
        outputData: result,
        notes: \`AI agent task completed\`
      };

    } catch (error) {
      return {
        success: false,
        outputData: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async executeHumanTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(\`👤 Executing human task \${context.taskId}\`);

    // Human tasks are executed through the UI, so we just validate and pass through
    try {
      const validationResult = await this.validateTaskOutput(context.taskId, context.inputData);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          outputData: {},
          errors: validationResult.errors.map(e => e.message)
        };
      }

      return {
        success: true,
        outputData: context.inputData,
        notes: 'Human task completed successfully'
      };

    } catch (error) {
      return {
        success: false,
        outputData: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async validateTaskOutput(taskId: number, outputData: Record<string, any>): Promise<ValidationResult> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!task) {
        return {
          isValid: false,
          errors: [{ field: 'task', message: 'Task not found', code: 'TASK_NOT_FOUND' }],
          warnings: []
        };
      }

      const config = task.configJson ? JSON.parse(task.configJson) : {};
      const errors: any[] = [];
      const warnings: any[] = [];

      // Validate required fields
      if (config.requiredFields) {
        for (const field of config.requiredFields) {
          if (!outputData[field] || outputData[field] === '') {
            errors.push({
              field,
              message: \`Field '\${field}' is required\`,
              code: 'FIELD_REQUIRED'
            });
          }
        }
      }

      // Validate data types
      if (config.fieldTypes) {
        for (const [field, expectedType] of Object.entries(config.fieldTypes)) {
          if (outputData[field] !== undefined) {
            const actualType = typeof outputData[field];
            if (actualType !== expectedType) {
              warnings.push({
                field,
                message: \`Expected \${expectedType} but got \${actualType}\`,
                code: 'TYPE_MISMATCH'
              });
            }
          }
        }
      }

      // Validate business rules
      if (config.validationRules) {
        for (const rule of config.validationRules) {
          const isValid = await this.validateBusinessRule(outputData, rule);
          if (!isValid) {
            errors.push({
              field: rule.field || 'general',
              message: rule.message || 'Business rule validation failed',
              code: rule.code || 'BUSINESS_RULE_FAILED'
            });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{ field: 'validation', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    }
  }

  private async executeDataValidation(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const rules = config.validationRules || [];
    const results = { valid: true, errors: [] as string[], data: inputData };

    for (const rule of rules) {
      try {
        const isValid = await this.validateBusinessRule(inputData, rule);
        if (!isValid) {
          results.valid = false;
          results.errors.push(rule.message || 'Validation failed');
        }
      } catch (error) {
        results.valid = false;
        results.errors.push(\`Validation error: \${error instanceof Error ? error.message : 'Unknown error'}\`);
      }
    }

    return results;
  }

  private async executeCalculation(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const formula = config.formula || 'sum';
    const fields = config.fields || [];
    
    let result = 0;
    
    switch (formula) {
      case 'sum':
        result = fields.reduce((sum: number, field: string) => sum + (inputData[field] || 0), 0);
        break;
      case 'average':
        result = fields.reduce((sum: number, field: string) => sum + (inputData[field] || 0), 0) / fields.length;
        break;
      case 'multiply':
        result = fields.reduce((product: number, field: string) => product * (inputData[field] || 1), 1);
        break;
      default:
        result = 0;
    }

    return { ...inputData, calculatedValue: result, formula, fields };
  }

  private async executeDataTransformation(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const transformations = config.transformations || [];
    let transformedData = { ...inputData };

    for (const transform of transformations) {
      switch (transform.type) {
        case 'rename':
          if (transformedData[transform.from]) {
            transformedData[transform.to] = transformedData[transform.from];
            delete transformedData[transform.from];
          }
          break;
        case 'uppercase':
          if (transformedData[transform.field] && typeof transformedData[transform.field] === 'string') {
            transformedData[transform.field] = transformedData[transform.field].toUpperCase();
          }
          break;
        case 'lowercase':
          if (transformedData[transform.field] && typeof transformedData[transform.field] === 'string') {
            transformedData[transform.field] = transformedData[transform.field].toLowerCase();
          }
          break;
        case 'format_date':
          if (transformedData[transform.field]) {
            transformedData[transform.field] = new Date(transformedData[transform.field]).toISOString();
          }
          break;
      }
    }

    return transformedData;
  }

  private async executeNotification(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const notificationType = config.type || 'email';
    const recipients = config.recipients || [];
    const template = config.template || 'Default notification';

    // For now, just log the notification
    console.log(\`📧 Notification (\${notificationType}) would be sent to:\`, recipients);
    console.log(\`📝 Message: \${template}\`);
    console.log(\`📊 Data:\`, inputData);

    return {
      ...inputData,
      notificationSent: true,
      notificationType,
      recipients,
      sentAt: new Date().toISOString()
    };
  }

  private async simulateAIAgentExecution(inputData: Record<string, any>, prompt: string, config: any): Promise<Record<string, any>> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate simulated AI response based on input
    const aiResponse = {
      analysis: \`AI analysis of provided data using prompt: \${prompt}\`,
      suggestions: [
        'Consider validating the input data format',
        'Review the business rules for this process',
        'Ensure all required fields are present'
      ],
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
      processedAt: new Date().toISOString()
    };

    return {
      ...inputData,
      aiProcessing: aiResponse
    };
  }

  private async validateBusinessRule(data: Record<string, any>, rule: any): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'required':
          return data[rule.field] !== undefined && data[rule.field] !== null && data[rule.field] !== '';
        case 'email':
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          return emailRegex.test(data[rule.field] || '');
        case 'phone':
          const phoneRegex = /^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,}$/;
          return phoneRegex.test(data[rule.field] || '');
        case 'min_length':
          return (data[rule.field] || '').length >= (rule.value || 0);
        case 'max_length':
          return (data[rule.field] || '').length <= (rule.value || Infinity);
        case 'numeric':
          return !isNaN(Number(data[rule.field]));
        case 'positive':
          return Number(data[rule.field]) > 0;
        case 'date':
          return !isNaN(Date.parse(data[rule.field]));
        case 'future_date':
          return new Date(data[rule.field]) > new Date();
        case 'past_date':
          return new Date(data[rule.field]) < new Date();
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/services/task-execution-service.ts'),
      serviceCode,
      'utf-8'
    );
  }

  private async generateWorkflowOrchestrator(analysisResult: AnalysisResult): Promise<void> {
    const serviceCode = `
import { prisma } from '../lib/prisma';
import { TaskExecutionServiceImpl } from './task-execution-service';
import { TaskExecutionContext, TaskExecutionResult, ValidationResult } from '../../types/runtime-types';

export class WorkflowOrchestrator {
  private taskExecutionService: TaskExecutionServiceImpl;

  constructor() {
    this.taskExecutionService = new TaskExecutionServiceImpl();
  }

  async validateInitialData(playbook: any, initialData: Record<string, any>): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check if playbook has any initial data requirements
    const config = playbook.configJson ? JSON.parse(playbook.configJson) : {};
    
    if (config.requiredInitialFields) {
      for (const field of config.requiredInitialFields) {
        if (!initialData[field] || initialData[field] === '') {
          errors.push({
            field,
            message: \`Initial field '\${field}' is required\`,
            code: 'INITIAL_FIELD_REQUIRED'
          });
        }
      }
    }

    // Validate client name is provided
    if (!initialData.clientName || initialData.clientName.trim() === '') {
      errors.push({
        field: 'clientName',
        message: 'Client name is required',
        code: 'CLIENT_NAME_REQUIRED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async prepareNextTask(instanceId: number, task: any): Promise<void> {
    console.log(\`🔧 Preparing task \${task.name} for instance \${instanceId}\`);

    // Create task instance in 'pending' state
    await prisma.taskInstance.create({
      data: {
        playbookInstanceId: instanceId,
        taskId: task.id,
        status: 'pending',
        startedAt: new Date()
      }
    });

    // Log task preparation
    console.log(\`✅ Task \${task.name} prepared and ready for execution\`);
  }

  async executeTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(\`🚀 Orchestrating task execution for task \${context.taskId}\`);

    try {
      // Get task details
      const task = await prisma.task.findUnique({
        where: { id: context.taskId },
        include: { role: true }
      });

      if (!task) {
        throw new Error(\`Task \${context.taskId} not found\`);
      }

      // Update task instance to 'in_progress'
      await prisma.taskInstance.updateMany({
        where: { 
          playbookInstanceId: context.instanceId,
          taskId: context.taskId,
          status: 'pending'
        },
        data: { 
          status: 'in_progress',
          startedAt: new Date()
        }
      });

      // Execute based on task type
      let result: TaskExecutionResult;

      switch (task.executionType) {
        case 'algorithmic':
          result = await this.taskExecutionService.executeAlgorithmicTask(context);
          break;
        case 'ai_agent':
          result = await this.taskExecutionService.executeAIAgentTask(context);
          break;
        case 'human':
        case 'human_creative':
          result = await this.taskExecutionService.executeHumanTask(context);
          break;
        default:
          throw new Error(\`Unknown execution type: \${task.executionType}\`);
      }

      // Update task instance with result
      const finalStatus = result.success ? 'completed' : 'failed';
      await prisma.taskInstance.updateMany({
        where: { 
          playbookInstanceId: context.instanceId,
          taskId: context.taskId,
          status: 'in_progress'
        },
        data: { 
          status: finalStatus,
          outputDataJson: JSON.stringify(result.outputData),
          notes: result.notes,
          completedAt: new Date()
        }
      });

      // Add task metadata to result
      result.outputData._taskMeta = {
        taskId: task.id,
        taskName: task.name,
        executionType: task.executionType,
        roleName: task.role?.name,
        completedAt: new Date().toISOString()
      };

      console.log(\`✅ Task \${task.name} executed \${result.success ? 'successfully' : 'with errors'}\`);
      return result;

    } catch (error) {
      console.error(\`❌ Error orchestrating task execution:\`, error);
      
      // Update task instance to failed
      await prisma.taskInstance.updateMany({
        where: { 
          playbookInstanceId: context.instanceId,
          taskId: context.taskId,
          status: 'in_progress'
        },
        data: { 
          status: 'failed',
          notes: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });

      throw error;
    }
  }

  async getNextTask(instanceId: number, currentStep: number): Promise<any> {
    const instance = await prisma.playbookInstance.findUnique({
      where: { id: instanceId },
      include: { 
        playbook: { 
          include: { 
            tasks: { orderBy: { orderIndex: 'asc' } }
          } 
        } 
      }
    });

    if (!instance) {
      throw new Error(\`Instance \${instanceId} not found\`);
    }

    const nextTaskIndex = currentStep;
    if (nextTaskIndex >= instance.playbook.tasks.length) {
      return null; // No more tasks
    }

    return instance.playbook.tasks[nextTaskIndex];
  }

  async canExecuteTask(instanceId: number, taskId: number): Promise<{ canExecute: boolean; reason?: string }> {
    // Check if all prerequisite tasks are completed
    const instance = await prisma.playbookInstance.findUnique({
      where: { id: instanceId },
      include: { 
        playbook: { 
          include: { tasks: { orderBy: { orderIndex: 'asc' } } }
        },
        taskInstances: true
      }
    });

    if (!instance) {
      return { canExecute: false, reason: 'Instance not found' };
    }

    const task = instance.playbook.tasks.find(t => t.id === taskId);
    if (!task) {
      return { canExecute: false, reason: 'Task not found in playbook' };
    }

    // Check if this is the current task in sequence
    const currentTaskIndex = instance.playbook.tasks.findIndex(t => t.id === taskId);
    if (currentTaskIndex !== instance.currentStep) {
      return { 
        canExecute: false, 
        reason: \`Task is not the current step. Expected step \${instance.currentStep}, but task is at step \${currentTaskIndex}\`
      };
    }

    // Check if instance is in correct state
    if (instance.status === 'completed') {
      return { canExecute: false, reason: 'Process is already completed' };
    }

    if (instance.status === 'paused') {
      return { canExecute: false, reason: 'Process is paused' };
    }

    return { canExecute: true };
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/services/workflow-orchestrator.ts'),
      serviceCode,
      'utf-8'
    );
  }

  private async generateValidationService(analysisResult: AnalysisResult): Promise<void> {
    const serviceCode = `
import { ValidationResult } from '../../types/runtime-types';

export class ValidationService {
  
  async validateProcessData(data: Record<string, any>, rules: any[]): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const rule of rules) {
      try {
        const result = await this.applyValidationRule(data, rule);
        if (!result.isValid) {
          if (result.severity === 'error') {
            errors.push(...result.errors);
          } else {
            warnings.push(...result.errors);
          }
        }
      } catch (error) {
        errors.push({
          field: 'validation',
          message: \`Validation rule failed: \${error instanceof Error ? error.message : 'Unknown error'}\`,
          code: 'VALIDATION_RULE_ERROR'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateBusinessConstraints(data: Record<string, any>, constraints: any[]): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const constraint of constraints) {
      const isValid = await this.checkBusinessConstraint(data, constraint);
      if (!isValid) {
        const error = {
          field: constraint.field || 'general',
          message: constraint.message || 'Business constraint violation',
          code: constraint.code || 'CONSTRAINT_VIOLATION'
        };

        if (constraint.severity === 'warning') {
          warnings.push(error);
        } else {
          errors.push(error);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateDataIntegrity(data: Record<string, any>): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for common data integrity issues
    
    // Check for null/undefined in required contexts
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        warnings.push({
          field: key,
          message: \`Field '\${key}' is null or undefined\`,
          code: 'NULL_VALUE'
        });
      }
    }

    // Check for data type consistency
    if (data.clientName && typeof data.clientName !== 'string') {
      errors.push({
        field: 'clientName',
        message: 'Client name must be a string',
        code: 'INVALID_TYPE'
      });
    }

    // Check for email format if email fields are present
    const emailFields = ['email', 'contactEmail', 'clientEmail'];
    for (const field of emailFields) {
      if (data[field] && !this.isValidEmail(data[field])) {
        errors.push({
          field,
          message: \`Invalid email format in field '\${field}'\`,
          code: 'INVALID_EMAIL'
        });
      }
    }

    // Check for phone format if phone fields are present
    const phoneFields = ['phone', 'contactPhone', 'clientPhone'];
    for (const field of phoneFields) {
      if (data[field] && !this.isValidPhone(data[field])) {
        warnings.push({
          field,
          message: \`Invalid phone format in field '\${field}'\`,
          code: 'INVALID_PHONE'
        });
      }
    }

    // Check for date validity
    const dateFields = ['startDate', 'endDate', 'dueDate', 'scheduledDate'];
    for (const field of dateFields) {
      if (data[field] && !this.isValidDate(data[field])) {
        errors.push({
          field,
          message: \`Invalid date format in field '\${field}'\`,
          code: 'INVALID_DATE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async applyValidationRule(data: Record<string, any>, rule: any): Promise<{ isValid: boolean; errors: any[]; severity: string }> {
    const errors: any[] = [];
    
    switch (rule.type) {
      case 'required':
        if (!data[rule.field] || data[rule.field] === '') {
          errors.push({
            field: rule.field,
            message: rule.message || \`Field '\${rule.field}' is required\`,
            code: 'REQUIRED_FIELD'
          });
        }
        break;

      case 'format':
        if (data[rule.field] && !new RegExp(rule.pattern).test(data[rule.field])) {
          errors.push({
            field: rule.field,
            message: rule.message || \`Field '\${rule.field}' has invalid format\`,
            code: 'INVALID_FORMAT'
          });
        }
        break;

      case 'range':
        const value = Number(data[rule.field]);
        if (!isNaN(value)) {
          if (rule.min !== undefined && value < rule.min) {
            errors.push({
              field: rule.field,
              message: rule.message || \`Field '\${rule.field}' must be at least \${rule.min}\`,
              code: 'VALUE_TOO_LOW'
            });
          }
          if (rule.max !== undefined && value > rule.max) {
            errors.push({
              field: rule.field,
              message: rule.message || \`Field '\${rule.field}' must be at most \${rule.max}\`,
              code: 'VALUE_TOO_HIGH'
            });
          }
        }
        break;

      case 'dependency':
        if (data[rule.field] && rule.dependsOn) {
          for (const dependency of rule.dependsOn) {
            if (!data[dependency] || data[dependency] === '') {
              errors.push({
                field: rule.field,
                message: rule.message || \`Field '\${rule.field}' requires '\${dependency}' to be set\`,
                code: 'DEPENDENCY_NOT_MET'
              });
            }
          }
        }
        break;

      case 'conflict':
        if (data[rule.field] && rule.conflictsWith) {
          for (const conflict of rule.conflictsWith) {
            if (data[conflict] && data[conflict] !== '') {
              errors.push({
                field: rule.field,
                message: rule.message || \`Field '\${rule.field}' conflicts with '\${conflict}'\`,
                code: 'FIELD_CONFLICT'
              });
            }
          }
        }
        break;

      case 'custom':
        // Execute custom validation function
        if (rule.validator) {
          try {
            const isValid = await this.executeCustomValidator(data, rule.validator);
            if (!isValid) {
              errors.push({
                field: rule.field || 'custom',
                message: rule.message || 'Custom validation failed',
                code: 'CUSTOM_VALIDATION_FAILED'
              });
            }
          } catch (error) {
            errors.push({
              field: rule.field || 'custom',
              message: \`Custom validation error: \${error instanceof Error ? error.message : 'Unknown error'}\`,
              code: 'CUSTOM_VALIDATION_ERROR'
            });
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      severity: rule.severity || 'error'
    };
  }

  private async checkBusinessConstraint(data: Record<string, any>, constraint: any): Promise<boolean> {
    switch (constraint.type) {
      case 'budget_limit':
        const totalBudget = this.calculateTotalBudget(data);
        return totalBudget <= (constraint.limit || Infinity);

      case 'timeline_constraint':
        return this.validateTimeline(data, constraint);

      case 'resource_availability':
        return this.checkResourceAvailability(data, constraint);

      case 'compliance_check':
        return this.validateCompliance(data, constraint);

      default:
        return true;
    }
  }

  private calculateTotalBudget(data: Record<string, any>): number {
    const budgetFields = ['budget', 'totalCost', 'estimatedCost', 'price'];
    return budgetFields.reduce((total, field) => {
      const value = Number(data[field]);
      return total + (isNaN(value) ? 0 : value);
    }, 0);
  }

  private validateTimeline(data: Record<string, any>, constraint: any): boolean {
    if (!data.startDate || !data.endDate) return true;

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const duration = end.getTime() - start.getTime();
    const durationDays = duration / (1000 * 60 * 60 * 24);

    if (constraint.maxDuration && durationDays > constraint.maxDuration) {
      return false;
    }

    if (constraint.minDuration && durationDays < constraint.minDuration) {
      return false;
    }

    return true;
  }

  private checkResourceAvailability(data: Record<string, any>, constraint: any): boolean {
    // Simplified resource availability check
    const requiredResources = constraint.requiredResources || [];
    const availableResources = data.availableResources || [];

    return requiredResources.every((required: string) => 
      availableResources.includes(required)
    );
  }

  private validateCompliance(data: Record<string, any>, constraint: any): boolean {
    const complianceRules = constraint.rules || [];
    
    return complianceRules.every((rule: any) => {
      switch (rule.type) {
        case 'data_privacy':
          return this.checkDataPrivacyCompliance(data, rule);
        case 'financial_regulation':
          return this.checkFinancialCompliance(data, rule);
        case 'industry_standard':
          return this.checkIndustryCompliance(data, rule);
        default:
          return true;
      }
    });
  }

  private checkDataPrivacyCompliance(data: Record<string, any>, rule: any): boolean {
    // Check for PII handling compliance
    const piiFields = ['ssn', 'socialSecurityNumber', 'driversLicense', 'passport'];
    
    for (const field of piiFields) {
      if (data[field] && !data[\`\${field}_consent\`]) {
        return false; // PII without consent
      }
    }

    return true;
  }

  private checkFinancialCompliance(data: Record<string, any>, rule: any): boolean {
    // Check for financial regulation compliance
    if (data.transactionAmount && data.transactionAmount > 10000) {
      return data.reportingCompliance === true;
    }

    return true;
  }

  private checkIndustryCompliance(data: Record<string, any>, rule: any): boolean {
    // Check for industry-specific compliance
    const industry = rule.industry || 'general';
    
    switch (industry) {
      case 'healthcare':
        return data.hipaaCompliance === true;
      case 'finance':
        return data.soxCompliance === true;
      case 'photography':
        return data.copyrightAgreement === true;
      default:
        return true;
    }
  }

  private async executeCustomValidator(data: Record<string, any>, validator: string): Promise<boolean> {
    // In a real implementation, this would safely execute custom validation code
    // For now, return true to avoid execution risks
    console.log(\`Custom validator would execute: \${validator}\`);
    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,}$/;
    return phoneRegex.test(phone);
  }

  private isValidDate(date: string): boolean {
    return !isNaN(Date.parse(date));
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/services/validation-service.ts'),
      serviceCode,
      'utf-8'
    );
  }

  private async generateStateManager(analysisResult: AnalysisResult): Promise<void> {
    const serviceCode = `
import { prisma } from '../lib/prisma';

export interface StateTransitionRequest {
  instanceId: number;
  instanceType: 'playbook' | 'task';
  fromStatus: string | null;
  toStatus: string;
  notes?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export class StateManager {
  
  async recordTransition(request: StateTransitionRequest): Promise<void> {
    try {
      // Get current status if not provided
      let fromStatus = request.fromStatus;
      if (!fromStatus) {
        fromStatus = await this.getCurrentStatus(request.instanceId, request.instanceType);
      }

      // Create state transition record
      await prisma.stateTransition.create({
        data: {
          instanceId: request.instanceId,
          instanceType: request.instanceType,
          fromStatus,
          toStatus: request.toStatus,
          notes: request.notes || '',
          metadataJson: request.metadata ? JSON.stringify(request.metadata) : null,
          userId: request.userId || null
        }
      });

      console.log(\`📊 State transition recorded: \${request.instanceType} \${request.instanceId} \${fromStatus} → \${request.toStatus}\`);

    } catch (error) {
      console.error('❌ Error recording state transition:', error);
      // Don't throw - state transitions are for auditing, shouldn't break the process
    }
  }

  async getTransitionHistory(instanceId: number, instanceType: 'playbook' | 'task'): Promise<any[]> {
    return await prisma.stateTransition.findMany({
      where: {
        instanceId,
        instanceType
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getProcessTimeline(instanceId: number): Promise<any> {
    const transitions = await prisma.stateTransition.findMany({
      where: {
        instanceId,
        instanceType: 'playbook'
      },
      orderBy: { createdAt: 'asc' }
    });

    const taskTransitions = await prisma.stateTransition.findMany({
      where: {
        instanceType: 'task'
      },
      include: {
        taskInstance: {
          where: { playbookInstanceId: instanceId }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return {
      processTransitions: transitions,
      taskTransitions: taskTransitions.filter(t => t.taskInstance),
      timeline: [...transitions, ...taskTransitions].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )
    };
  }

  async getCurrentStatus(instanceId: number, instanceType: 'playbook' | 'task'): Promise<string | null> {
    if (instanceType === 'playbook') {
      const instance = await prisma.playbookInstance.findUnique({
        where: { id: instanceId },
        select: { status: true }
      });
      return instance?.status || null;
    } else {
      const taskInstance = await prisma.taskInstance.findFirst({
        where: { id: instanceId },
        select: { status: true }
      });
      return taskInstance?.status || null;
    }
  }

  async getProcessStatistics(instanceId?: number): Promise<any> {
    const where = instanceId ? { playbookInstanceId: instanceId } : {};

    const [totalProcesses, activeProcesses, completedProcesses, failedProcesses] = await Promise.all([
      prisma.playbookInstance.count(),
      prisma.playbookInstance.count({ where: { status: 'in_progress' } }),
      prisma.playbookInstance.count({ where: { status: 'completed' } }),
      prisma.playbookInstance.count({ where: { status: 'failed' } })
    ]);

    const avgCompletionTime = await this.calculateAverageCompletionTime();
    const successRate = totalProcesses > 0 ? (completedProcesses / totalProcesses) * 100 : 0;

    return {
      totalProcesses,
      activeProcesses,
      completedProcesses,
      failedProcesses,
      averageCompletionTime: avgCompletionTime,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  async identifyBottlenecks(): Promise<any[]> {
    // Identify tasks that take longer than average
    const taskDurations = await prisma.$queryRaw\`
      SELECT 
        t.name,
        t.id,
        AVG(EXTRACT(EPOCH FROM (ti.completed_at - ti.started_at))) as avg_duration_seconds,
        COUNT(*) as execution_count
      FROM task_instances ti
      JOIN tasks t ON ti.task_id = t.id
      WHERE ti.completed_at IS NOT NULL AND ti.started_at IS NOT NULL
      GROUP BY t.id, t.name
      HAVING COUNT(*) >= 3
      ORDER BY avg_duration_seconds DESC
    \`;

    return (taskDurations as any[]).map(task => ({
      taskId: task.id,
      taskName: task.name,
      averageDuration: Math.round(task.avg_duration_seconds),
      executionCount: task.execution_count,
      isBottleneck: task.avg_duration_seconds > 300 // More than 5 minutes
    }));
  }

  async generateInsights(instanceId?: number): Promise<any> {
    const statistics = await this.getProcessStatistics(instanceId);
    const bottlenecks = await this.identifyBottlenecks();

    const insights = {
      performance: {
        overallHealth: this.assessOverallHealth(statistics),
        recommendations: this.generateRecommendations(statistics, bottlenecks)
      },
      trends: {
        completionRate: statistics.successRate,
        averageTime: statistics.averageCompletionTime,
        bottleneckTasks: bottlenecks.filter(b => b.isBottleneck).length
      },
      alerts: this.generateAlerts(statistics, bottlenecks)
    };

    return insights;
  }

  private async calculateAverageCompletionTime(): Promise<number> {
    const completedProcesses = await prisma.playbookInstance.findMany({
      where: { 
        status: 'completed',
        completedAt: { not: null }
      },
      select: { startedAt: true, completedAt: true }
    });

    if (completedProcesses.length === 0) return 0;

    const totalDuration = completedProcesses.reduce((sum, process) => {
      if (process.completedAt) {
        return sum + (process.completedAt.getTime() - process.startedAt.getTime());
      }
      return sum;
    }, 0);

    return Math.round(totalDuration / completedProcesses.length / 1000 / 60); // Average in minutes
  }

  private assessOverallHealth(statistics: any): 'excellent' | 'good' | 'fair' | 'poor' {
    const successRate = statistics.successRate;
    const activeRate = statistics.totalProcesses > 0 ? 
      (statistics.activeProcesses / statistics.totalProcesses) * 100 : 0;

    if (successRate >= 95 && activeRate < 20) return 'excellent';
    if (successRate >= 90 && activeRate < 30) return 'good';
    if (successRate >= 80 && activeRate < 50) return 'fair';
    return 'poor';
  }

  private generateRecommendations(statistics: any, bottlenecks: any[]): string[] {
    const recommendations: string[] = [];

    if (statistics.successRate < 90) {
      recommendations.push('Review failed processes to identify common failure patterns');
    }

    if (statistics.averageCompletionTime > 480) { // More than 8 hours
      recommendations.push('Consider optimizing process workflows to reduce completion time');
    }

    if (bottlenecks.length > 0) {
      recommendations.push(\`Address bottleneck tasks: \${bottlenecks.slice(0, 3).map(b => b.taskName).join(', ')}\`);
    }

    if (statistics.activeProcesses > statistics.totalProcesses * 0.5) {
      recommendations.push('High number of active processes - consider resource allocation');
    }

    return recommendations;
  }

  private generateAlerts(statistics: any, bottlenecks: any[]): any[] {
    const alerts: any[] = [];

    if (statistics.successRate < 80) {
      alerts.push({
        level: 'high',
        message: \`Low success rate: \${statistics.successRate}%\`,
        action: 'Review and address failing processes'
      });
    }

    if (statistics.failedProcesses > 5) {
      alerts.push({
        level: 'medium',
        message: \`\${statistics.failedProcesses} failed processes detected\`,
        action: 'Investigate failure patterns'
      });
    }

    const criticalBottlenecks = bottlenecks.filter(b => b.averageDuration > 1800); // More than 30 minutes
    if (criticalBottlenecks.length > 0) {
      alerts.push({
        level: 'medium',
        message: \`\${criticalBottlenecks.length} critical bottlenecks identified\`,
        action: 'Optimize long-running tasks'
      });
    }

    return alerts;
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/services/state-manager.ts'),
      serviceCode,
      'utf-8'
    );
  }

  private async generateClientFolderService(analysisResult: AnalysisResult): Promise<void> {
    const serviceCode = `
import { promises as fs } from 'fs';
import path from 'path';
import { ProcessState, ClientFolder, ClientFolderService } from '../../types/runtime-types';
import { prisma } from '../lib/prisma';

export class ClientFolderServiceImpl implements ClientFolderService {
  private basePath: string;

  constructor() {
    this.basePath = process.env.CLIENT_FOLDER_PATH || './clients';
  }

  async createClientFolder(processState: ProcessState): Promise<string> {
    const folderName = this.generateFolderName(processState);
    const folderPath = path.join(this.basePath, folderName);

    console.log(\`📁 Creating client folder: \${folderPath}\`);

    try {
      // Create main folder structure
      await fs.mkdir(folderPath, { recursive: true });
      await fs.mkdir(path.join(folderPath, 'documents'), { recursive: true });
      await fs.mkdir(path.join(folderPath, 'communications'), { recursive: true });
      await fs.mkdir(path.join(folderPath, 'assets'), { recursive: true });

      // Create initial metadata file
      const metadata = {
        processInstanceId: processState.instanceId,
        clientName: processState.clientName,
        playbookName: await this.getPlaybookName(processState.playbookId),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        status: processState.status
      };

      await fs.writeFile(
        path.join(folderPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );

      // Create initial process log
      await this.createInitialProcessLog(folderPath, processState);

      // Create README for the client
      await this.createClientReadme(folderPath, processState);

      console.log(\`✅ Client folder created successfully: \${folderPath}\`);
      return folderPath;

    } catch (error) {
      console.error('❌ Error creating client folder:', error);
      throw error;
    }
  }

  async updateProcessLog(instanceId: number): Promise<void> {
    try {
      const instance = await prisma.playbookInstance.findUnique({
        where: { id: instanceId },
        include: {
          playbook: { include: { team: true } },
          taskInstances: {
            include: { task: true },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!instance || !instance.clientFolderPath) {
        return;
      }

      const logPath = path.join(instance.clientFolderPath, 'process-log.md');
      const logContent = await this.generateProcessLogContent(instance);

      await fs.writeFile(logPath, logContent, 'utf-8');
      
      // Update metadata
      await this.updateMetadata(instance.clientFolderPath, {
        lastUpdated: new Date().toISOString(),
        status: instance.status,
        currentStep: instance.currentStep,
        totalSteps: instance.playbook ? await this.getTaskCount(instance.playbook.id) : 0
      });

      console.log(\`📝 Process log updated for instance \${instanceId}\`);

    } catch (error) {
      console.error('❌ Error updating process log:', error);
    }
  }

  async saveDocument(instanceId: number, filename: string, content: string | Buffer): Promise<void> {
    try {
      const instance = await prisma.playbookInstance.findUnique({
        where: { id: instanceId },
        select: { clientFolderPath: true }
      });

      if (!instance?.clientFolderPath) {
        throw new Error(\`Client folder not found for instance \${instanceId}\`);
      }

      const documentPath = path.join(instance.clientFolderPath, 'documents', filename);
      
      if (typeof content === 'string') {
        await fs.writeFile(documentPath, content, 'utf-8');
      } else {
        await fs.writeFile(documentPath, content);
      }

      // Log document creation
      await this.logDocumentCreation(instance.clientFolderPath, filename);

      console.log(\`💾 Document saved: \${filename}\`);

    } catch (error) {
      console.error('❌ Error saving document:', error);
      throw error;
    }
  }

  async getClientFolder(instanceId: number): Promise<ClientFolder> {
    const instance = await prisma.playbookInstance.findUnique({
      where: { id: instanceId },
      select: { clientFolderPath: true, clientName: true }
    });

    if (!instance?.clientFolderPath) {
      throw new Error(\`Client folder not found for instance \${instanceId}\`);
    }

    const folderPath = instance.clientFolderPath;

    // Read metadata
    const metadataPath = path.join(folderPath, 'metadata.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Read process log
    const logPath = path.join(folderPath, 'process-log.md');
    const processLog = await fs.readFile(logPath, 'utf-8');

    // Get documents
    const documentsDir = path.join(folderPath, 'documents');
    const documentFiles = await fs.readdir(documentsDir);
    
    const documents = await Promise.all(
      documentFiles.map(async (filename) => {
        const filePath = path.join(documentsDir, filename);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath);
        
        return {
          filename,
          content,
          type: this.getFileType(filename),
          createdAt: stats.birthtime,
          updatedAt: stats.mtime
        };
      })
    );

    return {
      path: folderPath,
      processLog,
      documents,
      metadata
    };
  }

  async archiveClientFolder(instanceId: number): Promise<string> {
    try {
      const instance = await prisma.playbookInstance.findUnique({
        where: { id: instanceId },
        select: { clientFolderPath: true, clientName: true }
      });

      if (!instance?.clientFolderPath) {
        throw new Error(\`Client folder not found for instance \${instanceId}\`);
      }

      const archivePath = \`\${instance.clientFolderPath}_archived_\${Date.now()}\`;
      
      // Move folder to archived location
      await fs.rename(instance.clientFolderPath, archivePath);

      // Update process instance to remove folder path
      await prisma.playbookInstance.update({
        where: { id: instanceId },
        data: { clientFolderPath: null }
      });

      console.log(\`🗄️  Client folder archived: \${archivePath}\`);
      return archivePath;

    } catch (error) {
      console.error('❌ Error archiving client folder:', error);
      throw error;
    }
  }

  private generateFolderName(processState: ProcessState): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const clientName = (processState.clientName || 'unnamed')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return \`\${timestamp}_\${clientName}_\${processState.instanceId}\`;
  }

  private async getPlaybookName(playbookId: number): Promise<string> {
    const playbook = await prisma.playbook.findUnique({
      where: { id: playbookId },
      select: { name: true }
    });
    return playbook?.name || 'Unknown Playbook';
  }

  private async getTaskCount(playbookId: number): Promise<number> {
    return await prisma.task.count({
      where: { playbookId }
    });
  }

  private async createInitialProcessLog(folderPath: string, processState: ProcessState): Promise<void> {
    const playbookName = await this.getPlaybookName(processState.playbookId);
    
    const logContent = \`# Process Log: \${processState.clientName || 'Unnamed Client'}

## Process Information
- **Playbook**: \${playbookName}
- **Process ID**: \${processState.instanceId}
- **Started**: \${new Date().toLocaleString()}
- **Status**: \${processState.status}

## Process Timeline

### \${new Date().toLocaleString()} - Process Started
- Process initiated
- Client folder created
- Initial data: \${JSON.stringify(processState.data, null, 2)}

---

*This log is automatically updated as the process progresses.*
\`;

    await fs.writeFile(
      path.join(folderPath, 'process-log.md'),
      logContent,
      'utf-8'
    );
  }

  private async createClientReadme(folderPath: string, processState: ProcessState): Promise<void> {
    const playbookName = await this.getPlaybookName(processState.playbookId);
    
    const readmeContent = \`# Client Files: \${processState.clientName || 'Unnamed Client'}

This folder contains all files and documents related to your business process.

## Folder Structure

- **documents/** - Generated documents and deliverables
- **communications/** - Email correspondence and meeting notes  
- **assets/** - Images, files, and other assets
- **metadata.json** - Process metadata (do not modify)
- **process-log.md** - Detailed process timeline and notes

## Process Information

- **Process Type**: \${playbookName}
- **Process ID**: \${processState.instanceId}
- **Started**: \${new Date().toLocaleString()}

## How to Use This Folder

1. All process-related documents will appear in the **documents/** folder
2. You can add your own files to the **assets/** folder
3. Check **process-log.md** for updates on process progress
4. Do not modify **metadata.json** as it's used by the system

## Questions?

If you have questions about your process or need assistance, please contact us.

---
*Generated by BUSY Runtime System*
\`;

    await fs.writeFile(
      path.join(folderPath, 'README.md'),
      readmeContent,
      'utf-8'
    );
  }

  private async generateProcessLogContent(instance: any): Promise<string> {
    const playbookName = instance.playbook?.name || 'Unknown Playbook';
    const teamName = instance.playbook?.team?.name || 'Unknown Team';
    
    let logContent = \`# Process Log: \${instance.clientName || 'Unnamed Client'}

## Process Information
- **Playbook**: \${playbookName}
- **Team**: \${teamName}
- **Process ID**: \${instance.id}
- **Started**: \${instance.startedAt.toLocaleString()}
- **Status**: \${instance.status}
- **Current Step**: \${instance.currentStep + 1}

## Process Timeline

\`;

    // Add task completion entries
    for (const taskInstance of instance.taskInstances) {
      const completedAt = taskInstance.completedAt ? taskInstance.completedAt.toLocaleString() : 'In Progress';
      const status = taskInstance.status;
      
      logContent += \`### \${taskInstance.startedAt.toLocaleString()} - \${taskInstance.task.name}
- **Status**: \${status}
- **Type**: \${taskInstance.task.executionType}
\`;

      if (taskInstance.completedAt) {
        logContent += \`- **Completed**: \${completedAt}
\`;
      }

      if (taskInstance.notes) {
        logContent += \`- **Notes**: \${taskInstance.notes}
\`;
      }

      if (taskInstance.outputDataJson) {
        const outputData = JSON.parse(taskInstance.outputDataJson);
        logContent += \`- **Output**: \${JSON.stringify(outputData, null, 2)}
\`;
      }

      logContent += \`
\`;
    }

    if (instance.status === 'completed') {
      logContent += \`### \${instance.completedAt?.toLocaleString()} - Process Completed
- All tasks have been completed successfully
- Process archived and ready for delivery

\`;
    }

    logContent += \`---

*This log is automatically updated as the process progresses.*
\`;

    return logContent;
  }

  private async updateMetadata(folderPath: string, updates: any): Promise<void> {
    const metadataPath = path.join(folderPath, 'metadata.json');
    
    try {
      const currentMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      const updatedMetadata = { ...currentMetadata, ...updates };
      
      await fs.writeFile(
        metadataPath,
        JSON.stringify(updatedMetadata, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('❌ Error updating metadata:', error);
    }
  }

  private async logDocumentCreation(folderPath: string, filename: string): Promise<void> {
    const logPath = path.join(folderPath, 'process-log.md');
    
    try {
      const currentLog = await fs.readFile(logPath, 'utf-8');
      const newEntry = \`### \${new Date().toLocaleString()} - Document Created
- **File**: \${filename}
- **Location**: documents/\${filename}

\`;

      // Insert before the final "---" line
      const updatedLog = currentLog.replace(
        /---\\s*\\*This log is automatically updated/,
        \`\${newEntry}---

*This log is automatically updated\`
      );

      await fs.writeFile(logPath, updatedLog, 'utf-8');
    } catch (error) {
      console.error('❌ Error logging document creation:', error);
    }
  }

  private getFileType(filename: string): 'text' | 'json' | 'pdf' | 'image' | 'other' {
    const ext = path.extname(filename).toLowerCase();
    
    if (['.txt', '.md', '.csv'].includes(ext)) return 'text';
    if (['.json'].includes(ext)) return 'json';
    if (['.pdf'].includes(ext)) return 'pdf';
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) return 'image';
    
    return 'other';
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/services/client-folder-service.ts'),
      serviceCode,
      'utf-8'
    );
  }
}