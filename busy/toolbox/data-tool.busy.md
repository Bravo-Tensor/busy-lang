---
Name: Data Tool
Type: [Tool]
Description: CRUD data access for model instances through pluggable adapters (file, database)
Provider: runtime
---

# [Imports](../core/document.busy.md#imports-section)

[Capability]:../core/tool.busy.md#capability
[Invocation Contract]:../core/tool.busy.md#invocation-contract
[Model]:../core/model.busy.md
[Persistence]:../core/model.busy.md#persistence-section
[Identity]:../core/model.busy.md#identity-section
[Fields]:../core/model.busy.md#fields-section
[Lifecycle]:../core/model.busy.md#lifecycle-section
[Rules]:../core/model.busy.md#rules-section

# Data Tool

> Persistent storage operations for BUSY [Model] instances. Provides create, read, update,
> delete, list, and query through adapter-based backends. The default file adapter stores
> records as JSONL at `data/<model_name>.jsonl`.

## [Capability]

- Create, read, update, and delete [Model] instances
- List and query records with [Fields] filtering
- Pluggable adapter backends (file, database)
- Automatic [Identity] generation and validation
- JSONL file storage with one file per model type

## [Invocation Contract]

**Provider**: Orgata Runtime
**Authentication**: None (workspace-scoped)
**Storage**: Adapter-dependent (file: `data/` directory, db: configured connection)

All operations require a `model_name` to route to the correct storage location.
The adapter is determined by the [Model]'s [Persistence] section (default: file).

# Setup

## File Adapter

The default adapter. Stores all instances of a model in a single JSONL file.

**Path convention**: `data/<model_name>.jsonl`
**Format**: One JSON object per line, each containing an `_id` field
**Directory**: Created automatically on first write

```
workspace/
└── data/
    ├── customer.jsonl      # All Customer records
    ├── order.jsonl          # All Order records
    └── product.jsonl        # All Product records
```

### Record Format

Each line in a JSONL file is a self-contained JSON record:

```json
{"_id": "cust_a1b2c3", "name": "Alice", "email": "alice@example.com", "status": "active", "_created_at": "2025-01-15T10:00:00Z", "_updated_at": "2025-01-15T10:00:00Z"}
{"_id": "cust_d4e5f6", "name": "Bob", "email": "bob@example.com", "status": "inactive", "_created_at": "2025-01-16T09:30:00Z", "_updated_at": "2025-01-20T14:00:00Z"}
```

### Reserved Fields

| Field | Purpose |
|-------|---------|
| `_id` | Unique record identifier (generated if not provided) |
| `_created_at` | ISO 8601 timestamp of creation |
| `_updated_at` | ISO 8601 timestamp of last update |

## Database Adapter

For workspaces requiring indexed queries or relational integrity. Configured via workspace settings.

**Supported**: PostgreSQL, SQLite
**Configuration**: Set in `.workspace` file under `adapters.db`

## Adapter Selection

Models declare their adapter in the Persistence section:

```markdown
## [Persistence]
Adapter: File Adapter
ID format: cust_{uuid}
```

When no adapter is specified, the file adapter is used.

# Operations

## createRecord

Create a new record for a model, appending it to the JSONL file. Validates [Rules] and sets initial [Lifecycle] state if defined on the [Model].

### Inputs
- model_name: Name of the model (required, e.g., "customer")
- fields: Record field values as JSON object (required)
- id: Explicit ID for the record (optional, auto-generated if omitted)

### Outputs
- record: The created record including _id, _created_at, _updated_at
- success: Boolean indicating creation success

### Examples
- createRecord(model_name="customer", fields={"name": "Alice", "email": "alice@example.com"})
- createRecord(model_name="order", fields={"total": 99.50, "status": "pending"}, id="ord_001")

### Providers

#### runtime

Action: DATA_CREATE_RECORD
Parameters:
  model_name: model_name
  fields: fields
  id: id

## readRecord

Read a single record by its ID.

### Inputs
- model_name: Name of the model (required)
- id: Record identifier (required)

### Outputs
- record: The matching record, or null if not found
- exists: Boolean indicating whether the record was found

### Examples
- readRecord(model_name="customer", id="cust_a1b2c3")

### Providers

#### runtime

Action: DATA_READ_RECORD
Parameters:
  model_name: model_name
  id: id

## updateRecord

Update fields on an existing record. Merges provided fields with existing data.

### Inputs
- model_name: Name of the model (required)
- id: Record identifier (required)
- fields: Fields to update as JSON object (required)

### Outputs
- record: The updated record
- success: Boolean indicating update success

### Examples
- updateRecord(model_name="customer", id="cust_a1b2c3", fields={"status": "inactive"})
- updateRecord(model_name="order", id="ord_001", fields={"total": 109.50, "status": "shipped"})

### Providers

#### runtime

Action: DATA_UPDATE_RECORD
Parameters:
  model_name: model_name
  id: id
  fields: fields

## deleteRecord

Remove a record by its ID.

### Inputs
- model_name: Name of the model (required)
- id: Record identifier (required)

### Outputs
- success: Boolean indicating deletion success
- error: Error message if record not found

### Examples
- deleteRecord(model_name="customer", id="cust_a1b2c3")

### Providers

#### runtime

Action: DATA_DELETE_RECORD
Parameters:
  model_name: model_name
  id: id

## listRecords

List records for a model with optional filtering and pagination.

### Inputs
- model_name: Name of the model (required)
- filters: Field-value pairs to match (optional, e.g., {"status": "active"})
- limit: Maximum number of records to return (optional, default: 100)
- offset: Number of records to skip (optional, default: 0)

### Outputs
- records: List of matching records
- count: Number of records returned
- total: Total number of matching records

### Examples
- listRecords(model_name="customer")
- listRecords(model_name="order", filters={"status": "pending"}, limit=10)
- listRecords(model_name="product", limit=20, offset=40)

### Providers

#### runtime

Action: DATA_LIST_RECORDS
Parameters:
  model_name: model_name
  filters: filters
  limit: limit
  offset: offset

## queryRecords

Query records with field matching and sorting.

### Inputs
- model_name: Name of the model (required)
- filters: Field-value pairs or comparison operators (required)
- sort_by: Field name to sort by (optional)
- sort_order: "asc" or "desc" (optional, default: "asc")
- limit: Maximum number of records to return (optional, default: 100)

### Outputs
- records: List of matching records, sorted as specified
- count: Number of records returned

### Examples
- queryRecords(model_name="order", filters={"status": "shipped"}, sort_by="_created_at", sort_order="desc")
- queryRecords(model_name="customer", filters={"status": "active"}, sort_by="name", limit=50)

### Providers

#### runtime

Action: DATA_QUERY_RECORDS
Parameters:
  model_name: model_name
  filters: filters
  sort_by: sort_by
  sort_order: sort_order
  limit: limit
