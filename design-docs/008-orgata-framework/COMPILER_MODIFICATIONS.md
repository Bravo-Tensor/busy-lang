# BUSY Compiler Modifications for Framework Output

**Created**: July 2025  
**Status**: Implementation Specification  
**Scope**: Detailed modifications needed to transform BUSY compiler from YAML generation to TypeScript framework code generation

## Overview

This document outlines the specific changes needed to modify the existing BUSY compiler to generate TypeScript framework code instead of YAML configuration files.

## Current Compiler Architecture Analysis

### Existing Pipeline

Looking at the current compiler structure:

```
compiler/src/
├── core/
│   ├── scanner.ts      # File discovery and tokenization
│   ├── parser.ts       # YAML parsing and validation
│   └── builder.ts      # AST construction
├── ast/
│   └── builder.ts      # AST node creation
├── symbols/
│   └── table.ts        # Symbol table management
├── cli/
│   └── types.ts        # CLI interface types
└── index.ts           # Public API
```

**Current Flow**: BUSY Files → Scanner → Parser → AST → Symbol Table → CLI Output

**Target Flow**: BUSY Files → Scanner → Parser → AST → Content Analyzer → Code Generator → TypeScript Output

## Required Modifications

### 1. New Code Generation Pipeline

#### Add Content Analysis Phase

```typescript
// compiler/src/analysis/content-analyzer.ts
export class ContentAnalyzer {
  async analyzeProcess(ast: BusyAST): Promise<ProcessAnalysis> {
    return {
      processMetadata: this.extractProcessMetadata(ast),
      steps: await this.analyzeSteps(ast.steps),
      dependencies: this.analyzeDependencies(ast),
      businessRules: this.extractBusinessRules(ast)
    };
  }
  
  private async analyzeSteps(steps: StepNode[]): Promise<StepAnalysis[]> {
    return Promise.all(steps.map(step => this.analyzeStep(step)));
  }
  
  private async analyzeStep(step: StepNode): Promise<StepAnalysis> {
    // Use LLM or rule-based system to analyze step descriptions
    const analysis = await this.extractStepMetadata(step);
    
    return {
      stepType: this.determineStepType(step, analysis),
      dataRequirements: this.extractDataRequirements(step.description),
      uiHints: this.generateUIHints(step.description),
      businessLogic: this.extractBusinessLogic(step.description),
      validationRules: this.extractValidationRules(step),
      complexity: this.assessComplexity(step)
    };
  }
  
  private determineStepType(step: StepNode, analysis: any): StepType {
    // Determine if step should be Human, Agent, or Algorithm
    if (step.type) return step.type; // Explicit in BUSY file
    
    // Infer from description analysis
    if (analysis.requiresUserInput) return 'human';
    if (analysis.requiresAIAnalysis) return 'agent';
    if (analysis.requiresCalculation) return 'algorithm';
    
    return 'human'; // Default fallback
  }
}
```

#### Add Code Generation Phase

```typescript
// compiler/src/generation/code-generator.ts
export class FrameworkCodeGenerator {
  constructor(
    private templateEngine: TemplateEngine,
    private contentAnalyzer: ContentAnalyzer
  ) {}
  
  async generateProcess(analysis: ProcessAnalysis): Promise<GeneratedFiles> {
    const files = new Map<string, string>();
    
    // Generate main process class
    const processCode = await this.generateProcessClass(analysis);
    files.set(`${analysis.processMetadata.fileName}Process.ts`, processCode);
    
    // Generate step classes
    for (const stepAnalysis of analysis.steps) {
      const stepCode = await this.generateStepClass(stepAnalysis);
      files.set(`steps/${stepAnalysis.fileName}.ts`, stepCode);
    }
    
    // Generate supporting files
    files.set('index.ts', await this.generateIndexFile(analysis));
    files.set('types.ts', await this.generateTypesFile(analysis));
    
    return { files, metadata: this.generateMetadata(analysis) };
  }
  
  private async generateProcessClass(analysis: ProcessAnalysis): Promise<string> {
    const template = await this.templateEngine.loadTemplate('process.hbs');
    
    return this.templateEngine.render(template, {
      className: analysis.processMetadata.className,
      name: analysis.processMetadata.name,
      description: analysis.processMetadata.description,
      layer: analysis.processMetadata.layer,
      estimatedDuration: analysis.processMetadata.estimatedDuration,
      steps: analysis.steps.map(step => ({
        className: step.className,
        fileName: step.fileName
      })),
      busyFilePath: analysis.processMetadata.sourceFile,
      generatedAt: new Date().toISOString()
    });
  }
  
  private async generateStepClass(stepAnalysis: StepAnalysis): Promise<string> {
    const templateName = `${stepAnalysis.stepType}-step.hbs`;
    const template = await this.templateEngine.loadTemplate(templateName);
    
    return this.templateEngine.render(template, {
      className: stepAnalysis.className,
      id: stepAnalysis.id,
      name: stepAnalysis.name,
      description: stepAnalysis.description,
      ...this.generateStepSpecificData(stepAnalysis)
    });
  }
  
  private generateStepSpecificData(stepAnalysis: StepAnalysis): any {
    switch (stepAnalysis.stepType) {
      case 'human':
        return this.generateHumanStepData(stepAnalysis);
      case 'agent':
        return this.generateAgentStepData(stepAnalysis);
      case 'algorithm':
        return this.generateAlgorithmStepData(stepAnalysis);
      default:
        throw new Error(`Unknown step type: ${stepAnalysis.stepType}`);
    }
  }
}
```

