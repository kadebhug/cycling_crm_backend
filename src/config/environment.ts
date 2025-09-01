import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'postgres';
  logging: boolean;
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  uploadPath: string;
}

interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  logLevel: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  jwt: JWTConfig;
  upload: UploadConfig;
  encryptionKey: string;
}

const validateEnvironment = (): void => {
  const requiredVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate DB_PASSWORD is not empty or placeholder
  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'your_password') {
    throw new Error('DB_PASSWORD must be set to your actual PostgreSQL password');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }
};

// Validate environment variables in production
if (process.env.NODE_ENV === 'production') {
  validateEnvironment();
}

export const config: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    logLevel: process.env.LOG_LEVEL || 'info',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'cycling_crm',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
};

export default config;