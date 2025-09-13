import { Op, Transaction, WhereOptions } from 'sequelize';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { Quotation } from '../database/models/Quotation';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { User } from '../database/models/User';
import { Store } from '../database/models/Store';
import { Bike } from '../database/models/Bike';
import { QuotationStatus, QuotationLineItem } from '../types/database/database.types';

export interface QuotationFilters {
  serviceRequestId?: string;
  storeId?: string;
  customerId?: string;
  createdById?: string;
  status?: QuotationStatus | QuotationStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  validUntilFrom?: Date;
  validUntilTo?: Date;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
}

export interface CreateQuotationData {
  serviceRequestId: string;
  createdById: string;
  lineItems: Omit<QuotationLineItem, 'id' | 'total'>[];
  taxRate: number;
  validUntil: Date;
  notes?: string;
}

export interface UpdateQuotationData {
  lineItems?: QuotationLineItem[];
  taxRate?: number;
  validUntil?: Date;
  status?: QuotationStatus;
  notes?: string;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
}

export class QuotationRepository extends BaseRepository<Quotation> {
  constructor() {
    super(Quotation);
  }

  /**
   * Create a new quotation with calculated totals
   */
  async createQuotation(
    data: CreateQuotationData,
    transaction?: Transaction
  ): Promise<Quotation> {
    // Generate quotation number
    const quotationNumber = Quotation.generateQuotationNumber();

    // Process line items and calculate totals
    const lineItems: QuotationLineItem[] = data.lineItems.map((item, index) => ({
      ...item,
      id: `item_${Date.now()}_${index}`,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount;

    const quotationData = {
      ...data,
      quotationNumber,
      lineItems,
      subtotal,
      taxAmount,
      total,
    };

    return await this.create(quotationData, { transaction });
  }

  /**
   * Find quotations by service request ID
   */
  async findByServiceRequestId(
    serviceRequestId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Quotation[]> {
    return await this.findAll({
      ...options,
      where: { serviceRequestId, ...options.where },
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
   * Find quotations by store ID (through service request)
   */
  async findByStoreId(
    storeId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Quotation[]> {
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
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            },
            {
              model: Bike,
              as: 'bike',
            },
          ],
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
   * Find quotations by customer ID (through service request)
   */
  async findByCustomerId(
    customerId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Quotation[]> {
    return await this.findAll({
      ...options,
      include: [
        {
          model: ServiceRequest,
          as: 'serviceRequest',
          where: { customerId },
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
   * Find quotation by ID with full details
   */
  async findByIdWithDetails(
    id: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Quotation | null> {
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
            {
              model: Bike,
              as: 'bike',
            },
            {
              model: Store,
              as: 'store',
              attributes: ['id', 'name', 'address', 'phone', 'email'],
            },
          ],
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
   * Update quotation status
   */
  async updateStatus(
    id: string,
    status: QuotationStatus,
    transaction?: Transaction
  ): Promise<Quotation | null> {
    return await this.update(id, { status }, { transaction });
  }

  /**
   * Update quotation data with recalculated totals
   */
  async updateQuotation(
    id: string,
    data: UpdateQuotationData,
    transaction?: Transaction
  ): Promise<Quotation | null> {
    let updateData = { ...data };

    // Recalculate totals if line items or tax rate changed
    if (data.lineItems || data.taxRate) {
      const existingQuotation = await this.findById(id);
      if (!existingQuotation) {
        return null;
      }

      const lineItems = data.lineItems || existingQuotation.lineItems;
      const taxRate = data.taxRate !== undefined ? data.taxRate : existingQuotation.taxRate;

      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      updateData = {
        ...updateData,
        subtotal,
        taxAmount,
        total,
      };
    }

    return await this.update(id, updateData, { transaction });
  }

  /**
   * Find quotations with filters
   */
  async findWithFilters(
    filters: QuotationFilters,
    options: BaseRepositoryOptions = {}
  ): Promise<Quotation[]> {
    const whereClause: WhereOptions = {};
    const serviceRequestWhere: WhereOptions = {};

    // Apply direct quotation filters
    if (filters.serviceRequestId) {
      whereClause.serviceRequestId = filters.serviceRequestId;
    }

    if (filters.createdById) {
      whereClause.createdById = filters.createdById;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        whereClause.status = { [Op.in]: filters.status };
      } else {
        whereClause.status = filters.status;
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

    if (filters.validUntilFrom || filters.validUntilTo) {
      const validUntilFilter: any = {};
      if (filters.validUntilFrom) {
        validUntilFilter[Op.gte] = filters.validUntilFrom;
      }
      if (filters.validUntilTo) {
        validUntilFilter[Op.lte] = filters.validUntilTo;
      }
      whereClause.validUntil = validUntilFilter;
    }

    if (filters.isExpired) {
      whereClause.validUntil = {
        [Op.lt]: new Date(),
      };
    }

    if (filters.isExpiringSoon) {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      whereClause.validUntil = {
        [Op.between]: [new Date(), threeDaysFromNow],
      };
      whereClause.status = {
        [Op.notIn]: [QuotationStatus.EXPIRED, QuotationStatus.APPROVED, QuotationStatus.REJECTED],
      };
    }

    // Apply service request filters
    if (filters.storeId) {
      serviceRequestWhere.storeId = filters.storeId;
    }

    if (filters.customerId) {
      serviceRequestWhere.customerId = filters.customerId;
    }

    const includeServiceRequest = Object.keys(serviceRequestWhere).length > 0 || 
                                  filters.storeId || 
                                  filters.customerId;

    return await this.findAll({
      ...options,
      where: { ...whereClause, ...options.where },
      include: [
        ...(includeServiceRequest ? [{
          model: ServiceRequest,
          as: 'serviceRequest',
          where: serviceRequestWhere,
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
          ],
        }] : []),
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
   * Get quotation statistics for a store
   */
  async getStoreStats(storeId: string): Promise<{
    total: number;
    byStatus: { [key in QuotationStatus]: number };
    totalValue: number;
    averageValue: number;
    expiringSoon: number;
  }> {
    const quotations = await this.findByStoreId(storeId);

    const stats = {
      total: quotations.length,
      byStatus: {
        [QuotationStatus.DRAFT]: 0,
        [QuotationStatus.SENT]: 0,
        [QuotationStatus.APPROVED]: 0,
        [QuotationStatus.REJECTED]: 0,
        [QuotationStatus.EXPIRED]: 0,
      },
      totalValue: 0,
      averageValue: 0,
      expiringSoon: 0,
    };

    quotations.forEach((quotation) => {
      stats.byStatus[quotation.status as QuotationStatus]++;
      stats.totalValue += Number(quotation.total);
      
      if (quotation.isExpiringSoon()) {
        stats.expiringSoon++;
      }
    });

    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

    return stats;
  }

  /**
   * Get quotation statistics for a customer
   */
  async getCustomerStats(customerId: string): Promise<{
    total: number;
    byStatus: { [key in QuotationStatus]: number };
    totalValue: number;
    recent: Quotation[];
  }> {
    const quotations = await this.findByCustomerId(customerId);

    const stats = {
      total: quotations.length,
      byStatus: {
        [QuotationStatus.DRAFT]: 0,
        [QuotationStatus.SENT]: 0,
        [QuotationStatus.APPROVED]: 0,
        [QuotationStatus.REJECTED]: 0,
        [QuotationStatus.EXPIRED]: 0,
      },
      totalValue: 0,
      recent: quotations
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };

    quotations.forEach((quotation) => {
      stats.byStatus[quotation.status as QuotationStatus]++;
      stats.totalValue += Number(quotation.total);
    });

    return stats;
  }

  /**
   * Find expired quotations that need status update
   */
  async findExpiredQuotations(): Promise<Quotation[]> {
    return await this.findAll({
      where: {
        validUntil: {
          [Op.lt]: new Date(),
        },
        status: {
          [Op.notIn]: [QuotationStatus.EXPIRED, QuotationStatus.APPROVED, QuotationStatus.REJECTED],
        },
      },
      include: [
        {
          model: ServiceRequest,
          as: 'serviceRequest',
          include: [
            {
              model: Store,
              as: 'store',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    });
  }

  /**
   * Find quotations expiring soon
   */
  async findExpiringSoonQuotations(days: number = 3): Promise<Quotation[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.findAll({
      where: {
        validUntil: {
          [Op.between]: [new Date(), futureDate],
        },
        status: QuotationStatus.SENT,
      },
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
            {
              model: Store,
              as: 'store',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['validUntil', 'ASC']],
    });
  }

  /**
   * Check if user has access to quotation
   */
  async verifyUserAccess(
    quotationId: string,
    userId: string,
    storeId?: string
  ): Promise<boolean> {
    const quotation = await this.findByIdWithDetails(quotationId);
    
    if (!quotation) {
      return false;
    }

    // Check if user is the customer
    if (quotation.serviceRequest?.customerId === userId) {
      return true;
    }

    // Check if user has access to the store
    if (storeId && quotation.serviceRequest?.storeId === storeId) {
      return true;
    }

    return false;
  }

  /**
   * Bulk update expired quotations
   */
  async markExpiredQuotations(transaction?: Transaction): Promise<number> {
    return await this.bulkUpdate(
      { status: QuotationStatus.EXPIRED },
      {
        validUntil: {
          [Op.lt]: new Date(),
        },
        status: {
          [Op.notIn]: [QuotationStatus.EXPIRED, QuotationStatus.APPROVED, QuotationStatus.REJECTED],
        },
      },
      { transaction }
    );
  }
}