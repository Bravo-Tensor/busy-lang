// Implementation for gathering ingredients step

import { AlgorithmImplementation, BasicOperation } from '@busy-lang/orgata-framework';
import { InjectedResources, Context } from '@busy-lang/orgata-framework';
import { KitchenStorageCapability } from '../kitchen-capabilities/storage-service.js';
import { SchemaBuilder } from '@busy-lang/orgata-framework';

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
        const breadResult = await storage.retrieveItem('pantry', 'bread', 2);

        if (breadResult.success && breadResult.item) {
          breadSlices = typeof breadResult.item.quantity === 'number' ? breadResult.item.quantity : 2;
          logger.log({ level: 'info', message: `✅ Got ${breadSlices} slices of bread` });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not get bread' });
        }

        // Get peanut butter jar from pantry
        logger.log({ level: 'info', message: 'Getting peanut butter from pantry...' });
        const pbResult = await storage.retrieveItem('pantry', 'peanut_butter', 1);

        if (pbResult.success) {
          peanutButter = true;
          logger.log({ level: 'info', message: '✅ Got peanut butter jar' });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not get peanut butter' });
        }

        // Get jelly jar from fridge
        logger.log({ level: 'info', message: 'Getting jelly from fridge...' });
        const jellyResult = await storage.retrieveItem('fridge', 'jelly', 1);

        if (jellyResult.success) {
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
        logger.log({ level: 'error', message: `Failed to gather ingredients: ${(error as Error).message}` });
        throw error;
      }
    });
  }
}

// Factory function to create the operation
export function createGatherIngredientsOperation(context: Context): BasicOperation<RecipeRequest, IngredientsGathered> {
  return new BasicOperation(
    'gather-ingredients',
    'Gather all ingredients for PB&J sandwich',
    SchemaBuilder.object({
      recipe_name: SchemaBuilder.string(),
      servings: SchemaBuilder.number({ minimum: 1 })
    }, ['recipe_name', 'servings']),
    SchemaBuilder.object({
      bread_slices: SchemaBuilder.number(),
      peanut_butter: SchemaBuilder.boolean(),
      jelly: SchemaBuilder.boolean(),
      all_available: SchemaBuilder.boolean()
    }, ['bread_slices', 'peanut_butter', 'jelly', 'all_available']),
    new GatherIngredientsImplementation(),
    context
  );
}