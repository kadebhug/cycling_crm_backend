import { Op, Transaction, WhereOptions } from 'sequelize';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { ServiceUpdate } from '../database/models/ServiceUpdate';
import { ServiceRecord } from '../database/models/ServiceRecord';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { User } from '../database/models/User';

export interface ServiceUpdateFilters {
  serviceRecordId?: string;
  createdById?: string;
  updateType?: string | string[];
  isVisibleToCustomer?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateServiceUpdateData {
  serviceRecordId: string;
  createdById: string;
  updateType: string;
  message: string;
  isVisibleToCustomer?: boolean;
}

export interface UpdateServiceUpdateData {
  updateType?: string;
  message?: string;
  isVisibleToCustomer?: boolean;
}

export class ServiceUpdateRepository extends BaseRepository<ServiceUpdate> {
  constructor() {
    super(ServiceUpdate);
  }

  /**
   * Create a new service update
   */
  async createServiceUpdate(
    data: CreateServiceUpdateData,
    transaction?: Transaction
  ): Promise<ServiceUpdate> {
    return await this.create(data, { transaction });
  }

  /**
   * Find service updates by service record ID
   */
  async findByServiceRecordId(
    serviceRecordId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceUpdate[]> {
    return await this.findAll({
      ...options,
      where: { serviceRecordId, ...options.where },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find customer-visible service updates by service record ID
   */
  async findCustomerVisibleByServiceRecordId(
    serviceRecordId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceUpdate[]> {
    return await this.findAll({
      ...options,
      where: { 
        serviceRecordId, 
        isVisibleToCustomer: true,
        ...options.where 
      },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find service updates by created by user ID
   */
  async findByCreatedById(
    createdById: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceUpdate[]> {
    return await this.findAll({
      ...options,
      where: { createdById, ...options.where },
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find service update by ID with full details
   */
  async findByIdWithDetails(
    id: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceUpdate | null> {
    return await this.findById(id, {
      ...options,
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Update service update data
   */
  async updateServiceUpdate(
    id: string,
    data: UpdateServiceUpdateData,
    transaction?: Transaction
  ): Promise<ServiceUpdate | null> {
    return await this.update(id, data, { transaction });
  }

  /**
   * Find service updates with filters
   */
  async findWithFilters(
    filters: ServiceUpdateFilters,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceUpdate[]> {
    const whereClause: WhereOptions = {};

    // Apply filters
    if (filters.serviceRecordId) {
      whereClause.serviceRecordId = filters.serviceRecordId;
    }

    if (filters.createdById) {
      whereClause.createdById = filters.createdById;
    }

    if (filters.updateType) {
      if (Array.isArray(filters.updateType)) {
        whereClause.updateType = { [Op.in]: filters.updateType };
      } else {
        whereClause.updateType = filters.updateType;
      }
    }

    if (filters.isVisibleToCustomer !== undefined) {
      whereClause.isVisibleToCustomer = filters.isVisibleToCustomer;
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

    return await this.findAll({
      ...options,
      where: { ...whereClause, ...options.where },
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get service update statistics for a service record
   */
  async getServiceRecordUpdateStats(serviceRecordId: string): Promise<{
    total: number;
    customerVisible: number;
    internalOnly: number;
    byType: { [key: string]: number };
    recent: ServiceUpdate[];
  }> {
    const updates = await this.findByServiceRecordId(serviceRecordId);

    const stats = {
      total: updates.length,
      customerVisible: 0,
      internalOnly: 0,
      byType: {} as { [key: string]: number },
      recent: updates.slice(0, 5),
    };

    updates.forEach((update) => {
      if (update.isVisibleToCustomer) {
        stats.customerVisible++;
      } else {
        stats.internalOnly++;
      }

      if (!stats.byType[update.updateType]) {
        stats.byType[update.updateType] = 0;
      }
      stats.byType[update.updateType]++;
    });

    return stats;
  }

  /**
   * Get service update statistics for a staff member
   */
  async getStaffUpdateStats(staffId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    total: number;
    customerVisible: number;
    internalOnly: number;
    byType: { [key: string]: number };
    recent: ServiceUpdate[];
  }> {
    const filters: ServiceUpdateFilters = {
      createdById: staffId,
    };

    if (dateFrom) {
      filters.dateFrom = dateFrom;
    }

    if (dateTo) {
      filters.dateTo = dateTo;
    }

    const updates = await this.findWithFilters(filters);

    const stats = {
      total: updates.length,
      customerVisible: 0,
      internalOnly: 0,
      byType: {} as { [key: string]: number },
      recent: updates.slice(0, 10),
    };

    updates.forEach((update) => {
      if (update.isVisibleToCustomer) {
        stats.customerVisible++;
      } else {
        stats.internalOnly++;
      }

      if (!stats.byType[update.updateType]) {
        stats.byType[update.updateType] = 0;
      }
      stats.byType[update.updateType]++;
    });

    return stats;
  }

  /**
   * Check if user can access the service update
   */
  async verifyUserAccess(
    updateId: string,
    userId: string,
    isCustomer: boolean = false
  ): Promise<boolean> {
    const update = await this.findByIdWithDetails(updateId);

    if (!update) {
      return false;
    }

    // If user is a customer, they can only see customer-visible updates
    if (isCustomer) {
      return update.isVisibleToCustomer;
    }

    // Staff can see all updates they created or updates for records they have access to
    return update.createdById === userId;
  }

  /**
   * Find recent service updates for a store
   */
  async findRecentByStore(
    storeId: string,
    limit: number = 10,
    customerVisibleOnly: boolean = false
  ): Promise<ServiceUpdate[]> {
    const whereClause: WhereOptions = {};

    if (customerVisibleOnly) {
      whereClause.isVisibleToCustomer = true;
    }

    return await this.findAll({
      where: whereClause,
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
          include: [
            {
              model: ServiceRequest,
              as: 'serviceRequest',
              where: { storeId },
            },
          ],
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  /**
   * Find service updates by update type
   */
  async findByUpdateType(
    updateType: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceUpdate[]> {
    return await this.findAll({
      ...options,
      where: { updateType, ...options.where },
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Count service updates by criteria
   */
  async countWithFilters(filters: ServiceUpdateFilters): Promise<number> {
    const whereClause: WhereOptions = {};

    if (filters.serviceRecordId) {
      whereClause.serviceRecordId = filters.serviceRecordId;
    }

    if (filters.createdById) {
      whereClause.createdById = filters.createdById;
    }

    if (filters.updateType) {
      if (Array.isArray(filters.updateType)) {
        whereClause.updateType = { [Op.in]: filters.updateType };
      } else {
        whereClause.updateType = filters.updateType;
      }
    }

    if (filters.isVisibleToCustomer !== undefined) {
      whereClause.isVisibleToCustomer = filters.isVisibleToCustomer;
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

    return await this.count(whereClause);
  }
}