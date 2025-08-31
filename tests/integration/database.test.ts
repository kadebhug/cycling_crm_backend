import { config } from '../config/environment';

describe('Database Configuration', () => {
  describe('Environment Configuration', () => {
    it('should have database configuration defined', () => {
      expect(config.database).toBeDefined();
      expect(config.database.host).toBeDefined();
      expect(config.database.port).toBeDefined();
      expect(config.database.database).toBeDefined();
      expect(config.database.username).toBeDefined();
      expect(config.database.dialect).toBe('postgres');
    });

    it('should have connection pool configuration', () => {
      expect(config.database.pool).toBeDefined();
      expect(config.database.pool.max).toBeGreaterThan(0);
      expect(config.database.pool.min).toBeGreaterThanOrEqual(0);
      expect(config.database.pool.acquire).toBeGreaterThan(0);
      expect(config.database.pool.idle).toBeGreaterThan(0);
    });

    it('should have proper database settings for test environment', () => {
      // In test environment, we should have test database name
      if (process.env.NODE_ENV === 'test') {
        expect(config.database.database).toContain('test');
      }
      
      expect(config.database.logging).toBe(false); // Should be false in test
    });
  });

  describe('Database Configuration Files', () => {
    it('should have Sequelize CLI configuration', () => {
      const cliConfig = require('../config/database.js');
      expect(cliConfig).toBeDefined();
      expect(cliConfig.development).toBeDefined();
      expect(cliConfig.test).toBeDefined();
      expect(cliConfig.production).toBeDefined();
      
      expect(cliConfig.development.dialect).toBe('postgres');
      expect(cliConfig.test.dialect).toBe('postgres');
      expect(cliConfig.production.dialect).toBe('postgres');
    });

    it('should have proper test database configuration', () => {
      const cliConfig = require('../config/database.js');
      expect(cliConfig.test.database).toContain('test');
      expect(cliConfig.test.logging).toBe(false);
    });

    it('should have production SSL configuration', () => {
      const cliConfig = require('../config/database.js');
      expect(cliConfig.production.dialectOptions).toBeDefined();
      expect(cliConfig.production.dialectOptions.ssl).toBeDefined();
      expect(cliConfig.production.dialectOptions.ssl.require).toBe(true);
    });
  });

  describe('Database Setup Scripts', () => {
    it('should have migration and seeder directories configured', () => {
      const fs = require('fs');
      const path = require('path');
      
      expect(fs.existsSync(path.join(__dirname, '../migrations'))).toBe(true);
      expect(fs.existsSync(path.join(__dirname, '../seeders'))).toBe(true);
    });

    it('should have Sequelize RC configuration', () => {
      const fs = require('fs');
      const path = require('path');
      
      expect(fs.existsSync(path.join(__dirname, '../../.sequelizerc'))).toBe(true);
    });
  });
});