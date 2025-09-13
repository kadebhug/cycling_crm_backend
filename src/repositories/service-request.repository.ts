import { Op, Transaction, WhereOptions } from 'sequelize';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { User } from '../database/models/User';
import { Bike } from '../database/models/Bike';
import { Store } from '../database/models/Store';
import { RequestStatus, Priority } from '../types/database/database.types';

export interface ServiceRequestFilters {
  customerId?: string;
  storeId?: string;
  bikeId?: string;
  status?: RequestStatus | RequestStatus[];
  priority?: Priority | Priority[];
  dateFrom?: Date;
  dateTo?: Date;
  preferredDateFrom?: Date;
  preferredDateTo?: Date;
  isOverdue?: boolean;
}

export interface CreateServiceRequestData {
  customerId: string;
  bikeId: string;
  storeId: string;
  requestedServices: string[];
  priority?: Priority;
  preferredDate?: Date;
  customerNotes?: string;
}

export interface UpdateServiceRequestData {
  requestedServices?: string[];
  priority?: Priority;
  preferredDate?: Date;
  customerNotes?: string;
  status?: RequestStatus;
}

export class ServiceRequestRepository extends BaseRepository<ServiceRequest> {
  constructor() {
    super(ServiceRequest);
  }

  /**
   * Create a new service request
   */
  async createServiceRequest(
    data: CreateServiceRequestData,
    transaction?: Transaction
  ): Promise<ServiceRequest> {
    return await this.create(data, { transaction });
  }

