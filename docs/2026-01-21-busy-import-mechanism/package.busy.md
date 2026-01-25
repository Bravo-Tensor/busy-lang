---
Name: package
Type: Document
Description: Package registry for this workspace
---

# Definitions

## Package Entry

A cached external BUSY document.

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL to source file (with optional #anchor) |
| Provider | Yes | github, gitlab, url |
| Cached | Yes | Local path in .libraries/ |
| Version | Yes | Semantic version or tag |
| Fetched | Yes | ISO 8601 timestamp |
| Integrity | No | sha256:{hash} |

## External Reference

A non-cached link (context only).

| Field | Required | Description |
|-------|----------|-------------|
| URL | Yes | External URL |
| Type | Yes | Always "external" |

---

# Package Registry

## Packages

### busy-v2

Library from Bravo-Tensor/busy-lang/busy-v2

| Field | Value |
|-------|-------|
| Source | https://github.com/Bravo-Tensor/busy-lang/tree/v0.3.1/busy-v2 |
| Provider | github |
| Cached | .libraries/busy-v2 |
| Version | v0.3.1 |
| Fetched | 2026-01-21T17:09:29.054734 |
| Integrity | sha256:b9cb77c0c7f9fa075ecfe6dbd310d7fdb3677f1adaf697f7349a3494704a17a3 |

[Source][busy_v2_src] | [Local][busy_v2_local]

[busy_v2_src]: https://github.com/Bravo-Tensor/busy-lang/tree/v0.3.1/busy-v2
[busy_v2_local]: .libraries/busy-v2

---
