# Intervention System Design

## Overview

The Intervention System provides human-in-the-loop capabilities for the Orgata framework, allowing humans to intervene, debug, and control process execution at runtime. This system is designed as core infrastructure that's always available, not an opt-in feature.

## Architectural Principles

### 1. **Always-On Infrastructure**
- Intervention capability is built into the framework at the infrastructure level
- Every process automatically gains intervention capability without code changes
- No explicit opt-in required - it's a fundamental framework feature

### 2. **Separation of Concerns**
- **InterventionManager**: Core mechanics of intervention, checkpointing, and state management
- **InterventionInterface**: Pure UI/UX concerns for human interaction
- **Infrastructure**: Provides intervention as a core service
- **Process**: Uses intervention transparently through infrastructure

### 3. **Interface Agnostic**
- Core intervention mechanics are independent of UI implementation
- Can swap CLI for Web, API, or other interfaces without changing core logic
- Interface implementations only handle display and input, not intervention logic

## Core Components

### InterventionManager

Singleton infrastructure service that manages:
- Checkpoint creation and restoration
- Manual mode state management
- Coordination between processes and UI interfaces
- Intervention request handling

```typescript
class InterventionManager {
  // Singleton instance
  private static instance: InterventionManager;
  
  // State management
  private interventionRequested = false;
  private manualMode = false;
  private checkpointManager = new CheckpointManager();
  
  // UI interface (pluggable)
  private interventionInterface?: InterventionInterface;
}
```

### InterventionInterface

Abstract interface for human interaction:
- Display current state and options
- Collect human decisions
- Enable state editing
- Show status messages

```typescript
interface InterventionInterface {
  showInterventionMenu(state: InterventionState): Promise<InterventionAction>;
  editContextState(context: Context): Promise<Context>;
  showStatus(message: string): void;
}
```

### Integration Points

1. **Infrastructure Level**: InterventionManager is created as part of BasicInfrastructureServices
2. **Context Level**: Contexts gain checkpoint/state management capabilities
3. **Process Level**: SimpleProcess automatically checks for intervention at each operation boundary
4. **Operation Level**: Before/after checkpoints created for every operation

## Intervention Flow

### Automatic Checkpointing
1. Before each operation executes, a checkpoint is created
2. After successful execution, another checkpoint is created
3. Checkpoints capture full context state and current data

### Intervention Triggers
1. **User Requested**: Human presses intervention key (e.g., spacebar)
2. **Error Triggered**: Operation failure automatically enters manual mode
3. **Programmatic**: Operations can request intervention for specific scenarios

### Manual Mode Behavior
Once intervention is triggered:
1. Process pauses at next checkpoint
2. Human sees current state and available options
3. Each step requires manual confirmation to proceed
4. Human can:
   - Retry current step
   - Go back to previous checkpoint
   - Edit context state directly
   - Skip to next step
   - Resume automatic execution
   - Abort process

## Design Decisions

### Why Infrastructure Level?
- Intervention is a cross-cutting concern like logging or monitoring
- Should be available to all processes without modification
- Consistent behavior across the entire framework
- No need to thread intervention capability through constructors

### Why Separate Manager from Interface?
- Allows multiple UI implementations (CLI, Web, API)
- Core logic remains consistent regardless of UI
- Easier testing of intervention mechanics
- Clean separation of concerns

### Why Checkpoint at Operation Boundaries?
- Operations are the natural unit of work in Orgata
- Provides sufficient granularity for most debugging needs
- Keeps checkpoint count manageable
- Aligns with existing framework abstractions

### Why Allow Direct State Editing?
- Maximum flexibility for debugging and recovery
- Humans can fix issues that automated recovery can't handle
- Useful for testing edge cases and error conditions
- Power user feature with appropriate warnings

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Implement InterventionManager as singleton
2. Add to BasicInfrastructureServices
3. Create InterventionInterface abstraction
4. Implement basic CheckpointManager

### Phase 2: Process Integration
1. Update SimpleProcess to use InterventionManager
2. Add automatic checkpointing around operations
3. Implement intervention checking logic
4. Handle manual mode flow

### Phase 3: CLI Interface
1. Implement CLIInterventionInterface
2. Add keyboard listener for spacebar
3. Create interactive menus
4. Implement state editor

### Phase 4: Context Enhancement
1. Add getState/setState methods to Context
2. Implement state serialization
3. Add execution metadata tracking
4. Enable checkpoint restoration

## Future Enhancements

### Web Interface
- Real-time process visualization
- Graphical state editor
- Checkpoint timeline view
- Multi-process monitoring

### Advanced Features
- Conditional breakpoints
- State watchers
- Automated intervention rules
- Checkpoint persistence to disk
- Remote intervention capability

### Integration Options
- VSCode extension for debugging
- REST API for programmatic intervention
- WebSocket support for real-time control
- Integration with monitoring systems