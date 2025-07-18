
// Generated form types for UI components
import { ReactNode } from 'react';
import { Task } from './busy-types';
import { ProcessState } from './runtime-types';

export interface FormFieldProps {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  options?: string[];
  validation?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export interface TaskFormProps {
  task: Task;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface ProcessStepProps {
  processState: ProcessState;
  currentTask: Task;
  onStepComplete: (outputData: Record<string, any>) => void;
  onStepBack?: () => void;
}


// MonthlyFinancials form types
export interface MonthlyFinancialsFormData {
  // TODO: Generate from playbook inputs
  [key: string]: any;
}

export interface MonthlyFinancialsStepData {
  // TODO: Generate from playbook steps
  [key: string]: any;
}


// VendorManagement form types
export interface VendorManagementFormData {
  // TODO: Generate from playbook inputs
  [key: string]: any;
}

export interface VendorManagementStepData {
  // TODO: Generate from playbook steps
  [key: string]: any;
}


// ClientOnboarding form types
export interface ClientOnboardingFormData {
  // TODO: Generate from playbook inputs
  [key: string]: any;
}

export interface ClientOnboardingStepData {
  // TODO: Generate from playbook steps
  [key: string]: any;
}


// InquiryToBooking form types
export interface InquiryToBookingFormData {
  // TODO: Generate from playbook inputs
  [key: string]: any;
}

export interface InquiryToBookingStepData {
  // TODO: Generate from playbook steps
  [key: string]: any;
}


// PhotoProduction form types
export interface PhotoProductionFormData {
  // TODO: Generate from playbook inputs
  [key: string]: any;
}

export interface PhotoProductionStepData {
  // TODO: Generate from playbook steps
  [key: string]: any;
}


export interface ReconcileAccountsFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ReconcileAccountsOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface GenerateProfitLossFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface GenerateProfitLossOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface CashFlowAnalysisFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface CashFlowAnalysisOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ExpenseAnalysisFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ExpenseAnalysisOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface TaxPreparationStatusFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface TaxPreparationStatusOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface BusinessHealthAssessmentFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface BusinessHealthAssessmentOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface GenerateMonthlyReportFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface GenerateMonthlyReportOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface PlanningNextMonthFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface PlanningNextMonthOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface VendorNeedsAssessmentFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface VendorNeedsAssessmentOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface VendorResearchAndSourcingFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface VendorResearchAndSourcingOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface VendorEvaluationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface VendorEvaluationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface VendorNegotiationsFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface VendorNegotiationsOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ContractCreationAndExecutionFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ContractCreationAndExecutionOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface VendorOnboardingFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface VendorOnboardingOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface PerformanceMonitoringSetupFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface PerformanceMonitoringSetupOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface QuarterlyVendorReviewFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface QuarterlyVendorReviewOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface VendorPortfolioOptimizationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface VendorPortfolioOptimizationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface CreateClientContractFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface CreateClientContractOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ManageVendorAgreementsFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ManageVendorAgreementsOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ComplianceReviewFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ComplianceReviewOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface GenerateInvoiceFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface GenerateInvoiceOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface TrackExpensesFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface TrackExpensesOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface PaymentFollowUpFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface PaymentFollowUpOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface SendWelcomePackageFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface SendWelcomePackageOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ClientQuestionnaireFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ClientQuestionnaireOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface GatherTimelineRequirementsFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface GatherTimelineRequirementsOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ScheduleKeyMilestonesFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ScheduleKeyMilestonesOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface FinalizeProjectTimelineFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface FinalizeProjectTimelineOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface TimelinePlanningFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface TimelinePlanningOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface LocationScoutingCoordinationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface LocationScoutingCoordinationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface PreShootCallFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface PreShootCallOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ShootPreparationHandoffFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ShootPreparationHandoffOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface AcknowledgeInquiryFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface AcknowledgeInquiryOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface QualifyLeadFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface QualifyLeadOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface SendPortfolioAndPricingFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface SendPortfolioAndPricingOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ScheduleConsultationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ScheduleConsultationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ConductConsultationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ConductConsultationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ProcessBookingFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ProcessBookingOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface RespondToInquiryFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface RespondToInquiryOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ProjectKickoffFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ProjectKickoffOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface PreShootCoordinationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface PreShootCoordinationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface EquipmentPreparationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface EquipmentPreparationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ExecutePhotoshootFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ExecutePhotoshootOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ImmediateBackupFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ImmediateBackupOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface InitialCullAndSelectFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface InitialCullAndSelectOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ColorCorrectionFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ColorCorrectionOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface CreativeEnhancementFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface CreativeEnhancementOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface FinalProcessingFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface FinalProcessingOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface QualityReviewFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface QualityReviewOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface PostProcessingFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface PostProcessingOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ClientPreviewGalleryFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ClientPreviewGalleryOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ClientReviewAndFeedbackFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ClientReviewAndFeedbackOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface FinalDeliveryPreparationFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface FinalDeliveryPreparationOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface ClientDeliveryFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface ClientDeliveryOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface CullAndSelectFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface CullAndSelectOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface EditImagesFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface EditImagesOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface PrepareDeliveryFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface PrepareDeliveryOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}


export interface BackupAndOrganizeFormData {
  // TODO: Generate from task inputs
  [key: string]: any;
}

export interface BackupAndOrganizeOutputData {
  // TODO: Generate from task outputs
  [key: string]: any;
}

