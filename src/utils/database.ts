import { DatabaseConnection } from '../config/database';
import { logger } from './logger';

/**
 * Initialize database connection and setup
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.initialize();
    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

/**
 * Close database connection gracefully
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.close();
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

/**
 * Check database health
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.testConnection();
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

export default {
  initializeDatabase,
  closeDatabase,
  checkDatabaseHealth,
};