// Test setup for knit dependency reconciliation system

// Mock external dependencies for testing
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  needs_update: true,
                  changes_needed: 'Test reconciliation',
                  category: 'implementation',
                  confidence: 0.9,
                  contradictions: [],
                  classification: 'SAFE_AUTO_APPLY'
                })
              }
            }]
          })
        }
      }
    }))
  };
});

// Set up test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);