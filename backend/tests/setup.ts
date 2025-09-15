// Jest setup file for backend tests
import { jest } from '@jest/globals';

// Mock environmental variables for testing
process.env.DATABASE_URL = 'postgres://postgres:test@localhost:5432/hr_system_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';

// Increase jest timeout for integration tests
jest.setTimeout(10000);

// Mock console.log to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test database connection (if you want real DB tests)
beforeAll(async () => {
  // Initialize test database if needed
});

// Cleanup after all tests
afterAll(async () => {
  // Cleanup test database if needed
});

// Cleanup before each test
beforeEach(() => {
  jest.clearAllMocks();
});
