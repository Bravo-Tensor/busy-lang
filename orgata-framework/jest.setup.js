// Increase memory limit for tests
if (global.gc) {
  global.gc();
}

// Set test timeout
jest.setTimeout(30000);