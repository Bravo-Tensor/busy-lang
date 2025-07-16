/**
 * Semantic Analyzer
 * Performs semantic analysis of BUSY AST including symbol resolution,
 * scope analysis, and basic semantic validation
 */

import type { 
  BusyAST, 
  BusyFileNode, 
  Symbol, 
  SymbolReference,
  RoleNode,
  PlaybookNode,
  DocumentNode,
  TaskNode,
  ImportNode 
} from '@/ast/nodes';

import type { 
  AnalysisConfiguration,
  SymbolUsageInfo,
  AnalysisError,
  AnalysisWarning,
  AnalysisInfo,
  UsagePattern
} from './types';

/**
 * Result of semantic analysis
 */
export interface SemanticAnalysisResult {
  /** Symbol usage information */
  symbolUsage: Map<string, SymbolUsageInfo>;
  
  /** Analysis errors */
  errors: AnalysisError[];
  
  /** Analysis warnings */
  warnings: AnalysisWarning[];
  
  /** Analysis info */
  info: AnalysisInfo[];
}

/**
 * Semantic analyzer implementation
 */
export class SemanticAnalyzer {
  private config: AnalysisConfiguration;

  constructor(config: AnalysisConfiguration) {
    this.config = config;
  }

  /**
   * Perform semantic analysis on AST
   */
  async analyze(ast: BusyAST): Promise<SemanticAnalysisResult> {
    const result: SemanticAnalysisResult = {
      symbolUsage: new Map(),
      errors: [],
      warnings: [],
      info: []
    };

    try {
      // Analyze symbol usage
      await this.analyzeSymbolUsage(ast, result);
      
      // Validate symbol references
      await this.validateSymbolReferences(ast, result);
      
      // Check for dead code
      await this.checkDeadCode(ast, result);
      
      // Analyze import usage
      await this.analyzeImportUsage(ast, result);
      
      // Validate naming conventions
      await this.validateNamingConventions(ast, result);
      
      // Analyze scope violations
      await this.analyzeScopeViolations(ast, result);

      result.info.push({
        code: 'SEMANTIC_ANALYSIS_COMPLETE',
        message: `Semantic analysis completed. Analyzed ${ast.symbols.roles.size + ast.symbols.playbooks.size + ast.symbols.tasks.size + ast.symbols.documents.size} symbols.`,
        location: 'semantic-analyzer',
        category: 'metric'
      });

    } catch (error) {
      result.errors.push({
        code: 'SEMANTIC_ANALYSIS_FAILED',
        message: `Semantic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: 'semantic-analyzer',
        category: 'semantic',
        severity: 'critical'
      });
    }

    return result;
  }

  /**
   * Analyze symbol usage patterns throughout the AST
   */
  private async analyzeSymbolUsage(ast: BusyAST, result: SemanticAnalysisResult): Promise<void> {
    // Initialize usage info for all symbols
    for (const [symbolName, symbol] of ast.symbols.roles) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }
    
    for (const [symbolName, symbol] of ast.symbols.playbooks) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }
    
    for (const [symbolName, symbol] of ast.symbols.tasks) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }
    
    for (const [symbolName, symbol] of ast.symbols.deliverables) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }
    
    for (const [symbolName, symbol] of ast.symbols.tools) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }
    
    for (const [symbolName, symbol] of ast.symbols.advisors) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }
    
    for (const [symbolName, symbol] of ast.symbols.teams) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }
    
    for (const [symbolName, symbol] of ast.symbols.documents) {
      result.symbolUsage.set(symbolName, this.createSymbolUsageInfo(symbol));
    }

    // Analyze usage patterns
    for (const [, file] of ast.files) {
      await this.analyzeFileSymbolUsage(file, result);
    }
  }

  /**
   * Create initial symbol usage info
   */
  private createSymbolUsageInfo(symbol: Symbol): SymbolUsageInfo {
    return {
      referenceCount: symbol.references.length,
      referenceTypes: this.countReferenceTypes(symbol.references),
      usagePatterns: this.analyzeUsagePatterns(symbol.references),
      isDeadCode: !symbol.isUsed,
      circularReferences: this.findCircularReferences(symbol)
    };
  }

  /**
   * Count reference types for a symbol
   */
  private countReferenceTypes(references: SymbolReference[]): Map<string, number> {
    const counts = new Map<string, number>();
    
    for (const ref of references) {
      const current = counts.get(ref.referenceType) || 0;
      counts.set(ref.referenceType, current + 1);
    }
    
    return counts;
  }

  /**
   * Analyze usage patterns for references
   */
  private analyzeUsagePatterns(references: SymbolReference[]): UsagePattern[] {
    const patterns: UsagePattern[] = [];
    
    // Group by file
    const fileGroups = new Map<string, SymbolReference[]>();
    for (const ref of references) {
      const fileRefs = fileGroups.get(ref.file) || [];
      fileRefs.push(ref);
      fileGroups.set(ref.file, fileRefs);
    }
    
    // Analyze patterns within files
    for (const [file, fileRefs] of fileGroups) {
      if (fileRefs.length > 1) {
        patterns.push({
          pattern: `Multiple references in ${file}`,
          frequency: fileRefs.length,
          context: 'file-local'
        });
      }
      
      // Analyze reference type patterns
      const typeGroups = new Map<string, number>();
      for (const ref of fileRefs) {
        typeGroups.set(ref.referenceType, (typeGroups.get(ref.referenceType) || 0) + 1);
      }
      
      for (const [type, count] of typeGroups) {
        if (count > 1) {
          patterns.push({
            pattern: `Multiple ${type} references`,
            frequency: count,
            context: file
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Find circular references for a symbol
   */
  private findCircularReferences(_symbol: Symbol): SymbolReference[] {
    // This is a placeholder - circular reference detection would be more complex
    // and would need to traverse the dependency graph
    return [];
  }

  /**
   * Analyze symbol usage within a file
   */
  private async analyzeFileSymbolUsage(file: BusyFileNode, result: SemanticAnalysisResult): Promise<void> {
    // Analyze imports
    for (const importNode of file.imports) {
      await this.analyzeImportNode(importNode, file, result);
    }
    
    // Analyze content based on type
    switch (file.content.type) {
      case 'Role':
        await this.analyzeRoleUsage(file.content as RoleNode, file, result);
        break;
      case 'Playbook':
        await this.analyzePlaybookUsage(file.content as PlaybookNode, file, result);
        break;
      case 'Team':
        // Team usage analysis would go here
        break;
      case 'Document':
        await this.analyzeDocumentUsage(file.content as DocumentNode, file, result);
        break;
    }
  }

  /**
   * Analyze import node usage
   */
  private async analyzeImportNode(importNode: ImportNode, file: BusyFileNode, result: SemanticAnalysisResult): Promise<void> {
    const symbolName = `${importNode.importType}:${importNode.name}`;
    const usage = result.symbolUsage.get(symbolName);
    
    if (usage) {
      // Check if import is actually used
      const isUsed = this.isImportUsed(importNode, file);
      if (!isUsed) {
        result.warnings.push({
          code: 'UNUSED_IMPORT',
          message: `Import '${importNode.name}' is declared but never used`,
          location: `${file.filePath}:import:${importNode.name}`,
          category: 'optimization',
          recommendation: `Remove unused import '${importNode.name}'`
        });
      }
    }
  }

  /**
   * Check if an import is actually used in the file
   */
  private isImportUsed(_importNode: ImportNode, _file: BusyFileNode): boolean {
    // This would need to scan the file content for references to the imported tool/advisor
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Analyze role symbol usage
   */
  private async analyzeRoleUsage(role: RoleNode, file: BusyFileNode, result: SemanticAnalysisResult): Promise<void> {
    // Analyze inheritance usage
    if (role.inheritsFrom) {
      const parentUsage = result.symbolUsage.get(role.inheritsFrom);
      if (parentUsage) {
        parentUsage.referenceTypes.set('inheritance', (parentUsage.referenceTypes.get('inheritance') || 0) + 1);
      } else {
        result.errors.push({
          code: 'UNDEFINED_PARENT_ROLE',
          message: `Role '${role.name}' inherits from undefined role '${role.inheritsFrom}'`,
          location: `${file.filePath}:role:${role.name}:inheritsFrom`,
          category: 'semantic',
          severity: 'error',
          suggestedFix: `Define role '${role.inheritsFrom}' or remove inheritance`
        });
      }
    }
    
    // Analyze task usage
    for (const task of role.tasks) {
      await this.analyzeTaskUsage(task, file, result);
    }
  }

  /**
   * Analyze playbook symbol usage
   */
  private async analyzePlaybookUsage(playbook: PlaybookNode, file: BusyFileNode, result: SemanticAnalysisResult): Promise<void> {
    // Analyze input/output deliverable usage
    for (const input of playbook.inputs) {
      const deliverableUsage = result.symbolUsage.get(input.name);
      if (deliverableUsage) {
        deliverableUsage.referenceTypes.set('input', (deliverableUsage.referenceTypes.get('input') || 0) + 1);
      }
    }
    
    for (const output of playbook.outputs) {
      const deliverableUsage = result.symbolUsage.get(output.name);
      if (deliverableUsage) {
        deliverableUsage.referenceTypes.set('output', (deliverableUsage.referenceTypes.get('output') || 0) + 1);
      }
    }
    
    // Analyze step usage
    for (const step of playbook.steps) {
      await this.analyzeTaskUsage(step, file, result);
    }
  }

  /**
   * Analyze document symbol usage
   */
  private async analyzeDocumentUsage(document: DocumentNode, file: BusyFileNode, result: SemanticAnalysisResult): Promise<void> {
    // Analyze document sections for structural completeness
    if (document.contentType === 'structured' && document.sections) {
      for (const section of document.sections) {
        // Check if section has required fields for form types
        if (section.sectionType === 'form' && (!section.fields || section.fields.length === 0)) {
          result.warnings.push({
            code: 'EMPTY_FORM_SECTION',
            message: `Document section '${section.name}' is marked as form type but has no fields`,
            location: `${file.filePath}:document:${document.metadata.name}:section:${section.name}`,
            category: 'best_practice',
            recommendation: `Add fields to form section '${section.name}' or change section type`
          });
        }
        
        // Check for required fields in forms
        if (section.fields) {
          const requiredFieldCount = section.fields.filter(field => field.required).length;
          if (requiredFieldCount === 0 && section.fields.length > 0) {
            result.warnings.push({
              code: 'NO_REQUIRED_FIELDS',
              message: `Form section '${section.name}' has no required fields`,
              location: `${file.filePath}:document:${document.metadata.name}:section:${section.name}`,
              category: 'best_practice',
              recommendation: `Consider marking critical fields as required in section '${section.name}'`
            });
          }
        }
      }
    }
    
    // Analyze narrative content completeness
    if (document.contentType === 'narrative') {
      if (!document.narrativeContent || document.narrativeContent.trim().length === 0) {
        result.warnings.push({
          code: 'EMPTY_NARRATIVE_DOCUMENT',
          message: `Document '${document.metadata.name}' is marked as narrative but has no content`,
          location: `${file.filePath}:document:${document.metadata.name}`,
          category: 'best_practice',
          recommendation: `Add narrative content to document '${document.metadata.name}' or change to structured type`
        });
      }
    }
  }

  /**
   * Analyze task symbol usage
   */
  private async analyzeTaskUsage(task: TaskNode, _file: BusyFileNode, result: SemanticAnalysisResult): Promise<void> {
    // Analyze input/output deliverable usage
    for (const input of task.inputs) {
      const deliverableUsage = result.symbolUsage.get(input.name);
      if (deliverableUsage) {
        deliverableUsage.referenceTypes.set('input', (deliverableUsage.referenceTypes.get('input') || 0) + 1);
      }
    }
    
    for (const output of task.outputs) {
      const deliverableUsage = result.symbolUsage.get(output.name);
      if (deliverableUsage) {
        deliverableUsage.referenceTypes.set('output', (deliverableUsage.referenceTypes.get('output') || 0) + 1);
      }
    }
    
    // Analyze issue escalation targets
    for (const issue of task.issues) {
      if (issue.resolution.target) {
        const targetUsage = result.symbolUsage.get(issue.resolution.target);
        if (targetUsage) {
          targetUsage.referenceTypes.set('escalation', (targetUsage.referenceTypes.get('escalation') || 0) + 1);
        }
      }
    }
  }

  /**
   * Validate all symbol references
   */
  private async validateSymbolReferences(ast: BusyAST, result: SemanticAnalysisResult): Promise<void> {
    // Check that all references point to defined symbols
    for (const [, symbol] of ast.symbols.roles) {
      for (const reference of symbol.references) {
        await this.validateSymbolReference(reference, ast, result);
      }
    }
    
    for (const [, symbol] of ast.symbols.playbooks) {
      for (const reference of symbol.references) {
        await this.validateSymbolReference(reference, ast, result);
      }
    }
    
    for (const [, symbol] of ast.symbols.tasks) {
      for (const reference of symbol.references) {
        await this.validateSymbolReference(reference, ast, result);
      }
    }
    
    for (const [, symbol] of ast.symbols.deliverables) {
      for (const reference of symbol.references) {
        await this.validateSymbolReference(reference, ast, result);
      }
    }
  }

  /**
   * Validate a single symbol reference
   */
  private async validateSymbolReference(_reference: SymbolReference, _ast: BusyAST, _result: SemanticAnalysisResult): Promise<void> {
    // This would check that the reference is valid in its context
    // For example, checking that escalation targets are valid roles
    // Placeholder implementation
  }

  /**
   * Check for dead code (unused symbols)
   */
  private async checkDeadCode(_ast: BusyAST, result: SemanticAnalysisResult): Promise<void> {
    for (const [symbolName, usage] of result.symbolUsage) {
      if (usage.isDeadCode) {
        result.warnings.push({
          code: 'DEAD_CODE',
          message: `Symbol '${symbolName}' is defined but never used`,
          location: `symbol:${symbolName}`,
          category: 'optimization',
          recommendation: `Remove unused symbol '${symbolName}' or add references to it`
        });
      }
    }
  }

  /**
   * Analyze import usage patterns
   */
  private async analyzeImportUsage(ast: BusyAST, result: SemanticAnalysisResult): Promise<void> {
    const importUsage = new Map<string, number>();
    
    for (const [, file] of ast.files) {
      for (const importNode of file.imports) {
        const key = `${importNode.importType}:${importNode.name}`;
        importUsage.set(key, (importUsage.get(key) || 0) + 1);
      }
    }
    
    // Report on commonly used imports
    for (const [importKey, count] of importUsage) {
      if (count > 5) {
        result.info.push({
          code: 'COMMON_IMPORT',
          message: `Import '${importKey}' is used in ${count} files`,
          location: 'imports',
          category: 'discovery'
        });
      }
    }
  }

  /**
   * Validate naming conventions
   */
  private async validateNamingConventions(ast: BusyAST, result: SemanticAnalysisResult): Promise<void> {
    // Check role naming conventions
    for (const [roleName, role] of ast.symbols.roles) {
      if (!this.isValidRoleName(roleName)) {
        result.warnings.push({
          code: 'NAMING_CONVENTION',
          message: `Role name '${roleName}' does not follow naming conventions`,
          location: role.file,
          category: 'best_practice',
          recommendation: 'Use kebab-case for role names (e.g., "senior-developer")'
        });
      }
    }
    
    // Check playbook naming conventions
    for (const [playbookName, playbook] of ast.symbols.playbooks) {
      if (!this.isValidPlaybookName(playbookName)) {
        result.warnings.push({
          code: 'NAMING_CONVENTION',
          message: `Playbook name '${playbookName}' does not follow naming conventions`,
          location: playbook.file,
          category: 'best_practice',
          recommendation: 'Use kebab-case for playbook names (e.g., "onboard-new-client")'
        });
      }
    }
    
    // Check task naming conventions
    for (const [taskName, task] of ast.symbols.tasks) {
      if (!this.isValidTaskName(taskName)) {
        result.warnings.push({
          code: 'NAMING_CONVENTION',
          message: `Task name '${taskName}' does not follow naming conventions`,
          location: task.file,
          category: 'best_practice',
          recommendation: 'Use snake_case for task names (e.g., "review_pull_request")'
        });
      }
    }
  }

  /**
   * Check if role name follows conventions
   */
  private isValidRoleName(name: string): boolean {
    // Role names should be kebab-case
    return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
  }

  /**
   * Check if playbook name follows conventions
   */
  private isValidPlaybookName(name: string): boolean {
    // Playbook names should be kebab-case
    return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
  }

  /**
   * Check if task name follows conventions
   */
  private isValidTaskName(name: string): boolean {
    // Task names should be snake_case
    return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name);
  }

  /**
   * Analyze scope violations
   */
  private async analyzeScopeViolations(ast: BusyAST, result: SemanticAnalysisResult): Promise<void> {
    // Check for layer boundary violations
    for (const [, file] of ast.files) {
      await this.checkLayerBoundaries(file, ast, result);
    }
  }

  /**
   * Check layer boundary violations in a file
   */
  private async checkLayerBoundaries(file: BusyFileNode, _ast: BusyAST, _result: SemanticAnalysisResult): Promise<void> {
    const fileLayer = file.namespace.layer;
    
    // Check imports for layer violations
    for (const importNode of file.imports) {
      // This would check if imported tools/advisors respect layer boundaries
      // Placeholder for now
    }
    
    // Check references for layer violations
    // This would need to be implemented based on specific layer rules
  }

  /**
   * Update analyzer configuration
   */
  updateConfiguration(config: AnalysisConfiguration): void {
    this.config = config;
  }
}