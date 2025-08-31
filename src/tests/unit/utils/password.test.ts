import { PasswordUtils } from '../../../utils/password';

describe('PasswordUtils', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should throw error for empty password', async () => {
      await expect(PasswordUtils.hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for short password', async () => {
      await expect(PasswordUtils.hashPassword('123')).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should throw error for non-string password', async () => {
      await expect(PasswordUtils.hashPassword(null as any)).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      const isValid = await PasswordUtils.verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      const isValid = await PasswordUtils.verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await PasswordUtils.hashPassword('TestPassword123!');
      const isValid = await PasswordUtils.verifyPassword('', hash);
      
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await PasswordUtils.verifyPassword('TestPassword123!', '');
      
      expect(isValid).toBe(false);
    });

    it('should return false for non-string inputs', async () => {
      const isValid = await PasswordUtils.verifyPassword(null as any, null as any);
      
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = PasswordUtils.validatePasswordStrength('StrongPassword123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(3);
    });

    it('should reject short password', () => {
      const result = PasswordUtils.validatePasswordStrength('123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters long');
    });

    it('should reject password without lowercase', () => {
      const result = PasswordUtils.validatePasswordStrength('PASSWORD123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase', () => {
      const result = PasswordUtils.validatePasswordStrength('password123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without numbers', () => {
      const result = PasswordUtils.validatePasswordStrength('Password!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject common passwords', () => {
      const result = PasswordUtils.validatePasswordStrength('password123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password contains common patterns and is not secure');
    });

    it('should reject passwords with repeated characters', () => {
      const result = PasswordUtils.validatePasswordStrength('Passsssword123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password should not contain repeated characters');
    });

    it('should return error for non-string input', () => {
      const result = PasswordUtils.validatePasswordStrength(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be a string');
      expect(result.score).toBe(0);
    });

    it('should give higher score for longer passwords', () => {
      const shortResult = PasswordUtils.validatePasswordStrength('Pass123!');
      const longResult = PasswordUtils.validatePasswordStrength('VeryLongPassword123!');
      
      expect(longResult.score).toBeGreaterThanOrEqual(shortResult.score);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = PasswordUtils.generateSecurePassword(12);
      
      expect(password).toBeDefined();
      expect(password.length).toBe(12);
    });

    it('should generate password with default length', () => {
      const password = PasswordUtils.generateSecurePassword();
      
      expect(password).toBeDefined();
      expect(password.length).toBe(12);
    });

    it('should generate password with required character types', () => {
      const password = PasswordUtils.generateSecurePassword(12);
      
      expect(/[a-z]/.test(password)).toBe(true); // lowercase
      expect(/[A-Z]/.test(password)).toBe(true); // uppercase
      expect(/\d/.test(password)).toBe(true); // number
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true); // symbol
    });

    it('should generate different passwords each time', () => {
      const password1 = PasswordUtils.generateSecurePassword(12);
      const password2 = PasswordUtils.generateSecurePassword(12);
      
      expect(password1).not.toBe(password2);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate 8-character temporary password', () => {
      const password = PasswordUtils.generateTemporaryPassword();
      
      expect(password).toBeDefined();
      expect(password.length).toBe(8);
    });

    it('should generate secure temporary password', () => {
      const password = PasswordUtils.generateTemporaryPassword();
      const validation = PasswordUtils.validatePasswordStrength(password);
      
      expect(validation.isValid).toBe(true);
    });
  });
});