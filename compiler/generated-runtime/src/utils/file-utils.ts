
import { promises as fs } from 'fs';
import path from 'path';

export class ClientFolderManager {
  private baseClientPath: string;

  constructor(baseClientPath: string = './clients') {
    this.baseClientPath = baseClientPath;
  }

  async createClientFolder(instanceId: number, clientName: string): Promise<string> {
    const folderName = `${instanceId}-${this.sanitizeFileName(clientName)}`;
    const folderPath = path.join(this.baseClientPath, folderName);
    
    // Create folder structure
    await fs.mkdir(folderPath, { recursive: true });
    await fs.mkdir(path.join(folderPath, 'documents'), { recursive: true });
    await fs.mkdir(path.join(folderPath, 'communications'), { recursive: true });
    await fs.mkdir(path.join(folderPath, 'notes'), { recursive: true });
    
    // Create initial metadata
    const metadata = {
      instanceId,
      clientName,
      createdAt: new Date().toISOString(),
      version: 1
    };
    
    await fs.writeFile(
      path.join(folderPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
    
    return folderPath;
  }

  async updateProcessLog(folderPath: string, logContent: string): Promise<void> {
    const logPath = path.join(folderPath, 'process-log.md');
    await fs.writeFile(logPath, logContent, 'utf-8');
  }

  async saveDocument(folderPath: string, filename: string, content: string | Buffer): Promise<void> {
    const docPath = path.join(folderPath, 'documents', filename);
    
    if (typeof content === 'string') {
      await fs.writeFile(docPath, content, 'utf-8');
    } else {
      await fs.writeFile(docPath, content);
    }
  }

  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  generateProcessLog(processData: any): string {
    return `# Client Process: ${processData.clientName}

## Process Overview
- **Started**: ${processData.startedAt}
- **Playbook**: ${processData.playbookName}
- **Current Step**: ${processData.currentStep}
- **Status**: ${processData.status}

## Activity Log
${processData.activities?.map((activity: any) => 
  `### ${activity.timestamp} - ${activity.action}\n${activity.details}\n`
).join('\n') || 'No activity recorded yet'}

## Process Data
\`\`\`json
${JSON.stringify(processData.data, null, 2)}
\`\`\`
`;
  }
}
