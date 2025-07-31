// Main runtime for the simple kitchen example - now uses packaged wiring with intervention support

import { createProductionRuntime } from './packages/index.js';
import { CLIInterventionInterface } from '@busy-lang/orgata-framework/intervention';

async function main() {
  console.log('🏠 Welcome to the Simple Kitchen!');
  console.log('🥪 Today we\'re making a Peanut Butter and Jelly Sandwich\n');

  let runtime: any;
  
  try {
    // Create the fully wired runtime package
    runtime = createProductionRuntime();
    
    // Set up CLI intervention interface
    runtime.context.infrastructure.interventionManager.setInterface(
      new CLIInterventionInterface()
    );
    
    console.log(`📦 Using: ${runtime.metadata.name} v${runtime.metadata.version}`);
    console.log(`🌍 Environment: ${runtime.metadata.environment}`);
    console.log(`📋 Business: ${runtime.business.metadata.name} with ${runtime.business.playbooks.size} playbooks\n`);

    console.log('🚀 Starting PB&J sandwich making process...\n');
    
    // Execute the process through the runtime package
    const result = await runtime.execute('Peanut Butter and Jelly Sandwich', 1);
    
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
  } finally {
    // Clean up intervention interface
    if (runtime?.context?.infrastructure?.interventionManager) {
      const currentInterface = runtime.context.infrastructure.interventionManager['interventionInterface'];
      if (currentInterface?.cleanup) {
        currentInterface.cleanup();
      }
    }
  }
}

// Run the kitchen example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}