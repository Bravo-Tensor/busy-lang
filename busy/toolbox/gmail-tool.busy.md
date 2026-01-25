---
Name: GmailTool
Type: [Tool]
Description: Provides Gmail email operations via Composio integration for sending, reading, and managing email messages
---

# [Imports](../core/document.busy.md#imports-section)
[Operation]:../core/operation.busy.md
[Capability]:../core/tool.busy.md#capability
[Invocation Contract]:../core/tool.busy.md#invocation-contract
[State]:../core/tool.busy.md#state
[Response Processing]:../core/tool.busy.md#response-processing
[Events]:../core/tool.busy.md#events
[Input]:../core/operation.busy.md#input-section
[Output]:../core/operation.busy.md#output-section
[Inputs]:../core/operation.busy.md#input-section
[Outputs]:../core/operation.busy.md#output-section
[Providers]:../core/tool.busy.md#provider-mapping
[Examples]:../core/tool.busy.md#events

# [Setup](../core/document.busy.md#setup-section)

The Gmail Tool provides a standardized interface for Gmail operations through the Composio integration. Operations can send emails, read inbox messages, search for specific emails, retrieve conversation threads, and manage message read status.

**Key Design Patterns:**

1. **Webhook Events for Real-Time Processing**: Use `gmail_new_message` and `gmail_email_labeled` webhook events when immediate response to email events is required.

2. **Alarm-Based Polling for Scheduled Workflows**: Use Alarm Tool to schedule periodic inbox checks when webhooks aren't configured or for time-based workflows like daily summaries.

3. **Connection Configuration**: Gmail Tool requires a Composio connection with Gmail OAuth credentials configured in the workspace tools configuration.

# [Capability]

The Gmail Tool provides email operations through the Composio Gmail integration. It enables Operations to send emails, read inbox messages, search email threads, retrieve specific threads, and mark messages as read. The tool supports both webhook-based real-time events (new messages, label changes) and alarm-based polling patterns for scheduled inbox checks.

# [Invocation Contract]

All Gmail Tool actions are executed through the Composio SDK integration. The Tool Agent handles provider mapping, connection management, and API execution. Gmail actions require a valid Composio connection with Gmail OAuth credentials configured in the workspace.

**Backend Integration:**
- Provider: Composio SDK (Gmail app integration)
- Authentication: OAuth 2.0 via Composio connected account
- Connection configuration: workspace tools configuration with connection reference
- All actions map to Composio GMAIL_* action identifiers

# [Response Processing]

Gmail API responses contain large binary data that must be stripped to avoid context overflow.

## Command
```bash
jq 'walk(
  if type == "object" then
    # Strip large base64 data fields (body.data in message parts)
    (if .data and (.data | type == "string") and (.data | length > 1000)
     then .data = "[BASE64_REMOVED: \(.data | length) chars]"
     else . end)
    # Strip attachment binary content but preserve metadata
    | (if has("attachmentList")
       then .attachmentList |= map(del(.data, .content, .binary) | . + if has("data") then {data: "[ATTACHMENT_DATA_REMOVED]"} else {} end)
       else . end)
  else . end
)'
```

## Description
Recursively processes Gmail API responses to:
- Replace base64 `data` fields longer than 1000 chars with size placeholder
- Remove binary content from attachments (data, content, binary fields)
- Preserve all metadata (subject, from, to, date, labels, mimeType, filename, size, attachmentId)

# [State]

Gmail Tool maintains two types of state:

**Gmail Action State (External):**
- Message state (read/unread, labels) stored in Gmail account
- OAuth tokens managed by Composio connected account
- No local state or caching required
- Each action is independent and idempotent where possible

**Trigger Configuration State (.workspace file):**
- Event-to-operation mappings with filters and queue_when_paused settings
- Defined in workspace `.workspace` file triggers array
- Determines which operations execute when Gmail webhook events fire
- Managed by workspace configuration (not by Gmail Tool)

# [Events]

The Gmail Tool generates webhook-based events from Composio's Gmail integration.

## gmail_new_message

Fires when Gmail receives a new email message in the inbox.

### [Input]
- `connected_account_id`: Composio Gmail connection that received the message (required)
  - Configured in: `workspace.connections[connection_name].connected_account_id`
  - Required OAuth scopes: gmail.readonly
  - Event authorization: Only workspaces owning this connection receive events

### [Output]
- `message_id`: Unique Gmail message identifier
- `thread_id`: Gmail thread identifier containing this message
- `from`: Sender email address (filterable with wildcards)
- `to`: Recipient email address (filterable with wildcards)
- `subject`: Email subject line (filterable with wildcards)
- `snippet`: Brief message preview text
- `labels`: Array of Gmail labels applied to message (filterable, exact match)
- `has_attachment`: Boolean indicating presence of attachments (filterable)
- `received_at`: ISO timestamp when message was received

### [Providers]

#### composio

Event type: gmail_new_gmail_message
Source: Composio webhook (real-time Gmail API push notification)
Webhook setup: Automatically configured by Composio when Gmail connection created
Authorization: Event includes connected_account_id for workspace filtering
Configuration:
  - COMPOSIO_API_KEY: Set in environment variable (obtain from app.composio.dev)
  - COMPOSIO_WEBHOOK_SECRET: Set in environment variable (for Event Service verification)
  - Connection: Created via Composio SDK or dashboard with gmail.readonly scope

