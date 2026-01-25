---
Name: Tool
Type: [Document]
Description: A lightweight [Document] that wraps an external capability—CLI, MCP, script, or API—so Busy agents can invoke it consistently.
---
# [Imports](./document.busy.md#imports-section)

[Tool]:./tool.busy.md
[Document]:./document.busy.md
[Operation]:./operation.busy.md
[Checklist]:./checklist.busy.md
[Input]:./operation.busy.md#input
[Output]:./operation.busy.md#output
[Steps]:./operation.busy.md#steps
[Triggers]:./operation.busy.md#trigger
[Input Section]:./operation.busy.md#input-section
[Output Section]:./operation.busy.md#output-section
[Steps Section]:./operation.busy.md#steps-section
[Checklist Section]:./checklist.busy.md#checklist-section
[error]:./operation.busy.md#error

# [Setup](./document.busy.md#setup-section)
A [Tool] is a specialized [Document] that packages how to reach an external capability that is heavily technical (i.e. meant for code) so that other [Document]s and agents can invoke it consistently. Keep the [Capability] and [Invocation Contract] minimal, mechanical, and repeatable. Reference supporting prompts or scripts rather than embedding full logic inline, and cite any files the [Tool] depends on. If the implementation delegates to an MCP, CLI, or script, the [Invocation Contract] must describe exactly how to launch it and what context to pass (for example, the inbox path and triggering filename). When secrets are needed, point to their environment variable names instead of inlining the values.

When documenting events, list all events the tool can generate in an Events section using the standard event format (Input, Output, Providers, Examples). Include complete provider configuration transparency (connection requirements, environment variables, API endpoints). This enables Builder and Architect agents to discover available events and Operations to declare triggers that reference them.

When defining provider mappings, include a Providers subsection under each tool action that maps the abstract BUSY action to provider-specific implementations. Specify the provider action name and parameter mappings to enable the Tool Agent to execute the action via the appropriate provider SDK.

# [Local Definitions](./document.busy.md#local-definitions-section)

## [Capability]
[Capability]:./tool.busy.md#capability
A concise description of the effect the [Tool] provides (e.g., "Move inbox files to Gemini", "Send queued emails via SendGrid").

## [Invocation Contract]
[Invocation Contract]:./tool.busy.md#invocation-contract
The precise instructions for calling the underlying resource. Can point to an MCP endpoint, CLI command, script path, or other automation. Should include any required arguments, environment variables, secrets, and failure handling expectations.

## [State]
[State]:./tool.busy.md#state
Optional instructions for maintaining or resetting any local state the [Tool] depends on (PID files, caches, token stores).

## [Response Processing]
[Response Processing]:./tool.busy.md#response-processing

Response Processing defines CLI commands that transform tool responses before returning them to the calling Operation. This is useful for:
- Stripping large binary data (base64, attachments) to reduce context size
- Extracting specific fields from verbose API responses
- Normalizing data formats across providers

### Processing Definition

Define response processing at the tool level (applies to all actions) or per-action:

```markdown
## [Response Processing]

### Command
jq 'walk(if type == "object" then with_entries(select(.key != "binary_field")) else . end)'

### Description
Removes binary_field from all nested objects to reduce response size.
```

**Fields**:
- **Command**: CLI command that reads JSON from stdin and writes processed JSON to stdout
- **Description**: Human-readable explanation of what the processing does

### Common Patterns

**Strip large base64 fields** (preserves structure, replaces content):
```markdown
### Command
jq 'walk(if type == "object" and .data and (.data | type == "string") and (.data | length > 1000) then .data = "[BASE64_REMOVED: \(.data | length) chars]" else . end)'
```

**Remove attachment binary content** (keeps metadata):
```markdown
### Command
jq 'walk(if type == "object" and has("attachmentList") then .attachmentList |= map(del(.data, .content, .binary) | . + {data: "[ATTACHMENT_DATA_REMOVED]"}) else . end)'
```

**Extract specific fields only**:
```markdown
### Command
jq '{messages: [.messages[] | {id, subject, from, date, snippet}]}'
```

**Combined processing** (chain multiple transformations):
```markdown
### Command
jq 'walk(if type == "object" then (if .data and (.data | type == "string") and (.data | length > 1000) then .data = "[BASE64_REMOVED]" else . end) | (if has("attachmentList") then .attachmentList |= map(del(.data, .content, .binary)) else . end) else . end)'
```

### Per-Action Processing

When different actions need different processing, define it under the action's Providers section:

```markdown
## read_inbox

### Providers

#### composio

Action: GMAIL_FETCH_EMAILS
Parameters:
  max_results: maxResults
  query: q

Response Processing:
  Command: jq 'walk(if type == "object" and .data and (.data | length > 1000) then .data = "[REMOVED]" else . end)'
  Description: Strip base64 body content from email messages
```

