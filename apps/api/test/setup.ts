// Jest setup file for unit tests
import 'reflect-metadata';

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console logs during tests unless VERBOSE is set
  if (!process.env.VERBOSE) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
    // Keep warn and error for debugging
  }
});

afterAll(() => {
  // Restore console
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// Increase test timeout for slow operations
jest.setTimeout(10000);

// Clear all mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
