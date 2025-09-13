import { Request, Response, NextFunction } from 'express';
import { JWTUtils, TokenPayload } from '../utils/jwt';
import { UserRole } from '../types/database/database.types';

// Extend Express Request interface to include user
export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

export class AuthMiddleware {
  /**
   * Middleware to authenticate JWT token
   */
  static authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = JWTUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authentication token is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const decoded = JWTUtils.verifyAccessToken(token);
      (req as AuthenticatedRequest).user = decoded;
      
      next();
    } catch (error) {
      let errorCode = 'AUTHENTICATION_FAILED';
      let errorMessage = 'Authentication failed';

      if (error instanceof Error) {
        if (error.message === 'Invalid token') {
          errorCode = 'INVALID_TOKEN';
          errorMessage = 'Invalid authentication token';
        } else if (error.message === 'Token expired') {
          errorCode = 'TOKEN_EXPIRED';
          errorMessage = 'Authentication token has expired';
        } else if (error.message === 'Token not active') {
          errorCode = 'TOKEN_NOT_ACTIVE';
          errorMessage = 'Authentication token is not yet active';
        }
      }

      res.status(401).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Middleware to require specific user role
   */
  static requireRole = (allowedRoles: UserRole | UserRole[]) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      if (!roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to require admin role
   */
  static requireAdmin = AuthMiddleware.requireRole(UserRole.ADMIN);

  /**
   * Middleware to require store owner role
   */
  static requireStoreOwner = AuthMiddleware.requireRole(UserRole.STORE_OWNER);

  /**
   * Middleware to require staff role (includes store owners)
   */
  static requireStaff = AuthMiddleware.requireRole([UserRole.STAFF, UserRole.STORE_OWNER]);

  /**
   * Middleware to require customer role
   */
  static requireCustomer = AuthMiddleware.requireRole(UserRole.CUSTOMER);

  /**
   * Middleware to allow multiple roles
   */
  static requireAnyRole = (roles: UserRole[]) => AuthMiddleware.requireRole(roles);

  /**
   * Optional authentication - sets user if token is valid but doesn't fail if missing
   */
  static optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = JWTUtils.extractTokenFromHeader(authHeader);

      if (token) {
        const decoded = JWTUtils.verifyAccessToken(token);
        (req as AuthenticatedRequest).user = decoded;
      }
      
      next();
    } catch (error) {
      // For optional auth, we don't fail on invalid tokens
      // Just proceed without setting user
      next();
    }
  };

  /**
   * Middleware to check if user account is active
   */
  static requireActiveUser = (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    // Note: We would need to check the database for user.isActive
    // This is a placeholder for now - actual implementation would require database access
    next();
  };

  /**
   * Middleware to check if user email is verified (for sensitive operations)
   */
  static requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    // Note: We would need to check the database for user.emailVerified
    // This is a placeholder for now - actual implementation would require database access
    next();
  };
}

// Export individual functions for convenience
export const authenticateToken = AuthMiddleware.authenticate;
export const requireRole = AuthMiddleware.requireRole;
export const requireAdmin = AuthMiddleware.requireAdmin;
export const requireStoreOwner = AuthMiddleware.requireStoreOwner;
export const requireStaff = AuthMiddleware.requireStaff;
export const requireCustomer = AuthMiddleware.requireCustomer;
export const requireAnyRole = AuthMiddleware.requireAnyRole;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const requireActiveUser = AuthMiddleware.requireActiveUser;
export const requireVerifiedEmail = AuthMiddleware.requireVerifiedEmail;