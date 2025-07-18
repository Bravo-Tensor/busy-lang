# BUSY Runtime Architecture

**Version**: 1.0.0  
**Purpose**: Architecture for generating runnable applications from BUSY language files  
**Target**: Web applications for solo business operators

## Overview

This document defines the architecture for the BUSY Runtime system that transforms BUSY language specifications into executable web applications. The system generates React/TypeScript applications that provide user interfaces for managing business processes defined in BUSY files.

## Core Philosophy

### Design Principles

1. **Human-Readable Artifacts**: Generate both code and data that users can understand and manipulate
2. **Gradual Digital Adoption**: Don't abstract away the underlying data - make it accessible
3. **AI-Assisted Evolution**: Support bidirectional changes between specifications and generated code
4. **Local-First Development**: Start with local file system, expand to cloud later
5. **Framework Patterns**: Learn patterns through generation, potentially abstract to framework later

### Key Concepts

- **BUSY Compilation**: Transform `.busy` files into database schema + React application code
- **Process Instances**: Runtime execution of playbook workflows with persistent state
- **Client Folders**: Human-readable artifact storage for each business process instance
- **AI-Assisted Merging**: Intelligent reconciliation of specification changes with customized code
- **Role-Based UI**: Generated interfaces that support multiple roles for single operators

## System Architecture

### High-Level Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   BUSY Files    │ -> │   Compiler      │ -> │  Generated App  │
│   (.busy)       │    │   Enhanced      │    │  (React/TS)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │                       │
                                 ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Database      │    │ Client Folders  │
                       │   Schema        │    │ (File System)   │
                       └─────────────────┘    └─────────────────┘
```

### Component Breakdown

#### 1. Enhanced BUSY Compiler

**Purpose**: Transform BUSY specifications into runnable applications

**New Capabilities**:
- Generate React component scaffolding
- Create database schema for BUSY objects
- Generate TypeScript interfaces for type safety
- Create routing and navigation structure
- Generate form components for human tasks
- Create mock implementations for algorithmic/AI tasks

**Output Artifacts**:
```
generated-app/
├── src/
│   ├── components/          # Generated UI components
│   ├── pages/              # Generated page routing
│   ├── models/             # Generated TypeScript interfaces
│   ├── services/           # Generated API/data layer
│   └── utils/              # Generated utility functions
├── database/
│   ├── schema.sql          # Generated database schema
│   └── migrations/         # Generated migration scripts
└── config/
    └── busy-runtime.json   # Runtime configuration
```

#### 2. Database Layer

**Purpose**: Persistent storage for BUSY definitions and runtime state

**Schema Categories**:

**Meta Tables** (BUSY Definitions):
```sql
-- Core BUSY entities
Teams (id, name, type, layer, config_json, busy_file_path, created_at)
Roles (id, team_id, name, description, inherits_from_id, config_json, busy_file_path)
Playbooks (id, team_id, name, description, cadence_config, busy_file_path)
Documents (id, name, content_type, schema_json, busy_file_path)
Tasks (id, playbook_id, role_id, name, execution_type, config_json, order_index)

-- Import definitions
Imports (id, entity_type, entity_id, import_type, name, capability, config_json)
```

**Runtime Tables** (Process Execution):
```sql
-- Process instances
PlaybookInstances (id, playbook_id, status, client_folder_path, started_at, completed_at)
TaskInstances (id, playbook_instance_id, task_id, status, assigned_role, data_json, completed_at)
DocumentInstances (id, document_id, playbook_instance_id, file_path, data_json, version)

-- Audit trail
StateTransitions (id, instance_id, instance_type, from_status, to_status, user_id, changed_at, notes)
```

#### 3. Generated React Application

**Purpose**: Executable user interface for business process management

**Architecture Pattern**: Model-View-Controller
- **Models**: TypeScript interfaces generated from BUSY schemas
- **Views**: React components with customizable UI
- **Controllers**: Generated services for data manipulation and business logic

**Key Components**:

**Dashboard Components**:
```typescript
// Generated dashboard showing process overview
<BusinessDashboard>
  <ActiveProcesses />      // Running playbook instances
  <RoleWorkload />         // Tasks by role
  <PlaybookTemplates />    // Available workflows to start
  <RecentActivity />       // Recent state changes
</BusinessDashboard>
```

**Process Components**:
```typescript
// Generated process execution interface
<PlaybookExecution playbookInstanceId={id}>
  <ProcessHeader />        // Current step, progress
  <TaskInterface />        // Step-specific UI (form/info/action)
  <ProcessNavigation />    // Previous/next step controls
  <AuditTrail />          // History of changes
