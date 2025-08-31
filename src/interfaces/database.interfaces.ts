// Database-related interfaces

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  dialect: 'postgres' | 'mysql' | 'sqlite';
  logging?: boolean;
  pool?: {
    min: number;
    max: number;
    acquire: number;
    idle: number;
  };
}

export interface MigrationConfig {
  directory: string;
  seedersDirectory: string;
  modelsDirectory: string;
}

export interface DatabaseConnection {
  authenticate(): Promise<void>;
  close(): Promise<void>;
  sync(options?: any): Promise<void>;
}