### 2. Enhanced AST Node Types

#### Extend Existing AST Types

```typescript
// compiler/src/ast/nodes.ts (additions to existing file)

// Extend existing ProcessNode
export interface ProcessNode extends BaseNode {
  // ... existing properties
  
  // New properties for framework generation
  framework?: FrameworkConfig;
  customMethods?: CustomMethodNode[];
  businessRules?: BusinessRuleNode[];
}

// Extend existing StepNode  
export interface StepNode extends BaseNode {
  // ... existing properties
  
  // Enhanced properties for code generation
  stepType?: 'human' | 'agent' | 'algorithm';
  contentAnalysis?: StepContentAnalysis;
  generatedFields?: GeneratedField[];
  uiHints?: UIHint[];
  businessLogic?: BusinessLogicHint[];
}

// New node types for framework generation
export interface FrameworkConfig {
  customValidation?: ValidationRule[];
  permissions?: PermissionRule[];
  auditLevel?: 'basic' | 'detailed' | 'comprehensive';
}

export interface CustomMethodNode extends BaseNode {
  name: string;
  parameters: ParameterNode[];
  returnType: string;
  implementation?: string;
}

export interface BusinessRuleNode extends BaseNode {
  condition: string;
  action: string;
  priority: number;
}

export interface GeneratedField {
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  validation?: ValidationRule[];
  derivedFrom: string; // Which part of description generated this
}

export interface UIHint {
  component: string;
  layout: string;
  styling?: Record<string, any>;
  behavior?: Record<string, any>;
}

export interface BusinessLogicHint {
  type: 'calculation' | 'validation' | 'transformation' | 'analysis';
  description: string;
  suggestedImplementation?: string;
  complexity: 'simple' | 'moderate' | 'complex';
}
```

### 3. Modified Compiler Entry Point

#### Update Main Compiler Class

```typescript
// compiler/src/index.ts (modifications to existing)

export class BusyCompiler {
  private config: CompilerConfig;
  private contentAnalyzer: ContentAnalyzer;
  private codeGenerator: FrameworkCodeGenerator;
  
  constructor(config?: Partial<CompilerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contentAnalyzer = new ContentAnalyzer(this.config);
    this.codeGenerator = new FrameworkCodeGenerator(
      new TemplateEngine(),
      this.contentAnalyzer
    );
  }
  
  /**
   * Compile BUSY repository to framework code
   */
  async compileToFramework(sourcePath: string, outputPath: string): Promise<FrameworkCompilationResult> {
    // Phase 1: Scan and Parse (existing)
    const scanner = new Scanner(this.config);
    const scanResult = await scanner.scan(sourcePath);
    
    const parser = new Parser(this.config);
    const parseResult = await parser.parse(scanResult);
    
    // Phase 2: Build AST (existing)
    const astBuilder = new ASTBuilder();
    const buildResult = await astBuilder.build(parseResult);
    
    // Phase 3: Content Analysis (new)
    const analysisResults: ProcessAnalysis[] = [];
    for (const busyFile of buildResult.busyFiles) {
      const analysis = await this.contentAnalyzer.analyzeProcess(busyFile.ast);
      analysisResults.push(analysis);
    }
    
    // Phase 4: Code Generation (new)
    const generationResults: GeneratedFiles[] = [];
    for (const analysis of analysisResults) {
      const generated = await this.codeGenerator.generateProcess(analysis);
      generationResults.push(generated);
      
      // Write generated files to output directory
      await this.writeGeneratedFiles(generated, outputPath);
    }
    
    return {
      scanResult,
      parseResult, 
      buildResult,
      analysisResults,
      generationResults,
      summary: this.createFrameworkSummary(generationResults)
    };
  }
  
  private async writeGeneratedFiles(generated: GeneratedFiles, outputPath: string): Promise<void> {
    for (const [filePath, content] of generated.files) {
      const fullPath = path.join(outputPath, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }
}
```

