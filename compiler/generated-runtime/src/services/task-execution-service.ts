
import { TaskExecutionContext, TaskExecutionResult, TaskExecutionService, ValidationResult } from '../../types/runtime-types';
import { prisma } from '../lib/prisma';

export class TaskExecutionServiceImpl implements TaskExecutionService {
  
  async executeAlgorithmicTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(`🤖 Executing algorithmic task ${context.taskId}`);

    try {
      const task = await prisma.task.findUnique({
        where: { id: context.taskId }
      });

      if (!task) {
        throw new Error(`Task ${context.taskId} not found`);
      }

      const config = task.configJson ? JSON.parse(task.configJson) : {};
      const algorithm = config.algorithm || 'default';

      // Execute based on algorithm type
      let result: Record<string, any>;
      
      switch (algorithm) {
        case 'data_validation':
          result = await this.executeDataValidation(context.inputData, config);
          break;
        case 'calculation':
          result = await this.executeCalculation(context.inputData, config);
          break;
        case 'data_transformation':
          result = await this.executeDataTransformation(context.inputData, config);
          break;
        case 'notification':
          result = await this.executeNotification(context.inputData, config);
          break;
        default:
          result = { processed: true, ...context.inputData };
      }

      return {
        success: true,
        outputData: result,
        notes: `Algorithmic task executed with algorithm: ${algorithm}`
      };

    } catch (error) {
      return {
        success: false,
        outputData: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async executeAIAgentTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(`🧠 Executing AI agent task ${context.taskId}`);

    try {
      const task = await prisma.task.findUnique({
        where: { id: context.taskId }
      });

      if (!task) {
        throw new Error(`Task ${context.taskId} not found`);
      }

      const config = task.configJson ? JSON.parse(task.configJson) : {};
      const agentPrompt = config.agentPrompt || 'Process the provided data';

      // For now, simulate AI agent execution
      // In a real implementation, this would call an AI service
      const result = await this.simulateAIAgentExecution(context.inputData, agentPrompt, config);

      return {
        success: true,
        outputData: result,
        notes: `AI agent task completed`
      };

    } catch (error) {
      return {
        success: false,
        outputData: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async executeHumanTask(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    console.log(`👤 Executing human task ${context.taskId}`);

    // Human tasks are executed through the UI, so we just validate and pass through
    try {
      const validationResult = await this.validateTaskOutput(context.taskId, context.inputData);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          outputData: {},
          errors: validationResult.errors.map(e => e.message)
        };
      }

      return {
        success: true,
        outputData: context.inputData,
        notes: 'Human task completed successfully'
      };

    } catch (error) {
      return {
        success: false,
        outputData: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async validateTaskOutput(taskId: number, outputData: Record<string, any>): Promise<ValidationResult> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!task) {
        return {
          isValid: false,
          errors: [{ field: 'task', message: 'Task not found', code: 'TASK_NOT_FOUND' }],
          warnings: []
        };
      }

      const config = task.configJson ? JSON.parse(task.configJson) : {};
      const errors: any[] = [];
      const warnings: any[] = [];

      // Validate required fields
      if (config.requiredFields) {
        for (const field of config.requiredFields) {
          if (!outputData[field] || outputData[field] === '') {
            errors.push({
              field,
              message: `Field '${field}' is required`,
              code: 'FIELD_REQUIRED'
            });
          }
        }
      }

      // Validate data types
      if (config.fieldTypes) {
        for (const [field, expectedType] of Object.entries(config.fieldTypes)) {
          if (outputData[field] !== undefined) {
            const actualType = typeof outputData[field];
            if (actualType !== expectedType) {
              warnings.push({
                field,
                message: `Expected ${expectedType} but got ${actualType}`,
                code: 'TYPE_MISMATCH'
              });
            }
          }
        }
      }

      // Validate business rules
      if (config.validationRules) {
        for (const rule of config.validationRules) {
          const isValid = await this.validateBusinessRule(outputData, rule);
          if (!isValid) {
            errors.push({
              field: rule.field || 'general',
              message: rule.message || 'Business rule validation failed',
              code: rule.code || 'BUSINESS_RULE_FAILED'
            });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{ field: 'validation', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    }
  }

  private async executeDataValidation(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const rules = config.validationRules || [];
    const results = { valid: true, errors: [] as string[], data: inputData };

    for (const rule of rules) {
      try {
        const isValid = await this.validateBusinessRule(inputData, rule);
        if (!isValid) {
          results.valid = false;
          results.errors.push(rule.message || 'Validation failed');
        }
      } catch (error) {
        results.valid = false;
        results.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  private async executeCalculation(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const formula = config.formula || 'sum';
    const fields = config.fields || [];
    
    let result = 0;
    
    switch (formula) {
      case 'sum':
        result = fields.reduce((sum: number, field: string) => sum + (inputData[field] || 0), 0);
        break;
      case 'average':
        result = fields.reduce((sum: number, field: string) => sum + (inputData[field] || 0), 0) / fields.length;
        break;
      case 'multiply':
        result = fields.reduce((product: number, field: string) => product * (inputData[field] || 1), 1);
        break;
      default:
        result = 0;
    }

    return { ...inputData, calculatedValue: result, formula, fields };
  }

  private async executeDataTransformation(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const transformations = config.transformations || [];
    let transformedData = { ...inputData };

    for (const transform of transformations) {
      switch (transform.type) {
        case 'rename':
          if (transformedData[transform.from]) {
            transformedData[transform.to] = transformedData[transform.from];
            delete transformedData[transform.from];
          }
          break;
        case 'uppercase':
          if (transformedData[transform.field] && typeof transformedData[transform.field] === 'string') {
            transformedData[transform.field] = transformedData[transform.field].toUpperCase();
          }
          break;
        case 'lowercase':
          if (transformedData[transform.field] && typeof transformedData[transform.field] === 'string') {
            transformedData[transform.field] = transformedData[transform.field].toLowerCase();
          }
          break;
        case 'format_date':
          if (transformedData[transform.field]) {
            transformedData[transform.field] = new Date(transformedData[transform.field]).toISOString();
          }
          break;
      }
    }

    return transformedData;
  }

  private async executeNotification(inputData: Record<string, any>, config: any): Promise<Record<string, any>> {
    const notificationType = config.type || 'email';
    const recipients = config.recipients || [];
    const template = config.template || 'Default notification';

    // For now, just log the notification
    console.log(`📧 Notification (${notificationType}) would be sent to:`, recipients);
    console.log(`📝 Message: ${template}`);
    console.log(`📊 Data:`, inputData);

    return {
      ...inputData,
      notificationSent: true,
      notificationType,
      recipients,
      sentAt: new Date().toISOString()
    };
  }

  private async simulateAIAgentExecution(inputData: Record<string, any>, prompt: string, config: any): Promise<Record<string, any>> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate simulated AI response based on input
    const aiResponse = {
      analysis: `AI analysis of provided data using prompt: ${prompt}`,
      suggestions: [
        'Consider validating the input data format',
        'Review the business rules for this process',
        'Ensure all required fields are present'
      ],
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
      processedAt: new Date().toISOString()
    };

    return {
      ...inputData,
      aiProcessing: aiResponse
    };
  }

  private async validateBusinessRule(data: Record<string, any>, rule: any): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'required':
          return data[rule.field] !== undefined && data[rule.field] !== null && data[rule.field] !== '';
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(data[rule.field] || '');
        case 'phone':
          const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,}$/;
          return phoneRegex.test(data[rule.field] || '');
        case 'min_length':
          return (data[rule.field] || '').length >= (rule.value || 0);
        case 'max_length':
          return (data[rule.field] || '').length <= (rule.value || Infinity);
        case 'numeric':
          return !isNaN(Number(data[rule.field]));
        case 'positive':
          return Number(data[rule.field]) > 0;
        case 'date':
          return !isNaN(Date.parse(data[rule.field]));
        case 'future_date':
          return new Date(data[rule.field]) > new Date();
        case 'past_date':
          return new Date(data[rule.field]) < new Date();
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }
}
