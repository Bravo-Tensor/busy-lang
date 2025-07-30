// Implementation for preparing workspace step

import { AlgorithmImplementation } from '../orgata-framework/index.js';
import { InjectedResources } from '../orgata-framework/types.js';
import { KitchenStorageCapability } from '../kitchen-capabilities/storage-service.js';
import { IngredientsGathered } from './gather-ingredients.js';

export interface WorkspaceReady {
  plate_ready: boolean;
  knife_ready: boolean;
  workspace_clean: boolean;
}

export class PrepareWorkspaceImplementation extends AlgorithmImplementation<IngredientsGathered, WorkspaceReady> {
  constructor() {
    super(async (input: IngredientsGathered, resources: InjectedResources): Promise<WorkspaceReady> => {
      const logger = resources.logger;
      logger.log({ level: 'info', message: 'Starting workspace preparation...' });

      // Check if we have ingredients first
      if (!input.all_available) {
        logger.log({ level: 'warn', message: 'Cannot prepare workspace - missing ingredients' });
        throw new Error('Cannot prepare workspace without all ingredients');
      }

      // Get storage capability
      const storage = resources.capabilities.get('kitchen-storage') as KitchenStorageCapability;
      if (!storage) {
        throw new Error('Kitchen storage capability not available');
      }

      let plateReady = false;
      let knifeReady = false;
      let workspaceClean = true; // Assume workspace starts clean

      try {
        // Get a clean plate from cabinet
        logger.log({ level: 'info', message: 'Getting a plate from cabinet...' });
        const plateResult = await storage.execute({
          data: { location: 'cabinet', item: 'plates', quantity: 1, action: 'retrieve' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        if (plateResult.data.success) {
          plateReady = true;
          logger.log({ level: 'info', message: '✅ Got a clean plate' });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not get plate' });
        }

        // Get a butter knife from drawer
        logger.log({ level: 'info', message: 'Getting a butter knife from drawer...' });
        const knifeResult = await storage.execute({
          data: { location: 'drawer', item: 'butter_knives', quantity: 1, action: 'retrieve' },
          schema: storage.inputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        });

        if (knifeResult.data.success) {
          knifeReady = true;
          logger.log({ level: 'info', message: '✅ Got a butter knife' });
        } else {
          logger.log({ level: 'warn', message: '❌ Could not get knife' });
        }

        // Place plate on counter (simulated)
        if (plateReady) {
          logger.log({ level: 'info', message: '🍽️ Placed plate on counter' });
        }

        // Ensure workspace is clean and ready (simulated)
        logger.log({ level: 'info', message: '🧹 Workspace is clean and ready' });

        const allReady = plateReady && knifeReady && workspaceClean;
        
        if (allReady) {
          logger.log({ level: 'info', message: '🎉 Workspace prepared successfully!' });
        } else {
          logger.log({ level: 'warn', message: '⚠️ Workspace preparation incomplete' });
        }

        return {
          plate_ready: plateReady,
          knife_ready: knifeReady,
          workspace_clean: workspaceClean
        };

      } catch (error) {
        logger.log({ level: 'error', message: `Failed to prepare workspace: ${error.message}` });
        throw error;
      }
    });
  }
}