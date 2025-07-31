// Implementation for cleanup step

import { AlgorithmImplementation, BasicOperation } from '@busy-lang/orgata-framework';
import { InjectedResources, Context } from '@busy-lang/orgata-framework';
import { KitchenStorageCapability } from '../kitchen-capabilities/storage-service.js';
import { AssembledSandwich } from './assemble-sandwich.js';
import { SchemaBuilder } from '@busy-lang/orgata-framework';

export interface KitchenClean {
  tools_cleaned: boolean;
  ingredients_stored: boolean;
  workspace_clean: boolean;
}

export class CleanupImplementation extends AlgorithmImplementation<AssembledSandwich, KitchenClean> {
  constructor() {
    super(async (input: AssembledSandwich, resources: InjectedResources): Promise<KitchenClean> => {
      const logger = resources.logger;
      logger.log({ 
        level: 'info', 
        message: `Starting cleanup after making ${input.name}...` 
      });

      // Get storage capability
      const storage = resources.capabilities.get('kitchen-storage') as KitchenStorageCapability;
      if (!storage) {
        throw new Error('Kitchen storage capability not available');
      }

      let toolsCleaned = false;
      let ingredientsStored = false;
      let workspaceClean = false;

      try {
        // Clean the knife (simulated)
        logger.log({ level: 'info', message: '🧽 Cleaning the butter knife...' });
        await this.delay(2000);
        
        // Put knife back in drawer
        const knifeStoreResult = await storage.storeItem('drawer', 'butter_knives');

        if (knifeStoreResult.success) {
          toolsCleaned = true;
          logger.log({ level: 'info', message: '✅ Knife cleaned and stored' });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not store knife' });
        }

        // Put away peanut butter jar
        logger.log({ level: 'info', message: '📦 Putting away peanut butter jar...' });
        const pbStoreResult = await storage.storeItem('pantry', 'peanut_butter');

        let pbStored = pbStoreResult.success;
        
        // Put away jelly jar
        logger.log({ level: 'info', message: '❄️ Putting away jelly jar...' });
        const jellyStoreResult = await storage.storeItem('fridge', 'jelly');

        let jellyStored = jellyStoreResult.success;

        if (pbStored && jellyStored) {
          ingredientsStored = true;
          logger.log({ level: 'info', message: '✅ All ingredients stored away' });
        } else {
          logger.log({ level: 'warn', message: '❌ Some ingredients could not be stored' });
        }

        // Wipe down workspace (simulated)
        logger.log({ level: 'info', message: '🧹 Wiping down workspace...' });
        await this.delay(1500);
        workspaceClean = true;
        logger.log({ level: 'info', message: '✅ Workspace cleaned' });

        const allClean = toolsCleaned && ingredientsStored && workspaceClean;
        
        if (allClean) {
          logger.log({ level: 'info', message: '🎉 Kitchen cleanup completed successfully!' });
          logger.log({ level: 'info', message: `🥪 Your ${input.name} is ready to enjoy!` });
        } else {
          logger.log({ level: 'warn', message: '⚠️ Some cleanup tasks were not completed' });
        }

        return {
          tools_cleaned: toolsCleaned,
          ingredients_stored: ingredientsStored,
          workspace_clean: workspaceClean
        };

      } catch (error) {
        logger.log({ level: 'error', message: `Cleanup failed: ${(error as Error).message}` });
        throw error;
      }
    });
  }
}

// Factory function to create the operation
export function createCleanupOperation(context: Context): BasicOperation<AssembledSandwich, KitchenClean> {
  return new BasicOperation(
    'cleanup',
    'Clean up after making sandwich',
    SchemaBuilder.object({
      name: SchemaBuilder.string(),
      ingredients: SchemaBuilder.array(SchemaBuilder.string()),
      assembly_quality: SchemaBuilder.string({ enum: ['excellent', 'good', 'acceptable', 'poor'] }),
      ready_to_serve: SchemaBuilder.boolean()
    }),
    SchemaBuilder.object({
      tools_cleaned: SchemaBuilder.boolean(),
      ingredients_stored: SchemaBuilder.boolean(),
      workspace_clean: SchemaBuilder.boolean()
    }, ['tools_cleaned', 'ingredients_stored', 'workspace_clean']),
    new CleanupImplementation(),
    context
  );
}