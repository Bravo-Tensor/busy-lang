# BUSY Import Mechanism - Design Research

> Pre-spec research and brainstorming for the BUSY import/linking system.

---

## Research Questions

1. [BUSY/Orgata Coupling](#1-busyorgata-coupling---package-resolution-timing)
2. [URL-Based Linking](#2-url-based-linking-vs-package-pulling)
3. [Language Server Protocol](#3-language-server-protocol-lsp)
4. [Version Pinning & Publishing](#4-version-pinning--publishing)
5. [Link Resolution as Compilation](#5-link-resolution-as-compilation)
6. [Ports & Adapters for Service Binding](#6-ports--adapters-for-service-binding)

---

## 1. BUSY/Orgata Coupling - Package Resolution Timing

### The Core Question

When should BUSY document dependencies be resolved?

```
BUSY Document → [???] → Running on Orgata Runtime
                 ↑
           Where does resolution happen?
```

### Historical Models

#### Model A: Build-Time Resolution (Compiled Languages)

**Examples:** C/C++, Rust, Go, Java

```
Source + Dependencies → Compiler/Linker → Single Artifact → Deploy
```

**How it works:**
- Dependencies declared in manifest (Cargo.toml, pom.xml, go.mod)
- Resolved and fetched at build time
- Linked into final artifact
- Deployed artifact is self-contained

**Pros:**
- Reproducible builds (lockfiles)
- No runtime dependency on package registry
- Fast startup (no resolution needed)
- Offline execution possible

**Cons:**
- Rebuild required for dependency updates
- Larger artifacts
- Build step required before deployment

**BUSY Equivalent:**
```
busy build workspace/ → bundled-workspace.tar → deploy to Orgata
```

#### Model B: Runtime Resolution (Dynamic Languages)

**Examples:** Python (pip), Node.js (npm), Ruby (bundler)

```
Source → Deploy → Runtime resolves dependencies → Execute
```

**How it works:**
- Dependencies declared in manifest (requirements.txt, package.json)
- Resolution happens at install/first-run
- Dependencies fetched to runtime environment
- Lockfiles for reproducibility

**Pros:**
- Simpler deployment (just source)
- Easy to patch dependencies in place
- Smaller deployment artifacts

**Cons:**
- Requires network at install time
- "Works on my machine" issues
- Slower cold starts

**BUSY Equivalent:**
```
deploy workspace/ to Orgata → Orgata resolves imports on first load
```

#### Model C: Registry + CDN (Web/Browser)

**Examples:** npm + unpkg/jsdelivr, Deno, ES Modules

```
Source with URLs → Runtime fetches from CDN → Cache locally → Execute
```

**How it works:**
- Dependencies referenced by URL
- Browser/runtime fetches on demand
- Cached for subsequent loads
- No local install step

**Deno Example:**
```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
```

**Pros:**
- No package manager needed
- Version in URL = explicit pinning
- Shareable (anyone with URL can use)
- CDN handles distribution

**Cons:**
- Network required at runtime (first load)
- URL stability concerns (what if host goes down?)
- No transitive dependency management
- Cache invalidation complexity

**BUSY Equivalent:**
```markdown
Imports:
  - https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md
```

#### Model D: Hybrid (Lock + Fetch)

**Examples:** Cargo, Poetry, pnpm

```
Manifest → Resolve → Lockfile → Build/Deploy → Fetch locked versions
```

**How it works:**
- Manifest declares ranges
- Resolution produces lockfile with exact versions
- Lockfile committed to source control
- Deploy fetches exactly what's locked

**Pros:**
- Reproducible (lockfile)
- Flexible (ranges in manifest)
- Cacheable (content-addressed)

**Cons:**
- Two files to manage
- Resolution step complexity

### BUSY-Specific Considerations

| Aspect | Build-Time | Runtime | URL/CDN | Hybrid |
|--------|-----------|---------|---------|--------|
| Offline execution | ✅ Full | ❌ Need network | ❌ First load | ⚠️ After first resolve |
| Simple deployment | ❌ Build step | ✅ Just copy | ✅ Just copy | ⚠️ Need lockfile |
| Reproducibility | ✅ Bundled | ⚠️ Needs lock | ✅ Version in URL | ✅ Lockfile |
| Markdown readability | ❌ Custom syntax | ❌ Custom syntax | ✅ Real URLs | ⚠️ Lockfile separate |
| Cross-workspace | ⚠️ Complex | ✅ Natural | ✅ Just URLs | ✅ Natural |

### Recommendation Direction

Given your goals:
- Keep BUSY markdown-readable → **URL-based is attractive**
- Independence from Orgata → **Resolution before Orgata deployment**
- But Orgata does the "compilation" → **Orgata validates/binds, doesn't transform**

**Proposed Model: URL + Validation**

```
BUSY Document (with URLs) → BUSY Validator (checks coherence) → Deploy to Orgata → Orgata binds to runtime
```

- BUSY files use real URLs for external deps
- BUSY validator ensures all links resolve
- Orgata runtime binds abstract services to concrete implementations
- No "compilation" in traditional sense - just validation + binding

---

## 2. URL-Based Linking vs Package Pulling

### The Deno Precedent

Deno made URL imports mainstream for JavaScript:

```typescript
// Direct URL import
import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// With version pinning in URL
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
```

**Why it works for Deno:**
- TypeScript/JavaScript naturally supports URL imports
- Single-file deployment common
- CDN (deno.land) is reliable
- Import maps for aliasing

### URL Linking for BUSY

```markdown
---
Name: daily-kitchen-report
Type: Operation
Imports:
  - https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md
  - https://busy.dev/core/v1.2.0/tools/emit-event.busy.md
---

## Steps
1. Follow [mise-en-place](https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md) principles
2. Prepare the daily summary
3. [Emit event](https://busy.dev/core/v1.2.0/tools/emit-event.busy.md) with results
```

### Hosting Options

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Pages** | Free, tied to repo, versioned via tags | No custom domain without setup, rate limits |
| **GitHub Raw** | Direct file access, versioned | URLs are ugly, no CDN |
| **Dedicated CDN (busy.dev)** | Clean URLs, fast, controlled | Cost, maintenance, single point of failure |
| **IPFS/Content-Addressed** | Immutable, decentralized | Complexity, gateway dependency |
| **npm-style Registry** | Familiar, tooling exists | Requires package manager, not URL-native |

### Downsides of URL-Based

1. **URL Stability**
   - What if busy.dev goes down?
   - What if GitHub changes raw URL format?
   - Mitigation: Multiple mirrors, content-addressed backup

2. **No Transitive Dependencies**
   - URL imports don't recursively resolve
   - Each file must declare all its imports
   - Mitigation: Flatten dependencies, or validator resolves transitively

3. **Verbosity**
   - Full URLs are long
   - Mitigation: Import maps / aliases

4. **Offline Development**
   - Can't work without network
   - Mitigation: Local cache, offline-first tooling

5. **Discoverability**
   - No `busy search` to find packages
   - Mitigation: Registry website, not package manager

### Import Maps (Aliasing)

Like Deno's import_map.json:

```json
// busy.imports.json
{
  "imports": {
    "busy:core/": "https://busy.dev/core/v1.2.0/",
    "busy:kitchen/": "https://github.com/myorg/kitchen-ops/raw/main/"
  }
}
```

Then in BUSY docs:
```markdown
Imports:
  - busy:core/concepts/mise-en-place.busy.md
  - busy:kitchen/operations/daily-report.busy.md
```

**Benefits:**
- Short, readable references
- Version pinned in one place
- Still resolves to real URLs
- Markdown parsers see valid links

---

## 3. Language Server Protocol (LSP)

### What LSP Provides

LSP is a protocol between editors and language tooling:

```
Editor (VSCode, Vim, etc.) ←→ Language Server ←→ Your Language
```

**Features LSP enables:**
- **Syntax highlighting** (actually TextMate grammars, not LSP)
- **Autocomplete** (completions)
- **Go to definition** (links work!)
- **Find references**
- **Hover documentation**
- **Diagnostics** (errors, warnings)
- **Code actions** (quick fixes)
- **Formatting**

### What BUSY Would Need

| Feature | Value for BUSY | Complexity |
|---------|---------------|------------|
| Syntax highlighting | High - YAML frontmatter + Markdown | Low (TextMate grammar) |
| Link validation | High - "Does this import exist?" | Medium |
| Go to definition | High - Click import → open file | Medium |
| Autocomplete | Medium - Suggest operations, concepts | High |
| Hover docs | Medium - Show operation description | Medium |
| Diagnostics | High - Invalid imports, broken links | Medium |

### Implementation Options

#### Option 1: TextMate Grammar Only (No LSP)

Just syntax highlighting, no intelligence:

```json
// busy.tmLanguage.json
{
  "scopeName": "source.busy",
  "patterns": [
    { "include": "#frontmatter" },
    { "include": "text.html.markdown" }
  ],
  "repository": {
    "frontmatter": {
      "begin": "^---$",
      "end": "^---$",
      "contentName": "meta.embedded.block.yaml",
      "patterns": [{ "include": "source.yaml" }]
    }
  }
}
```

**Pros:** Simple, works everywhere
**Cons:** No validation, no go-to-definition

#### Option 2: Full LSP Server

Build a language server in Python/TypeScript:

```
busy-lsp/
├── server.py          # LSP protocol handling
├── parser.py          # BUSY document parsing
├── validator.py       # Link/import validation
└── completions.py     # Autocomplete logic
```

**Pros:** Full IDE experience
**Cons:** Significant development effort, maintenance burden

#### Option 3: Markdown LSP + BUSY Extension

Leverage existing Markdown LSP, extend for BUSY:

```
Markdown LSP (links, formatting)
     ↓
BUSY Extension (frontmatter validation, import resolution)
```

**Pros:** Less work, leverages existing tooling
**Cons:** May not cover all BUSY-specific needs

### Claude Code Integration

You mentioned Claude plugins can take .lsp config:

```json
// .claude/lsp.json
{
  "busy": {
    "command": "busy-lsp",
    "filetypes": ["*.busy.md"]
  }
}
```

This would give Claude Code awareness of BUSY structure when editing.

### Recommendation

**Start with TextMate grammar** for immediate value, **plan for LSP** as BUSY matures:

1. **Phase 1:** TextMate grammar for syntax highlighting
2. **Phase 2:** Simple validator CLI (`busy check`)
3. **Phase 3:** LSP server wrapping the validator

---

## 4. Version Pinning & Publishing

### Models in the Wild

#### Semantic Versioning (SemVer)

```
MAJOR.MINOR.PATCH
  2.1.3
```

- MAJOR: Breaking changes
- MINOR: New features, backward compatible
- PATCH: Bug fixes

**Used by:** npm, Cargo, most package managers

#### CalVer (Calendar Versioning)

```
YYYY.MM.DD or YY.MM
  2026.01.21
```

**Used by:** Ubuntu, some Python packages

#### Git-Based (Commit/Tag)

```
github.com/org/repo@v1.2.3
github.com/org/repo@abc123f
github.com/org/repo@main
```

**Used by:** Go modules, Deno

### For BUSY

Given URL-based linking, version goes in URL:

```
https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md
                      ^^^^^^
                      version
```

**Options:**
1. **SemVer in path:** `https://busy.dev/core/v1.2.0/...`
2. **Git tag:** `https://github.com/org/busy-core/raw/v1.2.0/...`
3. **Commit hash:** `https://github.com/.../raw/abc123/...` (immutable)
4. **Branch (mutable):** `https://github.com/.../raw/main/...` (dangerous)

### Publishing Model

**Question:** What does "publish" mean for BUSY?

#### Option A: No Registry, Just URLs

"Publishing" = making files available at a URL

```bash
# "Publish" by pushing to GitHub
git tag v1.2.0
git push --tags
# Files now available at github.com/.../raw/v1.2.0/...
```

**Pros:** Zero infrastructure, works with GitHub Pages
**Cons:** No discoverability, no metadata

#### Option B: Registry with Metadata

Like npm registry, but for BUSY:

```json
// GET https://registry.busy.dev/core
{
  "name": "core",
  "description": "BUSY core concepts and tools",
  "versions": {
    "1.2.0": {
      "url": "https://busy.dev/core/v1.2.0/",
      "checksum": "sha256:abc123...",
      "published": "2026-01-21T00:00:00Z"
    }
  }
}
```

**Pros:** Discoverability, metadata, checksums
**Cons:** Infrastructure to build and maintain

#### Option C: Package.json-Style Manifest

Each BUSY package has a manifest:

```yaml
# busy.package.yaml
name: "@myorg/kitchen-ops"
version: "1.0.0"
description: "Kitchen operation templates"
repository: "https://github.com/myorg/kitchen-ops"
exports:
  - operations/daily-report.busy.md
  - concepts/kitchen-rules.busy.md
dependencies:
  busy-core: "^1.2.0"
```

**Pros:** Self-describing, familiar pattern
**Cons:** Need tooling to read/resolve

### Lockfile Consideration

Even with URLs, you might want a lockfile:

```yaml
# busy.lock.yaml
imports:
  "https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md":
    resolved: "https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md"
    integrity: "sha256-abc123..."
    fetched: "2026-01-21T00:00:00Z"
```

**Why:**
- Verify content hasn't changed
- Reproducible resolution
- Audit trail

---

## 5. Link Resolution as Compilation

### Your Insight

> "This is effectively what the 'compilation' would actually be responsible for, making sure it's coherent, not converting to another format."

This reframes BUSY "compilation":

| Traditional Compiler | BUSY "Compiler" |
|---------------------|-----------------|
| Transforms code to different format | Validates coherence |
| Outputs binary/bytecode | Outputs validation report |
| Links external libraries | Verifies all links resolve |
| Type checking | Document structure checking |

### What "Coherence" Means for BUSY

1. **All imports resolve** - Every imported file exists
2. **All links resolve** - Every markdown link points to something real
3. **Type consistency** - Operations reference valid Tools, Concepts, etc.
4. **No circular dependencies** - Or handle them gracefully
5. **Trigger validity** - Event triggers reference valid event types
6. **Service binding possible** - Abstract services can be bound to implementations

### Implementation: `busy check`

```bash
$ busy check workspace/

Checking workspace: workspace/
  ✓ documents/daily-report.busy.md
    ✓ Import: https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md
    ✓ Import: ./tools/send-notification.busy.md
    ✓ Link: [kitchen rules](./concepts/kitchen-rules.busy.md)
    ⚠ Link: [old procedure](./archive/old-proc.md) - not found
  ✓ documents/tools/send-notification.busy.md
    ✓ Type: Appliance - valid
    ✓ Provider: slack - known provider

Summary:
  Files checked: 2
  Imports resolved: 3
  Links resolved: 4
  Warnings: 1 (broken link)
  Errors: 0

Workspace is coherent.
```

### Validation Levels

```yaml
# busy.config.yaml
validation:
  level: strict  # strict | warn | loose

  rules:
    broken-links: error      # error | warn | ignore
    missing-imports: error
    circular-deps: warn
    unbound-services: warn   # services without runtime binding
    deprecated-refs: warn
```

### When Validation Runs

| Trigger | What Happens |
|---------|--------------|
| `busy check` | Full validation, report |
| Pre-commit hook | Block commit if errors |
| LSP (continuous) | Real-time diagnostics |
| Deploy to Orgata | Validation gate |
| Orgata load | Runtime binding check |

---

## 6. Ports & Adapters for Service Binding

### The Problem

A BUSY step says:
```
- Emit event "order.completed" with order details
```

How does this become actual execution?

### Hexagonal Architecture Refresher

```
                    ┌─────────────────────────────────────┐
                    │         APPLICATION CORE            │
                    │                                     │
   Driving Ports    │    Business Logic / Domain          │    Driven Ports
   (Inbound)        │                                     │    (Outbound)
        │           │         (BUSY Operations)          │           │
        │           │                                     │           │
        ▼           │                                     │           ▼
    ┌───────┐       │                                     │       ┌───────┐
    │  CLI  │◄──────┤                                     ├──────►│ Redis │
    └───────┘       │                                     │       └───────┘
    ┌───────┐       │                                     │       ┌───────┐
    │  API  │◄──────┤                                     ├──────►│Composio│
    └───────┘       │                                     │       └───────┘
    ┌───────┐       │                                     │       ┌───────┐
    │  MCP  │◄──────┤                                     ├──────►│  FS   │
    └───────┘       │                                     │       └───────┘
                    └─────────────────────────────────────┘
```

**Ports:** Abstract interfaces (what)
**Adapters:** Concrete implementations (how)

### BUSY Services as Ports

From our Basic Services:

| Service (Port) | Possible Adapters |
|----------------|-------------------|
| Messaging | Maui, Direct API, CLI output, MCP |
| Events | Redis Streams, In-memory, Webhook |
| Scheduling | APScheduler, Cron, In-memory |
| Persistence | Filesystem, S3, In-memory |
| Appliances | Composio, Direct HTTP, Mock |
| Logging | LangSmith, File, stdout |
| Secrets | Env vars, Vault, AWS Secrets |

### Binding Mechanisms

#### Option 1: Implicit Binding (Convention)

Runtime knows the default adapter:

```
"emit event" → Events service → Redis adapter (Orgata default)
```

**Pros:** Zero configuration for common case
**Cons:** Magic, hard to override

#### Option 2: Explicit Binding (Configuration)

Workspace declares bindings:

```yaml
# .workspace or busy.config.yaml
bindings:
  events: redis          # or: memory, webhook
  persistence: filesystem
  messaging: maui
  appliances: composio
```

**Pros:** Clear, overridable
**Cons:** Boilerplate for common cases

#### Option 3: Contextual Binding (Runtime Decides)

Orgata binds based on context:

```
Production → Redis, Composio, Filesystem
Testing → Memory, Mock, TempFS
CLI → stdout, Memory, Local
```

**Pros:** Same BUSY doc works in all contexts
**Cons:** Implicit behavior changes

### LLM Execution vs Fastpath

You raised this key distinction:

| Execution Mode | How Service Binding Works |
|----------------|--------------------------|
| **LLM (Operations Agent)** | Agent has tools for each service. Tool implementation calls adapter. |
| **Fastpath (Generated Code)** | Generated Python imports adapter library. |

#### LLM Mode

```python
# Operations Agent has tool:
@tool
def emit_event(event_type: str, payload: dict):
    """Emit an event to the event bus."""
    # Adapter is injected by runtime
    adapter = get_adapter("events")
    adapter.emit(event_type, payload)
```

The BUSY step "emit event X" triggers the agent to use this tool.

#### Fastpath Mode

```python
# Generated fastpath code:
from orgata.adapters.events import emit_event

def execute_step_3():
    emit_event("order.completed", {"order_id": order_id})
```

The adapter import is generated based on binding configuration.

### Service Interface Definition

Each service needs a clear interface (port):

```python
# orgata/ports/events.py
from abc import ABC, abstractmethod

class EventsPort(ABC):
    @abstractmethod
    def emit(self, event_type: str, payload: dict) -> None:
        """Emit an event."""
        pass

    @abstractmethod
    def subscribe(self, event_type: str, handler: Callable) -> None:
        """Subscribe to events."""
        pass
```

```python
# orgata/adapters/events/redis.py
class RedisEventsAdapter(EventsPort):
    def emit(self, event_type: str, payload: dict) -> None:
        self.redis.xadd("orgata:events", {"type": event_type, **payload})
```

### BUSY Document Perspective

From BUSY's perspective, services are abstract:

```markdown
## Steps
1. When order is ready, emit event "order.completed"
2. Save order summary to file
3. Send notification to customer
```

BUSY doesn't know or care about Redis, Maui, or Composio. Those are runtime bindings.

### The "Dumb" LLM Fallback

You mentioned:
> "or abstracted to the point where it says 'ah I'm not sure how to do this, but I'll call the tool/appliance agent with emit event x and it'll know what to do'"

This is the delegation pattern:

```python
@tool
def delegate_to_service(service: str, action: str, params: dict):
    """
    Delegate an action to a specialized service agent.
    Use when you're not sure how to do something directly.
    """
    if service == "events":
        return invoke_events_service(action, params)
    elif service == "appliances":
        return invoke_appliance_agent(action, params)
    # etc.
```

The Operations Agent can always fall back to delegation if it doesn't have a direct tool.

---

## Synthesis: Design Direction

Based on this research, here's a coherent direction:

### Core Principles

1. **BUSY is runtime-agnostic** - Documents don't reference Orgata specifics
2. **Links are real URLs** - Markdown-readable, no custom syntax
3. **Validation, not compilation** - `busy check` ensures coherence
4. **Services are ports** - Abstract interfaces bound at runtime
5. **Orgata is one adapter** - Could theoretically run elsewhere

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BUSY ECOSYSTEM                               │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ BUSY Docs   │  │ busy check  │  │ busy-lsp    │                 │
│  │ (Markdown)  │  │ (Validator) │  │ (IDE)       │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │                │                │                         │
│         └────────────────┴────────────────┘                         │
│                          │                                          │
│                          ▼                                          │
│              ┌─────────────────────┐                                │
│              │   Import Resolution  │                                │
│              │   (URL-based)        │                                │
│              └─────────────────────┘                                 │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ORGATA RUNTIME                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Service Binding Layer                     │   │
│  │  Events → Redis    Messaging → Maui    Appliances → Composio │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │ LLM Execution    │  │ Fastpath         │                        │
│  │ (Agent + Tools)  │  │ (Generated Code) │                        │
│  └──────────────────┘  └──────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Roadmap Alignment

| Roadmap Item | This Research Informs |
|--------------|----------------------|
| #1 Imports | URL-based, import maps, validation |
| #2 Logging | Service port + adapter pattern |
| #3 Appliances | Already follows port/adapter |
| #4 Tool Redefinition | Interface abstraction, cross-workspace via URL |
| #5 Secrets | Service port + adapter pattern |

---

## Open Questions for Spec

1. **Import map location?** - Workspace root? `.busy/imports.json`?
2. **Core library hosting?** - GitHub Pages vs dedicated CDN?
3. **Version range syntax?** - SemVer ranges in import map?
4. **LSP scope?** - Phase 1 features?
5. **Offline story?** - Local cache mechanism?
6. **Cross-workspace tools?** - Just URLs, or special handling?

---

## Design Decisions (Confirmed)

### 1. Package Registry Format: `package.busy.md`

A new core BUSY document type for package management:

```markdown
---
Name: workspace-packages
Type: Package
Description: Package registry for this workspace
---

# Package Registry

External imports with version pinning and caching metadata.

---

## Core Library

### emit-event

Event emission tool from BUSY core library.

| Field | Value |
|-------|-------|
| Source | https://busy.dev/core/v1.2.0/tools/emit-event.busy.md |
| Cached | .libraries/core/tools/emit-event.busy.md |
| Version | 1.2.0 |
| Fetched | 2026-01-21T10:30:00Z |
| Integrity | sha256:abc123... |

[View source][emit-event-source] | [Local cache][emit-event-local]

[emit-event-source]: https://busy.dev/core/v1.2.0/tools/emit-event.busy.md
[emit-event-local]: .libraries/core/tools/emit-event.busy.md

---

### mise-en-place

Core concept for preparation methodology.

| Field | Value |
|-------|-------|
| Source | https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md |
| Cached | .libraries/core/concepts/mise-en-place.busy.md |
| Version | 1.2.0 |
| Fetched | 2026-01-21T10:30:00Z |

[View source][mise-source] | [Local cache][mise-local]

[mise-source]: https://busy.dev/core/v1.2.0/concepts/mise-en-place.busy.md
[mise-local]: .libraries/core/concepts/mise-en-place.busy.md

---

## External References

### wikipedia-mise-en-place

Background context from Wikipedia (non-executable reference).

| Field | Value |
|-------|-------|
| URL | https://en.wikipedia.org/wiki/Mise_en_place |
| Type | external |

[View][wiki-mise]

[wiki-mise]: https://en.wikipedia.org/wiki/Mise_en_place
```

**Key features:**
- Standard BUSY format (YAML frontmatter + Markdown body)
- Each package is an H3 section (importable via `package.busy.md#emit-event`)
- Footnote-style links for clean markdown rendering
- Metadata in tables (human + machine readable)
- `.libraries/` for cached content (existing convention)

### 2. Cache Location: `.libraries/`

Existing convention, keeps external content organized:

```
workspace/
├── package.busy.md           # Package registry
├── .libraries/               # Cached external imports
│   ├── core/                 # Core library
│   │   ├── tools/
│   │   │   └── emit-event.busy.md
│   │   └── concepts/
│   │       └── mise-en-place.busy.md
│   └── kitchen-recipes/      # Third-party library
│       └── operations/
│           └── prep-station.busy.md
└── documents/                # Workspace operations
    └── daily-report.busy.md
```

### 3. CLI Commands: `busy package`

Following standard package manager conventions:

| Command | Description | Example |
|---------|-------------|---------|
| `busy package add <url>` | Add package from URL | `busy package add https://busy.dev/core/v1.2.0` |
| `busy package remove <name>` | Remove package | `busy package remove emit-event` |
| `busy package update` | Update registry (fetch latest metadata) | `busy package update` |
| `busy package upgrade <name>` | Upgrade to latest version | `busy package upgrade emit-event` |
| `busy package upgrade --all` | Upgrade all packages | `busy package upgrade --all` |
| `busy package list` | List installed packages | `busy package list` |
| `busy package info <name>` | Show package details | `busy package info emit-event` |
| `busy package check` | Verify integrity of cached packages | `busy package check` |
| `busy package cache clean` | Remove cached packages | `busy package cache clean` |

**Comparison to familiar CLIs:**

| Action | npm | cargo | busy |
|--------|-----|-------|------|
| Add | `npm install` | `cargo add` | `busy package add` |
| Remove | `npm uninstall` | `cargo remove` | `busy package remove` |
| Update metadata | `npm update` | `cargo update` | `busy package update` |
| Upgrade versions | `npm upgrade` | - | `busy package upgrade` |
| List | `npm list` | `cargo tree` | `busy package list` |
| Verify | `npm audit` | - | `busy package check` |

### 4. Import Syntax in BUSY Documents

Using the package registry:

```markdown
---
Name: daily-kitchen-report
Type: Operation
Imports:
  - ./package.busy.md#emit-event
  - ./package.busy.md#mise-en-place
  - ./package.busy.md#wikipedia-mise-en-place
---

# Daily Kitchen Report

Following [mise-en-place][1] principles, prepare the daily summary.

## Steps

1. Gather all station reports
2. Compile summary statistics
3. [Emit event][2] "report.completed" with results

## References

[1]: ./package.busy.md#mise-en-place
[2]: ./package.busy.md#emit-event
```

**Resolution flow:**
1. Parser sees `./package.busy.md#emit-event`
2. Looks up `#emit-event` section in package.busy.md
3. Resolves to `.libraries/core/tools/emit-event.busy.md` (cached)
4. Falls back to source URL if cache missing

### 5. Validation: `busy check`

Coherence validation (not compilation):

```bash
$ busy check

Checking workspace...

package.busy.md
  ✓ emit-event - cached, integrity verified
  ✓ mise-en-place - cached, integrity verified
  ⚠ wikipedia-mise-en-place - external reference (not cached)

documents/daily-report.busy.md
  ✓ Import: ./package.busy.md#emit-event → resolved
  ✓ Import: ./package.busy.md#mise-en-place → resolved
  ✓ Link: [mise-en-place][1] → resolved
  ✓ Link: [Emit event][2] → resolved

Summary:
  Files: 2
  Imports: 3 resolved, 0 broken
  Links: 2 resolved, 0 broken
  Packages: 2 cached, 1 external

✓ Workspace is coherent
```

---

## Next Steps

1. Review this research
2. Make decisions on open questions
3. Proceed to spec writing with clear direction
