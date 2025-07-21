import OpenAI from 'openai';
import { LLMAnalysis, ConflictType, KnitConfig } from '../types';

export class LLMClient {
  private openai?: OpenAI;
  private config: KnitConfig['llm'];

  constructor(config: KnitConfig['llm']) {
    this.config = config;
    
    if (config.provider === 'openai' && config.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
      });
    }
  }

  /**
   * Analyze if a dependent file needs updates based on upstream changes
   */
  async analyzeReconciliation(
    changedFile: string,
    dependentFile: string,
    gitDiff: string,
    dependentContent: string,
    relationshipType: string = 'dependency'
  ): Promise<LLMAnalysis> {
    const prompt = this.buildReconciliationPrompt(
      changedFile,
      dependentFile,
      gitDiff,
      dependentContent,
      relationshipType
    );

    try {
      const response = await this.callLLM(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.warn(`LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to manual review
      return {
        needsUpdate: true,
        changesNeeded: 'LLM analysis unavailable - manual review required',
        category: 'implementation',
        confidence: 0.0,
        contradictions: [`LLM analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        classification: ConflictType.REVIEW_REQUIRED
      };
    }
  }

  private buildReconciliationPrompt(
    changedFile: string,
    dependentFile: string,
    gitDiff: string,
    dependentContent: string,
    relationshipType: string
  ): string {
    return `TASK: Analyze if dependent file needs updates based on upstream change.

CONTEXT:
- Changed file: ${changedFile}
- Dependent file: ${dependentFile}
- Relationship: ${relationshipType}

CHANGE ANALYSIS:
\`\`\`diff
${gitDiff}
\`\`\`

CURRENT DEPENDENT CONTENT:
\`\`\`
${dependentContent}
\`\`\`

ANALYSIS REQUIRED:
1. Does this change affect the dependent file? (YES/NO)
2. If YES, what specific updates are needed?
3. What is the change category? (documentation|implementation|interface|breaking)
4. What is your confidence level? (0.0-1.0)
5. Are there any contradictions or trade-offs?

CLASSIFICATION RULES:
- SAFE_AUTO_APPLY: Non-breaking changes with clear update path, confidence > 0.8
- REVIEW_RECOMMENDED: Changes recommended but safe to auto-apply, confidence > 0.6
- REVIEW_REQUIRED: Breaking changes, contradictions, or confidence < 0.6
- NO_ACTION: No update needed

RESPONSE FORMAT (JSON):
{
  "needs_update": boolean,
  "changes_needed": "description of required changes",
  "category": "documentation|implementation|interface|breaking",
  "confidence": number,
  "contradictions": ["list of any contradictions found"],
  "classification": "SAFE_AUTO_APPLY|REVIEW_RECOMMENDED|REVIEW_REQUIRED|NO_ACTION",
  "proposed_diff": "diff format of proposed changes (if applicable)"
}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('LLM client not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert code analysis assistant. Analyze code changes and dependencies with precision. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    return content;
  }

  private parseResponse(response: string): LLMAnalysis {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize response
      return {
        needsUpdate: Boolean(parsed.needs_update),
        changesNeeded: String(parsed.changes_needed || ''),
        category: this.validateCategory(parsed.category),
        confidence: this.validateConfidence(parsed.confidence),
        contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
        classification: this.validateClassification(parsed.classification),
        proposedDiff: parsed.proposed_diff || undefined
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateCategory(category: any): 'documentation' | 'implementation' | 'interface' | 'breaking' {
    const validCategories = ['documentation', 'implementation', 'interface', 'breaking'];
    return validCategories.includes(category) ? category : 'implementation';
  }

  private validateConfidence(confidence: any): number {
    const num = Number(confidence);
    if (isNaN(num)) return 0.0;
    return Math.max(0.0, Math.min(1.0, num));
  }

  private validateClassification(classification: any): ConflictType {
    switch (classification) {
      case 'SAFE_AUTO_APPLY':
        return ConflictType.SAFE_AUTO_APPLY;
      case 'REVIEW_RECOMMENDED':
        return ConflictType.REVIEW_RECOMMENDED;
      case 'REVIEW_REQUIRED':
        return ConflictType.REVIEW_REQUIRED;
      case 'NO_ACTION':
        return ConflictType.NO_ACTION;
      default:
        return ConflictType.REVIEW_REQUIRED; // Safe default
    }
  }

  /**
   * Test LLM connection and configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = 'Respond with valid JSON: {"status": "connected", "model": "' + this.config.model + '"}';
      const response = await this.callLLM(testPrompt);
      const parsed = JSON.parse(response);
      return parsed.status === 'connected';
    } catch {
      return false;
    }
  }

  /**
   * Generate reconciliation summary for multiple changes
   */
  async generateSummary(analyses: LLMAnalysis[]): Promise<string> {
    const safeChanges = analyses.filter(a => a.classification === ConflictType.SAFE_AUTO_APPLY);
    const reviewChanges = analyses.filter(a => 
      a.classification === ConflictType.REVIEW_RECOMMENDED || 
      a.classification === ConflictType.REVIEW_REQUIRED
    );

    const lines: string[] = [];
    
    if (safeChanges.length > 0) {
      lines.push('Auto-applied changes:');
      safeChanges.forEach(change => {
        lines.push(`- ${change.changesNeeded}`);
      });
    }

    if (reviewChanges.length > 0) {
      lines.push('');
      lines.push('Changes requiring review:');
      reviewChanges.forEach(change => {
        lines.push(`- ${change.changesNeeded} (confidence: ${(change.confidence * 100).toFixed(0)}%)`);
        if (change.contradictions.length > 0) {
          change.contradictions.forEach(contradiction => {
            lines.push(`  ⚠️ ${contradiction}`);
          });
        }
      });
    }

    return lines.join('\n');
  }
}