### Execution

The Tool Agent executes response processing after receiving the provider response:
1. Provider returns raw response (JSON)
2. Write response to temp file or pipe to stdin
3. Execute the processing command
4. Parse processed output as new response
5. Return processed response to caller

If processing fails, log warning and return original response (fail-open for reliability).

## [Events]
[Events]:./tool.busy.md#events

The Events section documents what events this [Tool] generates. Events are outputs/capabilities that Tools provide - describing what happens and what data is available when something occurs. [Operation]s declare [Triggers] that reference these events and map event data into operation inputs.

Events use a format similar to [Operation]s with [Input], [Output], [Providers], and [Examples] sections. This provides full transparency about event sources, causes, and available data.

### Event Definition Structure

Each event type your tool generates should follow this format:

```markdown
## event_name

Brief description of when this event fires.

### [Input]
What causes this event to fire (provider/source requirements):
- connected_account_id: Connection that triggered the event (required)
- Additional source-specific inputs

### [Output]
Event payload data available to Operations:
- field_name: Description and type of data
- All fields can be used for filtering in Operation triggers

### [Providers]

#### provider_name

Event type: technical_event_type_identifier
Source: Description of event source (webhook, alarm, custom)
Configuration: Any provider-specific configuration requirements

### [Examples]
- Example use case 1
- Example use case 2
```

### Webhook Events

Webhook events fire when external services push real-time notifications. Document webhook events using the standard event format with provider details.

**Example**:
```markdown
## gmail_new_message

Fires when Gmail receives a new email message in the inbox.

### [Input]
- connected_account_id: Composio Gmail connection that received the message (required)

### [Output]
- message_id: Unique identifier for the email message
- thread_id: Thread identifier containing this message
- from: Sender email address
- to: Recipient email address
- subject: Email subject line
- snippet: Brief message preview text
- labels: Array of Gmail labels applied to message
- has_attachment: Boolean indicating presence of attachments
- received_at: Timestamp when message was received

### [Providers]

#### composio

Event type: gmail_new_gmail_message
Source: Composio webhook (real-time push notification from Gmail API)
Configuration: Requires Composio Gmail connection with webhook enabled

### [Examples]
- Process leads from specific email domains (*@company.com)
- Auto-respond to customer inquiries matching subject patterns
- Route urgent emails to priority operations
- Extract attachments from emails with specific labels
```

### Time-Based Events

When scheduled execution is needed or the service doesn't provide webhooks, document events that work with time-based patterns (typically using Alarm Tool).

**Example**:
```markdown
## daily_inbox_poll

Scheduled event for polling inbox for new messages at specific times.

### [Input]
- alarm_id: Unique identifier for the scheduled alarm (required)
- workspace_id: Workspace that owns this alarm schedule (required)

### [Output]
- alarm_id: Identifier of the alarm that fired
- schedule: Cron expression that triggered this event
- fired_at: Timestamp when alarm fired
- event_payload: Custom data included in alarm configuration

### [Providers]

#### event_service

Event type: cron.alarm
Source: Alarm Tool via Event Service (scheduled cron execution)
Configuration: Requires Operation to call schedule_alarm on Alarm Tool

### [Examples]
- Daily email summaries at 6 AM
- Hourly inbox checks when webhooks aren't configured
- Weekly report generation every Monday
- End of day processing for time-sensitive workflows
```

### Provider Configuration Transparency

Tools must fully document ALL configuration requirements for events to work, including:

**Connection Requirements**:
```markdown
### [Input]
- connected_account_id: Composio Gmail connection (configured in workspace .workspace file)
  - Source: workspace.connections[connection_name].connected_account_id
  - Must have Gmail OAuth scopes: gmail.readonly, gmail.send
  - Connection created via Composio CLI or API
```

**Environment Variables**:
```markdown
### [Input]
- COMPOSIO_API_KEY: Composio API authentication (set in environment)
  - Source: Environment variable or .env file
  - Obtain from: Composio dashboard (app.composio.dev)
```

**Event Service Configuration**:
```markdown
### [Providers]

#### event_service

Event type: cron.alarm
Endpoint: POST /cron/register (called by Operation via Alarm Tool)
Redis Stream: Events published to workspace event stream
Configuration: No external configuration required (internal service)
```

### Complete Event Documentation Pattern

When creating a [Tool], document all events with complete provider transparency:

