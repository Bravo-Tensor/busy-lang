// Main runtime for the simple kitchen example

import {
  BasicInfrastructureServices,
  ProductionContext,
  SimpleProcess,
  DataInput,
  SchemaBuilder
} from './orgata-framework/index.js';

import { KitchenStorageCapability } from './kitchen-capabilities/storage-service.js';
import { KitchenUICapability } from './kitchen-capabilities/ui-service.js';

import { createGatherIngredientsOperation, RecipeRequest } from './pbj-implementations/gather-ingredients.js';
import { createPrepareWorkspaceOperation } from './pbj-implementations/prepare-workspace.js';
import { createAssembleSandwichOperation } from './pbj-implementations/assemble-sandwich.js';
import { createCleanupOperation } from './pbj-implementations/cleanup.js';


async function main() {
  console.log('🏠 Welcome to the Simple Kitchen!');
  console.log('🥪 Today we\'re making a Peanut Butter and Jelly Sandwich\n');

  try {
    // Create infrastructure
    const infrastructure = new BasicInfrastructureServices();
    
    // Create root context
    const rootContext = new ProductionContext(infrastructure);
    
    // Register capabilities
    const storageCapability = new KitchenStorageCapability();
    const uiCapability = new KitchenUICapability();
    
    rootContext.capabilities.set('kitchen-storage', storageCapability);
    rootContext.capabilities.set('ui-service', uiCapability);

    // Create operations using factory functions (co-located with implementations)
    const gatherIngredientsOp = createGatherIngredientsOperation(rootContext);
    const prepareWorkspaceOp = createPrepareWorkspaceOperation(rootContext);
    const assembleSandwichOp = createAssembleSandwichOperation(rootContext);
    const cleanupOp = createCleanupOperation(rootContext);

    // Create the PB&J sandwich process
    const pbjProcess = new SimpleProcess(
      'pbj-sandwich-process',
      'Complete PB&J sandwich making process',
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
      rootContext
    );

    // Execute the process
    const recipeRequest = new DataInput<RecipeRequest>(
      {
        recipe_name: 'Peanut Butter and Jelly Sandwich',
        servings: 1
      },
      SchemaBuilder.object({
        recipe_name: SchemaBuilder.string(),
        servings: SchemaBuilder.number()
      }, ['recipe_name', 'servings'])
    );

    console.log('🚀 Starting PB&J sandwich making process...\n');
    
    const result = await pbjProcess.execute(recipeRequest);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 PB&J SANDWICH PROCESS COMPLETED! 🎉');
    console.log('='.repeat(50));
    console.log('Final Result:', JSON.stringify(result.data, null, 2));
    
    if (result.data.tools_cleaned && result.data.ingredients_stored && result.data.workspace_clean) {
      console.log('\n✅ Kitchen is clean and your sandwich is ready to enjoy! 🥪');
    } else {
      console.log('\n⚠️ Process completed but some cleanup may be incomplete.');
    }

  } catch (error) {
    console.error('\n❌ Process failed:', (error as Error).message);
    console.error('\nStack trace:', (error as Error).stack);
  }
}

// Run the kitchen example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}