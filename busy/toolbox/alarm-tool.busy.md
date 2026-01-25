---
Name: AlarmTool
Type: [Tool]
Description: Provides time-based event generation via Event Service for scheduled workflows and polling patterns
---

# [Imports](../core/document.busy.md#imports-section)

[Operation]:../core/operation.busy.md
[Capability]:../core/tool.busy.md#capability
[Invocation Contract]:../core/tool.busy.md#invocation-contract
[State]:../core/tool.busy.md#state
[Events]:../core/tool.busy.md#events
[Input]:../core/operation.busy.md#input-section
[Output]:../core/operation.busy.md#output-section
[Inputs]:../core/operation.busy.md#input-section
[Outputs]:../core/operation.busy.md#output-section
[Providers]:../core/tool.busy.md#provider-mapping
[Examples]:../core/tool.busy.md#events

# [Setup](../core/document.busy.md#setup-section)

The Alarm Tool provides a standardized interface for time-based event generation through the Event Service. When Operations need scheduled execution or periodic polling, they use the Alarm Tool to register cron schedules. The Event Service handles the backend cron scheduling using APScheduler and fires `alarm_triggered` events to Redis Streams at the configured times.

**Key Design Patterns:**

1. **Alarm Registration**: Operations call `schedule_alarm` to register a cron schedule with a unique alarm_id. The alarm configuration persists in Redis and survives Event Service restarts.

2. **Event Generation**: At scheduled times, the Event Service fires `cron.alarm` events with the alarm_id and any custom event_payload provided during registration.

3. **Trigger Matching**: Workspaces configure triggers that match `cron.alarm` events, typically filtering by alarm_id to distinguish between different scheduled workflows.

4. **Polling Pattern**: When the alarm event fires and matches a trigger, the configured Operation executes. This Operation typically polls an external tool (like Gmail read_inbox) to retrieve data and perform business logic.

**When to Use Alarm Tool:**

Use the Alarm Tool for time-based workflows when:
- External services don't provide webhook triggers
- Scheduled periodic execution is needed (daily at 6 AM, weekly on Monday)
- Polling is required to check for new data
- Time-based business logic is required (end of day processing, nightly reports)

**When NOT to Use Alarm Tool:**

Use native webhook triggers instead when:
- External service provides real-time push notifications (Gmail new message webhook)
- Immediate event response is critical
- Service supports webhook configuration through Composio
- Event-driven architecture is preferred over polling

**Example Cron Expressions:**

- `0 6 * * *` - Daily at 6:00 AM
- `0 */4 * * *` - Every 4 hours
- `0 9 * * 1` - Every Monday at 9:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First day of every month at midnight

# [Capability]

The Alarm Tool provides time-based event generation for scheduled workflows and polling patterns. It enables Operations to run on specific schedules by registering cron expressions with the Event Service, which fires `alarm_triggered` events at the scheduled times. This tool is essential for implementing periodic workflows when native webhook triggers are not available from external services.

# [Invocation Contract]

All Alarm Tool actions are executed through the Event Service backend. The Event Service maintains cron schedules using APScheduler and fires events to Redis Streams when alarms trigger. Operations can then poll other tools when these alarm events fire, implementing a standard polling pattern for time-based workflows.

**Backend Integration:**
- Event Service API: `/cron/register`, `/cron/unregister`, Redis event stream
- No external provider required (internal event service)
- Alarms persist in Redis and survive Event Service restarts
- Cron schedules use standard cron expression format

# [State]

Alarm Tool maintains two types of state:

**Alarm Schedule State (Redis):**
- Alarm configurations stored in `cron:alarms:{alarm_id}` Redis keys
- APScheduler job registry maintains active scheduled jobs
- Alarms automatically reload from Redis on Event Service restart
- Managed by Event Service backend

**Trigger Configuration State (.workspace file):**
- Event-to-operation mappings with filters and queue_when_paused settings
- Defined in workspace `.workspace` file triggers array
- Determines which operations execute when `cron.alarm` events fire
- Managed by workspace configuration (not by Alarm Tool)

# [Events]

The Alarm Tool generates time-based events through the Event Service's cron scheduler.

## cron.alarm

Fires when a scheduled alarm reaches its configured time according to the cron expression.

