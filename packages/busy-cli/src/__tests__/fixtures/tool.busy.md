---
Name: GmailTools
Type: [Tool]
Description: Gmail integration tools for email management.
Provider: composio
---

# [Imports]

[Tool]: ../core/tool.busy.md

# [Tools]

## send_email

Send an email to one or more recipients.

### [Inputs]
- to: Recipient email address
- subject: Email subject line
- body: Email body content

### [Outputs]
- message_id: The sent message ID
- thread_id: The thread ID

### [Providers]

#### composio
Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  subject: subject
  body: body

## list_emails

List emails from the inbox.

### [Inputs]
- limit: Maximum number of emails to return
- query: Search query string

### [Outputs]
- emails: List of email objects
- next_page_token: Token for pagination

### [Providers]

#### composio
Action: GMAIL_LIST_EMAILS
Parameters:
  max_results: limit
  q: query
