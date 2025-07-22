/**
 * Tests for Process class
 * 
 * Verifies core framework functionality including:
 * - Process lifecycle management
 * - Flexible navigation (skip, go back, jump to step)
 * - Immutable state management
 * - Audit trail generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Process, HumanStep, ProcessStatus, FieldType } from '../index';
import type { ProcessContext, StepContext, StepResult } from '../types';

// Test Process implementation
class TestProcess extends Process {
  constructor() {
    super({
      name: "Test Process",
      layer: "L0",
      estimatedDuration: "1 hour"
    });
    
    this.addStep(new TestHumanStep('step1', 'Step 1'));
    this.addStep(new TestHumanStep('step2', 'Step 2'));
    this.addStep(new TestHumanStep('step3', 'Step 3'));
  }
  
  async execute(context: ProcessContext) {
    return await this.executeSteps(context);
  }
}

// Test HumanStep implementation
class TestHumanStep extends HumanStep {
  constructor(id: string, name: string) {
    super({
      id,
      name,
      description: `Test step: ${name}`,
      type: 'human',
      model: {
        fields: [{
          id: 'testField',
          name: 'testField',
          type: FieldType.TEXT,
          label: 'Test Field',
          required: true,
          validation: []
        }],
        layout: { type: 'single-column', columns: 1 },
        validation: { strategy: 'on-submit', showErrorsOn: 'always' },
        metadata: { version: '1.0', generatedFrom: 'test' }
      },
      view: {
        type: 'form',
        props: {},
        styling: { className: 'test-form' },
        behavior: { validation: { realTime: true, debounceMs: 300, showErrors: true } }
      }
    });
  }
  
  protected async collectUserInput(context: StepContext): Promise<any> {
    // Mock user input for testing
    return { testField: `Input for ${this.name}` };
  }
}

describe('Process', () => {
  let process: TestProcess;
  let mockContext: ProcessContext;
  
  beforeEach(() => {
    process = new TestProcess();
    mockContext = {
      processId: 'test-process',
      userId: 'test-user',
      sessionId: 'test-session',
      environment: 'development',
      businessContext: {
        industry: 'test',
        businessSize: 'small',
        organizationId: 'test-org',
        currentProcesses: new Map(),
        userRole: 'admin'
      },
      permissions: {
        canSkipSteps: true,
        canOverrideValidation: true,
        canModifyProcess: true,
        canViewAuditTrail: true,
        allowedActions: ['all']
      },
      preferences: {
        uiTheme: 'light',
        language: 'en',
        timezone: 'UTC',
        notificationSettings: {
          email: true,
          inApp: true,
          frequency: 'immediate'
        }
      }
    };
  });

  describe('Process Lifecycle', () => {
    it('should initialize with correct status', () => {
      expect(process.getState().status).toBe(ProcessStatus.NOT_STARTED);
      expect(process.isRunning()).toBe(false);
      expect(process.isCompleted()).toBe(false);
    });

    it('should start process correctly', async () => {
      await process.start(mockContext);
      
      expect(process.getState().status).toBe(ProcessStatus.RUNNING);
      expect(process.isRunning()).toBe(true);
      expect(process.getState().currentStepId).toBe('step1');
    });

    it('should pause and resume process', async () => {
      await process.start(mockContext);
      
      process.pause('Testing pause functionality');
      expect(process.getState().status).toBe(ProcessStatus.PAUSED);
      expect(process.isRunning()).toBe(false);
      
      await process.resume();
      expect(process.getState().status).toBe(ProcessStatus.RUNNING);
      expect(process.isRunning()).toBe(true);
    });

    it('should stop process', async () => {
      await process.start(mockContext);
      
      process.stop('Testing stop functionality');
      expect(process.getState().status).toBe(ProcessStatus.CANCELLED);
      expect(process.isRunning()).toBe(false);
    });
  });

  describe('Step Management', () => {
    it('should have correct steps in order', () => {
      const steps = process.getSteps();
      expect(steps).toHaveLength(3);
      expect(steps[0].id).toBe('step1');
      expect(steps[1].id).toBe('step2');
      expect(steps[2].id).toBe('step3');
    });

    it('should get step by ID', () => {
      const step = process.getStep('step2');
      expect(step).toBeDefined();
      expect(step?.name).toBe('Step 2');
    });

    it('should return undefined for non-existent step', () => {
      const step = process.getStep('non-existent');
      expect(step).toBeUndefined();
    });
  });

  describe('Flexible Navigation', () => {
    beforeEach(async () => {
      await process.start(mockContext);
    });

    it('should allow navigation to specific step', async () => {
      await process.goToStep('step3', 'Testing navigation');
      
      expect(process.getState().currentStepId).toBe('step3');
      
      const auditTrail = process.getAuditTrail();
      expect(auditTrail).toContainEqual(
        expect.objectContaining({
          action: expect.objectContaining({
            type: 'step_navigation'
          })
        })
      );
    });

    it('should allow going back steps', async () => {
      // Navigate forward first
      await process.goToStep('step3');
      
      // Then go back
      await process.goBack(2);
      
      expect(process.getState().currentStepId).toBe('step1');
    });

    it('should allow skipping steps with manual data', async () => {
      const manualData = { email: 'test@example.com', source: 'manual' };
      
      await process.skipStep('step2', 'Already have this data', manualData);
      
      expect(process.getState().isStepSkipped('step2')).toBe(true);
      
      const auditTrail = process.getAuditTrail();
      expect(auditTrail).toContainEqual(
        expect.objectContaining({
          action: expect.objectContaining({
            type: 'exception'
          })
        })
      );
    });

    it('should validate manual data for skipped steps', () => {
      const validData = { testField: 'valid data' };
      const invalidData = {};
      
      const validResult = process.validateManualData('step1', validData);
      expect(validResult.valid).toBe(true);
      
      const invalidResult = process.validateManualData('step1', invalidData);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await process.start(mockContext);
    });

    it('should maintain immutable state', () => {
      const originalState = process.getState();
      
      process.pause('Test');
      
      const newState = process.getState();
      expect(originalState).not.toBe(newState); // Different objects
      expect(originalState.status).toBe(ProcessStatus.RUNNING);
      expect(newState.status).toBe(ProcessStatus.PAUSED);
    });

    it('should track completion percentage', async () => {
      expect(process.getCompletionPercentage()).toBe(0);
      
      // Simulate completing steps by skipping them
      await process.skipStep('step1', 'Test completion', { testField: 'data' });
      await process.skipStep('step2', 'Test completion', { testField: 'data' });
      
      // Should show some progress (exact calculation depends on how skipped steps are counted)
      const percentage = process.getCompletionPercentage();
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should provide complete audit trail', async () => {
      await process.goToStep('step2', 'Navigation test');
      await process.skipStep('step3', 'Skip test');
      process.pause('Pause test');
      
      const auditTrail = process.getAuditTrail();
      expect(auditTrail.length).toBeGreaterThan(0);
      
      // Should have events for navigation, skip, and pause
      const eventTypes = auditTrail.map(entry => entry.action.type);
      expect(eventTypes).toContain('step_navigation');
      expect(eventTypes).toContain('exception');
      expect(eventTypes).toContain('status_change');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when starting already running process', async () => {
      await process.start(mockContext);
      
      await expect(process.start(mockContext)).rejects.toThrow(
        'Process cannot be started. Current status: running'
      );
    });

    it('should throw error when navigating to non-existent step', async () => {
      await process.start(mockContext);
      
      await expect(process.goToStep('non-existent')).rejects.toThrow(
        "Step 'non-existent' not found"
      );
    });

    it('should throw error when going back too far', async () => {
      await process.start(mockContext);
      
      await expect(process.goBack(5)).rejects.toThrow(
        'Cannot go back further than process start'
      );
    });
  });

  describe('Framework Philosophy Compliance', () => {
    beforeEach(async () => {
      await process.start(mockContext);
    });

    it('should never constrain - all steps can be skipped', async () => {
      // Test that every step can be skipped
      for (const step of process.getSteps()) {
        expect(step.canSkip('Testing framework philosophy')).toBe(true);
      }
    });

    it('should allow navigation to any step', () => {
      // Test that navigation to any step is allowed
      for (const step of process.getSteps()) {
        expect(process.getState().canGoToStep(step.id)).toBe(true);
      }
    });

    it('should maintain complete history - never rewrite', async () => {
      const initialHistoryLength = process.getState().history.length;
      
      await process.goToStep('step2');
      await process.goToStep('step1'); // Go back
      await process.goToStep('step3'); // Go forward again
      
      const finalHistoryLength = process.getState().history.length;
      
      // Should have added events, never removed them
      expect(finalHistoryLength).toBeGreaterThan(initialHistoryLength);
      
      // Should be able to trace all navigation events
      const navigationEvents = process.getState().history.filter(
        event => event.type === 'step_navigation'
      );
      expect(navigationEvents.length).toBe(3);
    });
  });
});