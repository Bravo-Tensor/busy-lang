// Alternative main showing how different runtime configurations can be swapped

import { createProductionRuntime, createTestRuntime } from './packages/index.js';

async function testBothConfigurations() {
  console.log('🧪 Testing Different Runtime Configurations\n');

  const configurations = [
    { name: 'Production', factory: createProductionRuntime },
    { name: 'Test', factory: createTestRuntime }
  ];

  for (const config of configurations) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🏗️  Testing ${config.name} Runtime Configuration`);
    console.log('='.repeat(60));

    try {
      const runtime = config.factory();
      
      console.log(`📦 Package: ${runtime.metadata.name} v${runtime.metadata.version}`);
      console.log(`🌍 Environment: ${runtime.metadata.environment}`);
      console.log(`📋 Description: ${runtime.metadata.description}`);
      console.log(`🔧 Resources: ${runtime.resources.resources.size} loaded`);
      console.log(`📋 Business Playbooks: ${runtime.business.playbooks.size} available\n`);

      console.log(`🚀 Executing ${config.name} process...`);
      
      // Execute with different parameters to show flexibility
      const result = await runtime.execute(`${config.name} PB&J Sandwich`, 1);
      
      console.log(`\n✅ ${config.name} execution completed!`);
      console.log('Result:', JSON.stringify(result.data, null, 2));

    } catch (error) {
      console.error(`\n❌ ${config.name} execution failed:`, (error as Error).message);
    }
  }
}

// Run the comparison test
if (import.meta.url === `file://${process.argv[1]}`) {
  testBothConfigurations().catch(console.error);
}