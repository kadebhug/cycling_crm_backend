import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth';
import { UserRole } from '../types/database/database.types';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  storeId?: string; // For store-specific staff
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTUtils {
  /**
   * Generate access token for user
   */
  static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(
      payload,
      authConfig.jwt.secret,
      {
        expiresIn: authConfig.jwt.expiresIn,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any
    );
  }

  /**
   * Generate refresh token for user
   */
  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      authConfig.jwt.secret,
      {
        expiresIn: authConfig.jwt.refreshExpiresIn,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>): AuthTokens {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload.userId);
    
    // Calculate expiration time in seconds
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.secret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any) as unknown as TokenPayload;

      // Ensure required fields are present
      if (!decoded.userId || !decoded.email || !decoded.role) {
        throw new Error('Invalid token payload');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not active');
      }
      throw error;
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): { userId: string; type: string } {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.secret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any) as any;

      if (!decoded.userId || decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new Error('Refresh token not active');
      }
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'password_reset' },
      authConfig.jwt.secret,
      {
        expiresIn: '1h',
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any
    );
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.secret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any) as any;

      if (!decoded.userId || !decoded.email || decoded.type !== 'password_reset') {
        throw new Error('Invalid password reset token');
      }

      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid password reset token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Password reset token expired');
      }
      throw error;
    }
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'email_verification' },
      authConfig.jwt.secret,
      {
        expiresIn: '24h',
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any
    );
  }

  /**
   * Verify email verification token
   */
  static verifyEmailVerificationToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, authConfig.jwt.secret, {
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
      } as any) as any;

      if (!decoded.userId || !decoded.email || decoded.type !== 'email_verification') {
        throw new Error('Invalid email verification token');
      }

      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid email verification token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Email verification token expired');
      }
      throw error;
    }
  }
}