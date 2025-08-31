// Database-related constants

export const DATABASE_CONFIG = {
  POOL: {
    MIN: 0,
    MAX: 10,
    ACQUIRE: 30000,
    IDLE: 10000,
  },
  RETRY: {
    MAX: 3,
    DELAY: 1000,
  },
} as const;

export const MIGRATION_CONFIG = {
  DIRECTORY: 'src/database/migrations',
  SEEDERS_DIRECTORY: 'src/database/seeders',
  MODELS_DIRECTORY: 'src/database/models',
} as const;

export const SEQUELIZE_CONFIG = {
  DIALECT: 'postgres',
  LOGGING: process.env.NODE_ENV === 'development',
  BENCHMARK: process.env.NODE_ENV === 'development',
} as const;
