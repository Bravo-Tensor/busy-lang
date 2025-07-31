// Main runtime for the simple kitchen example - now uses packaged wiring

import { createProductionRuntime } from './packages/index.js';

async function main() {
  console.log('🏠 Welcome to the Simple Kitchen!');
  console.log('🥪 Today we\'re making a Peanut Butter and Jelly Sandwich\n');

  try {
    // Create the fully wired runtime package
    const runtime = createProductionRuntime();
    
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
  }
}

// Run the kitchen example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}