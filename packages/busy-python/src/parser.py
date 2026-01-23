"""BUSY v2 document parser."""

import re
from pathlib import Path
from typing import Any, Optional

import yaml

from orgata.busy.exceptions import (
    BusyImportError,
    BusyParseError,
    BusyValidationError,
)
from orgata.busy.models import (
    Checklist,
    Import,
    LocalDefinition,
    Metadata,
    Operation,
    BusyDocument,
    Step,
    Tool,
    Trigger,
    ToolDocument,
)

#TODO: add markdown link parsing in any section. Use to reference other content.

def _extract_metadata(content: str) -> tuple[Metadata, str, dict[str, Any]]:
    """Extract YAML metadata from document frontmatter.

    Args:
        content: Document content

    Returns:
        Tuple of (Metadata, remaining content, raw YAML data)

    Raises:
        BusyValidationError: If metadata is missing or invalid
    """
    # Match frontmatter between --- fences
    pattern = r"^---\s*\n(.*?)\n---\s*\n(.*)$"
    match = re.match(pattern, content, re.DOTALL)

    if not match:
        raise BusyValidationError("Document missing metadata section (YAML frontmatter with --- fences)")

    yaml_content = match.group(1)
    remaining_content = match.group(2)

    try:
        data = yaml.safe_load(yaml_content)
    except yaml.YAMLError as e:
        raise BusyValidationError(f"Invalid YAML in frontmatter: {e}") from e

    if not isinstance(data, dict):
        raise BusyValidationError("Document metadata must be a YAML dictionary")

    # Validate required fields
    required_fields = ["Name", "Type", "Description"]
    for field in required_fields:
        if field not in data:
            raise BusyValidationError(f"Missing required field '{field}' in document metadata")

    # Handle Type field - YAML might parse [Document] as a list
    type_value = data["Type"]
    if isinstance(type_value, list):
        # Convert list back to bracket notation string
        type_value = f"[{type_value[0]}]" if type_value else "[]"

    # Extract optional Provider field for tool documents
    provider = data.get("Provider")

    try:
        metadata = Metadata(
            name=data["Name"],
            type=type_value,
            description=data["Description"],
            provider=provider
        )
    except Exception as e:
        raise BusyValidationError(f"Invalid metadata data: {e}") from e

    return metadata, remaining_content, data


def _parse_imports(content: str) -> list[Import]:
    """Parse imports section from document.

    Args:
        content: Document content after frontmatter

    Returns:
        List of Import objects
    """
    imports = []

    # Match reference-style links: [ConceptName]: path or [ConceptName]: path#anchor
    pattern = r"\[([^\]]+)\]:\s*([^\s#]+)(?:#([^\s]+))?"

    for match in re.finditer(pattern, content):
        concept_name = match.group(1)
        path = match.group(2)
        anchor = match.group(3) if match.group(3) else None

        imports.append(Import(concept_name=concept_name, path=path, anchor=anchor))

    return imports


def _parse_local_definitions(content: str) -> list[LocalDefinition]:
    """Parse local definitions section from document.

    Args:
        content: Document content

    Returns:
        List of LocalDefinition objects
    """
    definitions: list[LocalDefinition] = []

    # Find the Local Definitions section (handle reference-style links)
    local_def_pattern = r"#\s+(?:\[Local Definitions\]|Local Definitions)\s*\n(.*?)(?=\n#\s+|\Z)"
    match = re.search(local_def_pattern, content, re.DOTALL)

    if not match:
        return definitions

    section_content = match.group(1)

    # Extract level-2 headings and their content
    heading_pattern = r"##\s+([^\n]+)\n(.*?)(?=\n##\s+|\Z)"
    for heading_match in re.finditer(heading_pattern, section_content, re.DOTALL):
        name = heading_match.group(1).strip()
        # Remove brackets if this is a reference-style link
        name = re.sub(r"^\[(.+)\]$", r"\1", name)
        definition_content = heading_match.group(2).strip()

        definitions.append(LocalDefinition(name=name, content=definition_content))

    return definitions


