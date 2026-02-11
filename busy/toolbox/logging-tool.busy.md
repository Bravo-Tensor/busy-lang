---
Name: Logging Tool
Type: [Tool]
Description: Record activity logs for audit, debugging, and traceability
Provider: runtime
---

# Logging Tool

> Application-level logging for BUSY operations. Records structured log entries
> for audit trails, debugging, and operational traceability.

## [Capability]

- Log messages at different severity levels
- Attach structured context to log entries
- Query recent log entries
- Create audit trails for operations

## [Invocation Contract]

**Provider**: Orgata Runtime
**Authentication**: None (workspace-scoped)
**Storage**: Workspace logs (queryable via API)

Logs are separate from LangSmith tracing - this is application-level logging
that the operation itself controls.

## [Response Processing]

```bash
# No processing needed for log operations
jq '.'
```

# Setup

## Log Levels

| Level | Use For | Examples |
|-------|---------|----------|
| **debug** | Detailed diagnostic info | API responses, internal state |
| **info** | Normal operation events | "Started processing", "Completed successfully" |
| **warning** | Potential issues | Rate limits, retries, deprecated usage |
| **error** | Failures requiring attention | Exceptions, API errors, validation failures |

## Structured Context Best Practices

Include relevant context for debugging:

```yaml
# Good - includes actionable context
context:
  order_id: "12345"
  customer_id: "c_abc"
  error_code: "PAYMENT_DECLINED"
  retry_count: 2

# Bad - too vague
context:
  status: "failed"
```

## Integration with Audit Trails

For compliance/audit logging, use structured context:

```yaml
log(
  level: "info",
  message: "Sensitive data accessed",
  context: {
    resource_type: "customer_record",
    resource_id: "c_123",
    action: "read",
    actor: "agent_operations",
    audit_type: "pii-access"
  }
)
```

# Operations

## log

Record a log entry.

### Inputs
- level: Log level - "debug", "info", "warning", "error" (required)
- message: Log message (required)
- context: Additional structured context as JSON (optional)
- operation: Operation name for grouping (optional, auto-detected if not provided)

### Outputs
- log_id: Unique identifier for the log entry
- timestamp: ISO 8601 timestamp
- success: Boolean indicating successful logging

### Examples
- log(level="info", message="Order processing started", context={"order_id": "12345"})
- log(level="error", message="Payment failed", context={"error_code": "DECLINED"})
- log(level="debug", message="API response received", context={"status": 200, "duration_ms": 150})

### Providers

#### runtime

Action: RUNTIME_LOG
Parameters:
  level: level
  message: message
  context: context
  operation: operation

## logInfo

Convenience method for info-level logging.

### Inputs
- message: Log message (required)
- context: Additional structured context (optional)

### Outputs
- log_id: Unique identifier for the log entry
- success: Boolean

### Examples
- log_info(message="User authenticated successfully", context={"user_id": "u_123"})

### Providers

#### runtime

Action: RUNTIME_LOG
Parameters:
  level: "info"
  message: message
  context: context

## logWarning

Convenience method for warning-level logging.

### Inputs
- message: Log message (required)
- context: Additional structured context (optional)

### Outputs
- log_id: Unique identifier for the log entry
- success: Boolean

### Examples
- log_warning(message="Rate limit approaching", context={"current": 95, "limit": 100})

### Providers

#### runtime

Action: RUNTIME_LOG
Parameters:
  level: "warning"
  message: message
  context: context

## logError

Convenience method for error-level logging.

### Inputs
- message: Log message (required)
- context: Additional structured context (optional)
- error_type: Error classification (optional)

### Outputs
- log_id: Unique identifier for the log entry
- success: Boolean

### Examples
- log_error(message="Failed to send email", context={"recipient": "user@example.com", "error": "SMTP timeout"})
- log_error(message="Database connection failed", error_type="ConnectionError")

### Providers

#### runtime

Action: RUNTIME_LOG
Parameters:
  level: "error"
  message: message
  context: context
  error_type: error_type

## queryLogs

Query recent log entries.

### Inputs
- level: Filter by minimum level (optional, default: "info")
- operation: Filter by operation name (optional)
- since: ISO 8601 timestamp to query from (optional, default: last 24 hours)
- limit: Maximum entries to return (optional, default: 100)

### Outputs
- logs: List of log entries with id, level, message, context, timestamp
- count: Number of entries returned

### Examples
- query_logs(level="error", limit=10)
- query_logs(operation="ProcessOrder", since="2025-01-01T00:00:00Z")

### Providers

#### runtime

Action: RUNTIME_QUERY_LOGS
Parameters:
  level: level
  operation: operation
  since: since
  limit: limit

---