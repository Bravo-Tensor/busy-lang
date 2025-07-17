import { Scanner } from '../src/core/scanner';
import { Parser } from '../src/core/parser';
import { DEFAULT_CONFIG } from '../src/config/types';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Simple Validation for Specification Changes', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory with proper BUSY structure
    tempDir = join(tmpdir(), `busy-test-${Date.now()}`);
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

  it('should validate files with capability-based imports', async () => {
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Test Role"
  description: "Test role with capability import"
  layer: "L0"

imports:
  - tool: "salesforce"
    capability: "crm-management"

role:
  name: "test-role"
  description: "Test role"
`;

    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);

    // Write test file
    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'roles', 'test-role.busy');
    await writeFile(testFile, yamlContent);
    
    // Scan and parse
    const scanResult = await scanner.scan(tempDir);
    expect(scanResult.files).toHaveLength(1);
    
    const parseResult = await parser.parse(scanResult);
    
    // Should have no parse errors
    expect(parseResult.parseErrors).toHaveLength(0);
    expect(parseResult.parsedFiles).toHaveLength(1);
    
    // File should be parsed successfully
    const parsedFile = parseResult.parsedFiles[0];
    expect(parsedFile.fileType).toBe('role');
    expect(parsedFile.yaml.data.role?.name).toBe('test-role');
  });

  it('should validate document definition files', async () => {
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Client Contract Template"
  description: "Standard photography contract template"
  layer: "L0"

document:
  metadata:
    name: "client-contract"
    description: "Photography service agreement"
    version: "1.0.0"
  
  content_type: "structured"
  
  sections:
    - name: "client_information"
      description: "Client details and contact"
      fields:
        - name: "client_name"
          type: "text"
          required: true
`;

    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);

    // Write test file in roles directory (since documents may not be recognized as separate directory)
    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'roles', 'client-contract.busy');
    await writeFile(testFile, yamlContent);
    
    // Scan and parse
    const scanResult = await scanner.scan(tempDir);
    const parseResult = await parser.parse(scanResult);
    
    // Should have no parse errors
    expect(parseResult.parseErrors).toHaveLength(0);
    expect(parseResult.parsedFiles).toHaveLength(1);
    
    // File should be parsed as document type
    const parsedFile = parseResult.parsedFiles[0];
    expect(parsedFile.fileType).toBe('document');
    expect(parsedFile.yaml.data.document?.content_type).toBe('structured');
  });

  it('should validate files with document and data deliverable types', async () => {
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Test Role"
  description: "Role with valid deliverable types"
  layer: "L0"

role:
  name: "test-role"
  description: "Test role"
  
  tasks:
    - name: "process_data"
      description: "Process client data"
      execution_type: "algorithmic"
      
      inputs:
        - name: "client_info"
          type: "data"
          format: "json"
      
      outputs:
        - name: "processed_report"
          type: "document"
          format: "pdf"
`;

    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);

    // Write test file
    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'roles', 'test-role.busy');
    await writeFile(testFile, yamlContent);
    
    // Scan and parse
    const scanResult = await scanner.scan(tempDir);
    const parseResult = await parser.parse(scanResult);
    
    // Should have no parse errors
    expect(parseResult.parseErrors).toHaveLength(0);
    expect(parseResult.parsedFiles).toHaveLength(1);
    
    // Should accept document and data types
    const parsedFile = parseResult.parsedFiles[0];
    expect(parsedFile.fileType).toBe('role');
    expect(parsedFile.yaml.data.role?.tasks?.[0]?.inputs?.[0]?.type).toBe('data');
    expect(parsedFile.yaml.data.role?.tasks?.[0]?.outputs?.[0]?.type).toBe('document');
  });

  it('should validate files with subtasks', async () => {
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Test Playbook"
  description: "Playbook with subtasks"
  layer: "L0"

playbook:
  name: "test-playbook"
  description: "Test playbook"
  
  cadence:
    frequency: "daily"
  
  steps:
    - name: "main_step"
      description: "Main step with subtasks"
      execution_type: "human"
      
      subtasks:
        - name: "sub_step_1"
          description: "First subtask"
          execution_type: "algorithmic"
        - name: "sub_step_2"
          description: "Second subtask"
          execution_type: "human"
`;

    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);

    // Write test file
    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'playbooks', 'test-playbook.busy');
    await writeFile(testFile, yamlContent);
    
    // Scan and parse
    const scanResult = await scanner.scan(tempDir);
    const parseResult = await parser.parse(scanResult);
    
    // Should have no parse errors
    expect(parseResult.parseErrors).toHaveLength(0);
    expect(parseResult.parsedFiles).toHaveLength(1);
    
    // Should parse subtasks
    const parsedFile = parseResult.parsedFiles[0];
    expect(parsedFile.fileType).toBe('playbook');
    expect(parsedFile.yaml.data.playbook?.steps?.[0]?.subtasks).toHaveLength(2);
  });

  it('should reject deprecated deliverable types', async () => {
    const yamlContent = `version: "1.0.0"
metadata:
  name: "Test Role"
  description: "Role with deprecated deliverable type"
  layer: "L0"

role:
  name: "test-role"
  description: "Test role"
  
  tasks:
    - name: "make_decision"
      description: "Make a decision"
      execution_type: "human"
      
      outputs:
        - name: "final_decision"
          type: "decision"
          format: "json"
`;

    const scanner = new Scanner(DEFAULT_CONFIG);
    const parser = new Parser(DEFAULT_CONFIG);

    // Write test file
    const testFile = join(tempDir, 'test-org', 'L0', 'test-team', 'roles', 'test-role.busy');
    await writeFile(testFile, yamlContent);
    
    // Scan and parse
    const scanResult = await scanner.scan(tempDir);
    const parseResult = await parser.parse(scanResult);
    
    // Should have schema validation errors for deprecated type
    // Check both parse errors and validation results
    const hasErrors = parseResult.parseErrors.length > 0 || 
                     parseResult.validationResults.some(r => !r.isValid || r.errors.length > 0);
    
    if (!hasErrors) {
      console.log('Parse errors:', parseResult.parseErrors);
      console.log('Validation results:', parseResult.validationResults);
    }
    
    expect(hasErrors).toBe(true);
  });
});