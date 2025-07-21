import { promises as fs } from 'fs';
import * as path from 'path';
import { DependencyGraphManager } from '../core/dependency-graph';
import { KnitConfig } from '../types';

export interface LinkSuggestion {
  sourceFile: string;
  targetFile: string;
  confidence: number;  // 0-1 scale
  reasoning: string;
  relationship: 'design_to_code' | 'code_to_test' | 'spec_to_impl' | 'types_to_usage' | 'config_to_code' | 'bidirectional';
  evidence: {
    sharedTerms: string[];
    structuralSimilarity: number;
    explicitReferences: string[];
    patternMatches: PatternMatch[];
  };
}

export interface PatternMatch {
  pattern: string;
  confidence: number;
  description: string;
}

interface LinkPattern {
  name: string;
  sourcePattern: RegExp;
  targetPattern: RegExp;
  indicators: string[];
  relationship: LinkSuggestion['relationship'];
  baseConfidence: number;
  description: string;
}

export class LinkAnalyzer {
  private projectRoot: string;
  private depGraph: DependencyGraphManager;
  private config: KnitConfig;
  private patterns: LinkPattern[];

  constructor(projectRoot: string, depGraph: DependencyGraphManager, config: KnitConfig) {
    this.projectRoot = projectRoot;
    this.depGraph = depGraph;
    this.config = config;
    this.patterns = this.getDefaultPatterns();
  }

