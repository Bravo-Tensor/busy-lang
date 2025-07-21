import { 
  ConversationIntent, 
  ExtractedEntity, 
  BusinessContext, 
  ConversationTurn, 
  AIResponse,
  BusyFileModification,
  DiscoveryQuestion,
  InterviewTemplate,
  BusyProcess
} from '@/types/conversation';
import { KnitIntegrationService } from './knit-integration';
import { BusyGeneratorService } from './busy-generator';
import { ProcessAnalysisService } from './process-analysis';

export class ConversationEngine {
  private knitService: KnitIntegrationService;
  private busyGenerator: BusyGeneratorService;
  private processAnalyzer: ProcessAnalysisService;
  private conversationHistory: ConversationTurn[] = [];
  private currentContext: BusinessContext;

  constructor() {
    this.knitService = new KnitIntegrationService();
    this.busyGenerator = new BusyGeneratorService();
    this.processAnalyzer = new ProcessAnalysisService();
    this.currentContext = this.initializeContext();
  }

  async processUserInput(
    userInput: string,
    sessionId: string,
    userId: string
  ): Promise<AIResponse> {
    try {
      // Step 1: Classify intent and extract entities
      const intent = await this.classifyIntent(userInput, this.currentContext);
      
      // Step 2: Update conversation context
      this.updateContext(intent, userInput);
      
      // Step 3: Route to appropriate handler based on intent type
      let response: AIResponse;
      
      switch (intent.type) {
        case 'discovery':
          response = await this.handleDiscoveryIntent(intent);
          break;
        case 'modification':
          response = await this.handleModificationIntent(intent);
          break;
        case 'analysis':
          response = await this.handleAnalysisIntent(intent);
          break;
        case 'execution':
          response = await this.handleExecutionIntent(intent);
          break;
        case 'help':
          response = await this.handleHelpIntent(intent);
          break;
        default:
          response = await this.handleUnknownIntent(intent);
      }
      
      // Step 4: Record conversation turn
      const turn: ConversationTurn = {
        id: this.generateId(),
        timestamp: new Date(),
        userInput,
        aiResponse: response,
        intent,
        context: { ...this.currentContext },
        actions: response.proposedActions || []
      };
      
      this.conversationHistory.push(turn);
      
      return response;
      
    } catch (error) {
      console.error('Error processing user input:', error);
      return this.createErrorResponse(error);
    }
  }

  private async classifyIntent(
    userInput: string, 
    context: BusinessContext
  ): Promise<ConversationIntent> {
    // Business domain NLU - would integrate with OpenAI/Anthropic API
    const entities = await this.extractBusinessEntities(userInput);
    const intentType = await this.detectIntentType(userInput, context);
    
    return {
      type: intentType,
      confidence: this.calculateConfidence(userInput, intentType, entities),
      entities,
      businessContext: context,
      originalText: userInput
    };
  }

  private async extractBusinessEntities(userInput: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    
    // Process entity patterns (simplified - would use proper NLU)
    const processPatterns = [
      /onboarding|booking|delivery|production|consultation/gi,
      /client.*process|customer.*journey|workflow/gi
    ];
    
    const rolePatterns = [
      /photographer|manager|coordinator|administrator|editor/gi,
      /team.*member|staff|employee/gi
    ];
    
    const timelinePatterns = [
      /(\d+)\s*(days?|weeks?|months?|hours?)/gi,
      /timeline|schedule|duration|deadline/gi
    ];
    
    const resourcePatterns = [
      /equipment|software|budget|facility/gi,
      /resources?|tools?|assets?/gi
    ];
    
    const metricPatterns = [
      /efficiency|quality|satisfaction|performance/gi,
      /metrics?|kpis?|analytics?/gi
    ];
    
    // Extract entities based on patterns
    this.extractEntitiesByPattern(userInput, processPatterns, 'process', entities);
    this.extractEntitiesByPattern(userInput, rolePatterns, 'role', entities);
    this.extractEntitiesByPattern(userInput, timelinePatterns, 'timeline', entities);
    this.extractEntitiesByPattern(userInput, resourcePatterns, 'resource', entities);
    this.extractEntitiesByPattern(userInput, metricPatterns, 'metric', entities);
    
    return entities;
  }

