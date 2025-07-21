# Knit-Claude Code Integration Design

## Overview

This design extends Knit Workflow V2 with two major enhancements:
1. **LLM Delegation Mode**: Defer reconciliation work to Claude Code instead of using internal LLM
2. **Automatic Link Analysis**: Intelligent dependency detection and management

## 1. LLM Delegation Mode

### Problem Statement

Current knit workflow requires its own LLM configuration and makes reconciliation decisions independently. This creates:
- Duplication of LLM costs and configuration
- Inconsistent reconciliation quality vs Claude Code
- Limited context awareness compared to active development session

### Solution: Delegation Architecture

```typescript
interface DelegationMode {
  mode: 'internal' | 'delegate';
  outputFormat: 'prompt' | 'structured' | 'commands';
  contextLevel: 'minimal' | 'full';
}

interface ReconciliationRequest {
  id: string;
  sourceFile: string;
  targetFile: string;
  changes: string;  // git diff
  relationship: DependencyRelationship;
  context: ProjectContext;
  prompt: string;  // Generated prompt for Claude Code
}
```

### Workflow Comparison

**Current (Internal LLM):**
```bash
knit reconcile → knit calls OpenAI → applies changes automatically
```

**New (Delegation):**
```bash
knit reconcile --delegate → outputs reconciliation requests → Claude Code processes → applies changes
```

### Implementation Modes

#### Mode 1: Structured JSON Output
```bash
knit reconcile --delegate --format structured
```

Outputs JSON with reconciliation requests that Claude Code can process:
```json
{
  "reconciliations": [
    {
      "id": "reconcile_001",
      "sourceFile": "design/api.md",
      "targetFile": "src/api/routes.ts",
      "relationship": "design_to_implementation",
      "changes": "Added new /users/profile endpoint with authentication requirements",
      "context": {
        "projectType": "typescript",
        "frameworks": ["express", "typescript"],
        "relatedFiles": ["src/types/api.ts", "tests/api.test.ts"]
      },
      "prompt": "Update the API routes implementation based on the design changes. The design document now specifies a new /users/profile endpoint that requires authentication. Please add the appropriate route handler with authentication middleware."
    }
  ]
}
```

#### Mode 2: Interactive Command Generation
```bash
knit reconcile --delegate --interactive
```

Opens structured prompts in editor for Claude Code to process directly.

#### Mode 3: Command Pipeline
```bash
knit reconcile --delegate --format commands | claude-code process-reconcile
```

Generates commands that Claude Code can execute through a processing pipeline.

### Claude Code Integration

#### New Slash Commands
- `/knit-reconcile` - Trigger knit reconcile in delegation mode and process results
- `/knit-analyze` - Run dependency analysis and review suggestions
- `/knit-links` - Show current dependency graph with suggestions
- `/knit-setup` - Initialize knit with intelligent initial links

#### Example Workflow
```bash
# User modifies design document
vim design/user-management.md

# Claude Code runs reconciliation
/knit-reconcile

# Output:
🔄 Knit found 3 files needing updates:
• src/services/user-service.ts (design changes require new methods)
• tests/user-service.test.ts (new test cases needed)
• src/types/user.ts (interface updates required)

Processing updates...
✅ Updated src/services/user-service.ts
✅ Updated tests/user-service.test.ts
✅ Updated src/types/user.ts

Summary: All dependent files reconciled with design changes
```

## 2. Automatic Link Analysis System

### Problem Statement

Currently, developers must manually create dependency links using `knit link`. This is:
- Time-consuming for new projects
- Easy to forget for new files
- Prone to missing important relationships

### Solution: Intelligent Link Discovery

#### Analysis Triggers
1. **File Creation**: Analyze new file against existing files
2. **Significant Updates**: Re-analyze when file changes >30%
3. **Manual Scan**: `knit analyze-links` command
4. **Scheduled**: Periodic full project analysis

#### Link Suggestion Algorithm

```typescript
interface LinkSuggestion {
  sourceFile: string;
  targetFile: string;
  confidence: number;  // 0-1 scale
  reasoning: string;
  relationship: 'design_to_code' | 'code_to_test' | 'spec_to_impl' | 'bidirectional';
  evidence: {
    sharedTerms: string[];
    structuralSimilarity: number;
    explicitReferences: string[];
    patternMatches: PatternMatch[];
  };
}

class LinkAnalyzer {
  async analyzeFile(newFile: string): Promise<LinkSuggestion[]> {
    const content = await this.readFile(newFile);
    const candidates = await this.findCandidateFiles(newFile);
    
    const suggestions = await Promise.all(
      candidates.map(candidate => this.scoreRelationship(newFile, candidate))
    );
    
    return suggestions
      .filter(s => s.confidence > this.config.threshold)
      .sort((a, b) => b.confidence - a.confidence);
  }
}
```

#### Pattern Recognition Rules