### [Examples]
- Process leads from specific email domains (*@company.com filter on from field)
- Auto-respond to customer inquiries (filter by subject pattern)
- Route urgent emails to priority operations (filter by labels)
- Extract attachments from specific senders (filter by from + has_attachment)

## gmail_email_labeled

Fires when a Gmail label is added to or removed from a message.

### [Input]
- `connected_account_id`: Composio Gmail connection that owns the labeled message (required)
  - Configured in: `workspace.connections[connection_name].connected_account_id`
  - Required OAuth scopes: gmail.readonly
  - Event authorization: Only workspaces owning this connection receive events

### [Output]
- `message_id`: Gmail message identifier that was labeled
- `thread_id`: Gmail thread identifier
- `label_added`: Name of label added to message (filterable, exact match)
- `label_removed`: Name of label removed from message (filterable, exact match)
- `labels`: Complete array of current labels after change
- `modified_at`: ISO timestamp when label change occurred

### [Providers]

#### composio

Event type: gmail_email_labeled
Source: Composio webhook (real-time Gmail API push notification)
Webhook setup: Automatically configured by Composio when Gmail connection created
Authorization: Event includes connected_account_id for workspace filtering
Configuration:
  - COMPOSIO_API_KEY: Set in environment variable (obtain from app.composio.dev)
  - COMPOSIO_WEBHOOK_SECRET: Set in environment variable (for Event Service verification)
  - Connection: Created via Composio SDK or dashboard with gmail.readonly scope

### [Examples]
- Process messages when manually labeled by user (filter by label_added)
- Trigger workflows when specific labels applied (filter by label_added = "urgent")
- Coordinate manual email triage with automated processing
- Archive messages when "processed" label added

# [Operations](../core/document.busy.md#operations-section)

## [SendEmail][Operation]

Send an email message through Gmail with recipient, subject, and body content.

### [Inputs]
- `to`: Recipient email address
- `subject`: Email subject line
- `body`: Email message body
- `cc`: Carbon copy recipients (optional)
- `bcc`: Blind carbon copy recipients (optional)

### [Outputs]
- `message_id`: ID of the sent message
- `thread_id`: Thread ID containing the message
- `success`: Boolean indicating send success

### [Providers]

#### composio

Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  subject: subject
  body: body
  cc: cc
  bcc: bcc

### [Examples]
- Send notification: send_email(to='user@example.com', subject='Daily Summary', body='Your summary...')
- Send with CC: send_email(to='client@company.com', subject='Update', body='Report...', cc='team@company.com')

## [ReadInbox][Operation]

Retrieve messages from Gmail inbox with optional filtering by query or labels.

### [Inputs]
- `max_results`: Maximum number of messages to retrieve (default: 10)
- `label_ids`: Filter by Gmail label IDs (optional)
- `query`: Gmail search query string (optional)
- `page_token`: Pagination token from previous response to fetch next page (optional)

### [Outputs]
- `messages`: List of inbox message objects with id, subject, from, date, snippet
- `result_size_estimate`: Total number of messages matching criteria
- `next_page_token`: Token to fetch next page of results (if more available)

### [Providers]

#### composio

Action: GMAIL_FETCH_EMAILS
Parameters:
  max_results: maxResults
  label_ids: labelIds
  query: q
  page_token: pageToken

Note: Response includes pagination data with `nextPageToken` and `resultSizeEstimate`. Use `page_token` to fetch additional pages.

### [Examples]
- Read recent inbox: read_inbox(max_results=20)
- Read unread messages: read_inbox(query='is:unread', max_results=50)
- Fetch next page: read_inbox(query='newer_than:1d', max_results=20, page_token='TOKEN_FROM_PREVIOUS_RESPONSE')

## [SearchEmails][Operation]

Search emails using Gmail search query syntax for complex filtering.

### [Inputs]
- `query`: Gmail search query string (required)
- `max_results`: Maximum number of results (default: 10)

### [Outputs]
- `messages`: List of message objects matching search query
- `result_size_estimate`: Total number of messages found

### [Providers]

#### composio

Action: GMAIL_SEARCH_EMAILS
Parameters:
  query: q
  max_results: maxResults

### [Examples]
- Search by sender: search_emails(query='from:boss@company.com', max_results=10)
- Search with date: search_emails(query='subject:invoice after:2025/12/01')
- Search attachments: search_emails(query='has:attachment from:client@company.com')

## [GetThread][Operation]

Retrieve a complete email thread by thread ID with all messages in the conversation.

### [Inputs]
- `thread_id`: Gmail thread identifier (required)

### [Outputs]
- `thread`: Thread object with all messages in the conversation
- `messages`: List of messages in the thread

### [Providers]

#### composio

Action: GMAIL_GET_THREAD
Parameters:
  thread_id: id

### [Examples]
- Get thread details: get_thread(thread_id='thread-xyz789')

## [MarkAsRead][Operation]

Mark a Gmail message as read by removing the UNREAD label.

### [Inputs]
- `message_id`: Gmail message identifier (required)

### [Outputs]
- `success`: Boolean indicating operation success
- `message_id`: ID of the message marked as read

### [Providers]

#### composio

Action: GMAIL_MARK_AS_READ
Parameters:
  message_id: id

### [Examples]
- Mark message read: mark_as_read(message_id='msg-abc123')
