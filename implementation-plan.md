# BUSY Runtime Implementation Plan

**Version**: 1.0.0  
**Target**: MVP - Single Playbook End-to-End  
**Timeline**: Initial prototype implementation  
**Focus**: Prove core concept with inquiry-to-booking playbook

## MVP Scope Definition

### Primary Goal
Create a working web application that executes the `inquiry-to-booking` playbook from the solo photography business example, demonstrating:

1. **Process Instance Management**: Start new playbook instances
2. **Step-by-Step Execution**: Move through tasks with proper UI
3. **Data Persistence**: Save state between steps and sessions
4. **Human Task Interface**: Generated forms for human interaction
5. **Mock Integration**: Placeholder for algorithmic/AI tasks
6. **Client Folders**: Generate human-readable artifacts

### Success Criteria

**Functional Requirements**:
- [ ] Load inquiry-to-booking playbook from BUSY file
- [ ] Create new process instance (new client inquiry)
- [ ] Execute all 6 steps of the playbook with appropriate UI
- [ ] Persist process state in database
- [ ] Generate client folder with process log and documents
- [ ] Display process status and navigation

**Technical Requirements**:
- [ ] Generated React/TypeScript application runs locally
- [ ] SQLite database stores process state
- [ ] File system integration creates client folders
- [ ] Hot reload during development
- [ ] Type-safe interfaces throughout

### Out of Scope (Phase 1)

- Multiple playbooks simultaneously
- Role switching UI
- AI-assisted code merging
- Real external integrations (email, CRM)
- User authentication
- Multiple teams/roles
- Complex conditional flows
- Production deployment

## Implementation Phases

### Phase 1: Foundation Setup (Week 1)

#### 1.1 Project Structure
Create new runtime generation project structure:

```
compiler/
├── src/
│   └── generators/           # New runtime generators
│       ├── react-app/        # React app generation
│       ├── database/         # Database schema generation
│       └── types/            # TypeScript interface generation
└── templates/                # Code generation templates

examples/
└── solo-photography-business/
    └── generated-runtime/    # Generated application output
```

#### 1.2 Database Schema Generator
Create generator for SQLite schema from BUSY files:

**Input**: Parsed BUSY AST  
**Output**: `schema.sql` + Prisma schema file

**Key Tables**:
```sql
-- Meta tables (from BUSY definitions)
CREATE TABLE playbooks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  team_name TEXT,
  config_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  playbook_id INTEGER REFERENCES playbooks(id),
  name TEXT NOT NULL,
  description TEXT,
  execution_type TEXT NOT NULL,
  order_index INTEGER,
  config_json TEXT
);

-- Runtime tables (process instances)
CREATE TABLE playbook_instances (
  id INTEGER PRIMARY KEY,
  playbook_id INTEGER REFERENCES playbooks(id),
  status TEXT DEFAULT 'started',
  client_name TEXT,
  client_folder_path TEXT,
  current_step INTEGER DEFAULT 0,
  data_json TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE task_instances (
  id INTEGER PRIMARY KEY,
  playbook_instance_id INTEGER REFERENCES playbook_instances(id),
  task_id INTEGER REFERENCES tasks(id),
  status TEXT DEFAULT 'pending',
  input_data_json TEXT,
  output_data_json TEXT,
  completed_at DATETIME,
  notes TEXT
);
```

#### 1.3 TypeScript Interface Generator
Create generator for type-safe interfaces:

**Input**: BUSY task/document schemas  
**Output**: TypeScript interface files

**Example Output**:
```typescript
// Generated from inquiry-to-booking.busy
export interface ClientInquiry {
  contact_info: {
    name: string;
    email: string;
    phone?: string;
  };
  event_type: string;
  preferred_date: string;
  budget_range?: string;
  additional_details?: string;
}

export interface QualificationAssessment {
  budget_fit: number;
  style_alignment: number;
  timeline_feasibility: number;
  overall_score: number;
  notes: string;
  recommendation: 'proceed' | 'decline' | 'follow_up';
}
```

### Phase 2: Basic UI Generation (Week 2)

#### 2.1 Next.js Project Template
Create base Next.js application template:

