import { Sequelize, Options } from 'sequelize';
import { config } from './environment';
import { logger } from '../utils/logger';

// Sequelize configuration options
const sequelizeOptions: Options = {
  host: config.database.host,
  port: config.database.port,
  dialect: config.database.dialect,
  logging: config.database.logging ? (msg: string) => logger.debug(msg) : false,
  pool: config.database.pool,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  dialectOptions: {
    ssl: config.server.nodeEnv === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
  },
};

// Create Sequelize instance
export const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  sequelizeOptions
);

// Database connection utilities
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() { }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database connection and sync models
   */
  public async initialize(): Promise<void> {
    try {
      // Test the connection
      await this.testConnection();

      // Import and initialize models
      await this.initializeModels();

      // Sync database (create tables if they don't exist)
      if (config.server.nodeEnv === 'development') {
        await sequelize.sync({ alter: true });
        logger.info('Database synchronized successfully');
      }

      this.isConnected = true;
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<void> {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Unable to connect to database:', error);
      throw error;
    }
  }

  /**
   * Initialize all models and their associations
   */
  private async initializeModels(): Promise<void> {
    try {
      // Import and initialize models
      const { initializeModels } = await import('../database/models');
      initializeModels(sequelize);
      logger.info('Models initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize models:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    try {
      await sequelize.close();
      this.isConnected = false;
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  public isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get Sequelize instance
   */
  public getSequelize(): Sequelize {
    return sequelize;
  }
}

// Export database configuration for Sequelize CLI
export const databaseConfig = {
  development: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: config.database.logging,
  },
  test: {
    username: config.database.username,
    password: config.database.password,
    database: `${config.database.database}_test`,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
  },
  production: {
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
  }
};

