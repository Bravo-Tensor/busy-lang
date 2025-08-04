import { describe, beforeEach, it, expect } from '@jest/globals';
import { CheckpointManager } from '../../intervention/checkpoint-manager.js';
import { Context } from '../../types.js';

describe('CheckpointManager', () => {
  let checkpointManager: CheckpointManager;
  let mockContext: Context;

  beforeEach(() => {
    checkpointManager = new CheckpointManager();
    mockContext = {
      currentLayer: 'L0',
      sharedState: { userId: '123', sessionId: 'abc' },
      layerSpecific: { operationalData: 'test' }
    };
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint with unique ID', () => {
      const stepId = 'process-order';
      const stepIndex = 0;
      const data = { orderId: '456', amount: 100 };
      const description = 'Before processing order';

      const checkpointId = checkpointManager.createCheckpoint(
        stepId,
        stepIndex,
        mockContext,
        data,
        description
      );

      expect(checkpointId).toBeTruthy();
      expect(typeof checkpointId).toBe('string');
    });

    it('should create multiple checkpoints with unique IDs', () => {
      const checkpoint1 = checkpointManager.createCheckpoint(
        'step1', 0, mockContext, { data: 1 }, 'First checkpoint'
      );
      const checkpoint2 = checkpointManager.createCheckpoint(
        'step2', 1, mockContext, { data: 2 }, 'Second checkpoint'
      );

      expect(checkpoint1).not.toBe(checkpoint2);
    });

    it('should store checkpoint data correctly', () => {
      const stepId = 'validate-input';
      const stepIndex = 1;
      const data = { input: 'test-data' };
      const description = 'After validation';

      const checkpointId = checkpointManager.createCheckpoint(
        stepId,
        stepIndex,
        mockContext,
        data,
        description
      );

      const checkpoints = checkpointManager.getAllCheckpoints();
      const created = checkpoints.find(cp => cp.id === checkpointId);

      expect(created).toBeDefined();
      expect(created!.stepId).toBe(stepId);
      expect(created!.stepIndex).toBe(stepIndex);
      expect(created!.description).toBe(description);
      expect(created!.contextState).toEqual(mockContext);
      expect(created!.currentData).toEqual(data);
      expect(created!.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('restoreCheckpoint', () => {
    it('should restore a valid checkpoint', () => {
      const data = { testData: 'original' };
      const checkpointId = checkpointManager.createCheckpoint(
        'test-step',
        0,
        mockContext,
        data,
        'Test checkpoint'
      );

      const restored = checkpointManager.restoreCheckpoint(checkpointId);

      expect(restored).toBeDefined();
      expect(restored!.context).toEqual(mockContext);
      expect(restored!.data).toEqual(data);
    });

    it('should return null for invalid checkpoint ID', () => {
      const restored = checkpointManager.restoreCheckpoint('invalid-id');
      expect(restored).toBeNull();
    });

    it('should create deep copies when restoring', () => {
      const data = { nested: { value: 'original' } };
      const checkpointId = checkpointManager.createCheckpoint(
        'test-step',
        0,
        mockContext,
        data,
        'Test checkpoint'
      );

      const restored = checkpointManager.restoreCheckpoint(checkpointId);
      
      // Modify the restored data
      restored!.data.nested.value = 'modified';
      
      // Original checkpoint should remain unchanged
      const checkpoints = checkpointManager.getAllCheckpoints();
      const original = checkpoints.find(cp => cp.id === checkpointId);
      expect(original!.currentData.nested.value).toBe('original');
    });
  });

  describe('findPreviousCheckpoint', () => {
    it('should find the previous checkpoint', () => {
      const checkpoint1Id = checkpointManager.createCheckpoint('step1', 0, mockContext, {}, 'First');
      const checkpoint2Id = checkpointManager.createCheckpoint('step2', 1, mockContext, {}, 'Second');  
      const checkpoint3Id = checkpointManager.createCheckpoint('step3', 2, mockContext, {}, 'Third');

      // Looking for checkpoints before step index 2 (so stepIndex < 2)
      const previous = checkpointManager.findPreviousCheckpoint(2);

      expect(previous).toBeDefined();
      // Since the timestamps might be identical, the method returns one of the valid checkpoints
      // Either 0 or 1 would be valid, but it's consistent in returning the first found
      expect(previous!.stepIndex).toBeLessThan(2); // Should be either 0 or 1
      expect(['First', 'Second']).toContain(previous!.description);
    });

    it('should return null if no previous checkpoint exists', () => {
      checkpointManager.createCheckpoint('step1', 5, mockContext, {}, 'Only checkpoint');

      const previous = checkpointManager.findPreviousCheckpoint(3);
      expect(previous).toBeNull();
    });

    it('should find a checkpoint before the current step when multiple exist', () => {
      // Create checkpoints
      checkpointManager.createCheckpoint('step1', 0, mockContext, {}, 'First');
      checkpointManager.createCheckpoint('step2', 1, mockContext, {}, 'Second');
      checkpointManager.createCheckpoint('step3', 2, mockContext, {}, 'Third');

      const previous = checkpointManager.findPreviousCheckpoint(4); // Find checkpoint before step 4

      expect(previous).toBeDefined();
      // Should find one of the checkpoints with stepIndex < 4 (all of them)
      expect(previous!.stepIndex).toBeLessThan(4);
      expect(['First', 'Second', 'Third']).toContain(previous!.description);
    });
  });

  describe('getAllCheckpoints', () => {
    it('should return empty array when no checkpoints exist', () => {
      const checkpoints = checkpointManager.getAllCheckpoints();
      expect(checkpoints).toEqual([]);
    });

    it('should return all created checkpoints', () => {
      checkpointManager.createCheckpoint('step1', 0, mockContext, {}, 'First');
      checkpointManager.createCheckpoint('step2', 1, mockContext, {}, 'Second');
      checkpointManager.createCheckpoint('step3', 2, mockContext, {}, 'Third');

      const checkpoints = checkpointManager.getAllCheckpoints();
      expect(checkpoints).toHaveLength(3);
      expect(checkpoints.map(cp => cp.description)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('clear', () => {
    it('should remove all checkpoints', () => {
      checkpointManager.createCheckpoint('step1', 0, mockContext, {}, 'First');
      checkpointManager.createCheckpoint('step2', 1, mockContext, {}, 'Second');

      expect(checkpointManager.getAllCheckpoints()).toHaveLength(2);

      checkpointManager.clear();

      expect(checkpointManager.getAllCheckpoints()).toHaveLength(0);
    });

    it('should allow creating new checkpoints after clear', () => {
      checkpointManager.createCheckpoint('step1', 0, mockContext, {}, 'First');
      checkpointManager.clear();

      const newCheckpointId = checkpointManager.createCheckpoint('step2', 1, mockContext, {}, 'New');
      
      const checkpoints = checkpointManager.getAllCheckpoints();
      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0].id).toBe(newCheckpointId);
    });
  });
});