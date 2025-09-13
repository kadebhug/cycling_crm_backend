import { Transaction } from 'sequelize';
import { ServiceRecordRepository, CreateServiceRecordData, UpdateServiceRecordData, ServiceRecordFilters } from '../repositories/service-record.repository';
import { ServiceUpdateRepository, CreateServiceUpdateData, UpdateServiceUpdateData, ServiceUpdateFilters } from '../repositories/service-update.repository';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { ServiceRecord } from '../database/models/ServiceRecord';
import { ServiceUpdate } from '../database/models/ServiceUpdate';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { User } from '../database/models/User';
import { Store } from '../database/models/Store';
import { StaffStorePermission } from '../database/models/StaffStorePermission';
import { UserRole, ServiceRecordStatus, RequestStatus, Permission } from '../types/database/database.types';
import { PasswordUtils } from '../utils/password';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError 
} from '../utils/errors';

export interface ServiceProgressSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateServiceRecordInput {
  serviceRequestId: string;
  assignedStaffId?: string;
  estimatedCompletionDate?: Date;
  notes?: string;
}

export interface UpdateServiceRecordInput {
  assignedStaffId?: string;
  status?: ServiceRecordStatus;
  estimatedCompletionDate?: Date;
  workPerformed?: string;
  partsUsed?: string;
  laborHours?: number;
  notes?: string;
}

export interface CreateServiceUpdateInput {
  updateType: string;
  message: string;
  isVisibleToCustomer?: boolean;
}

export interface UpdateServiceUpdateInput {
  updateType?: string;
  message?: string;
  isVisibleToCustomer?: boolean;
}

// Staff management interfaces
export interface CreateStaffData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  permissions: Permission[];
}

export interface UpdateStaffData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateStaffPermissionsData {
  permissions: Permission[];
}

export class StaffService {
  private serviceRecordRepository: ServiceRecordRepository;
  private serviceUpdateRepository: ServiceUpdateRepository;
  private serviceRequestRepository: ServiceRequestRepository;
  private userRepository: UserRepository;
  private storeRepository: StoreRepository;

  constructor() {
    this.serviceRecordRepository = new ServiceRecordRepository();
    this.serviceUpdateRepository = new ServiceUpdateRepository();
    this.serviceRequestRepository = new ServiceRequestRepository();
    this.userRepository = new UserRepository();
    this.storeRepository = new StoreRepository();
  }

  /**
   * Verify that a user is staff or store owner
   */
  private async verifyStaffRole(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (![UserRole.STAFF, UserRole.STORE_OWNER].includes(user.role)) {
      throw new ForbiddenError('User is not staff or store owner');
    }

    if (!user.isActive) {
      throw new ForbiddenError('User account is inactive');
    }

    return user;
  }

  /**
   * Verify staff has permission for the store
   */
  private async verifyStoreAccess(userId: string, storeId: string, requiredPermission?: Permission): Promise<void> {
    // This would typically check staff_store_permissions table
    // For now, we'll implement a basic check
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Store owners have access to their own stores
    if (user.role === UserRole.STORE_OWNER) {
      // Check if they own the store (this would need to be implemented based on your store ownership logic)
      return;
    }

    // Staff need to have permissions for the store
    if (user.role === UserRole.STAFF) {
      // This would check the staff_store_permissions table
      // For now, we'll assume they have access if they're staff
      return;
    }

    throw new ForbiddenError('Insufficient permissions for this store');
  }

  /**
   * Validate service record data
   */
  private validateServiceRecordData(data: CreateServiceRecordInput | UpdateServiceRecordInput): void {
    if ('estimatedCompletionDate' in data && data.estimatedCompletionDate) {
      const now = new Date();
      if (data.estimatedCompletionDate <= now) {
        throw new ValidationError('Estimated completion date must be in the future');
      }
    }

    if ('laborHours' in data && data.laborHours !== undefined) {
      if (data.laborHours < 0 || data.laborHours > 999.99) {
        throw new ValidationError('Labor hours must be between 0 and 999.99');
      }
    }

    if ('notes' in data && data.notes && data.notes.length > 2000) {
      throw new ValidationError('Notes cannot exceed 2000 characters');
    }

    if ('workPerformed' in data && data.workPerformed && data.workPerformed.length > 2000) {
      throw new ValidationError('Work performed description cannot exceed 2000 characters');
    }

    if ('partsUsed' in data && data.partsUsed && data.partsUsed.length > 2000) {
      throw new ValidationError('Parts used description cannot exceed 2000 characters');
    }
  }

