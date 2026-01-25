/**
 * Custom markdownlint rules for BUSY framework document validation
 *
 * Rule naming convention:
 * - BUSY001-BUSY009: Frontmatter rules
 * - BUSY010-BUSY019: Import section rules
 * - BUSY020-BUSY029: Setup section rules
 * - BUSY030-BUSY039: Operations section rules
 * - BUSY040-BUSY049: Link resolution rules
 * - BUSY050-BUSY059: Section ordering rules
 * - BUSY060-BUSY069: Section heading link rules
 * - BUSY070-BUSY079: Variable/field naming rules (warnings)
 *
 * TODO: Add semantic validation (requires LLM evaluation):
 * - Section headers like `### [Input]` should reference `[Input Section]` not `[Input]`
 *   Pattern: `### [X][X Section]` where X is Input, Output, Steps, etc.
 *   This distinguishes the structural section from the singular concept.
 */

const fs = require('fs');
const path = require('path');

// Helper: Read file directly to get frontmatter (markdownlint strips it)
function readFileWithFrontmatter(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

// Helper: Parse YAML frontmatter
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      result[key] = value;
    }
  }

  return { raw: match[0], parsed: result, endLine: match[0].split('\n').length };
}

// Cache for file contents to avoid re-reading
const fileCache = new Map();

