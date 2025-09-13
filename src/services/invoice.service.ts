import { Transaction } from 'sequelize';
import { InvoiceRepository, CreateInvoiceData, UpdateInvoiceData, InvoiceFilters, PaymentData } from '../repositories/invoice.repository';
import { ServiceRecordRepository } from '../repositories/service-record.repository';
import { QuotationRepository } from '../repositories/quotation.repository';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { Invoice } from '../database/models/Invoice';
import { ServiceRecord } from '../database/models/ServiceRecord';
import { Quotation } from '../database/models/Quotation';
import { User } from '../database/models/User';
import { UserRole, PaymentStatus, Permission, InvoiceLineItem, ServiceRecordStatus } from '../types/database/database.types';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError 
} from '../utils/errors';

export interface InvoiceSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateInvoiceInput {
  serviceRecordId: string;
  quotationId?: string;
  lineItems?: Omit<InvoiceLineItem, 'id' | 'total'>[];
  taxRate: number;
  dueDays?: number; // Default 30 days
  notes?: string;
}

export interface UpdateInvoiceInput {
  lineItems?: InvoiceLineItem[];
  taxRate?: number;
  dueDate?: Date;
  notes?: string;
}

export interface RecordPaymentInput {
  amount: number;
  paymentDate?: Date;
  notes?: string;
}

export class InvoiceService {
  private invoiceRepository: InvoiceRepository;
  private serviceRecordRepository: ServiceRecordRepository;
  private quotationRepository: QuotationRepository;
  private userRepository: UserRepository;
  private storeRepository: StoreRepository;

  constructor() {
    this.invoiceRepository = new InvoiceRepository();
    this.serviceRecordRepository = new ServiceRecordRepository();
    this.quotationRepository = new QuotationRepository();
    this.userRepository = new UserRepository();
    this.storeRepository = new StoreRepository();
  }

  /**
   * Verify user has invoice permissions for the store
   */
  private async verifyInvoicePermissions(
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
   * Verify service record exists and can be invoiced
   */
  private async verifyServiceRecordForInvoicing(
    serviceRecordId: string,
    storeId: string
  ): Promise<ServiceRecord> {
    const serviceRecord = await this.serviceRecordRepository.findByIdWithDetails(serviceRecordId);
    
    if (!serviceRecord) {
      throw new NotFoundError('Service record not found');
    }

    if (serviceRecord.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Service record does not belong to this store');
    }

    if (serviceRecord.status !== ServiceRecordStatus.COMPLETED) {
      throw new ConflictError('Service record must be completed before invoicing');
    }

    // Check if there's already an invoice for this service record
    const existingInvoices = await this.invoiceRepository.findByServiceRecordId(serviceRecordId);
    
    if (existingInvoices.length > 0) {
      throw new ConflictError('Service record already has an invoice');
    }

    return serviceRecord;
  }

  /**
   * Validate invoice data
   */
  private validateInvoiceData(data: CreateInvoiceInput | UpdateInvoiceInput): void {
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

    if ('dueDate' in data && data.dueDate) {
      const now = new Date();
      if (data.dueDate <= now) {
        throw new ValidationError('Due date must be in the future');
      }
    }

    if ('notes' in data && data.notes && data.notes.length > 2000) {
      throw new ValidationError('Notes cannot exceed 2000 characters');
    }
  }

  /**
   * Validate payment data
   */
  private validatePaymentData(data: RecordPaymentInput): void {
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new ValidationError('Payment amount must be a positive number');
    }

    if (data.paymentDate && data.paymentDate > new Date()) {
      throw new ValidationError('Payment date cannot be in the future');
    }

    if (data.notes && data.notes.length > 1000) {
      throw new ValidationError('Payment notes cannot exceed 1000 characters');
    }
  }

  /**
   * Calculate due date
   */
  private calculateDueDate(days: number = 30): Date {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate;
  }

