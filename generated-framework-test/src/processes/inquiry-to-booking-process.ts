/**
 * inquiry-to-booking Process
 * 
 * Generated from: inquiry-to-booking.busy
 * Description: Systematic process for converting inquiries into confirmed bookings
 * 
 * 🔗 Design Source: ../../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 */

import { Process, ProcessConfig, ProcessContext, ProcessResult } from '@orgata/framework';
import { AcknowledgeInquiryStep } from '../steps/acknowledge-inquiry-step';
import { QualifyLeadStep } from '../steps/qualify-lead-step';
import { SendPortfolioAndPricingStep } from '../steps/send-portfolio-and-pricing-step';
import { ScheduleConsultationStep } from '../steps/schedule-consultation-step';
import { ConductConsultationStep } from '../steps/conduct-consultation-step';
import { ProcessBookingStep } from '../steps/process-booking-step';

export class InquiryToBookingProcess extends Process {
  constructor() {
    super({
      name: "inquiry-to-booking",
      description: "Systematic process for converting inquiries into confirmed bookings",
      layer: "L0",
      metadata: {
        generatedFrom: "inquiry-to-booking.busy",
        generatedAt: "2025-07-22T02:24:51.270Z",
        busyVersion: "1.0.0"
      }
    });
    
    // Add all steps in sequence
    this.addStep(new AcknowledgeInquiryStep());
    this.addStep(new QualifyLeadStep());
    this.addStep(new SendPortfolioAndPricingStep());
    this.addStep(new ScheduleConsultationStep());
    this.addStep(new ConductConsultationStep());
    this.addStep(new ProcessBookingStep());
  }
  
  async execute(context: ProcessContext): Promise<ProcessResult> {
    // Framework handles step-by-step execution with complete flexibility
    // Users can skip steps, go back, or provide manual data at any point
    return await this.executeSteps(context);
  }
}