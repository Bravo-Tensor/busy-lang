// Main runtime for the simple kitchen example

import {
  BasicInfrastructureServices,
  ProductionContext,
  BasicOperation,
  SimpleProcess,
  DataInput,
  SchemaBuilder
} from './orgata-framework/index.js';

import { KitchenStorageCapability } from './kitchen-capabilities/storage-service.js';
import { KitchenUICapability } from './kitchen-capabilities/ui-service.js';

import { GatherIngredientsImplementation, RecipeRequest } from './pbj-implementations/gather-ingredients.js';
import { PrepareWorkspaceImplementation } from './pbj-implementations/prepare-workspace.js';
import { 
  AssembleSandwichAlgorithmImplementation, 
  AssembleSandwichHumanImplementation 
} from './pbj-implementations/assemble-sandwich.js';
import { CleanupImplementation } from './pbj-implementations/cleanup.js';

// OrgataOperation-like class for assembly step with fallback
class AssembleSandwichOperation extends BasicOperation {
  private algorithmOp: BasicOperation;
  private humanOp: BasicOperation;

  constructor(context: any) {
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
          if ((error as any).code === 'ASSEMBLY_FAILED' || error.message.includes('assembly failed')) {
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

    // Create operation implementations and operations
    const gatherIngredientsOp = new BasicOperation(
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
      rootContext
    );

    const prepareWorkspaceOp = new BasicOperation(
      'prepare-workspace',
      'Prepare workspace for sandwich making',
      SchemaBuilder.object({
        bread_slices: SchemaBuilder.number(),
        peanut_butter: SchemaBuilder.boolean(),
        jelly: SchemaBuilder.boolean(),
        all_available: SchemaBuilder.boolean()
      }),
      SchemaBuilder.object({
        plate_ready: SchemaBuilder.boolean(),
        knife_ready: SchemaBuilder.boolean(),
        workspace_clean: SchemaBuilder.boolean()
      }, ['plate_ready', 'knife_ready', 'workspace_clean']),
      new PrepareWorkspaceImplementation(),
      rootContext
    );

    const assembleSandwichOp = new AssembleSandwichOperation(rootContext);

    const cleanupOp = new BasicOperation(
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
      rootContext
    );

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
    console.error('\n❌ Process failed:', error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Run the kitchen example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}