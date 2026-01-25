---
Name: Document
Type: [Document]
Description: Base document type for all BUSY documents.
---
# [Imports]

[Concept]: ./concept.busy.md

# [Local Definitions]

## Imports Section
Section where external document references are declared.

## Local Definitions Section
Section where local concepts are defined.

## Setup Section
Section containing prerequisites and initialization.

## Operations Section
Section containing callable operations.

# [Setup]

A document must be evaluated before any operations can be executed.

# [Operations]

## EvaluateDocument

Load and evaluate a BUSY document.

### [Steps]
1. Parse frontmatter for metadata
2. Resolve all imports
3. Load local definitions
4. Execute setup section

### [Checklist]
- Frontmatter parsed
- Imports resolved
- Definitions loaded
- Setup executed
