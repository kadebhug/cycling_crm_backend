import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserRole, Permission } from '../types/database/database.types';
import { User, StaffStorePermission } from '../database/models';

export class PermissionMiddleware {
  /**
   * Middleware to require specific permission for a store
   */
  static requirePermission = (permission: Permission | Permission[]) => {
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const user = (req as AuthenticatedRequest).user;
        const storeId = req.params.storeId || req.body.storeId;

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

        if (!storeId) {
          res.status(400).json({
            success: false,
            error: {
              code: 'STORE_ID_REQUIRED',
              message: 'Store ID is required for this operation',
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        // Admin has all permissions
        if (user.role === UserRole.ADMIN) {
          next();
          return;
        }

        // Store owners have all permissions for their own stores
        if (user.role === UserRole.STORE_OWNER) {
          const userRecord = await User.findByPk(user.userId, {
            include: [{
              association: 'ownedStores',
              where: { id: storeId },
              required: false,
            }],
          });

          if (userRecord?.ownedStores && userRecord.ownedStores.length > 0) {
            next();
            return;
          }
        }

        // Staff need specific permissions
        if (user.role === UserRole.STAFF) {
          const staffPermission = await StaffStorePermission.findOne({
            where: {
              userId: user.userId,
              storeId: storeId,
              isActive: true,
            },
          });

          if (!staffPermission) {
            res.status(403).json({
              success: false,
              error: {
                code: 'STORE_ACCESS_DENIED',
                message: 'You do not have access to this store',
                timestamp: new Date().toISOString(),
                path: req.path,
              },
            });
            return;
          }

          const hasPermission = permissions.some(perm => 
            staffPermission.hasPermission(perm)
          );

          if (!hasPermission) {
            res.status(403).json({
              success: false,
              error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: `Missing required permission(s): ${permissions.join(', ')}`,
                timestamp: new Date().toISOString(),
                path: req.path,
              },
            });
            return;
          }

          next();
          return;
        }

        // Customers don't have store-level permissions
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: 'Customers cannot perform store operations',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'PERMISSION_CHECK_FAILED',
            message: 'Failed to verify permissions',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
      }
    };
  };

  /**
   * Middleware to ensure user can access a specific store
   */
  static requireStoreAccess = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const storeId = req.params.storeId || req.body.storeId;

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

      if (!storeId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'STORE_ID_REQUIRED',
            message: 'Store ID is required for this operation',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      // Admin can access all stores
      if (user.role === UserRole.ADMIN) {
        next();
        return;
      }

      // Check if user has access to this store
      const hasAccess = await PermissionMiddleware.checkStoreAccess(user.userId, storeId, user.role);

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'STORE_ACCESS_DENIED',
            message: 'You do not have access to this store',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Store access check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ACCESS_CHECK_FAILED',
          message: 'Failed to verify store access',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Middleware to ensure customer can only access their own resources
   */
  static requireResourceOwnership = (resourceUserIdField: string = 'customerId') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const user = (req as AuthenticatedRequest).user;
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

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

        // Admin can access all resources
        if (user.role === UserRole.ADMIN) {
          next();
          return;
        }

        // Store owners and staff can access resources in their stores
        if (user.role === UserRole.STORE_OWNER || user.role === UserRole.STAFF) {
          // This would require additional logic to check if the resource belongs to their store
          // For now, we'll allow access - this should be refined based on specific use cases
          next();
          return;
        }

        // Customers can only access their own resources
        if (user.role === UserRole.CUSTOMER) {
          if (resourceUserId && resourceUserId !== user.userId) {
            res.status(403).json({
              success: false,
              error: {
                code: 'RESOURCE_ACCESS_DENIED',
                message: 'You can only access your own resources',
                timestamp: new Date().toISOString(),
                path: req.path,
              },
            });
            return;
          }
        }

        next();
      } catch (error) {
        console.error('Resource ownership check error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'OWNERSHIP_CHECK_FAILED',
            message: 'Failed to verify resource ownership',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
      }
    };
  };

  /**
   * Helper method to check if user has access to a store
   */
  private static async checkStoreAccess(
    userId: string,
    storeId: string,
    userRole: UserRole
  ): Promise<boolean> {
    try {
      if (userRole === UserRole.ADMIN) {
        return true;
      }

      if (userRole === UserRole.STORE_OWNER) {
        const userRecord = await User.findByPk(userId, {
          include: [{
            association: 'ownedStores',
            where: { id: storeId },
            required: false,
          }],
        });
        return Boolean(userRecord?.ownedStores && userRecord.ownedStores.length > 0);
      }

      if (userRole === UserRole.STAFF) {
        const staffPermission = await StaffStorePermission.findOne({
          where: {
            userId: userId,
            storeId: storeId,
            isActive: true,
          },
        });
        return !!staffPermission;
      }

      return false;
    } catch (error) {
      console.error('Error checking store access:', error);
      return false;
    }
  }

  /**
   * Get user permissions for a specific store
   */
  static async getUserStorePermissions(
    userId: string,
    storeId: string,
    userRole: UserRole
  ): Promise<Permission[]> {
    try {
      if (userRole === UserRole.ADMIN) {
        return Object.values(Permission);
      }

      if (userRole === UserRole.STORE_OWNER) {
        const hasAccess = await PermissionMiddleware.checkStoreAccess(userId, storeId, userRole);
        return hasAccess ? Object.values(Permission) : [];
      }

      if (userRole === UserRole.STAFF) {
        const staffPermission = await StaffStorePermission.findOne({
          where: {
            userId: userId,
            storeId: storeId,
            isActive: true,
          },
        });
        return staffPermission ? staffPermission.permissions : [];
      }

      return [];
    } catch (error) {
      console.error('Error getting user store permissions:', error);
      return [];
    }
  }
}