/**
 * IDE Support Command - BUSY Compiler CLI
 * Commands for starting and managing IDE integrations
 */

import { Command } from 'commander';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

export class IDESupportCommand {
  async startLanguageServer(options: {
    port?: number;
    stdio?: boolean;
    verbose?: boolean;
    config?: string;
  }): Promise<void> {
    const serverPath = path.join(__dirname, '../../ide/language-server.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Language server not found at ${serverPath}. Run 'npm run build' first.`);
    }

    console.log(chalk.blue('Starting BUSY Language Server...'));
    
    if (options.verbose) {
      console.log(chalk.gray(`Server path: ${serverPath}`));
      console.log(chalk.gray(`Port: ${options.port || 'IPC'}`));
      console.log(chalk.gray(`STDIO mode: ${options.stdio || false}`));
    }

    const args: string[] = [];
    
    if (options.stdio) {
      args.push('--stdio');
    }
    
    if (options.port) {
      args.push('--port', options.port.toString());
    }

    if (options.config) {
      args.push('--config', options.config);
    }

    const server = spawn('node', [serverPath, ...args], {
      stdio: options.stdio ? 'inherit' : 'pipe'
    });

    server.on('error', (error) => {
      console.error(chalk.red('Failed to start language server:'), error.message);
      process.exit(1);
    });

    server.on('exit', (code) => {
      if (code !== 0) {
        console.error(chalk.red(`Language server exited with code ${code}`));
        process.exit(code || 1);
      }
    });

    if (!options.stdio) {
      server.stdout?.on('data', (data) => {
        if (options.verbose) {
          console.log(chalk.gray(`[SERVER] ${data.toString().trim()}`));
        }
      });

      server.stderr?.on('data', (data) => {
        console.error(chalk.yellow(`[SERVER ERROR] ${data.toString().trim()}`));
      });
    }

    // Keep process alive
    process.on('SIGINT', () => {
      console.log(chalk.blue('\nShutting down language server...'));
      server.kill('SIGTERM');
      process.exit(0);
    });

    console.log(chalk.green('✅ BUSY Language Server started successfully'));
    console.log(chalk.gray('Press Ctrl+C to stop the server'));
  }