  /**
   * Validate service update data
   */
  private validateServiceUpdateData(data: CreateServiceUpdateInput | UpdateServiceUpdateInput): void {
    if ('message' in data && data.message !== undefined) {
      if (data.message.length === 0 || data.message.length > 2000) {
        throw new ValidationError('Update message must be between 1 and 2000 characters');
      }
    }

    if ('updateType' in data && data.updateType) {
      const validTypes = ServiceUpdate.getUpdateTypes();
      if (!validTypes.includes(data.updateType)) {
        throw new ValidationError(`Invalid update type. Must be one of: ${validTypes.join(', ')}`);
      }
    }
  }

  /**
   * Create a service record from an approved service request
   */
  async createServiceRecord(
    userId: string,
    storeId: string,
    requestData: CreateServiceRecordInput,
    transaction?: Transaction
  ): Promise<ServiceRecord> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.UPDATE_SERVICE_RECORDS);

    // Validate input data
    this.validateServiceRecordData(requestData);

    // Get the service request and verify it belongs to the store
    const serviceRequest = await this.serviceRequestRepository.findById(requestData.serviceRequestId);
    
    if (!serviceRequest) {
      throw new NotFoundError('Service request not found');
    }

    if (serviceRequest.storeId !== storeId) {
      throw new ForbiddenError('Service request does not belong to this store');
    }

    // Check if service request is approved
    if (serviceRequest.status !== RequestStatus.APPROVED) {
      throw new ConflictError('Service request must be approved before creating a service record');
    }

    // Check if service record already exists
    const existingRecord = await this.serviceRecordRepository.findByServiceRequestId(requestData.serviceRequestId);
    if (existingRecord) {
      throw new ConflictError('Service record already exists for this service request');
    }

    // Verify assigned staff if provided
    if (requestData.assignedStaffId) {
      const assignedStaff = await this.userRepository.findById(requestData.assignedStaffId);
      if (!assignedStaff) {
        throw new NotFoundError('Assigned staff not found');
      }

      if (![UserRole.STAFF, UserRole.STORE_OWNER].includes(assignedStaff.role)) {
        throw new ValidationError('Assigned user must be staff or store owner');
      }

      // Verify assigned staff has access to the store
      await this.verifyStoreAccess(requestData.assignedStaffId, storeId);
    }

    // Create the service record
    const serviceRecordData: CreateServiceRecordData = {
      serviceRequestId: requestData.serviceRequestId,
      assignedStaffId: requestData.assignedStaffId,
      estimatedCompletionDate: requestData.estimatedCompletionDate,
      notes: requestData.notes,
    };

    const serviceRecord = await this.serviceRecordRepository.createServiceRecord(
      serviceRecordData,
      transaction
    );

    // Update service request status to in_progress
    await this.serviceRequestRepository.updateStatus(
      requestData.serviceRequestId,
      RequestStatus.IN_PROGRESS,
      transaction
    );

    // Create initial service update
    await this.serviceUpdateRepository.createServiceUpdate({
      serviceRecordId: serviceRecord.id,
      createdById: userId,
      updateType: 'status_change',
      message: 'Service record created and work is ready to begin',
      isVisibleToCustomer: true,
    }, transaction);

    // Return with full details
    return await this.serviceRecordRepository.findByIdWithDetails(serviceRecord.id) as ServiceRecord;
  }

  /**
   * Get service records for a store
   */
  async getStoreServiceRecords(
    userId: string,
    storeId: string,
    filters: Partial<ServiceRecordFilters> = {},
    options: ServiceProgressSearchOptions = {}
  ): Promise<{
    records: ServiceRecord[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.VIEW_SERVICE_RECORDS);

    // Add store filter
    const searchFilters: ServiceRecordFilters = {
      ...filters,
      storeId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.serviceRecordRepository.findWithPagination(
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'DESC',
        },
        {
          where: this.buildServiceRecordWhereClause(searchFilters),
        }
      );

      return {
        records: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all records without pagination
      const records = await this.serviceRecordRepository.findWithFilters(searchFilters);

      return { records };
    }
  }

  /**
   * Get service records assigned to a staff member
   */
  async getStaffServiceRecords(
    userId: string,
    storeId: string,
    staffId?: string,
    filters: Partial<ServiceRecordFilters> = {},
    options: ServiceProgressSearchOptions = {}
  ): Promise<{
    records: ServiceRecord[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.VIEW_SERVICE_RECORDS);

    // If no staffId provided, use the requesting user's ID
    const targetStaffId = staffId || userId;

    // Add staff and store filters
    const searchFilters: ServiceRecordFilters = {
      ...filters,
      storeId,
      assignedStaffId: targetStaffId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.serviceRecordRepository.findWithPagination(
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'DESC',
        },
        {
          where: this.buildServiceRecordWhereClause(searchFilters),
        }
      );

      return {
        records: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all records without pagination
      const records = await this.serviceRecordRepository.findWithFilters(searchFilters);

      return { records };
    }
  }

  /**
   * Get a specific service record by ID
   */
  async getServiceRecordById(
    userId: string,
    storeId: string,
    recordId: string
  ): Promise<ServiceRecord> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.VIEW_SERVICE_RECORDS);

    const serviceRecord = await this.serviceRecordRepository.findByIdWithDetails(recordId);

    if (!serviceRecord) {
      throw new NotFoundError('Service record not found');
    }

    // Verify the record belongs to the store
    if (serviceRecord.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Service record does not belong to this store');
    }

    return serviceRecord;
  }

  /**
   * Update a service record
   */
  async updateServiceRecord(
    userId: string,
    storeId: string,
    recordId: string,
    updateData: UpdateServiceRecordInput,
    transaction?: Transaction
  ): Promise<ServiceRecord> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.UPDATE_SERVICE_RECORDS);

    // Validate input data
    this.validateServiceRecordData(updateData);

    // Get existing service record
    const existingRecord = await this.serviceRecordRepository.findByIdWithDetails(recordId);

    if (!existingRecord) {
      throw new NotFoundError('Service record not found');
    }

    // Verify the record belongs to the store
    if (existingRecord.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Service record does not belong to this store');
    }

    // Validate status transitions if status is being updated
    if (updateData.status && updateData.status !== existingRecord.status) {
      this.validateStatusTransition(existingRecord.status, updateData.status);
    }

    // Verify assigned staff if being updated
    if (updateData.assignedStaffId && updateData.assignedStaffId !== existingRecord.assignedStaffId) {
      const assignedStaff = await this.userRepository.findById(updateData.assignedStaffId);
      if (!assignedStaff) {
        throw new NotFoundError('Assigned staff not found');
      }

      if (![UserRole.STAFF, UserRole.STORE_OWNER].includes(assignedStaff.role)) {
        throw new ValidationError('Assigned user must be staff or store owner');
      }

      await this.verifyStoreAccess(updateData.assignedStaffId, storeId);
    }

    // Update the service record
    const updatedRecord = await this.serviceRecordRepository.updateServiceRecord(
      recordId,
      updateData,
      transaction
    );

    if (!updatedRecord) {
      throw new NotFoundError('Service record not found');
    }

    // Create service update for significant changes
    if (updateData.status && updateData.status !== existingRecord.status) {
      const statusMessages: { [key in ServiceRecordStatus]?: string } = {
        [ServiceRecordStatus.IN_PROGRESS]: 'Work has started on your bike',
        [ServiceRecordStatus.ON_HOLD]: 'Work has been temporarily paused',
        [ServiceRecordStatus.COMPLETED]: 'Work on your bike has been completed',
        [ServiceRecordStatus.CANCELLED]: 'Service has been cancelled',
      };

      await this.serviceUpdateRepository.createServiceUpdate({
        serviceRecordId: recordId,
        createdById: userId,
        updateType: 'status_change',
        message: statusMessages[updateData.status] || `Status changed to ${updateData.status}`,
        isVisibleToCustomer: true,
      }, transaction);
    }

    // Return with full details
    return await this.serviceRecordRepository.findByIdWithDetails(updatedRecord.id) as ServiceRecord;
  }

  /**
   * Add a service update
   */
  async addServiceUpdate(
    userId: string,
    storeId: string,
    recordId: string,
    updateData: CreateServiceUpdateInput,
    transaction?: Transaction
  ): Promise<ServiceUpdate> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.UPDATE_SERVICE_RECORDS);

    // Validate input data
    this.validateServiceUpdateData(updateData);

    // Get the service record and verify access
    const serviceRecord = await this.serviceRecordRepository.findByIdWithDetails(recordId);

    if (!serviceRecord) {
      throw new NotFoundError('Service record not found');
    }

    // Verify the record belongs to the store
    if (serviceRecord.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Service record does not belong to this store');
    }

    // Create the service update
    const serviceUpdateData: CreateServiceUpdateData = {
      serviceRecordId: recordId,
      createdById: userId,
      updateType: updateData.updateType,
      message: updateData.message,
      isVisibleToCustomer: updateData.isVisibleToCustomer ?? false,
    };

    const serviceUpdate = await this.serviceUpdateRepository.createServiceUpdate(
      serviceUpdateData,
      transaction
    );

    // Return with full details
    return await this.serviceUpdateRepository.findByIdWithDetails(serviceUpdate.id) as ServiceUpdate;
  }

  /**
   * Get service updates for a service record
   */
  async getServiceUpdates(
    userId: string,
    storeId: string,
    recordId: string,
    customerVisibleOnly: boolean = false,
    options: ServiceProgressSearchOptions = {}
  ): Promise<{
    updates: ServiceUpdate[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.VIEW_SERVICE_RECORDS);

    // Verify service record exists and belongs to store
    const serviceRecord = await this.serviceRecordRepository.findByIdWithDetails(recordId);

    if (!serviceRecord) {
      throw new NotFoundError('Service record not found');
    }

    if (serviceRecord.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Service record does not belong to this store');
    }

    // Get updates
    let updates: ServiceUpdate[];

    if (customerVisibleOnly) {
      updates = await this.serviceUpdateRepository.findCustomerVisibleByServiceRecordId(recordId);
    } else {
      updates = await this.serviceUpdateRepository.findByServiceRecordId(recordId);
    }

    // Apply pagination if requested
    if (options.page && options.limit) {
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedUpdates = updates.slice(startIndex, endIndex);

      return {
        updates: paginatedUpdates,
        pagination: {
          page: options.page,
          limit: options.limit,
          total: updates.length,
          totalPages: Math.ceil(updates.length / options.limit),
          hasNext: endIndex < updates.length,
          hasPrev: options.page > 1,
        },
      };
    }

    return { updates };
  }

  /**
   * Update a service update
   */
  async updateServiceUpdate(
    userId: string,
    storeId: string,
    updateId: string,
    updateData: UpdateServiceUpdateInput,
    transaction?: Transaction
  ): Promise<ServiceUpdate> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.UPDATE_SERVICE_RECORDS);

    // Validate input data
    this.validateServiceUpdateData(updateData);

    // Get existing service update
    const existingUpdate = await this.serviceUpdateRepository.findByIdWithDetails(updateId);

    if (!existingUpdate) {
      throw new NotFoundError('Service update not found');
    }

    // Verify the update belongs to a record in this store
    const serviceRecord = await this.serviceRecordRepository.findByIdWithDetails(existingUpdate.serviceRecordId);
    
    if (!serviceRecord || serviceRecord.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Service update does not belong to this store');
    }

    // Only the creator can update their own updates (or store owner)
    const user = await this.userRepository.findById(userId);
    if (existingUpdate.createdById !== userId && user?.role !== UserRole.STORE_OWNER) {
      throw new ForbiddenError('You can only update your own service updates');
    }

    // Update the service update
    const updatedUpdate = await this.serviceUpdateRepository.updateServiceUpdate(
      updateId,
      updateData,
      transaction
    );

    if (!updatedUpdate) {
      throw new NotFoundError('Service update not found');
    }

    return await this.serviceUpdateRepository.findByIdWithDetails(updatedUpdate.id) as ServiceUpdate;
  }

  /**
   * Get service progress statistics
   */
  async getServiceProgressStats(
    userId: string,
    storeId: string,
    staffId?: string
  ): Promise<any> {
    // Verify staff role and store access
    await this.verifyStaffRole(userId);
    await this.verifyStoreAccess(userId, storeId, Permission.VIEW_SERVICE_RECORDS);

    if (staffId) {
      // Get stats for specific staff member
      return await this.serviceRecordRepository.getStaffStats(staffId);
    } else {
      // Get stats for the entire store
      return await this.serviceRecordRepository.getStoreStats(storeId);
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: ServiceRecordStatus, newStatus: ServiceRecordStatus): void {
    const validTransitions: { [key in ServiceRecordStatus]: ServiceRecordStatus[] } = {
      [ServiceRecordStatus.PENDING]: [ServiceRecordStatus.IN_PROGRESS, ServiceRecordStatus.CANCELLED],
      [ServiceRecordStatus.IN_PROGRESS]: [ServiceRecordStatus.COMPLETED, ServiceRecordStatus.ON_HOLD, ServiceRecordStatus.CANCELLED],
      [ServiceRecordStatus.ON_HOLD]: [ServiceRecordStatus.IN_PROGRESS, ServiceRecordStatus.CANCELLED],
      [ServiceRecordStatus.COMPLETED]: [], // No transitions from completed
      [ServiceRecordStatus.CANCELLED]: [], // No transitions from cancelled
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Build where clause for service record filters
   */
  private buildServiceRecordWhereClause(filters: ServiceRecordFilters): any {
    const where: any = {};

    if (filters.serviceRequestId) {
      where.serviceRequestId = filters.serviceRequestId;
    }

    if (filters.assignedStaffId) {
      where.assignedStaffId = filters.assignedStaffId;
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

  // Staff Management Methods

  /**
   * Create a new staff member for a store
   */
  async createStaff(storeId: string, createData: CreateStaffData, transaction?: Transaction): Promise<any> {
    // Validate store exists and is active
    const store = await this.storeRepository.findById(storeId, { transaction });
    if (!store) {
      throw new NotFoundError('Store not found');
    }
    if (!store.isActive) {
      throw new ValidationError('Cannot add staff to inactive store');
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(createData.email, { transaction });
    if (existingUser) {
      throw new ConflictError('Email address is already in use');
    }

    // Validate permissions
    if (!createData.permissions || createData.permissions.length === 0) {
      throw new ValidationError('At least one permission is required');
    }

    const validPermissions = Object.values(Permission);
    const invalidPermissions = createData.permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      throw new ValidationError('Invalid permissions');
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(createData.password);

    // Create user
    const userData = {
      email: createData.email,
      passwordHash,
      role: UserRole.STAFF,
      firstName: createData.firstName,
      lastName: createData.lastName,
      phone: createData.phone,
      isActive: true,
      emailVerified: false,
    };

    const newUser = await this.userRepository.createUser(userData, { transaction });

    // Create staff store permission
    const staffPermission = await StaffStorePermission.create({
      userId: newUser.id,
      storeId,
      permissions: createData.permissions,
      isActive: true,
    }, { transaction });

    return {
      ...newUser,
      storePermissions: staffPermission,
    };
  }

  /**
   * Get all staff members for a store
   */
  async getStoreStaff(storeId: string, transaction?: Transaction): Promise<any[]> {
    const staff = await this.userRepository.findStaffByStore(storeId, {
      transaction,
      include: [
        {
          model: StaffStorePermission,
          as: 'staffPermissions',
          where: { storeId, isActive: true },
          required: true,
        }
      ]
    });

    return staff.map(user => ({
      ...user,
      storePermissions: user.staffPermissions?.[0],
    }));
  }

  /**
   * Get a specific staff member by ID
   */
  async getStaffById(storeId: string, staffId: string, transaction?: Transaction): Promise<any | null> {
    const user = await this.userRepository.findById(staffId, {
      transaction,
      include: [
        {
          model: StaffStorePermission,
          as: 'staffPermissions',
          where: { storeId, isActive: true },
          required: true,
        }
      ]
    });

    if (!user || user.role !== UserRole.STAFF) {
      return null;
    }

    return {
      ...user,
      storePermissions: user.staffPermissions?.[0],
    };
  }

  /**
   * Update staff member information
   */
  async updateStaff(storeId: string, staffId: string, updateData: UpdateStaffData, transaction?: Transaction): Promise<any | null> {
    const staff = await this.getStaffById(storeId, staffId, transaction);
    if (!staff) {
      throw new NotFoundError('Staff member not found or does not belong to this store');
    }

    const updatedUser = await this.userRepository.update(staffId, updateData, { transaction });
    return updatedUser;
  }

  /**
   * Update staff permissions for a store
   */
  async updateStaffPermissions(storeId: string, staffId: string, permissionsData: UpdateStaffPermissionsData, transaction?: Transaction): Promise<any> {
    const staff = await this.getStaffById(storeId, staffId, transaction);
    if (!staff) {
      throw new NotFoundError('Staff member not found or does not belong to this store');
    }

    const staffPermission = await StaffStorePermission.findOne({
      where: {
        userId: staffId,
        storeId,
        isActive: true,
      },
      transaction,
    });

    if (!staffPermission) {
      throw new NotFoundError('Staff store permissions not found');
    }

    staffPermission.permissions = permissionsData.permissions;
    await staffPermission.save({ transaction });

    return staffPermission;
  }

  /**
   * Remove staff member from store
   */
  async removeStaffFromStore(storeId: string, staffId: string, transaction?: Transaction): Promise<boolean> {
    const staff = await this.getStaffById(storeId, staffId, transaction);
    if (!staff) {
      throw new NotFoundError('Staff member not found or does not belong to this store');
    }

    const staffPermission = await StaffStorePermission.findOne({
      where: {
        userId: staffId,
        storeId,
        isActive: true,
      },
      transaction,
    });

    if (staffPermission) {
      staffPermission.isActive = false;
      await staffPermission.save({ transaction });
    }

    // Check if user has other store permissions
    const otherPermissions = await StaffStorePermission.findAll({
      where: {
        userId: staffId,
        isActive: true,
      },
      transaction,
    });

    // If no other permissions, deactivate user
    if (otherPermissions.length === 0) {
      await this.userRepository.deactivateUser(staffId, { transaction });
    }

    return true;
  }

  /**
   * Add existing staff member to store
   */
  async addStaffToStore(storeId: string, staffId: string, permissions: Permission[], transaction?: Transaction): Promise<any> {
    // Validate store exists and is active
    const store = await this.storeRepository.findById(storeId, { transaction });
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    // Validate user exists and is staff
    const user = await this.userRepository.findById(staffId, { transaction });
    if (!user || user.role !== UserRole.STAFF) {
      throw new NotFoundError('User not found or is not a staff member');
    }

    // Check if already assigned to store
    const existingPermission = await StaffStorePermission.findOne({
      where: {
        userId: staffId,
        storeId,
      },
      transaction,
    });

    if (existingPermission) {
      if (existingPermission.isActive) {
        throw new ConflictError('Staff member is already assigned to this store');
      } else {
        // Reactivate existing permission
        existingPermission.isActive = true;
        existingPermission.permissions = permissions;
        await existingPermission.save({ transaction });
        return {
          ...user,
          storePermissions: existingPermission,
        };
      }
    }

    // Create new permission
    const staffPermission = await StaffStorePermission.create({
      userId: staffId,
      storeId,
      permissions,
      isActive: true,
    }, { transaction });

    return {
      ...user,
      storePermissions: staffPermission,
    };
  }

  /**
   * Get stores where a staff member works
   */
  async getStaffStores(staffId: string, transaction?: Transaction): Promise<Store[]> {
    const user = await this.userRepository.findById(staffId, {
      transaction,
      include: [
        {
          model: StaffStorePermission,
          as: 'staffPermissions',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: Store,
              as: 'store',
              where: { isActive: true },
              required: true,
            }
          ]
        }
      ]
    });

    if (!user || user.role !== UserRole.STAFF) {
      return [];
    }

    return user.staffPermissions?.map(permission => permission.store).filter(Boolean) || [];
  }

  /**
   * Get staff permissions for a specific store
   */
  async getStaffPermissions(storeId: string, staffId: string, transaction?: Transaction): Promise<Permission[]> {
    const staffPermission = await StaffStorePermission.findOne({
      where: {
        userId: staffId,
        storeId,
        isActive: true,
      },
      transaction,
    });

    return staffPermission?.permissions || [];
  }

  // Static methods for default permissions
  static getDefaultStaffPermissions(): Permission[] {
    return [Permission.VIEW_SERVICES, Permission.VIEW_SERVICE_REQUESTS];
  }

  static getDefaultSeniorStaffPermissions(): Permission[] {
    return [
      Permission.VIEW_SERVICES,
      Permission.CREATE_QUOTATIONS,
      Permission.VIEW_SERVICE_REQUESTS,
      Permission.UPDATE_SERVICE_RECORDS,
    ];
  }

  static getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }
}