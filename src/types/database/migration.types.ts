// Database migration types

export interface MigrationConfig {
  up: (queryInterface: any, Sequelize: any) => Promise<void>;
  down: (queryInterface: any, Sequelize: any) => Promise<void>;
}

export interface SeederConfig {
  up: (queryInterface: any, Sequelize: any) => Promise<void>;
  down: (queryInterface: any, Sequelize: any) => Promise<void>;
}

export interface MigrationStatus {
  name: string;
  executed: boolean;
  executedAt?: Date;
}

export interface DatabaseSchema {
  version: string;
  tables: string[];
  lastMigration: string;
}
