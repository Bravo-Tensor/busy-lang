"""Personality BUSY document type parsing.

This module provides parsing functionality for personality BUSY documents,
which define agent personas with required and optional sections.
"""

import re
from typing import Optional

from pydantic import BaseModel, Field

# Required sections for personality documents
REQUIRED_SECTIONS = frozenset({
    "Identity",
    "Tone & Voice",
    "Domain Context",
    "Boundaries",
})

# Optional sections for personality documents
OPTIONAL_SECTIONS = frozenset({
    "Relationship Dynamics",
})


class PersonalityDocument(BaseModel):
    """Parsed personality BUSY document structure.

    Fields:
        name: Personality name (from frontmatter)
        document_type: Document type (should be "Personality")
        description: Description of the personality
        sections: Dictionary mapping section names to content

    Examples:
        >>> doc = PersonalityDocument(
        ...     name="Maui",
        ...     document_type="Personality",
        ...     description="Chief of staff assistant",
        ...     sections={
        ...         "Identity": "You are Maui.",
        ...         "Tone & Voice": "Friendly.",
        ...         "Domain Context": "Communication.",
        ...         "Boundaries": "Be helpful.",
        ...     }
        ... )
        >>> doc.name
        'Maui'
    """

    name: str = Field(..., min_length=1, description="Personality name")
    document_type: str = Field(..., description="Document type")
    description: str = Field(..., description="Personality description")
    sections: dict[str, str] = Field(
        default_factory=dict, description="Section name to content mapping"
    )


def _parse_frontmatter(content: str) -> tuple[dict[str, str], str]:
    """Parse YAML frontmatter from document content.

    Args:
        content: Full document content

    Returns:
        Tuple of (frontmatter dict, remaining content)

    Raises:
        ValueError: If frontmatter is malformed
    """
    # Match frontmatter between --- delimiters
    frontmatter_pattern = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
    match = frontmatter_pattern.match(content)

    if not match:
        raise ValueError("Missing or malformed frontmatter")

    frontmatter_text = match.group(1)
    remaining = content[match.end():]

    # Parse simple YAML key-value pairs
    frontmatter = {}
    for line in frontmatter_text.strip().split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            frontmatter[key.strip()] = value.strip()

    return frontmatter, remaining


def _parse_sections(content: str) -> dict[str, str]:
    """Parse H1 sections from document content.

    Args:
        content: Document content after frontmatter

    Returns:
        Dictionary mapping section names to content
    """
    sections: dict[str, str] = {}

    # Split by H1 headings (# Section Name)
    section_pattern = re.compile(r'^#\s+(.+?)$', re.MULTILINE)
    matches = list(section_pattern.finditer(content))

    for i, match in enumerate(matches):
        section_name = match.group(1).strip()

        # Get content until next section or end
        start = match.end()
        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(content)

        section_content = content[start:end].strip()
        sections[section_name] = section_content

    return sections


def _validate_required_sections(sections: dict[str, str]) -> None:
    """Validate that all required sections are present.

    Args:
        sections: Parsed sections dictionary

    Raises:
        ValueError: If any required section is missing
    """
    missing = REQUIRED_SECTIONS - set(sections.keys())
    if missing:
        missing_list = ", ".join(sorted(missing))
        raise ValueError(
            f"Missing required sections: {missing_list}. "
            f"Personality documents must include: {', '.join(sorted(REQUIRED_SECTIONS))}"
        )


def parse_personality_document(content: str) -> PersonalityDocument:
    """Parse a personality BUSY document.

    Args:
        content: Full document content including frontmatter

    Returns:
        PersonalityDocument instance

    Raises:
        ValueError: If document is malformed or missing required sections

    Examples:
        >>> content = '''---
        ... Name: Maui
        ... Type: Personality
        ... Description: Chief of staff
        ... ---
        ...
        ... # Identity
        ... You are Maui.
        ...
        ... # Tone & Voice
        ... Friendly.
        ...
        ... # Domain Context
        ... Communication.
        ...
        ... # Boundaries
        ... Be helpful.
        ... '''
        >>> doc = parse_personality_document(content)
        >>> doc.name
        'Maui'
    """
    # Parse frontmatter
    frontmatter, remaining = _parse_frontmatter(content)

    # Extract required frontmatter fields
    name = frontmatter.get("Name", "")
    if not name:
        raise ValueError("Missing 'Name' in frontmatter")

    document_type = frontmatter.get("Type", "")
    if not document_type:
        raise ValueError("Missing 'Type' in frontmatter")

    description = frontmatter.get("Description", "")

    # Parse sections
    sections = _parse_sections(remaining)

    # Validate required sections
    _validate_required_sections(sections)

    return PersonalityDocument(
        name=name,
        document_type=document_type,
        description=description,
        sections=sections,
    )


def get_default_maui_personality() -> str:
    """Get the default Maui personality template content.

    Returns:
        String content of the default maui-personality.busy.md template

    Examples:
        >>> template = get_default_maui_personality()
        >>> "Identity" in template
        True
    """
    return '''---
Name: Maui
Type: Personality
Description: Chief of staff personality agent for orgata-runtime
---

# Identity

You are Maui, a helpful chief of staff assistant. You serve as the primary communication interface between the user and the orgata-runtime system. Your role is to:

- Receive and understand user requests across multiple channels
- Delegate tasks to specialized agents (Architect, Builder, Operations)
- Maintain context and memory across conversations
- Provide timely updates on task progress and system status

You are named after the Hawaiian demigod known for being resourceful, clever, and helpful.

# Tone & Voice

Your communication style is:

- **Friendly and approachable**: Use warm, conversational language
- **Professional and efficient**: Be concise and action-oriented
- **Adaptive**: Match the formality level of the user
- **Proactive**: Anticipate needs and offer helpful suggestions
- **Transparent**: Clearly communicate what you're doing and why

Avoid:
- Overly formal or robotic language
- Unnecessary jargon or technical terms
- Being verbose when brevity serves better

# Domain Context

You operate within the orgata-runtime system, which includes:

- **Workspaces**: User-defined work areas containing documents, tools, and operations
- **Agents**: Specialized assistants (Architect, Builder, Operations) that handle specific tasks
- **BUSY Documents**: Structured markdown documents that define operations and tools
- **Memory System**: Persistent storage for conversations and important context

Your primary responsibilities:
1. Message handling across channels (Telegram, etc.)
2. Task delegation to appropriate agents
3. Status reporting and interrupt handling
4. Memory management for long-term context

# Boundaries

You must always:
- Confirm before taking destructive or irreversible actions
- Respect workspace permissions and access controls
- Protect sensitive information and credentials
- Escalate to the user when uncertain about intent

You must never:
- Execute operations in workspaces you do not own without explicit permission
- Share credentials, API keys, or other secrets
- Make assumptions about user intent for high-stakes operations
- Bypass HITL (human-in-the-loop) confirmation requirements

# Relationship Dynamics

Adapt your communication based on familiarity:

**New users**:
- Introduce yourself and explain your capabilities
- Offer guidance on how to interact effectively
- Be more explicit about confirmation requirements

**Familiar users**:
- Skip introductory context they already know
- Use shorthand and references to past interactions
- Anticipate common patterns and preferences

**Returning after absence**:
- Briefly summarize relevant context from previous sessions
- Highlight any pending tasks or interrupts
- Acknowledge time gap appropriately
'''
