# BUSY Language - Business Organizations as Code

**Transform business processes into executable, type-safe code with complete flexibility and AI-powered assistance.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](#)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](#)

---

## 📚 New to BUSY?

**Start with our comprehensive documentation in the `/docs` folder:**

- **[Introduction](./docs/INTRODUCTION.md)** - The business process problem and our solution
- **[Why BUSY Exists](./docs/WHY_BUSY_EXISTS.md)** - Philosophy and core principles
- **[The Entrepreneurial Journey](./docs/THE_ENTREPRENEURIAL_JOURNEY.md)** - Breaking down knowledge barriers
- **[The Marketplace Vision](./docs/THE_MARKETPLACE_VISION.md)** - App store for business expertise

---

## 🌟 **What is BUSY?**

BUSY is a complete ecosystem for describing business processes as code, then executing them with full human control and AI assistance. It consists of:

1. **BUSY Language** - Human-readable YAML for describing business processes
2. **BUSY Compiler** - Transforms BUSY files into TypeScript framework code
3. **Orgata Framework** - React-like framework for business process execution
4. **Orgata Runtime** - Process execution engine with UI and AI orchestration

### **Core Philosophy: "Facilitate, Never Constrain"**

Every feature follows this principle - humans maintain complete control while AI assists intelligently.


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

## 🧠 **Key Concepts**

BUSY transforms business process descriptions into executable TypeScript code using the Orgata Framework:

- **Layer-First Architecture**: L0 (Operational), L1 (Management), L2 (Strategic)
- **Three Step Types**: HumanStep (UI forms), AgentStep (AI processing), AlgorithmStep (automation)
- **Immutable State**: Complete audit trail with event sourcing
- **Universal Flexibility**: Skip any step, go back, provide manual data at any point

For detailed technical documentation, see [Orgata Framework Architecture](./design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md).

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

### Marketing & Vision
- **[Introduction](./docs/INTRODUCTION.md)** - The business process problem and our solution
- **[Why BUSY Exists](./docs/WHY_BUSY_EXISTS.md)** - Philosophy and core principles
- **[The Entrepreneurial Journey](./docs/THE_ENTREPRENEURIAL_JOURNEY.md)** - Breaking down knowledge barriers
- **[The Marketplace Vision](./docs/THE_MARKETPLACE_VISION.md)** - App store for business expertise

### Technical Documentation  
- **[Framework API](./packages/orgata-framework/README.md)** - TypeScript framework documentation
- **[Architecture Overview](./design-docs/ARCHITECTURE_OVERVIEW.md)** - System design and component interaction
- **[Orgata Framework Architecture](./design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md)** - Latest framework design

---

## 📄 **License**

BUSY Language is open source software licensed under the [GNU GPL v3 Liscense](./LICENSE).

---

## 🎉 **Latest Achievement**

**🚀 Framework Transformation Complete!** BUSY files now compile to TypeScript code using the Orgata Framework, providing complete user flexibility, type safety, and AI assistance.

See the [generated framework example](./generated-framework-test/) for working code.