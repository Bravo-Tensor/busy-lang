/**
 * Generated Business Process Framework Code
 * 
 * 🔗 Design Source: ../../design-docs/008-orgata-framework/ORGATA_FRAMEWORK_ARCHITECTURE.md
 */

// Process exports
export { ClientOnboardingProcess } from './processes/client-onboarding-process';
export { InquiryToBookingProcess } from './processes/inquiry-to-booking-process';

// Step exports
export { SendWelcomePackageStep } from './steps/send-welcome-package-step';
export { ClientQuestionnaireStep } from './steps/client-questionnaire-step';
export { TimelinePlanningStep } from './steps/timeline-planning-step';
export { LocationScoutingCoordinationStep } from './steps/location-scouting-coordination-step';
export { PreShootCallStep } from './steps/pre-shoot-call-step';
export { ShootPreparationHandoffStep } from './steps/shoot-preparation-handoff-step';
export { AcknowledgeInquiryStep } from './steps/acknowledge-inquiry-step';
export { QualifyLeadStep } from './steps/qualify-lead-step';
export { SendPortfolioAndPricingStep } from './steps/send-portfolio-and-pricing-step';
export { ScheduleConsultationStep } from './steps/schedule-consultation-step';
export { ConductConsultationStep } from './steps/conduct-consultation-step';
export { ProcessBookingStep } from './steps/process-booking-step';

// Metadata
export const GENERATED_METADATA = {
  generatedAt: '2025-07-22T02:24:51.271Z',
  frameworkVersion: '0.1.0',
  processCount: 2,
  busySources: ['client-onboarding.busy', 'inquiry-to-booking.busy']
};