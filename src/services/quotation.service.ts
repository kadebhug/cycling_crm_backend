import { Transaction } from 'sequelize';
import { QuotationRepository, CreateQuotationData, UpdateQuotationData, QuotationFilters } from '../repositories/quotation.repository';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { Quotation } from '../database/models/Quotation';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { User } from '../database/models/User';
import { UserRole, QuotationStatus, RequestStatus, Permission, QuotationLineItem } from '../types/database/database.types';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError 
} from '../utils/errors';

export interface QuotationSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateQuotationInput {
  serviceRequestId: string;
  lineItems: Omit<QuotationLineItem, 'id' | 'total'>[];
  taxRate: number;
  validityDays?: number; // Default 30 days
  notes?: string;
}

export interface UpdateQuotationInput {
  lineItems?: QuotationLineItem[];
  taxRate?: number;
  validUntil?: Date;
  notes?: string;
}

export class QuotationService {
  private quotationRepository: QuotationRepository;
  private serviceRequestRepository: ServiceRequestRepository;
  private userRepository: UserRepository;
  private storeRepository: StoreRepository;

  constructor() {
    this.quotationRepository = new QuotationRepository();
    this.serviceRequestRepository = new ServiceRequestRepository();
    this.userRepository = new UserRepository();
    this.storeRepository = new StoreRepository();
  }

  /**
   * Verify user has quotation permissions for the store
   */
  private async verifyQuotationPermissions(
    userId: string,
    storeId: string,
    permission: Permission
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenError('User account is inactive');
    }

    // Admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return;
    }

    // Store owner has all permissions for their store
    if (user.role === UserRole.STORE_OWNER) {
      const store = await this.storeRepository.findById(storeId);
      if (!store) {
        throw new NotFoundError('Store not found');
      }
      
      if (store.ownerId !== userId) {
        throw new ForbiddenError('Access denied to this store');
      }
      
      return;
    }

    // Staff needs specific permissions
    if (user.role === UserRole.STAFF) {
      // Check staff permissions for the store
      const hasPermission = await this.userRepository.hasStorePermission(userId, storeId, permission);
      
      if (!hasPermission) {
        throw new ForbiddenError(`Insufficient permissions: ${permission} required`);
      }
      
      return;
    }

    throw new ForbiddenError('Insufficient role permissions');
  }

  /**
   * Verify service request exists and can be quoted
   */
  private async verifyServiceRequestForQuotation(
    serviceRequestId: string,
    storeId: string
  ): Promise<ServiceRequest> {
    const serviceRequest = await this.serviceRequestRepository.findByIdWithDetails(serviceRequestId);
    
    if (!serviceRequest) {
      throw new NotFoundError('Service request not found');
    }

    if (serviceRequest.storeId !== storeId) {
      throw new ForbiddenError('Service request does not belong to this store');
    }

    if (!serviceRequest.canBeQuoted()) {
      throw new ConflictError('Service request cannot be quoted in its current status');
    }

    return serviceRequest;
  }

  /**
   * Validate quotation data
   */
  private validateQuotationData(data: CreateQuotationInput | UpdateQuotationInput): void {
    if ('lineItems' in data && data.lineItems) {
      if (!Array.isArray(data.lineItems) || data.lineItems.length === 0) {
        throw new ValidationError('At least one line item is required');
      }

      // Validate each line item
      for (const item of data.lineItems) {
        if (!item.description || item.description.trim().length === 0) {
          throw new ValidationError('Line item description is required');
        }

        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new ValidationError('Line item quantity must be a positive number');
        }

        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          throw new ValidationError('Line item unit price must be a non-negative number');
        }

        if (item.description.length > 500) {
          throw new ValidationError('Line item description cannot exceed 500 characters');
        }
      }
    }

    if ('taxRate' in data && data.taxRate !== undefined) {
      if (typeof data.taxRate !== 'number' || data.taxRate < 0 || data.taxRate > 100) {
        throw new ValidationError('Tax rate must be between 0 and 100');
      }
    }

    if ('validUntil' in data && data.validUntil) {
      const now = new Date();
      if (data.validUntil <= now) {
        throw new ValidationError('Valid until date must be in the future');
      }
    }

    if ('notes' in data && data.notes && data.notes.length > 2000) {
      throw new ValidationError('Notes cannot exceed 2000 characters');
    }
  }

  /**
   * Calculate validity date
   */
  private calculateValidityDate(days: number = 30): Date {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + days);
    return validUntil;
  }

  /**
   * Create a new quotation
   */
  async createQuotation(
    userId: string,
    storeId: string,
    quotationData: CreateQuotationInput,
    transaction?: Transaction
  ): Promise<Quotation> {
    // Verify permissions
    await this.verifyQuotationPermissions(userId, storeId, Permission.CREATE_QUOTATIONS);

    // Validate input data
    this.validateQuotationData(quotationData);

    // Verify service request
    const serviceRequest = await this.verifyServiceRequestForQuotation(
      quotationData.serviceRequestId,
      storeId
    );

    // Check if there's already an active quotation for this service request
    const existingQuotations = await this.quotationRepository.findByServiceRequestId(
      quotationData.serviceRequestId
    );

    const activeQuotation = existingQuotations.find(q => 
      [QuotationStatus.DRAFT, QuotationStatus.SENT].includes(q.status as QuotationStatus)
    );

    if (activeQuotation) {
      throw new ConflictError('There is already an active quotation for this service request');
    }

    // Calculate validity date
    const validUntil = this.calculateValidityDate(quotationData.validityDays);

    // Create quotation data
    const createData: CreateQuotationData = {
      serviceRequestId: quotationData.serviceRequestId,
      createdById: userId,
      lineItems: quotationData.lineItems,
      taxRate: quotationData.taxRate,
      validUntil,
      notes: quotationData.notes,
    };

    // Create the quotation
    const quotation = await this.quotationRepository.createQuotation(createData, transaction);

    // Return with full details
    return await this.quotationRepository.findByIdWithDetails(quotation.id) as Quotation;
  }

  /**
   * Get quotations for a store
   */
  async getStoreQuotations(
    userId: string,
    storeId: string,
    filters: Partial<QuotationFilters> = {},
    options: QuotationSearchOptions = {}
  ): Promise<{
    quotations: Quotation[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify permissions
    await this.verifyQuotationPermissions(userId, storeId, Permission.VIEW_QUOTATIONS);

    // Add store filter
    const searchFilters: QuotationFilters = {
      ...filters,
      storeId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.quotationRepository.findWithPagination(
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'DESC',
        },
        {
          where: this.buildWhereClause(searchFilters),
        }
      );

      return {
        quotations: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all quotations without pagination
      const quotations = await this.quotationRepository.findWithFilters(searchFilters);

      return { quotations };
    }
  }

  /**
   * Get quotations for a customer
   */
  async getCustomerQuotations(
    customerId: string,
    filters: Partial<QuotationFilters> = {},
    options: QuotationSearchOptions = {}
  ): Promise<{
    quotations: Quotation[];
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
    const customer = await this.userRepository.findById(customerId);
    
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    if (customer.role !== UserRole.CUSTOMER) {
      throw new ForbiddenError('User is not a customer');
    }

    if (!customer.isActive) {
      throw new ForbiddenError('Customer account is inactive');
    }

    // Add customer filter
    const searchFilters: QuotationFilters = {
      ...filters,
      customerId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.quotationRepository.findWithPagination(
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'DESC',
        },
        {
          where: this.buildWhereClause(searchFilters),
        }
      );

      return {
        quotations: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all quotations without pagination
      const quotations = await this.quotationRepository.findWithFilters(searchFilters);

      return { quotations };
    }
  }

  /**
   * Get a specific quotation by ID
   */
  async getQuotationById(
    quotationId: string,
    userId: string,
    userRole: UserRole,
    storeId?: string
  ): Promise<Quotation> {
    const quotation = await this.quotationRepository.findByIdWithDetails(quotationId);

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Check access permissions
    if (userRole === UserRole.CUSTOMER) {
      if (quotation.serviceRequest?.customerId !== userId) {
        throw new ForbiddenError('Access denied to this quotation');
      }
    } else if (userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) {
      if (!storeId || quotation.serviceRequest?.storeId !== storeId) {
        throw new ForbiddenError('Access denied to this quotation');
      }
      
      // Verify permissions for staff
      if (userRole === UserRole.STAFF) {
        await this.verifyQuotationPermissions(userId, storeId, Permission.VIEW_QUOTATIONS);
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return quotation;
  }

  /**
   * Update a quotation
   */
  async updateQuotation(
    quotationId: string,
    userId: string,
    storeId: string,
    updateData: UpdateQuotationInput,
    transaction?: Transaction
  ): Promise<Quotation> {
    // Verify permissions
    await this.verifyQuotationPermissions(userId, storeId, Permission.UPDATE_QUOTATIONS);

    // Validate input data
    this.validateQuotationData(updateData);

    // Get existing quotation
    const existingQuotation = await this.quotationRepository.findByIdWithDetails(quotationId);

    if (!existingQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Verify store access
    if (existingQuotation.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Quotation does not belong to this store');
    }

    // Check if quotation can be updated
    if (!existingQuotation.canBeEdited()) {
      throw new ConflictError('Quotation cannot be updated in its current status');
    }

    // Update the quotation
    const updatedQuotation = await this.quotationRepository.updateQuotation(
      quotationId,
      updateData,
      transaction
    );

    if (!updatedQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Return with full details
    return await this.quotationRepository.findByIdWithDetails(updatedQuotation.id) as Quotation;
  }

  /**
   * Send quotation to customer
   */
  async sendQuotation(
    quotationId: string,
    userId: string,
    storeId: string,
    transaction?: Transaction
  ): Promise<Quotation> {
    // Verify permissions
    await this.verifyQuotationPermissions(userId, storeId, Permission.UPDATE_QUOTATIONS);

    // Get existing quotation
    const existingQuotation = await this.quotationRepository.findByIdWithDetails(quotationId);

    if (!existingQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Verify store access
    if (existingQuotation.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Quotation does not belong to this store');
    }

    // Check if quotation can be sent
    if (!existingQuotation.canBeSent()) {
      throw new ConflictError('Quotation cannot be sent in its current status');
    }

    // Check if quotation is expired
    if (existingQuotation.isExpired()) {
      throw new ConflictError('Cannot send expired quotation');
    }

    // Update quotation status to sent
    const updatedQuotation = await this.quotationRepository.updateStatus(
      quotationId,
      QuotationStatus.SENT,
      transaction
    );

    if (!updatedQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Update service request status to quoted
    await this.serviceRequestRepository.updateStatus(
      existingQuotation.serviceRequestId,
      RequestStatus.QUOTED,
      transaction
    );

    // Return with full details
    return await this.quotationRepository.findByIdWithDetails(updatedQuotation.id) as Quotation;
  }

  /**
   * Approve quotation (customer action)
   */
  async approveQuotation(
    quotationId: string,
    customerId: string,
    transaction?: Transaction
  ): Promise<Quotation> {
    // Get existing quotation
    const existingQuotation = await this.quotationRepository.findByIdWithDetails(quotationId);

    if (!existingQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Verify customer ownership
    if (existingQuotation.serviceRequest?.customerId !== customerId) {
      throw new ForbiddenError('Quotation does not belong to customer');
    }

    // Check if quotation can be approved
    if (!existingQuotation.canBeApproved()) {
      throw new ConflictError('Quotation cannot be approved in its current status or has expired');
    }

    // Update quotation status to approved
    const updatedQuotation = await this.quotationRepository.updateStatus(
      quotationId,
      QuotationStatus.APPROVED,
      transaction
    );

    if (!updatedQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Update service request status to approved
    await this.serviceRequestRepository.updateStatus(
      existingQuotation.serviceRequestId,
      RequestStatus.APPROVED,
      transaction
    );

    // Return with full details
    return await this.quotationRepository.findByIdWithDetails(updatedQuotation.id) as Quotation;
  }

  /**
   * Reject quotation (customer action)
   */
  async rejectQuotation(
    quotationId: string,
    customerId: string,
    transaction?: Transaction
  ): Promise<Quotation> {
    // Get existing quotation
    const existingQuotation = await this.quotationRepository.findByIdWithDetails(quotationId);

    if (!existingQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Verify customer ownership
    if (existingQuotation.serviceRequest?.customerId !== customerId) {
      throw new ForbiddenError('Quotation does not belong to customer');
    }

    // Check if quotation can be rejected
    if (!existingQuotation.canBeRejected()) {
      throw new ConflictError('Quotation cannot be rejected in its current status or has expired');
    }

    // Update quotation status to rejected
    const updatedQuotation = await this.quotationRepository.updateStatus(
      quotationId,
      QuotationStatus.REJECTED,
      transaction
    );

    if (!updatedQuotation) {
      throw new NotFoundError('Quotation not found');
    }

    // Update service request status back to pending
    await this.serviceRequestRepository.updateStatus(
      existingQuotation.serviceRequestId,
      RequestStatus.PENDING,
      transaction
    );

    // Return with full details
    return await this.quotationRepository.findByIdWithDetails(updatedQuotation.id) as Quotation;
  }

  /**
   * Get quotation statistics
   */
  async getQuotationStats(
    userId: string,
    userRole: UserRole,
    storeId?: string
  ): Promise<any> {
    if (userRole === UserRole.CUSTOMER) {
      return await this.quotationRepository.getCustomerStats(userId);
    } else if ((userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) && storeId) {
      await this.verifyQuotationPermissions(userId, storeId, Permission.VIEW_QUOTATIONS);
      return await this.quotationRepository.getStoreStats(storeId);
    } else {
      throw new ForbiddenError('Insufficient permissions or missing store ID');
    }
  }

  /**
   * Get expiring quotations
   */
  async getExpiringQuotations(
    userId: string,
    storeId: string,
    days: number = 3
  ): Promise<Quotation[]> {
    // Verify permissions
    await this.verifyQuotationPermissions(userId, storeId, Permission.VIEW_QUOTATIONS);

    const allExpiring = await this.quotationRepository.findExpiringSoonQuotations(days);
    
    // Filter by store
    return allExpiring.filter(q => q.serviceRequest?.storeId === storeId);
  }

  /**
   * Process expired quotations (background job)
   */
  async processExpiredQuotations(): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Mark expired quotations
      processed = await this.quotationRepository.markExpiredQuotations();

      // Update corresponding service requests
      const expiredQuotations = await this.quotationRepository.findWithFilters({
        status: QuotationStatus.EXPIRED,
      });

      for (const quotation of expiredQuotations) {
        try {
          // Only update service request if it's still in quoted status
          const serviceRequest = await this.serviceRequestRepository.findById(quotation.serviceRequestId);
          
          if (serviceRequest && serviceRequest.status === RequestStatus.QUOTED) {
            await this.serviceRequestRepository.updateStatus(
              quotation.serviceRequestId,
              RequestStatus.EXPIRED
            );
          }
        } catch (error) {
          errors.push(`Failed to update service request ${quotation.serviceRequestId}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to process expired quotations: ${error}`);
    }

    return { processed, errors };
  }

  /**
   * Build where clause for filters
   */
  private buildWhereClause(filters: QuotationFilters): any {
    const where: any = {};

    if (filters.serviceRequestId) {
      where.serviceRequestId = filters.serviceRequestId;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { [Symbol.for('in')]: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    return where;
  }
}