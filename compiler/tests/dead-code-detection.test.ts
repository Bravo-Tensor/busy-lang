import { Scanner } from '../src/core/scanner';
import { Parser } from '../src/core/parser';
import { ASTBuilder } from '../src/ast/builder';
import { SemanticAnalyzer } from '../src/analysis/semantic-analyzer';
import { DEFAULT_CONFIG } from '../src/config/types';
import { DEFAULT_ANALYSIS_CONFIG } from '../src/analysis/types';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Dead Code Detection with File/Line Information', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory with proper BUSY structure
    tempDir = join(tmpdir(), `busy-dead-code-test-${Date.now()}`);
    await mkdir(join(tempDir, 'test-org', 'L0', 'test-team', 'roles'), { recursive: true });
    await mkdir(join(tempDir, 'test-org', 'L0', 'test-team', 'playbooks'), { recursive: true });
    await mkdir(join(tempDir, 'test-org', 'L0', 'test-team', 'documents'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should detect dead code with file and line information', async () => {
    // Create a role file with potentially unused tasks
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Test Role"
  description: "Test role with unused tasks"
  layer: "L0"

imports:
  - tool: "salesforce"
    capability: "crm-management"

role:
  name: "test-role"
  description: "Test role"
  
  tasks:
    - name: "used_task"
      description: "This task is used"
      execution_type: "human"
      outputs:
        - name: "result"
          type: "document"
          format: "pdf"
    
    - name: "unused_task"
      description: "This task is never referenced"
      execution_type: "algorithmic"
      outputs:
        - name: "unused_output"
          type: "data"
          format: "json"
`;

    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'roles', 'test-role.busy');
    await writeFile(testFile, yamlContent);
    
    // Initialize components
    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);
    const astBuilder = new ASTBuilder();
    const semanticAnalyzer = new SemanticAnalyzer(DEFAULT_ANALYSIS_CONFIG);
    
    // Run the pipeline
    const scanResult = await scanner.scan(tempDir);
    expect(scanResult.files).toHaveLength(1);
    
    const parseResult = await parser.parse(scanResult);
    expect(parseResult.parseErrors).toHaveLength(0);
    expect(parseResult.parsedFiles).toHaveLength(1);
    
    const buildResult = await astBuilder.build(parseResult);
    const semanticResult = await semanticAnalyzer.analyze(buildResult.ast);
    
    // Look for dead code warnings
    const deadCodeWarnings = semanticResult.warnings.filter(w => w.code === 'DEAD_CODE');
    
    // Should have at least one dead code warning
    expect(deadCodeWarnings.length).toBeGreaterThan(0);
    
    // Check that location information includes file and line
    deadCodeWarnings.forEach(warning => {
      expect(warning.location).toBeDefined();
      // Location should be in format "filename:line" or "filename:symbolname"
      expect(warning.location).toMatch(/(.*\.busy:|.*:)/);
      
      // Should not be the old format "symbol:symbolname"
      expect(warning.location).not.toMatch(/^symbol:/);
    });
  });

  it('should detect unused imports with file and line information', async () => {
    // Create a role file with unused imports
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Test Role"
  description: "Test role with unused imports"
  layer: "L0"

imports:
  - tool: "salesforce"
    capability: "crm-management"
  - tool: "slack"
    capability: "messaging"

role:
  name: "test-role"
  description: "Test role"
  
  tasks:
    - name: "simple_task"
      description: "Simple task"
      execution_type: "human"
`;

    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'roles', 'test-role.busy');
    await writeFile(testFile, yamlContent);
    
    // Initialize components
    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);
    const astBuilder = new ASTBuilder();
    const semanticAnalyzer = new SemanticAnalyzer(DEFAULT_ANALYSIS_CONFIG);
    
    // Run the pipeline
    const scanResult = await scanner.scan(tempDir);
    const parseResult = await parser.parse(scanResult);
    const buildResult = await astBuilder.build(parseResult);
    const semanticResult = await semanticAnalyzer.analyze(buildResult.ast);
    
    // Look for unused import warnings
    const unusedImportWarnings = semanticResult.warnings.filter(w => w.code === 'UNUSED_IMPORT');
    
    // Check that any unused import warnings have proper location information
    unusedImportWarnings.forEach(warning => {
      expect(warning.location).toBeDefined();
      // Location should include filename and not be in old format
      expect(warning.location).toMatch(/(.*\.busy:|.*:)/);
      expect(warning.location).not.toMatch(/^.*:import:/);
    });
  });

  it('should handle symbols without location information gracefully', async () => {
    // Create a simple file to test graceful handling
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Simple Test"
  description: "Simple test file"
  layer: "L0"

role:
  name: "simple-role"
  description: "Simple role"
`;

    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'roles', 'simple-role.busy');
    await writeFile(testFile, yamlContent);
    
    // Initialize components
    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);
    const astBuilder = new ASTBuilder();
    const semanticAnalyzer = new SemanticAnalyzer(DEFAULT_ANALYSIS_CONFIG);
    
    // Run the pipeline
    const scanResult = await scanner.scan(tempDir);
    const parseResult = await parser.parse(scanResult);
    const buildResult = await astBuilder.build(parseResult);
    const semanticResult = await semanticAnalyzer.analyze(buildResult.ast);
    
    // Should not throw errors and should complete successfully
    expect(semanticResult.errors.filter(e => e.code === 'SEMANTIC_ANALYSIS_FAILED')).toHaveLength(0);
    
    // Any warnings should have meaningful location information
    semanticResult.warnings.forEach(warning => {
      expect(warning.location).toBeDefined();
      expect(warning.location).not.toBe('');
    });
  });
});