```
generated-app/
├── package.json              # Dependencies and scripts
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Styling configuration
├── prisma/
│   └── schema.prisma         # Generated database schema
└── src/
    ├── pages/
    │   ├── index.tsx         # Dashboard
    │   └── playbook/
    │       └── [id]/
    │           └── step/
    │               └── [stepId].tsx  # Step execution page
    ├── components/
    │   ├── Dashboard.tsx     # Process overview
    │   ├── PlaybookExecution.tsx
    │   └── TaskInterface.tsx # Dynamic task UI
    ├── lib/
    │   ├── database.ts       # Prisma client setup
    │   └── files.ts          # File system operations
    └── types/
        └── generated.ts      # Generated interfaces
```

#### 2.2 Dashboard Component
Create main dashboard showing:

```typescript
interface DashboardProps {
  activeProcesses: PlaybookInstance[];
  availablePlaybooks: Playbook[];
}

function Dashboard({ activeProcesses, availablePlaybooks }: DashboardProps) {
  return (
    <div className="p-6">
      <h1>Business Process Dashboard</h1>
      
      {/* Active Processes */}
      <section>
        <h2>Active Processes</h2>
        {activeProcesses.map(process => (
          <ProcessCard key={process.id} process={process} />
        ))}
      </section>

      {/* Start New Process */}
      <section>
        <h2>Start New Process</h2>
        {availablePlaybooks.map(playbook => (
          <PlaybookCard key={playbook.id} playbook={playbook} />
        ))}
      </section>
    </div>
  );
}
```

#### 2.3 Task Interface Generator
Create dynamic task UI based on execution type:

```typescript
interface TaskInterfaceProps {
  task: Task;
  taskInstance: TaskInstance;
  onComplete: (outputData: any) => void;
}

function TaskInterface({ task, taskInstance, onComplete }: TaskInterfaceProps) {
  switch (task.execution_type) {
    case 'human':
      return <HumanTaskForm task={task} onComplete={onComplete} />;
    case 'algorithmic':
      return <AlgorithmicTaskMock task={task} onComplete={onComplete} />;
    case 'ai_agent':
      return <AIAgentTaskMock task={task} onComplete={onComplete} />;
    default:
      return <div>Unknown task type</div>;
  }
}
```

### Phase 3: Process Execution Engine (Week 3)

#### 3.1 Process State Management
Create service layer for process management:

```typescript
class ProcessExecutionService {
  async startPlaybook(playbookId: number, initialData: any): Promise<PlaybookInstance> {
    // Create new playbook instance
    // Initialize first task
    // Create client folder
    // Return instance
  }

  async executeCurrentStep(instanceId: number, outputData: any): Promise<void> {
    // Save current step output
    // Mark current task as completed
    // Advance to next step
    // Update process log
  }

  async getProcessState(instanceId: number): Promise<ProcessState> {
    // Return current process state with context
  }
}
```

#### 3.2 File System Integration
Create client folder management:

```typescript
class ClientFolderService {
  async createClientFolder(processInstance: PlaybookInstance): Promise<string> {
    const folderPath = `clients/${processInstance.id}-${processInstance.client_name}`;
    
    // Create folder structure
    await fs.mkdir(`${folderPath}/documents`, { recursive: true });
    await fs.mkdir(`${folderPath}/communications`, { recursive: true });
    
    // Initialize process log
    await this.updateProcessLog(processInstance);
    
    return folderPath;
  }

  async updateProcessLog(processInstance: PlaybookInstance): Promise<void> {
    const logContent = this.generateProcessLog(processInstance);
    const logPath = `${processInstance.client_folder_path}/process-log.md`;
    await fs.writeFile(logPath, logContent);
  }

  private generateProcessLog(processInstance: PlaybookInstance): string {
    // Generate human-readable process log in Markdown
    return `
# Client Process: ${processInstance.client_name}

## Process Overview
- **Started**: ${processInstance.started_at}
- **Playbook**: ${processInstance.playbook.name}
- **Current Step**: ${processInstance.current_step}
- **Status**: ${processInstance.status}

## Activity Log
${this.generateActivityLog(processInstance)}
    `.trim();
  }
}
```

#### 3.3 Form Generation
Create automatic form generation for human tasks:

