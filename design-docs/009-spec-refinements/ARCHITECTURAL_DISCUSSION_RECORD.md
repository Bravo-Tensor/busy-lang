# BUSY Spec Changes - Architectural Discussion Record

_This document preserves the original discussion and evolution of the BUSY specification refinements._

## Change 1: Capability and Responsibility Refinement

### Proposed Changes

**Core Concept**: All roles, tools, and advisors must specify capabilities. Capabilities are interface definitions that enable plug-and-play composability.

**Key Components**:

1. **Capability** - Function-like interface definition
   - Name/description (what it does)
   - 0-N inputs (what it needs)
   - 0-N outputs (what it returns)
   - Can be grouped in capability files or listed individually

2. **Responsibility** - Special type of capability for continuous monitoring
   - Has all the same fields as capability (inputs, outputs, name, description, method)
   - Not explicitly invoked - runs continuously while "on duty"
   - Focuses on monitoring, quality assurance, SLA maintenance
   - Enforcement mechanisms (thresholds, escalations) described in method field, not as separate fields
   - Always assigned to a role (playbooks can't be directly responsible)

3. **Interface Matching**
   - Roles/tools define capabilities they HAVE
   - Playbooks/steps define capabilities they NEED
   - System matches and plugs them together

4. **Playbook Capability Aliasing**
   - Playbooks implicitly declare capabilities (cook-order playbook → cook-order capability)
   - Steps can overload/alias to capabilities

### Rationale
- Creates clean interface-based architecture
- Enables true composability and reusability
- Separates "active" capabilities from "passive" responsibilities
- Provides clear contract definitions for system integration

## Analysis & Challenges

### Strengths
✅ **Clean Separation**: Distinguishing between invokable capabilities and monitoring responsibilities is architecturally sound

✅ **Interface-Driven**: This enables true plug-and-play architecture - very powerful

✅ **Composability**: Capability files allow grouping related functions, promoting reuse

### Clarifications from Discussion

✅ **Capability Granularity**: Can be either/both fine-grained and coarse. quality-control capability might include check-food-temperature as one of its definitions. Compositional approach.

✅ **Capability Resolution**: Capabilities can be just names (resolved at compilation) and can nest. No inheritance or "includes" needed yet - keep it simple.

✅ **Responsibility Enforcement**: No predefined patterns - just description of what it means to be responsible, what they monitor, and what they'll do to maintain it. Keep it flexible.

✅ **Responsibility Lifecycle**: 
  - Step-level: Duration of step execution only
  - Multi-step: Separate individual responsibilities per step
  - Playbook-level: Covers whole playbook, but can be temporarily transferred to specific roles during substeps

✅ **Transient Responsibility Transfer**: Playbook responsibilities can be temporarily transferred to roles executing specific steps, then revert back.

✅ **Capability Marketplace**: Interface-driven approach enables discovery of what tools/roles provide needed capabilities.

✅ **Fractal Versioning**: Interface change management is itself a responsibility - likely at L1 level. Undefined responsibilities are realistic.

### Remaining Questions

🤔 **Capability Discovery**: How does the system handle capability resolution when multiple providers exist?

🤔 **Circular Dependencies**: Could responsibilities create circular dependency issues?

🤔 **Performance Implications**: Continuous responsibility monitoring efficiency considerations

### Key Architectural Implications

1. **Compilation-Time Resolution**: Capability names can be declared early, full definitions resolved during compilation

2. **Responsibility Transfer Mechanism**: Clean handoff between playbook-level and step-level responsibilities

3. **Interface-Driven Composability**: Creates foundation for "capability marketplace" where components plug together based on declared interfaces

4. **Fractal Responsibility Model**: Management concerns (versioning, compatibility) are themselves responsibilities at higher layers

### Open Architecture Questions

1. **Capability Resolution**: Multiple providers for same capability - resolution mechanism?
2. **Testing Strategy**: How to test "always on" responsibilities vs. invokable capabilities?
3. **Dependency Management**: Circular dependency prevention in responsibility chains?

## Implementation Notes

1. **Syntax Design**: Need syntax for capability declarations (name-only vs. full definition)
2. **Compilation Logic**: Resolver for capability name → full definition mapping
3. **Transfer Syntax**: How to specify responsibility transfers in playbook steps
4. **Marketplace Queries**: Capability discovery/matching system for tooling

## Important Observation: Customers as Role Players

💡 **Key Insight**: Customers also play roles and have capabilities/responsibilities within business processes.

**Examples**:
- Customer capability: "provide-requirements" (inputs: business need, outputs: requirement specification)
- Customer responsibility: "respond-to-clarification-requests" (within 48 hours)
- Customer responsibility: "approve-deliverables" (review and provide feedback)

**Implications**:
- BUSY processes aren't just internal - they model the full ecosystem including external participants
- Customer roles can have SLAs and responsibilities just like internal roles
- Interface contracts extend beyond organizational boundaries
- Customer capabilities become inputs to organizational capability planning

This reinforces the universality of the capability/responsibility model - it works for any participant in a business process, internal or external.

## Additional Refinements from Later Discussion

### Input/Output Field Specifications
- Data inputs need ALL fields defined (not just required ones)
- New structure: fields section with name, type, and required flag
- Inputs or outputs can be "none" when not applicable

### Method Field Addition
- New 'method' field added to capabilities and tasks/steps
- Contains detailed description of HOW something should be done
- AI uses this to generate the three downstream implementations
- Keeps implementation guidance synchronized when changes occur
- Initially free-form text, later will analyze for coherence and capability references

### Simplified Playbook Structure
- Playbooks don't declare required capabilities upfront
- Capabilities either emerge implicitly from aggregated steps
- Or are used explicitly within individual steps
- Removes redundant capability declarations

### Monitoring/Enforcement in Method Field
- No separate monitoring/enforcement fields for responsibilities
- All thresholds, metrics, escalation rules described in the method text
- Keeps spec consistent - all "how" details in method field
- Simplifies schema while maintaining all necessary information

---

## Change 2: Remove Execution Type Specifications from BUSY Spec

### Proposed Changes

**Core Concept**: Remove `execution_type` (human/ai_agent/algorithmic) and UI specifications from BUSY language spec. These become runtime/generation concerns, not language design concerns.

**Key Changes**:

1. **Remove from Language Spec**:
   - `execution_type: "human" | "ai_agent" | "algorithmic"`
   - `ui_type: "form" | "meeting" | "strategy_session"`
   - `agent_prompt`, `context_gathering` fields
   - Algorithm-specific fields

2. **Runtime Execution Strategy**:
   - Generate AI, human, AND algorithmic versions for each task (when possible)
   - Runtime server manages execution switching
   - Default fallback chain: algo → AI → human
   - Exception-driven escalation between execution types
   - Human override capability at any point

3. **Runtime Server Responsibilities**:
   - State management for team/environment
   - Execution orchestration and fallback logic
   - API, MCP, and UI exposure for all baseline concepts
   - Dynamic execution type switching

### Rationale

- **Separation of Concerns**: Language describes WHAT to do, runtime decides HOW to execute
- **Flexibility**: Same process can run with different execution types without spec changes
- **Resilience**: Built-in fallback mechanisms for when execution types fail
- **Human Agency**: Humans can intervene at any point regardless of default execution type
- **Simplicity**: Cleaner language spec focused on business logic, not implementation details

### Analysis & Challenges

#### Strengths
✅ **Clean Abstraction**: Separates business process definition from execution strategy

✅ **Runtime Flexibility**: Can adapt execution without changing BUSY files

✅ **Resilience**: Built-in fallback chain handles failures gracefully

✅ **Human Override**: Preserves human agency in automated processes

### Clarifications from Discussion

✅ **Stub Generation**: Generate stubs for all execution types at minimum. Runtime configures what's actually available.

✅ **Runtime Flexibility**: Production might lock to human-only, sim/test can use "yes man" algorithms. Policy-driven.

✅ **Context via Rich Descriptions**: Task/playbook descriptions can contain prompt information naturally, not as separate fields.

✅ **Post-Generation Enhancement**: IDE agent helps flesh out implementations (prompts, UI details) after initial generation.

✅ **Knit Integration**: Changes to descriptions/prompts that meaningfully alter step definitions reflect back to BUSY spec and propagate downstream. System stays coherent.

✅ **Baseline UI Generation**: Start with inputs + instructions + output form. Iterate with IDE agent for task-appropriate customization.

✅ **Local vs Server Customization**: Changes can be personal (local branch) or shared (propose to main). Runtime policies control override permissions.

✅ **Knit Reconciliation**: File changes on main/server trigger pull and reconciliation of local versions.

### Key Architecture Integration

1. **IDE-Driven Development**: Post-generation enhancement through conversational IDE agents
2. **Policy-Based Runtime**: Execution type availability controlled by runtime policies
3. **Knit-Powered Coherence**: Changes propagate bidirectionally between implementations and specs
4. **Distributed Customization**: Personal vs. shared customizations with reconciliation workflows

---

## Change 3: Fractal Resource Management

### Current State & Problem

**Current**: Teams have allocated resources (money, time, people, tools, space) as shared concepts.

**Problem**: No clear mechanism for resource delegation from team → roles → playbooks → steps. How do we ensure appropriate resource allocation without over/under-allocation?

### Proposed Concept (In Development)

**Core Analogy**: Like heap allocation in programming - team gets "heap space" of resources, functions/objects need chunks allocated.

**Key Questions to Resolve**:

1. **Explicit vs. Implicit Allocation**: 
   - Do we require explicit resource delegation in BUSY specs?
   - Or rely on runtime allocation/garbage collection mechanism?

2. **Resource Ownership Models**:
   - **Team-Owned**: Traditional allocated resources (stations, budget)
   - **Role-Brought**: Personal resources roles bring (chef's knives)
   - **Temporary Assignment**: Resources temporarily allocated (station for a shift)

3. **Over-Allocation Handling**:
   - What happens when resource demands exceed allocation?
   - Runtime crash? Graceful degradation? Exception escalation?

4. **Resource Lifecycle**:
   - When are resources claimed/released?
   - How do we handle resource contention?
   - Resource reservation vs. dynamic allocation?

### Examples from Kitchen Scenario

**Team Resources (Allocated)**:
- Kitchen stations (limited capacity)
- Ingredient budget
- Service time windows
- Equipment

**Role-Brought Resources**:
- Chef's personal knives
- Individual expertise/skills
- Personal tools and equipment

**Temporary Assignments**:
- Station allocated to chef for shift
- Specific equipment for a task
- Time slots for prep work

### Design Decision: Runtime Abstraction

✅ **Key Insight**: Following established programming patterns - resource management should be abstracted away from the BUSY spec, handled entirely by Orgata runtime/framework/OS.

#### Programming Language Analogy
- **High-level languages** (Java, Python, JS): Memory/resource management abstracted away
- **Low-level languages** (C++): Manual resource management only for special performance cases
- **BUSY should be high-level**: Assume system provides resources when needed

#### Resource Management Strategy

✅ **System Responsibility**: Orgata runtime handles all resource allocation/deallocation

✅ **Interface-Based**: BYO resources work as long as they meet the interface (like running on your own computer/server)

✅ **Graceful Failure**: When resources unavailable:
  - Thread/process crashes gracefully
  - Error logs captured
  - System monitoring tracks resource constraints
  - Manual or automatic scaling responses

✅ **Abstraction Benefits**:
  - BUSY specs stay clean and focused on business logic
  - Runtime can optimize resource allocation strategies
  - Scaling and resource management become operational concerns
  - Different deployment environments can handle resources differently

#### Minimal Spec Impact

BUSY specs might only need:
- Resource **existence assumptions** ("this process needs a grill station")
- **Interface requirements** for BYO resources
- **No explicit allocation/deallocation** syntax

### Integration with Previous Changes

- **Capabilities**: Resource interfaces become capability requirements ("needs cutting-capability")
- **Responsibilities**: Resource management stays at runtime level, not role responsibilities
- **Runtime Flexibility**: Like execution types, resource policies are runtime-configurable

### Implementation Approach

1. **BUSY Spec**: Minimal resource syntax - just interface requirements
2. **Orgata Runtime**: Full resource management, allocation, monitoring, scaling
3. **Error Handling**: Graceful failures with logging and monitoring integration
4. **BYO Support**: Interface-based resource substitution (chef's knives = cutting-capability)

This keeps BUSY as a high-level business process language while pushing resource complexity to the appropriate system layer.