### 4. Template Engine Integration

#### Handlebars Template System

```typescript
// compiler/src/generation/template-engine.ts
export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private templateCache: Map<string, HandlebarsTemplateDelegate>;
  
  constructor() {
    this.handlebars = Handlebars.create();
    this.templateCache = new Map();
    this.registerHelpers();
  }
  
  private registerHelpers(): void {
    // Custom helpers for code generation
    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    });
    
    this.handlebars.registerHelper('pascalCase', (str: string) => {
      return str.replace(/(^|-)([a-z])/g, (g) => g.slice(-1).toUpperCase());
    });
    
    this.handlebars.registerHelper('jsonValue', (value: any) => {
      return JSON.stringify(value, null, 2);
    });
    
    this.handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toISOString();
    });
    
    // Framework-specific helpers
    this.handlebars.registerHelper('fieldType', (type: string) => {
      const typeMap: Record<string, string> = {
        'text': 'FieldType.TEXT',
        'email': 'FieldType.EMAIL',
        'number': 'FieldType.NUMBER',
        'date': 'FieldType.DATE',
        'textarea': 'FieldType.TEXTAREA',
        'select': 'FieldType.SELECT',
        'currency': 'FieldType.CURRENCY'
      };
      return typeMap[type] || 'FieldType.TEXT';
    });
  }
  
  async loadTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }
    
    const templatePath = path.join(__dirname, '../templates', name);
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = this.handlebars.compile(templateSource);
    
    this.templateCache.set(name, template);
    return template;
  }
  
  render(template: HandlebarsTemplateDelegate, context: any): string {
    return template(context);
  }
}
```

### 5. CLI Interface Updates

#### Enhanced CLI Commands

```typescript
// compiler/src/cli/commands.ts (new file)
export class FrameworkCliCommands {
  async generateCommand(args: GenerateCommandArgs): Promise<void> {
    const compiler = new BusyCompiler(args.config);
    
    console.log(`🔄 Compiling BUSY files to Orgata Framework...`);
    console.log(`Source: ${args.sourcePath}`);
    console.log(`Output: ${args.outputPath}`);
    
    const result = await compiler.compileToFramework(args.sourcePath, args.outputPath);
    
    if (result.summary.success) {
      console.log(`✅ Generated ${result.summary.processCount} processes`);
      console.log(`📁 ${result.summary.fileCount} files created`);
      console.log(`⏱️  Compilation completed in ${result.summary.duration}ms`);
      
      if (args.verbose) {
        this.printDetailedResults(result);
      }
    } else {
      console.error(`❌ Compilation failed`);
      result.summary.errors.forEach(error => {
        console.error(`   ${error}`);
      });
      process.exit(1);
    }
  }
  
  async watchCommand(args: WatchCommandArgs): Promise<void> {
    const compiler = new BusyCompiler(args.config);
    const watcher = new FileWatcher(args.sourcePath);
    
    console.log(`👁️  Watching for changes in ${args.sourcePath}...`);
    
    watcher.on('change', async (changedFiles: string[]) => {
      console.log(`🔄 Detected changes, recompiling...`);
      
      try {
        await compiler.compileToFramework(args.sourcePath, args.outputPath);
        console.log(`✅ Recompilation complete`);
      } catch (error) {
        console.error(`❌ Recompilation failed:`, error);
      }
    });
  }
}
```

#### Update Package Scripts

```json
// compiler/package.json additions
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "generate": "node dist/cli.js generate",
    "watch": "node dist/cli.js watch"
  },
  "bin": {
    "busy-compile": "./dist/cli.js"
  }
}
```

### 6. Configuration Extensions

#### Enhanced Compiler Config

```typescript
// compiler/src/config/types.ts (additions to existing)
export interface CompilerConfig {
  // ... existing properties
  
  // New framework generation options
  framework: FrameworkGenerationConfig;
  templates: TemplateConfig;
  output: OutputConfig;
}

export interface FrameworkGenerationConfig {
  packageName: string;
  outputFormat: 'typescript' | 'javascript';
  includeTests: boolean;
  includeDocs: boolean;
  customTemplatesPath?: string;
  contentAnalysis: ContentAnalysisConfig;
}

export interface ContentAnalysisConfig {
  enabled: boolean;
  provider: 'rule-based' | 'llm' | 'hybrid';
  llmConfig?: {
    model: string;
    apiKey?: string;
    maxTokens: number;
  };
  rules: AnalysisRule[];
}

export interface TemplateConfig {
  customTemplatesPath?: string;
  templateVariables?: Record<string, any>;
  helpers?: Record<string, Function>;
}

export interface OutputConfig {
  baseDirectory: string;
  fileNaming: 'kebab-case' | 'camelCase' | 'PascalCase';
  includeSourceMaps: boolean;
  formatting: FormattingConfig;
}

export interface FormattingConfig {
  prettier: boolean;
  eslint: boolean;
  customPrettierConfig?: Record<string, any>;
}
```