```typescript
function generateFormComponent(task: Task): React.ComponentType {
  const inputSchema = task.inputs[0]?.schema;
  const outputSchema = task.outputs[0]?.schema;

  return function GeneratedTaskForm({ onComplete }: { onComplete: (data: any) => void }) {
    const [formData, setFormData] = useState({});

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Validate against output schema
      onComplete(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3>{task.description}</h3>
        
        {/* Generate form fields based on output schema */}
        {Object.entries(outputSchema.properties).map(([fieldName, fieldConfig]) => (
          <FormField
            key={fieldName}
            name={fieldName}
            config={fieldConfig}
            value={formData[fieldName]}
            onChange={(value) => setFormData(prev => ({ ...prev, [fieldName]: value }))}
          />
        ))}
        
        <button type="submit">Complete Step</button>
      </form>
    );
  };
}
```

### Phase 4: Integration and Testing (Week 4)

#### 4.1 Compiler Integration
Integrate runtime generation with existing BUSY compiler:

```typescript
// Add to existing compiler CLI
async function generateRuntime(inputPath: string, outputPath: string) {
  // Parse BUSY files (existing functionality)
  const analysisResult = await analyzeFiles(inputPath);
  
  // Generate database schema
  await generateDatabaseSchema(analysisResult, outputPath);
  
  // Generate TypeScript interfaces
  await generateTypeScriptInterfaces(analysisResult, outputPath);
  
  // Generate React application
  await generateReactApp(analysisResult, outputPath);
  
  // Initialize database
  await initializeDatabase(outputPath);
  
  console.log(`Runtime generated successfully at ${outputPath}`);
}
```

#### 4.2 End-to-End Testing
Create test suite for complete workflow:

```typescript
describe('Inquiry to Booking Workflow', () => {
  test('complete workflow execution', async () => {
    // Start new inquiry process
    const processId = await startProcess('inquiry-to-booking', {
      contact_info: { name: 'John Smith', email: 'john@example.com' },
      event_type: 'wedding',
      preferred_date: '2024-06-15'
    });

    // Execute each step
    await executeStep(processId, 1, { acknowledgment_sent: true });
    await executeStep(processId, 2, { 
      budget_fit: 8, 
      style_alignment: 9, 
      overall_score: 8.5,
      recommendation: 'proceed' 
    });
    // ... continue for all steps

    // Verify final state
    const finalState = await getProcessState(processId);
    expect(finalState.status).toBe('completed');
    expect(finalState.client_folder_path).toBeTruthy();
  });
});
```

#### 4.3 Documentation Generation
Create documentation for generated application:

**Generated README.md**:
```markdown
# Generated Business Application

This application was generated from BUSY language specifications.

## Available Processes
- **Inquiry to Booking**: Convert client inquiries into booked projects

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Process Management
- View dashboard at http://localhost:3000
- Start new processes from the dashboard
- Track progress through each step
- View client folders in ./clients/ directory

## Customization
- Edit views in src/components/ (preserved across regenerations)
- Modify business logic in BUSY files and regenerate
- Custom styling in tailwind.config.js
\`\`\`
```

## Technical Implementation Details

### Code Generation Strategy

#### Template-Based Generation
Use template files with placeholders for dynamic content:

**Component Template Example**:
```typescript
// templates/TaskForm.tsx.template
import React, { useState } from 'react';
import { {{TASK_INTERFACE_NAME}} } from '../types/generated';

export function {{COMPONENT_NAME}}({ onComplete }: {
  onComplete: (data: {{OUTPUT_TYPE}}) => void;
}) {
  const [formData, setFormData] = useState<{{OUTPUT_TYPE}}>({
    {{INITIAL_VALUES}}
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onComplete(formData);
    }}>
      <h3>{{TASK_DESCRIPTION}}</h3>
      {{FORM_FIELDS}}
      <button type="submit">Complete</button>
    </form>
  );
}
```

#### Dynamic Field Generation
Create form fields based on JSON schema:

