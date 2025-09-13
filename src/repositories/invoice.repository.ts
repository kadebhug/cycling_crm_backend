import { Op, Transaction, WhereOptions } from 'sequelize';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { Invoice } from '../database/models/Invoice';
import { ServiceRecord } from '../database/models/ServiceRecord';
import { Quotation } from '../database/models/Quotation';
import { User } from '../database/models/User';
import { ServiceRequest } from '../database/models/ServiceRequest';
import { Store } from '../database/models/Store';
import { Bike } from '../database/models/Bike';
import { PaymentStatus, InvoiceLineItem } from '../types/database/database.types';

export interface InvoiceFilters {
  serviceRecordId?: string;
  quotationId?: string;
  storeId?: string;
  customerId?: string;
  createdById?: string;
  paymentStatus?: PaymentStatus | PaymentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  isOverdue?: boolean;
  isDueSoon?: boolean;
  invoiceNumber?: string;
}

export interface CreateInvoiceData {
  serviceRecordId: string;
  quotationId?: string;
  createdById: string;
  lineItems: Omit<InvoiceLineItem, 'id' | 'total'>[];
  taxRate: number;
  dueDate: Date;
  notes?: string;
}

export interface UpdateInvoiceData {
  lineItems?: InvoiceLineItem[];
  taxRate?: number;
  dueDate?: Date;
  notes?: string;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  paymentStatus?: PaymentStatus;
}

export interface PaymentData {
  amount: number;
  paymentDate?: Date;
  notes?: string;
}