```markdown
## [Events]

## gmail_new_message

Fires when Gmail receives a new email message.

### [Input]
- connected_account_id: Composio Gmail connection
  - Configured in: workspace.connections[connection_name].connected_account_id
  - Required OAuth scopes: gmail.readonly
  - Event authorization: Only workspaces owning this connection receive events

### [Output]
- message_id: Unique Gmail message ID
- thread_id: Gmail thread ID
- from: Sender email address (filterable with wildcards)
- subject: Email subject line (filterable with wildcards)
- labels: Gmail labels array (filterable, exact match)
- snippet: Message preview text
- has_attachment: Boolean (filterable)
- received_at: ISO timestamp

### [Providers]

#### composio

Event type: gmail_new_gmail_message
Source: Composio webhook (real-time Gmail API push)
Webhook setup: Automatically configured by Composio when connection created
Authorization: Event includes connected_account_id for workspace filtering
Configuration:
  - Composio API key: Set in COMPOSIO_API_KEY environment variable
  - Webhook secret: Set in COMPOSIO_WEBHOOK_SECRET (for Event Service verification)
  - Connection: Created via Composio SDK or dashboard

### [Examples]
- Filter by sender: Operations trigger only on emails from *@company.com
- Filter by subject: Match emails with "invoice" in subject line
- Filter by labels: Process emails with specific Gmail labels
- Queue behavior: Events queue during workspace pause (default: true)
```

## [Provider Mapping]
[Provider Mapping]:./tool.busy.md#provider-mapping

Provider mappings translate BUSY tool actions to provider-specific implementations (Composio, direct API, MCP). This allows workspaces to switch providers without changing operation logic.

### Mapping Structure

Each tool action defines providers and how parameters map:

```markdown
### Providers

#### composio

Action: PROVIDER_ACTION_NAME
Parameters:
  busy_param_name: provider_param_name
```

**Fields**:
- **Action**: Provider-specific action identifier (e.g., `GMAIL_SEND_EMAIL`)
- **Parameters**: Maps BUSY parameter names to provider parameter names

### Composio Mappings

Composio actions use uppercase format: `{APP}_{ACTION_NAME}`.

**Example**:
```markdown
## send_email

### Inputs
- to: Recipient email
- subject: Email subject
- body: Message body

### Providers

#### composio

Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  subject: subject
  body: body
```

**Common Actions**: `GMAIL_SEND_EMAIL`, `GMAIL_READ_INBOX`, `SLACK_SEND_MESSAGE`, `CALENDAR_CREATE_EVENT`

### Parameter Mapping

Map BUSY parameter names to provider-specific names when they differ:

**Example**:
```markdown
### Providers

#### composio

Action: GMAIL_GET_MESSAGES
Parameters:
  filter: query          # BUSY "filter" becomes Composio "query"
  limit: max_results     # BUSY "limit" becomes Composio "max_results"
```

### Multi-Provider Support

Tools can support multiple providers:

**Example**:
```markdown
### Providers

#### composio
Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  body: body

#### direct_api
Action: gmail.users.messages.send
Parameters:
  to: to
  body: raw
```

# [Operations](./document.busy.md#operations-section)

## [InvokeTool][Operation]

### [Input][Input Section]
- `tool_document`: The BUSY [Tool] definition to execute.
- `call_context`: Runtime parameters or state needed to satisfy the tool operation's input requirements.

### [Steps][Steps Section]
1. **Evaluate Document:** Use [EvaluateDocument](./document.busy.md#evaluatedocument) to load the [Tool]'s setup and supporting definitions.
2. **Collect Inputs:** Gather required values from the specific tool operation's inputs specification and calling context; when a value is missing, return an [error] that lists the unmet requirement.
3. **Prepare Invocation:** Assemble the command, MCP request, or script execution per the [Invocation Contract], substituting inputs and verifying required environment variables or files exist.
4. **Execute or Simulate:** Run the call exactly as described. When execution cannot occur (e.g., missing permissions), produce a step-by-step plan or command snippet that the caller can run manually.
5. **Process Response:** If [Response Processing] is defined for this action or tool, pipe the raw response through the processing command. On failure, log warning and continue with unprocessed response.
6. **Handle Outputs:** Store results according to the tool operation's outputs specification (e.g., write to outbox, append to logs) and confirm success criteria; raise an [error] when the contract cannot be satisfied.

### [Output][Output Section]
- Execution results or actionable simulation steps plus confirmation that outputs were handled per the tool contract.

### [Checklist][Checklist Section]
- Inputs collected and validated against the tool operation's inputs specification; missing values reported via [error].
- Invocation assembled according to [Invocation Contract] (including env vars and files).
- Execution performed or a runnable plan provided with exact commands/request.
- Response processing applied if defined (or skipped with warning on failure).
- Outputs stored in the declared locations and success criteria confirmed.

## [DescribeCapability][Operation]

### [Input][Input Section]
- `tool_document`: The BUSY [Tool] definition being summarized.

### [Steps][Steps Section]
1. Read the [Capability] and available tool operations with their inputs and outputs.
2. Produce a concise description covering the actions available, required inputs, and primary output locations.
3. Mention the execution mode (script, MCP, CLI, etc.) derived from the [Invocation Contract].

### [Output][Output Section]
- Capability summary other agents can use to decide when to invoke the tool.
