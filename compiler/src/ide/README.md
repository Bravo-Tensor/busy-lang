# BUSY Language Support for VS Code

Rich language support for BUSY v2.0 business process definition files.

## Features

### 🚀 Execution Strategy Preview
- **Real-time analysis** of method complexity
- **Visual preview** of execution strategies (algorithmic, AI, human)
- **Confidence scoring** for each execution type
- **Fallback chain visualization**

### 💡 Smart Auto-completion
- **Capability references** with descriptions and method details
- **Responsibility definitions** with monitoring type information
- **Resource names** with characteristics and availability
- **Common characteristics** like experience_years, capabilities, type
- **Step fields** including new v2.0 method field

### 🔍 Rich Hover Information
- **Capability details** with inputs, outputs, and method descriptions
- **Responsibility specifications** with monitoring requirements
- **Resource definitions** with inheritance and characteristics
- **Execution complexity analysis** for method fields

### 🗂️ Resource Management
- **Resource allocation graph** showing current utilization
- **Priority chain visualization** with availability status
- **Resource conflict detection** and resolution suggestions
- **Utilization statistics** and capacity planning

### 🔄 Migration Support
- **v1.0 to v2.0 migration guide** with step-by-step instructions
- **Before/after examples** for all major changes
- **Migration checklist** to ensure complete conversion
- **Automated migration tools** (coming soon)

### 🎯 Validation & Diagnostics
- **Real-time validation** of BUSY v2.0 syntax
- **Capability reference checking** with error highlighting
- **Resource requirement validation** with suggestions
- **Version compatibility warnings**

### 🏷️ Syntax Highlighting
- **BUSY-specific keywords** like capability, responsibility, method
- **Resource characteristics** and priority chains
- **Method blocks** with multi-line formatting
- **Capability and responsibility references**

## Commands

| Command | Description |
|---------|-------------|
| `BUSY: Show Execution Strategy Preview` | Opens execution analysis panel |
| `BUSY: Validate BUSY File` | Runs comprehensive validation |
| `BUSY: Show Resource Graph` | Displays resource allocation visualization |
| `BUSY: Migrate from v1.0 to v2.0` | Opens migration guide |

## Configuration

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `busyLanguageServer.enableCapabilityCompletion` | `true` | Enable auto-completion for capabilities/responsibilities |
| `busyLanguageServer.enableResourceHints` | `true` | Show resource allocation hints and warnings |
| `busyLanguageServer.enableExecutionPreview` | `true` | Show execution strategy preview on hover |
| `busyLanguageServer.showResponsibilityVisualization` | `true` | Show responsibility monitoring visualization |
| `busyLanguageServer.maxNumberOfProblems` | `1000` | Maximum number of problems to display |

### File Association

The extension automatically activates for `.busy` files. To manually associate files:

```json
{
  "files.associations": {
    "*.busy": "busy"
  }
}
```

## BUSY v2.0 Language Features

### New Constructs

- **Capabilities**: Reusable interface definitions with method, inputs, outputs
- **Responsibilities**: Continuous monitoring specifications  
- **Resources**: First-class resource definitions with characteristics
- **Requirements**: Priority-based resource allocation chains
- **Method Field**: Unified execution instructions replacing execution_type

### Example File Structure

```yaml
version: "2.0"
metadata:
  name: "Sales Process"
  layer: "L0"

capabilities:
  - capability:
      name: "qualify-lead"
      description: "Assess lead potential and fit"
      method: |
        Review lead information and company profile.
        Score lead based on qualification criteria.
        Document decision and reasoning.
      inputs:
        - name: "raw_lead"
          type: "data"
          fields:
            - name: "company_name"
              type: "string"
              required: true
      outputs:
        - name: "qualified_lead"
          type: "data"
          fields:
            - name: "qualification_status"
              type: "string"
              required: true

resources:
  - resource:
      name: "jane_doe"
      characteristics:
        type: "person"
        role: "senior_sales_rep"
        experience_years: 5
        capabilities: ["qualify-lead", "close-deals"]

playbook:
  name: "lead-qualification-process"
  steps:
    - step:
        name: "qualify_lead"
        method: |
          Review lead information and determine qualification status
          using established criteria and company fit analysis.
        requirements:
          - name: "sales_rep"
            priority:
              - specific: "jane_doe"
              - characteristics:
                  experience_years: ">2"
                  capabilities: ["qualify-lead"]
```

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or build from source:
   ```bash
   cd compiler/src/ide
   npm install
   npm run compile
   # Install VSIX package
   ```

## Requirements

- VS Code 1.75.0 or higher
- BUSY Compiler v2.0+

## Contributing

See the main [BUSY Language repository](https://github.com/busy-lang/busy) for contribution guidelines.

## License

MIT - see LICENSE file for details.