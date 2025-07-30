# Compilation from BUSY to Runtime Objects

This document details how BUSY specifications are compiled into executable Orgata runtime objects.

## Compilation Pipeline

```
BUSY Files → Parser → AST → RuntimeCompiler → Runtime Objects
```

## Input: BUSY Specification

```yaml
# customer-onboarding.busy
playbook:
  name: "customer-onboarding"
  description: "Complete customer onboarding process"
  steps:
    - name: "collect-information"
      method:
        - "Present customer information form"
        - "Validate required fields are complete"
        - "Store customer data securely"
      execution_type: "human"
      
    - name: "verify-identity"
      method:
        - "Check customer ID against database"
        - "Validate identity documents"
        - "Flag any discrepancies for review"
      execution_strategy:
        modes: ["algorithm", "agent", "human"]
        fallback_rules:
          - from: "algorithm"
            to: "agent"
            when: "confidence < 0.8"
          - from: "agent"
            to: "human"
            when: "manual_review_required"
      
    - name: "setup-account"
      method:
        - "Generate unique account number"
        - "Create initial account settings"
        - "Send welcome email with credentials"
      execution_type: "algorithm"
```

## Output: Runtime Object Structure

```typescript
// Generated runtime structure
const customerOnboardingRuntime = {
  // Core operations
  operations: new Map([
    ['collect-information', collectInformationOperation],
    ['verify-identity', verifyIdentityOrgataOperation],
    ['setup-account', setupAccountOperation],
    ['customer-onboarding-flow', flowControllerOperation]
  ]),
  
  // Main process
  process: customerOnboardingProcess,
  
  // Shared context
  context: sharedProcessContext
};
```

## Compilation Stages

### 1. AST Generation

```typescript
interface PlaybookAST {
  name: string;
  description: string;
  steps: StepAST[];
}

interface StepAST {
  name: string;
  method: string[];
  executionType?: 'human' | 'algorithm' | 'agent';
  executionStrategy?: StrategyAST;
}

interface StrategyAST {
  modes: ('algorithm' | 'agent' | 'human')[];
  fallbackRules: FallbackRuleAST[];
}
```

### 2. Implementation Generation

The compiler generates Implementation classes based on execution type and method steps:

```typescript
// For "collect-information" step
class CollectInformationImplementation implements Implementation<CustomerInfo, CustomerData> {
  async execute(input: CustomerInfo, resources: InjectedResources): Promise<CustomerData> {
    const uiService = resources.capabilities.get('ui-service') as UIService;
    
    // Present customer information form
    const form = new CustomerInformationForm();
    const formData = await uiService.presentForm(form);
    
    // Validate required fields are complete
    const validation = this.validateRequiredFields(formData);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    // Store customer data securely
    const storage = resources.capabilities.get('secure-storage') as SecureStorage;
    const customerId = await storage.store(formData);
    
    return {
      customerId,
      customerData: formData,
      timestamp: new Date()
    };
  }
  
  private validateRequiredFields(data: any): ValidationResult {
    // Generated validation logic
    const required = ['name', 'email', 'phone', 'address'];
    const missing = required.filter(field => !data[field]);
    
    return {
      isValid: missing.length === 0,
      errors: missing.map(field => new ValidationError(`Missing required field: ${field}`))
    };
  }
}

// For "verify-identity" step (OrgataOperation with multiple modes)
class VerifyIdentityAlgorithmImplementation implements Implementation<CustomerData, IdentityVerification> {
  async execute(input: CustomerData, resources: InjectedResources): Promise<IdentityVerification> {
    const idChecker = resources.capabilities.get('id-checker') as IDChecker;
    
    // Check customer ID against database
    const dbResult = await idChecker.verifyAgainstDatabase(input.customerData.id);
    
    // Validate identity documents
    const docResult = await idChecker.validateDocuments(input.customerData.documents);
    
    // Flag any discrepancies for review
    const discrepancies = this.findDiscrepancies(dbResult, docResult);
    const confidence = this.calculateConfidence(dbResult, docResult, discrepancies);
    
    if (confidence < 0.8) {
      throw new LowConfidenceError(`Identity verification confidence: ${confidence}`);
    }
    
    return {
      verified: true,
      confidence,
      discrepancies,
      method: 'algorithm'
    };
  }
  
  private findDiscrepancies(dbResult: any, docResult: any): string[] {
    // Generated discrepancy detection logic
    const discrepancies = [];
    if (dbResult.name !== docResult.name) discrepancies.push('Name mismatch');
    if (dbResult.birthDate !== docResult.birthDate) discrepancies.push('Birth date mismatch');
    return discrepancies;
  }
  
  private calculateConfidence(dbResult: any, docResult: any, discrepancies: string[]): number {
    // Generated confidence calculation
    let confidence = 1.0;
    confidence -= discrepancies.length * 0.2;
    confidence = Math.max(0, Math.min(1, confidence));
    return confidence;
  }
}

class VerifyIdentityAgentImplementation implements Implementation<CustomerData, IdentityVerification> {
  async execute(input: CustomerData, resources: InjectedResources): Promise<IdentityVerification> {
    const aiService = resources.capabilities.get('ai-service') as AIService;
    
    const prompt = `
