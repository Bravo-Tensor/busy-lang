---
Name: busy-v2
Type: [Package]
Description: BUSY document standard library - core concepts, tools, and base configurations
---

# [Imports]
[Package]:./base/package.busy.md

# [Setup](./core/document.busy.md#setup-section)
# Package Contents

## Core

Core document types and framework primitives.

### [Document] 
[Document](./core/document.busy.md)

| Field | Value |
|-------|-------|
| Path | ./core/document.busy.md |
| Type | Concept |
| Description | The fundamental structural unit of the prompt framework |

### Concept

| Field | Value |
|-------|-------|
| Path | ./core/concept.busy.md |
| Type | Concept |
| Description | A fundamental idea or abstraction, explicitly defined and referenceable |

### Operation

| Field | Value |
|-------|-------|
| Path | ./core/operation.busy.md |
| Type | Concept |
| Description | A defined unit of work or series of steps to be executed |

### Checklist

| Field | Value |
|-------|-------|
| Path | ./core/checklist.busy.md |
| Type | [Document] |
| Description | A required verification sequence for operations |

### Model

| Field | Value |
|-------|-------|
| Path | ./core/model.busy.md |
| Type | Document |
| Description | A domain entity with state and lifecycle |

### Playbook

| Field | Value |
|-------|-------|
| Path | ./core/playbook.busy.md |
| Type | Document |
| Description | A structured document that sequences operations |

### Prompt

| Field | Value |
|-------|-------|
| Path | ./core/prompt.busy.md |
| Type | Document |
| Description | An entry point document for LLM orchestration |

### Role

| Field | Value |
|-------|-------|
| Path | ./core/role.busy.md |
| Type | Document |
| Description | A persona definition with traits and skillset |

### Personality

| Field | Value |
|-------|-------|
| Path | ./core/personality.busy.md |
| Type | Concept |
| Description | An agent persona with identity and behavioral boundaries |

### Tool

| Field | Value |
|-------|-------|
| Path | ./core/tool.busy.md |
| Type | Document |
| Description | A wrapper for external capabilities (CLI, MCP, API) |

### Workspace

| Field | Value |
|-------|-------|
| Path | ./core/workspace.busy.md |
| Type | Concept |
| Description | A folder-based execution environment |

## Toolbox

Runtime tools for Orgata platform integration.

### Event Tool

| Field | Value |
|-------|-------|
| Path | ./toolbox/event-tool.busy.md |
| Type | Tool |
| Description | Emit and subscribe to events |

### File Tool

| Field | Value |
|-------|-------|
| Path | ./toolbox/file-tool.busy.md |
| Type | Tool |
| Description | Read, write, and manage files |

### Logging Tool

| Field | Value |
|-------|-------|
| Path | ./toolbox/logging-tool.busy.md |
| Type | Tool |
| Description | Record activity logs for audit and debugging |

### Messaging Tool

| Field | Value |
|-------|-------|
| Path | ./toolbox/messaging-tool.busy.md |
| Type | Tool |
| Description | Send and receive messages across channels |

### Alarm Tool

| Field | Value |
|-------|-------|
| Path | ./toolbox/alarm-tool.busy.md |
| Type | Tool |
| Description | Time-based event generation for scheduling |

### Gmail Tool

| Field | Value |
|-------|-------|
| Path | ./toolbox/gmail-tool.busy.md |
| Type | Tool |
| Description | Gmail email operations via Composio |

## Base

Foundational agents, configurations, and meta-definitions.

### Package

| Field | Value |
|-------|-------|
| Path | ./base/package.busy.md |
| Type | Concept |
| Description | Package manifest structure and definitions |

### Busy Assistant

| Field | Value |
|-------|-------|
| Path | ./base/busy-assistant.busy.md |
| Type | Role |
| Description | Expert role on the BUSY prompt framework |

### Busy Formatting Rules

| Field | Value |
|-------|-------|
| Path | ./base/busy-formatting-rules.busy.md |
| Type | Checklist |
| Description | Structural verification checklist |

### Workspace Agent

| Field | Value |
|-------|-------|
| Path | ./base/workspace-agent.busy.md |
| Type | Role |
| Description | Default agent for workspace execution |
