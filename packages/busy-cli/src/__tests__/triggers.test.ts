/**
 * Trigger Parsing Tests - Match busy-python Trigger model
 *
 * busy-python supports two trigger formats:
 * 1. Time-based (alarm): "Set alarm for <time> to run <Operation>"
 * 2. Event-based: "When <event> [from <filter>], run <Operation>"
 *
 * Triggers can appear in:
 * - # [Triggers] section as bullet points
 * - Frontmatter as a Triggers array
 */

import { describe, it, expect } from 'vitest';
import { parseTriggers, parseTriggerDeclaration, parseTimeSpec } from '../parsers/triggers';
import type { Trigger } from '../types/schema';

describe('parseTriggerDeclaration', () => {
  describe('Alarm Triggers (Time-based)', () => {
    it('should parse simple alarm trigger', () => {
      const text = 'Set alarm for 6am to run DailyReview';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.triggerType).toBe('alarm');
      expect(trigger.operation).toBe('DailyReview');
      expect(trigger.rawText).toBe(text);
    });

    it('should convert time to cron expression', () => {
      const text = 'Set alarm for 6am each morning to run DailyReview';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.schedule).toBe('0 6 * * *');
    });

    it('should handle PM times', () => {
      const text = 'Set alarm for 3pm to run AfternoonCheck';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.schedule).toBe('0 15 * * *');
    });

    it('should handle 12-hour format edge cases', () => {
      const trigger12am = parseTriggerDeclaration('Set alarm for 12am to run Midnight');
      expect(trigger12am.schedule).toBe('0 0 * * *');

      const trigger12pm = parseTriggerDeclaration('Set alarm for 12pm to run Noon');
      expect(trigger12pm.schedule).toBe('0 12 * * *');
    });

    it('should handle weekly schedules', () => {
      const text = 'Set alarm for 9am on Monday to run WeeklySync';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.schedule).toBe('0 9 * * 1');
    });

    it('should handle multiple days', () => {
      const text = 'Set alarm for 8am on Monday, Wednesday, Friday to run StandupReminder';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.schedule).toBe('0 8 * * 1,3,5');
    });
  });

  describe('Event Triggers', () => {
    it('should parse simple event trigger', () => {
      const text = 'When gmail.message.received, run ProcessEmail';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.triggerType).toBe('event');
      expect(trigger.eventType).toBe('gmail.message.received');
      expect(trigger.operation).toBe('ProcessEmail');
    });

    it('should parse event trigger with filter', () => {
      const text = 'When gmail.message.received from *@lead.com, run ProcessLead';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.triggerType).toBe('event');
      expect(trigger.eventType).toBe('gmail.message.received');
      expect(trigger.filter).toEqual({ from: '*@lead.com' });
      expect(trigger.operation).toBe('ProcessLead');
    });

    it('should handle various event types', () => {
      const events = [
        'When slack.message.posted, run NotifyTeam',
        'When github.pr.opened, run ReviewPR',
        'When calendar.event.created, run ScheduleReminder',
      ];

      for (const text of events) {
        const trigger = parseTriggerDeclaration(text);
        expect(trigger.triggerType).toBe('event');
        expect(trigger.eventType).not.toBeUndefined();
        expect(trigger.operation).not.toBeUndefined();
      }
    });

    it('should handle complex filter patterns', () => {
      const text = 'When email.received from *@company.com, run InternalEmail';

      const trigger = parseTriggerDeclaration(text);
      expect(trigger.filter?.from).toBe('*@company.com');
    });
  });

  describe('queueWhenPaused', () => {
    it('should default to true', () => {
      const trigger = parseTriggerDeclaration('When event.test, run TestOp');
      expect(trigger.queueWhenPaused).toBe(true);
    });
  });
});

describe('parseTimeSpec', () => {
  it('should parse simple hour AM', () => {
    expect(parseTimeSpec('6am')).toBe('0 6 * * *');
    expect(parseTimeSpec('9am')).toBe('0 9 * * *');
    expect(parseTimeSpec('11am')).toBe('0 11 * * *');
  });

  it('should parse simple hour PM', () => {
    expect(parseTimeSpec('1pm')).toBe('0 13 * * *');
    expect(parseTimeSpec('6pm')).toBe('0 18 * * *');
    expect(parseTimeSpec('11pm')).toBe('0 23 * * *');
  });

  it('should handle 12am and 12pm', () => {
    expect(parseTimeSpec('12am')).toBe('0 0 * * *');
    expect(parseTimeSpec('12pm')).toBe('0 12 * * *');
  });

  it('should handle times with "each morning"', () => {
    expect(parseTimeSpec('6am each morning')).toBe('0 6 * * *');
  });

  it('should handle times with "every day"', () => {
    expect(parseTimeSpec('3pm every day')).toBe('0 15 * * *');
  });

  it('should handle weekday specifications', () => {
    expect(parseTimeSpec('9am on Monday')).toBe('0 9 * * 1');
    expect(parseTimeSpec('9am on Tuesday')).toBe('0 9 * * 2');
    expect(parseTimeSpec('9am on Wednesday')).toBe('0 9 * * 3');
    expect(parseTimeSpec('9am on Thursday')).toBe('0 9 * * 4');
    expect(parseTimeSpec('9am on Friday')).toBe('0 9 * * 5');
    expect(parseTimeSpec('9am on Saturday')).toBe('0 9 * * 6');
    expect(parseTimeSpec('9am on Sunday')).toBe('0 9 * * 0');
  });

  it('should handle multiple weekdays', () => {
    expect(parseTimeSpec('8am on Monday, Wednesday, Friday')).toBe('0 8 * * 1,3,5');
    expect(parseTimeSpec('10am on Tuesday, Thursday')).toBe('0 10 * * 2,4');
  });

  it('should handle weekdays modifier', () => {
    expect(parseTimeSpec('9am on weekdays')).toBe('0 9 * * 1-5');
  });

  it('should handle weekends modifier', () => {
    expect(parseTimeSpec('10am on weekends')).toBe('0 10 * * 0,6');
  });
});

