import { JWTUtils, TokenPayload } from '../../../utils/jwt';
import { UserRole } from '../../../types/database/database.types';

describe('JWTUtils', () => {
  const mockPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: UserRole.CUSTOMER,
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTUtils.generateAccessToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTUtils.generateRefreshToken(mockPayload.userId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = JWTUtils.generateTokens(mockPayload);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeDefined();
      expect(typeof tokens.expiresIn).toBe('number');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode a valid access token', () => {
      const token = JWTUtils.generateAccessToken(mockPayload);
      const decoded = JWTUtils.verifyAccessToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('not.a.jwt');
      }).toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const token = JWTUtils.generateRefreshToken(mockPayload.userId);
      const decoded = JWTUtils.verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTUtils.verifyRefreshToken('invalid-token');
      }).toThrow('Invalid refresh token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'test-token';
      const header = `Bearer ${token}`;
      const extracted = JWTUtils.extractTokenFromHeader(header);
      
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = JWTUtils.extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Invalid header');
      expect(extracted).toBeNull();
    });

    it('should return null for non-Bearer token', () => {
      const extracted = JWTUtils.extractTokenFromHeader('Basic token');
      expect(extracted).toBeNull();
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a valid password reset token', () => {
      const token = JWTUtils.generatePasswordResetToken(mockPayload.userId, mockPayload.email);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify and decode a valid password reset token', () => {
      const token = JWTUtils.generatePasswordResetToken(mockPayload.userId, mockPayload.email);
      const decoded = JWTUtils.verifyPasswordResetToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw error for invalid password reset token', () => {
      expect(() => {
        JWTUtils.verifyPasswordResetToken('invalid-token');
      }).toThrow('Invalid password reset token');
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate a valid email verification token', () => {
      const token = JWTUtils.generateEmailVerificationToken(mockPayload.userId, mockPayload.email);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyEmailVerificationToken', () => {
    it('should verify and decode a valid email verification token', () => {
      const token = JWTUtils.generateEmailVerificationToken(mockPayload.userId, mockPayload.email);
      const decoded = JWTUtils.verifyEmailVerificationToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should throw error for invalid email verification token', () => {
      expect(() => {
        JWTUtils.verifyEmailVerificationToken('invalid-token');
      }).toThrow('Invalid email verification token');
    });
  });
});