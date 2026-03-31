---
Name: Core Types Reference
Type: [View]
Description: Reference guide to all BUSY document types — Document, View, Model, Playbook, Config, Tool, Prompt, Role, Concept, and Checklist.
---

# Imports

[View]:../../../busy/core/view.busy.md
[Document]:../../../busy/core/document.busy.md
[Model]:../../../busy/core/model.busy.md
[Playbook]:../../../busy/core/playbook.busy.md
[Config]:../../../busy/core/config.busy.md
[Tool]:../../../busy/core/tool.busy.md
[Prompt]:../../../busy/core/prompt.busy.md
[Role]:../../../busy/core/role.busy.md
[Concept]:../../../busy/core/concept.busy.md
[Checklist]:../../../busy/core/checklist.busy.md
[Operation]:../../../busy/core/operation.busy.md
[Home]:../home.busy.md

# Setup

This view provides a reference of every BUSY document type, explaining when to use each one and what sections they expect.

# Display

## Core Types Reference

Every BUSY document declares a Type in its frontmatter. The type determines what sections the document should contain and how agents interpret it.

### Type Summary

| Type | Purpose | Key Sections |
|------|---------|-------------|
| Document | General-purpose container | Setup, Operations |
| Concept | Abstract idea or definition | Setup, Local Definitions |
| Model | Domain entity with state | Identity, Fields, Lifecycle, Rules |
| Config | Singleton settings object | Fields, Defaults, Rules |
| View | Presentation layer for LORE | Data Sources, Display, Operations |
| Playbook | Orchestrates a sequence of work | Sequence Steps, Conditions |
| Tool | Wraps an external capability | Capability, Invocation Contract |
| Prompt | Entry point for LLM execution | Prompt Text, Operations |
| Role | Persona definition | Traits, Principles, Skillset |
| Checklist | Verification sequence | Checklist items |
| Operation | Unit of work (used as a concept) | Input, Steps, Output, Checklist |

### Document

The foundational type. Every other type extends Document. Use it for general-purpose documents that don't fit a more specific type.

```yaml
Type: [Document]
```

**Standard sections:** Imports, Setup, Local Definitions, Operations

**When to use:** For documents that define operations and concepts but aren't models, playbooks, tools, or views.

### Concept

An abstract idea or abstraction that is explicitly defined and referenceable. Concepts don't have operations — they exist to be imported and referenced by other documents.

```yaml
Type: [Concept]
```

**When to use:** For shared definitions, glossary terms, or abstract ideas that multiple documents reference. The `Document` and `Operation` core types are themselves Concepts.

### Model

A domain entity — something that exists, has fields, and changes state over time. Think of it as a database table definition written in plain language.

```yaml
Type: [Model]
```

**Required sections:**
- **Identity** — what makes each instance unique
- **Fields** — table of field name, type, meaning, required
- **Lifecycle** — valid states and transitions
- **Rules** — constraints that must always hold
- **Relationships** — connections to other models
- **Persistence** — which adapter handles storage

**Built-in operations:** `createInstance`, `updateInstance`, `transitionState`, `findByIdentity`, `listInstances`

**Example:**
```markdown
## Identity
Each customer is identified by a unique `customer_id` (UUID).

## Fields
| Field | Type | Meaning | Required |
|-------|------|---------|----------|
| customer_id | uuid | Unique identifier | Yes |
| name | string | Full name | Yes |
| email | string | Contact email | Yes |
| status | string | Account status | Yes |

## Lifecycle
| State | Can Transition To | Trigger |
|-------|-------------------|---------|
| active | suspended, closed | - |
| suspended | active, closed | - |
| closed | - | - |
```

### Config

A singleton Model — exactly one instance exists per workspace. Use for settings, feature flags, and configuration objects.

```yaml
Type: [Config]
```

**Sections:** Fields, Defaults, Rules (no Lifecycle or Relationships)

**When to use:** For workspace settings where there's one authoritative record, not a collection. Think settings files, not database tables.

### View

A presentation document that composes data from Models and renders it for display. Views can be compiled into LORE site pages.

```yaml
Type: [View]
```

**Key sections:**
- **Data Sources** — imported Models and Configs that provide data
- **Display** — markdown layout with optional Handlebars placeholders
- **Operations** — user actions (refresh, filter, navigate)

**A View is renderable** if it has a Display section or imports Models. The LORE compiler picks up renderable Views and generates site pages from them.

**When to use:** For dashboards, overviews, documentation pages — anything that presents information.

#### Page Views vs Component Views

Views come in two flavors:

**Page views** are route-bound — they own data queries, compose components, and handle layout with conditional sections via Handlebars. They have a `# Data` section that queries Models.

**Component views** are embeddable — they receive data as params from a parent page view and render a focused slice. They declare `Params` in frontmatter and have no data-fetching logic. Page views embed them using query strings on import links:

```markdown
[Component]:../components/status-card.busy.md?prospect={{prospect}}
```

Component views declare their expected params:

```yaml
---
Name: Status Card
Type: [View]
Params:
  - prospect: object (required)
  - show_details: boolean
---
```

This keeps data ownership at the page level and components composable across pages.

### Playbook

An orchestration document that sequences operations, prompts, tools, or roles with optional branching.

```yaml
Type: [Playbook]
```

**Key sections:**
- **Sequence Steps** — ordered list of operations to execute
- **Conditions** — boolean checks for branching
- **Role Context** — optional role to assume for specific steps
- **Private Operations** — reusable helpers prefixed with `_`

**When to use:** For multi-step workflows that coordinate multiple operations, like onboarding processes or review pipelines.

### Tool

A wrapper around an external capability — CLI, MCP, API, or script — so agents can invoke it consistently.

```yaml
Type: [Tool]
```

**Key sections:**
- **Capability** — what effect the tool provides
- **Invocation Contract** — how to call the underlying resource
- **State** — optional state management instructions
- **Events** — events the tool can generate
- **Providers** — maps abstract actions to provider-specific implementations

**When to use:** For anything that calls external systems. Keep tools mechanical and minimal — reference scripts or prompts rather than embedding logic inline.

### Prompt

An entry point for LLM interaction. Defines the overall task and guides the LLM through operations.

```yaml
Type: [Prompt]
```

**Key sections:**
- **Prompt Text** — the instruction for the LLM
- **Operations** — `executePrompt` orchestrates the work

**When to use:** For top-level documents that an LLM will directly execute.

### Role

A persona definition with traits, principles, and skillset. Agents adopt roles before executing certain operations.

```yaml
Type: [Role]
```

**Key sections:**
- **Traits** — personality characteristics
- **Principles** — guiding rules and boundaries
- **Skillset** — capabilities the role possesses

**When to use:** For defining agent personas — how they should behave, what they know, and what constraints they operate under.

### Checklist

A verification sequence attached to operations or used standalone. Items must be observable and evidence-based.

```yaml
Type: [Checklist]
```

**When to use:** For verification procedures — quality gates, formatting rules, deployment checklists. Each item should be something an agent can prove with evidence.

### Choosing the Right Type

| You want to... | Use |
|-----------------|-----|
| Define a domain entity with fields and state | Model |
| Define workspace settings | Config |
| Show information in a dashboard | View |
| Orchestrate a multi-step workflow | Playbook |
| Wrap an external API or CLI | Tool |
| Give an agent a persona | Role |
| Create an LLM task entry point | Prompt |
| Define a verification procedure | Checklist |
| Define a reusable abstract concept | Concept |
| Everything else | Document |
