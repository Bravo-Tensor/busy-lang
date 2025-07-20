
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
            message: `Initial field '${field}' is required`,
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
    console.log(`🔧 Preparing task ${task.name} for instance ${instanceId}`);

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
    console.log(`✅ Task ${task.name} prepared and ready for execution`);
  }

  async executeTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(`🚀 Orchestrating task execution for task ${context.taskId}`);

    try {
      // Get task details
      const task = await prisma.task.findUnique({
        where: { id: context.taskId },
        include: { role: true }
      });

      if (!task) {
        throw new Error(`Task ${context.taskId} not found`);
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
          throw new Error(`Unknown execution type: ${task.executionType}`);
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

      console.log(`✅ Task ${task.name} executed ${result.success ? 'successfully' : 'with errors'}`);
      return result;

    } catch (error) {
      console.error(`❌ Error orchestrating task execution:`, error);
      
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
      throw new Error(`Instance ${instanceId} not found`);
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
        reason: `Task is not the current step. Expected step ${instance.currentStep}, but task is at step ${currentTaskIndex}`
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
