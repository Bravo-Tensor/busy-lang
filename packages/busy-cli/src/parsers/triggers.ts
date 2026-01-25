/**
 * Trigger Parser - Matches busy-python trigger parsing
 *
 * Supports two trigger formats:
 * 1. Time-based (alarm): "Set alarm for <time> to run <Operation>"
 * 2. Event-based: "When <event> [from <filter>], run <Operation>"
 *
 * Triggers can appear in:
 * - # [Triggers] section as bullet points
 * - Frontmatter as a Triggers array
 */

import { Trigger } from '../types/schema.js';
import matter from 'gray-matter';

// Weekday mapping
const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Parse a time specification into a cron expression
 *
 * @param timeSpec - Time string like "6am", "3pm each day", "9am on Monday"
 * @returns Cron expression string
 */
export function parseTimeSpec(timeSpec: string): string {
  const spec = timeSpec.toLowerCase().trim();

  // Extract hour and AM/PM
  const timeMatch = spec.match(/(\d{1,2})\s*(am|pm)/i);
  if (!timeMatch) {
    return '* * * * *'; // Default: every minute (invalid spec)
  }

  let hour = parseInt(timeMatch[1], 10);
  const isPM = timeMatch[2].toLowerCase() === 'pm';

  // Convert to 24-hour format
  if (isPM && hour !== 12) {
    hour += 12;
  } else if (!isPM && hour === 12) {
    hour = 0;
  }

  // Check for day specifications
  const dayOfWeek = parseDayOfWeek(spec);

  return `0 ${hour} * * ${dayOfWeek}`;
}

/**
 * Parse day of week specification from time string
 */
function parseDayOfWeek(spec: string): string {
  // Check for "weekdays"
  if (spec.includes('weekdays')) {
    return '1-5';
  }

  // Check for "weekends"
  if (spec.includes('weekends')) {
    return '0,6';
  }

  // Check for specific days
  const days: number[] = [];

  for (const [dayName, dayNum] of Object.entries(WEEKDAYS)) {
    // Match full day name or abbreviation
    const pattern = new RegExp(`\\b${dayName}\\b`, 'i');
    if (pattern.test(spec)) {
      if (!days.includes(dayNum)) {
        days.push(dayNum);
      }
    }
  }

  if (days.length > 0) {
    return days.sort((a, b) => a - b).join(',');
  }

  // Default: every day
  return '*';
}

/**
 * Parse a trigger declaration text into a Trigger object
 *
 * @param text - The trigger declaration text
 * @returns Trigger object
 */
export function parseTriggerDeclaration(text: string): Trigger {
  const rawText = text.trim();

  // Try to match alarm pattern: "Set alarm for <time> to run <Operation>"
  const alarmMatch = rawText.match(/set\s+alarm\s+for\s+(.+?)\s+to\s+run\s+(\w+)/i);

  if (alarmMatch) {
    const timeSpec = alarmMatch[1];
    const operation = alarmMatch[2];
    const schedule = parseTimeSpec(timeSpec);

    return {
      rawText,
      triggerType: 'alarm',
      schedule,
      operation,
      queueWhenPaused: true,
    };
  }

  // Try to match event pattern: "When <event> [from <filter>], run <Operation>"
  const eventMatch = rawText.match(/when\s+([\w.]+)(?:\s+from\s+(.+?))?,\s*run\s+(\w+)/i);

  if (eventMatch) {
    const eventType = eventMatch[1];
    const filterSpec = eventMatch[2];
    const operation = eventMatch[3];

    let filter: Record<string, string> | undefined;
    if (filterSpec) {
      // Treat filter as email pattern by default
      filter = { from: filterSpec.trim() };
    }

    return {
      rawText,
      triggerType: 'event',
      eventType,
      filter,
      operation,
      queueWhenPaused: true,
    };
  }

  // Fallback: couldn't parse, return minimal trigger
  return {
    rawText,
    triggerType: 'event',
    operation: 'Unknown',
    queueWhenPaused: true,
  };
}

/**
 * Parse triggers from frontmatter data
 */
function parseFrontmatterTriggers(data: Record<string, any>): Trigger[] {
  const triggers: Trigger[] = [];

  if (!data?.Triggers || !Array.isArray(data.Triggers)) {
    return [];
  }

  for (const item of data.Triggers) {
    if (typeof item === 'object' && item !== null) {
      // Handle structured trigger from frontmatter
      if (item.schedule) {
        // Alarm trigger with explicit cron
        triggers.push({
          rawText: JSON.stringify(item),
          triggerType: 'alarm',
          schedule: item.schedule,
          operation: item.operation || 'Unknown',
          queueWhenPaused: item.queue_when_paused ?? true,
        });
      } else if (item.event_type) {
        // Event trigger
        triggers.push({
          rawText: JSON.stringify(item),
          triggerType: 'event',
          eventType: item.event_type,
          filter: item.filter,
          operation: item.operation || 'Unknown',
          queueWhenPaused: item.queue_when_paused ?? true,
        });
      }
    }
  }

  return triggers;
}

/**
 * Parse triggers from markdown content
 * Combines triggers from both Triggers section and frontmatter
 *
 * @param content - Full markdown document content
 * @returns Array of Trigger objects
 */
export function parseTriggers(content: string): Trigger[] {
  const triggers: Trigger[] = [];

  // Extract only first frontmatter block to avoid "multiple documents" error
  const trimmedContent = content.trimStart();
  const frontmatterMatch = trimmedContent.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    try {
      const { data } = matter(frontmatterMatch[0]);
      if (data && typeof data === 'object') {
        const frontmatterTriggers = parseFrontmatterTriggers(data);
        triggers.push(...frontmatterTriggers);
      }
    } catch (e) {
      // Frontmatter parsing error, continue without frontmatter triggers
    }
  }

  // Find Triggers section
  const triggersMatch = content.match(/^#\s*\[?Triggers\]?\s*$/im);

  if (triggersMatch) {
    // Get content after Triggers heading
    const startIndex = triggersMatch.index! + triggersMatch[0].length;
    const restContent = content.slice(startIndex);

    // Find next top-level heading
    const nextH1Match = restContent.match(/\n#\s+[^\#]/);
    const triggersContent = nextH1Match
      ? restContent.slice(0, nextH1Match.index)
      : restContent;

    // Parse bullet items
    const lines = triggersContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);

      if (bulletMatch) {
        const trigger = parseTriggerDeclaration(bulletMatch[1]);
        triggers.push(trigger);
      }
    }
  }

  return triggers;
}