  /**
   * Analyze a file for potential dependency relationships
   */
  async analyzeFile(targetFile: string, threshold: number = 0.6): Promise<LinkSuggestion[]> {
    console.log(`🔍 Analyzing ${targetFile} for dependency relationships...`);
    
    const targetContent = await this.readFile(targetFile);
    if (!targetContent) {
      return [];
    }

    const candidateFiles = await this.findCandidateFiles(targetFile);
    const suggestions: LinkSuggestion[] = [];

    for (const candidateFile of candidateFiles) {
      try {
        const suggestion = await this.scoreRelationship(candidateFile, targetFile, targetContent);
        if (suggestion && suggestion.confidence >= threshold) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.warn(`Warning: Failed to analyze relationship ${candidateFile} → ${targetFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze entire project for link suggestions
   */
  async analyzeProject(threshold: number = 0.7, autoAddThreshold: number = 0.85): Promise<{
    suggestions: LinkSuggestion[];
    autoAdded: LinkSuggestion[];
  }> {
    console.log('📊 Analyzing entire project for dependency relationships...');
    
    const allFiles = await this.getAllProjectFiles();
    const suggestions: LinkSuggestion[] = [];
    const autoAdded: LinkSuggestion[] = [];

    for (const file of allFiles) {
      const fileSuggestions = await this.analyzeFile(file, threshold);
      suggestions.push(...fileSuggestions);

      // Auto-add high-confidence suggestions
      const highConfidence = fileSuggestions.filter(s => s.confidence >= autoAddThreshold);
      for (const suggestion of highConfidence) {
        try {
          await this.depGraph.addDependency(suggestion.sourceFile, suggestion.targetFile);
          autoAdded.push(suggestion);
          console.log(`✅ Auto-added: ${suggestion.sourceFile} → ${suggestion.targetFile} (${(suggestion.confidence * 100).toFixed(0)}%)`);
        } catch (error) {
          console.warn(`Warning: Could not auto-add dependency: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return { suggestions, autoAdded };
  }

  /**
   * Score the relationship between two files
   */
  private async scoreRelationship(sourceFile: string, targetFile: string, targetContent?: string): Promise<LinkSuggestion | null> {
    const sourceContent = await this.readFile(sourceFile);
    const actualTargetContent = targetContent || await this.readFile(targetFile);
    
    if (!sourceContent || !actualTargetContent) {
      return null;
    }

    // Check if relationship already exists
    const existingDeps = this.depGraph.getAllDependencies();
    if (existingDeps[sourceFile]?.watches.includes(targetFile)) {
      return null; // Already linked
    }

    const patternMatches: PatternMatch[] = [];
    let maxConfidence = 0;
    let bestRelationship: LinkSuggestion['relationship'] = 'bidirectional';
    let bestReasoning = '';

    // Test against all patterns
    for (const pattern of this.patterns) {
      if (pattern.sourcePattern.test(sourceFile) && pattern.targetPattern.test(targetFile)) {
        const confidence = this.calculatePatternConfidence(
          pattern,
          sourceContent,
          actualTargetContent,
          sourceFile,
          targetFile
        );
        
        patternMatches.push({
          pattern: pattern.name,
          confidence,
          description: pattern.description
        });

        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestRelationship = pattern.relationship;
          bestReasoning = pattern.description;
        }
      }
    }

    if (maxConfidence === 0) {
      return null; // No pattern matches
    }

    // Calculate additional evidence
    const sharedTerms = this.findSharedTerms(sourceContent, actualTargetContent);
    const explicitReferences = this.findExplicitReferences(sourceFile, actualTargetContent);
    const structuralSimilarity = this.calculateStructuralSimilarity(sourceContent, actualTargetContent);

    // Adjust confidence based on evidence
    const evidenceBonus = Math.min(
      sharedTerms.length * 0.05 + 
      explicitReferences.length * 0.1 + 
      structuralSimilarity * 0.2,
      0.3
    );

    const finalConfidence = Math.min(maxConfidence + evidenceBonus, 1.0);

    return {
      sourceFile,
      targetFile,
      confidence: finalConfidence,
      reasoning: bestReasoning,
      relationship: bestRelationship,
      evidence: {
        sharedTerms,
        structuralSimilarity,
        explicitReferences,
        patternMatches
      }
    };
  }

  /**
   * Calculate confidence for a specific pattern match
   */
  private calculatePatternConfidence(
    pattern: LinkPattern,
    sourceContent: string,
    targetContent: string,
    sourceFile: string,
    targetFile: string
  ): number {
    let confidence = pattern.baseConfidence;

    // Check for indicator terms in content
    const indicatorMatches = pattern.indicators.filter(indicator => 
      sourceContent.toLowerCase().includes(indicator.toLowerCase()) ||
      targetContent.toLowerCase().includes(indicator.toLowerCase())
    );

    confidence += indicatorMatches.length * 0.05;

    // File naming consistency bonus
    if (this.hasConsistentNaming(sourceFile, targetFile)) {
      confidence += 0.15;
    }

    // Directory proximity bonus
    const sourceDir = path.dirname(sourceFile);
    const targetDir = path.dirname(targetFile);
    if (sourceDir === targetDir) {
      confidence += 0.1;
    } else if (path.relative(sourceDir, targetDir).split('/').length <= 2) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Find shared terms between two files
   */
  private findSharedTerms(content1: string, content2: string): string[] {
    const terms1 = this.extractTerms(content1);
    const terms2 = this.extractTerms(content2);
    
    return terms1.filter(term => 
      terms2.includes(term) && 
      term.length > 3 && 
      !this.isCommonWord(term)
    );
  }

  /**
   * Extract meaningful terms from content
   */
  private extractTerms(content: string): string[] {
    // Extract words, function names, class names, etc.
    const matches = content.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || [];
    return [...new Set(matches.map(term => term.toLowerCase()))];
  }

  /**
   * Check if a word is too common to be meaningful
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our',
      'function', 'return', 'const', 'let', 'var', 'class', 'interface', 'type', 'import', 'export',
      'string', 'number', 'boolean', 'object', 'array', 'null', 'undefined', 'true', 'false'
    ]);
    return commonWords.has(word.toLowerCase());
  }

  /**
   * Find explicit file references in content
   */
  private findExplicitReferences(sourceFile: string, targetContent: string): string[] {
    const references: string[] = [];
    const sourceBaseName = path.basename(sourceFile, path.extname(sourceFile));
    
    // Look for imports, requires, or file references
    const importPatterns = [
      new RegExp(`from\\s+['"].*${sourceBaseName}['"]`, 'gi'),
      new RegExp(`require\\s*\\(['"].*${sourceBaseName}['"]\\)`, 'gi'),
      new RegExp(`import\\s+.*from\\s+['"].*${sourceBaseName}['"]`, 'gi')
    ];

    for (const pattern of importPatterns) {
      const matches = targetContent.match(pattern);
      if (matches) {
        references.push(...matches);
      }
    }

    return references;
  }

  /**
   * Calculate structural similarity between files
   */
  private calculateStructuralSimilarity(content1: string, content2: string): number {
    // Simple structural similarity based on common patterns
    const patterns = [
      /class\s+\w+/g,
      /function\s+\w+/g,
      /interface\s+\w+/g,
      /const\s+\w+/g,
      /export\s+/g,
      /import\s+/g
    ];

    let similarities = 0;
    let totalPatterns = 0;

    for (const pattern of patterns) {
      const matches1 = (content1.match(pattern) || []).length;
      const matches2 = (content2.match(pattern) || []).length;
      
      if (matches1 > 0 || matches2 > 0) {
        const similarity = 1 - Math.abs(matches1 - matches2) / Math.max(matches1, matches2);
        similarities += similarity;
        totalPatterns++;
      }
    }

    return totalPatterns > 0 ? similarities / totalPatterns : 0;
  }

  /**
   * Check for consistent file naming patterns
   */
  private hasConsistentNaming(file1: string, file2: string): boolean {
    const baseName1 = path.basename(file1, path.extname(file1));
    const baseName2 = path.basename(file2, path.extname(file2));
    
    // Remove common suffixes/prefixes
    const cleanName1 = baseName1.replace(/\.(test|spec|types|d)$/, '');
    const cleanName2 = baseName2.replace(/\.(test|spec|types|d)$/, '');
    
    return cleanName1 === cleanName2 || 
           baseName2.includes(cleanName1) || 
           baseName1.includes(cleanName2) ||
           this.calculateLevenshteinDistance(cleanName1, cleanName2) <= 2;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Find candidate files for relationship analysis
   */
  private async findCandidateFiles(targetFile: string): Promise<string[]> {
    const allFiles = await this.getAllProjectFiles();
    const targetDir = path.dirname(targetFile);
    const targetBaseName = path.basename(targetFile, path.extname(targetFile));
    
    // Prioritize files by proximity and naming similarity
    return allFiles
      .filter(file => file !== targetFile)
      .sort((a, b) => {
        const aScore = this.calculateCandidateScore(a, targetFile, targetDir, targetBaseName);
        const bScore = this.calculateCandidateScore(b, targetFile, targetDir, targetBaseName);
        return bScore - aScore;
      })
      .slice(0, 50); // Limit to top 50 candidates for performance
  }

  /**
   * Score candidate files for prioritization
   */
  private calculateCandidateScore(
    candidateFile: string, 
    targetFile: string, 
    targetDir: string, 
    targetBaseName: string
  ): number {
    let score = 0;
    
    const candidateDir = path.dirname(candidateFile);
    const candidateBaseName = path.basename(candidateFile, path.extname(candidateFile));
    
    // Directory proximity
    if (candidateDir === targetDir) score += 10;
    else if (path.relative(candidateDir, targetDir).split('/').length <= 2) score += 5;
    
    // Name similarity
    if (candidateBaseName.includes(targetBaseName) || targetBaseName.includes(candidateBaseName)) score += 8;
    
    // Pattern matching potential
    for (const pattern of this.patterns) {
      if (pattern.sourcePattern.test(candidateFile) && pattern.targetPattern.test(targetFile)) {
        score += 6;
        break;
      }
    }
    
    return score;
  }

  /**
   * Get all project files excluding ignored patterns
   */
  private async getAllProjectFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      const items = await fs.readdir(path.join(this.projectRoot, dir));
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const absolutePath = path.join(this.projectRoot, fullPath);
        
        // Skip ignored patterns
        if (this.shouldIgnore(fullPath)) {
          continue;
        }
        
        const stats = await fs.stat(absolutePath);
        if (stats.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (stats.isFile()) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDirectory('.');
    return files;
  }

  /**
   * Check if a file path should be ignored
   */
  private shouldIgnore(filePath: string): boolean {
    return this.config.ignore.some(pattern => {
      const globPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      const regex = new RegExp('^' + globPattern + '$');
      return regex.test(filePath);
    });
  }

  /**
   * Read file content safely
   */
  private async readFile(filePath: string): Promise<string | null> {
    try {
      const absolutePath = path.join(this.projectRoot, filePath);
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (error) {
      return null;
    }
  }

  /**
   * Get default link detection patterns
   */
  private getDefaultPatterns(): LinkPattern[] {
    return [
      {
        name: 'design_to_code',
        sourcePattern: /\.(md|txt|rst)$/,
        targetPattern: /\.(ts|js|py|go|java|cpp|c)$/,
        indicators: ['API', 'endpoint', 'function', 'class', 'interface', 'implementation'],
        relationship: 'design_to_code',
        baseConfidence: 0.75,
        description: 'Design document to code implementation'
      },
      {
        name: 'code_to_test',
        sourcePattern: /src\/.*\.(ts|js|py)$/,
        targetPattern: /tests?\/.*\.(test|spec)\.(ts|js|py)$/,
        indicators: ['function', 'class', 'export', 'describe', 'it', 'test'],
        relationship: 'code_to_test',
        baseConfidence: 0.9,
        description: 'Source code to test file'
      },
      {
        name: 'spec_to_impl',
        sourcePattern: /(README\.md|.*\.spec\.md|.*-spec\.md)$/,
        targetPattern: /src\/.*\.(ts|js|py)$/,
        indicators: ['usage', 'example', 'API', 'getting started', 'specification'],
        relationship: 'spec_to_impl',
        baseConfidence: 0.65,
        description: 'Specification to implementation'
      },
      {
        name: 'types_to_usage',
        sourcePattern: /(types|@types)\/.*\.(ts|d\.ts)$/,
        targetPattern: /src\/.*\.(ts|js)$/,
        indicators: ['interface', 'type', 'export', 'declare'],
        relationship: 'types_to_usage',
        baseConfidence: 0.8,
        description: 'Type definitions to usage'
      },
      {
        name: 'config_to_code',
        sourcePattern: /\.(json|yaml|yml|env|toml)$/,
        targetPattern: /src\/.*\.(ts|js|py)$/,
        indicators: ['config', 'settings', 'environment', 'options'],
        relationship: 'config_to_code',
        baseConfidence: 0.6,
        description: 'Configuration to code usage'
      }
    ];
  }
}