  private extractEntitiesByPattern(
    text: string,
    patterns: RegExp[],
    type: string,
    entities: ExtractedEntity[]
  ): void {
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            type: type as ExtractedEntity['type'],
            value: match.toLowerCase(),
            confidence: 0.8,
            busyFileReference: this.findRelatedBusyFile(match, type)
          });
        });
      }
    });
  }

  private async detectIntentType(
    userInput: string, 
    context: BusinessContext
  ): Promise<ConversationIntent['type']> {
    const input = userInput.toLowerCase();
    
    // Discovery patterns
    if (input.includes('setup') || input.includes('create business') || 
        input.includes('new process') || input.includes('getting started') ||
        context.currentProcesses.size === 0) {
      return 'discovery';
    }
    
    // Modification patterns
    if (input.includes('change') || input.includes('modify') || 
        input.includes('update') || input.includes('improve') ||
        input.includes('optimize') || input.includes('speed up') ||
        input.includes('reduce time') || input.includes('add step')) {
      return 'modification';
    }
    
    // Analysis patterns
    if (input.includes('analyze') || input.includes('performance') ||
        input.includes('how is') || input.includes('why') ||
        input.includes('what\'s wrong') || input.includes('bottleneck') ||
        input.includes('metrics') || input.includes('dashboard')) {
      return 'analysis';
    }
    
    // Execution patterns
    if (input.includes('start') || input.includes('run') ||
        input.includes('execute') || input.includes('pause') ||
        input.includes('stop') || input.includes('resume') ||
        input.includes('assign task')) {
      return 'execution';
    }
    
    // Help patterns
    if (input.includes('help') || input.includes('how do') ||
        input.includes('explain') || input.includes('what can') ||
        input.includes('tutorial') || input.includes('guide')) {
      return 'help';
    }
    
    // Default to discovery for new users, analysis for existing
    return context.currentProcesses.size === 0 ? 'discovery' : 'analysis';
  }

  private async handleDiscoveryIntent(intent: ConversationIntent): Promise<AIResponse> {
    // Determine if this is initial business setup or adding new processes
    const isInitialSetup = this.currentContext.currentProcesses.size === 0;
    
    if (isInitialSetup) {
      return await this.initiateBusinessDiscovery();
    } else {
      return await this.handleProcessAddition(intent);
    }
  }

  private async initiateBusinessDiscovery(): Promise<AIResponse> {
    const discoveryQuestions = this.getInitialDiscoveryQuestions();
    
    return {
      message: `Welcome to Orgata IDE! I'll help you set up your business processes. 
      
Let's start with understanding your business. ${discoveryQuestions[0].text}`,
      proposedActions: [],
      confidenceLevel: 0.95,
      requiresApproval: false,
      suggestedQuestions: [
        "I run a photography business",
        "I'm starting a consulting practice", 
        "I have a small service business",
        "I operate a creative agency"
      ]
    };
  }

  private async handleModificationIntent(intent: ConversationIntent): Promise<AIResponse> {
    const targetProcesses = this.identifyTargetProcesses(intent.entities);
    
    if (targetProcesses.length === 0) {
      return {
        message: "I'd be happy to help modify your processes! Could you specify which process you'd like to change? Here are your current processes:\n\n" +
                this.listCurrentProcesses(),
        proposedActions: [],
        confidenceLevel: 0.7,
        requiresApproval: false,
        suggestedQuestions: this.generateProcessSuggestions()
      };
    }
    
    // Analyze the proposed modification
    const modifications = await this.generateModifications(intent, targetProcesses);
    const knitAnalysis = await this.knitService.analyzeModifications(modifications);
    
    return {
      message: await this.formatModificationResponse(modifications, knitAnalysis),
      proposedActions: modifications,
      knitAnalysis,
      confidenceLevel: 0.85,
      requiresApproval: knitAnalysis.requiresApproval,
      visualizations: await this.generateModificationVisualization(modifications)
    };
  }

  private async handleAnalysisIntent(intent: ConversationIntent): Promise<AIResponse> {
    const analysisResults = await this.processAnalyzer.analyzeBusinessPerformance(
      this.currentContext
    );
    
    return {
      message: this.formatAnalysisResponse(analysisResults),
      proposedActions: [],
      confidenceLevel: 0.9,
      requiresApproval: false,
      visualizations: await this.generateAnalysisVisualization(analysisResults)
    };
  }

  private async handleExecutionIntent(intent: ConversationIntent): Promise<AIResponse> {
    // Implementation for process execution commands
    return {
      message: "Process execution capabilities are being implemented. I can help you start, pause, or monitor your business processes.",
      proposedActions: [],
      confidenceLevel: 0.8,
      requiresApproval: false
    };
  }

  private async handleHelpIntent(intent: ConversationIntent): Promise<AIResponse> {
    const helpContent = this.generateContextualHelp(intent);
    
    return {
      message: helpContent.message,
      proposedActions: [],
      confidenceLevel: 0.95,
      requiresApproval: false,
      suggestedQuestions: helpContent.suggestions
    };
  }

  private async handleUnknownIntent(intent: ConversationIntent): Promise<AIResponse> {
    return {
      message: `I'm not sure I understand what you'd like to do. Could you clarify? I can help you with:

• Setting up new business processes
• Modifying existing processes  
• Analyzing process performance
• Executing and monitoring processes
• General guidance and help

What would you like to work on?`,
      proposedActions: [],
      confidenceLevel: 0.5,
      requiresApproval: false,
      suggestedQuestions: [
        "Help me set up my business processes",
        "I want to improve my client onboarding",
        "Show me my process performance",
        "How do I start a new project?"
      ]
    };
  }

  // Helper methods
  private calculateConfidence(
    userInput: string, 
    intentType: string, 
    entities: ExtractedEntity[]
  ): number {
    let confidence = 0.5;
    
    // Boost confidence based on clear intent indicators
    const intentKeywords = this.getIntentKeywords(intentType);
    const hasIntentKeywords = intentKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );
    
    if (hasIntentKeywords) confidence += 0.2;
    if (entities.length > 0) confidence += 0.1;
    if (entities.length > 2) confidence += 0.1;
    
    // Boost if entities have business file references
    const hasBusinessReferences = entities.some(e => e.busyFileReference);
    if (hasBusinessReferences) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private getIntentKeywords(intentType: string): string[] {
    const keywordMap: Record<string, string[]> = {
      discovery: ['setup', 'create', 'new', 'start', 'begin', 'initialize'],
      modification: ['change', 'modify', 'update', 'improve', 'optimize', 'add', 'remove'],
      analysis: ['analyze', 'performance', 'metrics', 'how', 'why', 'report'],
      execution: ['start', 'run', 'execute', 'pause', 'stop', 'resume'],
      help: ['help', 'how', 'explain', 'guide', 'tutorial', 'what']
    };
    
    return keywordMap[intentType] || [];
  }

  private findRelatedBusyFile(match: string, type: string): string | undefined {
    // Search through current processes for related files
    for (const [filePath, process] of this.currentContext.currentProcesses) {
      if (process.content.toLowerCase().includes(match.toLowerCase()) ||
          process.name.toLowerCase().includes(match.toLowerCase())) {
        return filePath;
      }
    }
    
    return undefined;
  }

  private updateContext(intent: ConversationIntent, userInput: string): void {
    // Update conversation goals based on intent
    if (!this.currentContext.conversationGoals.includes(intent.type)) {
      this.currentContext.conversationGoals.push(intent.type);
    }
    
    // Extract business information from entities
    intent.entities.forEach(entity => {
      if (entity.type === 'process' && entity.busyFileReference) {
        // Update process context
      }
    });
  }

  private initializeContext(): BusinessContext {
    return {
      industry: '',
      businessSize: 'solo',
      currentProcesses: new Map(),
      executionMetrics: [],
      recentModifications: [],
      userRole: {
        id: 'user-1',
        name: 'Business Owner',
        permissions: [],
        businessDomains: []
      },
      conversationGoals: [],
      sessionId: this.generateId()
    };
  }

  private getInitialDiscoveryQuestions(): DiscoveryQuestion[] {
    return [
      {
        id: 'business-type',
        text: 'What type of business are you running?',
        type: 'open',
        mapsTo: { busyElement: 'business-domain', attribute: 'industry' },
        priority: 'high'
      },
      {
        id: 'team-size',
        text: 'How many people work in your business?',
        type: 'choice',
        options: ['Just me', '2-5 people', '6-20 people', '20+ people'],
        mapsTo: { busyElement: 'team', attribute: 'size' },
        priority: 'high'
      },
      {
        id: 'main-processes',
        text: 'What are your main business processes?',
        type: 'open',
        mapsTo: { busyElement: 'processes', attribute: 'types' },
        priority: 'high'
      }
    ];
  }

  private identifyTargetProcesses(entities: ExtractedEntity[]): BusyProcess[] {
    const processes: BusyProcess[] = [];
    
    entities.forEach(entity => {
      if (entity.busyFileReference) {
        const process = this.currentContext.currentProcesses.get(entity.busyFileReference);
        if (process) {
          processes.push(process);
        }
      }
    });
    
    return processes;
  }

  private async generateModifications(
    intent: ConversationIntent, 
    targetProcesses: BusyProcess[]
  ): Promise<BusyFileModification[]> {
    // This would use the BUSY generator service to create modifications
    return this.busyGenerator.generateModifications(intent, targetProcesses);
  }

  private async formatModificationResponse(
    modifications: BusyFileModification[],
    knitAnalysis: any
  ): Promise<string> {
    let response = "I can help you make those changes. Here's what I found:\n\n";
    
    modifications.forEach(mod => {
      response += `📝 ${mod.type} in ${mod.filePath}\n`;
      response += `   ${mod.reason}\n\n`;
    });
    
    if (knitAnalysis.hasBreakingChanges) {
      response += "⚠️ This change affects other processes and requires review.\n";
    } else if (knitAnalysis.dependentProcesses.length > 0) {
      response += `✅ I can automatically update ${knitAnalysis.dependentProcesses.length} related processes.\n`;
    }
    
    return response;
  }

  private listCurrentProcesses(): string {
    if (this.currentContext.currentProcesses.size === 0) {
      return "You don't have any processes set up yet.";
    }
    
    const processes = Array.from(this.currentContext.currentProcesses.values());
    return processes.map(p => `• ${p.name} (${p.domain})`).join('\n');
  }

  private generateProcessSuggestions(): string[] {
    return [
      "Update the client onboarding process",
      "Improve the project delivery workflow",
      "Optimize the team coordination process",
      "Add a quality check step"
    ];
  }

  private formatAnalysisResponse(analysisResults: any): string {
    return "Here's your business performance analysis:\n\n" +
           "📊 Overall efficiency: " + (analysisResults.efficiency || 'N/A') + "\n" +
           "⭐ Quality score: " + (analysisResults.quality || 'N/A') + "\n" +
           "🎯 On-time delivery: " + (analysisResults.onTime || 'N/A') + "\n\n" +
           "I can provide more detailed insights if needed.";
  }

  private generateContextualHelp(intent: ConversationIntent): { message: string; suggestions: string[] } {
    return {
      message: `I'm here to help you manage your business processes through conversation. I can:

• **Discover & Setup**: Interview you to create BUSY process files
• **Modify Processes**: Update workflows, timelines, and responsibilities  
• **Analyze Performance**: Review metrics and identify improvements
• **Execute Processes**: Start, monitor, and manage running processes

What would you like to learn more about?`,
      suggestions: [
        "How do I set up a new business process?",
        "Can you explain process modification?",
        "Show me performance analytics",
        "How does process execution work?"
      ]
    };
  }

  private async generateModificationVisualization(modifications: BusyFileModification[]): Promise<any[]> {
    // Generate process flow diagrams showing before/after states
    return [];
  }

  private async generateAnalysisVisualization(analysisResults: any): Promise<any[]> {
    // Generate charts and dashboards for business metrics
    return [];
  }

  private createErrorResponse(error: any): AIResponse {
    return {
      message: "I encountered an issue processing your request. Could you please try rephrasing or let me know if you need help?",
      proposedActions: [],
      confidenceLevel: 0.0,
      requiresApproval: false,
      suggestedQuestions: [
        "Help me get started",
        "What can you do?",
        "Show me my processes"
      ]
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}