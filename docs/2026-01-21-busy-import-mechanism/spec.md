# BUSY Import Mechanism - Technical Specification

> **Version:** 0.1.0
> **Status:** Draft
> **Standalone:** Yes - No Orgata dependencies

---

## Overview

This specification defines the import and package management system for BUSY documents. It enables:

1. URL-based linking to external BUSY content
2. Local caching via `package.busy.md` registry
3. CLI tooling for package management
4. Coherence validation via `busy check`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUSY CLI                                 │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ busy init   │  │ busy check  │  │ busy package <command> │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │                │                      │               │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CORE LIBRARY                                │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Parser    │  │  Resolver   │  │   Provider Registry     │ │
│  │ (Markdown)  │  │  (Links)    │  │  (GitHub, GitLab, URL)  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Cache     │  │  Validator  │  │   Package Manager       │ │
│  │ (.libraries)│  │ (Coherence) │  │  (add/remove/upgrade)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FILESYSTEM                                  │
│                                                                  │
│  workspace/                                                      │
│  ├── package.busy.md       # Package registry                   │
│  ├── .libraries/           # Cached packages                    │
│  └── documents/            # User documents                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Package Registry: `package.busy.md`

### 1.1 File Structure

The package registry is a self-defining BUSY document at workspace root.

```markdown
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

## {Category}

### {entry-id}

{Description}

| Field | Value |
|-------|-------|
| Source | {url} |
| Provider | {provider} |
| Cached | {path} |
| Version | {version} |
| Fetched | {timestamp} |
| Integrity | {hash} |

[Source]({url}) | [Local]({path})
```

### 1.2 Entry ID Rules

The entry ID (H3 header) is derived from the URL:

| URL | Derived ID |
|-----|------------|
| `.../prompt.md` | `prompt` |
| `.../prompt.md#executeprompt` | `executeprompt` |
| `.../tools/emit-event.busy.md` | `emit-event` |

**Algorithm:**
1. If URL has `#anchor`, use anchor as ID
2. Else, use filename without extension
3. Slugify (lowercase, hyphens for spaces)

### 1.3 Category Inference

Categories (H2 headers) are inferred from URL path:

| URL Pattern | Category |
|-------------|----------|
| `/core/...` | Core Library |
| `/tools/...` | Tools |
| `/concepts/...` | Concepts |
| Other | Packages |

User can override by manually moving entries.

---

## 2. Link Resolution

### 2.1 Link Types

| Type | Pattern | Resolution |
|------|---------|------------|
| Package | `./package.busy.md#id` | Lookup in registry → cached path |
| Relative | `./path/to/file.md` | Relative to current file |
| External | `https://...` | Validate only (no cache) |

### 2.2 Resolution Algorithm

```python
def resolve_link(link: str, current_file: Path) -> ResolvedLink:
    if link.startswith("./package.busy.md#"):
        # Package reference
        entry_id = link.split("#")[1]
        entry = lookup_package_entry(entry_id)
        if entry:
            return ResolvedLink(
                type="package",
                cached_path=entry.cached,
                source_url=entry.source
            )
        else:
            return ResolvedLink(type="error", message=f"Unknown package: {entry_id}")

    elif link.startswith("http://") or link.startswith("https://"):
        # External URL
        return ResolvedLink(type="external", url=link)

    elif link.startswith("./") or link.startswith("../"):
        # Relative path
        resolved = current_file.parent / link
        if resolved.exists():
            return ResolvedLink(type="local", path=resolved)
        else:
            return ResolvedLink(type="error", message=f"File not found: {resolved}")

    else:
        return ResolvedLink(type="error", message=f"Invalid link format: {link}")
```

### 2.3 Anchor Support

Links can reference sections within files:

```markdown
[execute prompt](./package.busy.md#executeprompt)
```

Resolves to:
1. `package.busy.md` entry with id `executeprompt`
2. Cached file: `.libraries/core/prompt.md`
3. Section: `#executeprompt` within that file

---

## 3. Provider System

### 3.1 Provider Interface

```python
class Provider(Protocol):
    """Interface for URL providers."""

    def matches(self, url: str) -> bool:
        """Check if this provider handles the URL."""
        ...

    def parse(self, url: str) -> ParsedURL:
        """Parse URL into components."""
        ...

    def get_raw_url(self, parsed: ParsedURL) -> str:
        """Convert to raw content URL."""
        ...

    def get_latest_version(self, parsed: ParsedURL) -> str:
        """Fetch latest version/tag."""
        ...

    def fetch(self, url: str) -> bytes:
        """Fetch raw content."""
        ...
```

### 3.2 GitHub Provider

