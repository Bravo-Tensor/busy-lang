"""BUSY v2 document writer.

This module provides functionality to serialize BUSY v2 Pydantic models back to
markdown format, complementing the parser. The writer ensures round-trip
compatibility and proper formatting.
"""

from pathlib import Path
from typing import Optional

import yaml

from orgata.busy.exceptions import BusyValidationError
from orgata.busy.models import (
    Checklist,
    Import,
    LocalDefinition,
    Metadata,
    Operation,
    BusyDocument,
    Step,
)
from orgata.workspace import Workspace, get_current_workspace


def _serialize_metadata(metadata: Metadata) -> str:
    """Serialize metadata to YAML frontmatter.

    Args:
        metadata: Metadata object to serialize

    Returns:
        YAML frontmatter string with --- fences

    Examples:
        >>> metadata = Metadata(name="Test", type="[Document]", description="Test doc")
        >>> result = _serialize_metadata(metadata)
        >>> "Name: Test" in result
        True
    """
    # Build metadata dictionary
    data = {
        "Name": metadata.name,
        "Type": metadata.type,
        "Description": metadata.description,
    }

    # Serialize to YAML
    yaml_content = yaml.safe_dump(data, default_flow_style=False, sort_keys=False)

    # Wrap in --- fences
    return f"---\n{yaml_content}---\n"


def _serialize_imports(imports: list[Import]) -> str:
    """Serialize imports to reference-style markdown links.

    Args:
        imports: List of Import objects to serialize

    Returns:
        Reference-style markdown links string, empty if no imports

    Examples:
        >>> import_ref = Import(concept_name="Operation", path="./op.busy.md")
        >>> result = _serialize_imports([import_ref])
        >>> "[Operation]: ./op.busy.md" in result
        True
    """
    if not imports:
        return ""

    lines = []
    for import_ref in imports:
        if import_ref.anchor:
            lines.append(f"[{import_ref.concept_name}]: {import_ref.path}#{import_ref.anchor}")
        else:
            lines.append(f"[{import_ref.concept_name}]: {import_ref.path}")

    return "\n".join(lines) + "\n"


def _serialize_local_definitions(definitions: list[LocalDefinition]) -> str:
    """Serialize local definitions section.

    Args:
        definitions: List of LocalDefinition objects to serialize

    Returns:
        Markdown section for local definitions, empty if no definitions

    Examples:
        >>> defn = LocalDefinition(name="Capability", content="A system feature")
        >>> result = _serialize_local_definitions([defn])
        >>> "# Local Definitions" in result
        True
        >>> "## Capability" in result
        True
    """
    if not definitions:
        return ""

    lines = ["# Local Definitions\n"]

    for defn in definitions:
        lines.append(f"## {defn.name}\n")
        lines.append(f"{defn.content}\n")

    return "\n".join(lines)


def _serialize_setup(setup: Optional[str]) -> str:
    """Serialize setup section.

    Args:
        setup: Optional setup content

    Returns:
        Markdown section for setup, empty if no setup

    Examples:
        >>> result = _serialize_setup("Initialize the environment")
        >>> "# Setup" in result
        True
    """
    if not setup:
        return ""

    return f"# Setup\n\n{setup}\n"


def _serialize_steps(steps: list[Step]) -> str:
    """Serialize operation steps.

    Args:
        steps: List of Step objects to serialize

    Returns:
        Markdown formatted steps section

    Examples:
        >>> step = Step(step_number=1, instruction="Do something")
        >>> result = _serialize_steps([step])
        >>> "1. Do something" in result
        True
    """
    if not steps:
        return ""

    lines = ["### Steps\n"]

    for step in steps:
        lines.append(f"{step.step_number}. {step.instruction}")

    return "\n".join(lines) + "\n"


def _serialize_checklist(checklist: Optional[Checklist]) -> str:
    """Serialize operation checklist.

    Args:
        checklist: Optional Checklist object to serialize

    Returns:
        Markdown formatted checklist section, empty if no checklist

    Examples:
        >>> checklist = Checklist(items=["Task complete", "Tests pass"])
        >>> result = _serialize_checklist(checklist)
        >>> "### Checklist" in result
        True
        >>> "- Task complete" in result
        True
    """
    if not checklist or not checklist.items:
        return ""

    lines = ["### Checklist\n"]

    for item in checklist.items:
        lines.append(f"- {item}")

    return "\n".join(lines) + "\n"


