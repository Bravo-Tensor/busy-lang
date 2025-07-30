# Simple Kitchen Example

A basic example to test the Orgata framework design with a simple peanut butter and jelly sandwich recipe.

## Overview

This example demonstrates:
- Single role (cook)
- Single playbook (PB&J sandwich recipe)
- Resource management (ingredients, tools, storage)
- Terminal-based runtime with text output
- Basic operation flow and context management

## Structure

```
simple-kitchen/
├── busy-specs/           # BUSY language definitions
│   ├── roles/
│   │   └── cook.busy
│   ├── playbooks/
│   │   └── pbj-sandwich.busy
│   └── resources/
│       └── kitchen-resources.busy
├── generated/            # Compiled runtime objects
│   ├── implementations/
│   ├── operations/
│   └── runtime.ts
└── src/                  # Manual implementation and testing
    ├── mock-services/
    ├── terminal-ui/
    └── main.ts
```

## Running the Example

```bash
cd examples/v2/simple-kitchen
npm install
npm run compile  # Compile BUSY specs to runtime
npm start        # Run the terminal-based kitchen
```

This example will validate our framework design and provide a foundation for more complex scenarios.