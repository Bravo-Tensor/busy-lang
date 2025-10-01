---
Name: Tool
Type: [Document]
Description: A lightweight [Document] that wraps an external capability—CLI, MCP, script, or API—so Busy agents can invoke it consistently.
---
[Concept]:./concept.md
[Document]:./document.md
[Operation]:./operation.md
[Tool]:./tool.md
[Capability]:./tool.md#capability
[Invocation Contract]:./tool.md#invocation-contract
[Inputs]:./tool.md#inputs
[Outputs]:./tool.md#outputs
[State]:./tool.md#state
[InvokeTool]:./tool.md#invoketool
[DescribeCapability]:./tool.md#describecapability

# Local Definitions
## Capability
A concise description of the effect the [Tool] provides (e.g., "Move inbox files to Gemini", "Send queued emails via SendGrid").

## Invocation Contract
The precise instructions for calling the underlying resource. Can point to an MCP endpoint, CLI command, script path, or other automation. Should include any required arguments, environment variables, secrets, and failure handling expectations.

## Inputs
The data the [Tool] expects from the caller (paths, message bodies, payloads). Reference each input with its source, such as an inbox file, shared memory document, or runtime parameter.

## Outputs
The artifacts the [Tool] produces (new files, API responses, status logs) and where they are written (e.g., outbox directory, console, remote queue).

## State
Optional instructions for maintaining or resetting any local state the [Tool] depends on (PID files, caches, token stores).

# Setup
A [Tool] is a specialized [Document] that packages how to reach an external capability so that other [Document]s and agents can invoke it consistently. Keep the [Capability] and [Invocation Contract] minimal, mechanical, and repeatable. Reference supporting prompts or scripts rather than embedding full logic inline, and cite any files the [Tool] depends on. If the implementation delegates to an MCP, CLI, or script, the [Invocation Contract] must describe exactly how to launch it and what context to pass (for example, the inbox path and triggering filename). When secrets are needed, point to their environment variable names instead of inlining the values.

# Operations

## InvokeTool
When an LLM is asked to run a [Tool], it should:
1.  **Evaluate Document:** Follow [EvaluateDocument](./document.md#evaluatedocument) to load the [Tool]'s setup and definitions.
2.  **Collect Inputs:** Read the [Inputs] definition and the calling context to gather required values. If any are missing, pause and return an [error](./operation.md#error) that lists what is needed.
3.  **Prepare Invocation:** Use the [Invocation Contract] to assemble the command, MCP request, or script execution, substituting collected inputs and checking required environment variables or files.
4.  **Execute or Simulate:** Carry out the call exactly as described. If execution is not possible in the current environment, produce a step-by-step plan or command snippet that the caller can run manually.
5.  **Handle Outputs:** Store results according to the [Outputs] definition (e.g., write to an outbox file, append to a log). Confirm success criteria or raise an [error](./operation.md#error) when the contract cannot be satisfied.

### Checklist
- Inputs collected and validated against [Inputs]; missing values reported via [error].
- Invocation assembled according to [Invocation Contract] (including env vars and files).
- Execution performed or a runnable plan provided with exact commands/request.
- Outputs stored in the declared locations and success criteria confirmed.

## DescribeCapability
Summarize what the [Tool] does so other agents can decide when to invoke it.
1.  Read the [Capability], [Inputs], and [Outputs] definitions.
2.  Produce a short description that includes the action performed, required inputs, and primary output location.
3.  Mention the execution mode (script, MCP, CLI, etc.) drawn from the [Invocation Contract].
