import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { generateFramework } from '../../generators/framework-generator';
import { Analyzer } from '../../analysis/analyzer';
import { Scanner } from '../../core/scanner';
import { Parser } from '../../core/parser';
import { ASTBuilder } from '../../ast/builder';
import { DEFAULT_CONFIG } from '../../config/types';
import type { AnalysisResult } from '../../analysis/types';
import type { CompilerConfig } from '../../config/types';

export function createGenerateFrameworkCommand(): Command {
  const command = new Command('generate-framework');
  
  command
    .description('Generate TypeScript framework code from BUSY files using Orgata Framework')
    .argument('<input-path>', 'Path to directory containing BUSY files')
    .option('-o, --output <path>', 'Output directory for generated framework code', './generated-framework')
    .option('-p, --package-name <name>', 'Package name for generated code', 'orgata-business-process')
    .option('--overwrite', 'Overwrite existing files in output directory')
    .option('--include-tests', 'Generate test files for framework code')
    .action(async (inputPath: string, options: any) => {
      try {
        console.log('🚀 Generating Orgata Framework Code from BUSY files...\n');
        
        // Use default configuration
        const config = DEFAULT_CONFIG;
        
        // Analyze BUSY files
        console.log('🔍 Analyzing BUSY files...');
        const analysisResult = await analyzeFiles(inputPath, config);
        
        // Check for errors
        if (analysisResult.report.errors.length > 0) {
          console.error('❌ Analysis errors found:');
          analysisResult.report.errors.forEach(error => {
            console.error(`  - ${error.message} (${error.location})`);
          });
          
          console.error('\n💡 Fix these errors before generating framework code.');
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
          console.error('💡 At least one playbook is required to generate framework code.');
          process.exit(1);
        }
        
        console.log(`\n📊 Analysis Summary:`);
        console.log(`  - Teams: ${analysisResult.ast.symbols.teams.size}`);
        console.log(`  - Roles: ${analysisResult.ast.symbols.roles.size}`);
        console.log(`  - Playbooks: ${analysisResult.ast.symbols.playbooks.size}`);
        console.log(`  - Documents: ${analysisResult.ast.symbols.documents.size}`);
        console.log(`  - Tasks: ${analysisResult.ast.symbols.tasks.size}`);
        
        console.log('\n⚡ Generating TypeScript framework code...');
        
        // Generate framework code
        const generationResult = await generateFramework(analysisResult, {
          outputPath: path.resolve(options.output),
          packageName: options.packageName,
          overwrite: options.overwrite,
          includeTests: options.includeTests
        });
        
        console.log('\n🎉 Framework code generation completed successfully!');
        console.log(`\n📁 Generated files in: ${path.resolve(options.output)}`);
        console.log('\n📋 Generated Components:');
        console.log(`   • ${generationResult.processClasses} Process classes`);
        console.log(`   • ${generationResult.stepClasses} Step classes`);
        console.log(`   • ${generationResult.humanSteps} Human steps (with UI)`);
        console.log(`   • ${generationResult.algorithmSteps} Algorithm steps`);
        console.log(`   • ${generationResult.agentSteps} Agent steps`);
        
        console.log('\n🔧 Next Steps:');
        console.log('   1. npm install @orgata/framework');
        console.log('   2. Review generated TypeScript code');
        console.log('   3. Implement TODO items in algorithm/agent steps');
        console.log('   4. Customize UI components as needed');
        console.log('   5. Test with your business processes');
        
        console.log('\n🌟 Framework Philosophy: "Facilitate, Never Constrain"');
        console.log('   - Users can skip any step and provide manual data');
        console.log('   - Complete audit trail of all actions');
        console.log('   - Immutable state with event sourcing');
        console.log('   - AI assistance with human oversight');
        
      } catch (error: any) {
        console.error('❌ Framework generation failed:', error.message);
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

export default createGenerateFrameworkCommand;