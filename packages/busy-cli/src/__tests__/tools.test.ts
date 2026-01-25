/**
 * Tool Parsing Tests - Match busy-python Tool and ToolDocument models
 *
 * busy-python Tool model:
 * - name: str
 * - description: str
 * - inputs: list[str]
 * - outputs: list[str]
 * - examples: Optional[list[str]]
 * - providers: Optional[dict[str, dict[str, Any]]] (provider_name -> {action, parameters})
 */

import { describe, it, expect } from 'vitest';
import { parseTools, parseToolProviders } from '../parsers/tools';
import type { Tool, ToolDocument } from '../types/schema';

describe('parseTools', () => {
  it('should parse tool with all fields', () => {
    const content = `
# [Tools]

## send_email

Send an email to one or more recipients.

### [Inputs]
- to: Recipient email address(es)
- subject: Email subject line
- body: Email body content
- cc: (Optional) CC recipients

### [Outputs]
- message_id: The sent message ID
- thread_id: The thread ID

### [Examples]
- send_email(to="user@example.com", subject="Hello", body="Hi there")
- send_email(to="team@company.com", subject="Update", body="Status report", cc="manager@company.com")

### [Providers]

#### composio
Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  subject: subject
  body: body

#### mcp
Action: gmail/sendEmail
Parameters:
  recipient: to
  title: subject
  content: body
`;

    const tools = parseTools(content);
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool.name).toBe('send_email');
    expect(tool.description).toBe('Send an email to one or more recipients.');
    expect(tool.inputs).toHaveLength(4);
    expect(tool.outputs).toHaveLength(2);
    expect(tool.examples).toHaveLength(2);
    expect(tool.providers).toHaveProperty('composio');
    expect(tool.providers).toHaveProperty('mcp');
  });

  it('should parse multiple tools', () => {
    const content = `
# [Tools]

## list_emails

List emails from inbox.

### [Inputs]
- limit: Maximum number to return

### [Outputs]
- emails: List of email objects

## get_email

Get a single email by ID.

### [Inputs]
- message_id: The email message ID

### [Outputs]
- email: The email object
`;

    const tools = parseTools(content);
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toEqual(['list_emails', 'get_email']);
  });

  it('should handle tool without providers', () => {
    const content = `
# [Tools]

## local_tool

A tool without external providers.

### [Inputs]
- data: Input data

### [Outputs]
- result: Output result
`;

    const tools = parseTools(content);
    expect(tools).toHaveLength(1);
    expect(tools[0].providers).toBeUndefined();
  });

  it('should handle tool without examples', () => {
    const content = `
# [Tools]

## simple_tool

Simple tool description.

### [Inputs]
- input: The input

### [Outputs]
- output: The output
`;

    const tools = parseTools(content);
    expect(tools).toHaveLength(1);
    expect(tools[0].examples).toBeUndefined();
  });

  it('should parse tool inputs as string array', () => {
    const content = `
# [Tools]

## process

### [Inputs]
- data: The raw data to process
- format: Output format (json, xml, csv)
- validate: Whether to validate (default: true)
`;

    const tools = parseTools(content);
    expect(tools[0].inputs).toEqual([
      'data: The raw data to process',
      'format: Output format (json, xml, csv)',
      'validate: Whether to validate (default: true)',
    ]);
  });

  it('should handle Tools section without bracket notation', () => {
    const content = `
# Tools

## my_tool

Tool description.

### Inputs
- input: Data

### Outputs
- output: Result
`;

    const tools = parseTools(content);
    expect(tools).toHaveLength(1);
  });

  it('should return empty array for document without Tools section', () => {
    const content = `
# [Operations]

## SomeOp

Not a tool document.
`;

    const tools = parseTools(content);
    expect(tools).toHaveLength(0);
  });
});

describe('parseToolProviders', () => {
  it('should parse provider with action and parameters', () => {
    const content = `
### [Providers]

#### composio
Action: GMAIL_SEND_EMAIL
Parameters:
  to: recipient
  subject: title
  body: content
`;

    const providers = parseToolProviders(content);
    expect(providers).toHaveProperty('composio');
    expect(providers.composio.action).toBe('GMAIL_SEND_EMAIL');
    expect(providers.composio.parameters).toEqual({
      to: 'recipient',
      subject: 'title',
      body: 'content',
    });
  });

  it('should parse multiple providers', () => {
    const content = `
### [Providers]

#### composio
Action: COMPOSIO_ACTION

#### mcp
Action: mcp/action

#### custom
Action: custom.action
`;

    const providers = parseToolProviders(content);
    expect(Object.keys(providers)).toHaveLength(3);
    expect(providers.composio.action).toBe('COMPOSIO_ACTION');
    expect(providers.mcp.action).toBe('mcp/action');
    expect(providers.custom.action).toBe('custom.action');
  });

  it('should handle provider without parameters', () => {
    const content = `
### [Providers]

#### simple
Action: SIMPLE_ACTION
`;

    const providers = parseToolProviders(content);
    expect(providers.simple.action).toBe('SIMPLE_ACTION');
    expect(providers.simple.parameters).toBeUndefined();
  });

  it('should return empty object for content without providers', () => {
    const content = `
### [Inputs]
- data: Input
`;

    const providers = parseToolProviders(content);
    expect(providers).toEqual({});
  });

  it('should handle Providers section without bracket notation', () => {
    const content = `
### Providers

#### test
Action: TEST_ACTION
`;

    const providers = parseToolProviders(content);
    expect(providers).toHaveProperty('test');
  });
});

describe('ToolDocument Integration', () => {
  it('should parse complete tool document', () => {
    const content = `
---
Name: GmailTools
Type: [Tool]
Description: Gmail integration tools for email management.
Provider: composio
---

# [Imports]

[Tool]: ../core/tool.busy.md

# [Tools]

## send_email

Send an email message.

### [Inputs]
- to: Recipient
- subject: Subject
- body: Body

### [Outputs]
- message_id: Sent message ID

### [Providers]

#### composio
Action: GMAIL_SEND_EMAIL
Parameters:
  to: to
  subject: subject
  body: body

## list_emails

List inbox emails.

### [Inputs]
- limit: Max count

### [Outputs]
- emails: Email list

### [Providers]

#### composio
Action: GMAIL_LIST_EMAILS
Parameters:
  max_results: limit
`;

    // This would be parsed by parseDocument and return a ToolDocument
    const tools = parseTools(content);
    expect(tools).toHaveLength(2);

    const sendEmail = tools.find((t) => t.name === 'send_email');
    expect(sendEmail?.providers?.composio?.action).toBe('GMAIL_SEND_EMAIL');

    const listEmails = tools.find((t) => t.name === 'list_emails');
    expect(listEmails?.providers?.composio?.action).toBe('GMAIL_LIST_EMAILS');
  });
});

describe('Tool Provider Parameter Mapping', () => {
  it('should support direct parameter mapping', () => {
    const content = `
#### provider
Action: ACTION
Parameters:
  api_to: to
  api_subject: subject
`;

    const providers = parseToolProviders(content);
    expect(providers.provider.parameters).toEqual({
      api_to: 'to',
      api_subject: 'subject',
    });
  });

  it('should support nested parameter values', () => {
    const content = `
#### provider
Action: ACTION
Parameters:
  recipient:
    email: to
    name: sender_name
  content:
    subject: subject
    body: body
`;

    const providers = parseToolProviders(content);
    expect(providers.provider.parameters).toEqual({
      recipient: { email: 'to', name: 'sender_name' },
      content: { subject: 'subject', body: 'body' },
    });
  });
});