// Helper: Extract all bracket references from content (excluding frontmatter and code blocks)
function extractBracketRefs(content, skipFrontmatter = true) {
  const refs = new Set();

  let textToScan = content;
  if (skipFrontmatter) {
    // Remove frontmatter from scanning
    const fmMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
    if (fmMatch) {
      textToScan = content.slice(fmMatch[0].length);
    }
  }

  // Remove code blocks (fenced and indented) to avoid false positives
  // Remove fenced code blocks (``` or ~~~)
  textToScan = textToScan.replace(/```[\s\S]*?```/g, '');
  textToScan = textToScan.replace(/~~~[\s\S]*?~~~/g, '');
  // Remove inline code
  textToScan = textToScan.replace(/`[^`]+`/g, '');

  // Match [Term] but not [Term]: (link definitions) or [Term](url) (inline links)
  // Also handle combined references like [Name][Type]
  const regex = /\[([^\]]+)\](?!\s*[:\(])/g;
  let match;
  while ((match = regex.exec(textToScan)) !== null) {
    const ref = match[1];
    // Skip if it's part of a checkbox [ ] or [x]
    if (ref === ' ' || ref === 'x' || ref === 'X') continue;
    // Skip inline anchor references like (#section)
    if (ref.startsWith('#')) continue;
    // Skip things that look like code/placeholders (contains special chars)
    if (ref.includes('|') || ref.includes('(') || ref.includes(')') ||
        ref.includes('.') && ref.includes('[') || ref.match(/^\.\w/)) continue;
    refs.add(ref);
  }
  return refs;
}

// Helper: Extract link definitions from imports section
function extractLinkDefinitions(content) {
  const defs = new Map();
  // Match [Label]:path or [Label]:path#anchor
  const regex = /^\[([^\]]+)\]:(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    defs.set(match[1], match[2].trim());
  }
  return defs;
}

// Helper: Find line number for a pattern
function findLineNumber(lines, pattern, startLine = 0) {
  for (let i = startLine; i < lines.length; i++) {
    if (lines[i].match(pattern)) {
      return i + 1; // 1-indexed
    }
  }
  return null;
}

// Helper: Get all headings with their levels
function getHeadings(lines) {
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2],
        line: i + 1
      });
    }
  }
  return headings;
}

// Helper: Get file content with frontmatter (reads directly, with caching)
function getFileWithFrontmatter(params) {
  if (!fileCache.has(params.name)) {
    const content = readFileWithFrontmatter(params.name);
    fileCache.set(params.name, content);
  }
  return fileCache.get(params.name);
}

// Helper: Get frontmatter line offset (for adjusting line numbers)
function getFrontmatterOffset(params) {
  const content = getFileWithFrontmatter(params);
  if (!content) return 0;
  const fm = parseFrontmatter(content);
  return fm ? fm.endLine : 0;
}

// Helper: Adjust line number to account for frontmatter
function adjustLineNumber(lineNum, params) {
  return lineNum + getFrontmatterOffset(params);
}

module.exports = [
  // BUSY001: Frontmatter must exist
  {
    names: ["BUSY001"],
    description: "BUSY document must have frontmatter delimited by ---",
    tags: ["busy", "frontmatter"],
    function: function BUSY001(params, onError) {
      // Read file directly since markdownlint strips frontmatter
      const content = getFileWithFrontmatter(params);
      if (!content) return; // File read error, skip

      if (!content.startsWith('---')) {
        onError({
          lineNumber: 1,
          detail: "Document must start with frontmatter (---)"
        });
      } else {
        const fm = parseFrontmatter(content);
        if (!fm) {
          onError({
            lineNumber: 1,
            detail: "Frontmatter must be closed with ---"
          });
        }
      }
    }
  },

  // BUSY002: Frontmatter must have Name field
  {
    names: ["BUSY002"],
    description: "Frontmatter must define Name field",
    tags: ["busy", "frontmatter"],
    function: function BUSY002(params, onError) {
      const content = getFileWithFrontmatter(params);
      if (!content) return;

      const fm = parseFrontmatter(content);
      if (!fm) return; // BUSY001 will catch this
      if (!fm.parsed.Name) {
        onError({
          lineNumber: 2,
          detail: "Frontmatter missing required 'Name' field"
        });
      }
    }
  },

  // BUSY003: Frontmatter must have Type field with bracket reference
  {
    names: ["BUSY003"],
    description: "Frontmatter must define Type field as bracketed reference",
    tags: ["busy", "frontmatter"],
    function: function BUSY003(params, onError) {
      const content = getFileWithFrontmatter(params);
      if (!content) return;

      const fm = parseFrontmatter(content);
      if (!fm) return;

      if (!fm.parsed.Type) {
        onError({
          lineNumber: 2,
          detail: "Frontmatter missing required 'Type' field"
        });
      } else if (!fm.parsed.Type.match(/^\[.+\]$/)) {
        // Find the actual line number of Type field
        const lines = content.split('\n');
        const typeLine = lines.findIndex(l => l.startsWith('Type:')) + 1;
        onError({
          lineNumber: typeLine || 2,
          detail: `Type must be a bracketed reference (e.g., [Playbook]), got: ${fm.parsed.Type}`
        });
      }
    }
  },

  // BUSY004: Frontmatter must have Description field
  {
    names: ["BUSY004"],
    description: "Frontmatter must define Description field",
    tags: ["busy", "frontmatter"],
    function: function BUSY004(params, onError) {
      const content = getFileWithFrontmatter(params);
      if (!content) return;

      const fm = parseFrontmatter(content);
      if (!fm) return;

      if (!fm.parsed.Description) {
        onError({
          lineNumber: 2,
          detail: "Frontmatter missing required 'Description' field"
        });
      }
    }
  },

  // BUSY010: Imports section must exist
  {
    names: ["BUSY010"],
    description: "BUSY document must have Imports section after frontmatter",
    tags: ["busy", "imports"],
    function: function BUSY010(params, onError) {
      // Look for # [Imports] or # Imports heading in markdownlint's content
      const importsLine = findLineNumber(params.lines, /^#\s+\[?Imports\]?/);
      if (!importsLine) {
        // Get frontmatter to report correct line number
        const content = getFileWithFrontmatter(params);
        const fm = content ? parseFrontmatter(content) : null;
        const reportLine = fm ? fm.endLine + 1 : 1;
        onError({
          lineNumber: reportLine,
          detail: "Document must have '# [Imports]' section after frontmatter"
        });
      }
    }
  },

  // BUSY011: Imports section must be first heading after frontmatter
  {
    names: ["BUSY011"],
    description: "Imports section must immediately follow frontmatter",
    tags: ["busy", "imports"],
    function: function BUSY011(params, onError) {
      const headings = getHeadings(params.lines);
      if (headings.length === 0) return;

      const firstHeading = headings[0];
      if (!firstHeading.text.match(/^\[?Imports\]?/)) {
        onError({
          lineNumber: firstHeading.line,
          detail: `First heading must be Imports section, found: ${firstHeading.text}`
        });
      }
    }
  },

  // BUSY012: Import format validation
  {
    names: ["BUSY012"],
    description: "Imports must use reference-style format [Alias]:path",
    tags: ["busy", "imports"],
    function: function BUSY012(params, onError) {
      const importsLine = findLineNumber(params.lines, /^#\s+\[?Imports\]?/);
      if (!importsLine) return;

      // Find where imports section ends (next heading)
      let endLine = params.lines.length;
      for (let i = importsLine; i < params.lines.length; i++) {
        if (i > importsLine && params.lines[i].match(/^#\s+/)) {
          endLine = i;
          break;
        }
      }

      // Check each non-empty line in imports section
      for (let i = importsLine; i < endLine; i++) {
        const line = params.lines[i];
        if (line.trim() && !line.startsWith('#')) {
          // Skip HTML comments
          if (line.trim().startsWith('<!--')) continue;
          // Should match [Label]:path pattern
          if (!line.match(/^\[.+\]:.+$/)) {
            onError({
              lineNumber: i + 1,
              detail: `Invalid import format. Expected [Alias]:path, got: ${line}`
            });
          }
        }
      }
    }
  },

  // BUSY020: Setup section must exist
  {
    names: ["BUSY020"],
    description: "BUSY document must have Setup section",
    tags: ["busy", "setup"],
    function: function BUSY020(params, onError) {
      const setupLine = findLineNumber(params.lines, /^#\s+\[?Setup\]?/);
      if (!setupLine) {
        onError({
          lineNumber: 1,
          detail: "Document must have '# [Setup]' section"
        });
      }
    }
  },

  // BUSY040: All bracket references must have link definitions
  // STRICT: Every [BracketedTerm] in prose MUST resolve to a link definition OR a local definition
  {
    names: ["BUSY040"],
    description: "All [BracketedTerms] must have corresponding link definitions",
    tags: ["busy", "links"],
    function: function BUSY040(params, onError) {
      const content = params.lines.join('\n');
      const refs = extractBracketRefs(content);
      const defs = extractLinkDefinitions(content);

      // Only skip markdown checkbox patterns - nothing else
      const markdownPatterns = new Set([' ', 'x', 'X']);

      // Extract heading names that define internal anchors (operations defined in this doc)
      const headings = getHeadings(params.lines);
      const internalAnchors = new Set();
      for (const h of headings) {
        // Extract the name from heading like "## [OperationName][Operation]"
        const match = h.text.match(/^\[([^\]]+)\]/);
        if (match) {
          internalAnchors.add(match[1]);
        }
      }

      // Extract local definitions - headings under "# [Local Definitions]" define terms locally
      // These can be referenced without imports
      // Handles patterns like: "## Input Section" -> allows [Input], [input], [Input Section]
      const localDefinitions = new Set();
      let inLocalDefs = false;
      let localDefsLevel = 0;
      const lines = params.lines;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const headingText = headingMatch[2].trim();

          // Check if entering Local Definitions section
          if (headingText.match(/^\[?Local Definitions\]?/)) {
            inLocalDefs = true;
            localDefsLevel = level;
            continue;
          }
          // Check if exiting Local Definitions section
          if (inLocalDefs && level <= localDefsLevel) {
            inLocalDefs = false;
          }
          // If under Local Definitions, extract the defined term
          if (inLocalDefs && level > localDefsLevel) {
            // Handle "## [Capability]" -> "Capability"
            const bracketMatch = headingText.match(/^\[([^\]]+)\]/);
            if (bracketMatch) {
              const term = bracketMatch[1];
              localDefinitions.add(term);
              localDefinitions.add(term.toLowerCase());
            } else {
              // Handle "## Input Section" -> "Input", "Input Section", "input"
              // Also handle plurals: "## Triggers Section" -> "Triggers", "Trigger", "triggers", "trigger"
              const sectionMatch = headingText.match(/^([A-Z][a-zA-Z\s&]+?)(?:\s+Section)?$/);
              if (sectionMatch) {
                const baseTerm = sectionMatch[1].trim();
                localDefinitions.add(baseTerm);
                localDefinitions.add(baseTerm.toLowerCase());
                localDefinitions.add(headingText); // Full heading like "Input Section"
                // Also add singular form if term ends in 's' (Triggers -> Trigger)
                if (baseTerm.endsWith('s') && baseTerm.length > 1) {
                  const singular = baseTerm.slice(0, -1);
                  localDefinitions.add(singular);
                  localDefinitions.add(singular.toLowerCase());
                }
              } else {
                // Plain heading like "## Error"
                localDefinitions.add(headingText);
                localDefinitions.add(headingText.toLowerCase());
              }
            }
          }
        }
      }

      // Track which refs we've already reported (to avoid duplicates)
      const reported = new Set();

      for (const ref of refs) {
        // Skip markdown checkbox patterns only
        if (markdownPatterns.has(ref)) continue;

        // Skip if already reported
        if (reported.has(ref)) continue;

        // Skip internal anchors (operations defined in this document via ## [Name][Operation])
        if (internalAnchors.has(ref)) continue;

        // Skip local definitions (terms defined under # [Local Definitions])
        if (localDefinitions.has(ref)) continue;

        // Every other bracket reference MUST have a link definition
        if (!defs.has(ref)) {
          reported.add(ref);
          // Find the line where this reference appears
          const lineNum = findLineNumber(params.lines, new RegExp(`\\[${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`));
          onError({
            lineNumber: lineNum || 1,
            detail: `Bracket reference [${ref}] has no link definition`
          });
        }
      }
    }
  },

  // BUSY041: No unused imports
  {
    names: ["BUSY041"],
    description: "All link definitions should be used in the document",
    tags: ["busy", "links"],
    function: function BUSY041(params, onError) {
      const content = params.lines.join('\n');
      const defs = extractLinkDefinitions(content);

      // Get all text after imports section to check for usage
      const importsLine = findLineNumber(params.lines, /^#\s+\[?Imports\]?/);
      if (!importsLine) return;

      // Find end of imports section
      let importsEnd = params.lines.length;
      for (let i = importsLine; i < params.lines.length; i++) {
        if (i > importsLine && params.lines[i].match(/^#\s+/)) {
          importsEnd = i;
          break;
        }
      }

      const bodyContent = params.lines.slice(importsEnd).join('\n');

      for (const [label, _path] of defs) {
        // Check if label is used in body (as [Label] or part of [Something][Label])
        const usageRegex = new RegExp(`\\[${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`);
        if (!bodyContent.match(usageRegex)) {
          const defLine = findLineNumber(params.lines, new RegExp(`^\\[${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]:`));
          onError({
            lineNumber: defLine || 1,
            detail: `Import [${label}] is defined but never used in the document`
          });
        }
      }
    }
  },

  // BUSY042: Link definitions must point to existing files
  {
    names: ["BUSY042"],
    description: "Import paths must reference existing files",
    tags: ["busy", "links", "files"],
    function: function BUSY042(params, onError) {
      const defs = extractLinkDefinitions(params.lines.join('\n'));
      const docDir = path.dirname(params.name);

      for (const [label, pathWithAnchor] of defs) {
        // Remove anchor if present
        const filePath = pathWithAnchor.split('#')[0];

        // Skip URLs
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          continue;
        }

        // Resolve relative path
        const fullPath = path.resolve(docDir, filePath);

        if (!fs.existsSync(fullPath)) {
          const defLine = findLineNumber(params.lines, new RegExp(`^\\[${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]:`));
          onError({
            lineNumber: defLine || 1,
            detail: `Import [${label}] references non-existent file: ${filePath}`
          });
        }
      }
    }
  },

  // BUSY050: Section ordering validation
  {
    names: ["BUSY050"],
    description: "Document sections must follow correct order: Imports -> Setup -> Local Definitions (optional) -> Operations",
    tags: ["busy", "structure"],
    function: function BUSY050(params, onError) {
      const headings = getHeadings(params.lines);
      const h1Headings = headings.filter(h => h.level === 1);

      const order = ['Imports', 'Setup', 'Local Definitions', 'Operations'];
      let lastIndex = -1;

      for (const heading of h1Headings) {
        // Extract the section name (handle [Section] and Section formats)
        const sectionMatch = heading.text.match(/^\[?([^\]]+)\]?/);
        if (!sectionMatch) continue;

        const sectionName = sectionMatch[1];
        const orderIndex = order.findIndex(s => sectionName.includes(s) || s.includes(sectionName));

        if (orderIndex !== -1) {
          if (orderIndex < lastIndex) {
            onError({
              lineNumber: heading.line,
              detail: `Section '${sectionName}' is out of order. Expected order: ${order.join(' -> ')}`
            });
          }
          lastIndex = orderIndex;
        }
      }
    }
  },

  // BUSY030: Operations must use level-2 headings
  {
    names: ["BUSY030"],
    description: "Operations must be defined with level-2 headings (##)",
    tags: ["busy", "operations"],
    function: function BUSY030(params, onError) {
      const opsLine = findLineNumber(params.lines, /^#\s+\[?Operations\]?/);
      if (!opsLine) return;

      // Check headings after Operations section
      const headings = getHeadings(params.lines);
      let inOps = false;

      for (const heading of headings) {
        if (heading.line === opsLine) {
          inOps = true;
          continue;
        }

        if (inOps) {
          // If we hit another level-1 heading, we're out of Operations
          if (heading.level === 1) break;

          // Operations should be level 2
          // But their sub-sections (Steps, Checklist, Input, Output) can be level 3
          if (heading.level === 2) {
            // Check if it looks like an operation definition
            if (!heading.text.match(/^\[.+\]\[Operation\]/) && !heading.text.match(/^\[.+\]$/)) {
              // It's a level-2 heading but doesn't follow operation naming convention
              // This is a warning, not necessarily an error
            }
          }
        }
      }
    }
  },

  // BUSY031: Operation headings should link to Operation concept
  {
    names: ["BUSY031"],
    description: "Operation headings should use format ## [OperationName][Operation]",
    tags: ["busy", "operations"],
    function: function BUSY031(params, onError) {
      const opsLine = findLineNumber(params.lines, /^#\s+\[?Operations\]?/);
      if (!opsLine) return;

      const headings = getHeadings(params.lines);
      let inOps = false;
      let nextH1 = params.lines.length;

      // Find next H1 after Operations
      for (const heading of headings) {
        if (heading.line > opsLine && heading.level === 1) {
          nextH1 = heading.line;
          break;
        }
      }

      for (const heading of headings) {
        if (heading.line === opsLine) {
          inOps = true;
          continue;
        }

        if (heading.line >= nextH1) break;

        if (inOps && heading.level === 2) {
          // Should match [Name][Operation] or similar pattern
          if (!heading.text.match(/^\[.+\]\[.+\]/)) {
            onError({
              lineNumber: heading.line,
              detail: `Operation heading should link to its type, e.g., ## [${heading.text.replace(/[\[\]]/g, '')}][Operation]`
            });
          }
        }
      }
    }
  },

  // BUSY032: Operation names must be CamelCase (PascalCase)
  {
    names: ["BUSY032"],
    description: "Operation names must follow CamelCase/PascalCase convention",
    tags: ["busy", "operations"],
    function: function BUSY032(params, onError) {
      const opsLine = findLineNumber(params.lines, /^#\s+\[?Operations\]?/);
      if (!opsLine) return;

      const headings = getHeadings(params.lines);
      let nextH1 = params.lines.length;

      // Find next H1 after Operations
      for (const heading of headings) {
        if (heading.line > opsLine && heading.level === 1) {
          nextH1 = heading.line;
          break;
        }
      }

      for (const heading of headings) {
        if (heading.line <= opsLine || heading.line >= nextH1) continue;
        if (heading.level !== 2) continue;

        // Extract operation name from ## [OperationName][Operation] format
        const match = heading.text.match(/^\[([^\]]+)\]\[.*\]/);
        if (!match) continue;

        const operationName = match[1];

        // Validate CamelCase: must start with uppercase, no underscores, alphanumeric only
        const camelCasePattern = /^[A-Z][a-zA-Z0-9]*$/;
        if (!camelCasePattern.test(operationName)) {
          onError({
            lineNumber: heading.line,
            detail: `Operation name '${operationName}' must be CamelCase (e.g., CreateInstance, UpdateRecord). No underscores or lowercase first letter allowed.`
          });
        }
      }
    }
  },

  // BUSY060: Section heading links must have valid targets
  {
    names: ["BUSY060"],
    description: "Section headings using [BracketedText] must have inline links or reference definitions (except under Local Definitions)",
    tags: ["busy", "links", "structure"],
    function: function BUSY060(params, onError) {
      // Read file directly to get accurate line numbers including frontmatter
      const content = getFileWithFrontmatter(params);
      if (!content) return;

      const lines = content.split('\n');
      const defs = extractLinkDefinitions(content);

      // Track whether we're inside Local Definitions section
      let inLocalDefs = false;
      let localDefsLevel = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for heading to track Local Definitions section
        const headingMatch = line.match(/^(#{1,6})\s+/);
        if (headingMatch) {
          const level = headingMatch[1].length;

          // Check if this is the Local Definitions heading
          if (line.match(/^#\s+\[?Local Definitions\]?/)) {
            inLocalDefs = true;
            localDefsLevel = level;
            continue;
          }

          // If we hit a heading at the same or higher level as Local Definitions, we've left that section
          if (inLocalDefs && level <= localDefsLevel) {
            inLocalDefs = false;
          }
        }

        // Skip validation for headings under Local Definitions (they define new concepts)
        if (inLocalDefs) continue;

        // Match level-1 headings with bracketed text but NO inline link
        // Pattern: # [SectionName] but NOT # [SectionName](url)
        const match = line.match(/^#\s+\[([^\]]+)\](?!\()/);
        if (!match) continue;

        const sectionName = match[1];

        // Check if there's a reference-style definition for this term
        if (!defs.has(sectionName)) {
          // Adjust line number to match markdownlint's params.lines bounds
          // We read full file content (with frontmatter), but markdownlint strips frontmatter
          const adjustedLineNum = i + 1 - getFrontmatterOffset(params);
          // Only report if line is within bounds
          if (adjustedLineNum > 0 && adjustedLineNum <= params.lines.length) {
            onError({
              lineNumber: adjustedLineNum,
              detail: `Section heading [${sectionName}] has no link target. Use inline link # [${sectionName}](path) or add [${sectionName}]:path to imports`
            });
          }
        }
      }
    }
  },

  // BUSY043: Import definitions in Imports section must not reference the current document with anchors
  // Link definitions in Local Definitions section ARE allowed (they're exports, not imports)
  {
    names: ["BUSY043"],
    description: "Import definitions in Imports section must not reference local definitions - place them in Local Definitions instead",
    tags: ["busy", "imports", "links"],
    function: function BUSY043(params, onError) {
      const lines = params.lines;
      const currentFile = path.basename(params.name);

      // Find the Imports section boundaries
      let importsStart = -1;
      let importsEnd = lines.length;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^#\s+\[?Imports\]?/)) {
          importsStart = i;
        } else if (importsStart >= 0 && line.match(/^#\s+/)) {
          // Next H1 heading ends the imports section
          importsEnd = i;
          break;
        }
      }

      if (importsStart < 0) return; // No imports section

      // Only check link definitions within the Imports section
      for (let i = importsStart; i < importsEnd; i++) {
        const line = lines[i];
        const defMatch = line.match(/^\[([^\]]+)\]:(.+)$/);
        if (!defMatch) continue;

        const label = defMatch[1];
        const linkPath = defMatch[2].trim();

        // Extract file path and anchor
        const pathMatch = linkPath.match(/^([^#]+)(#.*)?$/);
        if (!pathMatch) continue;

        const filePath = pathMatch[1].trim();
        const anchor = pathMatch[2] || '';
        const linkedFile = path.basename(filePath);

        // Flag self-referential imports WITH anchors in the Imports section
        // These should be in Local Definitions instead
        if (linkedFile === currentFile && anchor) {
          onError({
            lineNumber: i + 1,
            detail: `Import [${label}] references a local definition (${filePath}${anchor}). Move this link definition to Local Definitions section instead.`
          });
        }
      }
    }
  },

  // BUSY044: Section headers with bracketed terms must have link definitions
  {
    names: ["BUSY044"],
    description: "Section headers (##, ###, etc.) using [BracketedTerms] must have link definitions, even if allowed inline in prose",
    tags: ["busy", "links", "headers"],
    function: function BUSY044(params, onError) {
      // Read file directly to get accurate line numbers including frontmatter
      const content = getFileWithFrontmatter(params);
      if (!content) return;

      const lines = content.split('\n');
      const defs = extractLinkDefinitions(content);

      // Terms that are allowed inline in prose but REQUIRED in headers
      // These are structural elements that should always reference their definition
      const headerRequiredTerms = new Set([
        'Providers', 'Examples', 'Triggers', 'Input', 'Output',
        'Inputs', 'Outputs', 'Steps', 'Checklist'
      ]);

      // Extract local definitions - headings under "# Local Definitions" define concepts locally
      // These count as valid definitions and don't need imports
      const locallyDefinedTerms = new Set();
      let inLocalDefs = false;
      let localDefsLevel = 0;

      // First pass: collect locally defined terms
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headingMatch = line.match(/^(#{1,6})\s+/);
        if (headingMatch) {
          const level = headingMatch[1].length;

          if (line.match(/^#{1,6}\s+\[?Local Definitions\]?/)) {
            inLocalDefs = true;
            localDefsLevel = level;
            continue;
          }
          if (inLocalDefs && level <= localDefsLevel) {
            inLocalDefs = false;
          }
          if (inLocalDefs && level > localDefsLevel) {
            // Extract the heading name as a locally defined term
            // Match "## Input Section" -> "Input", "## [Capability]" -> "Capability"
            const bracketMatch = line.match(/^#{2,6}\s+\[([^\]]+)\]/);
            if (bracketMatch) {
              locallyDefinedTerms.add(bracketMatch[1]);
            } else {
              // Plain heading like "## Input Section" or "## Triggers Section"
              const plainMatch = line.match(/^#{2,6}\s+([A-Z][a-zA-Z\s&]+?)(?:\s+Section)?$/);
              if (plainMatch) {
                locallyDefinedTerms.add(plainMatch[1].trim());
              }
            }
          }
        }
      }

      // Second pass: check headers that need link definitions
      inLocalDefs = false;
      localDefsLevel = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for heading to track Local Definitions section
        const headingMatch = line.match(/^(#{1,6})\s+/);
        if (headingMatch) {
          const level = headingMatch[1].length;

          // Check if this is the Local Definitions heading
          if (line.match(/^#{1,6}\s+\[?Local Definitions\]?/)) {
            inLocalDefs = true;
            localDefsLevel = level;
          }
          // If we hit a heading at the same or higher level as Local Definitions, we've left that section
          else if (inLocalDefs && level <= localDefsLevel) {
            inLocalDefs = false;
          }
        }

        // Match any heading (##, ###, etc.) with bracketed text but NO inline link
        // Pattern: ## [Term] or ### [Term] but NOT ## [Term](url)
        const headerMatch = line.match(/^#{2,6}\s+\[([^\]]+)\](?!\()/);
        if (!headerMatch) continue;

        const term = headerMatch[1];

        // Check if this is a term that requires a link definition in headers
        // Skip if: has an import definition OR is defined locally in this document
        if (headerRequiredTerms.has(term) && !defs.has(term) && !locallyDefinedTerms.has(term)) {
          // Adjust line number to match markdownlint's params.lines bounds
          // We read full file content (with frontmatter), but markdownlint strips frontmatter
          const adjustedLineNum = i + 1 - getFrontmatterOffset(params);
          // Only report if line is within bounds
          if (adjustedLineNum > 0 && adjustedLineNum <= params.lines.length) {
            onError({
              lineNumber: adjustedLineNum,
              detail: `Section header [${term}] must have a link definition. Add [${term}]:path to imports section.`
            });
          }
        }

        // Skip validation for other headings under Local Definitions (they define new concepts)
        if (inLocalDefs && !headerRequiredTerms.has(term)) continue;
      }
    }
  },

  // BUSY070: Variable/field definitions should use snake_case with backticks (WARNING)
  {
    names: ["BUSY070"],
    description: "[WARNING] Variable/field definitions in Input/Output sections should be wrapped in backticks and use snake_case naming",
    tags: ["busy", "variables", "naming", "warning"],
    function: function BUSY070(params, onError) {
      const lines = params.lines;
      let inInputOrOutput = false;
      let currentSection = null;
      let inCodeBlock = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track code blocks - skip validation inside them
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) continue;

        // Check if we're entering an Input or Output section
        const inputOutputMatch = line.match(/^###\s+\[?(Input|Output)s?\]?/i);
        if (inputOutputMatch) {
          inInputOrOutput = true;
          currentSection = inputOutputMatch[1];
          continue;
        }

        // Check if we're exiting the section (next heading)
        if (inInputOrOutput && line.match(/^#{1,3}\s+/)) {
          inInputOrOutput = false;
          currentSection = null;
          continue;
        }

        // If we're in Input/Output section, check variable definitions
        if (inInputOrOutput && line.trim().startsWith('- ')) {
          // Match pattern: - identifier: or - `identifier`:
          const varMatch = line.match(/^-\s+(`?)([a-zA-Z_][a-zA-Z0-9_]*)\1:/);
          if (varMatch) {
            const hasBackticks = varMatch[1] === '`';
            const identifier = varMatch[2];
            // Allow lowercase snake_case OR UPPER_SNAKE_CASE (for constants/env vars)
            const isSnakeCase = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(identifier);
            const isUpperSnakeCase = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(identifier);
            const isValidCase = isSnakeCase || isUpperSnakeCase;

            let issues = [];
            if (!hasBackticks) {
              issues.push('not wrapped in backticks');
            }
            if (!isValidCase) {
              issues.push('not in snake_case format (use lowercase_snake_case or UPPER_SNAKE_CASE for constants)');
            }

            if (issues.length > 0) {
              const correctFormat = `\`${identifier.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/__+/g, '_')}\``;
              onError({
                lineNumber: i + 1,
                detail: `[WARNING] Variable '${identifier}' in [${currentSection}] section is ${issues.join(' and ')}. Expected format: - ${correctFormat}: description`
              });
            }
          }
        }
      }
    }
  },

  // BUSY071: Warn when inline links duplicate existing link definitions
  // If [term]:path exists, using [term](path) is redundant - just use [term]
  {
    names: ["BUSY071"],
    description: "Inline link duplicates existing link definition - use reference link instead",
    tags: ["busy", "links", "warning"],
    function: function BUSY071(params, onError) {
      const lines = params.lines;

      // First pass: collect all link definitions
      const linkDefinitions = new Map();
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const defMatch = line.match(/^\[([^\]]+)\]:(.+)$/);
        if (defMatch) {
          const label = defMatch[1].toLowerCase();
          const target = defMatch[2].trim();
          linkDefinitions.set(label, target);
        }
      }

      if (linkDefinitions.size === 0) return;

      // Second pass: find inline links that match existing definitions
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip lines inside fenced code blocks
        if (line.startsWith('```')) continue;

        // Skip link definition lines themselves
        if (line.match(/^\[([^\]]+)\]:/)) continue;

        // Find inline links: [text](url)
        const inlineLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = inlineLinkRegex.exec(line)) !== null) {
          const linkText = match[1];
          const linkTarget = match[2];
          const linkTextLower = linkText.toLowerCase();

          // Check if there's a matching link definition
          if (linkDefinitions.has(linkTextLower)) {
            const definedTarget = linkDefinitions.get(linkTextLower);
            // Normalize targets for comparison (remove leading ./)
            const normalizedInline = linkTarget.replace(/^\.\//, '');
            const normalizedDefined = definedTarget.replace(/^\.\//, '');

            // Warn if the inline link points to the same place as the definition
            if (normalizedInline === normalizedDefined) {
              onError({
                lineNumber: i + 1,
                detail: `[WARNING] Inline link [${linkText}](${linkTarget}) duplicates link definition. Use [${linkText}] instead.`
              });
            }
          }
        }
      }
    }
  }
];
