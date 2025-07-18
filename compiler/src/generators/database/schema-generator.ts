import { AnalysisResult } from '../../analysis/types';
import { PlaybookNode, TaskNode, DocumentNode, TeamNode } from '../../ast/nodes';
import { promises as fs } from 'fs';
import path from 'path';

export interface DatabaseGenerationOptions {
  outputPath: string;
  databaseType: 'sqlite' | 'postgresql';
  includeMigrations: boolean;
}

export class DatabaseSchemaGenerator {
  constructor(private options: DatabaseGenerationOptions) {}

  async generateSchema(analysisResult: AnalysisResult): Promise<void> {
    const sqlSchema = this.generateSQLSchema(analysisResult);
    const prismaSchema = this.generatePrismaSchema(analysisResult);

    // Ensure directories exist
    await fs.mkdir(this.options.outputPath, { recursive: true });
    await fs.mkdir(path.join(this.options.outputPath, 'prisma'), { recursive: true });

    // Write SQL schema
    await fs.writeFile(
      path.join(this.options.outputPath, 'schema.sql'),
      sqlSchema,
      'utf-8'
    );

    // Write Prisma schema
    await fs.writeFile(
      path.join(this.options.outputPath, 'prisma', 'schema.prisma'),
      prismaSchema,
      'utf-8'
    );

    console.log('Database schema generated successfully');
  }