```python
class GitHubProvider:
    """Provider for github.com URLs."""

    PATTERN = r"github\.com/(?P<org>[^/]+)/(?P<repo>[^/]+)/blob/(?P<ref>[^/]+)/(?P<path>.+)"

    def matches(self, url: str) -> bool:
        return "github.com" in url

    def parse(self, url: str) -> ParsedURL:
        match = re.match(self.PATTERN, url)
        return ParsedURL(
            provider="github",
            org=match.group("org"),
            repo=match.group("repo"),
            ref=match.group("ref"),
            path=match.group("path"),
            anchor=url.split("#")[1] if "#" in url else None
        )

    def get_raw_url(self, parsed: ParsedURL) -> str:
        return f"https://raw.githubusercontent.com/{parsed.org}/{parsed.repo}/{parsed.ref}/{parsed.path}"

    def get_latest_version(self, parsed: ParsedURL) -> str:
        # Fetch tags from GitHub API
        api_url = f"https://api.github.com/repos/{parsed.org}/{parsed.repo}/tags"
        response = requests.get(api_url)
        tags = response.json()
        # Return latest semver tag
        return sorted(tags, key=lambda t: t["name"], reverse=True)[0]["name"]
```

### 3.3 GitLab Provider

```python
class GitLabProvider:
    """Provider for gitlab.com URLs."""

    def get_raw_url(self, parsed: ParsedURL) -> str:
        return f"https://gitlab.com/{parsed.org}/{parsed.repo}/-/raw/{parsed.ref}/{parsed.path}"
```

### 3.4 URL Provider

```python
class URLProvider:
    """Generic provider for direct URLs."""

    def matches(self, url: str) -> bool:
        return url.startswith("http")

    def get_latest_version(self, parsed: ParsedURL) -> str:
        # No version resolution for generic URLs
        raise NotImplementedError("Generic URLs don't support version resolution")
```

---

## 4. CLI Commands

### 4.1 `busy init`

Initialize a new workspace with package.busy.md.

```bash
$ busy init

Created package.busy.md
Workspace initialized.
```

**Behavior:**
1. Create `package.busy.md` with Definitions section
2. Create `.libraries/` directory
3. Create `.gitignore` for `.libraries/` (optional)

### 4.2 `busy check`

Validate workspace coherence.

```bash
$ busy check [--skip-external] [--verbose]

Checking workspace...

package.busy.md
  ✓ executeprompt - cached, integrity verified

documents/daily-report.busy.md
  ✓ Link: [execute prompt](./package.busy.md#executeprompt) → resolved
  ✓ Link: [Wikipedia](https://en.wikipedia.org/...) → external (200 OK)

Summary:
  Files: 2
  Links: 2 resolved, 0 broken
  Packages: 1 cached

✓ Workspace is coherent
```

**Options:**
- `--skip-external`: Don't validate external URLs
- `--verbose`: Show all links, not just errors

**Exit codes:**
- 0: All links resolve
- 1: Broken links found
- 2: Workspace not initialized

### 4.3 `busy package add <url>`

Add a package from URL.

```bash
$ busy package add https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt

Adding package: executeprompt
  Provider: github
  Version: v0.3.1
  Fetching... done
  Cached: .libraries/core/prompt.md

Added to package.busy.md

✓ Package added: executeprompt
```

**Behavior:**
1. Parse URL to determine provider
2. Fetch raw content
3. Save to `.libraries/` (preserving path structure)
4. Calculate integrity hash
5. Add entry to `package.busy.md`

### 4.4 `busy package remove <name>`

Remove a package.

```bash
$ busy package remove executeprompt

Removing package: executeprompt
  Removing from package.busy.md... done
  Removing cached file... done

✓ Package removed: executeprompt
```

**Behavior:**
1. Remove entry from `package.busy.md`
2. Remove cached file from `.libraries/`
3. Warn if package is still referenced in documents

### 4.5 `busy package upgrade <name>`

Upgrade to latest version.

```bash
$ busy package upgrade executeprompt

Upgrading package: executeprompt
  Current: v0.3.1
  Latest: v0.4.0
  Fetching... done
  Updated: .libraries/core/prompt.md

✓ Package upgraded: executeprompt (v0.3.1 → v0.4.0)
```

**Behavior:**
1. Query provider for latest version
2. Compare with current version
3. If newer, fetch and update
4. Update `package.busy.md` entry

### 4.6 `busy package upgrade --all`

Upgrade all packages.

```bash
$ busy package upgrade --all

Checking for updates...
  executeprompt: v0.3.1 → v0.4.0 (upgrade available)
  mise-en-place: v0.3.1 (up to date)

Upgrading 1 package...
  executeprompt... done

✓ Upgraded 1 package
```

