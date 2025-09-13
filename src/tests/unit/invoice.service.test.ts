import { InvoiceService } from '../../services/invoice.service';
import { InvoiceRepository } from '../../repositories/invoice.repository';
import { ServiceRecordRepository } from '../../repositories/service-record.repository';
import { QuotationRepository } from '../../repositories/quotation.repository';
import { UserRepository } from '../../repositories/user.repository';
import { StoreRepository } from '../../repositories/store.repository';
import { UserRole, PaymentStatus, Permission, ServiceRecordStatus } from '../../types/database/database.types';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';

// Mock the repositories
jest.mock('../../repositories/invoice.repository');
jest.mock('../../repositories/service-record.repository');
jest.mock('../../repositories/quotation.repository');
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/store.repository');

describe('InvoiceService', () => {
  let invoiceService: InvoiceService;
  let mockInvoiceRepository: jest.Mocked<InvoiceRepository>;
  let mockServiceRecordRepository: jest.Mocked<ServiceRecordRepository>;
  let mockQuotationRepository: jest.Mocked<QuotationRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockStoreRepository: jest.Mocked<StoreRepository>;

  const mockUser = {
    id: 'user-1',
    email: 'owner@test.com',
    role: UserRole.STORE_OWNER,
    isActive: true,
  };

  const mockStore = {
    id: 'store-1',
    ownerId: 'user-1',
    name: 'Test Store',
    isActive: true,
  };

  const mockServiceRecord = {
    id: 'service-record-1',
    serviceRequestId: 'service-request-1',
    status: ServiceRecordStatus.COMPLETED,
    serviceRequest: {
      id: 'service-request-1',
      storeId: 'store-1',
      customerId: 'customer-1',
      bike: {
        id: 'bike-1',
        make: 'Trek',
        model: 'FX 3',
      },
    },
  };

  const mockInvoice = {
    id: 'invoice-1',
    serviceRecordId: 'service-record-1',
    invoiceNumber: 'INV-20240115-123456',
    createdById: 'user-1',
    lineItems: [
      {
        id: 'item-1',
        description: 'Brake pad replacement',
        quantity: 2,
        unitPrice: 25.00,
        total: 50.00,
      },
    ],
    subtotal: 50.00,
    taxRate: 8.5,
    taxAmount: 4.25,
    total: 54.25,
    paidAmount: 0,
    paymentStatus: PaymentStatus.PENDING,
    dueDate: new Date('2024-02-14'),
    paidDate: null,
    notes: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    serviceRecord: {
      id: 'service-record-1',
      serviceRequest: {
        id: 'service-request-1',
        storeId: 'store-1',
        customerId: 'customer-1',
      },
    },
    isPending: () => true,
    isPaid: () => false,
    isOverdue: () => false,
    isCancelled: () => false,
    getRemainingAmount: () => 54.25,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    invoiceService = new InvoiceService();

    // Get mocked repositories
    mockInvoiceRepository = InvoiceRepository.prototype as jest.Mocked<InvoiceRepository>;
    mockServiceRecordRepository = ServiceRecordRepository.prototype as jest.Mocked<ServiceRecordRepository>;
    mockQuotationRepository = QuotationRepository.prototype as jest.Mocked<QuotationRepository>;
    mockUserRepository = UserRepository.prototype as jest.Mocked<UserRepository>;
    mockStoreRepository = StoreRepository.prototype as jest.Mocked<StoreRepository>;
  });

  describe('createInvoice', () => {
    const createInvoiceData = {
      serviceRecordId: 'service-record-1',
      taxRate: 8.5,
      lineItems: [
        {
          description: 'Brake pad replacement',
          quantity: 2,
          unitPrice: 25.00,
        },
      ],
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockStoreRepository.findById.mockResolvedValue(mockStore as any);
      mockUserRepository.hasStorePermission.mockResolvedValue(true);
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(mockServiceRecord as any);
      mockInvoiceRepository.findByServiceRecordId.mockResolvedValue([]);
      mockInvoiceRepository.createInvoice.mockResolvedValue(mockInvoice as any);
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue(mockInvoice as any);
    });

    it('should create invoice successfully for store owner', async () => {
      const result = await invoiceService.createInvoice('user-1', 'store-1', createInvoiceData);

      expect(result).toEqual(mockInvoice);
      expect(mockInvoiceRepository.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceRecordId: 'service-record-1',
          createdById: 'user-1',
          taxRate: 8.5,
          lineItems: createInvoiceData.lineItems,
        }),
        undefined
      );
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        invoiceService.createInvoice('user-1', 'store-1', createInvoiceData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if user is inactive', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(
        invoiceService.createInvoice('user-1', 'store-1', createInvoiceData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if service record not found', async () => {
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        invoiceService.createInvoice('user-1', 'store-1', createInvoiceData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if service record not completed', async () => {
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue({
        ...mockServiceRecord,
        status: ServiceRecordStatus.IN_PROGRESS,
      } as any);

      await expect(
        invoiceService.createInvoice('user-1', 'store-1', createInvoiceData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw error if service record already has invoice', async () => {
      mockInvoiceRepository.findByServiceRecordId.mockResolvedValue([mockInvoice as any]);

      await expect(
        invoiceService.createInvoice('user-1', 'store-1', createInvoiceData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw error for invalid line items', async () => {
      const invalidData = {
        ...createInvoiceData,
        lineItems: [
          {
            description: '',
            quantity: 0,
            unitPrice: -1,
          },
        ],
      };

      await expect(
        invoiceService.createInvoice('user-1', 'store-1', invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error for invalid tax rate', async () => {
      const invalidData = {
        ...createInvoiceData,
        taxRate: 150, // Invalid tax rate > 100
      };

      await expect(
        invoiceService.createInvoice('user-1', 'store-1', invalidData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('recordPayment', () => {
    const paymentData = {
      amount: 25.00,
      paymentDate: new Date('2024-01-20'),
      notes: 'Cash payment',
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockStoreRepository.findById.mockResolvedValue(mockStore as any);
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue(mockInvoice as any);
      mockInvoiceRepository.recordPayment.mockResolvedValue({
        ...mockInvoice,
        paidAmount: 25.00,
        paymentStatus: PaymentStatus.PARTIAL,
      } as any);
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue({
          ...mockInvoice,
          paidAmount: 25.00,
          paymentStatus: PaymentStatus.PARTIAL,
        } as any);
    });

    it('should record payment successfully', async () => {
      const result = await invoiceService.recordPayment('invoice-1', 'user-1', 'store-1', paymentData);

      expect(result.paidAmount).toBe(25.00);
      expect(result.paymentStatus).toBe(PaymentStatus.PARTIAL);
      expect(mockInvoiceRepository.recordPayment).toHaveBeenCalledWith(
        'invoice-1',
        paymentData,
        undefined
      );
    });

    it('should throw error for invalid payment amount', async () => {
      const invalidPaymentData = {
        ...paymentData,
        amount: 0, // Invalid amount
      };

      await expect(
        invoiceService.recordPayment('invoice-1', 'user-1', 'store-1', invalidPaymentData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error for payment amount exceeding remaining balance', async () => {
      const excessivePaymentData = {
        ...paymentData,
        amount: 100.00, // More than remaining balance
      };

      await expect(
        invoiceService.recordPayment('invoice-1', 'user-1', 'store-1', excessivePaymentData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error for future payment date', async () => {
      // Reset the mock to avoid interference from previous test setup
      mockInvoiceRepository.findByIdWithDetails.mockReset();
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue(mockInvoice as any);
      
      const futurePaymentData = {
        ...paymentData,
        paymentDate: new Date('2025-01-01'), // Future date
      };

      await expect(
        invoiceService.recordPayment('invoice-1', 'user-1', 'store-1', futurePaymentData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error if invoice is cancelled', async () => {
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue({
        ...mockInvoice,
        paymentStatus: PaymentStatus.CANCELLED,
        isCancelled: () => true,
      } as any);

      await expect(
        invoiceService.recordPayment('invoice-1', 'user-1', 'store-1', paymentData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw error if invoice is already paid', async () => {
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue({
        ...mockInvoice,
        paymentStatus: PaymentStatus.PAID,
        isPaid: () => true,
      } as any);

      await expect(
        invoiceService.recordPayment('invoice-1', 'user-1', 'store-1', paymentData)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getInvoiceById', () => {
    beforeEach(() => {
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue(mockInvoice as any);
    });

    it('should return invoice for store owner', async () => {
      const result = await invoiceService.getInvoiceById(
        'invoice-1',
        'user-1',
        UserRole.STORE_OWNER,
        'store-1'
      );

      expect(result).toEqual(mockInvoice);
    });

    it('should return invoice for customer', async () => {
      const customerInvoice = {
        ...mockInvoice,
        serviceRecord: {
          ...mockServiceRecord,
          serviceRequest: {
            ...mockServiceRecord.serviceRequest,
            customerId: 'customer-1',
          },
        },
      };
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue(customerInvoice as any);

      const result = await invoiceService.getInvoiceById(
        'invoice-1',
        'customer-1',
        UserRole.CUSTOMER
      );

      expect(result).toEqual(customerInvoice);
    });

    it('should throw error if invoice not found', async () => {
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        invoiceService.getInvoiceById('invoice-1', 'user-1', UserRole.STORE_OWNER, 'store-1')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if customer tries to access other customer invoice', async () => {
      await expect(
        invoiceService.getInvoiceById('invoice-1', 'other-customer', UserRole.CUSTOMER)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if store owner tries to access other store invoice', async () => {
      await expect(
        invoiceService.getInvoiceById('invoice-1', 'user-1', UserRole.STORE_OWNER, 'other-store')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('cancelInvoice', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockStoreRepository.findById.mockResolvedValue(mockStore as any);
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue(mockInvoice as any);
      mockInvoiceRepository.update.mockResolvedValue({
        ...mockInvoice,
        paymentStatus: PaymentStatus.CANCELLED,
      } as any);
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValueOnce(mockInvoice as any)
        .mockResolvedValue({
          ...mockInvoice,
          paymentStatus: PaymentStatus.CANCELLED,
        } as any);
    });

    it('should cancel invoice successfully', async () => {
      const result = await invoiceService.cancelInvoice('invoice-1', 'user-1', 'store-1');

      expect(result.paymentStatus).toBe(PaymentStatus.CANCELLED);
      expect(mockInvoiceRepository.update).toHaveBeenCalledWith(
        'invoice-1',
        { paymentStatus: PaymentStatus.CANCELLED },
        { transaction: undefined }
      );
    });

    it('should throw error if invoice is already paid', async () => {
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue({
        ...mockInvoice,
        paymentStatus: PaymentStatus.PAID,
        isPaid: () => true,
      } as any);

      await expect(
        invoiceService.cancelInvoice('invoice-1', 'user-1', 'store-1')
      ).rejects.toThrow(ConflictError);
    });

    it('should throw error if invoice is already cancelled', async () => {
      mockInvoiceRepository.findByIdWithDetails.mockResolvedValue({
        ...mockInvoice,
        paymentStatus: PaymentStatus.CANCELLED,
        isCancelled: () => true,
      } as any);

      await expect(
        invoiceService.cancelInvoice('invoice-1', 'user-1', 'store-1')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getStoreInvoices', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockStoreRepository.findById.mockResolvedValue(mockStore as any);
      mockInvoiceRepository.findWithFilters.mockResolvedValue([mockInvoice as any]);
    });

    it('should return store invoices successfully', async () => {
      const result = await invoiceService.getStoreInvoices('user-1', 'store-1');

      expect(result.invoices).toEqual([mockInvoice]);
      expect(mockInvoiceRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 'store-1' })
      );
    });

    it('should return paginated results when pagination options provided', async () => {
      const paginatedResult = {
        data: [mockInvoice],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockInvoiceRepository.findWithPagination.mockResolvedValue(paginatedResult as any);

      const result = await invoiceService.getStoreInvoices(
        'user-1',
        'store-1',
        {},
        { page: 1, limit: 10 }
      );

      expect(result.invoices).toEqual([mockInvoice]);
      expect(result.pagination).toEqual(paginatedResult.pagination);
    });
  });
});