  private generateSQLSchema(analysisResult: AnalysisResult): string {
    const tables = [];

    // Meta tables for BUSY definitions
    tables.push(`
-- Meta tables (BUSY definitions)
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  layer TEXT NOT NULL,
  config_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER REFERENCES teams(id),
  name TEXT NOT NULL,
  description TEXT,
  inherits_from_id INTEGER REFERENCES roles(id),
  config_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER REFERENCES teams(id),
  name TEXT NOT NULL,
  description TEXT,
  cadence_config TEXT,
  config_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  schema_json TEXT,
  busy_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_id INTEGER REFERENCES playbooks(id),
  role_id INTEGER REFERENCES roles(id),
  name TEXT NOT NULL,
  description TEXT,
  execution_type TEXT NOT NULL,
  estimated_duration TEXT,
  config_json TEXT,
  order_index INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  import_type TEXT NOT NULL,
  name TEXT NOT NULL,
  capability TEXT NOT NULL,
  config_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

    // Runtime tables for process instances
    tables.push(`
-- Runtime tables (process instances)
CREATE TABLE playbook_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_id INTEGER REFERENCES playbooks(id),
  status TEXT DEFAULT 'started',
  client_name TEXT,
  client_folder_path TEXT,
  current_step INTEGER DEFAULT 0,
  data_json TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_instance_id INTEGER REFERENCES playbook_instances(id),
  task_id INTEGER REFERENCES tasks(id),
  status TEXT DEFAULT 'pending',
  assigned_role_id INTEGER REFERENCES roles(id),
  input_data_json TEXT,
  output_data_json TEXT,
  notes TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER REFERENCES documents(id),
  playbook_instance_id INTEGER REFERENCES playbook_instances(id),
  task_instance_id INTEGER REFERENCES task_instances(id),
  file_path TEXT,
  data_json TEXT,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE state_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id INTEGER NOT NULL,
  instance_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  user_id TEXT,
  notes TEXT,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

    // Indexes for performance
    tables.push(`
-- Indexes for performance
CREATE INDEX idx_playbook_instances_status ON playbook_instances(status);
CREATE INDEX idx_task_instances_status ON task_instances(status);
CREATE INDEX idx_task_instances_playbook ON task_instances(playbook_instance_id);
CREATE INDEX idx_state_transitions_instance ON state_transitions(instance_id, instance_type);
CREATE INDEX idx_teams_layer ON teams(layer);
CREATE INDEX idx_tasks_playbook ON tasks(playbook_id);
`);

    return tables.join('\n');
  }

  private generatePrismaSchema(analysisResult: AnalysisResult): string {
    const databaseUrl = this.options.databaseType === 'sqlite' 
      ? 'file:./dev.db'
      : 'postgresql://localhost:5432/busy_runtime';

    return `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${this.options.databaseType}"
  url      = "${databaseUrl}"
}

// Meta models (BUSY definitions)
model Team {
  id           Int      @id @default(autoincrement())
  name         String
  type         String
  description  String?
  layer        String
  configJson   String?  @map("config_json")
  busyFilePath String?  @map("busy_file_path")
  createdAt    DateTime @default(now()) @map("created_at")

  roles                Role[]
  playbooks           Playbook[]
  playbookInstances   PlaybookInstance[]

  @@map("teams")
}

model Role {
  id             Int      @id @default(autoincrement())
  teamId         Int      @map("team_id")
  name           String
  description    String?
  inheritsFromId Int?     @map("inherits_from_id")
  configJson     String?  @map("config_json")
  busyFilePath   String?  @map("busy_file_path")
  createdAt      DateTime @default(now()) @map("created_at")

  team           Team      @relation(fields: [teamId], references: [id])
  inheritsFrom   Role?     @relation("RoleInheritance", fields: [inheritsFromId], references: [id])
  children       Role[]    @relation("RoleInheritance")
  tasks          Task[]
  taskInstances  TaskInstance[]

  @@map("roles")
}

model Playbook {
  id            Int      @id @default(autoincrement())
  teamId        Int      @map("team_id")
  name          String
  description   String?
  cadenceConfig String?  @map("cadence_config")
  configJson    String?  @map("config_json")
  busyFilePath  String?  @map("busy_file_path")
  createdAt     DateTime @default(now()) @map("created_at")

  team      Team               @relation(fields: [teamId], references: [id])
  tasks     Task[]
  instances PlaybookInstance[]

  @@map("playbooks")
}

model Document {
  id           Int      @id @default(autoincrement())
  name         String
  contentType  String   @map("content_type")
  schemaJson   String?  @map("schema_json")
  busyFilePath String?  @map("busy_file_path")
  createdAt    DateTime @default(now()) @map("created_at")

  instances DocumentInstance[]

  @@map("documents")
}

model Task {
  id                Int      @id @default(autoincrement())
  playbookId        Int      @map("playbook_id")
  roleId            Int?     @map("role_id")
  name              String
  description       String?
  executionType     String   @map("execution_type")
  estimatedDuration String?  @map("estimated_duration")
  configJson        String?  @map("config_json")
  orderIndex        Int      @map("order_index")
  createdAt         DateTime @default(now()) @map("created_at")

  playbook  Playbook       @relation(fields: [playbookId], references: [id])
  role      Role?          @relation(fields: [roleId], references: [id])
  instances TaskInstance[]

  @@map("tasks")
}

model Import {
  id          Int      @id @default(autoincrement())
  entityType  String   @map("entity_type")
  entityId    Int      @map("entity_id")
  importType  String   @map("import_type")
  name        String
  capability  String
  configJson  String?  @map("config_json")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("imports")
}

// Runtime models (process instances)
model PlaybookInstance {
  id               Int       @id @default(autoincrement())
  playbookId       Int       @map("playbook_id")
  status           String    @default("started")
  clientName       String?   @map("client_name")
  clientFolderPath String?   @map("client_folder_path")
  currentStep      Int       @default(0) @map("current_step")
  dataJson         String?   @map("data_json")
  startedAt        DateTime  @default(now()) @map("started_at")
  completedAt      DateTime? @map("completed_at")
  updatedAt        DateTime  @default(now()) @updatedAt @map("updated_at")

  playbook          Playbook           @relation(fields: [playbookId], references: [id])
  team              Team               @relation(fields: [playbookId], references: [id])
  taskInstances     TaskInstance[]
  documentInstances DocumentInstance[]
  stateTransitions  StateTransition[]

  @@map("playbook_instances")
}

model TaskInstance {
  id                   Int       @id @default(autoincrement())
  playbookInstanceId   Int       @map("playbook_instance_id")
  taskId               Int       @map("task_id")
  status               String    @default("pending")
  assignedRoleId       Int?      @map("assigned_role_id")
  inputDataJson        String?   @map("input_data_json")
  outputDataJson       String?   @map("output_data_json")
  notes                String?
  startedAt            DateTime? @map("started_at")
  completedAt          DateTime? @map("completed_at")
  createdAt            DateTime  @default(now()) @map("created_at")

  playbookInstance  PlaybookInstance   @relation(fields: [playbookInstanceId], references: [id])
  task              Task               @relation(fields: [taskId], references: [id])
  assignedRole      Role?              @relation(fields: [assignedRoleId], references: [id])
  documentInstances DocumentInstance[]
  stateTransitions  StateTransition[]

  @@map("task_instances")
}

model DocumentInstance {
  id                 Int      @id @default(autoincrement())
  documentId         Int      @map("document_id")
  playbookInstanceId Int?     @map("playbook_instance_id")
  taskInstanceId     Int?     @map("task_instance_id")
  filePath           String?  @map("file_path")
  dataJson           String?  @map("data_json")
  version            Int      @default(1)
  createdAt          DateTime @default(now()) @map("created_at")

  document         Document          @relation(fields: [documentId], references: [id])
  playbookInstance PlaybookInstance? @relation(fields: [playbookInstanceId], references: [id])
  taskInstance     TaskInstance?     @relation(fields: [taskInstanceId], references: [id])

  @@map("document_instances")
}

model StateTransition {
  id             Int      @id @default(autoincrement())
  instanceId     Int      @map("instance_id")
  instanceType   String   @map("instance_type")
  fromStatus     String?  @map("from_status")
  toStatus       String   @map("to_status")
  userId         String?  @map("user_id")
  notes          String?
  metadataJson   String?  @map("metadata_json")
  createdAt      DateTime @default(now()) @map("created_at")

  playbookInstance PlaybookInstance? @relation(fields: [instanceId], references: [id])
  taskInstance     TaskInstance?     @relation(fields: [instanceId], references: [id])

  @@map("state_transitions")
}
`;
  }

  private sanitizeTableName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private pascalCase(str: string): string {
    return str.replace(/(^|-)([a-z])/g, (_, __, letter) => letter.toUpperCase());
  }
}