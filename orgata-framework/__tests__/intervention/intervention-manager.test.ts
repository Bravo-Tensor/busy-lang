import { describe, beforeEach, it, expect } from '@jest/globals';
import { InterventionManager } from '../../intervention/intervention-manager.js';
import { InterventionInterface, InterventionAction, InterventionState } from '../../intervention/types.js';
import { Context } from '../../types.js';

// Mock implementation of InterventionInterface for testing
class MockInterventionInterface implements InterventionInterface {
  initializeCalled = false;
  cleanupCalled = false;
  statusMessages: string[] = [];
  mockAction: InterventionAction = { type: 'next' };

  async showInterventionMenu(state: InterventionState): Promise<InterventionAction> {
    return this.mockAction;
  }

  async editContextState(context: Context, currentData: any): Promise<{ context: Context; data: any }> {
    return { context, data: currentData };
  }

  showStatus(message: string): void {
    this.statusMessages.push(message);
  }

  initialize(): void {
    this.initializeCalled = true;
  }

  cleanup(): void {
    this.cleanupCalled = true;
  }
}

describe('InterventionManager', () => {
  let interventionManager: InterventionManager;
  let mockInterface: MockInterventionInterface;
  let mockContext: Context;

  beforeEach(() => {
    // Get fresh instance and reset singleton
    interventionManager = InterventionManager.getInstance();
    interventionManager.reset();
    
    mockInterface = new MockInterventionInterface();
    mockContext = {
      currentLayer: 'L0',
      sharedState: { userId: '123' },
      layerSpecific: {}
    };
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = InterventionManager.getInstance();
      const instance2 = InterventionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('setInterface', () => {
    it('should initialize new interface', () => {
      interventionManager.setInterface(mockInterface);
      expect(mockInterface.initializeCalled).toBe(true);
    });

    it('should cleanup previous interface before setting new one', () => {
      const firstInterface = new MockInterventionInterface();
      const secondInterface = new MockInterventionInterface();

      interventionManager.setInterface(firstInterface);
      interventionManager.setInterface(secondInterface);

      expect(firstInterface.cleanupCalled).toBe(true);
      expect(secondInterface.initializeCalled).toBe(true);
    });
  });

  describe('requestIntervention', () => {
    it('should set intervention flag and show status', () => {
      interventionManager.setInterface(mockInterface);
      interventionManager.requestIntervention();

      expect(interventionManager.checkForIntervention()).toBe(true);
      expect(mockInterface.statusMessages).toContain('🚨 Intervention requested - will pause at next checkpoint...');
    });

    it('should work without interface set', () => {
      // Should not throw even without interface
      expect(() => interventionManager.requestIntervention()).not.toThrow();
    });
  });

  describe('checkForIntervention', () => {
    it('should return false when no intervention requested', () => {
      expect(interventionManager.checkForIntervention()).toBe(false);
    });

    it('should clear intervention flag after checking', () => {
      interventionManager.requestIntervention();
      expect(interventionManager.checkForIntervention()).toBe(true);
      expect(interventionManager.checkForIntervention()).toBe(false);
    });
  });

  describe('handleIntervention', () => {
    beforeEach(() => {
      interventionManager.setInterface(mockInterface);
    });

    it('should enter manual mode', async () => {
      mockInterface.mockAction = { type: 'next' };

      await interventionManager.handleIntervention(
        'test-step',
        0,
        mockContext,
        { data: 'test' }
      );

      expect(interventionManager.isManualMode()).toBe(true);
    });

    it('should throw error if no interface configured', async () => {
      const manager = InterventionManager.getInstance();
      manager.reset();
      // Make sure to clear the interface explicitly
      (manager as any).interventionInterface = undefined;

      await expect(
        manager.handleIntervention('test-step', 0, mockContext, {})
      ).rejects.toThrow('No intervention interface configured');
    });

    it('should pass error to intervention state', async () => {
      const error = new Error('Test error');
      let capturedState: InterventionState | null = null;

      mockInterface.showInterventionMenu = async (state) => {
        capturedState = state;
        return { type: 'abort' };
      };

      await interventionManager.handleIntervention(
        'test-step',
        0,
        mockContext,
        { data: 'test' },
        error
      );

      expect(capturedState!.error).toBe(error);
    });

    it('should include checkpoints and execution history', async () => {
      let capturedState: InterventionState | null = null;

      mockInterface.showInterventionMenu = async (state) => {
        capturedState = state;
        return { type: 'next' };
      };

      // Create some history
      interventionManager.createCheckpoint('step1', 0, mockContext, {}, 'Test checkpoint');
      interventionManager.startStep('step1', 0);
      interventionManager.completeStep(true);

      await interventionManager.handleIntervention(
        'step2',
        1,
        mockContext,
        { data: 'test' }
      );

      expect(capturedState!.availableCheckpoints).toHaveLength(1);
      expect(capturedState!.executionHistory).toHaveLength(1);
    });
  });

  describe('checkpoint management', () => {
    it('should create and restore checkpoints', () => {
      const checkpointId = interventionManager.createCheckpoint(
        'test-step',
        0,
        mockContext,
        { value: 'original' },
        'Test checkpoint'
      );

      const restored = interventionManager.restoreCheckpoint(checkpointId);

      expect(restored).toBeDefined();
      expect(restored!.context).toEqual(mockContext);
      expect(restored!.data).toEqual({ value: 'original' });
    });

    it('should find previous checkpoint', () => {
      interventionManager.createCheckpoint('step1', 0, mockContext, {}, 'First');
      const checkpoint2Id = interventionManager.createCheckpoint('step2', 1, mockContext, {}, 'Second');

      const previous = interventionManager.findPreviousCheckpoint(2);

      expect(previous).toBeDefined();
      expect(previous!.stepIndex).toBeLessThan(2);
      expect(['First', 'Second']).toContain(previous!.description);
    });
  });

  describe('manual mode management', () => {
    beforeEach(() => {
      interventionManager.setInterface(mockInterface);
    });

    it('should track manual mode state', () => {
      expect(interventionManager.isManualMode()).toBe(false);

      interventionManager.enterManualMode();
      expect(interventionManager.isManualMode()).toBe(true);

      interventionManager.exitManualMode();
      expect(interventionManager.isManualMode()).toBe(false);
    });

    it('should show status messages on mode changes', () => {
      interventionManager.enterManualMode();
      expect(mockInterface.statusMessages).toContain('🛑 Entering manual mode - step-by-step execution');

      interventionManager.exitManualMode();
      expect(mockInterface.statusMessages).toContain('🔄 Resuming automatic execution...');
    });
  });

  describe('execution tracking', () => {
    it('should track step execution', () => {
      interventionManager.startStep('step1', 0);
      interventionManager.completeStep(true);

      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBe(1);
      expect(stats.completedSteps).toBe(1);
      expect(stats.failedSteps).toBe(0);
    });

    it('should track failed steps', () => {
      interventionManager.startStep('step1', 0);
      interventionManager.completeStep(false, new Error('Test error'));

      const stats = interventionManager.getExecutionStats();
      expect(stats.failedSteps).toBe(1);
    });

    it('should track checkpoints in current step', () => {
      interventionManager.startStep('step1', 0);
      
      const checkpointId = interventionManager.createCheckpoint(
        'step1', 0, mockContext, {}, 'During step'
      );
      interventionManager.addCheckpointToCurrentStep(checkpointId);
      
      interventionManager.completeStep(true);

      // Access private property for testing
      const history = (interventionManager as any).executionHistory;
      expect(history[0].checkpointIds).toContain(checkpointId);
    });

    it('should limit execution history size', () => {
      // Create more than 100 steps
      for (let i = 0; i < 110; i++) {
        interventionManager.startStep(`step${i}`, i);
        interventionManager.completeStep(true);
      }

      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBe(100); // Limited to 100
    });

    it('should handle incomplete steps in stats', () => {
      interventionManager.startStep('step1', 0);
      
      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBe(1);
      expect(stats.completedSteps).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      interventionManager.setInterface(mockInterface);
      interventionManager.enterManualMode();
      interventionManager.requestIntervention();
      interventionManager.createCheckpoint('step1', 0, mockContext, {}, 'Test');
      interventionManager.startStep('step1', 0);
      interventionManager.completeStep(true);

      interventionManager.reset();

      expect(interventionManager.isManualMode()).toBe(false);
      expect(interventionManager.checkForIntervention()).toBe(false);
      
      const stats = interventionManager.getExecutionStats();
      expect(stats.totalSteps).toBe(0);
      expect(stats.totalCheckpoints).toBe(0);
    });
  });

  describe('getExecutionStats', () => {
    it('should return comprehensive statistics', () => {
      interventionManager.enterManualMode();
      interventionManager.createCheckpoint('step1', 0, mockContext, {}, 'Test');
      
      interventionManager.startStep('step1', 0);
      interventionManager.completeStep(true);
      
      interventionManager.startStep('step2', 1);
      interventionManager.completeStep(false);

      const stats = interventionManager.getExecutionStats();
      
      expect(stats).toEqual({
        totalSteps: 2,
        completedSteps: 1,
        failedSteps: 1,
        isManualMode: true,
        totalCheckpoints: 1
      });
    });
  });
});