# BUSY Import Mechanism - Task Breakdown

> **Spec:** [spec.md](./spec.md)
> **Status:** Ready for Implementation
> **Standalone:** Yes - No Orgata dependencies

---

## Task Groups

| Group | Description | Tasks | Dependencies |
|-------|-------------|-------|--------------|
| 1 | Project Setup | 3 | None |
| 2 | Core Parser | 4 | Group 1 |
| 3 | Provider System | 4 | Group 1 |
| 4 | Package Manager | 5 | Groups 2, 3 |
| 5 | Validation | 3 | Groups 2, 4 |
| 6 | CLI | 5 | Groups 4, 5 |
| 7 | E2E Tests | 3 | Group 6 |

---

## Group 1: Project Setup

### Task 1.1: Initialize Python Package

**Description:** Create the `busy` Python package structure with pyproject.toml.

**Files:**
- `busy/pyproject.toml`
- `busy/busy/__init__.py`
- `busy/busy/py.typed`
- `busy/README.md`

**Acceptance Criteria:**
- [ ] `pip install -e .` works
- [ ] Package importable: `import busy`
- [ ] Dependencies: click, requests, pyyaml

---

### Task 1.2: Create Data Models

**Description:** Define dataclasses for PackageEntry, ExternalReference, ParsedURL, ResolvedLink.

**Files:**
- `busy/busy/models.py`

**Acceptance Criteria:**
- [ ] All models from spec section 7 implemented
- [ ] Type hints complete
- [ ] Serialization to/from dict

---

### Task 1.3: Create Exception Hierarchy

**Description:** Define BusyError and subclasses.

**Files:**
- `busy/busy/exceptions.py`

**Acceptance Criteria:**
- [ ] BusyError base class
- [ ] PackageNotFoundError
- [ ] FetchError
- [ ] ValidationError

---

## Group 2: Core Parser

### Task 2.1: Markdown Link Extractor

**Description:** Extract all links from markdown content.

**Files:**
- `busy/busy/parser.py`
- `busy/tests/test_parser.py`

**Acceptance Criteria:**
- [ ] Extract inline links: `[text](url)`
- [ ] Extract reference links: `[text][ref]`
- [ ] Return Link objects with text, url, line number

---

### Task 2.2: YAML Frontmatter Parser

**Description:** Parse YAML frontmatter from BUSY documents.

**Files:**
- `busy/busy/parser.py`
- `busy/tests/test_parser.py`

**Acceptance Criteria:**
- [ ] Extract frontmatter between `---` markers
- [ ] Parse to dict
- [ ] Return remaining markdown content

---

### Task 2.3: Package Registry Parser

**Description:** Parse package.busy.md into entries.

**Files:**
- `busy/busy/parser.py`
- `busy/tests/test_parser.py`

**Acceptance Criteria:**
- [ ] Parse H2 categories
- [ ] Parse H3 entry headers (IDs)
- [ ] Extract table fields (Source, Provider, etc.)
- [ ] Distinguish Package Entry vs External Reference

---

### Task 2.4: Package Registry Writer

**Description:** Write/update package.busy.md entries.

**Files:**
- `busy/busy/parser.py`
- `busy/tests/test_parser.py`

**Acceptance Criteria:**
- [ ] Add new entry under correct category
- [ ] Update existing entry
- [ ] Remove entry
- [ ] Preserve Definitions section

---

## Group 3: Provider System

### Task 3.1: Provider Base Interface

**Description:** Define Provider protocol and registry.

**Files:**
- `busy/busy/providers/__init__.py`
- `busy/busy/providers/base.py`

**Acceptance Criteria:**
- [ ] Provider Protocol defined
- [ ] ProviderRegistry with registration/lookup
- [ ] Auto-detect provider from URL

---

### Task 3.2: GitHub Provider

**Description:** Implement GitHub URL handling.

**Files:**
- `busy/busy/providers/github.py`
- `busy/tests/test_providers.py`