  async installVSCodeExtension(options: {
    force?: boolean;
    verbose?: boolean;
  }): Promise<void> {
    const extensionPath = path.join(__dirname, '../../ide');
    const packageJsonPath = path.join(extensionPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Extension package.json not found at ${packageJsonPath}`);
    }

    console.log(chalk.blue('Installing BUSY Language Support extension for VS Code...'));

    try {
      // Build the extension
      console.log(chalk.gray('Building extension...'));
      const buildResult = spawn('npm', ['run', 'compile'], {
        cwd: extensionPath,
        stdio: options.verbose ? 'inherit' : 'pipe'
      });

      await new Promise((resolve, reject) => {
        buildResult.on('exit', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });
      });

      // Package the extension
      console.log(chalk.gray('Packaging extension...'));
      const vsce = spawn('npx', ['vsce', 'package'], {
        cwd: extensionPath,
        stdio: options.verbose ? 'inherit' : 'pipe'
      });

      let vsixPath = '';
      await new Promise((resolve, reject) => {
        if (vsce.stdout && options.verbose) {
          vsce.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output);
            const match = output.match(/Created: (.+\.vsix)/);
            if (match) {
              vsixPath = path.join(extensionPath, match[1]);
            }
          });
        }

        vsce.on('exit', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`Packaging failed with code ${code}`));
          }
        });
      });

      // Install the extension
      console.log(chalk.gray('Installing extension...'));
      const installArgs = ['--install-extension'];
      
      if (vsixPath && fs.existsSync(vsixPath)) {
        installArgs.push(vsixPath);
      } else {
        // Fallback to finding .vsix file
        const vsixFiles = fs.readdirSync(extensionPath).filter(f => f.endsWith('.vsix'));
        if (vsixFiles.length === 0) {
          throw new Error('No .vsix file found after packaging');
        }
        installArgs.push(path.join(extensionPath, vsixFiles[0]));
      }

      if (options.force) {
        installArgs.push('--force');
      }

      const install = spawn('code', installArgs, {
        stdio: options.verbose ? 'inherit' : 'pipe'
      });

      await new Promise((resolve, reject) => {
        install.on('exit', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`Installation failed with code ${code}`));
          }
        });
      });

      console.log(chalk.green('✅ Extension installed successfully'));
      console.log(chalk.gray('Restart VS Code to activate the extension'));

    } catch (error) {
      throw new Error(`Extension installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateExtensionPackage(options: {
    output?: string;
    verbose?: boolean;
  }): Promise<void> {
    const extensionPath = path.join(__dirname, '../../ide');
    const outputPath = options.output || path.join(process.cwd(), 'busy-language-support.vsix');

    console.log(chalk.blue('Generating VS Code extension package...'));

    try {
      // Build the extension
      console.log(chalk.gray('Building extension...'));
      const buildResult = spawn('npm', ['run', 'compile'], {
        cwd: extensionPath,
        stdio: options.verbose ? 'inherit' : 'pipe'
      });

      await new Promise((resolve, reject) => {
        buildResult.on('exit', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });
      });

      // Package the extension
      console.log(chalk.gray('Packaging extension...'));
      const vsce = spawn('npx', ['vsce', 'package', '--out', outputPath], {
        cwd: extensionPath,
        stdio: options.verbose ? 'inherit' : 'pipe'
      });

      await new Promise((resolve, reject) => {
        vsce.on('exit', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`Packaging failed with code ${code}`));
          }
        });
      });

      console.log(chalk.green(`✅ Extension package created: ${outputPath}`));
      console.log(chalk.gray('Install with: code --install-extension ' + outputPath));

    } catch (error) {
      throw new Error(`Package generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateExtension(options: {
    verbose?: boolean;
  }): Promise<void> {
    const extensionPath = path.join(__dirname, '../../ide');
    const packageJsonPath = path.join(extensionPath, 'package.json');
    
    console.log(chalk.blue('Validating BUSY Language extension...'));

    try {
      // Check package.json
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Validate required fields
      const requiredFields = ['name', 'version', 'engines', 'main', 'contributes'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      console.log(chalk.gray(`✓ Package metadata valid`));

      // Check TypeScript compilation
      console.log(chalk.gray('Checking TypeScript compilation...'));
      const tscResult = spawn('npx', ['tsc', '--noEmit'], {
        cwd: extensionPath,
        stdio: options.verbose ? 'inherit' : 'pipe'
      });

      await new Promise((resolve, reject) => {
        tscResult.on('exit', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error('TypeScript compilation errors'));
          }
        });
      });

      console.log(chalk.gray(`✓ TypeScript compilation successful`));

      // Check required files
      const requiredFiles = [
        'extension.ts',
        'language-server.ts',
        'syntaxes/busy.tmLanguage.json',
        'language-configuration.json'
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(extensionPath, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required file missing: ${file}`);
        }
      }

      console.log(chalk.gray(`✓ All required files present`));

      console.log(chalk.green('✅ Extension validation passed'));

    } catch (error) {
      throw new Error(`Extension validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export function createIDESupportCommand(): Command {
  const ideCommand = new Command('ide')
    .description('IDE integration support commands');

  // Language Server command
  ideCommand
    .command('server')
    .description('Start the BUSY Language Server')
    .option('-p, --port <port>', 'TCP port to listen on (default: IPC)')
    .option('--stdio', 'Use STDIO for communication')
    .option('-c, --config <path>', 'Configuration file path')
    .action(async (options, command) => {
      try {
        const ideSupport = new IDESupportCommand();
        await ideSupport.startLanguageServer({
          ...options,
          ...command.parent?.parent?.opts()
        });
      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    });

  // Install VS Code extension
  ideCommand
    .command('install-vscode')
    .description('Build and install the VS Code extension')
    .option('--force', 'Force reinstall if already installed')
    .action(async (options, command) => {
      try {
        const ideSupport = new IDESupportCommand();
        await ideSupport.installVSCodeExtension({
          ...options,
          ...command.parent?.parent?.opts()
        });
      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    });

  // Package extension
  ideCommand
    .command('package')
    .description('Generate VS Code extension package (.vsix)')
    .option('-o, --output <path>', 'Output path for .vsix file')
    .action(async (options, command) => {
      try {
        const ideSupport = new IDESupportCommand();
        await ideSupport.generateExtensionPackage({
          ...options,
          ...command.parent?.parent?.opts()
        });
      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    });

  // Validate extension
  ideCommand
    .command('validate')
    .description('Validate the VS Code extension')
    .action(async (options, command) => {
      try {
        const ideSupport = new IDESupportCommand();
        await ideSupport.validateExtension({
          ...options,
          ...command.parent?.parent?.opts()
        });
      } catch (error) {
        console.error(chalk.red('Error:'), (error as Error).message);
        process.exit(1);
      }
    });

  return ideCommand;
}