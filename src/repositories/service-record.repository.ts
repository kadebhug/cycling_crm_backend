import { Op, Transaction, WhereOptions } from 'sequelize';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { ServiceRecord } from '../database/models/ServiceRecord';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { User } from '../database/models/User';
import { ServiceRecordStatus } from '../types/database/database.types';

export interface ServiceRecordFilters {
  serviceRequestId?: string;
  assignedStaffId?: string;
  status?: ServiceRecordStatus | ServiceRecordStatus[];
  storeId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  completedDateFrom?: Date;
  completedDateTo?: Date;
  isOverdue?: boolean;
}

export interface CreateServiceRecordData {
  serviceRequestId: string;
  assignedStaffId?: string;
  estimatedCompletionDate?: Date;
  notes?: string;
}

export interface UpdateServiceRecordData {
  assignedStaffId?: string;
  status?: ServiceRecordStatus;
  startDate?: Date;
  completedDate?: Date;
  estimatedCompletionDate?: Date;
  workPerformed?: string;
  partsUsed?: string;
  laborHours?: number;
  notes?: string;
}

export class ServiceRecordRepository extends BaseRepository<ServiceRecord> {
  constructor() {
    super(ServiceRecord);
  }

  /**
   * Create a new service record
   */
  async createServiceRecord(
    data: CreateServiceRecordData,
    transaction?: Transaction
  ): Promise<ServiceRecord> {
    return await this.create(data, { transaction });
  }

