
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
    console.log(`🚀 Starting playbook ${playbookId} with data:`, initialData);

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
        throw new Error(`Playbook ${playbookId} not found`);
      }

      // Validate initial data against playbook requirements
      const validationResult = await this.orchestrator.validateInitialData(playbook, initialData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid initial data: ${validationResult.errors.join(', ')}`);
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
        notes: `Started playbook: ${playbook.name}`,
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

      console.log(`✅ Playbook started successfully. Instance ID: ${instance.id}`);
      return processState;

    } catch (error) {
      console.error('❌ Error starting playbook:', error);
      throw error;
    }
  }

  async executeCurrentStep(instanceId: number, outputData: Record<string, any>): Promise<TaskExecutionResult> {
    console.log(`🔄 Executing step for instance ${instanceId}`);

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
        throw new Error(`Process instance ${instanceId} not found`);
      }

      if (instance.status === 'completed') {
        throw new Error('Process is already completed');
      }

      const currentTask = instance.playbook.tasks[instance.currentStep];
      if (!currentTask) {
        throw new Error(`No task found at step ${instance.currentStep}`);
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
        throw new Error(`Task execution failed: ${executionResult.errors?.join(', ')}`);
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
      processData[`step_${instance.currentStep}`] = executionResult.outputData;

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
        notes: `Completed task: ${currentTask.name}`,
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

      console.log(`✅ Step executed successfully. ${isComplete ? 'Process completed!' : `Next step: ${nextStep}`}`);

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
        notes: `Error executing step: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      throw new Error(`Process instance ${instanceId} not found`);
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
