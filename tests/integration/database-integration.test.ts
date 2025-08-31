import { config } from '../config/environment';

describe('Database Integration', () => {
  // Skip these tests if no database is available
  const skipIfNoDatabase = process.env.SKIP_DB_TESTS === 'true';

  describe('Database Setup Script', () => {
    it('should have setup script available', () => {
      const fs = require('fs');
      const path = require('path');
      
      const setupScriptPath = path.join(__dirname, '../scripts/setup-database.ts');
      expect(fs.existsSync(setupScriptPath)).toBe(true);
    });

    it('should have database utilities available', () => {
      const dbUtils = require('../utils/database');
      expect(dbUtils.initializeDatabase).toBeDefined();
      expect(dbUtils.closeDatabase).toBeDefined();
      expect(dbUtils.checkDatabaseHealth).toBeDefined();
    });

    it('should have health check endpoint utility', () => {
      const healthCheck = require('../utils/health-check');
      expect(healthCheck.healthCheck).toBeDefined();
      expect(typeof healthCheck.healthCheck).toBe('function');
    });
  });

  describe('Package Scripts', () => {
    it('should have database management scripts in package.json', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts.migrate).toBeDefined();
      expect(packageJson.scripts['migrate:undo']).toBeDefined();
      expect(packageJson.scripts['migrate:status']).toBeDefined();
      expect(packageJson.scripts['migrate:create']).toBeDefined();
      expect(packageJson.scripts.seed).toBeDefined();
      expect(packageJson.scripts['seed:undo']).toBeDefined();
      expect(packageJson.scripts['db:create']).toBeDefined();
      expect(packageJson.scripts['db:drop']).toBeDefined();
      expect(packageJson.scripts['db:setup']).toBeDefined();
    });
  });

  describe('Environment Variables', () => {
    it('should have required database environment variables defined', () => {
      // These should be defined in test environment
      expect(process.env.DB_HOST).toBeDefined();
      expect(process.env.DB_NAME).toBeDefined();
      expect(process.env.DB_USER).toBeDefined();
      expect(process.env.DB_PASSWORD).toBeDefined();
    });

    it('should use test database in test environment', () => {
      expect(config.database.database).toContain('test');
      expect(config.database.logging).toBe(false);
    });
  });

  describe('Migration Setup', () => {
    it('should have initial migration file', () => {
      const fs = require('fs');
      const path = require('path');
      
      const migrationsDir = path.join(__dirname, '../migrations');
      const files = fs.readdirSync(migrationsDir);
      
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((file: string) => file.includes('create-initial-schema'))).toBe(true);
    });

    it('should have proper migration file structure', () => {
      const fs = require('fs');
      const path = require('path');
      
      const migrationFile = path.join(__dirname, '../migrations/00000000000000-create-initial-schema.js');
      expect(fs.existsSync(migrationFile)).toBe(true);
      
      const migrationContent = fs.readFileSync(migrationFile, 'utf8');
      expect(migrationContent).toContain('up');
      expect(migrationContent).toContain('down');
      expect(migrationContent).toContain('queryInterface');
    });
  });
});