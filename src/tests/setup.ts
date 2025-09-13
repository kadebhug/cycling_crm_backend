// Test setup file for Jest
// This file runs before each test file

import { Express } from 'express';

// Set test environment variables BEFORE importing anything else
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'cycling_crm_test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Create test app function
export async function createTestApp(): Promise<Express> {
  // Import app after environment variables are set
  const { app } = await import('../app');
  return app;
}

// Database setup functions for tests
export async function setupTestDatabase(): Promise<void> {
  try {
    const { DatabaseConnection } = await import('../config/database');
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.initialize();
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  try {
    const { DatabaseConnection } = await import('../config/database');
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.close();
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
  }
}