Verify the identity of this customer:
Name: ${input.customerData.name}
ID: ${input.customerData.id}
Documents: ${JSON.stringify(input.customerData.documents)}

Compare against database record and document images.
Identify any discrepancies and provide confidence score (0-1).
Flag for manual review if necessary.

Respond in JSON format: {
  "verified": boolean,
  "confidence": number,
  "discrepancies": string[],
  "manualReviewRequired": boolean,
  "reasoning": string
}`;

    const response = await aiService.complete({
      prompt,
      context: input,
      model: 'gpt-4'
    });
    
    const result = JSON.parse(response);
    
    if (result.manualReviewRequired) {
      throw new ManualReviewRequiredError(result.reasoning);
    }
    
    return {
      ...result,
      method: 'agent'
    };
  }
}

class VerifyIdentityHumanImplementation implements Implementation<CustomerData, IdentityVerification> {
  async execute(input: CustomerData, resources: InjectedResources): Promise<IdentityVerification> {
    const uiService = resources.capabilities.get('ui-service') as UIService;
    
    const reviewForm = new IdentityReviewForm({
      customerData: input.customerData,
      fields: [
        { name: 'verified', type: 'boolean', label: 'Identity Verified' },
        { name: 'confidence', type: 'number', label: 'Confidence (0-1)', min: 0, max: 1 },
        { name: 'discrepancies', type: 'array', label: 'Discrepancies Found' },
        { name: 'notes', type: 'text', label: 'Review Notes' }
      ]
    });
    
    const result = await uiService.presentFormAndWait(reviewForm);
    
    return {
      ...result,
      method: 'human'
    };
  }
}

// For "setup-account" step
class SetupAccountImplementation implements Implementation<IdentityVerification, AccountSetup> {
  async execute(input: IdentityVerification, resources: InjectedResources): Promise<AccountSetup> {
    if (!input.verified) {
      throw new Error('Cannot setup account: identity not verified');
    }
    
    const accountService = resources.capabilities.get('account-service') as AccountService;
    const emailService = resources.capabilities.get('email-service') as EmailService;
    
    // Generate unique account number
    const accountNumber = await accountService.generateAccountNumber();
    
    // Create initial account settings
    const account = await accountService.createAccount({
      accountNumber,
      customerId: input.customerId,
      status: 'active',
      settings: {
        notifications: true,
        paperlessStatements: false,
        overdraftProtection: false
      }
    });
    
    // Send welcome email with credentials
    const credentials = await accountService.generateCredentials(accountNumber);
    await emailService.sendWelcomeEmail({
      to: input.customerData.email,
      accountNumber,
      credentials,
      template: 'customer-welcome'
    });
    
    return {
      accountNumber,
      accountId: account.id,
      credentialsSent: true,
      setupComplete: true
    };
  }
}
```

### 3. Operation Creation

