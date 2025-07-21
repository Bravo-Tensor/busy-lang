import { 
  ConversationIntent, 
  BusyFileModification, 
  BusyProcess, 
  InterviewTemplate,
  DiscoveryQuestion,
  BusyProcessTemplate 
} from '@/types/conversation';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

export class BusyGeneratorService {
  private templates: Map<string, InterviewTemplate> = new Map();
  private processTemplates: Map<string, BusyProcessTemplate> = new Map();

  constructor() {
    this.loadTemplates();
  }

  async generateBusinessFromInterview(
    answers: Record<string, any>,
    industry: string
  ): Promise<BusyFileModification[]> {
    const template = this.templates.get(industry) || this.getGenericTemplate();
    const modifications: BusyFileModification[] = [];

    // Generate core business structure
    const businessStructure = this.createBusinessStructure(answers, industry);
    modifications.push(...businessStructure);

    // Generate specific processes based on answers
    const processes = await this.generateProcessesFromAnswers(answers, template);
    modifications.push(...processes);

    return modifications;
  }

  async generateModifications(
    intent: ConversationIntent,
    targetProcesses: BusyProcess[]
  ): Promise<BusyFileModification[]> {
    const modifications: BusyFileModification[] = [];
    
    // Analyze intent to determine modification type
    const modificationType = this.determineModificationType(intent);
    
    for (const process of targetProcesses) {
      const processModifications = await this.generateProcessModifications(
        process,
        intent,
        modificationType
      );
      modifications.push(...processModifications);
    }

    return modifications;
  }

  private async generateProcessModifications(
    process: BusyProcess,
    intent: ConversationIntent,
    modificationType: string
  ): Promise<BusyFileModification[]> {
    const modifications: BusyFileModification[] = [];
    
    switch (modificationType) {
      case 'optimize_timeline':
        modifications.push(...this.optimizeProcessTimeline(process, intent));
        break;
      case 'add_step':
        modifications.push(...this.addProcessStep(process, intent));
        break;
      case 'remove_step':
        modifications.push(...this.removeProcessStep(process, intent));
        break;
      case 'modify_assignments':
        modifications.push(...this.modifyAssignments(process, intent));
        break;
      case 'improve_quality':
        modifications.push(...this.improveQualityGates(process, intent));
        break;
      default:
        modifications.push(...this.generateGenericModification(process, intent));
    }

    return modifications;
  }

  private createBusinessStructure(
    answers: Record<string, any>,
    industry: string
  ): BusyFileModification[] {
    const modifications: BusyFileModification[] = [];
    
    // Create main business directory structure
    const businessName = this.sanitizeFileName(answers.businessName || 'my-business');
    const basePath = `businesses/${businessName}`;

    // L0 - Operational Layer
    modifications.push(this.createTeamStructure(basePath, answers));
    modifications.push(this.createClientOperations(basePath, answers));
    modifications.push(this.createCoreOperations(basePath, answers, industry));

    // L1 - Management Layer (if team size > 1)
    if (answers.teamSize && parseInt(answers.teamSize) > 1) {
      modifications.push(this.createManagementLayer(basePath, answers));
    }

    // L2 - Strategic Layer (if business size > small)
    if (answers.businessSize && answers.businessSize !== 'solo') {
      modifications.push(this.createStrategicLayer(basePath, answers));
    }

    return modifications;
  }

  private createTeamStructure(basePath: string, answers: Record<string, any>): BusyFileModification {
    const teamData = {
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        layer: 'L0',
        domain: 'team-management'
      },
      team: {
        name: answers.businessName || 'Business Team',
        size: parseInt(answers.teamSize) || 1,
        structure: this.generateTeamStructure(answers),
        roles: this.generateRoles(answers),
        communication: this.generateCommunicationRules(answers)
      }
    };

