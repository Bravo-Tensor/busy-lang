"""BUSY document data models."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class Metadata(BaseModel):
    """Metadata for BUSY documents (from YAML frontmatter).

    Required fields:
        name: Name of the document
        type: Type with bracket notation (e.g., "[Operation]")
        description: Description of the document

    Optional fields:
        provider: Provider specification for tool documents (e.g., "composio")

    Examples:
        >>> metadata = Metadata(
        ...     name="ExecuteOperation",
        ...     type="[Operation]",
        ...     description="Execute a BUSY operation"
        ... )
        >>> metadata.name
        'ExecuteOperation'
    """

    name: str = Field(..., min_length=1, description="Document name")
    type: str = Field(..., description="Document type with bracket notation")
    description: str = Field(..., min_length=1, description="Document description")
    provider: Optional[str] = Field(None, description="Optional provider specification")


class Import(BaseModel):
    """Import reference in BUSY document.

    Fields:
        concept_name: Name of the imported concept
        path: Path to the imported document
        anchor: Optional anchor within the imported document

    Examples:
        >>> import_ref = Import(
        ...     concept_name="Operation",
        ...     path="./operation.busy.md",
        ...     anchor="execute-operation"
        ... )
        >>> import_ref.concept_name
        'Operation'
    """

    concept_name: str = Field(..., min_length=1, description="Imported concept name")
    path: str = Field(..., min_length=1, description="Path to imported document")
    anchor: Optional[str] = Field(None, description="Optional anchor in document")


class LocalDefinition(BaseModel):
    """Local definition in BUSY document.

    Fields:
        name: Name of the definition
        content: Content of the definition

    Examples:
        >>> definition = LocalDefinition(
        ...     name="Capability",
        ...     content="A system feature or function"
        ... )
        >>> definition.name
        'Capability'
    """

    name: str = Field(..., min_length=1, description="Definition name")
    content: str = Field(..., description="Definition content")


class Step(BaseModel):
    """Step in an operation.

    Fields:
        step_number: Step number (1, 2, 3, etc.)
        instruction: Instruction text for the step
        operation_references: Optional list of operation references

    Examples:
        >>> step = Step(
        ...     step_number=1,
        ...     instruction="Parse the document frontmatter",
        ...     operation_references=["ParseFrontmatter"]
        ... )
        >>> step.step_number
        1
    """

    step_number: int = Field(..., ge=1, description="Step number")
    instruction: str = Field(..., min_length=1, description="Step instruction")
    operation_references: Optional[list[str]] = Field(
        None, description="Optional operation references"
    )


class Checklist(BaseModel):
    """Checklist in an operation.

    Fields:
        items: List of checklist items

    Examples:
        >>> checklist = Checklist(items=["Document parsed", "Imports resolved"])
        >>> len(checklist.items)
        2
    """

    items: list[str] = Field(..., description="Checklist items")


class Trigger(BaseModel):
    """Trigger declaration in BUSY document.

    Fields:
        raw_text: Original trigger declaration text
        trigger_type: Type of trigger ("alarm" for time-based, "event" for event-based)
        schedule: Cron schedule for time-based triggers (e.g., "0 6 * * *")
        event_type: Event type for event-based triggers (e.g., "gmail.message.received")
        filter: Optional filter criteria (e.g., {"from": "*@lead.com"})
        operation: Operation name to run when triggered
        queue_when_paused: Whether to queue events when workspace is paused

    Examples:
        >>> # Time-based trigger
        >>> trigger = Trigger(
        ...     raw_text="Set alarm for 6am each morning to run DailyLeadReview",
        ...     trigger_type="alarm",
        ...     schedule="0 6 * * *",
        ...     operation="DailyLeadReview"
        ... )
        >>> trigger.trigger_type
        'alarm'

        >>> # Event-based trigger
        >>> trigger = Trigger(
        ...     raw_text="When gmail.message.received from *@lead.com, run RespondToLead",
        ...     trigger_type="event",
        ...     event_type="gmail.message.received",
        ...     filter={"from": "*@lead.com"},
        ...     operation="RespondToLead",
        ...     queue_when_paused=True
        ... )
        >>> trigger.event_type
        'gmail.message.received'
    """

    raw_text: str = Field(..., min_length=1, description="Original trigger declaration")
    trigger_type: str = Field(..., description="Trigger type: 'alarm' or 'event'")
    schedule: Optional[str] = Field(None, description="Cron schedule for time-based triggers")
    event_type: Optional[str] = Field(None, description="Event type for event-based triggers")
    filter: Optional[dict[str, str]] = Field(None, description="Filter criteria for events")
    operation: str = Field(..., min_length=1, description="Operation to run")
    queue_when_paused: bool = Field(default=True, description="Queue events when workspace paused")


class Operation(BaseModel):
    """Operation in BUSY document.

    Fields:
        name: Operation name
        inputs: List of input descriptions
        outputs: List of output descriptions
        steps: List of steps
        checklist: Optional checklist

    Examples:
        >>> operation = Operation(
        ...     name="ExecuteOperation",
        ...     inputs=["document", "context"],
        ...     outputs=["result"],
        ...     steps=[],
        ...     checklist=None
        ... )
        >>> operation.name
        'ExecuteOperation'
    """

    name: str = Field(..., min_length=1, description="Operation name")
    inputs: list[str] = Field(default_factory=list, description="Input descriptions")
    outputs: list[str] = Field(default_factory=list, description="Output descriptions")
    steps: list[Step] = Field(default_factory=list, description="Operation steps")
    checklist: Optional[Checklist] = Field(None, description="Optional checklist")


class Tool(BaseModel):
    """Tool definition in BUSY tool document.

    Fields:
        name: Tool name
        description: Tool description
        inputs: List of input parameter descriptions
        outputs: List of output descriptions
        examples: Optional usage examples
        providers: Optional provider-specific mappings (provider_name -> {action, parameters})

    Examples:
        >>> tool = Tool(
        ...     name="send_email",
        ...     description="Send an email",
        ...     inputs=["to: recipient", "subject: email subject"],
        ...     outputs=["message_id: sent message ID"],
        ...     examples=["send_email(to='user@example.com')"],
        ...     providers={"composio": {"action": "GMAIL_SEND_EMAIL", "parameters": {"to": "to"}}}
        ... )
        >>> tool.name
        'send_email'
    """

    name: str = Field(..., min_length=1, description="Tool name")
    description: str = Field(..., min_length=1, description="Tool description")
    inputs: list[str] = Field(default_factory=list, description="Input parameters")
    outputs: list[str] = Field(default_factory=list, description="Output descriptions")
    examples: Optional[list[str]] = Field(None, description="Usage examples")
    providers: Optional[dict[str, dict[str, Any]]] = Field(None, description="Provider-specific action mappings")


class BusyDocument(BaseModel):
    """Parsed BUSY document structure.

    Fields:
        metadata: Document metadata (from YAML frontmatter)
        imports: List of imports
        definitions: List of local definitions
        setup: Optional setup section content
        operations: List of operations
        triggers: List of trigger declarations

    Examples:
        >>> doc = BusyDocument(
        ...     metadata=Metadata(
        ...         name="Test",
        ...         type="[Document]",
        ...         description="Test document"
        ...     ),
        ...     imports=[],
        ...     definitions=[],
        ...     setup=None,
        ...     operations=[],
        ...     triggers=[]
        ... )
        >>> doc.metadata.name
        'Test'
    """

    metadata: Metadata = Field(..., description="Document metadata")
    imports: list[Import] = Field(default_factory=list, description="Import references")
    definitions: list[LocalDefinition] = Field(
        default_factory=list, description="Local definitions"
    )
    setup: Optional[str] = Field(None, description="Optional setup section")
    operations: list[Operation] = Field(default_factory=list, description="Operations")
    triggers: list[Trigger] = Field(default_factory=list, description="Trigger declarations")

    def model_dump_json(self, **kwargs: Any) -> str:
        """Serialize to JSON string.

        Returns:
            JSON string representation

        Examples:
            >>> doc.model_dump_json()
            '{"frontmatter": {...}, ...}'
        """
        return super().model_dump_json(**kwargs)


class ToolDocument(BusyDocument):
    """Parsed BUSY tool document structure.

    Extends BusyDocument with tool-specific fields.

    Fields:
        tools: List of tool definitions
        All fields from BusyDocument

    Examples:
        >>> tool_doc = ToolDocument(
        ...     metadata=Metadata(
        ...         name="Gmail Tool",
        ...         type="[Tool]",
        ...         description="Gmail operations"
        ...     ),
        ...     tools=[],
        ...     imports=[],
        ...     definitions=[],
        ...     setup=None,
        ...     operations=[],
        ...     triggers=[]
        ... )
        >>> tool_doc.metadata.name
        'Gmail Tool'
    """

    tools: list[Tool] = Field(default_factory=list, description="Tool definitions")
