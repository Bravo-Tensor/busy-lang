# BUSY Import Mechanism - Requirements

> **Note:** This is a standalone BUSY language tooling project. No dependencies on Orgata runtime.

---

## Problem Statement

BUSY documents need a way to reference other BUSY documents and external content:
- Core library concepts and tools
- Third-party packages
- External references (Wikipedia, documentation, etc.)
- Cross-workspace content

Currently, there is no standardized import mechanism. Documents cannot reliably reference shared content, leading to duplication and inconsistency.

---

## Goals

1. **URL-Based Linking** - All imports resolve to real URLs for markdown compatibility
2. **Package Registry** - `package.busy.md` as a BUSY-native registry format
3. **Local Caching** - Downloaded packages cached in `.libraries/`
4. **CLI Tooling** - `busy package` commands for package management
5. **Validation** - `busy check` verifies all links resolve
6. **Standalone** - No runtime dependencies, works with any BUSY-compatible runtime

---

## Non-Goals

- Runtime execution (that's for Orgata or other runtimes)
- Compilation to other formats
- Package hosting/registry infrastructure (uses URLs)
- Authentication for private packages (future consideration)

---

## User Stories

### US-1: Add a Package

As a BUSY author, I want to add an external package to my workspace so I can use its operations and concepts.

**Acceptance Criteria:**
- `busy package add <url>` downloads package to `.libraries/`
- Creates/updates `package.busy.md` with package entry
- Package is immediately available for import

### US-2: Import from Package

As a BUSY author, I want to import a concept from my package registry so I can reference it in my operation.

**Acceptance Criteria:**
- Import syntax: `./package.busy.md#package-name`
- Links work in both frontmatter `Imports:` and markdown body
- `busy check` verifies import resolves

### US-3: Upgrade a Package

As a BUSY author, I want to upgrade a package to its latest version so I get the latest features.

**Acceptance Criteria:**
- `busy package upgrade <name>` fetches latest version
- Updates `package.busy.md` with new version info
- Updates cached files in `.libraries/`
- Warns if there are breaking changes (major version bump)

### US-4: Validate Workspace

As a BUSY author, I want to validate my workspace so I know all imports and links resolve correctly.

**Acceptance Criteria:**
- `busy check` scans all `.busy.md` files
- Reports broken imports and links
- Verifies cached package integrity
- Exits with error code if issues found

### US-5: Reference External Content

As a BUSY author, I want to reference non-BUSY content (like Wikipedia) in my package registry so I can link to background context.

**Acceptance Criteria:**
- External references supported in `package.busy.md`
- Marked as `Type: external` (not cached)
- Links work but validation notes they're external

---

## E2E Scenario Requirements

### Scenario 1: New Workspace Setup

**Preconditions:**
- Empty workspace directory

**Steps:**
1. Run `busy init`
2. Run `busy package add https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt`
3. Create operation with link: `[execute prompt](./package.busy.md#executeprompt)`

**Expected Result:**
- `package.busy.md` created with self-defining structure
- `.libraries/core/prompt.md` cached
- Link `./package.busy.md#executeprompt` resolves to cached file
- `busy check` passes

### Scenario 2: Package Update Flow

**Preconditions:**
- Workspace with core library v1.0.0 installed

**Steps:**
1. Run `busy package upgrade core`
2. Verify package.busy.md updated
3. Verify .libraries/core/ updated
4. Run `busy check`

**Expected Result:**
- Version updated to latest
- Cached files updated
- Integrity hash updated
- All existing imports still resolve

### Scenario 3: Broken Import Detection

**Preconditions:**
- Workspace with valid imports

**Steps:**
1. Manually edit operation to reference non-existent import
2. Run `busy check`

**Expected Result:**
- Error reported for broken import
- Exit code non-zero
- Clear error message with file and line

### Scenario 4: Direct External Link (No Caching)

**Preconditions:**
- Workspace with package.busy.md

**Steps:**
1. Create operation with direct external link: `[Wikipedia](https://en.wikipedia.org/wiki/Mise_en_place)`
2. Run `busy check`

**Expected Result:**
- Link checked for validity (HTTP 200)
- No caching (it's not through package.busy.md)
- Passes validation

### Scenario 5: Skip External Link Validation

**Preconditions:**
- Workspace with external links

**Steps:**
1. Run `busy check --skip-external`

**Expected Result:**
- External URLs are not validated
- Only local and package.busy.md links checked
- Faster validation for offline work

---

## Infrastructure Requirements

### Standalone CLI: `busy`

| Command | Description |
|---------|-------------|
| `busy init` | Initialize workspace (create package.busy.md) |
| `busy check` | Validate all imports and links |
| `busy package add <url>` | Add package from URL |
| `busy package remove <name>` | Remove package |
| `busy package update` | Refresh metadata for all packages |
| `busy package upgrade <name>` | Upgrade to latest version |
| `busy package upgrade --all` | Upgrade all packages |
| `busy package list` | List installed packages |
| `busy package info <name>` | Show package details |
| `busy package cache clean` | Remove cached packages |

### File Structure

```
workspace/
├── package.busy.md           # Package registry (Type: Package)
├── .libraries/               # Cached external packages
│   ├── core/                 # Core library
│   │   ├── tools/
│   │   └── concepts/
│   └── {package-name}/       # Third-party packages
└── documents/                # Workspace documents
    └── *.busy.md
```

### package.busy.md Format

**Self-defining document** - The package file is Type: Document and includes its own definitions. No external dependencies.

```markdown
---
Name: package
Type: Document
Description: Package registry for this workspace. Self-defining format.
---

# Definitions

This section defines the structure for package entries below.

## Package Entry

A cached external BUSY document.

| Field | Required | Description |
|-------|----------|-------------|
| Source | Yes | URL to the source file |
| Provider | Yes | github, gitlab, url (determines version resolution) |
| Cached | Yes | Local path in .libraries/ |
| Version | Yes | Semantic version |
| Fetched | Yes | ISO timestamp of last fetch |
| Integrity | No | SHA256 hash for verification |

## External Reference

A non-cached external link (for context only).

| Field | Required | Description |
|-------|----------|-------------|
| URL | Yes | External URL |
| Type | Yes | Always "external" |

---

# Package Registry

Entries below follow the [Package Entry](#package-entry) definition.

---

## Core Library

### executeprompt

Core prompt execution concept from BUSY core library.

| Field | Value |
|-------|-------|
| Source | https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt |
| Provider | github |
| Cached | .libraries/core/prompt.md |
| Version | 0.3.1 |
| Fetched | 2026-01-21T10:30:00Z |
| Integrity | sha256:abc123... |

[Source][exec-src] | [Local][exec-local]

[exec-src]: https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt
[exec-local]: .libraries/core/prompt.md#executeprompt

---

## External References

### wikipedia-mise-en-place

Background context (not cached).

| Field | Value |
|-------|-------|
| URL | https://en.wikipedia.org/wiki/Mise_en_place |
| Type | external |

[View][wiki]

[wiki]: https://en.wikipedia.org/wiki/Mise_en_place
```

**Key points:**
- Type: Document (not Package) - it's a regular BUSY doc
- Self-defining: Definitions section at top, entries reference them
- Provider field: Determines how to resolve "latest" version
- Only one package.busy.md per workspace

### Link Syntax in BUSY Documents

**No frontmatter imports.** All references are standard markdown links in the body:

```markdown
---
Name: daily-kitchen-report
Type: Operation
---

# Daily Kitchen Report

Use the [execute prompt](./package.busy.md#executeprompt) pattern.

## Steps

1. Gather all station reports
2. Compile summary statistics
3. [Execute prompt](./package.busy.md#executeprompt) to generate summary
4. Reference [Wikipedia](https://en.wikipedia.org/wiki/Mise_en_place) for context
```

**Link types:**
- `./package.busy.md#name` → Resolves via package registry (cached)
- `./local/file.busy.md` → Relative path (no caching)
- `https://...` → External URL (link check only, no caching)

**Caching rule:** Only links through `package.busy.md` are cached. Direct external URLs in documents are link-checked but not cached.

---

## Technical Constraints

1. **No Runtime Dependencies** - Pure CLI tool, no Orgata/LangGraph
2. **Python 3.11+** - Match BUSY ecosystem
3. **Minimal Dependencies** - requests, pyyaml, click (CLI)
4. **Cross-Platform** - macOS, Linux, Windows
5. **Offline Capable** - Work with cached packages when offline

## Provider Support

The `Provider` field determines how to resolve versions and fetch raw content.

| Provider | URL Pattern | Version Resolution | Raw Content |
|----------|-------------|-------------------|-------------|
| `github` | `github.com/{org}/{repo}` | Git tags | `raw.githubusercontent.com` |
| `gitlab` | `gitlab.com/{org}/{repo}` | Git tags | `gitlab.com/.../raw/` |
| `url` | Any URL | None (explicit version in URL) | Direct fetch |

**Version resolution example (github):**
```
Source: https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/tools/emit-event.busy.md
       → Resolves to: https://raw.githubusercontent.com/Bravo-Tensor/busy-lang/v0.3.1/busy-v2/core/tools/emit-event.busy.md

Latest: busy package upgrade emit-event
       → Fetches tags from GitHub API
       → Updates to latest tag (e.g., v0.4.0)
```

## Test Repository

For development and testing, use the busy-lang repo:

- **Repo:** https://github.com/Bravo-Tensor/busy-lang
- **Core path:** `busy-v2/core/`
- **Latest tag:** v0.3.1
- **Test file:** `https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md`
- **Test section:** `https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt`

**Note:** Can link to sections within files using `#anchor` syntax.

---

## Success Metrics

1. All E2E scenarios pass
2. CLI commands work as documented
3. Package.busy.md is valid markdown (renders in GitHub)
4. Zero Orgata dependencies in codebase
5. `busy check` catches all broken imports/links

---

## Resolved Design Decisions

1. **No frontmatter imports** - All references are markdown links in body
2. **Caching scope** - Only package.busy.md entries are cached
3. **Self-defining format** - package.busy.md includes its own definitions
4. **Provider-based resolution** - github, gitlab, url providers for version handling

## Open Questions (To Resolve in Spec)

1. **Transitive dependencies** - Does a package declare its own dependencies?
2. **Conflict resolution** - What if two packages need different versions of same dep?
3. **Private packages** - Future consideration for auth?
4. **Package naming** - How to derive entry name from URL? (e.g., emit-event from path)