**Acceptance Criteria:**
- [ ] Parse github.com/org/repo/blob/ref/path URLs
- [ ] Convert to raw.githubusercontent.com URLs
- [ ] Fetch latest tag via GitHub API
- [ ] Handle #anchor in URL

---

### Task 3.3: GitLab Provider

**Description:** Implement GitLab URL handling.

**Files:**
- `busy/busy/providers/gitlab.py`
- `busy/tests/test_providers.py`

**Acceptance Criteria:**
- [ ] Parse gitlab.com URLs
- [ ] Convert to raw URLs
- [ ] Fetch latest tag

---

### Task 3.4: Generic URL Provider

**Description:** Implement fallback for generic URLs.

**Files:**
- `busy/busy/providers/url.py`
- `busy/tests/test_providers.py`

**Acceptance Criteria:**
- [ ] Handle any HTTP(S) URL
- [ ] No version resolution (explicit only)
- [ ] Direct fetch

---

## Group 4: Package Manager

### Task 4.1: Cache Manager

**Description:** Manage .libraries/ cache directory.

**Files:**
- `busy/busy/cache.py`
- `busy/tests/test_cache.py`

**Acceptance Criteria:**
- [ ] Write file to cache (preserving path structure)
- [ ] Read file from cache
- [ ] Delete file from cache
- [ ] Clean entire cache
- [ ] Calculate SHA256 integrity hash

---

### Task 4.2: Package Add

**Description:** Add package from URL to registry.

**Files:**
- `busy/busy/manager.py`
- `busy/tests/test_manager.py`

**Acceptance Criteria:**
- [ ] Parse URL with provider
- [ ] Fetch raw content
- [ ] Save to .libraries/
- [ ] Add entry to package.busy.md
- [ ] Derive entry ID from URL

---

### Task 4.3: Package Remove

**Description:** Remove package from registry.

**Files:**
- `busy/busy/manager.py`
- `busy/tests/test_manager.py`

**Acceptance Criteria:**
- [ ] Remove entry from package.busy.md
- [ ] Delete cached file
- [ ] Warn if still referenced

---

### Task 4.4: Package Upgrade

**Description:** Upgrade package to latest version.

**Files:**
- `busy/busy/manager.py`
- `busy/tests/test_manager.py`

**Acceptance Criteria:**
- [ ] Query provider for latest version
- [ ] Compare with current version
- [ ] Fetch new version if different
- [ ] Update cache and registry entry

---

### Task 4.5: Package List/Info

**Description:** List packages and show details.

**Files:**
- `busy/busy/manager.py`
- `busy/tests/test_manager.py`

**Acceptance Criteria:**
- [ ] List all packages with summary
- [ ] Show detailed info for single package
- [ ] Find references to package in documents

---

## Group 5: Validation

### Task 5.1: Link Resolver

**Description:** Resolve links to targets.

**Files:**
- `busy/busy/resolver.py`
- `busy/tests/test_resolver.py`

