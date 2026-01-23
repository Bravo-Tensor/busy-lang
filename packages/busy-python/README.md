# BUSY Document Parser

Universal parser for BUSY v2 documents (operations, tools, playbooks, concepts).

## Overview

The BUSY parser provides a structured way to parse and validate BUSY v2 markdown documents. It handles:

- YAML metadata extraction and validation
- Import resolution with cycle detection
- Local definitions parsing
- Optional setup sections
- Operations with inputs, outputs, steps, and checklists

## Installation

The parser is included in the orgata package:

```python
from orgata.busy import parse_document, resolve_imports
```

## Basic Usage

### Parsing a Document

```python
from orgata.busy import parse_document

# Read BUSY document
with open("playbook.busy.md", "r") as f:
    content = f.read()

# Parse document
doc = parse_document(content)

# Access parsed sections
print(f"Name: {doc.metadata.name}")
print(f"Type: {doc.metadata.type}")
print(f"Imports: {len(doc.imports)}")
print(f"Operations: {len(doc.operations)}")
```

### Resolving Imports

```python
from pathlib import Path
from orgata.busy import parse_document, resolve_imports

# Parse main document
content = Path("playbook.busy.md").read_text()
doc = parse_document(content)

# Resolve all imports recursively
base_path = Path("playbook.busy.md").parent
resolved = resolve_imports(doc, base_path)

# Access imported documents
for concept_name, imported_doc in resolved.items():
    print(f"{concept_name}: {imported_doc.metadata.name}")
```

## Document Structure

BUSY v2 documents follow this structure:

```markdown
---
Name: DocumentName
Type: [DocumentType]
Description: Brief description
---
# [Imports]

[ConceptName]:./path/to/file.md
[OtherConcept]:./path/to/file.md#anchor

# [Local Definitions]

## DefinitionName
Definition content here.

# [Setup]

Optional setup instructions.

# [Operations]

## OperationName

### [Input]
- input_param: Description

### [Steps]
1. First step
2. Second step

### [Output]
- output_param: Description

### [Checklist]
- Verification item 1
- Verification item 2
```

## Data Models

### BusyDocument

Main document structure containing all parsed sections:

```python
@dataclass
class BusyDocument:
    metadata: Metadata
    imports: list[Import]
    definitions: list[LocalDefinition]
    setup: Optional[str]
    operations: list[Operation]
```

### Metadata

Document metadata:

```python
@dataclass
class Metadata:
    name: str
    type: str  # With bracket notation, e.g., "[Operation]"
    description: str
```

### Import

Import reference:

```python
@dataclass
class Import:
    concept_name: str
    path: str
    anchor: Optional[str]  # Optional anchor within document
```

### Operation

Operation definition:

```python
@dataclass
class Operation:
    name: str
    inputs: list[str]
    outputs: list[str]
    steps: list[Step]
    checklist: Optional[Checklist]
```

## Error Handling

The parser raises specific exceptions for different error conditions:

```python
from orgata.busy import parse_document
from orgata.busy.exceptions import (
    BusyError,
    BusyParseError,
    BusyImportError,
    BusyValidationError
)

try:
    doc = parse_document(content)
except BusyValidationError as e:
    # Missing required fields or invalid metadata
    print(f"Validation error: {e}")
except BusyImportError as e:
    # Import cannot be resolved
    print(f"Import error: {e}")
except BusyParseError as e:
    # Document structure is malformed
    print(f"Parse error: {e}")
except BusyError as e:
    # Catch all BUSY errors
    print(f"BUSY error: {e}")
```

### Exception Hierarchy

- `BusyError` (base exception)
  - `BusyParseError` - Malformed document structure
  - `BusyImportError` - Import resolution failed
  - `BusyValidationError` - Validation failed

## Advanced Features

### Import Resolution with Cycle Detection

The parser automatically detects circular imports:

```python
from orgata.busy import resolve_imports
from orgata.busy.exceptions import BusyImportError

try:
    resolved = resolve_imports(doc, base_path)
except BusyImportError as e:
    if "circular" in str(e).lower():
        print("Circular import detected!")
```

### Anchor Validation

Import anchors are validated against operations and definitions:

```python
# This import will be validated
[ConceptName]:./file.md#operation-name

# Parser checks that the anchor exists in the imported document
```

### JSON Serialization

All parsed documents can be serialized to JSON:

```python
doc = parse_document(content)

# Serialize to JSON string
json_str = doc.model_dump_json(indent=2)

# Or to dictionary
data_dict = doc.model_dump(mode="json")
```

## Type Safety

All models use Pydantic for validation and are fully type-hinted for mypy compatibility:

```python
from orgata.busy import BusyDocument, Metadata

# Type hints are enforced
doc: BusyDocument = parse_document(content)
name: str = doc.metadata.name
```

## Examples

See the test fixtures in `tests/fixtures/busy/` for complete examples of valid BUSY documents.

## Reference

For the complete BUSY v2 specification, see the `busy-v2/` directory in the repository.

## TODO
* provide API for BusyParser and Writer tool. 
* Parse/Generate should have no side effects (i.e. content to object, object to content)
* Write/Read/Execute is Workspace aware tool