def _parse_setup(content: str) -> Optional[str]:
    """Parse setup section from document.

    Args:
        content: Document content

    Returns:
        Setup section content or None if not present
    """
    # Find the Setup section (handle reference-style links)
    setup_pattern = r"#\s+(?:\[Setup\]|Setup)\s*\n(.*?)(?=\n#\s+|\Z)"
    match = re.search(setup_pattern, content, re.DOTALL)

    if not match:
        return None

    return match.group(1).strip()


def _find_code_fence_regions(content: str) -> list[tuple[int, int]]:
    """Find all code fence regions in content.

    Args:
        content: Text content to search

    Returns:
        List of (start_pos, end_pos) tuples for each code fence region
    """
    regions = []
    fence_pattern = r"^```[^\n]*\n(.*?)^```"

    for match in re.finditer(fence_pattern, content, re.DOTALL | re.MULTILINE):
        regions.append((match.start(), match.end()))

    return regions


def _is_position_in_code_fence(pos: int, fence_regions: list[tuple[int, int]]) -> bool:
    """Check if a position falls within any code fence region.

    Args:
        pos: Position to check
        fence_regions: List of (start, end) tuples

    Returns:
        True if position is within a code fence
    """
    for start, end in fence_regions:
        if start <= pos < end:
            return True
    return False


def _parse_tools_section(content: str) -> list[Tool]:
    """Parse tools section from tool document.

    Args:
        content: Document content

    Returns:
        List of Tool objects

    Raises:
        BusyValidationError: If tool definitions are malformed
    """
    tools: list[Tool] = []

    # Find the Operations section
    tools_pattern = r"#\s+(?:\[Operations?\]|Operations?)\s*\n(.*)$"
    match = re.search(tools_pattern, content, re.DOTALL)

    if not match:
        return tools

    section_content = match.group(1)

    # Find all code fence regions to exclude them from tool parsing
    fence_regions = _find_code_fence_regions(section_content)

    # Find all ## headings (tool names) not in code fences
    tool_boundaries: list[tuple[int, str]] = []
    heading_pattern = r"^##\s+([^\n]+)"
    for heading_match in re.finditer(heading_pattern, section_content, re.MULTILINE):
        if not _is_position_in_code_fence(heading_match.start(), fence_regions):
            name = heading_match.group(1).strip()
            # Remove brackets if this is a reference-style link
            name = re.sub(r"^\[(.+)\]$", r"\1", name)
            tool_boundaries.append((heading_match.start(), name))

    # Extract tool content between boundaries
    for i, (start_pos, name) in enumerate(tool_boundaries):
        # Find the end position (start of next tool or end of content)
        if i + 1 < len(tool_boundaries):
            end_pos = tool_boundaries[i + 1][0]
        else:
            end_pos = len(section_content)

        # Extract the tool content
        tool_content = section_content[start_pos:end_pos]
        # Remove the tool heading line itself
        tool_content = re.sub(r"^##\s+[^\n]+\n", "", tool_content, count=1)
        tool_content = tool_content.strip()

        # Parse description (first paragraph before any subsection)
        desc_pattern = r"^(.*?)(?=\n###\s+|\Z)"
        desc_match = re.search(desc_pattern, tool_content, re.DOTALL)
        description = desc_match.group(1).strip() if desc_match else ""

        if not description:
            raise BusyValidationError(f"Tool '{name}' missing description")

        # Parse inputs
        inputs = []
        inputs_pattern = r"###\s+(?:\[Inputs?\]|Inputs?)\s*\n(.*?)(?=\n###\s+|\Z)"
        inputs_match = re.search(inputs_pattern, tool_content, re.DOTALL)
        if inputs_match:
            input_text = inputs_match.group(1)
            # Extract list items
            for line in input_text.split("\n"):
                line = line.strip()
                if line.startswith("-") or line.startswith("*"):
                    inputs.append(line.lstrip("-*").strip())

        # Parse outputs
        outputs = []
        outputs_pattern = r"###\s+(?:\[Outputs?\]|Outputs?)\s*\n(.*?)(?=\n###\s+|\Z)"
        outputs_match = re.search(outputs_pattern, tool_content, re.DOTALL)
        if outputs_match:
            output_text = outputs_match.group(1)
            # Extract list items
            for line in output_text.split("\n"):
                line = line.strip()
                if line.startswith("-") or line.startswith("*"):
                    outputs.append(line.lstrip("-*").strip())

        # Parse examples
        examples = []
        examples_pattern = r"###\s+(?:\[Examples?\]|Examples?)\s*\n(.*?)(?=\n###\s+|\Z)"
        examples_match = re.search(examples_pattern, tool_content, re.DOTALL)
        if examples_match:
            example_text = examples_match.group(1)
            # Extract list items or code blocks
            for line in example_text.split("\n"):
                line = line.strip()
                if line.startswith("-") or line.startswith("*"):
                    examples.append(line.lstrip("-*").strip())

        # Parse providers
        providers = {}
        providers_pattern = r"###\s+(?:\[Providers?\]|Providers?)\s*\n(.*?)(?=\n##\s+|\Z)"
        providers_match = re.search(providers_pattern, tool_content, re.DOTALL)
        if providers_match:
            providers_text = providers_match.group(1)
            # Find all #### provider headings
            provider_heading_pattern = r"####\s+([^\n]+)\n(.*?)(?=\n####\s+|\Z)"
            for prov_match in re.finditer(provider_heading_pattern, providers_text, re.DOTALL):
                provider_name = prov_match.group(1).strip()
                provider_content = prov_match.group(2).strip()

                # Parse Action and Parameters
                action_match = re.search(r"Action:\s*([^\n]+)", provider_content)
                action = action_match.group(1).strip() if action_match else None

                # Parse Parameters as key-value pairs
                parameters = {}
                params_match = re.search(r"Parameters:\s*\n(.*?)(?=\n(?:Action|####)|\Z)", provider_content, re.DOTALL)
                if params_match:
                    params_text = params_match.group(1)
                    for line in params_text.split("\n"):
                        line = line.strip()
                        if ":" in line:
                            key, value = line.split(":", 1)
                            parameters[key.strip()] = value.strip()

                providers[provider_name] = {
                    "action": action,
                    "parameters": parameters if parameters else None
                }

        tools.append(
            Tool(
                name=name,
                description=description,
                inputs=inputs,
                outputs=outputs,
                examples=examples if examples else None,
                providers=providers if providers else None,
            )
        )

    return tools


