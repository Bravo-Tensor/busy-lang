---
Name: GmailTool
Type: [Tool]
Description: Tool for sending and receiving emails via Gmail API.
Provider: composio
---
# [Imports]

[Tool]: ./tool.busy.md
[Operation]: ./operation.busy.md

# [Local Definitions]

## Capability
Send and receive emails through the Gmail API with support for attachments and HTML content.

## Invocation Contract
Uses Composio's GMAIL integration with OAuth2 authentication.

# [Setup]

Ensure GMAIL_OAUTH_TOKEN environment variable is set.

# [Tools]

## send_email

Send an email to one or more recipients.

### [Inputs]
- to: Recipient email address or comma-separated list
- subject: Email subject line
- body: Email body content (plain text or HTML)
- attachments: Optional list of file paths to attach

### [Outputs]
- message_id: The ID of the sent message
- thread_id: The thread ID for conversation tracking

### [Examples]
- send_email(to="user@example.com", subject="Hello", body="Test message")
- send_email(to="a@x.com,b@x.com", subject="Team Update", body="<h1>News</h1>")

#### composio
Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  subject: subject
  body: body

## read_inbox

Read messages from the inbox.

### [Inputs]
- max_results: Maximum number of messages to return
- query: Optional Gmail search query

### [Outputs]
- messages: List of message objects with id, subject, from, snippet

#### composio
Action: GMAIL_LIST_MESSAGES
Parameters:
  maxResults: max_results
  q: query

# [Triggers]

- When gmail.message.received from *@important.com, run ProcessImportantEmail
- Set alarm for 9am each morning to run InboxSummary
