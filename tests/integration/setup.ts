// Test setup configuration
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Database initialization will be handled per test suite as needed
  // This allows tests to run without requiring actual database connection
}, 30000); // 30 second timeout for database setup

afterAll(async () => {
  // Cleanup will be handled per test suite as needed
});

// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}