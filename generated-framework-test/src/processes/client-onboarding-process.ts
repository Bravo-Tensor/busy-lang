/**
 * client-onboarding Process
 * 
 * Generated from: client-onboarding.busy
 * Description: Comprehensive onboarding process to set expectations and gather shoot requirements
 * 
 * 🔗 Design Source: ../../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 */

import { Process, ProcessConfig, ProcessContext, ProcessResult } from '@orgata/framework';
import { SendWelcomePackageStep } from '../steps/send-welcome-package-step';
import { ClientQuestionnaireStep } from '../steps/client-questionnaire-step';
import { TimelinePlanningStep } from '../steps/timeline-planning-step';
import { LocationScoutingCoordinationStep } from '../steps/location-scouting-coordination-step';
import { PreShootCallStep } from '../steps/pre-shoot-call-step';
import { ShootPreparationHandoffStep } from '../steps/shoot-preparation-handoff-step';

export class ClientOnboardingProcess extends Process {
  constructor() {
    super({
      name: "client-onboarding",
      description: "Comprehensive onboarding process to set expectations and gather shoot requirements",
      layer: "L0",
      metadata: {
        generatedFrom: "client-onboarding.busy",
        generatedAt: "2025-07-22T02:24:51.268Z",
        busyVersion: "1.0.0"
      }
    });
    
    // Add all steps in sequence
    this.addStep(new SendWelcomePackageStep());
    this.addStep(new ClientQuestionnaireStep());
    this.addStep(new TimelinePlanningStep());
    this.addStep(new LocationScoutingCoordinationStep());
    this.addStep(new PreShootCallStep());
    this.addStep(new ShootPreparationHandoffStep());
  }
  
  async execute(context: ProcessContext): Promise<ProcessResult> {
    // Framework handles step-by-step execution with complete flexibility
    // Users can skip steps, go back, or provide manual data at any point
    return await this.executeSteps(context);
  }
}