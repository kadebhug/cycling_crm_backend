import { Request, Response, NextFunction } from 'express';
import { InvoiceService, CreateInvoiceInput, UpdateInvoiceInput, RecordPaymentInput, InvoiceSearchOptions } from '../services/invoice.service';
import { InvoiceFilters } from '../repositories/invoice.repository';
import { AuthenticatedRequest } from '../types/auth.types';
import { UserRole, PaymentStatus } from '../types/database/database.types';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  /**
   * Create a new invoice
   */
  createInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId } = req.params;
      const userId = req.user!.id;
      const invoiceData: CreateInvoiceInput = req.body;

      logger.info(`Creating invoice for store ${storeId} by user ${userId}`, {
        serviceRecordId: invoiceData.serviceRecordId,
        quotationId: invoiceData.quotationId,
      });

      const invoice = await this.invoiceService.createInvoice(userId, storeId, invoiceData);

      logger.info(`Invoice created successfully: ${invoice.id}`, {
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
      });

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Invoice created successfully',
      });
    } catch (error) {
      logger.error('Error creating invoice:', error);
      next(error);
    }
  };

  /**
   * Get invoices for a store
   */
  getStoreInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId } = req.params;
      const userId = req.user!.id;

      // Parse query parameters
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        paymentStatus,
        dateFrom,
        dateTo,
        dueDateFrom,
        dueDateTo,
        isOverdue,
        isDueSoon,
        invoiceNumber,
        serviceRecordId,
        quotationId,
        customerId,
      } = req.query;

      // Build filters
      const filters: Partial<InvoiceFilters> = {};
      
      if (paymentStatus) {
        if (Array.isArray(paymentStatus)) {
          filters.paymentStatus = paymentStatus as PaymentStatus[];
        } else {
          filters.paymentStatus = paymentStatus as PaymentStatus;
        }
      }

      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (dueDateFrom) filters.dueDateFrom = new Date(dueDateFrom as string);
      if (dueDateTo) filters.dueDateTo = new Date(dueDateTo as string);
      if (isOverdue === 'true') filters.isOverdue = true;
      if (isDueSoon === 'true') filters.isDueSoon = true;
      if (invoiceNumber) filters.invoiceNumber = invoiceNumber as string;
      if (serviceRecordId) filters.serviceRecordId = serviceRecordId as string;
      if (quotationId) filters.quotationId = quotationId as string;
      if (customerId) filters.customerId = customerId as string;

      // Build search options
      const options: InvoiceSearchOptions = {};
      if (page) options.page = parseInt(page as string);
      if (limit) options.limit = parseInt(limit as string);
      if (sortBy) options.sortBy = sortBy as string;
      if (sortOrder) options.sortOrder = sortOrder as 'ASC' | 'DESC';

      const result = await this.invoiceService.getStoreInvoices(userId, storeId, filters, options);

      res.json({
        success: true,
        data: result.invoices,
        pagination: result.pagination,
        message: 'Invoices retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting store invoices:', error);
      next(error);
    }
  };

  /**
   * Get invoices for a customer
   */
  getCustomerInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = req.user!.id; // Customer can only see their own invoices

      // Parse query parameters
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        paymentStatus,
        dateFrom,
        dateTo,
        dueDateFrom,
        dueDateTo,
        storeId,
      } = req.query;

      // Build filters
      const filters: Partial<InvoiceFilters> = {};
      
      if (paymentStatus) {
        if (Array.isArray(paymentStatus)) {
          filters.paymentStatus = paymentStatus as PaymentStatus[];
        } else {
          filters.paymentStatus = paymentStatus as PaymentStatus;
        }
      }

      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (dueDateFrom) filters.dueDateFrom = new Date(dueDateFrom as string);
      if (dueDateTo) filters.dueDateTo = new Date(dueDateTo as string);
      if (storeId) filters.storeId = storeId as string;

      // Build search options
      const options: InvoiceSearchOptions = {};
      if (page) options.page = parseInt(page as string);
      if (limit) options.limit = parseInt(limit as string);
      if (sortBy) options.sortBy = sortBy as string;
      if (sortOrder) options.sortOrder = sortOrder as 'ASC' | 'DESC';

      const result = await this.invoiceService.getCustomerInvoices(customerId, filters, options);

      res.json({
        success: true,
        data: result.invoices,
        pagination: result.pagination,
        message: 'Invoices retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting customer invoices:', error);
      next(error);
    }
  };

  /**
   * Get a specific invoice by ID
   */
  getInvoiceById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { invoiceId } = req.params;
      const { storeId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const invoice = await this.invoiceService.getInvoiceById(invoiceId, userId, userRole, storeId);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting invoice by ID:', error);
      next(error);
    }
  };

  /**
   * Get invoice by invoice number
   */
  getInvoiceByNumber = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { invoiceNumber } = req.params;
      const { storeId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const invoice = await this.invoiceService.getInvoiceByNumber(invoiceNumber, userId, userRole, storeId);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting invoice by number:', error);
      next(error);
    }
  };

  /**
   * Update an invoice
   */
  updateInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId, invoiceId } = req.params;
      const userId = req.user!.id;
      const updateData: UpdateInvoiceInput = req.body;

      logger.info(`Updating invoice ${invoiceId} for store ${storeId} by user ${userId}`);

      const invoice = await this.invoiceService.updateInvoice(invoiceId, userId, storeId, updateData);

      logger.info(`Invoice updated successfully: ${invoice.id}`, {
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
      });

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice updated successfully',
      });
    } catch (error) {
      logger.error('Error updating invoice:', error);
      next(error);
    }
  };

  /**
   * Record payment for an invoice
   */
  recordPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId, invoiceId } = req.params;
      const userId = req.user!.id;
      const paymentData: RecordPaymentInput = req.body;

      logger.info(`Recording payment for invoice ${invoiceId} by user ${userId}`, {
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
      });

      const invoice = await this.invoiceService.recordPayment(invoiceId, userId, storeId, paymentData);

      logger.info(`Payment recorded successfully for invoice ${invoice.id}`, {
        paidAmount: invoice.paidAmount,
        paymentStatus: invoice.paymentStatus,
      });

      res.json({
        success: true,
        data: invoice,
        message: 'Payment recorded successfully',
      });
    } catch (error) {
      logger.error('Error recording payment:', error);
      next(error);
    }
  };

  /**
   * Cancel an invoice
   */
  cancelInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId, invoiceId } = req.params;
      const userId = req.user!.id;

      logger.info(`Cancelling invoice ${invoiceId} for store ${storeId} by user ${userId}`);

      const invoice = await this.invoiceService.cancelInvoice(invoiceId, userId, storeId);

      logger.info(`Invoice cancelled successfully: ${invoice.id}`, {
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: invoice.paymentStatus,
      });

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling invoice:', error);
      next(error);
    }
  };

  /**
   * Get invoice statistics
   */
  getInvoiceStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const stats = await this.invoiceService.getInvoiceStats(userId, userRole, storeId);

      res.json({
        success: true,
        data: stats,
        message: 'Invoice statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting invoice statistics:', error);
      next(error);
    }
  };

  /**
   * Get overdue invoices
   */
  getOverdueInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId } = req.params;
      const userId = req.user!.id;

      const invoices = await this.invoiceService.getOverdueInvoices(userId, storeId);

      res.json({
        success: true,
        data: invoices,
        message: 'Overdue invoices retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting overdue invoices:', error);
      next(error);
    }
  };

  /**
   * Get invoices due soon
   */
  getDueSoonInvoices = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storeId } = req.params;
      const userId = req.user!.id;
      const { days } = req.query;

      const daysNumber = days ? parseInt(days as string) : 7;

      const invoices = await this.invoiceService.getDueSoonInvoices(userId, storeId, daysNumber);

      res.json({
        success: true,
        data: invoices,
        message: 'Due soon invoices retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting due soon invoices:', error);
      next(error);
    }
  };

  /**
   * Get customer invoice statistics (for customer dashboard)
   */
  getCustomerInvoiceStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customerId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole !== UserRole.CUSTOMER) {
        throw new ForbiddenError('This endpoint is only for customers');
      }

      const stats = await this.invoiceService.getInvoiceStats(customerId, userRole);

      res.json({
        success: true,
        data: stats,
        message: 'Customer invoice statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting customer invoice statistics:', error);
      next(error);
    }
  };
}