// Kitchen-specific business package implementation

import { BaseBusinessPackage, ContextPackage } from '@busy-lang/orgata-framework/packages';
import { SimpleProcess, DataInput, SchemaBuilder } from '@busy-lang/orgata-framework';
import { createGatherIngredientsOperation, RecipeRequest } from '../pbj-implementations/gather-ingredients.js';
import { createPrepareWorkspaceOperation } from '../pbj-implementations/prepare-workspace.js';
import { createAssembleSandwichOperation } from '../pbj-implementations/assemble-sandwich.js';
import { createCleanupOperation } from '../pbj-implementations/cleanup.js';

export class KitchenBusinessPackage extends BaseBusinessPackage {
  public readonly metadata = {
    name: 'kitchen-business',
    version: '1.0.0',
    description: 'Kitchen business logic from BUSY specifications',
    source: 'busy-spec' as const
  };

  protected wirePlaybooks(context: any): void {
    // Wire up the PB&J sandwich playbook
    this.createPBJPlaybook(context);
    
    // Future playbooks:
    // - Grilled cheese sandwich
    // - Soup preparation
    // - Kitchen cleaning
  }

  private createPBJPlaybook(context: any): void {
    // Create all operations for the PB&J playbook
    const gatherIngredientsOp = createGatherIngredientsOperation(context);
    const prepareWorkspaceOp = createPrepareWorkspaceOperation(context);
    const assembleSandwichOp = createAssembleSandwichOperation(context);
    const cleanupOp = createCleanupOperation(context);

    // Create the PB&J playbook process
    const pbjPlaybook = new SimpleProcess(
      'pbj-sandwich',
      'Peanut butter and jelly sandwich making playbook',
      SchemaBuilder.object({
        recipe_name: SchemaBuilder.string(),
        servings: SchemaBuilder.number()
      }),
      SchemaBuilder.object({
        tools_cleaned: SchemaBuilder.boolean(),
        ingredients_stored: SchemaBuilder.boolean(),
        workspace_clean: SchemaBuilder.boolean()
      }),
      ['gather-ingredients', 'prepare-workspace', 'assemble-sandwich', 'cleanup'],
      [gatherIngredientsOp, prepareWorkspaceOp, assembleSandwichOp, cleanupOp],
      context
    );

    this.playbooks.set('pbj-sandwich', pbjPlaybook);
  }

  createPlaybookInput(playbookName: string, data: any): DataInput<any> {
    // For now, hardcode PB&J input schema
    // Future: Look up schema from playbook metadata
    if (playbookName === 'pbj-sandwich') {
      return new DataInput<RecipeRequest>(
        data,
        SchemaBuilder.object({
          recipe_name: SchemaBuilder.string(),
          servings: SchemaBuilder.number()
        }, ['recipe_name', 'servings'])
      );
    }
    
    throw new Error(`Unknown playbook: ${playbookName}`);
  }
}

// Factory function
export function createKitchenBusinessPackage(contextPackage: ContextPackage): KitchenBusinessPackage {
  return new KitchenBusinessPackage(contextPackage);
}