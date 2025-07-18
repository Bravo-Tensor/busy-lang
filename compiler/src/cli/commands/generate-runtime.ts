import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { generateRuntime } from '../../generators/runtime-generator';
import { Analyzer } from '../../analysis/analyzer';
import { Scanner } from '../../core/scanner';
import { Parser } from '../../core/parser';
import { ASTBuilder } from '../../ast/builder';
import { DEFAULT_CONFIG } from '../../config/types';
import type { AnalysisResult } from '../../analysis/types';
import type { CompilerConfig } from '../../config/types';

export function createGenerateRuntimeCommand(): Command {
  const command = new Command('generate-runtime');
  
  command
    .description('Generate a runnable React application from BUSY files')
    .argument('<input-path>', 'Path to directory containing BUSY files')
    .option('-o, --output <path>', 'Output directory for generated application', './generated-runtime')
    .option('-n, --name <name>', 'Application name', 'busy-runtime-app')
    .option('-d, --database <type>', 'Database type (sqlite|postgresql)', 'sqlite')
    .option('--no-typescript', 'Generate JavaScript instead of TypeScript')
    .option('--no-tailwind', 'Skip Tailwind CSS integration')
    .option('--auth', 'Include authentication scaffolding')
    .option('--overwrite', 'Overwrite existing files in output directory')
    .action(async (inputPath: string, options: any) => {
      try {
        console.log('🔍 Analyzing BUSY files...');
        
        // Use default configuration for now
        const config = DEFAULT_CONFIG;
        
        // Analyze BUSY files
        const analysisResult = await analyzeFiles(inputPath, config);
        
        // Check for errors
        if (analysisResult.report.errors.length > 0) {
          console.error('❌ Analysis errors found:');
          analysisResult.report.errors.forEach(error => {
            console.error(`  - ${error.message} (${error.location})`);
          });
          
          console.error('\n💡 Fix these errors before generating runtime.');
          process.exit(1);
        }
        
        // Check for warnings
        if (analysisResult.report.warnings.length > 0) {
          console.warn('⚠️  Analysis warnings:');
          analysisResult.report.warnings.forEach(warning => {
            console.warn(`  - ${warning.message} (${warning.location})`);
          });
        }
        
        // Validate we have at least one playbook
        if (analysisResult.ast.symbols.playbooks.size === 0) {
          console.error('❌ No playbooks found in BUSY files.');
          console.error('💡 At least one playbook is required to generate a runtime application.');
          process.exit(1);
        }
        
        console.log(`\n📊 Analysis Summary:`);
        console.log(`  - Teams: ${analysisResult.ast.symbols.teams.size}`);
        console.log(`  - Roles: ${analysisResult.ast.symbols.roles.size}`);
        console.log(`  - Playbooks: ${analysisResult.ast.symbols.playbooks.size}`);
        console.log(`  - Documents: ${analysisResult.ast.symbols.documents.size}`);
        console.log(`  - Tasks: ${analysisResult.ast.symbols.tasks.size}`);
        
        // Generate runtime
        await generateRuntime(analysisResult, {
          outputPath: path.resolve(options.output),
          appName: options.name,
          databaseType: options.database,
          useTypeScript: options.typescript,
          includeTailwind: options.tailwind,
          includeAuth: options.auth,
          overwrite: options.overwrite
        });
        
        console.log('\n🎉 Runtime generation completed successfully!');
        console.log(`\n📁 Generated files in: ${path.resolve(options.output)}`);
        
      } catch (error: any) {
        console.error('❌ Runtime generation failed:', error.message);
        if (error.stack) {
          console.error('\n🔍 Stack trace:');
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
  
  return command;
}

/**
 * Analyze BUSY files from a directory
 */
async function analyzeFiles(inputPath: string, config: CompilerConfig): Promise<AnalysisResult> {
  // Step 1: Scan files
  const scanner = new Scanner(config);
  const scanResult = await scanner.scan(inputPath);
  
  if (scanResult.files.length === 0) {
    throw new Error('No BUSY files found in directory');
  }
  
  // Step 2: Parse files
  const parser = new Parser(config);
  const parseResult = await parser.parse(scanResult);
  
  if (parseResult.parseErrors.length > 0) {
    throw new Error(`Parse errors: ${parseResult.parseErrors.map(e => e.error.message).join(', ')}`);
  }
  
  // Step 3: Build AST
  const astBuilder = new ASTBuilder();
  const buildResult = await astBuilder.build(parseResult);
  
  if (buildResult.errors.length > 0) {
    throw new Error(`AST build errors: ${buildResult.errors.map(e => e.message).join(', ')}`);
  }
  
  // Step 4: Run analysis
  const analyzer = new Analyzer();
  const result = await analyzer.analyze(buildResult.ast);
  
  return result;
}

export default createGenerateRuntimeCommand;