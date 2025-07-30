// Implementation for gathering ingredients step

import { AlgorithmImplementation } from '../orgata-framework/index.js';
import { InjectedResources } from '../orgata-framework/types.js';
import { KitchenStorageCapability } from '../kitchen-capabilities/storage-service.js';

export interface RecipeRequest {
  recipe_name: string;
  servings: number;
}

export interface IngredientsGathered {
  bread_slices: number;
  peanut_butter: boolean;
  jelly: boolean;
  all_available: boolean;
}

export class GatherIngredientsImplementation extends AlgorithmImplementation<RecipeRequest, IngredientsGathered> {
  constructor() {
    super(async (input: RecipeRequest, resources: InjectedResources): Promise<IngredientsGathered> => {
      const logger = resources.logger;
      logger.log({ level: 'info', message: `Starting to gather ingredients for ${input.recipe_name}` });

      // Get storage capability
      const storage = resources.capabilities.get('kitchen-storage') as KitchenStorageCapability;
      if (!storage) {
        throw new Error('Kitchen storage capability not available');
      }

      let breadSlices = 0;
      let peanutButter = false;
      let jelly = false;

      try {
        // Get 2 slices of bread from pantry
        logger.log({ level: 'info', message: 'Getting bread from pantry...' });
        const breadResult = await storage.execute({
          data: { location: 'pantry', item: 'bread', quantity: 2, action: 'retrieve' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        if (breadResult.data.success && breadResult.data.item) {
          breadSlices = typeof breadResult.data.item.quantity === 'number' ? breadResult.data.item.quantity : 2;
          logger.log({ level: 'info', message: `✅ Got ${breadSlices} slices of bread` });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not get bread' });
        }

        // Get peanut butter jar from pantry
        logger.log({ level: 'info', message: 'Getting peanut butter from pantry...' });
        const pbResult = await storage.execute({
          data: { location: 'pantry', item: 'peanut_butter', quantity: 1, action: 'retrieve' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        if (pbResult.data.success) {
          peanutButter = true;
          logger.log({ level: 'info', message: '✅ Got peanut butter jar' });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not get peanut butter' });
        }

        // Get jelly jar from fridge
        logger.log({ level: 'info', message: 'Getting jelly from fridge...' });
        const jellyResult = await storage.execute({
          data: { location: 'fridge', item: 'jelly', quantity: 1, action: 'retrieve' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        if (jellyResult.data.success) {
          jelly = true;
          logger.log({ level: 'info', message: '✅ Got jelly jar' });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not get jelly' });
        }

        // Check that all ingredients are available and fresh
        const allAvailable = breadSlices >= 2 && peanutButter && jelly;
        
        if (allAvailable) {
          logger.log({ level: 'info', message: '🎉 All ingredients gathered successfully!' });
        } else {
          logger.log({ level: 'warn', message: '⚠️ Some ingredients are missing' });
        }

        return {
          bread_slices: breadSlices,
          peanut_butter: peanutButter,
          jelly: jelly,
          all_available: allAvailable
        };

      } catch (error) {
        logger.log({ level: 'error', message: `Failed to gather ingredients: ${error.message}` });
        throw error;
      }
    });
  }
}