### 4.7 `busy package list`

List installed packages.

```bash
$ busy package list

Packages:
  executeprompt    v0.3.1    github    .libraries/core/prompt.md
  mise-en-place    v0.3.1    github    .libraries/core/mise-en-place.md

External References:
  wikipedia-mise   external  https://en.wikipedia.org/...

Total: 2 packages, 1 external reference
```

### 4.8 `busy package info <name>`

Show package details.

```bash
$ busy package info executeprompt

Package: executeprompt

| Field     | Value |
|-----------|-------|
| Source    | https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt |
| Provider  | github |
| Cached    | .libraries/core/prompt.md |
| Version   | v0.3.1 |
| Fetched   | 2026-01-21T10:30:00Z |
| Integrity | sha256:abc123... |

References:
  documents/daily-report.busy.md:15
```

### 4.9 `busy package cache clean`

Remove all cached packages.

```bash
$ busy package cache clean

This will remove all cached packages from .libraries/
Package entries in package.busy.md will be preserved.

Proceed? [y/N] y

Removing .libraries/... done

✓ Cache cleaned (2 files removed)
```

---

## 5. Validation

### 5.1 Coherence Checks

| Check | Level | Description |
|-------|-------|-------------|
| Package exists | Error | Entry in package.busy.md has cached file |
| Link resolves | Error | All markdown links point to valid targets |
| Integrity matches | Warning | Cached file matches recorded hash |
| External reachable | Warning | External URLs return 200 (unless --skip-external) |
| No orphan cache | Info | Cached files have corresponding entries |

### 5.2 Link Extraction

Parse markdown to find all links:

```python
def extract_links(content: str) -> list[Link]:
    links = []

    # Inline links: [text](url)
    for match in re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', content):
        links.append(Link(text=match.group(1), url=match.group(2)))

    # Reference links: [text][ref] with [ref]: url
    refs = {}
    for match in re.finditer(r'^\[([^\]]+)\]:\s*(.+)$', content, re.MULTILINE):
        refs[match.group(1)] = match.group(2)

    for match in re.finditer(r'\[([^\]]+)\]\[([^\]]*)\]', content):
        ref = match.group(2) or match.group(1)
        if ref in refs:
            links.append(Link(text=match.group(1), url=refs[ref]))

    return links
```

### 5.3 Error Reporting

```
documents/daily-report.busy.md:15:23 error: Broken link
  [missing concept](./package.busy.md#missing-concept)
                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  Package entry "missing-concept" not found in package.busy.md

  Did you mean: executeprompt?
```

---

## 6. File Structure

### 6.1 Cache Directory

```
.libraries/
├── core/                    # From busy-lang core
│   ├── prompt.md
│   └── mise-en-place.md
└── kitchen-recipes/         # Third-party package
    └── operations/
        └── prep-station.busy.md
```

**Path derivation:**
- GitHub: `{repo}/{path-from-blob}`
- Generic: `{domain}/{path}`

### 6.2 Workspace Structure

```
workspace/
├── package.busy.md          # Package registry (root)
├── .libraries/              # Cached packages
├── documents/               # User documents
│   ├── operations/
│   └── concepts/
└── .gitignore               # Ignore .libraries/ (optional)
```

---

## 7. Data Models

### 7.1 PackageEntry

```python
@dataclass
class PackageEntry:
    id: str                    # Entry ID (from H3 header)
    description: str           # Entry description
    source: str                # Source URL
    provider: str              # github, gitlab, url
    cached: Path               # Local cache path
    version: str               # Version/tag
    fetched: datetime          # Fetch timestamp
    integrity: str | None      # sha256 hash
    category: str              # Category (from H2 header)
```

### 7.2 ExternalReference

```python
@dataclass
class ExternalReference:
    id: str                    # Entry ID
    description: str           # Description
    url: str                   # External URL
    type: str = "external"     # Always "external"
```

### 7.3 ParsedURL

```python
@dataclass
class ParsedURL:
    provider: str              # Provider name
    org: str                   # Organization/owner
    repo: str                  # Repository name
    ref: str                   # Branch/tag/commit
    path: str                  # File path
    anchor: str | None         # Optional #anchor
```

### 7.4 ResolvedLink

```python
@dataclass
class ResolvedLink:
    type: str                  # package, local, external, error
    cached_path: Path | None   # For package type
    source_url: str | None     # For package/external type
    path: Path | None          # For local type
    message: str | None        # For error type
```

---

## 8. Implementation Notes

### 8.1 Dependencies

