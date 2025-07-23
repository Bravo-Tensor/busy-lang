# BUSY Language - Business Organizations as Code

**Transform business processes into executable, type-safe code with complete flexibility and AI-powered assistance.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](#)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](#)

---

## 🌟 **Vision: Business Processes as Code**

BUSY enables organizations to define, execute, and evolve their business processes through code—bringing software engineering principles to business operations with complete human flexibility.

### **Core Philosophy: "Facilitate, Never Constrain"**

- **Complete User Control**: Skip any step, provide manual data, or override any automation
- **AI-Powered Assistance**: Intelligent support with human oversight and escape hatches  
- **Immutable Audit Trail**: Every action tracked with event sourcing—never rewrite history
- **Type-Safe Business Logic**: Full TypeScript support with IDE integration and compile-time validation

---

## 🏗️ **System Architecture**

The BUSY ecosystem consists of four integrated components that work together to transform business descriptions into executable organizational systems:

### **1. BUSY Language** - Domain-Specific Language
```yaml
# Example: inquiry-to-booking.busy
playbook:
  name: "inquiry-to-booking"
  description: "Convert inquiries into confirmed bookings"
  steps:
    - name: "qualify_lead"
      description: "Assess fit and qualification criteria"
      execution_type: "human"
      ui_type: "form"
```

**Key Features:**
- **Human-Readable YAML**: Business processes described in intuitive format
- **Layer-First Architecture**: L0 (Operational), L1 (Management), L2 (Strategic) separation
- **Type Safety**: Schema validation with comprehensive error reporting
- **Git Integration**: Version control for business process evolution

### **2. BUSY Compiler** - Translation Engine
```bash
# Transform BUSY files into TypeScript framework code
busy-check generate-framework ./business-processes/ -o ./generated-processes/
```

**Compilation Pipeline:**
```
BUSY Files → Lexer/Parser → AST → Semantic Analysis → 
Content Analysis → Code Generation → TypeScript Framework Code
```

**Output Capabilities:**
- **TypeScript Framework Code**: Production-ready business process implementations
- **React Applications**: Full web UIs for process execution  
- **Database Schemas**: State management and audit trail persistence
- **AI Agent Configurations**: Intelligent automation with human oversight

### **3. Orgata Framework** - React-Like Business Process Framework
```typescript
// Generated TypeScript code using Orgata Framework
export class InquiryToBookingProcess extends Process {
  constructor() {
    super({
      name: "inquiry-to-booking",
      description: "Convert inquiries into confirmed bookings"
    });
    
    this.addStep(new QualifyLeadStep());
    this.addStep(new ScheduleConsultationStep());
    // ... additional steps
  }
}
```

**Framework Features:**
- **Process Classes**: Complete business process implementations with type safety
- **Step Types**: HumanStep (UI forms), AgentStep (AI processing), AlgorithmStep (automation)
- **Immutable State**: Event sourcing with ProcessState—complete audit trail
- **Universal Flexibility**: Skip any step, go back, provide manual data at any point

### **4. Orgata Runtime** - Process Execution Engine
```typescript
const process = new InquiryToBookingProcess();
const result = await process.execute(context);

// Framework Philosophy: Users maintain complete control
await process.skipStep('qualify_lead', 'Already qualified', { qualified: true });
await process.goBack(2); // Go back 2 steps and proceed forward
```

**Runtime Capabilities:**
- **Web-Based UI**: Interactive forms for human steps with customization
- **AI Agent Orchestration**: Context assembly and intelligent processing
- **Exception Handling**: Process state freezing with governance-based resolution
- **Client Folder System**: Human-readable artifacts and communication

---

## 💼 **Business Value Proposition**

### **For Business Leaders**
- **Process Transparency**: Every business process defined as readable code
- **Audit Compliance**: Complete, immutable trail of all business decisions
- **Rapid Evolution**: Change business processes through code deployment
- **Risk Management**: AI-powered analysis of process deviations and impacts

### **For Operations Teams**  
- **Flexible Execution**: Never blocked—can skip steps, provide manual data, or override automation
- **Intelligent Assistance**: AI helps with complex decisions while maintaining human control
- **Exception Management**: Clear escalation paths with automated governance
- **Performance Analytics**: Data-driven insights into process efficiency

### **For Developers**
- **Type-Safe Business Logic**: Full TypeScript support with IDE integration
- **Framework Architecture**: React-like patterns for business process development  
- **Extensible Platform**: Plugin architecture for custom step types and integrations
- **Professional Tooling**: Comprehensive compiler, linting, testing, and debugging

---

## 🚀 **Quick Start**

### **1. Install the BUSY Compiler**
```bash
npm install -g @busy-lang/compiler
```

### **2. Create Your First Business Process**
```yaml
# business-process.busy
version: "1.0.0"
metadata:
  name: "Customer Onboarding"
  description: "Streamlined customer onboarding process"
  layer: "L0"

playbook:
  name: "customer-onboarding"
  description: "Complete customer onboarding workflow"
  steps:
    - name: "collect_information"
      description: "Gather customer details and requirements"
      execution_type: "human"
      ui_type: "form"
    
    - name: "verify_eligibility"  
      description: "Verify customer eligibility and compliance"
      execution_type: "agent"
    
    - name: "setup_account"
      description: "Create customer account and initial configuration"
      execution_type: "algorithmic"
```

### **3. Generate TypeScript Framework Code**
```bash
busy-check generate-framework ./business-processes/ -o ./generated-processes/
```

### **4. Use the Generated Code**
```typescript
import { CustomerOnboardingProcess } from './generated-processes';

const process = new CustomerOnboardingProcess();
const context = {
  processId: 'onboarding-001',
  userId: 'user-123',
  businessContext: { industry: 'fintech', size: 'startup' },
  permissions: { canSkipSteps: true, canOverrideValidation: true }
};

const result = await process.execute(context);
```

---

## 🧠 **Key Technical Concepts**

### **Layer-First Architecture**
- **L0 (Operational)**: Day-to-day business processes and task execution
- **L1 (Management)**: Process coordination, resource allocation, and performance monitoring  
- **L2 (Strategic)**: Long-term planning, governance, and organizational alignment

### **Immutable State Management**
```typescript
// All process changes tracked through events—never rewrite history
class ProcessState {
  readonly history: ProcessEvent[];           // Complete event log
  readonly currentStep: string;               // Current execution state
  readonly stepData: Map<string, StepData>;   // All step outputs
  readonly exceptions: ProcessException[];    // Tracked deviations
}
```

### **Three Step Types**
```typescript
// Human interaction with flexible UI
class HumanStep extends Step {
  model: FormModel;      // Generated form fields
  view: ComponentDef;    // UI component configuration
  // Users can always skip or provide manual data
}

// AI-powered analysis and decision making
class AgentStep extends Step {  
  prompt: AgentPrompt;   // AI system and user prompts
  context: AgentContext; // Business context for AI
  // Always includes human review capability
}

// Automated processing with override capability  
class AlgorithmStep extends Step {
  implementation: AlgorithmConfig; // Code or service integration
  parameters: AlgorithmParams;     // Configuration parameters
  // Users can always provide manual results
}
```

### **AI-Powered Flexibility**
- **Content Analysis**: Automatic field generation from business process descriptions
- **Exception Analysis**: AI evaluates impact of process deviations and suggests mitigations
- **Context Assembly**: Intelligent data flow between steps with relevance scoring
- **Escape Hatches**: AI helps users work around constraints while maintaining audit trail

---

## 📁 **Project Structure**

```
busy-lang/
├── compiler/                 # BUSY language compiler and CLI tools
│   ├── src/cli/             # Command-line interface (validate, analyze, generate-framework)
│   ├── src/core/            # Scanner, parser, AST builder
│   ├── src/analysis/        # Semantic analysis and validation
│   ├── src/generators/      # Code generation (framework, runtime, database)
│   └── docs/                # Compiler documentation
├── packages/
│   └── orgata-framework/    # TypeScript framework for business processes
│       ├── src/core/        # Process, Step classes
│       ├── src/state/       # Immutable state management
│       └── src/types/       # Complete type definitions
├── examples/                # Real-world business process examples  
│   └── solo-photography-business/
├── design-docs/             # Comprehensive architecture documentation
│   ├── 001-initial-specification/
│   ├── 008-orgata-framework/    # Latest framework architecture
│   └── ARCHITECTURE_OVERVIEW.md
├── knit/                    # Dependency reconciliation system
├── orgata-ide/              # Web-based IDE for business process development
└── generated-framework-test/ # Example generated framework code
```

---

## 🛠️ **Development Tools**

### **BUSY Compiler Commands**
```bash
# Validate business process definitions
busy-check validate ./business-processes/

# Comprehensive analysis with quality metrics
busy-check analyze ./business-processes/ --detailed

# Generate TypeScript framework code  
busy-check generate-framework ./business-processes/ -o ./output/

# Generate full React application
busy-check generate-runtime ./business-processes/ -o ./app/

# Watch for changes and validate continuously
busy-check watch ./business-processes/
```

### **Framework Development**
```bash
# Install framework for generated code
npm install @orgata/framework

# Build generated business processes
cd generated-processes/
npm run build

# Run tests on business process logic
npm run test

# Lint generated TypeScript code
npm run lint
```

---

## 🎯 **Use Cases**

### **Enterprise Operations**
- **Customer Onboarding**: Multi-step workflows with compliance checks
- **Procurement Processes**: Vendor selection with approval workflows
- **Quality Assurance**: Systematic testing and validation procedures
- **Incident Response**: Structured escalation with automated notifications

### **Professional Services**
- **Client Engagement**: From inquiry to project delivery
- **Project Management**: Milestone tracking with stakeholder communication
- **Compliance Reporting**: Audit trail generation and regulatory submission
- **Knowledge Management**: Process documentation with version control

### **Creative Industries**  
- **Production Workflows**: From concept to final delivery
- **Client Communication**: Structured touchpoints and feedback collection
- **Resource Coordination**: Equipment, location, and team scheduling
- **Portfolio Management**: Project tracking and outcome analysis

---

## 🔧 **Advanced Features**

### **Knit System** - Dependency Reconciliation
```bash
# Automatically track dependencies between business processes
knit reconcile --all-dependencies
```
- **Cross-Process Dependencies**: Automatic detection and reconciliation
- **Version Management**: Track changes across related business processes  
- **Impact Analysis**: Understand downstream effects of process modifications

### **Business Intelligence Integration**
- **Performance Metrics**: Built-in analytics for process efficiency
- **Exception Analysis**: Pattern recognition in process deviations
- **Resource Optimization**: Data-driven insights for resource allocation
- **Predictive Analytics**: AI-powered forecasting of process outcomes

### **Multi-Tenant Architecture**
- **Organization Isolation**: Secure separation of business processes
- **Role-Based Access**: Granular permissions for process execution
- **Audit Compliance**: Comprehensive logging for regulatory requirements
- **Scalable Infrastructure**: From single-user to enterprise deployment

---

## 📚 **Documentation**

- **[Language Reference](./compiler/docs/BUSY_LANGUAGE_REFERENCE.md)** - Complete BUSY syntax and semantics
- **[Framework API](./packages/orgata-framework/README.md)** - TypeScript framework documentation  
- **[Architecture Overview](./design-docs/ARCHITECTURE_OVERVIEW.md)** - System design and component interaction
- **[Getting Started Guide](./examples/README.md)** - Tutorial with real-world examples
- **[Compiler Documentation](./compiler/docs/README.md)** - Development tools and advanced usage

---

## 🤝 **Contributing**

We welcome contributions to the BUSY ecosystem! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:

- **Code Standards**: TypeScript, testing, and documentation requirements
- **Design Process**: RFC process for major features and architectural changes  
- **Development Workflow**: Git flow, testing, and review procedures
- **Community Guidelines**: Code of conduct and communication expectations

---

## 📄 **License**

BUSY Language is open source software licensed under the [MIT License](./LICENSE).

---

## 🎉 **Latest Achievement**

**🚀 Framework Transformation Complete!** We've successfully transformed from YAML string generation to a complete React-like TypeScript framework. BUSY files now compile to professional TypeScript code that provides:

- ✅ **Complete User Flexibility** - Skip steps, provide manual data, go back to any point
- ✅ **Type-Safe Business Logic** - Full TypeScript support with IDE integration  
- ✅ **Immutable State Management** - Event sourcing with complete audit trail
- ✅ **AI-Powered Intelligence** - Smart assistance with human oversight
- ✅ **Production Ready** - Generated code compiles and runs successfully

**Try it now:** `busy-check generate-framework ./examples/solo-photography-business/L0/client-operations/playbooks/`

---

*Built with ❤️ for organizations that want to bring software engineering excellence to their business processes.*