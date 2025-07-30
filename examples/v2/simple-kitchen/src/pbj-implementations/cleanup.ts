// Implementation for cleanup step

import { AlgorithmImplementation } from '../orgata-framework/index.js';
import { InjectedResources } from '../orgata-framework/types.js';
import { KitchenStorageCapability } from '../kitchen-capabilities/storage-service.js';
import { AssembledSandwich } from './assemble-sandwich.js';

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
        const knifeStoreResult = await storage.execute({
          data: { location: 'drawer', item: 'butter_knives', action: 'store' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        if (knifeStoreResult.data.success) {
          toolsCleaned = true;
          logger.log({ level: 'info', message: '✅ Knife cleaned and stored' });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not store knife' });
        }

        // Put away peanut butter jar
        logger.log({ level: 'info', message: '📦 Putting away peanut butter jar...' });
        const pbStoreResult = await storage.execute({
          data: { location: 'pantry', item: 'peanut_butter', action: 'store' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        let pbStored = pbStoreResult.data.success;
        
        // Put away jelly jar
        logger.log({ level: 'info', message: '❄️ Putting away jelly jar...' });
        const jellyStoreResult = await storage.execute({
          data: { location: 'fridge', item: 'jelly', action: 'store' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        let jellyStored = jellyStoreResult.data.success;

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
        logger.log({ level: 'error', message: `Cleanup failed: ${error.message}` });
        throw error;
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}