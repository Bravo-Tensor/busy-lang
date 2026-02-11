---
Name: Messaging Tool
Type: [Tool]
Description: Send and receive messages to users across different channels
Provider: runtime
---

# [Imports](../core/document.busy.md#imports-section)

[Capability]:../core/tool.busy.md#capability
[Invocation Contract]:../core/tool.busy.md#invocation-contract
[Response Processing]:../core/tool.busy.md#response-processing

# Messaging Tool

> User communication through Maui, Orgata's messaging hub. Messages are automatically
> routed to the user's configured channel (Telegram, API, etc.) with appropriate formatting.

## [Capability]

- Send messages to users
- Ask questions and wait for responses (HITL)
- Remember conversation context
- Adapt formatting to channel

## [Invocation Contract]

**Provider**: Orgata Runtime (Maui Agent)
**Authentication**: None (user context from thread)
**Channels**: Telegram, REST API (extensible)

Messages are sent through the user's active channel. The system automatically
handles channel-specific formatting.

## [Response Processing]

```bash
# No processing needed - responses are text
jq '.'
```

# Setup
## Channel Formatting

Messages are automatically formatted for the target channel:

| Channel | Formatting |
|---------|------------|
| Telegram | Markdown, inline buttons for options |
| REST API | JSON with structured metadata |
| (Future) Email | HTML email template |
| (Future) Slack | Slack Block Kit |

## HITL (Human-in-the-Loop) Behavior

When `ask_user` or `confirm` is called:

1. Operation execution pauses
2. Message is sent to user
3. State is checkpointed (MemorySaver)
4. On user response, execution resumes
5. If timeout, default value is used (or error if no default)

## Memory Integration

Conversation context is maintained across messages:
- Previous messages in thread are available
- Working memory persists relevant facts
- Semantic memory cards can be referenced

## Example: Multi-Step Confirmation

```yaml
Steps:
  - Ask user to confirm deletion
  - If confirmed:
    - Perform deletion
    - Notify success
  - If not confirmed:
    - Notify cancellation
```

Translates to:

```
confirm(message="Delete 15 items?")
  → If confirmed: [delete items]
  → send_message("15 items deleted successfully")
  → Else: send_message("Deletion cancelled")
```

# Operations

## sendMessage

Send a message to the user.

### Inputs
- content: Message content (required, supports markdown)
- priority: Message priority - "normal" or "high" (optional, default: "normal")
- silent: Send without notification sound (optional, default: false)

### Outputs
- message_id: Unique identifier for the sent message
- channel: Channel message was sent to
- success: Boolean indicating successful delivery

### Examples
- send_message(content="Your report is ready!")
- send_message(content="**Alert**: Processing complete with warnings.", priority="high")
- send_message(content="Background task finished.", silent=true)

### Providers

#### runtime

Action: MAUI_SEND_MESSAGE
Parameters:
  content: content
  priority: priority
  silent: silent

## askUser

Ask the user a question and wait for their response (Human-in-the-Loop).

### Inputs
- question: The question to ask (required)
- options: List of suggested response options (optional)
- timeout_minutes: How long to wait for response (optional, default: 60)
- default: Default response if timeout (optional)

### Outputs
- response: User's response text
- selected_option: Index of selected option if options provided
- timed_out: Boolean indicating if response timed out

### Examples
- ask_user(question="Should I proceed with the changes?", options=["Yes", "No", "Review first"])
- ask_user(question="What email should I use?")
- ask_user(question="Continue processing?", timeout_minutes=5, default="yes")

### Providers

#### runtime

Action: MAUI_ASK_USER
Parameters:
  question: question
  options: options
  timeout_minutes: timeout_minutes
  default: default

## confirm

Ask for yes/no confirmation from the user.

### Inputs
- message: Confirmation message (required)
- default: Default if timeout - true or false (optional, default: false)
- timeout_minutes: How long to wait (optional, default: 30)

### Outputs
- confirmed: Boolean - true if user confirmed
- timed_out: Boolean indicating if response timed out

### Examples
- confirm(message="Delete all draft emails?")
- confirm(message="Send email to 50 recipients?", default=false)

### Providers

#### runtime

Action: MAUI_CONFIRM
Parameters:
  message: message
  default: default
  timeout_minutes: timeout_minutes

## notify

Send a notification-style message (no response expected).

### Inputs
- title: Notification title (required)
- body: Notification body (optional)
- type: Notification type - "info", "success", "warning", "error" (optional, default: "info")

### Outputs
- success: Boolean indicating successful delivery

### Examples
- notify(title="Task Complete", body="All items processed successfully", type="success")
- notify(title="Warning", body="API rate limit at 80%", type="warning")

### Providers

#### runtime

Action: MAUI_NOTIFY
Parameters:
  title: title
  body: body
  type: type

---
