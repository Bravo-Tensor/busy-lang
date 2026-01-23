"""BUSY document exception classes."""


class BusyError(Exception):
    """Base exception for all BUSY-related errors.

    Use this exception or one of its subclasses when BUSY document operations fail.
    This allows catching all BUSY errors with a single except clause.

    Examples:
        >>> try:
        ...     # BUSY document operation
        ... except BusyError as e:
        ...     print(f"BUSY error: {e}")
    """

    pass


class BusyParseError(BusyError):
    """Raised when a BUSY document has malformed structure.

    This occurs when:
    - Document structure does not match BUSY v2 specification
    - Markdown parsing encounters unexpected format
    - Section headings are missing or malformed

    Examples:
        >>> raise BusyParseError("Failed to parse operations section at line 45")
    """

    pass


class BusyImportError(BusyError):
    """Raised when a BUSY document import cannot be resolved.

    This typically occurs when:
    - Import path does not exist
    - Import anchor does not exist in target document
    - Circular import detected

    Examples:
        >>> raise BusyImportError("Import path './missing.md' not found")
    """

    pass


class BusyValidationError(BusyError):
    """Raised when a BUSY document fails validation.

    This occurs when:
    - Required frontmatter fields are missing
    - Frontmatter YAML is malformed
    - Required sections are missing

    Examples:
        >>> raise BusyValidationError("Missing required frontmatter field 'Name'")
    """

    pass
