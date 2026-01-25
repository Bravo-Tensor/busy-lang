/**
 * Tool Parser - Matches busy-python Tool and ToolDocument models
 *
 * Tools have:
 * - name: string
 * - description: string
 * - inputs: list[str]
 * - outputs: list[str]
 * - examples: Optional[list[str]]
 * - providers: Optional[dict[str, dict[str, Any]]] (provider_name -> {action, parameters})
 */

import { Tool } from '../types/schema.js';

/**
 * Parse provider mappings from tool content
 *
 * @param content - Content of the tool section
 * @returns Record of provider name to {action, parameters}
 */
export function parseToolProviders(content: string): Record<string, { action: string; parameters?: Record<string, any> }> {
  const providers: Record<string, { action: string; parameters?: Record<string, any> }> = {};

  // Find Providers section - get everything after ### Providers or ### [Providers]
  // Or if content starts with #### (direct provider definitions)
  let providersContent: string;

  const providersMatch = content.match(/###\s*\[?Providers\]?\s*\n([\s\S]*)$/i);

  if (providersMatch) {
    providersContent = providersMatch[1];
  } else if (content.match(/^####\s+/m)) {
    // Content starts with provider definitions directly
    providersContent = content;
  } else {
    return providers;
  }

  // Trim at next ### that's not #### (to stop at next H3 section)
  const nextSectionMatch = providersContent.match(/\n###\s+[^\#]/);
  if (nextSectionMatch) {
    providersContent = providersContent.slice(0, nextSectionMatch.index);
  }

  // Split by #### headings (provider names)
  const parts = providersContent.split(/(?=####\s+)/);

  for (const part of parts) {
    if (!part.trim()) continue;

    // Match provider heading: #### providerName
    const providerMatch = part.match(/^####\s+(\w+)\s*\n?([\s\S]*)/);

    if (providerMatch) {
      const providerName = providerMatch[1];
      const providerContent = providerMatch[2] || '';

      // Extract Action
      const actionMatch = providerContent.match(/Action:\s*(.+)/i);
      const action = actionMatch ? actionMatch[1].trim() : '';

      // Extract Parameters
      const paramsMatch = providerContent.match(/Parameters:\s*\n([\s\S]*?)(?=####|Action:|$)/i);
      let parameters: Record<string, any> | undefined;

      if (paramsMatch) {
        parameters = parseYamlLikeParams(paramsMatch[1]);
      }

      if (action) {
        providers[providerName] = {
          action,
          parameters: parameters && Object.keys(parameters).length > 0 ? parameters : undefined,
        };
      }
    }
  }

  return providers;
}

/**
 * Parse YAML-like indented parameters
 */
function parseYamlLikeParams(content: string): Record<string, any> {
  const params: Record<string, any> = {};
  const lines = content.split('\n');

  let currentKey = '';
  let currentNested: Record<string, any> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check indentation level
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;

    // Match key: value pair
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);

    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim();

      if (leadingSpaces <= 2) {
        // Top-level key
        if (value) {
          params[key] = value;
        } else {
          // Nested object
          currentKey = key;
          currentNested = {};
          params[key] = currentNested;
        }
      } else if (currentNested && currentKey) {
        // Nested key
        currentNested[key] = value;
      }
    }
  }

  return params;
}

/**
 * Parse bullet list items from a section
 */
function parseBulletList(content: string, sectionName: string): string[] {
  const pattern = new RegExp(
    `###\\s*\\[?${sectionName}\\]?\\s*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`,
    'i'
  );
  const match = content.match(pattern);

  if (!match) {
    return [];
  }

  const items: string[] = [];
  const lines = match[1].split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
    }
  }

  return items;
}

/**
 * Parse tools from markdown content
 *
 * @param content - Full markdown document content
 * @returns Array of Tool objects
 */
export function parseTools(content: string): Tool[] {
  const tools: Tool[] = [];

  // Find Tools section - handle both with and without brackets
  const toolsMatch = content.match(/^#\s*\[?Tools\]?\s*$/im);

  if (!toolsMatch) {
    return [];
  }

  // Get content after Tools heading until next top-level section or end
  const startIndex = toolsMatch.index! + toolsMatch[0].length;
  const restContent = content.slice(startIndex);

  // Find next top-level heading (# not ##)
  const nextH1Match = restContent.match(/\n#\s+[^\#]/);
  const toolsContent = nextH1Match
    ? restContent.slice(0, nextH1Match.index)
    : restContent;

  // Split by ## headings to find individual tools
  const parts = toolsContent.split(/\n(?=##\s+)/);

  for (const part of parts) {
    if (!part.trim()) continue;

    // Match tool heading: ## tool_name
    const headingMatch = part.match(/^##\s+(\S+)\s*\n([\s\S]*)/);

    if (headingMatch) {
      const name = headingMatch[1].trim();
      const toolContent = headingMatch[2] || '';

      // Extract description (first paragraph before any ### section)
      const descMatch = toolContent.match(/^([^#\n][\s\S]*?)(?=\n###|$)/);
      const description = descMatch ? descMatch[1].trim() : '';

      // Parse sections
      const inputs = parseBulletList(toolContent, 'Inputs');
      const outputs = parseBulletList(toolContent, 'Outputs');
      const examples = parseBulletList(toolContent, 'Examples');
      const providers = parseToolProviders(toolContent);

      tools.push({
        name,
        description,
        inputs,
        outputs,
        examples: examples.length > 0 ? examples : undefined,
        providers: Object.keys(providers).length > 0 ? providers : undefined,
      });
    }
  }

  return tools;
}
