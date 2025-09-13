import { Request, Response } from 'express';
import { StaffService, CreateStaffData, UpdateStaffData, UpdateStaffPermissionsData } from '../../services/staff.service';
import { ServiceRequestService } from '../../services/service-request.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ValidationUtils } from '../../utils/validation';
import { Permission, UserRole, RequestStatus } from '../../types/database/database.types';
import { logger } from '../../utils/logger';
import {
  storeServiceRequestQuerySchema,
  getServiceRequestSchema,
  updateServiceRequestStatusSchema
} from '../../validators/service-request.validators';
import { ValidationError } from '../../utils/errors';

export class StoreController {
  private staffService: StaffService;
  private serviceRequestService: ServiceRequestService;

  constructor() {
    this.staffService = new StaffService();
    this.serviceRequestService = new ServiceRequestService();
  }

  /**
   * Create a new staff member for the store
   * POST /api/stores/:storeId/staff
   */
  createStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        permissions,
      } = req.body;

      // Validate required fields
      const validationErrors: string[] = [];

      if (!ValidationUtils.isValidUUID(storeId)) {
        validationErrors.push('Valid store ID is required');
      }

      if (!email || !ValidationUtils.isValidEmail(email)) {
        validationErrors.push('Valid email is required');
      }

      if (!password || password.length < 6) {
        validationErrors.push('Password must be at least 6 characters long');
      }

      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        validationErrors.push('At least one permission is required');
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

      const createData: CreateStaffData = {
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName?.trim() || undefined,
        lastName: lastName?.trim() || undefined,
        phone: phone?.trim() || undefined,
        permissions,
      };

      const staff = await this.staffService.createStaff(storeId, createData);

      logger.info(`Store owner created staff member: ${staff.email}`, {
        storeOwnerId: (req as AuthenticatedRequest).user.userId,
        staffId: staff.id,
        storeId,
      });

      res.status(201).json({
        success: true,
        data: {
          id: staff.id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          phone: staff.phone,
          role: staff.role,
          isActive: staff.isActive,
          emailVerified: staff.emailVerified,
          permissions: staff.storePermissions?.permissions || [],
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error creating staff member:', error);

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

        if (error.message.includes('Store not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'STORE_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('permissions')) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PERMISSIONS',
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
          message: 'Failed to create staff member',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get all staff members for the store
   * GET /api/stores/:storeId/staff
   */
  getStoreStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STORE_ID',
            message: 'Valid store ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const staff = await this.staffService.getStoreStaff(storeId);

      const staffData = staff.map(staffMember => ({
        id: staffMember.id,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        phone: staffMember.phone,
        role: staffMember.role,
        isActive: staffMember.isActive,
        emailVerified: staffMember.emailVerified,
        permissions: staffMember.storePermissions?.permissions || [],
        createdAt: staffMember.createdAt,
        updatedAt: staffMember.updatedAt,
      }));

      res.status(200).json({
        success: true,
        data: staffData,
        meta: {
          total: staffData.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching store staff:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch store staff',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get a specific staff member by ID
   * GET /api/stores/:storeId/staff/:staffId
   */
  getStaffById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, staffId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(staffId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and staff ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const staff = await this.staffService.getStaffById(storeId, staffId);

      if (!staff) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: 'Staff member not found or does not belong to this store',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: staff.id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          phone: staff.phone,
          role: staff.role,
          isActive: staff.isActive,
          emailVerified: staff.emailVerified,
          permissions: staff.storePermissions?.permissions || [],
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching staff member:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch staff member',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Update staff member information
   * PUT /api/stores/:storeId/staff/:staffId
   */
  updateStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, staffId } = req.params;
      const { firstName, lastName, phone, isActive } = req.body;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(staffId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and staff ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const updateData: UpdateStaffData = {};

      if (firstName !== undefined) updateData.firstName = firstName?.trim() || null;
      if (lastName !== undefined) updateData.lastName = lastName?.trim() || null;
      if (phone !== undefined) updateData.phone = phone?.trim() || null;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const updatedStaff = await this.staffService.updateStaff(storeId, staffId, updateData);

      if (!updatedStaff) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: 'Staff member not found or does not belong to this store',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      logger.info(`Store owner updated staff member: ${updatedStaff.email}`, {
        storeOwnerId: (req as AuthenticatedRequest).user.userId,
        staffId: updatedStaff.id,
        storeId,
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedStaff.id,
          email: updatedStaff.email,
          firstName: updatedStaff.firstName,
          lastName: updatedStaff.lastName,
          phone: updatedStaff.phone,
          role: updatedStaff.role,
          isActive: updatedStaff.isActive,
          emailVerified: updatedStaff.emailVerified,
          permissions: updatedStaff.storePermissions?.permissions || [],
          createdAt: updatedStaff.createdAt,
          updatedAt: updatedStaff.updatedAt,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error updating staff member:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update staff member',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Update staff member permissions
   * PUT /api/stores/:storeId/staff/:staffId/permissions
   */
  updateStaffPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, staffId } = req.params;
      const { permissions } = req.body;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(staffId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and staff ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one permission is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const permissionsData: UpdateStaffPermissionsData = { permissions };

      const updatedStaff = await this.staffService.updateStaffPermissions(storeId, staffId, permissionsData);

      if (!updatedStaff) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: 'Staff member not found or does not belong to this store',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      logger.info(`Store owner updated staff permissions: ${updatedStaff.email}`, {
        storeOwnerId: (req as AuthenticatedRequest).user.userId,
        staffId: updatedStaff.id,
        storeId,
        permissions,
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedStaff.id,
          email: updatedStaff.email,
          firstName: updatedStaff.firstName,
          lastName: updatedStaff.lastName,
          phone: updatedStaff.phone,
          role: updatedStaff.role,
          isActive: updatedStaff.isActive,
          emailVerified: updatedStaff.emailVerified,
          permissions: updatedStaff.storePermissions?.permissions || [],
          createdAt: updatedStaff.createdAt,
          updatedAt: updatedStaff.updatedAt,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error updating staff permissions:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'STAFF_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('permissions')) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PERMISSIONS',
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
          message: 'Failed to update staff permissions',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Remove staff member from store
   * DELETE /api/stores/:storeId/staff/:staffId
   */
  removeStaff = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, staffId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(staffId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and staff ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const success = await this.staffService.removeStaffFromStore(storeId, staffId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: 'Staff member not found or does not belong to this store',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      logger.info(`Store owner removed staff member from store`, {
        storeOwnerId: (req as AuthenticatedRequest).user.userId,
        staffId,
        storeId,
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Staff member removed from store successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error removing staff from store:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove staff from store',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Add existing staff member to store
   * POST /api/stores/:storeId/staff/:staffId
   */
  addStaffToStore = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, staffId } = req.params;
      const { permissions } = req.body;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(staffId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and staff ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one permission is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const staff = await this.staffService.addStaffToStore(storeId, staffId, permissions);

      if (!staff) {
        res.status(404).json({
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: 'Staff member not found',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      logger.info(`Store owner added staff member to store: ${staff.email}`, {
        storeOwnerId: (req as AuthenticatedRequest).user.userId,
        staffId: staff.id,
        storeId,
        permissions,
      });

      res.status(200).json({
        success: true,
        data: {
          id: staff.id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          phone: staff.phone,
          role: staff.role,
          isActive: staff.isActive,
          emailVerified: staff.emailVerified,
          permissions: staff.storePermissions?.permissions || [],
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error adding staff to store:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'RESOURCE_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('already assigned')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'STAFF_ALREADY_ASSIGNED',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('permissions')) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PERMISSIONS',
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
          message: 'Failed to add staff to store',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get available permissions
   * GET /api/stores/permissions
   */
  getAvailablePermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const allPermissions = StaffService.getAllPermissions();
      const defaultStaffPermissions = StaffService.getDefaultStaffPermissions();
      const defaultSeniorStaffPermissions = StaffService.getDefaultSeniorStaffPermissions();

      res.status(200).json({
        success: true,
        data: {
          all: allPermissions,
          defaultStaff: defaultStaffPermissions,
          defaultSeniorStaff: defaultSeniorStaffPermissions,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching available permissions:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch available permissions',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  // Service Request Management Methods

  /**
   * Get all service requests for the store
   * GET /api/stores/:storeId/service-requests
   */
  getStoreServiceRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STORE_ID',
            message: 'Valid store ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      // Validate query parameters
      const { error, value } = storeServiceRequestQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const { page, limit, sortBy, sortOrder, ...filters } = value;

      const result = await this.serviceRequestService.getStoreServiceRequests(
        storeId,
        filters,
        { page, limit, sortBy, sortOrder }
      );

      res.status(200).json({
        success: true,
        data: result.requests,
        meta: {
          pagination: result.pagination,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching store service requests:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'STORE_NOT_FOUND',
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
          message: 'Failed to fetch service requests',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get a specific service request by ID
   * GET /api/stores/:storeId/service-requests/:requestId
   */
  getServiceRequestById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, requestId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(requestId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and request ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const userRole = authReq.user.role as UserRole;

      const serviceRequest = await this.serviceRequestService.getServiceRequestById(
        requestId,
        authReq.user.userId,
        userRole,
        storeId
      );

      res.status(200).json({
        success: true,
        data: {
          serviceRequest,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching service request:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'SERVICE_REQUEST_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('Access denied')) {
          res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
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
          message: 'Failed to fetch service request',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Update service request status
   * PUT /api/stores/:storeId/service-requests/:requestId/status
   */
  updateServiceRequestStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, requestId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(requestId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and request ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      // Validate request body
      const { error, value } = updateServiceRequestStatusSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const { status } = value;

      const serviceRequest = await this.serviceRequestService.updateServiceRequestStatus(
        requestId,
        status as RequestStatus,
        storeId
      );

      logger.info(`Service request status updated`, {
        userId: (req as AuthenticatedRequest).user.userId,
        requestId,
        storeId,
        newStatus: status,
      });

      res.status(200).json({
        success: true,
        data: {
          serviceRequest,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error updating service request status:', error);

      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'SERVICE_REQUEST_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('Access denied') || error.message.includes('does not belong')) {
          res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('transition') || error.message.includes('cannot be')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'INVALID_STATUS_TRANSITION',
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
          message: 'Failed to update service request status',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Cancel a service request
   * POST /api/stores/:storeId/service-requests/:requestId/cancel
   */
  cancelServiceRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, requestId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId) || !ValidationUtils.isValidUUID(requestId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Valid store ID and request ID are required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const userRole = authReq.user.role as UserRole;

      const serviceRequest = await this.serviceRequestService.cancelServiceRequest(
        requestId,
        authReq.user.userId,
        userRole,
        storeId
      );

      logger.info(`Service request cancelled by store staff`, {
        userId: authReq.user.userId,
        requestId,
        storeId,
      });

      res.status(200).json({
        success: true,
        data: {
          serviceRequest,
          message: 'Service request cancelled successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error cancelling service request:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'SERVICE_REQUEST_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('Access denied') || error.message.includes('does not belong')) {
          res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: error.message,
              timestamp: new Date().toISOString(),
              path: req.path,
            },
          });
          return;
        }

        if (error.message.includes('cannot be cancelled')) {
          res.status(409).json({
            success: false,
            error: {
              code: 'CANNOT_CANCEL',
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
          message: 'Failed to cancel service request',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get service request statistics for the store
   * GET /api/stores/:storeId/service-requests/stats
   */
  getServiceRequestStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STORE_ID',
            message: 'Valid store ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const userRole = authReq.user.role as UserRole;

      const stats = await this.serviceRequestService.getServiceRequestStats(
        authReq.user.userId,
        userRole,
        storeId
      );

      res.status(200).json({
        success: true,
        data: {
          stats,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching service request stats:', error);

      if (error instanceof Error) {
        if (error.message.includes('Insufficient permissions')) {
          res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
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
          message: 'Failed to fetch service request statistics',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get overdue service requests for the store
   * GET /api/stores/:storeId/service-requests/overdue
   */
  getOverdueServiceRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STORE_ID',
            message: 'Valid store ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const overdueRequests = await this.serviceRequestService.getOverdueRequests(storeId);

      res.status(200).json({
        success: true,
        data: overdueRequests,
        meta: {
          total: overdueRequests.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching overdue service requests:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch overdue service requests',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get high priority service requests for the store
   * GET /api/stores/:storeId/service-requests/high-priority
   */
  getHighPriorityServiceRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      if (!ValidationUtils.isValidUUID(storeId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STORE_ID',
            message: 'Valid store ID is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const highPriorityRequests = await this.serviceRequestService.getHighPriorityRequests(storeId);

      res.status(200).json({
        success: true,
        data: highPriorityRequests,
        meta: {
          total: highPriorityRequests.length,
          timestamp: new Date().toISOString(),
          
        },
      });
    } catch (error) {
      logger.error('Error fetching high priority service requests:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch high priority service requests',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };
}