describe('parseTriggers', () => {
  it('should parse triggers from Triggers section', () => {
    const content = `
# [Triggers]

- Set alarm for 6am to run DailyReview
- When gmail.message.received from *@lead.com, run ProcessLead
`;

    const triggers = parseTriggers(content);
    expect(triggers).toHaveLength(2);
    expect(triggers[0].triggerType).toBe('alarm');
    expect(triggers[1].triggerType).toBe('event');
  });

  it('should parse triggers from frontmatter', () => {
    const content = `
---
Name: AutomatedDoc
Type: [Document]
Description: Document with triggers
Triggers:
  - event_type: gmail.message.received
    filter:
      from: "*@important.com"
    operation: ProcessImportant
    queue_when_paused: false
---

# Content
`;

    const triggers = parseTriggers(content);
    expect(triggers).toHaveLength(1);
    expect(triggers[0].eventType).toBe('gmail.message.received');
    expect(triggers[0].filter).toEqual({ from: '*@important.com' });
    expect(triggers[0].queueWhenPaused).toBe(false);
  });

  it('should combine frontmatter and section triggers', () => {
    const content = `
---
Name: Mixed
Type: [Document]
Description: Mixed triggers
Triggers:
  - event_type: webhook.received
    operation: HandleWebhook
---

# [Triggers]

- Set alarm for 9am to run MorningTask
`;

    const triggers = parseTriggers(content);
    expect(triggers).toHaveLength(2);
  });

  it('should return empty array for document without triggers', () => {
    const content = `
---
Name: NoTriggers
Type: [Document]
Description: No triggers here
---

# [Operations]

## SomeOp

### [Steps]
1. Do something
`;

    const triggers = parseTriggers(content);
    expect(triggers).toHaveLength(0);
  });

  it('should handle Triggers section without bracket notation', () => {
    const content = `
# Triggers

- When test.event, run TestOp
`;

    const triggers = parseTriggers(content);
    expect(triggers).toHaveLength(1);
  });

  it('should parse frontmatter alarm triggers', () => {
    const content = `
---
Name: Scheduled
Type: [Document]
Description: Scheduled document
Triggers:
  - schedule: "0 6 * * *"
    operation: DailyTask
---
`;

    const triggers = parseTriggers(content);
    expect(triggers).toHaveLength(1);
    expect(triggers[0].triggerType).toBe('alarm');
    expect(triggers[0].schedule).toBe('0 6 * * *');
  });
});

describe('Trigger Format Validation', () => {
  it('should match busy-python alarm pattern', () => {
    // busy-python pattern: r"(?i)set\s+alarm\s+for\s+(.+?)\s+to\s+run\s+(\w+)"
    const pattern = /(?:set\s+alarm\s+for\s+)(.+?)\s+to\s+run\s+(\w+)/i;

    const testCases = [
      { input: 'Set alarm for 6am to run DailyReview', time: '6am', op: 'DailyReview' },
      { input: 'set alarm for 3pm each day to run Check', time: '3pm each day', op: 'Check' },
      { input: 'SET ALARM FOR 9am on Monday to run Weekly', time: '9am on Monday', op: 'Weekly' },
    ];

    for (const { input, time, op } of testCases) {
      const match = pattern.exec(input);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe(time);
      expect(match?.[2]).toBe(op);
    }
  });

  it('should match busy-python event pattern', () => {
    // busy-python pattern: r"(?i)when\s+([\w.]+)(?:\s+from\s+(.+?))?,\s*run\s+(\w+)"
    const pattern = /(?:when\s+)([\w.]+)(?:\s+from\s+(.+?))?,\s*run\s+(\w+)/i;

    const testCases = [
      { input: 'When gmail.message.received, run Process', event: 'gmail.message.received', filter: undefined, op: 'Process' },
      { input: 'When email.sent from *@test.com, run Log', event: 'email.sent', filter: '*@test.com', op: 'Log' },
      { input: 'WHEN slack.posted, RUN Notify', event: 'slack.posted', filter: undefined, op: 'Notify' },
    ];

    for (const { input, event, filter, op } of testCases) {
      const match = pattern.exec(input);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe(event);
      expect(match?.[2]).toBe(filter);
      expect(match?.[3]).toBe(op);
    }
  });
});