```typescript
const linkPatterns = [
  // Design → Implementation
  {
    source: /\.(md|txt)$/,
    target: /\.(ts|js|py)$/,
    indicators: ['API', 'endpoint', 'function', 'class', 'interface'],
    relationship: 'design_to_code',
    baseConfidence: 0.8
  },
  
  // Code → Tests
  {
    source: /src\/.*\.(ts|js)$/,
    target: /tests?\/.*\.(test|spec)\.(ts|js)$/,
    indicators: ['function', 'class', 'export'],
    relationship: 'code_to_test',
    baseConfidence: 0.9
  },
  
  // README → Implementation
  {
    source: /README\.md$/,
    target: /src\/.*\.(ts|js)$/,
    indicators: ['usage', 'example', 'API', 'getting started'],
    relationship: 'spec_to_impl',
    baseConfidence: 0.6
  },
  
  // Type Definitions → Usage
  {
    source: /types\/.*\.(ts|d\.ts)$/,
    target: /src\/.*\.(ts|js)$/,
    indicators: ['interface', 'type', 'export'],
    relationship: 'types_to_usage',
    baseConfidence: 0.7
  }
];
```

#### Analysis Workflow

**Scenario 1: New File Creation**
```bash
# User creates new service file
touch src/services/user-service.ts

# Claude Code detects and analyzes
/knit-analyze src/services/user-service.ts

# Output:
🔍 Analyzing new file: src/services/user-service.ts

📋 Suggested dependency links:
• src/services/user-service.ts → tests/user-service.test.ts (90% confidence)
  Reasoning: Standard test pattern for service files
  Evidence: File name pattern match, service export detected

• README.md → src/services/user-service.ts (75% confidence)  
  Reasoning: README mentions user service functionality
  Evidence: Shared terms: ["user", "service", "authentication"]

• src/types/user.ts → src/services/user-service.ts (85% confidence)
  Reasoning: Service likely uses user type definitions
  Evidence: Import statement detected, shared domain context

Would you like me to:
1. Add high-confidence links (>80%) automatically ✅
2. Review each suggestion individually 📝
3. Skip for now ⏭️
```

**Scenario 2: Project Setup**
```bash
/knit-setup

# Output:
📊 Analyzing project structure...
Found: TypeScript + Express.js project

🔗 Creating intelligent dependency relationships:
• README.md → src/index.ts (main entry point documentation)
• design/api-spec.md → src/api/routes.ts (API implementation)
• src/api/routes.ts → tests/api.test.ts (test coverage)
• package.json → src/ (dependencies influence implementation)
• src/types/ → src/services/ (type usage relationships)
• .env.example → src/config/ (configuration relationships)

🎯 Created 15 dependency links with average confidence: 82%
⚙️ Knit configured for continuous development workflow
```

## 3. Enhanced CLI Interface

### New Commands

```bash
# Delegation mode
knit reconcile --delegate [--format structured|commands|interactive]

# Link analysis  
knit analyze-links [file] [--threshold 0.7] [--auto-add]
knit suggest-links [--project-setup] [--confidence-threshold 0.8]

# Integration commands
knit export-claude-commands  # Export Claude Code command definitions
knit setup-claude-integration  # Configure Claude Code integration
```

### Configuration Updates

```json
{
  "delegation": {
    "enabled": true,
    "defaultMode": "structured",
    "contextLevel": "full"
  },
  "linkAnalysis": {
    "autoAnalyzeNewFiles": true,
    "confidenceThreshold": 0.75,
    "autoAddThreshold": 0.85,
    "patterns": "default",  // or path to custom patterns
    "watchForChanges": true
  },
  "claudeIntegration": {
    "enabled": true,
    "commands": ["/knit-reconcile", "/knit-analyze", "/knit-setup"],
    "autoTrigger": {
      "onFileCreate": true,
      "onSignificantChange": true,
      "significantChangeThreshold": 0.3
    }
  }
}
```

## 4. Implementation Strategy

### Phase 1: Delegation Mode (Week 1)
- Add `--delegate` flag to reconcile command
- Implement structured JSON output format
- Basic prompt generation for Claude Code processing

### Phase 2: Link Analysis Engine (Week 2)  
- Implement file content analysis and pattern matching
- Create confidence scoring algorithm
- Add suggestion generation and filtering

### Phase 3: Claude Code Integration (Week 3)
- Implement Claude Code slash commands
- Create processing pipeline for reconciliation requests
- Add file watching and auto-analysis triggers

### Phase 4: Enhanced UX (Week 4)
- Interactive review interfaces
- Project setup automation
- Performance optimization and caching

## 5. Benefits

### For Developers
- **Unified LLM Experience**: Single Claude Code session handles all AI-powered development
- **Intelligent Automation**: Automatic dependency discovery reduces manual setup
- **Contextual Awareness**: Claude Code has full project context during reconciliation
- **Cost Efficiency**: Single LLM subscription instead of multiple API keys

### For Project Maintenance
- **Comprehensive Coverage**: Automatic link analysis ensures no relationships are missed
- **Adaptive Learning**: Pattern recognition improves over time with usage
- **Project-Specific Intelligence**: Learns project patterns and conventions
- **Reduced Friction**: Seamless integration with existing development workflow

This design transforms knit from a standalone tool into an intelligent assistant that integrates deeply with the Claude Code development environment, providing unprecedented automation and intelligence for dependency management.