def _parse_operations(content: str) -> list[Operation]:
    """Parse operations section from document.

    Args:
        content: Document content

    Returns:
        List of Operation objects
    """
    operations: list[Operation] = []

    # Find the Operations section (handle reference-style links)
    # Operations is the last section in BUSY v2, so extract until end of document
    # Use greedy matching to capture all content including embedded markdown headings
    operations_pattern = r"#\s+(?:\[Operations\]|Operations)\s*\n(.*)$"
    match = re.search(operations_pattern, content, re.DOTALL)

    if not match:
        return operations

    section_content = match.group(1)

    # Find all code fence regions in the section to exclude them from operation parsing
    fence_regions = _find_code_fence_regions(section_content)

    # Find all ## headings and filter to only those not in code fences
    operation_boundaries: list[tuple[int, str]] = []  # (position, name)
    heading_pattern = r"^##\s+([^\n]+)"
    for heading_match in re.finditer(heading_pattern, section_content, re.MULTILINE):
        if not _is_position_in_code_fence(heading_match.start(), fence_regions):
            name = heading_match.group(1).strip()
            # Remove brackets if this is a reference-style link
            name = re.sub(r"^\[(.+)\]$", r"\1", name)
            operation_boundaries.append((heading_match.start(), name))

    # Extract operation content between boundaries
    for i, (start_pos, name) in enumerate(operation_boundaries):
        # Find the end position (start of next operation or end of content)
        if i + 1 < len(operation_boundaries):
            end_pos = operation_boundaries[i + 1][0]
        else:
            end_pos = len(section_content)

        # Extract the operation content
        op_content = section_content[start_pos:end_pos]
        # Remove the operation heading line itself
        op_content = re.sub(r"^##\s+[^\n]+\n", "", op_content, count=1)
        op_content = op_content.strip()

        # Parse inputs (handle reference-style links)
        inputs = []
        inputs_pattern = r"###\s+(?:\[Inputs?\]|Inputs?)\s*\n(.*?)(?=\n###\s+|\Z)"
        inputs_match = re.search(inputs_pattern, op_content, re.DOTALL)
        if inputs_match:
            input_text = inputs_match.group(1)
            # Extract list items
            for line in input_text.split("\n"):
                line = line.strip()
                if line.startswith("-") or line.startswith("*"):
                    inputs.append(line.lstrip("-*").strip())

        # Parse outputs (handle reference-style links)
        outputs = []
        outputs_pattern = r"###\s+(?:\[Outputs?\]|Outputs?)\s*\n(.*?)(?=\n###\s+|\Z)"
        outputs_match = re.search(outputs_pattern, op_content, re.DOTALL)
        if outputs_match:
            output_text = outputs_match.group(1)
            # Extract list items
            for line in output_text.split("\n"):
                line = line.strip()
                if line.startswith("-") or line.startswith("*"):
                    outputs.append(line.lstrip("-*").strip())

        # Parse steps (handle reference-style links)
        steps = []
        steps_pattern = r"###\s+(?:\[Steps?\]|Steps?)\s*\n(.*?)(?=\n###\s+|\Z)"
        steps_match = re.search(steps_pattern, op_content, re.DOTALL)
        if steps_match:
            steps_text = steps_match.group(1)
            # Extract numbered steps
            step_pattern = r"(\d+)\.\s+([^\n]+(?:\n(?!\d+\.)[^\n]+)*)"
            for step_match in re.finditer(step_pattern, steps_text):
                step_number = int(step_match.group(1))
                instruction = step_match.group(2).strip()

                # Extract operation references (text in brackets)
                op_refs = re.findall(r"\[([^\]]+)\]", instruction)

                steps.append(
                    Step(
                        step_number=step_number,
                        instruction=instruction,
                        operation_references=op_refs if op_refs else None,
                    )
                )

        # Parse checklist (handle reference-style links)
        checklist = None
        checklist_pattern = r"###\s+(?:\[Checklist\]|Checklist)\s*\n(.*?)(?=\n###\s+|\n##\s+|\Z)"
        checklist_match = re.search(checklist_pattern, op_content, re.DOTALL)
        if checklist_match:
            checklist_text = checklist_match.group(1)
            items = []
            for line in checklist_text.split("\n"):
                line = line.strip()
                if line.startswith("-") or line.startswith("*"):
                    items.append(line.lstrip("-*").strip())
            if items:
                checklist = Checklist(items=items)

        operations.append(
            Operation(
                name=name,
                inputs=inputs,
                outputs=outputs,
                steps=steps,
                checklist=checklist,
            )
        )

    return operations


