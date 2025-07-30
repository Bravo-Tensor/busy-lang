// Implementation for assembling sandwich step - with human fallback

import { AlgorithmImplementation, HumanImplementation } from '../orgata-framework/index.js';
import { InjectedResources } from '../orgata-framework/types.js';
import { WorkspaceReady } from './prepare-workspace.js';

export interface AssembledSandwich {
  name: string;
  ingredients: string[];
  assembly_quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  ready_to_serve: boolean;
}

export class AssembleSandwichAlgorithmImplementation extends AlgorithmImplementation<WorkspaceReady, AssembledSandwich> {
  constructor() {
    super(async (input: WorkspaceReady, resources: InjectedResources): Promise<AssembledSandwich> => {
      const logger = resources.logger;
      logger.log({ level: 'info', message: 'Starting sandwich assembly (algorithm)...' });

      // Check if workspace is ready
      if (!input.plate_ready || !input.knife_ready || !input.workspace_clean) {
        logger.log({ level: 'error', message: 'Workspace not ready for assembly' });
        throw new Error('Workspace not ready - cannot assemble sandwich');
      }

      try {
        // Simulate assembly steps
        logger.log({ level: 'info', message: '🍞 Placing bread slices on plate...' });
        await this.delay(1000);

        logger.log({ level: 'info', message: '🫙 Opening peanut butter jar...' });
        await this.delay(500);

        logger.log({ level: 'info', message: '🥜 Spreading peanut butter on first slice...' });
        await this.delay(2000);

        logger.log({ level: 'info', message: '🍇 Opening jelly jar...' });
        await this.delay(500);

        logger.log({ level: 'info', message: '🍇 Spreading jelly on second slice...' });
        await this.delay(2000);

        // Simulate potential assembly failure (20% chance)
        const assemblySuccess = Math.random() > 0.2;
        
        if (!assemblySuccess) {
          logger.log({ level: 'warn', message: '❌ Algorithm assembly failed - spreading was uneven' });
          const error = new Error('Assembly failed - uneven spreading detected');
          (error as any).code = 'ASSEMBLY_FAILED';
          throw error;
        }

        logger.log({ level: 'info', message: '🤝 Pressing slices together to form sandwich...' });
        await this.delay(1000);

        logger.log({ level: 'info', message: '🎉 Sandwich assembled successfully by algorithm!' });

        return {
          name: 'Peanut Butter and Jelly Sandwich',
          ingredients: ['bread', 'peanut butter', 'jelly'],
          assembly_quality: 'excellent',
          ready_to_serve: true
        };

      } catch (error) {
        logger.log({ level: 'error', message: `Algorithm assembly failed: ${error.message}` });
        throw error;
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class AssembleSandwichHumanImplementation extends HumanImplementation<WorkspaceReady, AssembledSandwich> {
  constructor() {
    super({
      fields: [
        {
          name: 'assembly_quality',
          type: 'choice',
          label: 'How did the sandwich assembly turn out?',
          choices: ['excellent', 'good', 'acceptable', 'poor']
        },
        {
          name: 'notes',
          type: 'text',
          label: 'Any notes about the assembly process?'
        }
      ],
      layout: {
        title: 'Manual Sandwich Assembly',
        description: 'The automatic assembly failed. Please complete the sandwich manually and rate the result.'
      }
    });
  }

  async execute(input: WorkspaceReady, resources: InjectedResources): Promise<AssembledSandwich> {
    const logger = resources.logger;
    logger.log({ level: 'info', message: 'Starting sandwich assembly (human)...' });

    // Check if workspace is ready
    if (!input.plate_ready || !input.knife_ready || !input.workspace_clean) {
      throw new Error('Workspace not ready - cannot assemble sandwich');
    }

    try {
      // Show assembly instructions to human
      console.log('\n📋 MANUAL ASSEMBLY INSTRUCTIONS:');
      console.log('1. 🍞 Place bread slices on the plate');
      console.log('2. 🫙 Open peanut butter jar');
      console.log('3. 🥜 Spread peanut butter evenly on one slice');
      console.log('4. 🍇 Open jelly jar');
      console.log('5. 🍇 Spread jelly evenly on the other slice');
      console.log('6. 🤝 Press slices together to form sandwich');
      console.log('\nPlease complete these steps and then answer the questions below.\n');

      // Get human feedback
      const result = await super.execute(input, resources);
      
      logger.log({ level: 'info', message: `Human assembly completed with quality: ${result.assembly_quality}` });

      return {
        name: 'Peanut Butter and Jelly Sandwich (Human Made)',
        ingredients: ['bread', 'peanut butter', 'jelly'],
        assembly_quality: result.assembly_quality,
        ready_to_serve: result.assembly_quality !== 'poor'
      };

    } catch (error) {
      logger.log({ level: 'error', message: `Human assembly failed: ${error.message}` });
      throw error;
    }
  }
}