  /**
   * Get line items from quotation or service record
   */
  private async getLineItemsFromSources(
    serviceRecordId: string,
    quotationId?: string,
    customLineItems?: Omit<InvoiceLineItem, 'id' | 'total'>[]
  ): Promise<Omit<InvoiceLineItem, 'id' | 'total'>[]> {
    // If custom line items provided, use them
    if (customLineItems && customLineItems.length > 0) {
      return customLineItems;
    }

    // Try to get line items from quotation
    if (quotationId) {
      const quotation = await this.quotationRepository.findById(quotationId);
      if (quotation && quotation.lineItems.length > 0) {
        return quotation.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));
      }
    }

    // Fallback: create default line item from service record
    const serviceRecord = await this.serviceRecordRepository.findByIdWithDetails(serviceRecordId);
    if (!serviceRecord) {
      throw new NotFoundError('Service record not found');
    }

    return [{
      description: `Service for ${serviceRecord.serviceRequest?.bike?.make} ${serviceRecord.serviceRequest?.bike?.model}`,
      quantity: 1,
      unitPrice: 0, // Will need to be set manually
    }];
  }

  /**
   * Create a new invoice
   */
  async createInvoice(
    userId: string,
    storeId: string,
    invoiceData: CreateInvoiceInput,
    transaction?: Transaction
  ): Promise<Invoice> {
    // Verify permissions
    await this.verifyInvoicePermissions(userId, storeId, Permission.CREATE_INVOICES);

    // Validate input data
    this.validateInvoiceData(invoiceData);

    // Verify service record
    const serviceRecord = await this.verifyServiceRecordForInvoicing(
      invoiceData.serviceRecordId,
      storeId
    );

    // Verify quotation if provided
    if (invoiceData.quotationId) {
      const quotation = await this.quotationRepository.findById(invoiceData.quotationId);
      if (!quotation) {
        throw new NotFoundError('Quotation not found');
      }

      if (quotation.serviceRequestId !== serviceRecord.serviceRequestId) {
        throw new ConflictError('Quotation does not belong to the same service request');
      }
    }

    // Get line items from various sources
    const lineItems = await this.getLineItemsFromSources(
      invoiceData.serviceRecordId,
      invoiceData.quotationId,
      invoiceData.lineItems
    );

    if (lineItems.length === 0) {
      throw new ValidationError('At least one line item is required');
    }

    // Calculate due date
    const dueDate = this.calculateDueDate(invoiceData.dueDays);

    // Create invoice data
    const createData: CreateInvoiceData = {
      serviceRecordId: invoiceData.serviceRecordId,
      quotationId: invoiceData.quotationId,
      createdById: userId,
      lineItems,
      taxRate: invoiceData.taxRate,
      dueDate,
      notes: invoiceData.notes,
    };

    // Create the invoice
    const invoice = await this.invoiceRepository.createInvoice(createData, transaction);

    // Return with full details
    return await this.invoiceRepository.findByIdWithDetails(invoice.id) as Invoice;
  }

  /**
   * Get invoices for a store
   */
  async getStoreInvoices(
    userId: string,
    storeId: string,
    filters: Partial<InvoiceFilters> = {},
    options: InvoiceSearchOptions = {}
  ): Promise<{
    invoices: Invoice[];
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
    await this.verifyInvoicePermissions(userId, storeId, Permission.VIEW_INVOICES);

    // Add store filter
    const searchFilters: InvoiceFilters = {
      ...filters,
      storeId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.invoiceRepository.findWithPagination(
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
        invoices: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all invoices without pagination
      const invoices = await this.invoiceRepository.findWithFilters(searchFilters);

      return { invoices };
    }
  }

  /**
   * Get invoices for a customer
   */
  async getCustomerInvoices(
    customerId: string,
    filters: Partial<InvoiceFilters> = {},
    options: InvoiceSearchOptions = {}
  ): Promise<{
    invoices: Invoice[];
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
    const searchFilters: InvoiceFilters = {
      ...filters,
      customerId,
    };

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.invoiceRepository.findWithPagination(
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
        invoices: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all invoices without pagination
      const invoices = await this.invoiceRepository.findWithFilters(searchFilters);

      return { invoices };
    }
  }

  /**
   * Get a specific invoice by ID
   */
  async getInvoiceById(
    invoiceId: string,
    userId: string,
    userRole: UserRole,
    storeId?: string
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findByIdWithDetails(invoiceId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Check access permissions
    if (userRole === UserRole.CUSTOMER) {
      if (invoice.serviceRecord?.serviceRequest?.customerId !== userId) {
        throw new ForbiddenError('Access denied to this invoice');
      }
    } else if (userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) {
      if (!storeId || invoice.serviceRecord?.serviceRequest?.storeId !== storeId) {
        throw new ForbiddenError('Access denied to this invoice');
      }
      
      // Verify permissions for staff
      if (userRole === UserRole.STAFF) {
        await this.verifyInvoicePermissions(userId, storeId, Permission.VIEW_INVOICES);
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return invoice;
  }

  /**
   * Get invoice by invoice number
   */
  async getInvoiceByNumber(
    invoiceNumber: string,
    userId: string,
    userRole: UserRole,
    storeId?: string
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findByInvoiceNumber(invoiceNumber);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Check access permissions (same as getInvoiceById)
    if (userRole === UserRole.CUSTOMER) {
      if (invoice.serviceRecord?.serviceRequest?.customerId !== userId) {
        throw new ForbiddenError('Access denied to this invoice');
      }
    } else if (userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) {
      if (!storeId || invoice.serviceRecord?.serviceRequest?.storeId !== storeId) {
        throw new ForbiddenError('Access denied to this invoice');
      }
      
      // Verify permissions for staff
      if (userRole === UserRole.STAFF) {
        await this.verifyInvoicePermissions(userId, storeId, Permission.VIEW_INVOICES);
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Insufficient permissions');
    }

    return invoice;
  }

  /**
   * Update an invoice
   */
  async updateInvoice(
    invoiceId: string,
    userId: string,
    storeId: string,
    updateData: UpdateInvoiceInput,
    transaction?: Transaction
  ): Promise<Invoice> {
    // Verify permissions
    await this.verifyInvoicePermissions(userId, storeId, Permission.UPDATE_INVOICES);

    // Validate input data
    this.validateInvoiceData(updateData);

    // Get existing invoice
    const existingInvoice = await this.invoiceRepository.findByIdWithDetails(invoiceId);

    if (!existingInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Verify store access
    if (existingInvoice.serviceRecord?.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Invoice does not belong to this store');
    }

    // Check if invoice can be updated (not paid or cancelled)
    if (existingInvoice.isPaid() || existingInvoice.isCancelled()) {
      throw new ConflictError('Cannot update paid or cancelled invoice');
    }

    // Update the invoice
    const updatedInvoice = await this.invoiceRepository.updateInvoice(
      invoiceId,
      updateData,
      transaction
    );

    if (!updatedInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Return with full details
    return await this.invoiceRepository.findByIdWithDetails(updatedInvoice.id) as Invoice;
  }

  /**
   * Record payment for an invoice
   */
  async recordPayment(
    invoiceId: string,
    userId: string,
    storeId: string,
    paymentData: RecordPaymentInput,
    transaction?: Transaction
  ): Promise<Invoice> {
    // Verify permissions
    await this.verifyInvoicePermissions(userId, storeId, Permission.UPDATE_INVOICES);

    // Validate payment data
    this.validatePaymentData(paymentData);

    // Get existing invoice
    const existingInvoice = await this.invoiceRepository.findByIdWithDetails(invoiceId);

    if (!existingInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Verify store access
    if (existingInvoice.serviceRecord?.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Invoice does not belong to this store');
    }

    // Check if invoice can receive payment
    if (existingInvoice.isCancelled()) {
      throw new ConflictError('Cannot record payment for cancelled invoice');
    }

    if (existingInvoice.isPaid()) {
      throw new ConflictError('Invoice is already fully paid');
    }

    // Check if payment amount is valid
    const remainingAmount = existingInvoice.getRemainingAmount();
    if (paymentData.amount > remainingAmount) {
      throw new ValidationError(`Payment amount cannot exceed remaining balance of ${remainingAmount.toFixed(2)}`);
    }

    // Record the payment
    const updatedInvoice = await this.invoiceRepository.recordPayment(
      invoiceId,
      paymentData,
      transaction
    );

    if (!updatedInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Return with full details
    return await this.invoiceRepository.findByIdWithDetails(updatedInvoice.id) as Invoice;
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(
    invoiceId: string,
    userId: string,
    storeId: string,
    transaction?: Transaction
  ): Promise<Invoice> {
    // Verify permissions
    await this.verifyInvoicePermissions(userId, storeId, Permission.UPDATE_INVOICES);

    // Get existing invoice
    const existingInvoice = await this.invoiceRepository.findByIdWithDetails(invoiceId);

    if (!existingInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Verify store access
    if (existingInvoice.serviceRecord?.serviceRequest?.storeId !== storeId) {
      throw new ForbiddenError('Invoice does not belong to this store');
    }

    // Check if invoice can be cancelled
    if (existingInvoice.isPaid()) {
      throw new ConflictError('Cannot cancel paid invoice');
    }

    if (existingInvoice.isCancelled()) {
      throw new ConflictError('Invoice is already cancelled');
    }

    // Cancel the invoice
    const updatedInvoice = await this.invoiceRepository.update(
      invoiceId,
      { paymentStatus: PaymentStatus.CANCELLED },
      { transaction }
    );

    if (!updatedInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Return with full details
    return await this.invoiceRepository.findByIdWithDetails(updatedInvoice.id) as Invoice;
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(
    userId: string,
    userRole: UserRole,
    storeId?: string
  ): Promise<any> {
    if (userRole === UserRole.CUSTOMER) {
      return await this.invoiceRepository.getCustomerStats(userId);
    } else if ((userRole === UserRole.STAFF || userRole === UserRole.STORE_OWNER) && storeId) {
      await this.verifyInvoicePermissions(userId, storeId, Permission.VIEW_INVOICES);
      return await this.invoiceRepository.getStoreStats(storeId);
    } else {
      throw new ForbiddenError('Insufficient permissions or missing store ID');
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(
    userId: string,
    storeId: string
  ): Promise<Invoice[]> {
    // Verify permissions
    await this.verifyInvoicePermissions(userId, storeId, Permission.VIEW_INVOICES);

    const allOverdue = await this.invoiceRepository.findOverdueInvoices();
    
    // Filter by store
    return allOverdue.filter(i => i.serviceRecord?.serviceRequest?.storeId === storeId);
  }

  /**
   * Get invoices due soon
   */
  async getDueSoonInvoices(
    userId: string,
    storeId: string,
    days: number = 7
  ): Promise<Invoice[]> {
    // Verify permissions
    await this.verifyInvoicePermissions(userId, storeId, Permission.VIEW_INVOICES);

    const allDueSoon = await this.invoiceRepository.findDueSoonInvoices(days);
    
    // Filter by store
    return allDueSoon.filter(i => i.serviceRecord?.serviceRequest?.storeId === storeId);
  }

  /**
   * Process overdue invoices (background job)
   */
  async processOverdueInvoices(): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Mark overdue invoices
      processed = await this.invoiceRepository.markOverdueInvoices();
    } catch (error) {
      errors.push(`Failed to process overdue invoices: ${error}`);
    }

    return { processed, errors };
  }

  /**
   * Build where clause for filters
   */
  private buildWhereClause(filters: InvoiceFilters): any {
    const where: any = {};

    if (filters.serviceRecordId) {
      where.serviceRecordId = filters.serviceRecordId;
    }

    if (filters.quotationId) {
      where.quotationId = filters.quotationId;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.paymentStatus) {
      if (Array.isArray(filters.paymentStatus)) {
        where.paymentStatus = { [Symbol.for('in')]: filters.paymentStatus };
      } else {
        where.paymentStatus = filters.paymentStatus;
      }
    }

    return where;
  }
}