def _parse_triggers(content: str) -> list[Trigger]:
    """Parse Triggers section from BUSY document.

    Args:
        content: Document content after frontmatter

    Returns:
        List of Trigger objects

    Raises:
        BusyValidationError: If trigger declarations are malformed

    Examples:
        Triggers section format:
        # Triggers
        - Set alarm for 6am each morning to run DailyLeadReview
        - When gmail.message.received from *@lead.com, run RespondToLead
    """
    triggers: list[Trigger] = []

    # Find the Triggers section
    triggers_pattern = r"#\s+(?:\[Triggers?\]|Triggers?)\s*\n(.*)(?=\n#\s+[^\n]+\n|\Z)"
    match = re.search(triggers_pattern, content, re.DOTALL)

    if not match:
        return triggers

    section_content = match.group(1)

    # Parse list items (bullet points)
    for line in section_content.split("\n"):
        line = line.strip()
        if not line or not (line.startswith("-") or line.startswith("*")):
            continue

        # Remove bullet point marker
        trigger_text = line.lstrip("-*").strip()

        if not trigger_text:
            continue

        try:
            trigger = _parse_trigger_declaration(trigger_text)
            triggers.append(trigger)
        except Exception as e:
            raise BusyValidationError(f"Invalid trigger declaration '{trigger_text}': {e}") from e

    return triggers


