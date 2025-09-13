import { Transaction } from 'sequelize';
import { ServiceRequestRepository, CreateServiceRequestData, UpdateServiceRequestData, ServiceRequestFilters } from '../repositories/service-request.repository';
import { BikeRepository } from '../repositories/bike.repository';
import { StoreRepository } from '../repositories/store.repository';
import { UserRepository } from '../repositories/user.repository';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { User } from '../database/models/User';
import { Store } from '../database/models/Store';
import { Bike } from '../database/models/Bike';
import { UserRole, RequestStatus, Priority } from '../types/database/database.types';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError 
} from '../utils/errors';

export interface ServiceRequestSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateServiceRequestInput {
  bikeId: string;
  storeId: string;
  requestedServices: string[];
  priority?: Priority;
  preferredDate?: Date;
  customerNotes?: string;
}

export interface UpdateServiceRequestInput {
  requestedServices?: string[];
  priority?: Priority;
  preferredDate?: Date;
  customerNotes?: string;
}

export class ServiceRequestService {
  private serviceRequestRepository: ServiceRequestRepository;
  private bikeRepository: BikeRepository;
  private storeRepository: StoreRepository;
  private userRepository: UserRepository;

  constructor() {
    this.serviceRequestRepository = new ServiceRequestRepository();
    this.bikeRepository = new BikeRepository();
    this.storeRepository = new StoreRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Verify that a user is a customer
   */
  private async verifyCustomerRole(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('Customer not found');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenError('User is not a customer');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Customer account is inactive');
    }

    return user;
  }

  /**
   * Verify bike ownership and get bike details
   */
  private async verifyBikeOwnership(bikeId: string, customerId: string): Promise<Bike> {
    const bike = await this.bikeRepository.findById(bikeId);
    
    if (!bike) {
      throw new NotFoundError('Bike not found');
    }

    if (bike.customerId !== customerId) {
      throw new ForbiddenError('Bike does not belong to customer');
    }

    return bike;
  }

  /**
   * Verify store exists and is active
   */
  private async verifyStoreActive(storeId: string): Promise<Store> {
    const store = await this.storeRepository.findById(storeId);
    
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    if (!store.isActive) {
      throw new ForbiddenError('Store is not active');
    }

    return store;
  }

  /**
   * Validate service request data
   */
  private validateServiceRequestData(data: CreateServiceRequestInput | UpdateServiceRequestInput): void {
    if ('requestedServices' in data && data.requestedServices) {
      if (!Array.isArray(data.requestedServices) || data.requestedServices.length === 0) {
        throw new ValidationError('At least one service must be requested');
      }

      // Validate each service is a non-empty string
      for (const service of data.requestedServices) {
        if (typeof service !== 'string' || service.trim().length === 0) {
          throw new ValidationError('All requested services must be valid non-empty strings');
        }
      }
    }

    if (data.preferredDate) {
      const now = new Date();
      if (data.preferredDate <= now) {
        throw new ValidationError('Preferred date must be in the future');
      }
    }

    if (data.customerNotes && data.customerNotes.length > 1000) {
      throw new ValidationError('Customer notes cannot exceed 1000 characters');
    }
  }

  /**
   * Create a new service request
   */
  async createServiceRequest(
    customerId: string,
    requestData: CreateServiceRequestInput,
    transaction?: Transaction
  ): Promise<ServiceRequest> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    // Validate input data
    this.validateServiceRequestData(requestData);

    // Verify bike ownership
    await this.verifyBikeOwnership(requestData.bikeId, customerId);

    // Verify store is active
    await this.verifyStoreActive(requestData.storeId);

    // Check for existing pending requests for the same bike at the same store
    const existingRequests = await this.serviceRequestRepository.findWithFilters({
      customerId,
      bikeId: requestData.bikeId,
      storeId: requestData.storeId,
      status: [RequestStatus.PENDING, RequestStatus.QUOTED, RequestStatus.APPROVED, RequestStatus.IN_PROGRESS],
    });

    if (existingRequests.length > 0) {
      throw new ConflictError(
        'There is already an active service request for this bike at this store'
      );
    }