  /**
   * Find service requests by customer ID
   */
  async findByCustomerId(
    customerId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRequest[]> {
    return await this.findAll({
      ...options,
      where: { customerId, ...options.where },
      include: [
        {
          model: Bike,
          as: 'bike',
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Find service requests by store ID
   */
  async findByStoreId(
    storeId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRequest[]> {
    return await this.findAll({
      ...options,
      where: { storeId, ...options.where },
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
        ...(options.include || []),
      ],
    });
  }

  /**
   * Find service requests by bike ID
   */
  async findByBikeId(
    bikeId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRequest[]> {
    return await this.findAll({
      ...options,
      where: { bikeId, ...options.where },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Find service request by ID with full details
   */
  async findByIdWithDetails(
    id: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRequest | null> {
    return await this.findById(id, {
      ...options,
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
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address', 'phone', 'email'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Update service request status
   */
  async updateStatus(
    id: string,
    status: RequestStatus,
    transaction?: Transaction
  ): Promise<ServiceRequest | null> {
    return await this.update(id, { status }, { transaction });
  }

  /**
   * Update service request data
   */
  async updateServiceRequest(
    id: string,
    data: UpdateServiceRequestData,
    transaction?: Transaction
  ): Promise<ServiceRequest | null> {
    return await this.update(id, data, { transaction });
  }

  /**
   * Find service requests with filters
   */
  async findWithFilters(
    filters: ServiceRequestFilters,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRequest[]> {
    const whereClause: WhereOptions = {};

    // Apply filters
    if (filters.customerId) {
      whereClause.customerId = filters.customerId;
    }

    if (filters.storeId) {
      whereClause.storeId = filters.storeId;
    }

    if (filters.bikeId) {
      whereClause.bikeId = filters.bikeId;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        whereClause.status = { [Op.in]: filters.status };
      } else {
        whereClause.status = filters.status;
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        whereClause.priority = { [Op.in]: filters.priority };
      } else {
        whereClause.priority = filters.priority;
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: any = {};
      if (filters.dateFrom) {
        dateFilter[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateFilter[Op.lte] = filters.dateTo;
      }
      whereClause.createdAt = dateFilter;
    }

    if (filters.preferredDateFrom || filters.preferredDateTo) {
      const preferredDateFilter: any = {};
      if (filters.preferredDateFrom) {
        preferredDateFilter[Op.gte] = filters.preferredDateFrom;
      }
      if (filters.preferredDateTo) {
        preferredDateFilter[Op.lte] = filters.preferredDateTo;
      }
      whereClause.preferredDate = preferredDateFilter;
    }

    if (filters.isOverdue) {
      whereClause.preferredDate = {
        [Op.lt]: new Date(),
      };
      whereClause.status = {
        [Op.notIn]: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
      };
    }

    return await this.findAll({
      ...options,
      where: { ...whereClause, ...options.where },
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
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'address'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Get service request statistics for a store
   */
  async getStoreStats(storeId: string): Promise<{
    total: number;
    byStatus: { [key in RequestStatus]: number };
    byPriority: { [key in Priority]: number };
    overdue: number;
  }> {
    const requests = await this.findByStoreId(storeId);

    const stats = {
      total: requests.length,
      byStatus: {
        [RequestStatus.PENDING]: 0,
        [RequestStatus.QUOTED]: 0,
        [RequestStatus.APPROVED]: 0,
        [RequestStatus.IN_PROGRESS]: 0,
        [RequestStatus.COMPLETED]: 0,
        [RequestStatus.CANCELLED]: 0,
        [RequestStatus.EXPIRED]: 0,
      },
      byPriority: {
        [Priority.LOW]: 0,
        [Priority.MEDIUM]: 0,
        [Priority.HIGH]: 0,
        [Priority.URGENT]: 0,
      },
      overdue: 0,
    };

    requests.forEach((request) => {
      stats.byStatus[request.status as RequestStatus]++;
      stats.byPriority[request.priority as Priority]++;
      
      if (request.isOverdue()) {
        stats.overdue++;
      }
    });

    return stats;
  }

  /**
   * Get service request statistics for a customer
   */
  async getCustomerStats(customerId: string): Promise<{
    total: number;
    byStatus: { [key in RequestStatus]: number };
    recent: ServiceRequest[];
  }> {
    const requests = await this.findByCustomerId(customerId);

    const stats = {
      total: requests.length,
      byStatus: {
        [RequestStatus.PENDING]: 0,
        [RequestStatus.QUOTED]: 0,
        [RequestStatus.APPROVED]: 0,
        [RequestStatus.IN_PROGRESS]: 0,
        [RequestStatus.COMPLETED]: 0,
        [RequestStatus.CANCELLED]: 0,
        [RequestStatus.EXPIRED]: 0,
      },
      recent: requests
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };

    requests.forEach((request) => {
      stats.byStatus[request.status as RequestStatus]++;
    });

    return stats;
  }

  /**
   * Check if customer owns the service request
   */
  async verifyCustomerOwnership(
    requestId: string,
    customerId: string
  ): Promise<boolean> {
    const request = await this.findOne({ id: requestId, customerId });
    return request !== null;
  }

  /**
   * Check if store has access to the service request
   */
  async verifyStoreAccess(
    requestId: string,
    storeId: string
  ): Promise<boolean> {
    const request = await this.findOne({ id: requestId, storeId });
    return request !== null;
  }

  /**
   * Find overdue service requests
   */
  async findOverdueRequests(storeId?: string): Promise<ServiceRequest[]> {
    const whereClause: WhereOptions = {
      preferredDate: {
        [Op.lt]: new Date(),
      },
      status: {
        [Op.notIn]: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
      },
    };

    if (storeId) {
      whereClause.storeId = storeId;
    }

    return await this.findAll({
      where: whereClause,
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
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name'],
        },
      ],
      order: [['preferredDate', 'ASC']],
    });
  }

  /**
   * Find high priority requests
   */
  async findHighPriorityRequests(storeId?: string): Promise<ServiceRequest[]> {
    const whereClause: WhereOptions = {
      priority: {
        [Op.in]: [Priority.HIGH, Priority.URGENT],
      },
      status: {
        [Op.notIn]: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
      },
    };

    if (storeId) {
      whereClause.storeId = storeId;
    }

    return await this.findAll({
      where: whereClause,
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
        {
          model: Store,
          as: 'store',
          attributes: ['id', 'name'],
        },
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC'],
      ],
    });
  }
}