  /**
   * Find service record by service request ID
   */
  async findByServiceRequestId(
    serviceRequestId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRecord | null> {
    return await this.findOne(
      { serviceRequestId },
      {
        ...options,
        include: [
          {
            model: ServiceRequest,
            as: 'serviceRequest',
            include: [
              {
                model: User,
                as: 'customer',
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
              },
            ],
          },
          {
            model: User,
            as: 'assignedStaff',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
          ...(options.include || []),
        ],
      }
    );
  }

  /**
   * Find service records by assigned staff ID
   */
  async findByAssignedStaffId(
    assignedStaffId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRecord[]> {
    return await this.findAll({
      ...options,
      where: { assignedStaffId, ...options.where },
      include: [
        {
          model: ServiceRequest,
          as: 'serviceRequest',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Find service records by store ID
   */
  async findByStoreId(
    storeId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRecord[]> {
    return await this.findAll({
      ...options,
      include: [
        {
          model: ServiceRequest,
          as: 'serviceRequest',
          where: { storeId },
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Find service record by ID with full details
   */
  async findByIdWithDetails(
    id: string,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRecord | null> {
    return await this.findById(id, {
      ...options,
      include: [
        {
          model: ServiceRequest,
          as: 'serviceRequest',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            },
          ],
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Update service record status
   */
  async updateStatus(
    id: string,
    status: ServiceRecordStatus,
    transaction?: Transaction
  ): Promise<ServiceRecord | null> {
    const updateData: Partial<UpdateServiceRecordData> = { status };

    // Set timestamps based on status
    if (status === ServiceRecordStatus.IN_PROGRESS) {
      updateData.startDate = new Date();
    } else if (status === ServiceRecordStatus.COMPLETED) {
      updateData.completedDate = new Date();
    }

    return await this.update(id, updateData, { transaction });
  }

  /**
   * Update service record data
   */
  async updateServiceRecord(
    id: string,
    data: UpdateServiceRecordData,
    transaction?: Transaction
  ): Promise<ServiceRecord | null> {
    return await this.update(id, data, { transaction });
  }

  /**
   * Find service records with filters
   */
  async findWithFilters(
    filters: ServiceRecordFilters,
    options: BaseRepositoryOptions = {}
  ): Promise<ServiceRecord[]> {
    const whereClause: WhereOptions = {};
    const serviceRequestWhere: WhereOptions = {};

    // Apply direct filters
    if (filters.serviceRequestId) {
      whereClause.serviceRequestId = filters.serviceRequestId;
    }

    if (filters.assignedStaffId) {
      whereClause.assignedStaffId = filters.assignedStaffId;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        whereClause.status = { [Op.in]: filters.status };
      } else {
        whereClause.status = filters.status;
      }
    }

    if (filters.startDateFrom || filters.startDateTo) {
      const dateFilter: any = {};
      if (filters.startDateFrom) {
        dateFilter[Op.gte] = filters.startDateFrom;
      }
      if (filters.startDateTo) {
        dateFilter[Op.lte] = filters.startDateTo;
      }
      whereClause.startDate = dateFilter;
    }

    if (filters.completedDateFrom || filters.completedDateTo) {
      const dateFilter: any = {};
      if (filters.completedDateFrom) {
        dateFilter[Op.gte] = filters.completedDateFrom;
      }
      if (filters.completedDateTo) {
        dateFilter[Op.lte] = filters.completedDateTo;
      }
      whereClause.completedDate = dateFilter;
    }

    if (filters.isOverdue) {
      whereClause.estimatedCompletionDate = {
        [Op.lt]: new Date(),
      };
      whereClause.status = {
        [Op.notIn]: [ServiceRecordStatus.COMPLETED, ServiceRecordStatus.CANCELLED],
      };
    }

    // Apply store filter through service request
    if (filters.storeId) {
      serviceRequestWhere.storeId = filters.storeId;
    }

    return await this.findAll({
      ...options,
      where: { ...whereClause, ...options.where },
      include: [
        {
          model: ServiceRequest,
          as: 'serviceRequest',
          where: Object.keys(serviceRequestWhere).length > 0 ? serviceRequestWhere : undefined,
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
        },
        {
          model: User,
          as: 'assignedStaff',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Get service record statistics for a store
   */
  async getStoreStats(storeId: string): Promise<{
    total: number;
    byStatus: { [key in ServiceRecordStatus]: number };
    overdue: number;
    averageCompletionDays: number | null;
  }> {
    const records = await this.findByStoreId(storeId);

    const stats = {
      total: records.length,
      byStatus: {
        [ServiceRecordStatus.PENDING]: 0,
        [ServiceRecordStatus.IN_PROGRESS]: 0,
        [ServiceRecordStatus.COMPLETED]: 0,
        [ServiceRecordStatus.ON_HOLD]: 0,
        [ServiceRecordStatus.CANCELLED]: 0,
      },
      overdue: 0,
      averageCompletionDays: null as number | null,
    };

    let completedRecords = 0;
    let totalCompletionDays = 0;

    records.forEach((record) => {
      stats.byStatus[record.status as ServiceRecordStatus]++;
      
      if (record.isOverdue()) {
        stats.overdue++;
      }

      if (record.isCompleted() && record.startDate && record.completedDate) {
        const days = record.getDurationInDays();
        if (days !== null) {
          totalCompletionDays += days;
          completedRecords++;
        }
      }
    });

    if (completedRecords > 0) {
      stats.averageCompletionDays = Math.round(totalCompletionDays / completedRecords);
    }

    return stats;
  }

  /**
   * Get service record statistics for a staff member
   */
  async getStaffStats(staffId: string): Promise<{
    total: number;
    byStatus: { [key in ServiceRecordStatus]: number };
    overdue: number;
    averageCompletionDays: number | null;
  }> {
    const records = await this.findByAssignedStaffId(staffId);

    const stats = {
      total: records.length,
      byStatus: {
        [ServiceRecordStatus.PENDING]: 0,
        [ServiceRecordStatus.IN_PROGRESS]: 0,
        [ServiceRecordStatus.COMPLETED]: 0,
        [ServiceRecordStatus.ON_HOLD]: 0,
        [ServiceRecordStatus.CANCELLED]: 0,
      },
      overdue: 0,
      averageCompletionDays: null as number | null,
    };

    let completedRecords = 0;
    let totalCompletionDays = 0;

    records.forEach((record) => {
      stats.byStatus[record.status as ServiceRecordStatus]++;
      
      if (record.isOverdue()) {
        stats.overdue++;
      }

      if (record.isCompleted() && record.startDate && record.completedDate) {
        const days = record.getDurationInDays();
        if (days !== null) {
          totalCompletionDays += days;
          completedRecords++;
        }
      }
    });

    if (completedRecords > 0) {
      stats.averageCompletionDays = Math.round(totalCompletionDays / completedRecords);
    }

    return stats;
  }

  /**
   * Check if staff has access to the service record
   */
  async verifyStaffAccess(
    recordId: string,
    staffId: string,
    storeId: string
  ): Promise<boolean> {
    const record = await this.findOne({
      id: recordId,
    }, {
      include: [
        {
          model: ServiceRequest,
          as: 'serviceRequest',
          where: { storeId },
        },
      ],
    });

    if (!record) {
      return false;
    }

    // Staff can access if they are assigned to the record or if they have store access
    return record.assignedStaffId === staffId || record.serviceRequest?.storeId === storeId;
  }

  /**
   * Find overdue service records
   */
  async findOverdueRecords(storeId?: string): Promise<ServiceRecord[]> {
    const filters: ServiceRecordFilters = {
      isOverdue: true,
    };

    if (storeId) {
      filters.storeId = storeId;
    }

    return await this.findWithFilters(filters, {
      order: [['estimatedCompletionDate', 'ASC']],
    });
  }

  /**
   * Find in-progress service records
   */
  async findInProgressRecords(storeId?: string, staffId?: string): Promise<ServiceRecord[]> {
    const filters: ServiceRecordFilters = {
      status: ServiceRecordStatus.IN_PROGRESS,
    };

    if (storeId) {
      filters.storeId = storeId;
    }

    if (staffId) {
      filters.assignedStaffId = staffId;
    }

    return await this.findWithFilters(filters, {
      order: [['startDate', 'ASC']],
    });
  }

  /**
   * Find pending service records
   */
  async findPendingRecords(storeId?: string): Promise<ServiceRecord[]> {
    const filters: ServiceRecordFilters = {
      status: ServiceRecordStatus.PENDING,
    };

    if (storeId) {
      filters.storeId = storeId;
    }

    return await this.findWithFilters(filters, {
      order: [['createdAt', 'ASC']],
    });
  }
}