import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { PermissionMiddleware } from '../../middleware/permission.middleware';
import { UserRole, Permission } from '../../types/database/database.types';

const router = Router();
const storeController = new StoreController();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

// Staff management routes for store owners
router.post(
  '/:storeId/staff',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.createStaff
);

router.get(
  '/:storeId/staff',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  storeController.getStoreStaff
);

router.get(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  storeController.getStaffById
);

router.put(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.updateStaff
);

router.put(
  '/:storeId/staff/:staffId/permissions',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.updateStaffPermissions
);

router.delete(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.removeStaff
);

router.post(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.addStaffToStore
);

// Get available permissions (accessible to store owners and staff)
router.get(
  '/permissions',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  storeController.getAvailablePermissions
);

export default router;