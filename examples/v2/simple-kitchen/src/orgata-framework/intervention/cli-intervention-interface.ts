// CLI-based intervention interface

import * as readline from 'readline';
import { Context } from '../types.js';
import { InterventionInterface, InterventionState, InterventionAction } from './types.js';
import { InterventionManager } from './intervention-manager.js';

export class CLIInterventionInterface implements InterventionInterface {
  private rl?: readline.Interface;
  private keyListener?: (key: Buffer) => void;

  initialize() {
    this.setupKeyboardListener();
    console.log('💡 Press SPACE at any time to intervene');
  }

  cleanup() {
    if (this.keyListener && process.stdin.listenerCount('data') > 0) {
      process.stdin.off('data', this.keyListener);
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    if (this.rl) {
      this.rl.close();
    }
  }

  private setupKeyboardListener() {
    if (!process.stdin.isTTY) {
      return; // Skip keyboard setup in non-interactive environments
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    this.keyListener = (key: Buffer) => {
      if (key.toString() === ' ') { // Space bar
        InterventionManager.getInstance().requestIntervention();
      } else if (key.toString() === '\u0003') { // Ctrl+C
        console.log('\n👋 Goodbye!');
        process.exit(0);
      }
    };

    process.stdin.on('data', this.keyListener);
  }

  async showInterventionMenu(state: InterventionState): Promise<InterventionAction> {
    // Temporarily disable raw mode for menu interaction
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    console.clear();
    console.log('🛑 MANUAL INTERVENTION MODE');
    console.log('═'.repeat(60));
    console.log(`📍 Current Step: ${state.currentStep} (${state.stepIndex})`);
    
    if (state.error) {
      console.log(`❌ Error: ${state.error.message}`);
    }

    console.log(`📊 Context State:`);
    console.log(this.formatContextState(state.context));
    
    if (state.currentData) {
      console.log(`📋 Current Data:`);
      console.log(JSON.stringify(state.currentData, null, 2));
    }

    console.log('');
    console.log(`📈 Execution Stats:`);
    const stats = InterventionManager.getInstance().getExecutionStats();
    console.log(`   Total Steps: ${stats.totalSteps} | Completed: ${stats.completedSteps} | Failed: ${stats.failedSteps}`);
    console.log(`   Checkpoints: ${stats.totalCheckpoints} | Manual Mode: ${stats.isManualMode ? 'ON' : 'OFF'}`);
    
    // Show operation set information if available
    if (state.operationSetInfo) {
      console.log('');
      console.log(`🔄 Process: ${state.operationSetInfo.processName}`);
      console.log(`📋 Operations (${state.operationSetInfo.currentOperationIndex + 1}/${state.operationSetInfo.totalOperations}):`);
      state.operationSetInfo.availableOperations.forEach((op, index) => {
        const indicator = index === state.operationSetInfo!.currentOperationIndex ? '→' : ' ';
        const status = index < state.operationSetInfo!.currentOperationIndex ? '✅' : 
                      index === state.operationSetInfo!.currentOperationIndex ? '🔄' : '⏳';
        console.log(`   ${indicator} ${status} ${index + 1}. ${op}`);
      });
    }
    
    console.log('');
    console.log('Available Actions:');
    console.log('  1) retry    - Retry current step');
    console.log('  2) next     - Continue to next step');
    console.log('  3) back     - Go back to previous checkpoint');
    console.log('  4) edit     - Edit context state and data');
    console.log('  5) jump     - Jump to any operation in the set');  
    console.log('  6) auto     - Resume automatic execution');
    console.log('  7) abort    - Stop process');
    console.log('');

    const choice = await this.promptUser('Your choice (1-7): ');
    
    // Re-enable raw mode after menu interaction
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    switch (choice.trim()) {
      case '1': return { type: 'retry' };
      case '2': return { type: 'next' };
      case '3': 
        const prevCheckpoint = InterventionManager.getInstance().findPreviousCheckpoint(state.stepIndex);
        if (prevCheckpoint) {
          return { type: 'back', targetCheckpoint: prevCheckpoint.id };
        } else {
          console.log('❌ No previous checkpoint available');
          return await this.showInterventionMenu(state);
        }
      case '4': 
        const edited = await this.editContextState(state.context, state.currentData);
        return { 
          type: 'edit_state', 
          modifiedContext: edited.context,
          modifiedData: edited.data
        };
      case '5':
        if (state.operationSetInfo) {
          const targetOperation = await this.selectOperationToJumpTo(state.operationSetInfo);
          if (targetOperation) {
            return { type: 'jump_to_operation', targetOperation };
          }
        } else {
          console.log('❌ No operation set information available');
        }
        return await this.showInterventionMenu(state);
      case '6': return { type: 'resume_auto' };
      case '7': return { type: 'abort' };
      default: 
        console.log('❌ Invalid choice, please try again');
        await this.promptUser('Press Enter to continue...');
        return this.showInterventionMenu(state);
    }
  }

  async editContextState(context: Context, currentData: any): Promise<{ context: Context; data: any }> {
    console.log('\n🔧 STATE EDITOR');
    console.log('═'.repeat(40));
    
    console.log('\n📊 Current Context State:');
    console.log(this.formatContextState(context));
    
    console.log('\n📋 Current Data:');
    console.log(JSON.stringify(currentData, null, 2));
    
    console.log('\nWhat would you like to edit?');
    console.log('  1) Data only');
    console.log('  2) Context only'); 
    console.log('  3) Both');
    console.log('  4) Cancel');
    
    const editChoice = await this.promptUser('Your choice (1-4): ');
    
    let newData = currentData;
    let newContext = context;
    
    switch (editChoice.trim()) {
      case '1':
      case '3':
        console.log('\nEnter new data as JSON (or press Enter to keep current):');
        const dataInput = await this.promptUser('> ');
        if (dataInput.trim() !== '') {
          try {
            newData = JSON.parse(dataInput);
            console.log('✅ Data updated!');
          } catch (error) {
            console.log('❌ Invalid JSON, keeping current data');
          }
        }
        
        if (editChoice.trim() === '1') break;
        // Fall through for choice 3
        
      case '2':
        console.log('\n⚠️  Context editing is limited in this version');
        console.log('Context state display only - modifications not yet supported');
        await this.promptUser('Press Enter to continue...');
        break;
        
      case '4':
        console.log('✅ Edit cancelled');
        break;
        
      default:
        console.log('❌ Invalid choice, edit cancelled');
    }
    
    return { context: newContext, data: newData };
  }

  private async selectOperationToJumpTo(operationSetInfo: {
    processName: string;
    availableOperations: string[];
    currentOperationIndex: number;
    totalOperations: number;
  }): Promise<string | null> {
    console.log('\n🔄 OPERATION JUMP MENU');
    console.log('═'.repeat(50));
    console.log(`Process: ${operationSetInfo.processName}`);
    console.log('');
    console.log('Available Operations:');
    
    operationSetInfo.availableOperations.forEach((op, index) => {
      const indicator = index === operationSetInfo.currentOperationIndex ? '→ [CURRENT]' : '  ';
      const status = index < operationSetInfo.currentOperationIndex ? '✅' : 
                    index === operationSetInfo.currentOperationIndex ? '🔄' : '⏳';
      console.log(`   ${status} ${index + 1}) ${op} ${indicator}`);
    });
    
    console.log('');
    console.log('   0) Cancel - Return to intervention menu');
    console.log('');
    
    const choice = await this.promptUser(`Jump to operation (0-${operationSetInfo.totalOperations}): `);
    const choiceNum = parseInt(choice.trim());
    
    if (choiceNum === 0) {
      return null;
    }
    
    if (choiceNum >= 1 && choiceNum <= operationSetInfo.totalOperations) {
      const selectedOperation = operationSetInfo.availableOperations[choiceNum - 1];
      console.log(`✅ Jumping to: ${selectedOperation}`);
      return selectedOperation;
    }
    
    console.log('❌ Invalid choice');
    await this.promptUser('Press Enter to try again...');
    return this.selectOperationToJumpTo(operationSetInfo);
  }

  showStatus(message: string) {
    // Only show status if we're not in raw mode (i.e., not during normal execution)
    if (!process.stdin.isTTY || !process.stdin.isRaw) {
      console.log(message);
    }
  }

  private async promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
      }
      
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private formatContextState(context: Context): string {
    try {
      // Format context in a readable way
      const capabilities = Array.from(context.capabilities.keys());
      return `   Capabilities: [${capabilities.join(', ')}]`;
    } catch (error) {
      return `   Error formatting context: ${error}`;
    }
  }
}