export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor() {
    super(Invoice);
  }

  /**
   * Create a new invoice with calculated totals
   */
  async createInvoice(
    data: CreateInvoiceData,
    transaction?: Transaction
  ): Promise<Invoice> {
    // Generate invoice number
    const invoiceNumber = Invoice.generateInvoiceNumber();

    // Process line items and calculate totals
    const lineItems: InvoiceLineItem[] = data.lineItems.map((item, index) => ({
      ...item,
      id: `item_${Date.now()}_${index}`,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount;

    const invoiceData = {
      ...data,
      invoiceNumber,
      lineItems,
      subtotal,
      taxAmount,
      total,
      paidAmount: 0,
      paymentStatus: PaymentStatus.PENDING,
    };

    return await this.create(invoiceData, { transaction });
  }

  /**
   * Find invoices by service record ID
   */
  async findByServiceRecordId(
    serviceRecordId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Invoice[]> {
    return await this.findAll({
      ...options,
      where: { serviceRecordId, ...options.where },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotationNumber', 'total'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find invoices by store ID (through service record)
   */
  async findByStoreId(
    storeId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Invoice[]> {
    return await this.findAll({
      ...options,
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
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
                {
                  model: Store,
                  as: 'store',
                  attributes: ['id', 'name', 'address'],
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotationNumber', 'total'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find invoices by customer ID (through service record)
   */
  async findByCustomerId(
    customerId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Invoice[]> {
    return await this.findAll({
      ...options,
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
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
          ],
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotationNumber', 'total'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Find invoice by ID with full details
   */
  async findByIdWithDetails(
    id: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Invoice | null> {
    return await this.findById(id, {
      ...options,
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
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
          ],
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotationNumber', 'total', 'lineItems'],
        },
        ...(options.include || []),
      ],
    });
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(
    invoiceNumber: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Invoice | null> {
    return await this.findOne(
      { invoiceNumber },
      {
        ...options,
        include: [
          {
            model: ServiceRecord,
            as: 'serviceRecord',
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
                    model: Store,
                    as: 'store',
                    attributes: ['id', 'name', 'address', 'phone', 'email'],
                  },
                ],
              },
            ],
          },
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
          {
            model: Quotation,
            as: 'quotation',
            attributes: ['id', 'quotationNumber', 'total'],
          },
          ...(options.include || []),
        ],
      }
    );
  }

  /**
   * Update invoice with recalculated totals
   */
  async updateInvoice(
    id: string,
    data: UpdateInvoiceData,
    transaction?: Transaction
  ): Promise<Invoice | null> {
    let updateData = { ...data };

    // Recalculate totals if line items or tax rate changed
    if (data.lineItems || data.taxRate) {
      const existingInvoice = await this.findById(id);
      if (!existingInvoice) {
        return null;
      }

      const lineItems = data.lineItems || existingInvoice.lineItems;
      const taxRate = data.taxRate !== undefined ? data.taxRate : existingInvoice.taxRate;

      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      updateData = {
        ...updateData,
        subtotal,
        taxAmount,
        total,
      };

      // Update payment status if total changed and affects payment completion
      if (existingInvoice.paidAmount > 0) {
        if (existingInvoice.paidAmount >= total) {
          updateData.paymentStatus = PaymentStatus.PAID;
        } else {
          updateData.paymentStatus = PaymentStatus.PARTIAL;
        }
      }
    }

    return await this.update(id, updateData, { transaction });
  }

  /**
   * Record payment for an invoice
   */
  async recordPayment(
    id: string,
    paymentData: PaymentData,
    transaction?: Transaction
  ): Promise<Invoice | null> {
    const invoice = await this.findById(id, { transaction });
    
    if (!invoice) {
      return null;
    }

    // Calculate new paid amount
    const newPaidAmount = Math.min(invoice.total, invoice.paidAmount + paymentData.amount);
    
    // Determine new payment status
    let newPaymentStatus: PaymentStatus;
    let paidDate: Date | null = invoice.paidDate;

    if (newPaidAmount >= invoice.total) {
      newPaymentStatus = PaymentStatus.PAID;
      paidDate = paymentData.paymentDate || new Date();
    } else if (newPaidAmount > 0) {
      newPaymentStatus = PaymentStatus.PARTIAL;
      // Set paid date on first payment if not already set
      if (invoice.paidAmount === 0) {
        paidDate = paymentData.paymentDate || new Date();
      }
    } else {
      newPaymentStatus = PaymentStatus.PENDING;
    }

    const updateData = {
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
      paidDate,
      notes: paymentData.notes || invoice.notes,
    };

    return await this.update(id, updateData, { transaction });
  }

  /**
   * Find invoices with filters
   */
  async findWithFilters(
    filters: InvoiceFilters,
    options: BaseRepositoryOptions = {}
  ): Promise<Invoice[]> {
    const whereClause: WhereOptions = {};
    const serviceRecordWhere: WhereOptions = {};
    const serviceRequestWhere: WhereOptions = {};

    // Apply direct invoice filters
    if (filters.serviceRecordId) {
      whereClause.serviceRecordId = filters.serviceRecordId;
    }

    if (filters.quotationId) {
      whereClause.quotationId = filters.quotationId;
    }

    if (filters.createdById) {
      whereClause.createdById = filters.createdById;
    }

    if (filters.invoiceNumber) {
      whereClause.invoiceNumber = { [Op.iLike]: `%${filters.invoiceNumber}%` };
    }

    if (filters.paymentStatus) {
      if (Array.isArray(filters.paymentStatus)) {
        whereClause.paymentStatus = { [Op.in]: filters.paymentStatus };
      } else {
        whereClause.paymentStatus = filters.paymentStatus;
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

    if (filters.dueDateFrom || filters.dueDateTo) {
      const dueDateFilter: any = {};
      if (filters.dueDateFrom) {
        dueDateFilter[Op.gte] = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        dueDateFilter[Op.lte] = filters.dueDateTo;
      }
      whereClause.dueDate = dueDateFilter;
    }

    if (filters.isOverdue) {
      whereClause.dueDate = {
        [Op.lt]: new Date(),
      };
      whereClause.paymentStatus = {
        [Op.notIn]: [PaymentStatus.PAID, PaymentStatus.CANCELLED],
      };
    }

    if (filters.isDueSoon) {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      whereClause.dueDate = {
        [Op.between]: [new Date(), sevenDaysFromNow],
      };
      whereClause.paymentStatus = {
        [Op.notIn]: [PaymentStatus.PAID, PaymentStatus.CANCELLED],
      };
    }

    // Apply service request filters
    if (filters.storeId) {
      serviceRequestWhere.storeId = filters.storeId;
    }

    if (filters.customerId) {
      serviceRequestWhere.customerId = filters.customerId;
    }

    const includeServiceRecord = Object.keys(serviceRequestWhere).length > 0 || 
                                 filters.storeId || 
                                 filters.customerId;

    return await this.findAll({
      ...options,
      where: { ...whereClause, ...options.where },
      include: [
        ...(includeServiceRecord ? [{
          model: ServiceRecord,
          as: 'serviceRecord',
          include: [
            {
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
            },
          ],
        }] : []),
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotationNumber', 'total'],
        },
        ...(options.include || []),
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get invoice statistics for a store
   */
  async getStoreStats(storeId: string): Promise<{
    total: number;
    byStatus: { [key in PaymentStatus]: number };
    totalValue: number;
    totalPaid: number;
    totalOutstanding: number;
    averageValue: number;
    overdue: number;
    dueSoon: number;
  }> {
    const invoices = await this.findByStoreId(storeId);

    const stats = {
      total: invoices.length,
      byStatus: {
        [PaymentStatus.PENDING]: 0,
        [PaymentStatus.PARTIAL]: 0,
        [PaymentStatus.PAID]: 0,
        [PaymentStatus.OVERDUE]: 0,
        [PaymentStatus.CANCELLED]: 0,
      },
      totalValue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      averageValue: 0,
      overdue: 0,
      dueSoon: 0,
    };

    invoices.forEach((invoice) => {
      stats.byStatus[invoice.paymentStatus as PaymentStatus]++;
      stats.totalValue += Number(invoice.total);
      stats.totalPaid += Number(invoice.paidAmount);
      stats.totalOutstanding += Number(invoice.getRemainingAmount());
      
      if (invoice.isOverdue()) {
        stats.overdue++;
      }
      
      if (invoice.isDueSoon()) {
        stats.dueSoon++;
      }
    });

    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

    return stats;
  }

  /**
   * Get invoice statistics for a customer
   */
  async getCustomerStats(customerId: string): Promise<{
    total: number;
    byStatus: { [key in PaymentStatus]: number };
    totalValue: number;
    totalPaid: number;
    totalOutstanding: number;
    recent: Invoice[];
  }> {
    const invoices = await this.findByCustomerId(customerId);

    const stats = {
      total: invoices.length,
      byStatus: {
        [PaymentStatus.PENDING]: 0,
        [PaymentStatus.PARTIAL]: 0,
        [PaymentStatus.PAID]: 0,
        [PaymentStatus.OVERDUE]: 0,
        [PaymentStatus.CANCELLED]: 0,
      },
      totalValue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      recent: invoices
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    };

    invoices.forEach((invoice) => {
      stats.byStatus[invoice.paymentStatus as PaymentStatus]++;
      stats.totalValue += Number(invoice.total);
      stats.totalPaid += Number(invoice.paidAmount);
      stats.totalOutstanding += Number(invoice.getRemainingAmount());
    });

    return stats;
  }

  /**
   * Find overdue invoices
   */
  async findOverdueInvoices(): Promise<Invoice[]> {
    return await this.findAll({
      where: {
        dueDate: {
          [Op.lt]: new Date(),
        },
        paymentStatus: {
          [Op.notIn]: [PaymentStatus.PAID, PaymentStatus.CANCELLED, PaymentStatus.OVERDUE],
        },
      },
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
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
          ],
        },
      ],
    });
  }

  /**
   * Find invoices due soon
   */
  async findDueSoonInvoices(days: number = 7): Promise<Invoice[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.findAll({
      where: {
        dueDate: {
          [Op.between]: [new Date(), futureDate],
        },
        paymentStatus: {
          [Op.notIn]: [PaymentStatus.PAID, PaymentStatus.CANCELLED],
        },
      },
      include: [
        {
          model: ServiceRecord,
          as: 'serviceRecord',
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
          ],
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['dueDate', 'ASC']],
    });
  }

  /**
   * Check if user has access to invoice
   */
  async verifyUserAccess(
    invoiceId: string,
    userId: string,
    storeId?: string
  ): Promise<boolean> {
    const invoice = await this.findByIdWithDetails(invoiceId);
    
    if (!invoice) {
      return false;
    }

    // Check if user is the customer
    if (invoice.serviceRecord?.serviceRequest?.customerId === userId) {
      return true;
    }

    // Check if user has access to the store
    if (storeId && invoice.serviceRecord?.serviceRequest?.storeId === storeId) {
      return true;
    }

    return false;
  }

  /**
   * Bulk update overdue invoices
   */
  async markOverdueInvoices(transaction?: Transaction): Promise<number> {
    return await this.bulkUpdate(
      { paymentStatus: PaymentStatus.OVERDUE },
      {
        dueDate: {
          [Op.lt]: new Date(),
        },
        paymentStatus: {
          [Op.notIn]: [PaymentStatus.PAID, PaymentStatus.CANCELLED, PaymentStatus.OVERDUE],
        },
      },
      { transaction }
    );
  }
}