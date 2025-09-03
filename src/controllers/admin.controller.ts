import { Request, Response } from 'express';
import { AdminService, CreateStoreOwnerData, UpdateStoreOwnerData } from '../services/admin.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationUtils } from '../utils/validation';
import { logger } from '../utils/logger';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  /**
   * Create a new store owner with associated store
   * POST /api/admin/store-owners
   */
  createStoreOwner = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        storeName,
        storeDescription,
        storeAddress,
        storePhone,
        storeEmail,
      } = req.body;

      // Validate required fields
      const validationErrors: string[] = [];

      if (!email || !ValidationUtils.isValidEmail(email)) {
        validationErrors.push('Valid email is required');
      }

      if (!password || password.length < 6) {
        validationErrors.push('Password must be at least 6 characters long');
      }

      if (!storeName || storeName.trim().length === 0) {
        validationErrors.push('Store name is required');
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationErrors,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      // Validate store email if provided
      if (storeEmail && !ValidationUtils.isValidEmail(storeEmail)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Store email must be a valid email address',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const createData: CreateStoreOwnerData = {
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName?.trim() || undefined,
        lastName: lastName?.trim() || undefined,
        phone: phone?.trim() || undefined,
        storeName: storeName.trim(),
        storeDescription: storeDescription?.trim() || undefined,
        storeAddress: storeAddress?.trim() || undefined,
        storePhone: storePhone?.trim() || undefined,
        storeEmail: storeEmail?.toLowerCase().trim() || undefined,
      };

      const storeOwner = await this.adminService.createStoreOwner(createData);

      logger.info(`Admin created store owner: ${storeOwner.email}`, {
        adminId: (req as AuthenticatedRequest).user.userId,
        storeOwnerId: storeOwner.id,
        storeId: storeOwner.store?.id,
      });

      res.status(201).json({
        success: true,
        data: storeOwner,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error creating store owner:', error);

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create store owner',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get all store owners with their stores
   * GET /api/admin/store-owners
   */
  getAllStoreOwners = async (req: Request, res: Response): Promise<void> => {
    try {
      const storeOwners = await this.adminService.getAllStoreOwners();

      res.status(200).json({
        success: true,
        data: storeOwners,
        meta: {
          total: storeOwners.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching store owners:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch store owners',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get a specific store owner by ID
   * GET /api/admin/store-owners/:id
   */
  getStoreOwnerById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !ValidationUtils.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store owner ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const storeOwner = await this.adminService.getStoreOwnerById(id);

      if (!storeOwner) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STORE_OWNER_NOT_FOUND',
            message: 'Store owner not found',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: storeOwner,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching store owner:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch store owner',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Update a store owner and their store information
   * PUT /api/admin/store-owners/:id
   */
  updateStoreOwner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        email,
        firstName,
        lastName,
        phone,
        isActive,
        storeName,
        storeDescription,
        storeAddress,
        storePhone,
        storeEmail,
      } = req.body;

      if (!id || !ValidationUtils.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store owner ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      // Validate email if provided
      if (email && !ValidationUtils.isValidEmail(email)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email must be a valid email address',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      // Validate store email if provided
      if (storeEmail && !ValidationUtils.isValidEmail(storeEmail)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Store email must be a valid email address',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const updateData: UpdateStoreOwnerData = {};

      if (email) updateData.email = email.toLowerCase().trim();
      if (firstName !== undefined) updateData.firstName = firstName?.trim() || null;
      if (lastName !== undefined) updateData.lastName = lastName?.trim() || null;
      if (phone !== undefined) updateData.phone = phone?.trim() || null;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (storeName) updateData.storeName = storeName.trim();
      if (storeDescription !== undefined) updateData.storeDescription = storeDescription?.trim() || null;
      if (storeAddress !== undefined) updateData.storeAddress = storeAddress?.trim() || null;
      if (storePhone !== undefined) updateData.storePhone = storePhone?.trim() || null;
      if (storeEmail !== undefined) updateData.storeEmail = storeEmail?.toLowerCase().trim() || null;

      const updatedStoreOwner = await this.adminService.updateStoreOwner(id, updateData);

      if (!updatedStoreOwner) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STORE_OWNER_NOT_FOUND',
            message: 'Store owner not found',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      logger.info(`Admin updated store owner: ${updatedStoreOwner.email}`, {
        adminId: (req as AuthenticatedRequest).user.userId,
        storeOwnerId: updatedStoreOwner.id,
        storeId: updatedStoreOwner.store?.id,
      });

      res.status(200).json({
        success: true,
        data: updatedStoreOwner,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error updating store owner:', error);

      if (error instanceof Error) {
        if (error.message.includes('already in use')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update store owner',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Deactivate a store owner and their store
   * DELETE /api/admin/store-owners/:id
   */
  deactivateStoreOwner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !ValidationUtils.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store owner ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const deactivatedStoreOwner = await this.adminService.deactivateStoreOwner(id);

      if (!deactivatedStoreOwner) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STORE_OWNER_NOT_FOUND',
            message: 'Store owner not found',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      logger.info(`Admin deactivated store owner: ${deactivatedStoreOwner.email}`, {
        adminId: (req as AuthenticatedRequest).user.userId,
        storeOwnerId: deactivatedStoreOwner.id,
        storeId: deactivatedStoreOwner.store?.id,
      });

      res.status(200).json({
        success: true,
        data: deactivatedStoreOwner,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error deactivating store owner:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate store owner',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Activate a store owner and their store
   * POST /api/admin/store-owners/:id/activate
   */
  activateStoreOwner = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || !ValidationUtils.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store owner ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const activatedStoreOwner = await this.adminService.activateStoreOwner(id);

      if (!activatedStoreOwner) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STORE_OWNER_NOT_FOUND',
            message: 'Store owner not found',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      logger.info(`Admin activated store owner: ${activatedStoreOwner.email}`, {
        adminId: (req as AuthenticatedRequest).user.userId,
        storeOwnerId: activatedStoreOwner.id,
        storeId: activatedStoreOwner.store?.id,
      });

      res.status(200).json({
        success: true,
        data: activatedStoreOwner,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error activating store owner:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to activate store owner',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get store owner statistics
   * GET /api/admin/store-owners/stats
   */
  getStoreOwnerStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.adminService.getStoreOwnerStats();

      res.status(200).json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching store owner stats:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch store owner statistics',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };
}