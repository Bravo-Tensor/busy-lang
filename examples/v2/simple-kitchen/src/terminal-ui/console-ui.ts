// Simple console-based UI for human interactions

import * as inquirer from 'inquirer';

export interface HumanTaskViewModel {
  fields: FormField[];
  validation?: ValidationRules;
  layout?: LayoutConfiguration;
}

export interface FormField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'choice';
  label: string;
  required?: boolean;
  choices?: string[];
  min?: number;
  max?: number;
}

export interface ValidationRules {
  [fieldName: string]: (value: any) => boolean | string;
}

export interface LayoutConfiguration {
  title?: string;
  description?: string;
}

export class ConsoleUIService {
  async presentTaskAndWait<T>(task: {
    id: string;
    title: string;
    viewModel: HumanTaskViewModel;
    input: any;
    timeout?: number;
  }): Promise<T> {
    console.log('\n' + '='.repeat(50));
    console.log(`🧑‍🍳 HUMAN TASK: ${task.title}`);
    console.log('='.repeat(50));
    
    if (task.viewModel.layout?.description) {
      console.log(`📝 ${task.viewModel.layout.description}\n`);
    }

    // Show current context/input
    console.log('📊 Current Context:');
    console.log(JSON.stringify(task.input, null, 2));
    console.log('');

    // Create inquirer questions
    const questions = task.viewModel.fields.map(field => {
      const question: any = {
        type: this.mapFieldType(field.type),
        name: field.name,
        message: field.label,
        validate: this.createValidator(field, task.viewModel.validation)
      };

      if (field.type === 'choice' && field.choices) {
        question.choices = field.choices;
      }

      return question;
    });

    try {
      const answers = await inquirer.prompt(questions);
      
      console.log('\n✅ Task completed successfully!');
      console.log('📤 Result:', JSON.stringify(answers, null, 2));
      
      return answers as T;
    } catch (error) {
      console.log('\n❌ Task cancelled or failed');
      throw error;
    }
  }

  private mapFieldType(fieldType: string): string {
    switch (fieldType) {
      case 'boolean': return 'confirm';
      case 'choice': return 'list';
      case 'number': return 'number';
      default: return 'input';
    }
  }

  private createValidator(field: FormField, validationRules?: ValidationRules) {
    return (value: any) => {
      // Required field validation
      if (field.required && (!value || value === '')) {
        return `${field.label} is required`;
      }

      // Type-specific validation
      if (field.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          return `${field.label} must be a number`;
        }
        if (field.min !== undefined && num < field.min) {
          return `${field.label} must be at least ${field.min}`;
        }
        if (field.max !== undefined && num > field.max) {
          return `${field.label} must be at most ${field.max}`;
        }
      }

      // Custom validation rules
      if (validationRules && validationRules[field.name]) {
        const result = validationRules[field.name](value);
        if (result !== true && typeof result === 'string') {
          return result;
        }
      }

      return true;
    };
  }

  // Utility method for simple confirmations
  async confirm(message: string): Promise<boolean> {
    const answer = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message
    }]);
    return answer.confirmed;
  }

  // Utility method for simple choices
  async choose(message: string, choices: string[]): Promise<string> {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message,
      choices
    }]);
    return answer.choice;
  }
}