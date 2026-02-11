---
Name: Event Tool
Type: [Tool]
Description: Emit and subscribe to events in the Orgata event bus
Provider: runtime
---

# Event Tool

> Emit custom events and subscribe to event streams. Events are published to Redis Streams
> and can trigger other operations via workspace trigger configuration.

## Usage in Triggers

Events emitted via this tool can trigger operations. Configure in workspace `.workspace`:

```json
{
  "triggers": [
    {
      "event_type": "order.completed",
      "filter": {"total": {"$gt": 100}},
      "operation": "SendThankYouEmail",
      "queue_when_paused": true
    }
  ]
}
```

### Filter Syntax

| Pattern | Matches |
|---------|---------|
| `order.*` | order.created, order.completed, order.cancelled |
| `user.signup` | Exact match only |
| `{"status": "success"}` | Payload field match |
| `{"amount": {"$gt": 100}}` | Numeric comparison |

## [Capability]

- Emit custom events with typed payloads
- Subscribe to event streams (via triggers)
- Query recent events
- Create event-driven workflows

## [Invocation Contract]

**Provider**: Orgata Runtime
**Authentication**: None (workspace-scoped)
**Transport**: Redis Streams (`orgata:events`)

Events are workspace-scoped by default. Cross-workspace events require explicit routing.

## [Response Processing]

```bash
# Standard event response - no processing needed
jq '.'
```

## [Events]

This tool emits events; it doesn't consume them directly. Use workspace triggers to react to events.

| Event Type | Description | Payload |
|------------|-------------|---------|
| custom.* | User-defined event types | User-defined payload |

# Operations

## emit

Emit a custom event to the event bus.

### Inputs
- event_type: Event type identifier, e.g., "order.completed" (required)
- payload: Event data as JSON object (required)
- correlation_id: Optional correlation ID for tracing related events

### Outputs
- event_id: Unique identifier for the emitted event
- timestamp: ISO 8601 timestamp of emission
- success: Boolean indicating successful emission

### Examples
- emit(event_type="order.completed", payload={"order_id": "12345", "total": 99.99})
- emit(event_type="user.signup", payload={"user_id": "u_abc", "plan": "pro"}, correlation_id="session_123")

### Providers

#### runtime

Action: RUNTIME_EMIT_EVENT
Parameters:
  event_type: event_type
  payload: payload
  correlation_id: correlation_id

## queryEvents

Query recent events from the event stream.

### Inputs
- event_type: Filter by event type pattern (optional, supports wildcards)
- since: ISO 8601 timestamp to query from (optional, default: last 1 hour)
- limit: Maximum number of events to return (optional, default: 100)

### Outputs
- events: List of event objects with id, type, payload, timestamp
- count: Number of events returned

### Examples
- query_events(event_type="order.*", limit=10)
- query_events(since="2025-01-01T00:00:00Z")

### Providers

#### runtime

Action: RUNTIME_QUERY_EVENTS
Parameters:
  event_type: event_type
  since: since
  limit: limit


