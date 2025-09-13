import { Response, NextFunction } from 'express';
import { QuotationService } from '../services/quotation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { 
  createQuotationSchema,
  updateQuotationSchema,
  getQuotationSchema,
  sendQuotationSchema,
  quotationActionSchema,
  storeQuotationQuerySchema,
  customerQuotationQuerySchema,
  expiringQuotationsQuerySchema
} from '../validators/quotation.validators';
import { ValidationError } from '../utils/errors';
import { UserRole } from '../types/database/database.types';

export class QuotationController {
  private quotationService: QuotationService;

  constructor() {
    this.quotationService = new QuotationService();
  }

  /**
   * Create a new quotation (Staff/Store Owner)
   */
  createQuotation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createQuotationSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const userId = req.user!.userId;
      const storeId = req.params.storeId;

      const quotation = await this.quotationService.createQuotation(
        userId,
        storeId,
        value
      );

      res.status(201).json({
        success: true,
        data: {
          quotation,
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
   * Get quotations for a store (Staff/Store Owner)
   */
  getStoreQuotations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate query parameters
      const { error, value } = storeQuotationQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const userId = req.user!.userId;
      const storeId = req.params.storeId;

      const {
        page,
        limit,
        sortBy,
        sortOrder,
        status,
        serviceRequestId,
        createdById,
        dateFrom,
        dateTo,
        validUntilFrom,
        validUntilTo,
        isExpired,
        isExpiringSoon,
      } = value;

      const filters = {
        status,
        serviceRequestId,
        createdById,
        dateFrom,
        dateTo,
        validUntilFrom,
        validUntilTo,
        isExpired,
        isExpiringSoon,
      };

      const options = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      const result = await this.quotationService.getStoreQuotations(
        userId,
        storeId,
        filters,
        options
      );

      res.status(200).json({
        success: true,
        data: {
          quotations: result.quotations,
        },
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
   * Get quotations for a customer (Customer)
   */
  getCustomerQuotations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate query parameters
      const { error, value } = customerQuotationQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;

      const {
        page,
        limit,
        sortBy,
        sortOrder,
        status,
        serviceRequestId,
      } = value;

      const filters = {
        status,
        serviceRequestId,
      };

      const options = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      const result = await this.quotationService.getCustomerQuotations(
        customerId,
        filters,
        options
      );

      res.status(200).json({
        success: true,
        data: {
          quotations: result.quotations,
        },
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
   * Get a specific quotation by ID
   */
  getQuotationById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate parameters
      const { error, value } = getQuotationSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const userId = req.user!.userId;
      const userRole = req.user!.role as UserRole;
      const storeId = req.params.storeId; // May be undefined for customers
      const { quotationId } = value;

      const quotation = await this.quotationService.getQuotationById(
        quotationId,
        userId,
        userRole,
        storeId
      );

      res.status(200).json({
        success: true,
        data: {
          quotation,
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
   * Update a quotation (Staff/Store Owner)
   */
  updateQuotation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate parameters
      const { error: paramError } = getQuotationSchema.validate(req.params);
      if (paramError) {
        throw new ValidationError(paramError.details[0].message);
      }

      // Validate request body
      const { error, value } = updateQuotationSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const userId = req.user!.userId;
      const storeId = req.params.storeId;
      const quotationId = req.params.quotationId;

      const quotation = await this.quotationService.updateQuotation(
        quotationId,
        userId,
        storeId,
        value
      );

      res.status(200).json({
        success: true,
        data: {
          quotation,
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
   * Send quotation to customer (Staff/Store Owner)
   */
  sendQuotation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate parameters
      const { error } = sendQuotationSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const userId = req.user!.userId;
      const storeId = req.params.storeId;
      const quotationId = req.params.quotationId;

      const quotation = await this.quotationService.sendQuotation(
        quotationId,
        userId,
        storeId
      );

      res.status(200).json({
        success: true,
        data: {
          quotation,
        },
        meta: {
          message: 'Quotation sent to customer successfully',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve quotation (Customer)
   */
  approveQuotation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate parameters
      const { error } = quotationActionSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const quotationId = req.params.quotationId;

      const quotation = await this.quotationService.approveQuotation(
        quotationId,
        customerId
      );

      res.status(200).json({
        success: true,
        data: {
          quotation,
        },
        meta: {
          message: 'Quotation approved successfully',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reject quotation (Customer)
   */
  rejectQuotation = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate parameters
      const { error } = quotationActionSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const quotationId = req.params.quotationId;

      const quotation = await this.quotationService.rejectQuotation(
        quotationId,
        customerId
      );

      res.status(200).json({
        success: true,
        data: {
          quotation,
        },
        meta: {
          message: 'Quotation rejected successfully',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get quotation statistics
   */
  getQuotationStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role as UserRole;
      const storeId = req.params.storeId; // May be undefined for customers

      const stats = await this.quotationService.getQuotationStats(
        userId,
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
      next(error);
    }
  };

  /**
   * Get expiring quotations (Staff/Store Owner)
   */
  getExpiringQuotations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate query parameters
      const { error, value } = expiringQuotationsQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const userId = req.user!.userId;
      const storeId = req.params.storeId;
      const { days } = value;

      const quotations = await this.quotationService.getExpiringQuotations(
        userId,
        storeId,
        days
      );

      res.status(200).json({
        success: true,
        data: {
          quotations,
        },
        meta: {
          count: quotations.length,
          expiringWithinDays: days,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };
}