def _parse_trigger_declaration(text: str) -> Trigger:
    """Parse a single trigger declaration.

    Supports two formats:
    1. Time-based: "Set alarm for <time> to run <Operation>"
    2. Event-based: "When <event_type> [from <filter>], run <Operation>"

    Args:
        text: Trigger declaration text

    Returns:
        Trigger object

    Raises:
        ValueError: If trigger format is unrecognized

    Examples:
        >>> _parse_trigger_declaration("Set alarm for 6am each morning to run DailyReview")
        Trigger(trigger_type='alarm', schedule='0 6 * * *', operation='DailyReview')

        >>> _parse_trigger_declaration("When gmail.message.received from *@lead.com, run RespondToLead")
        Trigger(trigger_type='event', event_type='gmail.message.received', ...)
    """
    # Time-based trigger patterns
    # "Set alarm for <time> to run <Operation>"
    alarm_pattern = r"(?i)set\s+alarm\s+for\s+(.+?)\s+to\s+run\s+(\w+)"
    alarm_match = re.match(alarm_pattern, text)

    if alarm_match:
        time_spec = alarm_match.group(1).strip()
        operation = alarm_match.group(2).strip()

        # Convert natural language time to cron schedule
        schedule = _parse_time_spec(time_spec)

        return Trigger(
            raw_text=text,
            trigger_type="alarm",
            schedule=schedule,
            operation=operation,
        )

    # Event-based trigger patterns
    # "When <event_type> [from <filter>], run <Operation>"
    event_pattern = r"(?i)when\s+([\w.]+)(?:\s+from\s+(.+?))?,\s*run\s+(\w+)"
    event_match = re.match(event_pattern, text)

    if event_match:
        event_type = event_match.group(1).strip()
        filter_spec = event_match.group(2).strip() if event_match.group(2) else None
        operation = event_match.group(3).strip()

        # Parse filter if present
        filter_dict = None
        if filter_spec:
            filter_dict = _parse_filter_spec(filter_spec)

        return Trigger(
            raw_text=text,
            trigger_type="event",
            event_type=event_type,
            filter=filter_dict,
            operation=operation,
            queue_when_paused=True,
        )

    raise ValueError(f"Unrecognized trigger format. Expected 'Set alarm for <time> to run <Operation>' or 'When <event> [from <filter>], run <Operation>'")


def _parse_time_spec(time_spec: str) -> str:
    """Convert natural language time specification to cron schedule.

    Args:
        time_spec: Natural language time (e.g., "6am each morning", "3pm daily")

    Returns:
        Cron schedule string (e.g., "0 6 * * *")

    Examples:
        >>> _parse_time_spec("6am each morning")
        '0 6 * * *'
        >>> _parse_time_spec("3pm daily")
        '0 15 * * *'
        >>> _parse_time_spec("9am every Monday")
        '0 9 * * 1'
    """
    time_spec_lower = time_spec.lower()

    # Extract hour from time like "6am", "3pm", "14:30"
    hour_pattern = r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?"
    hour_match = re.search(hour_pattern, time_spec_lower)

    if not hour_match:
        raise ValueError(f"Cannot parse time from '{time_spec}'")

    hour = int(hour_match.group(1))
    minute = int(hour_match.group(2)) if hour_match.group(2) else 0
    am_pm = hour_match.group(3)

    # Convert 12-hour to 24-hour
    if am_pm == "pm" and hour != 12:
        hour += 12
    elif am_pm == "am" and hour == 12:
        hour = 0

    # Determine frequency
    day_of_week = "*"  # Default: every day

    if "monday" in time_spec_lower:
        day_of_week = "1"
    elif "tuesday" in time_spec_lower:
        day_of_week = "2"
    elif "wednesday" in time_spec_lower:
        day_of_week = "3"
    elif "thursday" in time_spec_lower:
        day_of_week = "4"
    elif "friday" in time_spec_lower:
        day_of_week = "5"
    elif "saturday" in time_spec_lower:
        day_of_week = "6"
    elif "sunday" in time_spec_lower:
        day_of_week = "0"

    # Build cron expression: minute hour day month day_of_week
    return f"{minute} {hour} * * {day_of_week}"