**Acceptance Criteria:**
- [ ] Resolve package links (./package.busy.md#id)
- [ ] Resolve relative links (./path/file.md)
- [ ] Identify external links
- [ ] Return ResolvedLink with type and target

---

### Task 5.2: Coherence Validator

**Description:** Validate workspace coherence.

**Files:**
- `busy/busy/validator.py`
- `busy/tests/test_validator.py`

**Acceptance Criteria:**
- [ ] Check all package entries have cached files
- [ ] Check all links in documents resolve
- [ ] Check integrity hashes match
- [ ] Report errors with file:line:col

---

### Task 5.3: External Link Checker

**Description:** Validate external URLs are reachable.

**Files:**
- `busy/busy/validator.py`
- `busy/tests/test_validator.py`

**Acceptance Criteria:**
- [ ] HEAD request to external URLs
- [ ] Report non-200 status
- [ ] --skip-external flag support

---

## Group 6: CLI

### Task 6.1: CLI Entry Point

**Description:** Create busy CLI with click.

**Files:**
- `busy/busy/cli.py`
- `busy/pyproject.toml` (add entry point)

**Acceptance Criteria:**
- [ ] `busy --help` works
- [ ] `busy --version` works
- [ ] Subcommand groups: init, check, package

---

### Task 6.2: busy init Command

**Description:** Initialize workspace.

**Files:**
- `busy/busy/cli.py`

**Acceptance Criteria:**
- [ ] Create package.busy.md with Definitions section
- [ ] Create .libraries/ directory
- [ ] Idempotent (don't overwrite existing)

---

### Task 6.3: busy check Command

**Description:** Validate workspace.

**Files:**
- `busy/busy/cli.py`

**Acceptance Criteria:**
- [ ] Run all validation checks
- [ ] --skip-external flag
- [ ] --verbose flag
- [ ] Exit code 0/1/2

---

### Task 6.4: busy package Commands

**Description:** Package management subcommands.

**Files:**
- `busy/busy/cli.py`

**Acceptance Criteria:**
- [ ] `busy package add <url>`
- [ ] `busy package remove <name>`
- [ ] `busy package upgrade <name>`
- [ ] `busy package upgrade --all`
- [ ] `busy package list`
- [ ] `busy package info <name>`
- [ ] `busy package cache clean`

---

### Task 6.5: Output Formatting

**Description:** Consistent CLI output with colors.

**Files:**
- `busy/busy/cli.py`
- `busy/busy/output.py`

**Acceptance Criteria:**
- [ ] Success messages in green
- [ ] Errors in red
- [ ] Warnings in yellow
- [ ] Tables formatted
- [ ] NO_COLOR environment variable support

---

## Group 7: E2E Tests

### Task 7.1: Workspace Setup E2E

**Description:** Test full workspace initialization flow.

**Files:**
- `busy/tests/e2e/test_workspace_setup.py`

**Acceptance Criteria:**
- [ ] `busy init` creates structure
- [ ] `busy package add` fetches and caches
- [ ] `busy check` passes

---

### Task 7.2: Package Lifecycle E2E

**Description:** Test add/upgrade/remove flow.

**Files:**
- `busy/tests/e2e/test_package_lifecycle.py`

**Acceptance Criteria:**
- [ ] Add package from busy-lang repo
- [ ] Upgrade to latest
- [ ] Remove package
- [ ] Verify cache state

---

### Task 7.3: Validation E2E

**Description:** Test error detection and reporting.

**Files:**
- `busy/tests/e2e/test_validation.py`

**Acceptance Criteria:**
- [ ] Detect broken package links
- [ ] Detect broken relative links
- [ ] Detect missing cache files
- [ ] Verify exit codes

---

## Progress Tracking

| Task | Status | Notes |
|------|--------|-------|
| 1.1 | ⬜ Pending | |
| 1.2 | ⬜ Pending | |
| 1.3 | ⬜ Pending | |
| 2.1 | ⬜ Pending | |
| 2.2 | ⬜ Pending | |
| 2.3 | ⬜ Pending | |
| 2.4 | ⬜ Pending | |
| 3.1 | ⬜ Pending | |
| 3.2 | ⬜ Pending | |
| 3.3 | ⬜ Pending | |
| 3.4 | ⬜ Pending | |
| 4.1 | ⬜ Pending | |
| 4.2 | ⬜ Pending | |
| 4.3 | ⬜ Pending | |
| 4.4 | ⬜ Pending | |
| 4.5 | ⬜ Pending | |
| 5.1 | ⬜ Pending | |
| 5.2 | ⬜ Pending | |
| 5.3 | ⬜ Pending | |
| 6.1 | ⬜ Pending | |
| 6.2 | ⬜ Pending | |
| 6.3 | ⬜ Pending | |
| 6.4 | ⬜ Pending | |
| 6.5 | ⬜ Pending | |
| 7.1 | ⬜ Pending | |
| 7.2 | ⬜ Pending | |
| 7.3 | ⬜ Pending | |

**Total:** 27 tasks across 7 groups
