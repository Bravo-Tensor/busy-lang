import { AnalysisResult } from '../analysis/types';
import { DatabaseSchemaGenerator } from './database/schema-generator';
import { TypeScriptInterfaceGenerator } from './types/interface-generator';
import { ReactAppGenerator } from './react-app/app-generator';
import { promises as fs } from 'fs';
import path from 'path';

export interface RuntimeGenerationOptions {
  outputPath: string;
  appName: string;
  databaseType: 'sqlite' | 'postgresql';
  useTypeScript: boolean;
  includeTailwind: boolean;
  includeAuth: boolean;
  overwrite: boolean;
}

export class RuntimeGenerator {
  private dbGenerator: DatabaseSchemaGenerator;
  private typeGenerator: TypeScriptInterfaceGenerator;
  private appGenerator: ReactAppGenerator;

  constructor(private options: RuntimeGenerationOptions) {
    this.dbGenerator = new DatabaseSchemaGenerator({
      outputPath: options.outputPath,
      databaseType: options.databaseType,
      includeMigrations: true
    });

    this.typeGenerator = new TypeScriptInterfaceGenerator({
      outputPath: options.outputPath,
      generateRuntimeTypes: true,
      generateFormTypes: true
    });

    this.appGenerator = new ReactAppGenerator({
      outputPath: options.outputPath,
      appName: options.appName,
      useTypeScript: options.useTypeScript,
      includeTailwind: options.includeTailwind,
      includeAuth: options.includeAuth
    });
  }

  async generateRuntime(analysisResult: AnalysisResult): Promise<void> {
    console.log('🚀 Starting BUSY Runtime Generation...');
    console.log(`📁 Output Path: ${this.options.outputPath}`);
    console.log(`🏗️  App Name: ${this.options.appName}`);
    console.log(`💾 Database: ${this.options.databaseType}`);

    // Check if output directory exists
    await this.validateOutputPath();

    // Phase 1: Database Schema Generation
    console.log('\n📊 Phase 1: Generating Database Schema...');
    await this.dbGenerator.generateSchema(analysisResult);

    // Phase 2: TypeScript Interface Generation
    console.log('\n🏷️  Phase 2: Generating TypeScript Interfaces...');
    await this.typeGenerator.generateInterfaces(analysisResult);

    // Phase 3: React Application Generation
    console.log('\n⚛️  Phase 3: Generating React Application...');
    await this.appGenerator.generateApp(analysisResult);

    // Phase 4: Database Seeding
    console.log('\n🌱 Phase 4: Seeding Database with BUSY Definitions...');
    await this.seedDatabase(analysisResult);

    // Phase 5: Generate Development Scripts
    console.log('\n📝 Phase 5: Generating Development Scripts...');
    await this.generateDevScripts();

    console.log('\n✅ Runtime Generation Complete!');
    console.log('\n🎉 Your BUSY runtime application is ready!');
    console.log(`\n📖 Next steps:`);
    console.log(`   1. cd ${this.options.outputPath}`);
    console.log(`   2. npm install`);
    console.log(`   3. npx prisma db push`);
    console.log(`   4. npm run dev`);
    console.log(`   5. Open http://localhost:3000`);
  }

