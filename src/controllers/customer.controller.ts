import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';
import { ServiceRequestService } from '../services/service-request.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { 
  createBikeSchema,
  updateBikeSchema,
  searchBikesSchema,
  getBikeSchema,
  deleteBikeSchema
} from '../validators/bike.validators';
import {
  createServiceRequestSchema,
  updateServiceRequestSchema,
  getServiceRequestSchema,
  customerServiceRequestQuerySchema,
  cancelServiceRequestSchema
} from '../validators/service-request.validators';
import { ValidationError } from '../utils/errors';
import { UserRole } from '../types/database/database.types';

export class CustomerController {
  private customerService: CustomerService;
  private serviceRequestService: ServiceRequestService;

  constructor() {
    this.customerService = new CustomerService();
    this.serviceRequestService = new ServiceRequestService();
  }

  /**
   * Register a new bike for the authenticated customer
   */
  registerBike = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createBikeSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const bike = await this.customerService.registerBike(customerId, value);

      res.status(201).json({
        success: true,
        data: {
          bike,
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
   * Get all bikes for the authenticated customer
   */
  getBikes = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const customerId = req.user!.userId;
      
      // Parse query parameters for pagination
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'ASC' | 'DESC';

      const result = await this.customerService.getCustomerBikes(customerId, {
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: result.bikes,
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
   * Get a specific bike by ID for the authenticated customer
   */
  getBikeById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request parameters
      const { error, value } = getBikeSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const { id: bikeId } = value;

      const bike = await this.customerService.getBikeById(customerId, bikeId);

      res.status(200).json({
        success: true,
        data: {
          bike,
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
   * Update a bike for the authenticated customer
   */
  updateBike = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request parameters
      const { error: paramError, value: paramValue } = getBikeSchema.validate(req.params);
      if (paramError) {
        throw new ValidationError(paramError.details[0].message);
      }

      // Validate request body
      const { error: bodyError, value: bodyValue } = updateBikeSchema.validate(req.body);
      if (bodyError) {
        throw new ValidationError(bodyError.details[0].message);
      }

      const customerId = req.user!.userId;
      const { id: bikeId } = paramValue;

      const bike = await this.customerService.updateBike(
        customerId,
        bikeId,
        bodyValue
      );

      res.status(200).json({
        success: true,
        data: {
          bike,
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
   * Delete a bike for the authenticated customer
   */
  deleteBike = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request parameters
      const { error, value } = deleteBikeSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const { id: bikeId } = value;

      await this.customerService.deleteBike(customerId, bikeId);

      res.status(200).json({
        success: true,
        data: {
          message: 'Bike deleted successfully',
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
   * Search bikes for the authenticated customer
   */
  searchBikes = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate query parameters
      const { error, value } = searchBikesSchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const { page, limit, sortBy, sortOrder, ...searchCriteria } = value;

      const result = await this.customerService.searchBikes(
        customerId,
        searchCriteria,
        { page, limit, sortBy, sortOrder }
      );

      res.status(200).json({
        success: true,
        data: result.bikes,
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
   * Get bike statistics for the authenticated customer
   */
  getBikeStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const customerId = req.user!.userId;
      const stats = await this.customerService.getCustomerBikeStats(customerId);

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
   * Verify bike ownership for the authenticated customer
   */
  verifyBikeOwnership = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request parameters
      const { error, value } = getBikeSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const { id: bikeId } = value;

      const isOwner = await this.customerService.verifyBikeOwnership(
        customerId,
        bikeId
      );

      res.status(200).json({
        success: true,
        data: {
          isOwner,
          bikeId,
          customerId,
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
   * Get customer profile information
   */
  getProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const customerId = req.user!.userId;
      const customer = await this.customerService.getCustomerProfile(customerId);

      // Remove sensitive information
      const { passwordHash, passwordResetToken, emailVerificationToken, ...safeCustomer } = customer.toJSON();

      res.status(200).json({
        success: true,
        data: {
          customer: safeCustomer,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Service Request Methods

  /**
   * Create a new service request
   */
  createServiceRequest = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = createServiceRequestSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const serviceRequest = await this.serviceRequestService.createServiceRequest(
        customerId,
        value
      );

      res.status(201).json({
        success: true,
        data: {
          serviceRequest,
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
   * Get all service requests for the authenticated customer
   */
  getServiceRequests = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate query parameters
      const { error, value } = customerServiceRequestQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const { page, limit, sortBy, sortOrder, ...filters } = value;

      const result = await this.serviceRequestService.getCustomerServiceRequests(
        customerId,
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
      next(error);
    }
  };

  /**
   * Get a specific service request by ID
   */
  getServiceRequestById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request parameters
      const { error, value } = getServiceRequestSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const { id: requestId } = value;

      const serviceRequest = await this.serviceRequestService.getServiceRequestById(
        requestId,
        customerId,
        UserRole.CUSTOMER
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
      next(error);
    }
  };

  /**
   * Update a service request
   */
  updateServiceRequest = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request parameters
      const { error: paramError, value: paramValue } = getServiceRequestSchema.validate(req.params);
      if (paramError) {
        throw new ValidationError(paramError.details[0].message);
      }

      // Validate request body
      const { error: bodyError, value: bodyValue } = updateServiceRequestSchema.validate(req.body);
      if (bodyError) {
        throw new ValidationError(bodyError.details[0].message);
      }

      const customerId = req.user!.userId;
      const { id: requestId } = paramValue;

      const serviceRequest = await this.serviceRequestService.updateServiceRequest(
        requestId,
        customerId,
        bodyValue
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
      next(error);
    }
  };

  /**
   * Cancel a service request
   */
  cancelServiceRequest = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request parameters
      const { error, value } = cancelServiceRequestSchema.validate(req.params);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const customerId = req.user!.userId;
      const { id: requestId } = value;

      const serviceRequest = await this.serviceRequestService.cancelServiceRequest(
        requestId,
        customerId,
        UserRole.CUSTOMER
      );

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
      next(error);
    }
  };

  /**
   * Get service request statistics for the customer
   */
  getServiceRequestStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const customerId = req.user!.userId;
      const stats = await this.serviceRequestService.getServiceRequestStats(
        customerId,
        UserRole.CUSTOMER
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

  // Service Progress Tracking Methods

  /**
   * Get service progress for a service request
   */
  getServiceProgress = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const customerId = req.user!.userId;
      const { requestId } = req.params;

      // First verify the customer owns the service request
      const serviceRequest = await this.serviceRequestService.getServiceRequestById(
        requestId,
        customerId,
        UserRole.CUSTOMER
      );

      // Get the service record if it exists
      const serviceRecord = await this.customerService.getServiceRecordByRequestId(
        customerId,
        requestId
      );

      res.status(200).json({
        success: true,
        data: {
          serviceRequest,
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
   * Get customer-visible service updates for a service request
   */
  getServiceUpdates = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const customerId = req.user!.userId;
      const { requestId } = req.params;

      // Parse query parameters
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const result = await this.customerService.getServiceUpdates(
        customerId,
        requestId,
        { page, limit }
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
}