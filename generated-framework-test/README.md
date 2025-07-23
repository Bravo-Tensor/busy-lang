# inquiry-to-booking-process

Generated business process framework code from BUSY files using the Orgata Framework.

## Overview

This package contains TypeScript framework code that implements business processes with complete flexibility and user control.

## Generated Components

- **2 Process Classes**: Complete business process implementations
- **12 Step Classes**: Individual step implementations
  - 0 Human Steps (with generated UI forms)
  - 11 Algorithm Steps (automated processing)
  - 1 Agent Steps (AI-powered analysis)

## Processes

### client-onboarding
- **Description**: Comprehensive onboarding process to set expectations and gather shoot requirements
- **Steps**: 6
- **Layer**: L0

### inquiry-to-booking
- **Description**: Systematic process for converting inquiries into confirmed bookings
- **Steps**: 6
- **Layer**: L0

## Usage

```typescript
import { ClientOnboardingProcess, InquiryToBookingProcess } from 'inquiry-to-booking-process';
import { ProcessContext } from '@orgata/framework';

// Create process instance
const process = new ClientOnboardingProcess();

// Execute with context
const context: ProcessContext = {
  processId: 'process-001',
  userId: 'user-123',
  sessionId: 'session-456',
  environment: 'production',
  businessContext: {
    industry: 'your-industry',
    businessSize: 'small',
    organizationId: 'org-123'
  },
  permissions: {
    canSkipSteps: true,
    canOverrideValidation: true,
    canModifyProcess: false,
    canViewAuditTrail: true
  }
};

const result = await process.execute(context);
```

## Framework Philosophy: "Facilitate, Never Constrain"

This generated code follows the Orgata Framework principles:

- **Complete Flexibility**: Users can skip any step and provide manual data
- **Immutable State**: All changes tracked with event sourcing
- **Audit Trail**: Complete history of all actions and decisions
- **AI Integration**: Intelligent assistance with human oversight
- **Never Rewrite History**: Forward-only progression with exception tracking

## Installation

```bash
npm install @orgata/framework
npm install
```

## Development

```bash
npm run build    # Compile TypeScript
npm run test     # Run tests
npm run lint     # Check code quality
```

## Generated Files

- `src/processes/` - Process class implementations
- `src/steps/` - Individual step implementations
- `src/index.ts` - Main exports

Generated on: 2025-07-22T02:24:51.271Z