  private async validateOutputPath(): Promise<void> {
    try {
      const stats = await fs.stat(this.options.outputPath);
      if (stats.isDirectory()) {
        if (!this.options.overwrite) {
          const files = await fs.readdir(this.options.outputPath);
          if (files.length > 0) {
            throw new Error(
              `Output directory ${this.options.outputPath} is not empty. Use --overwrite to overwrite.`
            );
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist, create it
        await fs.mkdir(this.options.outputPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  private async seedDatabase(analysisResult: AnalysisResult): Promise<void> {
    // Generate database seeding script
    const seedScript = this.generateSeedScript(analysisResult);
    
    await fs.writeFile(
      path.join(this.options.outputPath, 'prisma/seed.ts'),
      seedScript,
      'utf-8'
    );

    // Update package.json with seed script
    const packageJsonPath = path.join(this.options.outputPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    packageJson.prisma = {
      seed: 'ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts'
    };
    
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      'ts-node': '^10.9.1'
    };

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
  }

  private generateSeedScript(analysisResult: AnalysisResult): string {
    return `
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with BUSY definitions...');

  // Clear existing data
  await prisma.taskInstance.deleteMany();
  await prisma.playbookInstance.deleteMany();
  await prisma.stateTransition.deleteMany();
  await prisma.documentInstance.deleteMany();
  await prisma.import.deleteMany();
  await prisma.task.deleteMany();
  await prisma.document.deleteMany();
  await prisma.playbook.deleteMany();
  await prisma.role.deleteMany();
  await prisma.team.deleteMany();

  // Seed Teams
  ${Array.from(analysisResult.ast.symbols.teams.values()).map((team, index) => `
  const team${index} = await prisma.team.create({
    data: {
      name: '${team.name}',
      type: '${team.node.teamType}',
      description: '${team.node.description}',
      layer: 'L0', // TODO: Extract from file metadata
      configJson: JSON.stringify({}),
      busyFilePath: '${team.file}'
    }
  });
  `).join('\n')}

  // Seed Roles
  ${Array.from(analysisResult.ast.symbols.roles.values()).map((role, index) => `
  const role${index} = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: '${role.name}',
      description: '${role.node.description}',
      configJson: JSON.stringify({}),
      busyFilePath: '${role.file}'
    }
  });
  `).join('\n')}

  // Seed Playbooks
  ${Array.from(analysisResult.ast.symbols.playbooks.values()).map((playbook, index) => `
  const playbook${index} = await prisma.playbook.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: '${playbook.name}',
      description: '${playbook.node.description}',
      cadenceConfig: JSON.stringify({}),
      configJson: JSON.stringify({}),
      busyFilePath: '${playbook.file}'
    }
  });
  `).join('\n')}

  // Seed Documents
  ${Array.from(analysisResult.ast.symbols.documents.values()).map((doc, index) => `
  const document${index} = await prisma.document.create({
    data: {
      name: '${doc.name}',
      contentType: '${doc.node.contentType}',
      schemaJson: JSON.stringify({}),
      busyFilePath: '${doc.file}'
    }
  });
  `).join('\n')}

  // Seed Tasks
  ${Array.from(analysisResult.ast.symbols.tasks.values()).map((task, index) => `
  const task${index} = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: '${task.name}',
      description: '${task.node.description}',
      executionType: '${task.node.executionType}',
      estimatedDuration: '${task.node.estimatedDuration || ''}',
      orderIndex: ${index},
      configJson: JSON.stringify({})
    }
  });
  `).join('\n')}

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;
  }

  private async generateDevScripts(): Promise<void> {
    // Generate development helper scripts
    const devScripts = {
      'dev-setup.sh': `#!/bin/bash
echo "🚀 Setting up BUSY runtime development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup database
echo "💾 Setting up database..."
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

# Start development server
echo "🎉 Starting development server..."
npm run dev
`,
      'reset-db.sh': `#!/bin/bash
echo "🔄 Resetting database..."

# Remove database file
rm -f prisma/dev.db

# Push schema
npx prisma db push

# Seed database
npx prisma db seed

echo "✅ Database reset complete!"
`,
      'generate-types.sh': `#!/bin/bash
echo "🏷️ Generating Prisma types..."
npx prisma generate
echo "✅ Types generated!"
`
    };

    for (const [filename, content] of Object.entries(devScripts)) {
      const scriptPath = path.join(this.options.outputPath, 'scripts', filename);
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      await fs.writeFile(scriptPath, content, 'utf-8');
      
      // Make scripts executable
      if (filename.endsWith('.sh')) {
        await fs.chmod(scriptPath, '755');
      }
    }

    // Generate .env.example
    const envExample = `
# Database
DATABASE_URL="file:./dev.db"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Client Folders
CLIENT_FOLDER_PATH="./clients"

# Development
NODE_ENV="development"
`;

    await fs.writeFile(
      path.join(this.options.outputPath, '.env.example'),
      envExample.trim(),
      'utf-8'
    );

    // Generate .gitignore
    const gitignore = `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
build/

# Database
*.db
*.db-journal

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Client folders (optional - depends on your needs)
clients/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Prisma
prisma/migrations/
`;

    await fs.writeFile(
      path.join(this.options.outputPath, '.gitignore'),
      gitignore.trim(),
      'utf-8'
    );
  }
}

// Export function for CLI integration
export async function generateRuntime(
  analysisResult: AnalysisResult,
  options: RuntimeGenerationOptions
): Promise<void> {
  const generator = new RuntimeGenerator(options);
  await generator.generateRuntime(analysisResult);
}