def _serialize_operation(operation: Operation) -> str:
    """Serialize a single operation.

    Args:
        operation: Operation object to serialize

    Returns:
        Markdown formatted operation section

    Examples:
        >>> op = Operation(name="Execute", inputs=["data"], outputs=["result"], steps=[])
        >>> result = _serialize_operation(op)
        >>> "## Execute" in result
        True
    """
    lines = [f"## {operation.name}\n"]

    # Serialize inputs
    if operation.inputs:
        lines.append("### Inputs\n")
        for input_item in operation.inputs:
            lines.append(f"- {input_item}")
        lines.append("")

    # Serialize outputs
    if operation.outputs:
        lines.append("### Outputs\n")
        for output_item in operation.outputs:
            lines.append(f"- {output_item}")
        lines.append("")

    # Serialize steps
    if operation.steps:
        lines.append(_serialize_steps(operation.steps))

    # Serialize checklist
    if operation.checklist:
        lines.append(_serialize_checklist(operation.checklist))

    return "\n".join(lines)


def _serialize_operations(operations: list[Operation]) -> str:
    """Serialize operations section.

    Args:
        operations: List of Operation objects to serialize

    Returns:
        Markdown section for operations, empty if no operations

    Examples:
        >>> op = Operation(name="Test", inputs=[], outputs=[], steps=[])
        >>> result = _serialize_operations([op])
        >>> "# Operations" in result
        True
    """
    if not operations:
        return ""

    lines = ["# Operations\n"]

    for operation in operations:
        lines.append(_serialize_operation(operation))

    return "\n".join(lines)


def write_busy_document(
    parsed_doc: BusyDocument,
    path: Path,
    workspace: Optional[Workspace] = None
) -> None:
    """Write a BusyDocument to a BUSY v2 markdown file.

    This function serializes a BusyDocument Pydantic model back to BUSY v2
    markdown format, ensuring round-trip compatibility with the parser.
    Uses the workspace backend for file operations to maintain abstraction.

    Args:
        parsed_doc: BusyDocument object to serialize
        path: Path where the BUSY document should be written (can be absolute or relative to workspace)
        workspace: Optional workspace instance. If None, uses get_current_workspace()

    Raises:
        BusyValidationError: If the document structure is invalid
        ValueError: If no workspace context is active

    Examples:
        >>> from orgata.busy.models import Metadata, BusyDocument
        >>> metadata = Metadata(
        ...     name="TestOp",
        ...     type="[Operation]",
        ...     description="Test operation"
        ... )
        >>> doc = BusyDocument(
        ...     metadata=metadata,
        ...     imports=[],
        ...     definitions=[],
        ...     setup=None,
        ...     operations=[]
        ... )
        >>> with workspace.execution_context():
        ...     write_busy_document(doc, Path("documents/test.busy.md"))
    """
    # Get workspace if not provided
    if workspace is None:
        workspace = get_current_workspace()
        if workspace is None:
            raise ValueError("No active workspace context. Call within workspace.execution_context()")

    # Validate that we have required metadata
    if not parsed_doc.metadata:
        raise BusyValidationError("Document missing metadata")

    if not parsed_doc.metadata.name:
        raise BusyValidationError("Document metadata missing Name field")

    if not parsed_doc.metadata.type:
        raise BusyValidationError("Document metadata missing Type field")

    if not parsed_doc.metadata.description:
        raise BusyValidationError("Document metadata missing Description field")

    # Build document sections
    sections = []

    # Metadata (frontmatter)
    sections.append(_serialize_metadata(parsed_doc.metadata))

    # Imports
    if parsed_doc.imports:
        sections.append(_serialize_imports(parsed_doc.imports))

    # Local Definitions
    if parsed_doc.definitions:
        sections.append(_serialize_local_definitions(parsed_doc.definitions))

    # Setup
    if parsed_doc.setup:
        sections.append(_serialize_setup(parsed_doc.setup))

    # Operations
    if parsed_doc.operations:
        sections.append(_serialize_operations(parsed_doc.operations))

    # Combine sections with proper spacing
    content = "\n".join(sections)

    # Convert path to string relative to workspace
    # If path is absolute and starts with workspace backend_path, make it relative
    path_str = str(path)
    backend_path = str(workspace.backend_path)
    if path_str.startswith(backend_path):
        # Remove backend path and leading slash
        path_str = path_str[len(backend_path):].lstrip("/")

    # Write using workspace backend (handles directory creation automatically)
    workspace.backend.write(path_str, content)
