---
Name: Record Reader
Type: [Tool]
Description: Synthetic provider-backed record lookup used to verify Tool formatting.
---

# [Imports](../../../../../busy/core/document.busy.md#imports-section)

[Tool]: ../../../../../busy/core/tool.busy.md

# [Setup](../../../../../busy/core/document.busy.md#setup-section)

This is a synthetic test contract, not a configured integration. In a test
runtime, the `example` provider binds `records.get` to an in-memory record
lookup. It requires no credentials and returns a not-found error for an absent
identifier. No production calls are authorized by this fixture.

# [Tools]

## fetch_record

Read one synthetic record.

### [Inputs]

- record_id: Stable synthetic record identifier.

### [Outputs]

- record: Matching synthetic record.

### [Providers]

#### example

Action: records.get
Parameters:
  record_id: id
