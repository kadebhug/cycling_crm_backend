import { Response, NextFunction } from 'express';
import { StaffService } from '../services/staff.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errors';
import { UserRole, ServiceRecordStatus } from '../types/database/database.types';

export class StaffController {
  private staffService: StaffService;

  constructor() {
    this.staffService = new StaffService();
  }

  /**
   * Create a service record from an approved service request (Staff/Store Owner)
   */
  createServiceRecord = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId } = req.params;
      
      // Basic validation
      if (!req.body.serviceRequestId) {
        throw new ValidationError('Service request ID is required');
      }

      const serviceRecord = await this.staffService.createServiceRecord(
        userId,
        storeId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: {
          serviceRecord,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get service records for a store (Staff/Store Owner)
   */
  getStoreServiceRecords = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId } = req.params;
      
      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'ASC' | 'DESC';
      
      // Parse filters
      const filters: any = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.assignedStaffId) {
        filters.assignedStaffId = req.query.assignedStaffId;
      }
      if (req.query.isOverdue === 'true') {
        filters.isOverdue = true;
      }

      const result = await this.staffService.getStoreServiceRecords(
        userId,
        storeId,
        filters,
        { page, limit, sortBy, sortOrder }
      );

      res.status(200).json({
        success: true,
        data: result.records,
        meta: {
          pagination: result.pagination,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get service records assigned to a staff member (Staff/Store Owner)
   */
  getStaffServiceRecords = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, staffId } = req.params;
      
      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'ASC' | 'DESC';
      
      // Parse filters
      const filters: any = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const result = await this.staffService.getStaffServiceRecords(
        userId,
        storeId,
        staffId,
        filters,
        { page, limit, sortBy, sortOrder }
      );

      res.status(200).json({
        success: true,
        data: result.records,
        meta: {
          pagination: result.pagination,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get my assigned service records (Staff)
   */
  getMyServiceRecords = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId } = req.params;
      
      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'ASC' | 'DESC';
      
      // Parse filters
      const filters: any = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const result = await this.staffService.getStaffServiceRecords(
        userId,
        storeId,
        userId, // Use current user's ID
        filters,
        { page, limit, sortBy, sortOrder }
      );

      res.status(200).json({
        success: true,
        data: result.records,
        meta: {
          pagination: result.pagination,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a specific service record by ID (Staff/Store Owner)
   */
  getServiceRecordById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, recordId } = req.params;

      const serviceRecord = await this.staffService.getServiceRecordById(
        userId,
        storeId,
        recordId
      );

      res.status(200).json({
        success: true,
        data: {
          serviceRecord,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a service record (Staff/Store Owner)
   */
  updateServiceRecord = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, recordId } = req.params;

      const serviceRecord = await this.staffService.updateServiceRecord(
        userId,
        storeId,
        recordId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: {
          serviceRecord,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Start work on a service record (Staff/Store Owner)
   */
  startServiceWork = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, recordId } = req.params;

      const serviceRecord = await this.staffService.updateServiceRecord(
        userId,
        storeId,
        recordId,
        { 
          status: ServiceRecordStatus.IN_PROGRESS,
          assignedStaffId: userId // Assign to current user if not already assigned
        }
      );

      res.status(200).json({
        success: true,
        data: {
          serviceRecord,
          message: 'Service work started successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete a service record (Staff/Store Owner)
   */
  completeServiceWork = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, recordId } = req.params;

      const updateData: any = { 
        status: ServiceRecordStatus.COMPLETED 
      };

      // Include work summary if provided
      if (req.body.workPerformed) {
        updateData.workPerformed = req.body.workPerformed;
      }
      if (req.body.partsUsed) {
        updateData.partsUsed = req.body.partsUsed;
      }
      if (req.body.laborHours) {
        updateData.laborHours = req.body.laborHours;
      }
      if (req.body.notes) {
        updateData.notes = req.body.notes;
      }

      const serviceRecord = await this.staffService.updateServiceRecord(
        userId,
        storeId,
        recordId,
        updateData
      );

      res.status(200).json({
        success: true,
        data: {
          serviceRecord,
          message: 'Service work completed successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Put service record on hold (Staff/Store Owner)
   */
  putServiceOnHold = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, recordId } = req.params;

      const updateData: any = { 
        status: ServiceRecordStatus.ON_HOLD 
      };

      // Include reason if provided
      if (req.body.notes) {
        updateData.notes = req.body.notes;
      }

      const serviceRecord = await this.staffService.updateServiceRecord(
        userId,
        storeId,
        recordId,
        updateData
      );

      res.status(200).json({
        success: true,
        data: {
          serviceRecord,
          message: 'Service put on hold successfully',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add a service update (Staff/Store Owner)
   */
  addServiceUpdate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, recordId } = req.params;

      // Basic validation
      if (!req.body.updateType || !req.body.message) {
        throw new ValidationError('Update type and message are required');
      }

      const serviceUpdate = await this.staffService.addServiceUpdate(
        userId,
        storeId,
        recordId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: {
          serviceUpdate,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get service updates for a service record (Staff/Store Owner)
   */
  getServiceUpdates = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, recordId } = req.params;
      
      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'ASC' | 'DESC';
      const customerVisibleOnly = req.query.customerVisibleOnly === 'true';

      const result = await this.staffService.getServiceUpdates(
        userId,
        storeId,
        recordId,
        customerVisibleOnly,
        { page, limit, sortBy, sortOrder }
      );

      res.status(200).json({
        success: true,
        data: result.updates,
        meta: {
          pagination: result.pagination,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a service update (Staff/Store Owner)
   */
  updateServiceUpdate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId, updateId } = req.params;

      const serviceUpdate = await this.staffService.updateServiceUpdate(
        userId,
        storeId,
        updateId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: {
          serviceUpdate,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get service progress statistics (Staff/Store Owner)
   */
  getServiceProgressStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId } = req.params;
      const { staffId } = req.query;

      const stats = await this.staffService.getServiceProgressStats(
        userId,
        storeId,
        staffId as string
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
      next(error);
    }
  };

  /**
   * Get my service progress statistics (Staff)
   */
  getMyServiceProgressStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { storeId } = req.params;

      const stats = await this.staffService.getServiceProgressStats(
        userId,
        storeId,
        userId // Use current user's ID
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
      next(error);
    }
  };
}