---
Name: AutomatedWorkflow
Type: [Document]
Description: A document with automated triggers for processing incoming data.
---

# [Imports]

[Document]: ./document.busy.md
[ValidateInput]: ./operations.busy.md#validateinput
[ProcessData]: ./operations.busy.md#processdata

# [Local Definitions]

## InputSource
External data sources that can trigger this workflow.

## ProcessingRule
Rules for how to handle incoming data.

# [Setup]

Before using this workflow:
1. Configure API credentials
2. Set up notification channels
3. Verify processing rules

# [Triggers]

- Set alarm for 6am each morning to run DailyReport
- When data.received from *@trusted.com, run ProcessIncoming
- When webhook.triggered, run HandleWebhook

# [Operations]

## ProcessIncoming

Process incoming data from external sources.

### [Inputs]
- source: The data source identifier
- payload: The incoming data payload

### [Outputs]
- result: Processing result
- log_id: Processing log identifier

### [Steps]
1. Run [ValidateInput] on the payload
2. Apply processing rules from [ProcessingRule]
3. Execute [ProcessData] with validated input
4. Log results and notify stakeholders

### [Checklist]
- Input validated
- Rules applied
- Data processed
- Stakeholders notified

## DailyReport

Generate and send daily activity report.

### [Steps]
1. Gather metrics from past 24 hours
2. Generate summary report
3. Send to configured recipients

### [Checklist]
- Metrics collected
- Report generated
- Report sent

## HandleWebhook

Handle incoming webhook requests.

### [Inputs]
- webhook_data: The webhook payload

### [Steps]
1. Parse webhook payload
2. Determine action based on event type
3. Execute appropriate handler
