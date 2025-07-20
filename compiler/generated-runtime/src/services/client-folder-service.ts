
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

    console.log(`📁 Creating client folder: ${folderPath}`);

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

      console.log(`✅ Client folder created successfully: ${folderPath}`);
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

      console.log(`📝 Process log updated for instance ${instanceId}`);

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
        throw new Error(`Client folder not found for instance ${instanceId}`);
      }

      const documentPath = path.join(instance.clientFolderPath, 'documents', filename);
      
      if (typeof content === 'string') {
        await fs.writeFile(documentPath, content, 'utf-8');
      } else {
        await fs.writeFile(documentPath, content);
      }

      // Log document creation
      await this.logDocumentCreation(instance.clientFolderPath, filename);

      console.log(`💾 Document saved: ${filename}`);

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
      throw new Error(`Client folder not found for instance ${instanceId}`);
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
        throw new Error(`Client folder not found for instance ${instanceId}`);
      }

      const archivePath = `${instance.clientFolderPath}_archived_${Date.now()}`;
      
      // Move folder to archived location
      await fs.rename(instance.clientFolderPath, archivePath);

      // Update process instance to remove folder path
      await prisma.playbookInstance.update({
        where: { id: instanceId },
        data: { clientFolderPath: null }
      });

      console.log(`🗄️  Client folder archived: ${archivePath}`);
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
    
    return `${timestamp}_${clientName}_${processState.instanceId}`;
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
    
    const logContent = `# Process Log: ${processState.clientName || 'Unnamed Client'}

## Process Information
- **Playbook**: ${playbookName}
- **Process ID**: ${processState.instanceId}
- **Started**: ${new Date().toLocaleString()}
- **Status**: ${processState.status}

## Process Timeline

### ${new Date().toLocaleString()} - Process Started
- Process initiated
- Client folder created
- Initial data: ${JSON.stringify(processState.data, null, 2)}

---

*This log is automatically updated as the process progresses.*
`;

    await fs.writeFile(
      path.join(folderPath, 'process-log.md'),
      logContent,
      'utf-8'
    );
  }

  private async createClientReadme(folderPath: string, processState: ProcessState): Promise<void> {
    const playbookName = await this.getPlaybookName(processState.playbookId);
    
    const readmeContent = `# Client Files: ${processState.clientName || 'Unnamed Client'}

This folder contains all files and documents related to your business process.

## Folder Structure

- **documents/** - Generated documents and deliverables
- **communications/** - Email correspondence and meeting notes  
- **assets/** - Images, files, and other assets
- **metadata.json** - Process metadata (do not modify)
- **process-log.md** - Detailed process timeline and notes

## Process Information

- **Process Type**: ${playbookName}
- **Process ID**: ${processState.instanceId}
- **Started**: ${new Date().toLocaleString()}

## How to Use This Folder

1. All process-related documents will appear in the **documents/** folder
2. You can add your own files to the **assets/** folder
3. Check **process-log.md** for updates on process progress
4. Do not modify **metadata.json** as it's used by the system

## Questions?

If you have questions about your process or need assistance, please contact us.

---
*Generated by BUSY Runtime System*
`;

    await fs.writeFile(
      path.join(folderPath, 'README.md'),
      readmeContent,
      'utf-8'
    );
  }

  private async generateProcessLogContent(instance: any): Promise<string> {
    const playbookName = instance.playbook?.name || 'Unknown Playbook';
    const teamName = instance.playbook?.team?.name || 'Unknown Team';
    
    let logContent = `# Process Log: ${instance.clientName || 'Unnamed Client'}

## Process Information
- **Playbook**: ${playbookName}
- **Team**: ${teamName}
- **Process ID**: ${instance.id}
- **Started**: ${instance.startedAt.toLocaleString()}
- **Status**: ${instance.status}
- **Current Step**: ${instance.currentStep + 1}

## Process Timeline

`;

    // Add task completion entries
    for (const taskInstance of instance.taskInstances) {
      const completedAt = taskInstance.completedAt ? taskInstance.completedAt.toLocaleString() : 'In Progress';
      const status = taskInstance.status;
      
      logContent += `### ${taskInstance.startedAt.toLocaleString()} - ${taskInstance.task.name}
- **Status**: ${status}
- **Type**: ${taskInstance.task.executionType}
`;

      if (taskInstance.completedAt) {
        logContent += `- **Completed**: ${completedAt}
`;
      }

      if (taskInstance.notes) {
        logContent += `- **Notes**: ${taskInstance.notes}
`;
      }

      if (taskInstance.outputDataJson) {
        const outputData = JSON.parse(taskInstance.outputDataJson);
        logContent += `- **Output**: ${JSON.stringify(outputData, null, 2)}
`;
      }

      logContent += `
`;
    }

    if (instance.status === 'completed') {
      logContent += `### ${instance.completedAt?.toLocaleString()} - Process Completed
- All tasks have been completed successfully
- Process archived and ready for delivery

`;
    }

    logContent += `---

*This log is automatically updated as the process progresses.*
`;

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
      const newEntry = `### ${new Date().toLocaleString()} - Document Created
- **File**: ${filename}
- **Location**: documents/${filename}

`;

      // Insert before the final "---" line
      const updatedLog = currentLog.replace(
        /---\s*\*This log is automatically updated/,
        `${newEntry}---

*This log is automatically updated`
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
