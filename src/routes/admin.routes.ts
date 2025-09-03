import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

// Apply admin authentication to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireAdmin);

/**
 * Store Owner Management Routes
 */

// Get store owner statistics
router.get('/store-owners/stats', adminController.getStoreOwnerStats);

// Create a new store owner
router.post('/store-owners', adminController.createStoreOwner);

// Get all store owners
router.get('/store-owners', adminController.getAllStoreOwners);

// Get a specific store owner by ID
router.get('/store-owners/:id', adminController.getStoreOwnerById);

// Update a store owner
router.put('/store-owners/:id', adminController.updateStoreOwner);

// Activate a store owner
router.post('/store-owners/:id/activate', adminController.activateStoreOwner);

// Deactivate a store owner (soft delete)
router.delete('/store-owners/:id', adminController.deactivateStoreOwner);

export { router as adminRoutes };