def _parse_filter_spec(filter_spec: str) -> dict[str, str]:
    """Parse filter specification from trigger declaration.

    Args:
        filter_spec: Filter specification (e.g., "*@lead.com", "john@example.com")

    Returns:
        Filter dictionary (e.g., {"from": "*@lead.com"})

    Examples:
        >>> _parse_filter_spec("*@lead.com")
        {'from': '*@lead.com'}
    """
    # For now, treat filter_spec as email pattern (most common case)
    # In the future, could support more complex filter syntax
    return {"from": filter_spec}


def _parse_frontmatter_triggers(frontmatter_data: dict[str, Any], metadata: Metadata) -> list[Trigger]:
    """Parse triggers from frontmatter YAML Triggers field.

    Args:
        frontmatter_data: Raw YAML frontmatter data dictionary
        metadata: Document metadata (for extracting operation name)

    Returns:
        List of Trigger objects parsed from frontmatter

    Examples:
        Frontmatter YAML format:
        ---
        Name: ProcessEmail
        Triggers:
          - event_type: gmail_new_message
            filters:
              from: "*@company.com"
            queue_when_paused: true
        ---
    """
    triggers: list[Trigger] = []

    # Check if Triggers field exists in frontmatter
    frontmatter_triggers = frontmatter_data.get("Triggers")
    if not frontmatter_triggers:
        return triggers

    # Validate Triggers is a list
    if not isinstance(frontmatter_triggers, list):
        raise BusyValidationError("Frontmatter Triggers field must be a list of trigger declarations")

    # Parse each trigger from frontmatter
    for trigger_dict in frontmatter_triggers:
        if not isinstance(trigger_dict, dict):
            raise BusyValidationError(f"Each trigger in frontmatter must be a dictionary, got: {type(trigger_dict)}")

        # Extract event_type (required)
        event_type = trigger_dict.get("event_type")
        if not event_type:
            raise BusyValidationError("Frontmatter trigger missing required field: event_type")

        # Extract filters (optional)
        filters = trigger_dict.get("filters")
        if filters and not isinstance(filters, dict):
            raise BusyValidationError(f"Trigger filters must be a dictionary, got: {type(filters)}")

        # Extract queue_when_paused (optional, defaults to True)
        queue_when_paused = trigger_dict.get("queue_when_paused", True)

        # Create Trigger object
        # For frontmatter triggers in Operation documents, use the document name as the operation
        trigger = Trigger(
            raw_text=f"Frontmatter trigger: {event_type}",
            trigger_type="event",  # Frontmatter triggers are event-based
            event_type=event_type,
            filter=filters,
            operation=metadata.name,  # Use document name as operation name
            queue_when_paused=queue_when_paused,
        )
        triggers.append(trigger)

    return triggers


