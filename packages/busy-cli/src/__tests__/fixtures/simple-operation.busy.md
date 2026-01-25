---
Name: SimpleOperation
Type: [Operation]
Description: A simple test operation for parsing validation.
---
# [Imports]

[Concept]: ./concept.busy.md
[Document]: ./document.busy.md

# [Local Definitions]

## InputParameter
The input data required for this operation to execute.

## OutputResult
The result produced by executing this operation.

# [Setup]

Before executing this operation, ensure the context is properly initialized.

# [Operations]

## ExecuteTask

Execute a simple task with inputs and outputs.

### [Inputs]
- task_name: Name of the task to execute
- context: Execution context with required parameters

### [Steps]
1. Validate the input parameters are present
2. Execute the main task logic referencing [Concept]
3. Store the result in [OutputResult] format

### [Outputs]
- result: The computed result
- status: Success or failure indicator

### [Checklist]
- Input parameters validated
- Task executed successfully
- Output stored correctly
