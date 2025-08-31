#!/usr/bin/env ts-node

import { initializeDatabase, closeDatabase } from '../utils/database';
import { logger } from '../utils/logger';

/**
 * Database setup script
 * This script initializes the database connection and creates tables
 */
async function setupDatabase(): Promise<void> {
  try {
    logger.info('Starting database setup...');
    
    // Initialize database connection
    await initializeDatabase();
    
    logger.info('Database setup completed successfully!');
    logger.info('You can now run migrations with: npm run migrate');
    
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

export default setupDatabase;