</PlaybookExecution>
```

**Role-Specific Views**:
```typescript
// Generated role-specific task queues
<RoleView role="inquiry-manager">
  <TaskQueue />           // Pending tasks for this role
  <ActiveTasks />         // In-progress tasks
  <CompletedTasks />      // Recent completions
</RoleView>
```

#### 4. Client Folder System

**Purpose**: Human-readable artifact storage with audit trail

**Folder Structure**:
```
clients/
├── {client-id}-{client-name}/
│   ├── process-log.md           # Human-readable audit trail
│   ├── documents/
│   │   ├── contracts/
│   │   ├── communications/
│   │   └── deliverables/
│   ├── metadata.json           # Machine-readable process state
│   ├── photos/                 # Process-specific media
│   └── notes/                  # Unstructured notes and files
```

**Process Log Format**:
```markdown
# Client Process: Smith Wedding Photography

## Process Overview
- **Started**: 2024-01-15
- **Playbook**: client-onboarding
- **Current Step**: lead-qualification (Step 2 of 6)
- **Assigned Role**: inquiry-manager

## Activity Log
### 2024-01-15 10:30 AM - Process Started
- Initial inquiry received via contact form
- Automatic acknowledgment sent
- **Data**: inquiry-form-response.json

### 2024-01-15 2:15 PM - Lead Qualification
- Manual qualification completed by inquiry-manager
- Score: 8/10 (High Priority)
- **Action**: Proceeding to portfolio delivery
- **Data**: qualification-assessment.json
```

**Benefits**:
- Complete process history in human-readable format
- Easy backup and sharing (zip folder and send)
- No vendor lock-in (standard files and folders)
- Searchable and browsable without special tools

## Task Execution Models

### Human Tasks

**Generated UI**: Form-based interfaces with validation

**Example Generated Component**:
```typescript
interface LeadQualificationProps {
  taskInstance: TaskInstance;
  onComplete: (data: QualificationData) => void;
}

function LeadQualificationForm({ taskInstance, onComplete }: LeadQualificationProps) {
  // Generated form based on task input/output schema
  // Validation rules from BUSY definition
  // Submit handler that calls onComplete
}
```

**Features**:
- Automatic form generation from schema
- Built-in validation rules
- Context display from previous steps
- Audit trail integration

### Algorithmic Tasks

**Generated Implementation**: Function stubs with clear integration points

**Example Generated Service**:
```typescript
class InquiryAcknowledgmentService {
  async executeTask(input: InquiryData): Promise<AcknowledgmentResult> {
    // TODO: Implement email sending logic
    // Integration point for email service
    
    return {
      status: 'sent',
      template_used: 'standard-inquiry-response',
      sent_at: new Date().toISOString()
    };
  }
}
```

**Features**:
- Type-safe input/output interfaces
- Clear integration points for external services
- Mock implementations for testing
- Configuration hooks for runtime behavior

### AI Agent Tasks

**Generated Implementation**: Prompt templates with LLM integration points

**Example Generated Service**:
```typescript
class PortfolioSelectionAgent {
  async executeTask(input: ClientPreferences): Promise<PortfolioSelection> {
    const prompt = `
      Based on client preferences: ${JSON.stringify(input)}
      Select 10-15 portfolio images that best match their style.
      Consider: event type, style preferences, budget level.
    `;
    
    // TODO: Integrate with OpenAI/Claude API
    const response = await this.llmService.complete(prompt);
    
    return this.parsePortfolioResponse(response);
  }
}
```

**Features**:
- Generated prompts based on task description
- Type-safe integration with LLM services
- Result parsing and validation
- Fallback to human review if needed

## Code Generation and Evolution

### Initial Generation

**Process**:
1. **Parse BUSY Files**: Extract all teams, roles, playbooks, tasks, documents
2. **Generate Database Schema**: Create tables for BUSY entities and runtime state
3. **Generate TypeScript Interfaces**: Type-safe models from BUSY schemas
4. **Generate React Components**: UI scaffolding for each task type
5. **Generate Services**: Business logic and data access layers
6. **Generate Routing**: Navigation between processes and roles
7. **Generate Configuration**: Runtime settings and environment setup

### Regeneration and Merging

**Challenge**: Preserve user customizations while updating generated code

**Solution**: Git-based workflow with AI-assisted merging

**Process**:
1. **Create Feature Branch**: `git checkout -b busy-update-{timestamp}`
2. **Generate Fresh Code**: Complete regeneration in `build/` directory
3. **Intelligent Diff**: Compare with current codebase using AI
4. **Smart Merge**: AI-assisted reconciliation of differences
5. **Create Pull Request**: Standard code review workflow
6. **Human Review**: Developer approval required for all changes
7. **Merge to Main**: Becomes new canonical codebase

**Merge Categories**:
- **BUSY-Driven Changes**: Must take precedence (new fields, removed tasks)
- **User Customizations**: Preserve if possible (view formatting, additional validation)
- **Conflicts**: Require human resolution (conflicting field types)

**AI Merge Prompts**:
```
You are merging changes from a regenerated BUSY application.