### [Input]
- `alarm_id`: Unique identifier for the alarm (registered via schedule_alarm operation)
- `workspace_id`: Workspace that owns this alarm schedule
- `schedule`: Cron expression that determines when alarm fires
  - Configured via: schedule_alarm operation call
  - Stored in: Redis (key: cron:alarms:{alarm_id})
  - Managed by: Event Service APScheduler backend

### [Output]
- `event_type`: Always "cron.alarm" for alarm events
- `alarm_id`: Unique identifier of the alarm that triggered (filterable, exact match)
- `workspace_id`: Workspace ID that owns the alarm (filterable, exact match)
- `schedule`: Cron expression that triggered this event
- `fired_at`: ISO timestamp when alarm fired
- `event_payload`: Custom data included during alarm registration (filterable fields)
  - Operations can include arbitrary JSON data in event_payload
  - All fields in event_payload are available for filtering
  - Common fields: schedule_name, workflow_type, custom metadata

### [Providers]

#### event_service

Event type: cron.alarm
Source: Internal Event Service (APScheduler + Redis)
Backend: APScheduler manages cron schedules, fires events to Redis Streams
Configuration:
  - No external API keys required (internal service)
  - REDIS_URI: Event Service connects to Redis for alarm persistence
  - Alarms persist across Event Service restarts (loaded from Redis)
  - Schedule registration: via schedule_alarm operation (POST /cron/register)
  - Event publishing: Redis Streams (workspace event stream)

### [Examples]
- Daily inbox polling: Filter by alarm_id = "daily-inbox-check", Operation polls Gmail read_inbox
- Hourly sync: Filter by alarm_id = "hourly-data-sync", Operation calls external API
- Weekly reports: Filter by alarm_id = "weekly-report", schedule = "0 9 * * 1" (Monday 9 AM)
- Multiple alarms: Use event_payload.workflow_type field to distinguish different workflows
- Polling pattern: Alarm fires → Operation triggered → Operation polls external tool for data

**When to use cron.alarm events:**
- External service doesn't provide webhook triggers
- Scheduled periodic execution needed (daily, weekly, hourly)
- Polling required to check for new data
- Time-based business logic (end of day processing, nightly reports)

# [Operations](../core/document.busy.md#operations-section)

## [ScheduleAlarm][Operation]

Register a cron schedule with the Event Service to generate time-based events.

### [Inputs]
- `alarm_id`: Unique identifier for the alarm (required)
- `workspace_id`: Workspace ID for alarm scoping (required)
- `schedule`: Cron expression defining when alarm fires (required)
- `event_payload`: Additional metadata included in alarm event (optional)

### [Outputs]
- `alarm_id`: Unique identifier of the registered alarm
- `workspace_id`: Workspace ID owning the alarm
- `schedule`: Cron expression for the alarm
- `success`: Boolean indicating registration success

### [Providers]

#### event_service

Endpoint: POST /cron/register
Parameters:
  alarm_id: alarm_id
  workspace_id: workspace_id
  schedule: schedule
  event_payload: event_payload

### [Examples]
- Daily check: schedule_alarm(alarm_id='daily-inbox', workspace_id='ws-123', schedule='0 6 * * *')
- Hourly sync: schedule_alarm(alarm_id='sync-data', workspace_id='ws-123', schedule='0 * * * *')

## [CancelAlarm][Operation]

Remove a scheduled alarm by alarm_id.

### [Inputs]
- `alarm_id`: Unique identifier of alarm to cancel (required)

### [Outputs]
- `alarm_id`: ID of the cancelled alarm
- `success`: Boolean indicating cancellation success

### [Providers]

#### event_service

Endpoint: DELETE /cron/unregister/{alarm_id}
Parameters:
  alarm_id: alarm_id

### [Examples]
- Cancel alarm: cancel_alarm(alarm_id='daily-inbox')

## [ListAlarms][Operation]

List all scheduled alarms for a workspace.

### [Inputs]
- `workspace_id`: Workspace ID to filter alarms (required)

### [Outputs]
- `alarms`: Array of alarm configurations
- `count`: Number of active alarms for workspace

### [Providers]

#### event_service

Endpoint: GET /cron/alarms
Parameters:
  workspace_id: workspace_id

### [Examples]
- List workspace alarms: list_alarms(workspace_id='ws-123')