    return {
      id: this.generateId(),
      type: 'create',
      filePath: `${basePath}/L0/team-management/team.busy`,
      changes: [{
        operation: 'add',
        path: '/',
        newValue: yaml.stringify(teamData),
        description: 'Create main team structure'
      }],
      reason: 'Initial business setup - team structure',
      impact: {
        scope: 'system',
        affectedProcesses: [],
        riskLevel: 'low',
        estimatedEffort: 30,
        breakingChanges: false
      },
      timestamp: new Date()
    };
  }

  private createClientOperations(basePath: string, answers: Record<string, any>): BusyFileModification {
    const clientOpsData = {
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        layer: 'L0',
        domain: 'client-operations'
      },
      processes: {
        'client-onboarding': {
          name: 'Client Onboarding Process',
          steps: this.generateOnboardingSteps(answers),
          timeline: this.calculateTimeline(answers.onboardingDuration || '3 days'),
          quality_gates: this.generateQualityGates('onboarding'),
          resources: this.generateRequiredResources('onboarding', answers)
        },
        'project-delivery': {
          name: 'Project Delivery Process',
          steps: this.generateDeliverySteps(answers),
          timeline: this.calculateTimeline(answers.projectDuration || '2 weeks'),
          quality_gates: this.generateQualityGates('delivery'),
          resources: this.generateRequiredResources('delivery', answers)
        }
      }
    };

    return {
      id: this.generateId(),
      type: 'create',
      filePath: `${basePath}/L0/client-operations/client-operations.busy`,
      changes: [{
        operation: 'add',
        path: '/',
        newValue: yaml.stringify(clientOpsData),
        description: 'Create client operations processes'
      }],
      reason: 'Initial business setup - client operations',
      impact: {
        scope: 'module',
        affectedProcesses: [],
        riskLevel: 'low',
        estimatedEffort: 45,
        breakingChanges: false
      },
      timestamp: new Date()
    };
  }

  private createCoreOperations(
    basePath: string, 
    answers: Record<string, any>, 
    industry: string
  ): BusyFileModification {
    const industryTemplate = this.getIndustrySpecificOperations(industry, answers);
    
    return {
      id: this.generateId(),
      type: 'create',
      filePath: `${basePath}/L0/core-operations/core-operations.busy`,
      changes: [{
        operation: 'add',
        path: '/',
        newValue: yaml.stringify(industryTemplate),
        description: `Create ${industry}-specific core operations`
      }],
      reason: `Initial business setup - ${industry} operations`,
      impact: {
        scope: 'module',
        affectedProcesses: [],
        riskLevel: 'low',
        estimatedEffort: 60,
        breakingChanges: false
      },
      timestamp: new Date()
    };
  }

  private optimizeProcessTimeline(process: BusyProcess, intent: ConversationIntent): BusyFileModification[] {
    const modifications: BusyFileModification[] = [];
    
    // Extract timeline optimization intent
    const currentContent = yaml.parse(process.content);
    const targetReduction = this.extractTimelineReduction(intent);
    
    // Optimize by parallelizing steps or reducing individual step durations
    const optimizedSteps = this.parallelizeSteps(currentContent.processes || currentContent.steps);
    const optimizedContent = {
      ...currentContent,
      processes: optimizedSteps,
      metadata: {
        ...currentContent.metadata,
        lastModified: new Date().toISOString(),
        optimization: {
          type: 'timeline',
          targetReduction,
          appliedOn: new Date().toISOString()
        }
      }
    };

    modifications.push({
      id: this.generateId(),
      type: 'update',
      filePath: process.filePath,
      changes: [{
        operation: 'modify',
        path: '/processes',
        oldValue: currentContent.processes,
        newValue: optimizedSteps,
        description: `Optimized timeline by ${targetReduction}%`
      }],
      reason: 'Timeline optimization requested through conversation',
      impact: {
        scope: 'process',
        affectedProcesses: [process.id],
        riskLevel: 'medium',
        estimatedEffort: 30,
        breakingChanges: false
      },
      timestamp: new Date()
    });

    return modifications;
  }

  private addProcessStep(process: BusyProcess, intent: ConversationIntent): BusyFileModification[] {
    const modifications: BusyFileModification[] = [];
    
    // Extract step details from intent
    const stepDetails = this.extractStepDetails(intent);
    const insertPosition = this.determineInsertPosition(intent, process);
    
    const currentContent = yaml.parse(process.content);
    const newStep = this.generateNewStep(stepDetails);
    
    // Insert the new step
    const updatedSteps = this.insertStep(currentContent.processes || currentContent.steps, newStep, insertPosition);
    
    modifications.push({
      id: this.generateId(),
      type: 'update',
      filePath: process.filePath,
      changes: [{
        operation: 'add',
        path: `/processes/${insertPosition}`,
        newValue: newStep,
        description: `Added new step: ${newStep.name}`
      }],
      reason: 'New process step requested through conversation',
      impact: {
        scope: 'process',
        affectedProcesses: [process.id],
        riskLevel: 'low',
        estimatedEffort: 15,
        breakingChanges: false
      },
      timestamp: new Date()
    });

    return modifications;
  }

  // Industry-specific templates
  private getIndustrySpecificOperations(industry: string, answers: Record<string, any>): any {
    const templates: Record<string, any> = {
      photography: this.getPhotographyOperations(answers),
      consulting: this.getConsultingOperations(answers),
      'creative-agency': this.getCreativeAgencyOperations(answers),
      'e-commerce': this.getECommerceOperations(answers),
      generic: this.getGenericOperations(answers)
    };

    return templates[industry] || templates.generic;
  }

  private getPhotographyOperations(answers: Record<string, any>): any {
    return {
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        layer: 'L0',
        domain: 'creative-production',
        industry: 'photography'
      },
      processes: {
        'photo-production': {
          name: 'Photography Production Process',
          steps: [
            {
              id: 'pre-shoot-planning',
              name: 'Pre-Shoot Planning',
              duration: '2 hours',
              assignee: 'photographer',
              tasks: [
                'Review client brief and requirements',
                'Scout location if needed',
                'Prepare equipment checklist',
                'Confirm timeline with client'
              ]
            },
            {
              id: 'photo-shoot',
              name: 'Photo Shoot Execution',
              duration: answers.shootDuration || '4 hours',
              assignee: 'photographer',
              tasks: [
                'Set up equipment and lighting',
                'Conduct photo session',
                'Review shots with client',
                'Pack and secure equipment'
              ]
            },
            {
              id: 'post-processing',
              name: 'Photo Editing and Processing',
              duration: '6 hours',
              assignee: 'photo-editor',
              tasks: [
                'Import and organize photos',
                'Perform initial culling',
                'Edit selected photos',
                'Prepare final deliverables'
              ]
            },
            {
              id: 'delivery',
              name: 'Client Delivery',
              duration: '1 hour',
              assignee: 'project-coordinator',
              tasks: [
                'Upload photos to delivery platform',
                'Send delivery notification to client',
                'Collect final feedback',
                'Archive project files'
              ]
            }
          ],
          quality_gates: [
            {
              stage: 'post-shoot',
              criteria: 'Minimum 50 usable shots captured',
              required: true
            },
            {
              stage: 'post-processing',
              criteria: 'Client approval on edited sample',
              required: true
            }
          ]
        }
      }
    };
  }

  private getConsultingOperations(answers: Record<string, any>): any {
    return {
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        layer: 'L0',
        domain: 'consulting-delivery',
        industry: 'consulting'
      },
      processes: {
        'consulting-engagement': {
          name: 'Consulting Engagement Process',
          steps: [
            {
              id: 'discovery',
              name: 'Client Discovery & Assessment',
              duration: answers.discoveryDuration || '1 week',
              assignee: 'senior-consultant',
              tasks: [
                'Conduct stakeholder interviews',
                'Analyze current state',
                'Identify key challenges',
                'Define success criteria'
              ]
            },
            {
              id: 'analysis',
              name: 'Analysis & Strategy Development',
              duration: '2 weeks',
              assignee: 'consultant-team',
              tasks: [
                'Perform detailed analysis',
                'Benchmark against best practices',
                'Develop recommendations',
                'Create implementation roadmap'
              ]
            },
            {
              id: 'presentation',
              name: 'Findings Presentation',
              duration: '3 days',
              assignee: 'senior-consultant',
              tasks: [
                'Prepare presentation materials',
                'Present findings to stakeholders',
                'Facilitate discussion',
                'Finalize recommendations'
              ]
            },
            {
              id: 'implementation-support',
              name: 'Implementation Support',
              duration: answers.implementationDuration || '4 weeks',
              assignee: 'consultant-team',
              tasks: [
                'Support implementation activities',
                'Provide training and guidance',
                'Monitor progress',
                'Adjust approach as needed'
              ]
            }
          ]
        }
      }
    };
  }

  // Utility methods
  private generateTeamStructure(answers: Record<string, any>): any {
    const teamSize = parseInt(answers.teamSize) || 1;
    
    if (teamSize === 1) {
      return { type: 'solo', lead: 'business-owner' };
    } else if (teamSize <= 5) {
      return { type: 'small-team', lead: 'business-owner', structure: 'flat' };
    } else {
      return { type: 'structured-team', lead: 'business-owner', structure: 'hierarchical' };
    }
  }

  private generateRoles(answers: Record<string, any>): any[] {
    const baseRoles = [
      {
        id: 'business-owner',
        name: 'Business Owner',
        responsibilities: ['Strategic decisions', 'Client relationships', 'Quality oversight']
      }
    ];

    const teamSize = parseInt(answers.teamSize) || 1;
    if (teamSize > 1) {
      baseRoles.push({
        id: 'team-member',
        name: 'Team Member',
        responsibilities: ['Task execution', 'Quality delivery', 'Collaboration']
      });
    }

    return baseRoles;
  }

  private generateOnboardingSteps(answers: Record<string, any>): any[] {
    return [
      {
        id: 'initial-contact',
        name: 'Initial Client Contact',
        duration: '30 minutes',
        assignee: 'business-owner'
      },
      {
        id: 'needs-assessment',
        name: 'Needs Assessment',
        duration: '1 hour',
        assignee: 'business-owner'
      },
      {
        id: 'proposal-creation',
        name: 'Create Proposal',
        duration: '2 hours',
        assignee: 'business-owner'
      },
      {
        id: 'contract-signing',
        name: 'Contract Signing',
        duration: '30 minutes',
        assignee: 'business-owner'
      }
    ];
  }

  private generateDeliverySteps(answers: Record<string, any>): any[] {
    return [
      {
        id: 'project-kickoff',
        name: 'Project Kickoff',
        duration: '1 hour',
        assignee: 'business-owner'
      },
      {
        id: 'execution',
        name: 'Project Execution',
        duration: answers.projectDuration || '1 week',
        assignee: 'team-member'
      },
      {
        id: 'quality-review',
        name: 'Quality Review',
        duration: '2 hours',
        assignee: 'business-owner'
      },
      {
        id: 'client-delivery',
        name: 'Client Delivery',
        duration: '1 hour',
        assignee: 'business-owner'
      }
    ];
  }

  private extractTimelineReduction(intent: ConversationIntent): number {
    // Extract percentage reduction from user intent
    const text = intent.originalText.toLowerCase();
    const percentMatch = text.match(/(\d+)%/);
    if (percentMatch) {
      return parseInt(percentMatch[1]);
    }
    
    // Look for time-based reductions
    if (text.includes('half') || text.includes('50%')) return 50;
    if (text.includes('third') || text.includes('30%')) return 30;
    if (text.includes('quarter') || text.includes('25%')) return 25;
    
    // Default reduction
    return 20;
  }

  private parallelizeSteps(processes: any): any {
    // Logic to identify steps that can be run in parallel
    // This is a simplified version - would need more sophisticated analysis
    return processes;
  }

  private extractStepDetails(intent: ConversationIntent): any {
    // Extract step information from conversation intent
    const entities = intent.entities;
    const stepName = entities.find(e => e.type === 'process')?.value || 'New Step';
    
    return {
      name: stepName,
      type: 'manual',
      duration: '1 hour',
      description: intent.originalText
    };
  }

  private determineInsertPosition(intent: ConversationIntent, process: BusyProcess): string {
    // Determine where to insert the new step
    const text = intent.originalText.toLowerCase();
    
    if (text.includes('before')) return 'before';
    if (text.includes('after')) return 'after';
    if (text.includes('beginning') || text.includes('start')) return 'start';
    if (text.includes('end') || text.includes('last')) return 'end';
    
    return 'end'; // default
  }

  private generateNewStep(stepDetails: any): any {
    return {
      id: this.generateId(),
      name: stepDetails.name,
      duration: stepDetails.duration,
      type: stepDetails.type,
      tasks: [stepDetails.description],
      assignee: 'team-member'
    };
  }

  private insertStep(processes: any, newStep: any, position: string): any {
    // Insert step logic based on position
    return processes;
  }

  private loadTemplates(): void {
    // Load interview templates for different industries
    this.templates.set('photography', this.createPhotographyTemplate());
    this.templates.set('consulting', this.createConsultingTemplate());
    this.templates.set('generic', this.createGenericTemplate());
  }

  private createPhotographyTemplate(): InterviewTemplate {
    return {
      industry: 'photography',
      questions: [
        {
          id: 'photography-type',
          text: 'What type of photography do you specialize in?',
          type: 'choice',
          options: ['Wedding', 'Portrait', 'Commercial', 'Event', 'Product'],
          mapsTo: { busyElement: 'business-domain', attribute: 'specialization' },
          priority: 'high'
        },
        {
          id: 'equipment-level',
          text: 'What level of equipment do you work with?',
          type: 'choice',
          options: ['Basic', 'Intermediate', 'Professional', 'High-end'],
          mapsTo: { busyElement: 'resources', attribute: 'equipment' },
          priority: 'medium'
        }
      ],
      followUpLogic: {},
      busyTemplates: []
    };
  }

  private createConsultingTemplate(): InterviewTemplate {
    return {
      industry: 'consulting',
      questions: [
        {
          id: 'consulting-domain',
          text: 'What area do you provide consulting in?',
          type: 'open',
          mapsTo: { busyElement: 'business-domain', attribute: 'expertise' },
          priority: 'high'
        },
        {
          id: 'project-duration',
          text: 'What is your typical project duration?',
          type: 'choice',
          options: ['1-2 weeks', '1 month', '3 months', '6+ months'],
          mapsTo: { busyElement: 'timeline', attribute: 'typical-duration' },
          priority: 'high'
        }
      ],
      followUpLogic: {},
      busyTemplates: []
    };
  }

  private getGenericTemplate(): InterviewTemplate {
    return {
      industry: 'generic',
      questions: [
        {
          id: 'business-type',
          text: 'What type of business do you run?',
          type: 'open',
          mapsTo: { busyElement: 'business-domain', attribute: 'type' },
          priority: 'high'
        }
      ],
      followUpLogic: {},
      busyTemplates: []
    };
  }

  private createManagementLayer(basePath: string, answers: Record<string, any>): BusyFileModification {
    // Create L1 management processes
    return {
      id: this.generateId(),
      type: 'create',
      filePath: `${basePath}/L1/management/team-management.busy`,
      changes: [],
      reason: 'Management layer for team coordination',
      impact: {
        scope: 'module',
        affectedProcesses: [],
        riskLevel: 'low',
        estimatedEffort: 30,
        breakingChanges: false
      },
      timestamp: new Date()
    };
  }

  private createStrategicLayer(basePath: string, answers: Record<string, any>): BusyFileModification {
    // Create L2 strategic processes
    return {
      id: this.generateId(),
      type: 'create',
      filePath: `${basePath}/L2/strategy/business-strategy.busy`,
      changes: [],
      reason: 'Strategic layer for business planning',
      impact: {
        scope: 'system',
        affectedProcesses: [],
        riskLevel: 'low',
        estimatedEffort: 45,
        breakingChanges: false
      },
      timestamp: new Date()
    };
  }

  private determineModificationType(intent: ConversationIntent): string {
    const text = intent.originalText.toLowerCase();
    
    if (text.includes('faster') || text.includes('speed') || text.includes('reduce time')) {
      return 'optimize_timeline';
    }
    if (text.includes('add') && text.includes('step')) {
      return 'add_step';
    }
    if (text.includes('remove') || text.includes('delete')) {
      return 'remove_step';
    }
    if (text.includes('assign') || text.includes('responsibility')) {
      return 'modify_assignments';
    }
    if (text.includes('quality') || text.includes('review')) {
      return 'improve_quality';
    }
    
    return 'generic_modification';
  }

  private removeProcessStep(process: BusyProcess, intent: ConversationIntent): BusyFileModification[] {
    // Implementation for removing steps
    return [];
  }

  private modifyAssignments(process: BusyProcess, intent: ConversationIntent): BusyFileModification[] {
    // Implementation for modifying assignments
    return [];
  }

  private improveQualityGates(process: BusyProcess, intent: ConversationIntent): BusyFileModification[] {
    // Implementation for improving quality gates
    return [];
  }

  private generateGenericModification(process: BusyProcess, intent: ConversationIntent): BusyFileModification[] {
    // Implementation for generic modifications
    return [];
  }

  private generateQualityGates(processType: string): any[] {
    const qualityGates: Record<string, any[]> = {
      onboarding: [
        { stage: 'proposal', criteria: 'Client requirements understood', required: true },
        { stage: 'contract', criteria: 'All terms agreed upon', required: true }
      ],
      delivery: [
        { stage: 'execution', criteria: 'Quality standards met', required: true },
        { stage: 'delivery', criteria: 'Client satisfaction > 8/10', required: false }
      ]
    };

    return qualityGates[processType] || [];
  }

  private generateRequiredResources(processType: string, answers: Record<string, any>): any[] {
    return [
      { type: 'human', role: 'business-owner', allocation: '100%' },
      { type: 'time', amount: '1 day' }
    ];
  }

  private calculateTimeline(duration: string): any {
    return {
      estimated: duration,
      breakdown: [
        { phase: 'planning', duration: '20%' },
        { phase: 'execution', duration: '70%' },
        { phase: 'review', duration: '10%' }
      ]
    };
  }

  private getGenericOperations(answers: Record<string, any>): any {
    return {
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        layer: 'L0',
        domain: 'core-operations',
        industry: 'generic'
      },
      processes: {
        'main-process': {
          name: 'Main Business Process',
          steps: [
            { id: 'start', name: 'Process Start', duration: '1 hour' },
            { id: 'execute', name: 'Execute Work', duration: '4 hours' },
            { id: 'complete', name: 'Complete Process', duration: '1 hour' }
          ]
        }
      }
    };
  }

  private getCreativeAgencyOperations(answers: Record<string, any>): any {
    return this.getGenericOperations(answers);
  }

  private getECommerceOperations(answers: Record<string, any>): any {
    return this.getGenericOperations(answers);
  }

  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}