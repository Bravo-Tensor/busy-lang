const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing playbook query...');
  
  try {
    const availablePlaybooks = await prisma.playbook.findMany({
      include: { team: true, _count: { select: { instances: true } } }
    });
    
    console.log('📊 Found', availablePlaybooks.length, 'playbooks:');
    availablePlaybooks.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (Team: ${p.team.name}, Instances: ${p._count.instances})`);
    });
    
    console.log('\n📋 Full first playbook data:');
    console.log(JSON.stringify(availablePlaybooks[0], null, 2));
    
    console.log('\n✅ Query successful!');
  } catch (error) {
    console.error('❌ Query failed:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());