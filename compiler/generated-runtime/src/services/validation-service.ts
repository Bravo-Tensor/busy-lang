
import { ValidationResult } from '../../types/runtime-types';

export class ValidationService {
  
  async validateProcessData(data: Record<string, any>, rules: any[]): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const rule of rules) {
      try {
        const result = await this.applyValidationRule(data, rule);
        if (!result.isValid) {
          if (result.severity === 'error') {
            errors.push(...result.errors);
          } else {
            warnings.push(...result.errors);
          }
        }
      } catch (error) {
        errors.push({
          field: 'validation',
          message: `Validation rule failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_RULE_ERROR'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateBusinessConstraints(data: Record<string, any>, constraints: any[]): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const constraint of constraints) {
      const isValid = await this.checkBusinessConstraint(data, constraint);
      if (!isValid) {
        const error = {
          field: constraint.field || 'general',
          message: constraint.message || 'Business constraint violation',
          code: constraint.code || 'CONSTRAINT_VIOLATION'
        };

        if (constraint.severity === 'warning') {
          warnings.push(error);
        } else {
          errors.push(error);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateDataIntegrity(data: Record<string, any>): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for common data integrity issues
    
    // Check for null/undefined in required contexts
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        warnings.push({
          field: key,
          message: `Field '${key}' is null or undefined`,
          code: 'NULL_VALUE'
        });
      }
    }

    // Check for data type consistency
    if (data.clientName && typeof data.clientName !== 'string') {
      errors.push({
        field: 'clientName',
        message: 'Client name must be a string',
        code: 'INVALID_TYPE'
      });
    }

    // Check for email format if email fields are present
    const emailFields = ['email', 'contactEmail', 'clientEmail'];
    for (const field of emailFields) {
      if (data[field] && !this.isValidEmail(data[field])) {
        errors.push({
          field,
          message: `Invalid email format in field '${field}'`,
          code: 'INVALID_EMAIL'
        });
      }
    }

    // Check for phone format if phone fields are present
    const phoneFields = ['phone', 'contactPhone', 'clientPhone'];
    for (const field of phoneFields) {
      if (data[field] && !this.isValidPhone(data[field])) {
        warnings.push({
          field,
          message: `Invalid phone format in field '${field}'`,
          code: 'INVALID_PHONE'
        });
      }
    }

    // Check for date validity
    const dateFields = ['startDate', 'endDate', 'dueDate', 'scheduledDate'];
    for (const field of dateFields) {
      if (data[field] && !this.isValidDate(data[field])) {
        errors.push({
          field,
          message: `Invalid date format in field '${field}'`,
          code: 'INVALID_DATE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async applyValidationRule(data: Record<string, any>, rule: any): Promise<{ isValid: boolean; errors: any[]; severity: string }> {
    const errors: any[] = [];
    
    switch (rule.type) {
      case 'required':
        if (!data[rule.field] || data[rule.field] === '') {
          errors.push({
            field: rule.field,
            message: rule.message || `Field '${rule.field}' is required`,
            code: 'REQUIRED_FIELD'
          });
        }
        break;

      case 'format':
        if (data[rule.field] && !new RegExp(rule.pattern).test(data[rule.field])) {
          errors.push({
            field: rule.field,
            message: rule.message || `Field '${rule.field}' has invalid format`,
            code: 'INVALID_FORMAT'
          });
        }
        break;

      case 'range':
        const value = Number(data[rule.field]);
        if (!isNaN(value)) {
          if (rule.min !== undefined && value < rule.min) {
            errors.push({
              field: rule.field,
              message: rule.message || `Field '${rule.field}' must be at least ${rule.min}`,
              code: 'VALUE_TOO_LOW'
            });
          }
          if (rule.max !== undefined && value > rule.max) {
            errors.push({
              field: rule.field,
              message: rule.message || `Field '${rule.field}' must be at most ${rule.max}`,
              code: 'VALUE_TOO_HIGH'
            });
          }
        }
        break;

      case 'dependency':
        if (data[rule.field] && rule.dependsOn) {
          for (const dependency of rule.dependsOn) {
            if (!data[dependency] || data[dependency] === '') {
              errors.push({
                field: rule.field,
                message: rule.message || `Field '${rule.field}' requires '${dependency}' to be set`,
                code: 'DEPENDENCY_NOT_MET'
              });
            }
          }
        }
        break;

      case 'conflict':
        if (data[rule.field] && rule.conflictsWith) {
          for (const conflict of rule.conflictsWith) {
            if (data[conflict] && data[conflict] !== '') {
              errors.push({
                field: rule.field,
                message: rule.message || `Field '${rule.field}' conflicts with '${conflict}'`,
                code: 'FIELD_CONFLICT'
              });
            }
          }
        }
        break;

      case 'custom':
        // Execute custom validation function
        if (rule.validator) {
          try {
            const isValid = await this.executeCustomValidator(data, rule.validator);
            if (!isValid) {
              errors.push({
                field: rule.field || 'custom',
                message: rule.message || 'Custom validation failed',
                code: 'CUSTOM_VALIDATION_FAILED'
              });
            }
          } catch (error) {
            errors.push({
              field: rule.field || 'custom',
              message: `Custom validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              code: 'CUSTOM_VALIDATION_ERROR'
            });
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      severity: rule.severity || 'error'
    };
  }

  private async checkBusinessConstraint(data: Record<string, any>, constraint: any): Promise<boolean> {
    switch (constraint.type) {
      case 'budget_limit':
        const totalBudget = this.calculateTotalBudget(data);
        return totalBudget <= (constraint.limit || Infinity);

      case 'timeline_constraint':
        return this.validateTimeline(data, constraint);

      case 'resource_availability':
        return this.checkResourceAvailability(data, constraint);

      case 'compliance_check':
        return this.validateCompliance(data, constraint);

      default:
        return true;
    }
  }

  private calculateTotalBudget(data: Record<string, any>): number {
    const budgetFields = ['budget', 'totalCost', 'estimatedCost', 'price'];
    return budgetFields.reduce((total, field) => {
      const value = Number(data[field]);
      return total + (isNaN(value) ? 0 : value);
    }, 0);
  }

  private validateTimeline(data: Record<string, any>, constraint: any): boolean {
    if (!data.startDate || !data.endDate) return true;

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const duration = end.getTime() - start.getTime();
    const durationDays = duration / (1000 * 60 * 60 * 24);

    if (constraint.maxDuration && durationDays > constraint.maxDuration) {
      return false;
    }

    if (constraint.minDuration && durationDays < constraint.minDuration) {
      return false;
    }

    return true;
  }

  private checkResourceAvailability(data: Record<string, any>, constraint: any): boolean {
    // Simplified resource availability check
    const requiredResources = constraint.requiredResources || [];
    const availableResources = data.availableResources || [];

    return requiredResources.every((required: string) => 
      availableResources.includes(required)
    );
  }

  private validateCompliance(data: Record<string, any>, constraint: any): boolean {
    const complianceRules = constraint.rules || [];
    
    return complianceRules.every((rule: any) => {
      switch (rule.type) {
        case 'data_privacy':
          return this.checkDataPrivacyCompliance(data, rule);
        case 'financial_regulation':
          return this.checkFinancialCompliance(data, rule);
        case 'industry_standard':
          return this.checkIndustryCompliance(data, rule);
        default:
          return true;
      }
    });
  }

  private checkDataPrivacyCompliance(data: Record<string, any>, rule: any): boolean {
    // Check for PII handling compliance
    const piiFields = ['ssn', 'socialSecurityNumber', 'driversLicense', 'passport'];
    
    for (const field of piiFields) {
      if (data[field] && !data[`${field}_consent`]) {
        return false; // PII without consent
      }
    }

    return true;
  }

  private checkFinancialCompliance(data: Record<string, any>, rule: any): boolean {
    // Check for financial regulation compliance
    if (data.transactionAmount && data.transactionAmount > 10000) {
      return data.reportingCompliance === true;
    }

    return true;
  }

  private checkIndustryCompliance(data: Record<string, any>, rule: any): boolean {
    // Check for industry-specific compliance
    const industry = rule.industry || 'general';
    
    switch (industry) {
      case 'healthcare':
        return data.hipaaCompliance === true;
      case 'finance':
        return data.soxCompliance === true;
      case 'photography':
        return data.copyrightAgreement === true;
      default:
        return true;
    }
  }

  private async executeCustomValidator(data: Record<string, any>, validator: string): Promise<boolean> {
    // In a real implementation, this would safely execute custom validation code
    // For now, return true to avoid execution risks
    console.log(`Custom validator would execute: ${validator}`);
    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,}$/;
    return phoneRegex.test(phone);
  }

  private isValidDate(date: string): boolean {
    return !isNaN(Date.parse(date));
  }
}
