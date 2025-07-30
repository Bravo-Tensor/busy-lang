// UI service capability for human interactions

import { Capability, Input, Output } from '../orgata-framework/index.js';
import { SchemaBuilder } from '../orgata-framework/input-output.js';
import { ConsoleUIService, HumanTaskViewModel } from '../terminal-ui/console-ui.js';

export interface UIRequest {
  taskId: string;
  title: string;
  viewModel: HumanTaskViewModel;
  input: any;
  timeout?: number;
}

export interface UIResult {
  taskId: string;
  completed: boolean;
  result?: any;
  error?: string;
}

export class KitchenUICapability implements Capability<UIRequest, UIResult> {
  public readonly name = 'ui-service';
  public readonly description = 'User interface service for human task interactions';
  
  public readonly inputSchema = SchemaBuilder.object({
    taskId: SchemaBuilder.string({ description: 'Unique task identifier' }),
    title: SchemaBuilder.string({ description: 'Task title to display' }),
    viewModel: SchemaBuilder.object({}, [], 'UI view model configuration'),
    input: SchemaBuilder.object({}, [], 'Current context data'),
    timeout: SchemaBuilder.number({ description: 'Timeout in milliseconds' })
  }, ['taskId', 'title', 'viewModel', 'input']);

  public readonly outputSchema = SchemaBuilder.object({
    taskId: SchemaBuilder.string({ description: 'Task identifier' }),
    completed: SchemaBuilder.boolean({ description: 'Whether task was completed' }),
    result: SchemaBuilder.object({}, [], 'Task result data'),
    error: SchemaBuilder.string({ description: 'Error message if task failed' })
  }, ['taskId', 'completed']);

  private uiService = new ConsoleUIService();

  async execute(input: Input<UIRequest>): Promise<Output<UIResult>> {
    const request = input.data;
    
    try {
      console.log('\n🎯 Human task requested...');
      
      const result = await this.uiService.presentTaskAndWait({
        id: request.taskId,
        title: request.title,
        viewModel: request.viewModel,
        input: request.input,
        timeout: request.timeout
      });

      return {
        data: {
          taskId: request.taskId,
          completed: true,
          result
        },
        schema: this.outputSchema,
        validate: () => ({ isValid: true, errors: [] }),
        serialize: function() { return JSON.stringify(this.data); }
      };

    } catch (error) {
      return {
        data: {
          taskId: request.taskId,
          completed: false,
          error: error.message
        },
        schema: this.outputSchema,
        validate: () => ({ isValid: true, errors: [] }),
        serialize: function() { return JSON.stringify(this.data); }
      };
    }
  }

  // Convenience method for the implementation to use
  async presentTaskAndWait<T>(task: {
    id: string;
    title: string;
    viewModel: HumanTaskViewModel;
    input: any;
    timeout?: number;
  }): Promise<T> {
    return this.uiService.presentTaskAndWait<T>(task);
  }
}