```typescript
function generateFormField(fieldName: string, fieldSchema: any): string {
  switch (fieldSchema.type) {
    case 'string':
      return `
        <div>
          <label htmlFor="${fieldName}">${fieldSchema.title || fieldName}</label>
          <input
            type="text"
            id="${fieldName}"
            value={formData.${fieldName} || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, ${fieldName}: e.target.value }))}
            required={${fieldSchema.required || false}}
          />
        </div>
      `;
    case 'number':
      return `
        <div>
          <label htmlFor="${fieldName}">${fieldSchema.title || fieldName}</label>
          <input
            type="number"
            id="${fieldName}"
            value={formData.${fieldName} || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, ${fieldName}: Number(e.target.value) }))}
            min={${fieldSchema.minimum || 0}}
            max={${fieldSchema.maximum || 100}}
            required={${fieldSchema.required || false}}
          />
        </div>
      `;
    // Add more field types as needed
  }
}
```

### Database Integration

#### Prisma Schema Generation
Convert BUSY schemas to Prisma models:

```typescript
function generatePrismaSchema(busyAnalysis: AnalysisResult): string {
  const models = [];
  
  // Generate models for each playbook
  busyAnalysis.playbooks.forEach(playbook => {
    models.push(`
model ${pascalCase(playbook.name)}Instance {
  id          Int      @id @default(autoincrement())
  status      String   @default("started")
  clientName  String?
  folderPath  String?
  currentStep Int      @default(0)
  data        Json?
  startedAt   DateTime @default(now())
  completedAt DateTime?
  
  taskInstances TaskInstance[]
}
    `);
  });

  return `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

${models.join('\n')}
  `;
}
```

### File System Operations

#### Async File Operations
Use Node.js fs/promises for file system operations:

```typescript
import { promises as fs } from 'fs';
import path from 'path';

class FileSystemService {
  private baseClientPath = './clients';

  async ensureClientFolder(clientId: string, clientName: string): Promise<string> {
    const folderName = `${clientId}-${this.sanitizeFileName(clientName)}`;
    const folderPath = path.join(this.baseClientPath, folderName);
    
    await fs.mkdir(folderPath, { recursive: true });
    await fs.mkdir(path.join(folderPath, 'documents'), { recursive: true });
    await fs.mkdir(path.join(folderPath, 'communications'), { recursive: true });
    
    return folderPath;
  }

  async writeProcessLog(folderPath: string, logContent: string): Promise<void> {
    const logPath = path.join(folderPath, 'process-log.md');
    await fs.writeFile(logPath, logContent, 'utf-8');
  }

  async saveDocument(folderPath: string, filename: string, content: any): Promise<void> {
    const docPath = path.join(folderPath, 'documents', filename);
    
    if (typeof content === 'string') {
      await fs.writeFile(docPath, content, 'utf-8');
    } else {
      await fs.writeFile(docPath, JSON.stringify(content, null, 2), 'utf-8');
    }
  }

  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }
}
```

## Development Workflow

### Setup Instructions

```bash
# 1. Navigate to compiler directory
cd compiler

# 2. Install additional dependencies for runtime generation
npm install next react react-dom @types/react @types/react-dom
npm install prisma @prisma/client
npm install tailwindcss @tailwindcss/forms

# 3. Generate runtime for photography business example
npm run dev -- generate-runtime ../examples/solo-photography-business/L0 \
  --output ../examples/solo-photography-business/generated-runtime

# 4. Run generated application
cd ../examples/solo-photography-business/generated-runtime
npm install
npm run dev
```

### Testing Strategy

**Unit Tests**: Test individual generators and services  
**Integration Tests**: Test complete generation pipeline  
**E2E Tests**: Test generated application functionality  
**Manual Testing**: Walk through complete inquiry-to-booking workflow

### Success Metrics

**Development Metrics**:
- [ ] Generation completes without errors
- [ ] Generated app starts and runs locally
- [ ] All TypeScript types compile successfully
- [ ] Database operations work correctly

**User Experience Metrics**:
- [ ] Complete inquiry-to-booking workflow in <5 minutes
- [ ] Intuitive navigation between steps
- [ ] Clear feedback on current progress
- [ ] Human-readable client folders generated

**Technical Metrics**:
- [ ] Generated code is readable and maintainable
- [ ] Performance acceptable for single-user local development
- [ ] File system operations complete reliably
- [ ] Database queries execute efficiently

This implementation plan provides a concrete roadmap for building the MVP while maintaining focus on the core value proposition: transforming BUSY specifications into executable business applications.