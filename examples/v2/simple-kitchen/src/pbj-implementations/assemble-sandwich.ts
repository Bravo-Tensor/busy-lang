// Implementation for assembling sandwich step - with human fallback

import { AlgorithmImplementation, HumanImplementation, BasicOperation } from '@busy-lang/orgata-framework';
import { InjectedResources, Context } from '@busy-lang/orgata-framework';
import { WorkspaceReady } from './prepare-workspace.js';
import { SchemaBuilder } from '@busy-lang/orgata-framework';

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
        logger.log({ level: 'error', message: `Algorithm assembly failed: ${(error as Error).message}` });
        throw error;
      }
    });
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
      logger.log({ level: 'error', message: `Human assembly failed: ${(error as Error).message}` });
      throw error;
    }
  }
}

// OrgataOperation-like class for assembly step with fallback
class AssembleSandwichOperation extends BasicOperation {
  constructor(context: Context) {
    const assemblySchema = SchemaBuilder.object({
      name: SchemaBuilder.string(),
      ingredients: SchemaBuilder.array(SchemaBuilder.string()),
      assembly_quality: SchemaBuilder.string({ enum: ['excellent', 'good', 'acceptable', 'poor'] }),
      ready_to_serve: SchemaBuilder.boolean()
    }, ['name', 'ingredients', 'assembly_quality', 'ready_to_serve']);

    // Create the wrapper implementation that handles fallback
    const fallbackImpl = {
      async execute(input: any, resources: any) {
        const logger = resources.logger;
        
        try {
          // Try algorithm first
          logger.log({ level: 'info', message: 'Attempting automatic assembly...' });
          const algorithmImpl = new AssembleSandwichAlgorithmImplementation();
          return await algorithmImpl.execute(input, resources);
          
        } catch (error) {
          // Check if this is an assembly failure that should trigger human fallback
          if ((error as any).code === 'ASSEMBLY_FAILED' || (error as Error).message.includes('assembly failed')) {
            logger.log({ level: 'warn', message: 'Algorithm failed, falling back to human assembly...' });
            
            const humanImpl = new AssembleSandwichHumanImplementation();
            return await humanImpl.execute(input, resources);
          } else {
            // Other errors should be re-thrown
            throw error;
          }
        }
      }
    };

    super(
      'assemble-sandwich',
      'Assemble PB&J sandwich with human fallback',
      SchemaBuilder.object({
        plate_ready: SchemaBuilder.boolean(),
        knife_ready: SchemaBuilder.boolean(),
        workspace_clean: SchemaBuilder.boolean()
      }, ['plate_ready', 'knife_ready', 'workspace_clean']),
      assemblySchema,
      fallbackImpl,
      context
    );
  }
}

// Factory function to create the operation
export function createAssembleSandwichOperation(context: Context): BasicOperation<WorkspaceReady, AssembledSandwich> {
  return new AssembleSandwichOperation(context);
}