```typescript
class RuntimeCompiler {
  compilePlaybook(ast: PlaybookAST, rootContext: Context): Process {
    const operations: Operation[] = [];
    
    // Compile each step to Operation(s)
    for (const step of ast.steps) {
      const operation = this.compileStep(step, rootContext);
      operations.push(operation);
    }
    
    // Create flow controller operation
    const flowController = this.createFlowController(ast, operations, rootContext);
    
    // Create Process
    return new Process(
      ast.name,
      ast.description,
      this.inferInputSchema(ast),
      this.inferOutputSchema(ast),
      operations,
      this.createFlowDefinition(ast),
      rootContext
    );
  }
  
  private compileStep(step: StepAST, context: Context): Operation {
    if (step.executionStrategy) {
      // Create OrgataOperation with multiple modes
      return this.createOrgataOperation(step, context);
    } else {
      // Create simple Operation
      return this.createSimpleOperation(step, context);
    }
  }
  
  private createSimpleOperation(step: StepAST, context: Context): Operation {
    const implementation = this.generateImplementation(step);
    
    return new Operation(
      step.name,
      `Generated operation for ${step.name}`,
      this.inferInputSchema(step),
      this.inferOutputSchema(step),
      implementation,
      context
    );
  }
  
  private createOrgataOperation(step: StepAST, context: Context): OrgataOperation {
    const implementations: { [key: string]: Implementation } = {};
    
    // Generate implementations for each mode
    if (step.executionStrategy.modes.includes('algorithm')) {
      implementations.algorithm = this.generateAlgorithmImplementation(step);
    }
    if (step.executionStrategy.modes.includes('agent')) {
      implementations.agent = this.generateAgentImplementation(step);
    }
    if (step.executionStrategy.modes.includes('human')) {
      implementations.human = this.generateHumanImplementation(step);
    }
    
    const strategy = this.createControlStrategy(step.executionStrategy);
    
    return new OrgataOperation(
      step.name,
      `Generated OrgataOperation for ${step.name}`,
      this.inferInputSchema(step),
      this.inferOutputSchema(step),
      implementations,
      strategy,
      context
    );
  }
  
  private generateImplementation(step: StepAST): Implementation {
    // Use AI to convert method steps to code
    return new GeneratedImplementation(step.method, step.executionType);
  }
  
  private createFlowController(ast: PlaybookAST, operations: Operation[], context: Context): Operation {
    const flowImplementation = new SequentialFlowImplementation(
      operations.map(op => op.name)
    );
    
    return new Operation(
      `${ast.name}-flow`,
      `Flow controller for ${ast.name}`,
      this.inferInputSchema(ast),
      this.inferOutputSchema(ast),
      flowImplementation,
      context
    );
  }
}
```

### 4. Context and Infrastructure Setup

```typescript
class RuntimeBootstrap {
  createRuntimeEnvironment(playbook: PlaybookAST): RuntimeEnvironment {
    // Create infrastructure services
    const infrastructure = new InfrastructureServices({
      logger: new ConsoleLogger(),
      auth: new RoleBasedAuthService(),
      persistence: new SQLitePersistenceService(),
      messaging: new InMemoryMessagingService(),
      resourceInjector: new DependencyInjector()
    });
    
    // Create root context
    const rootContext = new ProductionContext(
      new Map(), // Capabilities added during compilation
      infrastructure
    );
    
    // Register base capabilities
    this.registerBaseCapabilities(rootContext);
    
    // Compile playbook
    const compiler = new RuntimeCompiler();
    const process = compiler.compilePlaybook(playbook, rootContext);
    
    return {
      process,
      rootContext,
      infrastructure
    };
  }
  
  private registerBaseCapabilities(context: Context): void {
    // Register infrastructure capabilities
    context.capabilities.set('ui-service', new WebUIService());
    context.capabilities.set('ai-service', new OpenAIService());
    context.capabilities.set('secure-storage', new EncryptedStorage());
    context.capabilities.set('id-checker', new IdentityVerificationService());
    context.capabilities.set('account-service', new BankingAccountService());
    context.capabilities.set('email-service', new SMTPEmailService());
  }
}
```

## Generated Code Structure

```
generated/
├── implementations/
│   ├── CollectInformationImplementation.ts
│   ├── VerifyIdentityAlgorithmImplementation.ts
│   ├── VerifyIdentityAgentImplementation.ts
│   ├── VerifyIdentityHumanImplementation.ts
│   └── SetupAccountImplementation.ts
├── operations/
│   ├── collectInformationOperation.ts
│   ├── verifyIdentityOrgataOperation.ts
│   └── setupAccountOperation.ts
├── processes/
│   └── customerOnboardingProcess.ts
└── runtime.ts (bootstrap and main entry point)
```

## Key Compilation Decisions

1. **Method Steps → Code**: Natural language steps are converted to executable code using AI assistance or template matching

2. **Execution Strategy → Operation Type**: 
   - Single mode → Simple Operation
   - Multiple modes → OrgataOperation with strategy

3. **Schema Inference**: Input/output schemas inferred from method steps and data flow

4. **Resource Dependencies**: Capabilities automatically injected based on method step analysis

5. **Flow Control**: Sequential flow by default, with conditional branching based on step definitions

This compilation approach transforms business-friendly BUSY specifications into production-ready, type-safe runtime objects while maintaining the clean separation between business logic (Implementation) and infrastructure concerns (Context).