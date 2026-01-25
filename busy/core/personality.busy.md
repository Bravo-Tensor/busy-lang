---
Name: Personality
Type: [Concept]
Description: A specialized [Document] that defines an agent persona, including identity, tone, context, and behavioral boundaries.
---

# [Imports](./document.busy.md#imports-section)
[Personality]:./personality.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Role]:./role.busy.md
[Checklist]:./checklist.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section

# [Setup](./document.busy.md#setup-section)
A [Personality] is a specialized [Document] that extends [Role] with additional structure for agent-specific configuration. When a [Personality] document is loaded, the agent MUST adopt the defined [Identity], communicate according to [Tone & Voice] guidelines, operate within [Domain Context], and respect all [Boundaries].

Required sections:
- **Identity**: Who the agent is
- **Tone & Voice**: How the agent communicates
- **Domain Context**: What the agent knows about
- **Boundaries**: What the agent can and cannot do

Optional sections:
- **Relationship Dynamics**: How the agent adapts to user familiarity

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Identity]
[Identity]:./personality.busy.md#identity
A description of who the agent is, their name, purpose, and core responsibilities. This section establishes the agent's fundamental character and role within the system.

## [Tone & Voice]
[Tone & Voice]:./personality.busy.md#tone--voice
Guidelines for the agent's communication style, including language preferences, formality level, and communication patterns. Defines how the agent should express itself.

## [Domain Context]
[Domain Context]:./personality.busy.md#domain-context
The operational context in which the agent functions, including the systems, tools, and concepts it works with. Provides the agent with understanding of its environment.

## [Boundaries]
[Boundaries]:./personality.busy.md#boundaries
Explicit rules and constraints that define what the agent must and must not do. Includes safety guidelines, permission requirements, and escalation policies.

## [Relationship Dynamics]
[Relationship Dynamics]:./personality.busy.md#relationship-dynamics
Optional section that defines how the agent adapts its behavior based on familiarity with users, time gaps, and interaction history.

# [Operations](./document.busy.md#operations-section)

## [LoadPersonality][Operation]

### [Input][Input Section]
- `personality_document`: The BUSY [Personality] document to load.

### [Steps][Steps Section]
1. **Parse Frontmatter:** Extract `Name`, `Type`, and `Description` from the document frontmatter.
2. **Validate Type:** Ensure `Type` is `Personality` or compatible type.
3. **Extract Required Sections:** Parse [Identity], [Tone & Voice], [Domain Context], and [Boundaries] sections.
4. **Extract Optional Sections:** If present, parse [Relationship Dynamics] section.
5. **Validate Completeness:** Ensure all required sections are present and non-empty.
6. **Apply Persona:** Configure the agent to operate according to the loaded personality.

### [Output][Output Section]
- Fully configured agent persona with all sections loaded and validated.

### [Checklist][Checklist Section]
- Frontmatter parsed with valid Name and Type.
- All required sections (Identity, Tone & Voice, Domain Context, Boundaries) present.
- Optional sections parsed if available.
- Agent persona successfully configured.

## [ValidatePersonality][Operation]

### [Input][Input Section]
- `personality_document`: The BUSY [Personality] document to validate.

### [Steps][Steps Section]
1. **Check Frontmatter:** Verify Name, Type, and Description fields exist.
2. **Check Required Sections:** Verify all four required sections are present.
3. **Validate Section Content:** Ensure each section has meaningful content.
4. **Report Issues:** If validation fails, return specific errors for each issue.

### [Output][Output Section]
- Validation result: success or list of specific validation errors.

### [Checklist][Checklist Section]
- Frontmatter fields validated.
- Required sections checked for presence.
- Content validation completed.
- Clear error messages provided for any issues.