### 7. Error Handling and Validation

#### Framework-Specific Validation

```typescript
// compiler/src/validation/framework-validator.ts
export class FrameworkValidator {
  validateGeneratedCode(generatedFiles: GeneratedFiles): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const [filePath, content] of generatedFiles.files) {
      // TypeScript compilation check
      const tsErrors = this.validateTypeScript(content, filePath);
      errors.push(...tsErrors);
      
      // Framework API usage validation
      const frameworkErrors = this.validateFrameworkUsage(content, filePath);
      errors.push(...frameworkErrors);
      
      // Code quality checks
      const qualityWarnings = this.checkCodeQuality(content, filePath);
      warnings.push(...qualityWarnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private validateTypeScript(code: string, filePath: string): ValidationError[] {
    // Use TypeScript compiler API to validate generated code
    // Return compilation errors if any
  }
  
  private validateFrameworkUsage(code: string, filePath: string): ValidationError[] {
    // Check for correct framework API usage
    // Validate required method implementations
    // Check configuration object structures
  }
}
```

## Testing Strategy

### Unit Tests for New Components

```typescript
// compiler/src/__tests__/content-analyzer.test.ts
describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;
  
  beforeEach(() => {
    analyzer = new ContentAnalyzer(DEFAULT_CONFIG);
  });
  
  test('should determine step type from description', async () => {
    const step: StepNode = {
      id: 'test-step',
      name: 'Test Step',
      description: 'Collect client email address and phone number',
      type: BaseNodeType.STEP
    };
    
    const analysis = await analyzer.analyzeStep(step);
    
    expect(analysis.stepType).toBe('human');
    expect(analysis.dataRequirements).toContainEqual(
      expect.objectContaining({
        name: 'contactEmail',
        type: 'email',
        required: true
      })
    );
  });
});

// compiler/src/__tests__/code-generator.test.ts
describe('FrameworkCodeGenerator', () => {
  let generator: FrameworkCodeGenerator;
  
  test('should generate valid process class', async () => {
    const analysis: ProcessAnalysis = {
      processMetadata: {
        name: 'Test Process',
        className: 'TestProcess',
        fileName: 'test-process'
      },
      steps: []
    };
    
    const result = await generator.generateProcess(analysis);
    
    expect(result.files.has('TestProcess.ts')).toBe(true);
    
    const processCode = result.files.get('TestProcess.ts')!;
    expect(processCode).toContain('export class TestProcess extends Process');
    expect(processCode).toContain('constructor()');
  });
});
```

### Integration Tests

```typescript
// compiler/src/__tests__/integration/full-compilation.test.ts
describe('Full Compilation Integration', () => {
  test('should compile complete BUSY project to framework code', async () => {
    const compiler = new BusyCompiler();
    const tempDir = await createTempDirectory();
    
    // Copy test BUSY files
    await copyTestFiles(tempDir);
    
    // Compile to framework
    const result = await compiler.compileToFramework(
      path.join(tempDir, 'src'),
      path.join(tempDir, 'generated')
    );
    
    expect(result.summary.success).toBe(true);
    expect(result.summary.processCount).toBe(2);
    
    // Validate generated files exist and compile
    const generatedFiles = await glob(path.join(tempDir, 'generated', '**/*.ts'));
    expect(generatedFiles.length).toBeGreaterThan(0);
    
    // Validate TypeScript compilation
    const tsResult = await compileTypeScript(path.join(tempDir, 'generated'));
    expect(tsResult.success).toBe(true);
  });
});
```

## Migration Strategy

### Phase 1: Parallel Implementation
- Keep existing YAML generation working
- Add new framework generation as separate command
- Both systems share same parser and AST

### Phase 2: Feature Parity
- Ensure framework generation covers all BUSY features
- Add comprehensive testing
- Performance optimization

### Phase 3: Replacement
- Make framework generation the default
- Add migration tools for existing projects
- Deprecate YAML generation

### Phase 4: Cleanup
- Remove old generation code
- Simplify CLI interface
- Update documentation

This comprehensive modification plan transforms the BUSY compiler from a YAML generator into a sophisticated framework code generator while maintaining the existing parsing and AST infrastructure.