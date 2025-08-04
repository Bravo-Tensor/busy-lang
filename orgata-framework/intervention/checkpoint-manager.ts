// Checkpoint management for intervention system

import { Context } from '../types.js';
import { Checkpoint } from './types.js';

export class CheckpointManager {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private checkpointOrder: string[] = [];

  createCheckpoint(
    stepId: string, 
    stepIndex: number,
    context: Context, 
    currentData: any, 
    description: string
  ): string {
    const checkpoint: Checkpoint = {
      id: this.generateId(),
      stepId,
      stepIndex,
      timestamp: new Date(),
      contextState: this.serializeContext(context),
      currentData: this.deepClone(currentData),
      description
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    this.checkpointOrder.push(checkpoint.id);

    // Keep only last 50 checkpoints to prevent memory issues
    if (this.checkpointOrder.length > 50) {
      const oldestId = this.checkpointOrder.shift()!;
      this.checkpoints.delete(oldestId);
    }

    return checkpoint.id;
  }

  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  getAllCheckpoints(): Checkpoint[] {
    return this.checkpointOrder.map(id => this.checkpoints.get(id)!);
  }

  getCheckpointsForStep(stepId: string): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .filter(cp => cp.stepId === stepId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  restoreCheckpoint(checkpointId: string): { context: any; data: any } | null {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return null;
    }

    return {
      context: this.deepClone(checkpoint.contextState),
      data: this.deepClone(checkpoint.currentData)
    };
  }

  findPreviousCheckpoint(currentStepIndex: number): Checkpoint | null {
    // Find the most recent checkpoint before the current step
    const previousCheckpoints = Array.from(this.checkpoints.values())
      .filter(cp => cp.stepIndex < currentStepIndex)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return previousCheckpoints.length > 0 ? previousCheckpoints[0] : null;
  }

  clear(): void {
    this.checkpoints.clear();
    this.checkpointOrder = [];
  }

  private generateId(): string {
    return `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private serializeContext(context: Context): any {
    // For now, serialize what we can. This could be enhanced with
    // proper serialization support in Context implementations
    try {
      // Deep clone the context to ensure it's serializable
      return this.deepClone(context);
    } catch (error) {
      // If context has non-serializable parts, extract what we can
      return { 
        currentLayer: context.currentLayer,
        sharedState: context.sharedState,
        layerSpecific: context.layerSpecific,
        // Note: capabilities and other non-serializable parts are omitted
        _serialized: true
      };
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}