def parse_document(content: str) -> BusyDocument:
    """Parse a BUSY v2 document.

    Args:
        content: Markdown content of BUSY document

    Returns:
        BusyDocument with all parsed sections, or ToolDocument if Type is [Tool]

    Raises:
        BusyParseError: If document structure is malformed
        BusyValidationError: If required sections are missing
    """
    try:
        # Extract metadata and frontmatter YAML data
        metadata, remaining_content, frontmatter_data = _extract_metadata(content)

        # Parse sections in order
        imports = _parse_imports(remaining_content)
        definitions = _parse_local_definitions(remaining_content)
        setup = _parse_setup(remaining_content)
        operations = _parse_operations(remaining_content)

        # Check if this is a tool document
        if metadata.type == "[Tool]":
            # For Tool documents, Triggers section is documentation only (not executable declarations)
            # Parse tools section for tool documents
            tools = _parse_tools_section(remaining_content)
            if not tools:
                raise BusyValidationError("Tool document must contain at least one tool definition in Tools section")

            return ToolDocument(
                metadata=metadata,
                imports=imports,
                definitions=definitions,
                setup=setup,
                operations=operations,
                tools=tools,
                triggers=[],  # Tool documents don't have executable triggers
            )

        # For non-Tool documents (Operations, etc.), parse executable triggers
        # Parse triggers from both frontmatter YAML and markdown sections
        frontmatter_triggers = _parse_frontmatter_triggers(frontmatter_data, metadata)
        markdown_triggers = _parse_triggers(remaining_content)

        # Combine both sources of triggers
        triggers = frontmatter_triggers + markdown_triggers

        return BusyDocument(
            metadata=metadata,
            imports=imports,
            definitions=definitions,
            setup=setup,
            operations=operations,
            triggers=triggers,
        )
    except (BusyValidationError, BusyImportError) as e:
        # Re-raise validation and import errors as-is
        raise
    except Exception as e:
        # Wrap other errors in BusyParseError
        raise BusyParseError(f"Failed to parse BUSY document: {e}") from e


def resolve_imports(
    document: BusyDocument, base_path: Path, _visited: Optional[set[str]] = None
) -> dict[str, BusyDocument]:
    """Resolve imports in a parsed document.

    Args:
        document: Parsed document with imports
        base_path: Base path for resolving relative import paths
        _visited: Internal set for cycle detection

    Returns:
        Dictionary mapping concept names to parsed documents

    Raises:
        BusyImportError: If imports cannot be resolved or cycles detected
    """
    if _visited is None:
        _visited = set()

    resolved: dict[str, BusyDocument] = {}

    for import_ref in document.imports:
        # Resolve the path
        import_path = base_path / import_ref.path

        # Check if file exists
        if not import_path.exists():
            raise BusyImportError(
                f"Import path '{import_ref.path}' not found (resolved to {import_path})"
            )

        # Check for cycles
        import_key = str(import_path.resolve())
        if import_key in _visited:
            raise BusyImportError(
                f"Circular import detected: '{import_ref.path}' (resolved to {import_path})"
            )

        # Mark as visited
        _visited.add(import_key)

        # Parse the imported document
        try:
            imported_content = import_path.read_text()
            imported_doc = parse_document(imported_content)

            # Validate anchor if specified
            if import_ref.anchor:
                # Check if anchor exists in operations or definitions
                anchor_found = False
                for op in imported_doc.operations:
                    # Normalize operation name to anchor format
                    op_anchor = op.name.lower().replace(" ", "-")
                    if op_anchor == import_ref.anchor.lower():
                        anchor_found = True
                        break
                for defn in imported_doc.definitions:
                    defn_anchor = defn.name.lower().replace(" ", "-")
                    if defn_anchor == import_ref.anchor.lower():
                        anchor_found = True
                        break

                if not anchor_found:
                    raise BusyImportError(
                        f"Anchor '#{import_ref.anchor}' not found in '{import_ref.path}'"
                    )

            # Store resolved document
            resolved[import_ref.concept_name] = imported_doc

            # Recursively resolve imports in the imported document
            nested_resolved = resolve_imports(
                imported_doc, import_path.parent, _visited
            )
            resolved.update(nested_resolved)

        except (BusyParseError, BusyValidationError) as e:
            raise BusyImportError(
                f"Failed to parse imported document '{import_ref.path}': {e}"
            ) from e
        finally:
            # Remove from visited set for this branch
            _visited.discard(import_key)

    return resolved