CONTEXT:
- Original file: {file_path}
- Generated file: {new_file_path} 
- Last known BUSY file changes: {busy_changes}

RULES:
1. Preserve user customizations in views and styling
2. Update any schema/model changes from BUSY files
3. Maintain existing business logic unless contradicted by BUSY
4. Flag any conflicts that need human review

Provide the merged result with explanations for each change.
```

### Bidirectional Updates (Future)

**Vision**: Changes in generated app flow back to BUSY specifications

**Potential Workflow**:
1. User modifies generated application (adds field, changes validation)
2. AI analyzes change and determines if it should update BUSY file
3. Generate BUSY file update proposal
4. User reviews and approves BUSY changes
5. Regeneration cycle ensures consistency

## Technology Stack

### Core Technologies

**Frontend**:
- **React 18+**: Component-based UI framework
- **TypeScript**: Type safety and developer experience
- **Next.js**: Full-stack React framework with file-system routing
- **Tailwind CSS**: Utility-first styling (customizable)

**Backend**:
- **Node.js**: JavaScript runtime
- **Next.js API Routes**: Serverless-style API endpoints
- **SQLite**: Local-first database (upgradeable to PostgreSQL)
- **Prisma**: Type-safe database ORM

**Development**:
- **Git**: Version control and merge workflow
- **ESLint/Prettier**: Code quality and formatting
- **Jest**: Testing framework
- **TypeScript Compiler**: Build-time type checking

### File System Integration

**Local Development**:
- Direct file system access for client folders
- Watch mode for BUSY file changes
- Hot reloading for development

**Future Cloud Integration**:
- Google Drive API for client folders
- Dropbox/OneDrive integration
- Cloud database options (Supabase, PlanetScale)

## Development Workflow

### Developer Experience

**Setup**:
```bash
# Install BUSY compiler with runtime generation
npm install -g @busy-lang/compiler

# Generate initial application from BUSY files
busy generate ./business-spec/ --output ./my-business-app

# Run development server
cd my-business-app
npm run dev
```

**Development Cycle**:
1. **Modify BUSY Files**: Update business specifications
2. **Regenerate**: `busy generate --merge` (creates feature branch)
3. **Review Changes**: Check generated pull request
4. **Test**: Run generated tests and manual verification
5. **Merge**: Approve and merge changes
6. **Deploy**: Update running application

### Testing Strategy

**Generated Tests**:
- Unit tests for all generated services
- Integration tests for database operations
- Component tests for generated UI
- End-to-end tests for complete workflows

**Custom Tests**:
- User-written tests preserved across regenerations
- Integration points with external services
- Business-specific validation logic

## Security and Data Protection

### Local Development Security

**Data Protection**:
- Client data stored locally (not in cloud by default)
- File system permissions protect sensitive data
- Database encryption for sensitive fields

**Access Control**:
- Role-based UI restrictions
- Task assignment validation
- Audit trail for all data changes

### Future Production Security

**Authentication**:
- OAuth integration for user accounts
- Role-based access control
- Session management

**Data Protection**:
- End-to-end encryption for client data
- GDPR compliance for data handling
- Secure cloud storage integration

## Scalability and Performance

### Local Performance

**Optimization Strategies**:
- Lazy loading of large playbook instances
- Efficient database queries with Prisma
- Component-level code splitting
- Optimized file system operations

### Growth Path

**Single User → Small Team**:
- Multi-user authentication
- Collaborative editing
- Conflict resolution for concurrent changes

**Small Team → Enterprise**:
- Cloud deployment options
- Advanced role management
- Integration with enterprise tools
- Performance monitoring and optimization

## Extension Points

### Custom Components

**Override System**:
- Custom React components can override generated ones
- Component registry for user customizations
- Type-safe extension interfaces

### Integration Hooks

**External Services**:
- Plugin system for tool integrations
- Webhook support for external triggers
- API endpoints for external systems

### AI Agent Extensions

**Custom Agents**:
- Plugin system for specialized AI agents
- Custom prompt templates
- Integration with different LLM providers

This architecture provides a solid foundation for transforming BUSY specifications into production-ready applications while maintaining flexibility for future enhancements and customizations.