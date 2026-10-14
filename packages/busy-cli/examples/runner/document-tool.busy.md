---
Name: Document Tool
Type: [Tool]
Description: Caller-owned access to the document under review.
Provider: caller
---

# Capability

Read or update the document inside the caller-authorized workspace. In this POC, modify only the supplied in-memory document value. No disk file is changed by this contract.

# Operations

## writeDocument

### Inputs

- document: Path and proposed contents.

### Outputs

- document: The resulting contents.
- receipt: What changed and the evidence for that claim.

### Providers

#### caller

Action: writeDocument
Parameters:
  document: document