    // Create the service request
    const serviceRequestData: CreateServiceRequestData = {
      customerId,
      bikeId: requestData.bikeId,
      storeId: requestData.storeId,
      requestedServices: requestData.requestedServices,
      priority: requestData.priority || Priority.MEDIUM,
      preferredDate: requestData.preferredDate,
      customerNotes: requestData.customerNotes,
    };

    const serviceRequest = await this.serviceRequestRepository.createServiceRequest(
      serviceRequestData,
      transaction
    );

    // Return with full details
    return await this.serviceRequestRepository.findByIdWithDetails(serviceRequest.id) as ServiceRequest;
  }

  /**
   * Get service requests for a customer
   */
  async getCustomerServiceRequests(
    customerId: string,
    filters: Partial<ServiceRequestFilters> = {},
    options: ServiceRequestSearchOptions = {}
  ): Promise<{
    requests: ServiceRequest[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    // Add customer filter
    const searchFilters: ServiceRequestFilters = {
      ...filters,
      customerId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.serviceRequestRepository.findWithPagination(
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'DESC',
        },
        {
          where: this.buildWhereClause(searchFilters),
          include: [
            {
              model: Bike,
              as: 'bike',
            },
            {
              model: Store,
              as: 'store',
              attributes: ['id', 'name', 'address', 'phone'],
            },
          ],
        }
      );

      return {
        requests: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all requests without pagination
      const requests = await this.serviceRequestRepository.findWithFilters(searchFilters);

      return { requests };
    }
  }

  /**
   * Get service requests for a store
   */
  async getStoreServiceRequests(
    storeId: string,
    filters: Partial<ServiceRequestFilters> = {},
    options: ServiceRequestSearchOptions = {}
  ): Promise<{
    requests: ServiceRequest[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify store exists and is active
    await this.verifyStoreActive(storeId);

    // Add store filter
    const searchFilters: ServiceRequestFilters = {
      ...filters,
      storeId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.serviceRequestRepository.findWithPagination(
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'DESC',
        },
        {
          where: this.buildWhereClause(searchFilters),
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            },
            {
              model: Bike,
              as: 'bike',
            },
          ],
        }
      );

      return {
        requests: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all requests without pagination
      const requests = await this.serviceRequestRepository.findWithFilters(searchFilters);

      return { requests };
    }
  }

  /**
   * Get a specific service request by ID
   */
  async getServiceRequestById(
    requestId: string,
    userId: string,
    userRole: UserRole,
    storeId?: string
  ): Promise<ServiceRequest> {
    const serviceRequest = await this.serviceRequestRepository.findByIdWithDetails(requestId);

    if (!serviceRequest) {
      throw new NotFoundError('Service request not found');
    }

    // Check access permissions
    if (userRole === UserRole.CUSTOMER) {
      if (serviceRequest.customerId !== userId) {
        throw new ForbiddenError('Access denied to this service request');
      }
    } else if (userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) {
      if (!storeId || serviceRequest.storeId !== storeId) {
        throw new ForbiddenError('Access denied to this service request');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return serviceRequest;
  }

  /**
   * Update a service request (customer only)
   */
  async updateServiceRequest(
    requestId: string,
    customerId: string,
    updateData: UpdateServiceRequestInput,
    transaction?: Transaction
  ): Promise<ServiceRequest> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    // Validate input data
    this.validateServiceRequestData(updateData);

    // Get existing service request
    const existingRequest = await this.serviceRequestRepository.findById(requestId);

    if (!existingRequest) {
      throw new NotFoundError('Service request not found');
    }

    // Verify ownership
    if (existingRequest.customerId !== customerId) {
      throw new ForbiddenError('Service request does not belong to customer');
    }

    // Check if request can be updated (only pending requests can be updated by customers)
    if (existingRequest.status !== RequestStatus.PENDING) {
      throw new ConflictError('Only pending service requests can be updated');
    }

    // Update the service request
    const updatedRequest = await this.serviceRequestRepository.updateServiceRequest(
      requestId,
      updateData,
      transaction
    );

    if (!updatedRequest) {
      throw new NotFoundError('Service request not found');
    }

    // Return with full details
    return await this.serviceRequestRepository.findByIdWithDetails(updatedRequest.id) as ServiceRequest;
  }

  /**
   * Update service request status (staff/store owner only)
   */
  async updateServiceRequestStatus(
    requestId: string,
    newStatus: RequestStatus,
    storeId: string,
    transaction?: Transaction
  ): Promise<ServiceRequest> {
    // Get existing service request
    const existingRequest = await this.serviceRequestRepository.findById(requestId);

    if (!existingRequest) {
      throw new NotFoundError('Service request not found');
    }

    // Verify store access
    if (existingRequest.storeId !== storeId) {
      throw new ForbiddenError('Service request does not belong to this store');
    }

    // Validate status transition
    this.validateStatusTransition(existingRequest.status, newStatus);

    // Update the status
    const updatedRequest = await this.serviceRequestRepository.updateStatus(
      requestId,
      newStatus,
      transaction
    );

    if (!updatedRequest) {
      throw new NotFoundError('Service request not found');
    }

    // Return with full details
    return await this.serviceRequestRepository.findByIdWithDetails(updatedRequest.id) as ServiceRequest;
  }

  /**
   * Cancel a service request
   */
  async cancelServiceRequest(
    requestId: string,
    userId: string,
    userRole: UserRole,
    storeId?: string,
    transaction?: Transaction
  ): Promise<ServiceRequest> {
    const existingRequest = await this.serviceRequestRepository.findById(requestId);

    if (!existingRequest) {
      throw new NotFoundError('Service request not found');
    }

    // Check permissions
    if (userRole === UserRole.CUSTOMER) {
      if (existingRequest.customerId !== userId) {
        throw new ForbiddenError('Service request does not belong to customer');
      }
    } else if (userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) {
      if (!storeId || existingRequest.storeId !== storeId) {
        throw new ForbiddenError('Service request does not belong to this store');
      }
    } else {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Check if request can be cancelled
    if (!existingRequest.canBeCancelled()) {
      throw new ConflictError('Service request cannot be cancelled in its current status');
    }

    // Update status to cancelled
    const updatedRequest = await this.serviceRequestRepository.updateStatus(
      requestId,
      RequestStatus.CANCELLED,
      transaction
    );

    if (!updatedRequest) {
      throw new NotFoundError('Service request not found');
    }

    return await this.serviceRequestRepository.findByIdWithDetails(updatedRequest.id) as ServiceRequest;
  }

  /**
   * Get service request statistics
   */
  async getServiceRequestStats(
    userId: string,
    userRole: UserRole,
    storeId?: string
  ): Promise<any> {
    if (userRole === UserRole.CUSTOMER) {
      return await this.serviceRequestRepository.getCustomerStats(userId);
    } else if ((userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) && storeId) {
      return await this.serviceRequestRepository.getStoreStats(storeId);
    } else {
      throw new ForbiddenError('Insufficient permissions or missing store ID');
    }
  }

  /**
   * Get overdue service requests
   */
  async getOverdueRequests(storeId?: string): Promise<ServiceRequest[]> {
    return await this.serviceRequestRepository.findOverdueRequests(storeId);
  }

  /**
   * Get high priority service requests
   */
  async getHighPriorityRequests(storeId?: string): Promise<ServiceRequest[]> {
    return await this.serviceRequestRepository.findHighPriorityRequests(storeId);
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: RequestStatus, newStatus: RequestStatus): void {
    const validTransitions: { [key in RequestStatus]: RequestStatus[] } = {
      [RequestStatus.PENDING]: [RequestStatus.QUOTED, RequestStatus.CANCELLED, RequestStatus.EXPIRED],
      [RequestStatus.QUOTED]: [RequestStatus.APPROVED, RequestStatus.CANCELLED, RequestStatus.EXPIRED],
      [RequestStatus.APPROVED]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
      [RequestStatus.IN_PROGRESS]: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
      [RequestStatus.COMPLETED]: [], // No transitions from completed
      [RequestStatus.CANCELLED]: [], // No transitions from cancelled
      [RequestStatus.EXPIRED]: [RequestStatus.PENDING], // Can be reactivated
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Build where clause for filters
   */
  private buildWhereClause(filters: ServiceRequestFilters): any {
    const where: any = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters.bikeId) {
      where.bikeId = filters.bikeId;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { [Symbol.for('in')]: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        where.priority = { [Symbol.for('in')]: filters.priority };
      } else {
        where.priority = filters.priority;
      }
    }

    return where;
  }
}