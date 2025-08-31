import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { 
  LoginCredentials, 
  RegisterData, 
  PasswordResetRequest, 
  PasswordResetConfirm,
  ChangePasswordRequest,
  RefreshTokenRequest,
  EmailVerificationRequest,
  AuthenticationError,
  PasswordValidationError
} from '../types/auth.types';

export class AuthController {
  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginCredentials = req.body;
      const result = await AuthService.login(credentials);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during login',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * User registration
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterData = req.body;
      const result = await AuthService.register(userData);

      res.status(201).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      if (error instanceof PasswordValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PASSWORD_VALIDATION_ERROR',
            message: error.message,
            details: error.errors,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during registration',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      const result = await AuthService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during token refresh',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const request: PasswordResetRequest = req.body;
      await AuthService.requestPasswordReset(request);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        data: {
          message: 'If the email exists, a password reset link has been sent',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Confirm password reset
   */
  static async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const request: PasswordResetConfirm = req.body;
      await AuthService.confirmPasswordReset(request);

      res.status(200).json({
        success: true,
        data: {
          message: 'Password has been reset successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      if (error instanceof PasswordValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PASSWORD_VALIDATION_ERROR',
            message: error.message,
            details: error.errors,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      console.error('Password reset confirmation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Change password (requires authentication)
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const request: ChangePasswordRequest = req.body;
      
      await AuthService.changePassword(user.userId, request);

      res.status(200).json({
        success: true,
        data: {
          message: 'Password has been changed successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      if (error instanceof PasswordValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PASSWORD_VALIDATION_ERROR',
            message: error.message,
            details: error.errors,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      console.error('Password change error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token }: EmailVerificationRequest = req.body;
      await AuthService.verifyEmail(token);

      res.status(200).json({
        success: true,
        data: {
          message: 'Email has been verified successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Get current user profile (requires authentication)
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;

      res.status(200).json({
        success: true,
        data: {
          id: user.userId,
          email: user.email,
          role: user.role,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }

  /**
   * Logout (invalidate token - in a real app you might want to blacklist the token)
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a real application, you might want to:
      // 1. Add the token to a blacklist
      // 2. Clear any server-side session data
      // 3. Log the logout event
      
      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  }
}