```toml
[project]
name = "busy"
version = "0.1.0"
requires-python = ">=3.11"

dependencies = [
    "click>=8.0",        # CLI framework
    "requests>=2.28",    # HTTP client
    "pyyaml>=6.0",       # YAML parsing (frontmatter)
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-cov>=4.0",
]
```

### 8.2 Project Structure

```
busy/
├── busy/
│   ├── __init__.py
│   ├── cli.py              # CLI entry point
│   ├── parser.py           # Markdown/YAML parser
│   ├── resolver.py         # Link resolution
│   ├── validator.py        # Coherence checks
│   ├── cache.py            # Cache management
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py         # Provider interface
│   │   ├── github.py       # GitHub provider
│   │   ├── gitlab.py       # GitLab provider
│   │   └── url.py          # Generic URL provider
│   └── models.py           # Data models
├── tests/
│   ├── test_parser.py
│   ├── test_resolver.py
│   ├── test_providers.py
│   └── fixtures/           # Test workspaces
└── pyproject.toml
```

### 8.3 Error Handling

```python
class BusyError(Exception):
    """Base exception for BUSY errors."""
    pass

class PackageNotFoundError(BusyError):
    """Package entry not found in registry."""
    pass

class FetchError(BusyError):
    """Failed to fetch remote content."""
    pass

class ValidationError(BusyError):
    """Workspace coherence validation failed."""
    pass
```

---

## 9. E2E Test Scenarios

### 9.1 Scenario: New Workspace Setup

```bash
# Setup
mkdir test-workspace && cd test-workspace

# Initialize
busy init
# → Creates package.busy.md with Definitions section

# Add package
busy package add https://github.com/Bravo-Tensor/busy-lang/blob/v0.3.1/busy-v2/core/prompt.md#executeprompt
# → Fetches and caches file
# → Adds entry to package.busy.md

# Create document
cat > documents/test.busy.md << 'EOF'
---
Name: test
Type: Operation
---
# Test
Use [execute prompt](./package.busy.md#executeprompt).
EOF

# Validate
busy check
# → All links resolve
# → Exit code 0
```

### 9.2 Scenario: Broken Link Detection

```bash
# Create document with broken link
cat > documents/broken.busy.md << 'EOF'
---
Name: broken
Type: Operation
---
# Broken
See [missing](./package.busy.md#nonexistent).
EOF

# Validate
busy check
# → Error: Package entry "nonexistent" not found
# → Exit code 1
```

### 9.3 Scenario: Package Upgrade

```bash
# Add old version
busy package add https://github.com/Bravo-Tensor/busy-lang/blob/v0.2.0/busy-v2/core/prompt.md#executeprompt

# Check for updates
busy package upgrade executeprompt
# → Shows: v0.2.0 → v0.3.1
# → Updates cache and registry
```

---

## 10. Future Considerations

### 10.1 Transitive Dependencies

Not in scope for v0.1.0. Each document declares its own dependencies.

### 10.2 Private Packages

Future: Add authentication support for private repos.

```yaml
# busy.config.yaml
providers:
  github:
    token: ${GITHUB_TOKEN}
```

### 10.3 LSP Integration

Future: Language server for IDE integration.

- Syntax highlighting (TextMate grammar)
- Link validation (real-time diagnostics)
- Go to definition (Ctrl+click on links)
- Autocomplete (package entry IDs)

### 10.4 Lock File

Optional `package.lock.yaml` for reproducible builds:

```yaml
packages:
  executeprompt:
    resolved: https://raw.githubusercontent.com/.../prompt.md
    integrity: sha256:abc123...
    fetched: 2026-01-21T10:30:00Z
```

---

## Appendix A: Grammar

### A.1 Package Entry Grammar

```
package_entry = header description table links

header = "###" SP entry_id NL
entry_id = slug

description = text NL NL

table = table_header table_separator table_rows
table_header = "|" SP "Field" SP "|" SP "Value" SP "|" NL
table_separator = "|" "-"+ "|" "-"+ "|" NL
table_rows = (table_row)+
table_row = "|" SP field_name SP "|" SP field_value SP "|" NL

field_name = "Source" | "Provider" | "Cached" | "Version" | "Fetched" | "Integrity"
field_value = text

links = "[Source][" ref_id "]" SP "|" SP "[Local][" ref_id "]" NL NL
        "[" ref_id "]:" SP url NL
        "[" ref_id "]:" SP path NL

slug = [a-z0-9-]+
```

### A.2 Link Grammar

```
link = inline_link | reference_link

inline_link = "[" text "](" url ")"
reference_link = "[" text "][" ref_id "]"

url = package_url | relative_url | external_url
package_url = "./package.busy.md#" entry_id
relative_url = "./" path
external_url = "http" "s"? "://" host path
```
