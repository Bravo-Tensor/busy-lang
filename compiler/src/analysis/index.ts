/**
 * Analysis Module Exports
 * Main entry point for the analysis phase of the BUSY compiler
 */

// Main analyzer
export { Analyzer } from './analyzer';

// Core analyzers
export { SemanticAnalyzer } from './semantic-analyzer';
export { DependencyResolver } from './dependency-resolver';

// Placeholder analyzers (to be implemented)
export { TypeChecker } from './type-checker';
export { InterfaceValidator } from './interface-validator';
export { GovernanceValidator } from './governance-validator';
export { ResourceAnalyzer } from './resource-analyzer';
export { PerformanceAnalyzer } from './performance-analyzer';
export { SecurityAnalyzer } from './security-analyzer';
export { QualityAnalyzer } from './quality-analyzer';

// Types
export type * from './types';

// Default configurations
export { DEFAULT_ANALYSIS_CONFIG } from './types';