import { QuotationService } from '../../services/quotation.service';
import { QuotationRepository } from '../../repositories/quotation.repository';
import { ServiceRequestRepository } from '../../repositories/service-request.repository';
import { UserRepository } from '../../repositories/user.repository';
import { StoreRepository } from '../../repositories/store.repository';
import { UserRole, QuotationStatus, RequestStatus, Permission } from '../../types/database/database.types';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';

// Mock the repositories
jest.mock('../../repositories/quotation.repository');
jest.mock('../../repositories/service-request.repository');
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/store.repository');

describe('QuotationService', () => {
  let quotationService: QuotationService;
  let mockQuotationRepository: jest.Mocked<QuotationRepository>;
  let mockServiceRequestRepository: jest.Mocked<ServiceRequestRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockStoreRepository: jest.Mocked<StoreRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    quotationService = new QuotationService();

    // Get mocked repositories
    mockQuotationRepository = quotationService['quotationRepository'] as jest.Mocked<QuotationRepository>;
    mockServiceRequestRepository = quotationService['serviceRequestRepository'] as jest.Mocked<ServiceRequestRepository>;
    mockUserRepository = quotationService['userRepository'] as jest.Mocked<UserRepository>;
    mockStoreRepository = quotationService['storeRepository'] as jest.Mocked<StoreRepository>;
  });

  describe('createQuotation', () => {
    const mockUserId = 'user-123';
    const mockStoreId = 'store-123';
    const mockServiceRequestId = 'service-request-123';

    const mockQuotationData = {
      serviceRequestId: mockServiceRequestId,
      lineItems: [
        {
          description: 'Brake adjustment',
          quantity: 1,
          unitPrice: 25.00,
        },
        {
          description: 'Chain lubrication',
          quantity: 1,
          unitPrice: 15.00,
        },
      ],
      taxRate: 10,
      validityDays: 30,
      notes: 'Standard maintenance package',
    };

    const mockUser = {
      id: mockUserId,
      role: UserRole.STAFF,
      isActive: true,
    };

    const mockStore = {
      id: mockStoreId,
      ownerId: 'owner-123',
      isActive: true,
    };

    const mockServiceRequest = {
      id: mockServiceRequestId,
      storeId: mockStoreId,
      customerId: 'customer-123',
      status: RequestStatus.PENDING,
      canBeQuoted: () => true,
    };

    const mockCreatedQuotation = {
      id: 'quotation-123',
      serviceRequestId: mockServiceRequestId,
      quotationNumber: 'QUO-20241206-123456',
      createdById: mockUserId,
      lineItems: [
        {
          id: 'item_1',
          description: 'Brake adjustment',
          quantity: 1,
          unitPrice: 25.00,
          total: 25.00,
        },
        {
          id: 'item_2',
          description: 'Chain lubrication',
          quantity: 1,
          unitPrice: 15.00,
          total: 15.00,
        },
      ],
      subtotal: 40.00,
      taxRate: 10,
      taxAmount: 4.00,
      total: 44.00,
      status: QuotationStatus.DRAFT,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: 'Standard maintenance package',
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockUserRepository.hasStorePermission.mockResolvedValue(true);
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(mockServiceRequest as any);
      mockQuotationRepository.findByServiceRequestId.mockResolvedValue([]);
      mockQuotationRepository.createQuotation.mockResolvedValue(mockCreatedQuotation as any);
      mockQuotationRepository.findByIdWithDetails.mockResolvedValue(mockCreatedQuotation as any);
    });

    it('should create a quotation successfully', async () => {
      const result = await quotationService.createQuotation(
        mockUserId,
        mockStoreId,
        mockQuotationData
      );

      expect(result).toEqual(mockCreatedQuotation);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockUserRepository.hasStorePermission).toHaveBeenCalledWith(
        mockUserId,
        mockStoreId,
        Permission.CREATE_QUOTATIONS
      );
      expect(mockServiceRequestRepository.findByIdWithDetails).toHaveBeenCalledWith(mockServiceRequestId);
      expect(mockQuotationRepository.createQuotation).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid line items', async () => {
      const invalidData = {
        ...mockQuotationData,
        lineItems: [],
      };

      await expect(
        quotationService.createQuotation(mockUserId, mockStoreId, invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid tax rate', async () => {
      const invalidData = {
        ...mockQuotationData,
        taxRate: -5,
      };

      await expect(
        quotationService.createQuotation(mockUserId, mockStoreId, invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        quotationService.createQuotation(mockUserId, mockStoreId, mockQuotationData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user lacks permissions', async () => {
      mockUserRepository.hasStorePermission.mockResolvedValue(false);

      await expect(
        quotationService.createQuotation(mockUserId, mockStoreId, mockQuotationData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when service request not found', async () => {
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        quotationService.createQuotation(mockUserId, mockStoreId, mockQuotationData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when service request cannot be quoted', async () => {
      const nonQuotableServiceRequest = {
        ...mockServiceRequest,
        canBeQuoted: () => false,
      };
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(nonQuotableServiceRequest as any);

      await expect(
        quotationService.createQuotation(mockUserId, mockStoreId, mockQuotationData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when active quotation already exists', async () => {
      const existingQuotation = {
        id: 'existing-quotation',
        status: QuotationStatus.DRAFT,
      };
      mockQuotationRepository.findByServiceRequestId.mockResolvedValue([existingQuotation as any]);

      await expect(
        quotationService.createQuotation(mockUserId, mockStoreId, mockQuotationData)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('approveQuotation', () => {
    const mockCustomerId = 'customer-123';
    const mockQuotationId = 'quotation-123';

    const mockQuotation = {
      id: mockQuotationId,
      serviceRequestId: 'service-request-123',
      status: QuotationStatus.SENT,
      serviceRequest: {
        customerId: mockCustomerId,
      },
      canBeApproved: () => true,
    };

    beforeEach(() => {
      mockQuotationRepository.findByIdWithDetails.mockResolvedValue(mockQuotation as any);
      mockQuotationRepository.updateStatus.mockResolvedValue({ ...mockQuotation, status: QuotationStatus.APPROVED } as any);
      mockServiceRequestRepository.updateStatus.mockResolvedValue({} as any);
    });

    it('should approve quotation successfully', async () => {
      const result = await quotationService.approveQuotation(mockQuotationId, mockCustomerId);

      expect(mockQuotationRepository.updateStatus).toHaveBeenCalledWith(
        mockQuotationId,
        QuotationStatus.APPROVED,
        undefined
      );
      expect(mockServiceRequestRepository.updateStatus).toHaveBeenCalledWith(
        mockQuotation.serviceRequestId,
        RequestStatus.APPROVED,
        undefined
      );
    });

    it('should throw NotFoundError when quotation not found', async () => {
      mockQuotationRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        quotationService.approveQuotation(mockQuotationId, mockCustomerId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when customer does not own quotation', async () => {
      const otherCustomerQuotation = {
        ...mockQuotation,
        serviceRequest: {
          customerId: 'other-customer',
        },
      };
      mockQuotationRepository.findByIdWithDetails.mockResolvedValue(otherCustomerQuotation as any);

      await expect(
        quotationService.approveQuotation(mockQuotationId, mockCustomerId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ConflictError when quotation cannot be approved', async () => {
      const nonApprovableQuotation = {
        ...mockQuotation,
        canBeApproved: () => false,
      };
      mockQuotationRepository.findByIdWithDetails.mockResolvedValue(nonApprovableQuotation as any);

      await expect(
        quotationService.approveQuotation(mockQuotationId, mockCustomerId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('processExpiredQuotations', () => {
    it('should process expired quotations successfully', async () => {
      const expiredQuotations = [
        {
          id: 'quotation-1',
          serviceRequestId: 'service-request-1',
          status: QuotationStatus.EXPIRED,
        },
        {
          id: 'quotation-2',
          serviceRequestId: 'service-request-2',
          status: QuotationStatus.EXPIRED,
        },
      ];

      const mockServiceRequest = {
        id: 'service-request-1',
        status: RequestStatus.QUOTED,
      };

      mockQuotationRepository.markExpiredQuotations.mockResolvedValue(2);
      mockQuotationRepository.findWithFilters.mockResolvedValue(expiredQuotations as any);
      mockServiceRequestRepository.findById.mockResolvedValue(mockServiceRequest as any);
      mockServiceRequestRepository.updateStatus.mockResolvedValue({} as any);

      const result = await quotationService.processExpiredQuotations();

      expect(result.processed).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockQuotationRepository.markExpiredQuotations).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockQuotationRepository.markExpiredQuotations.mockRejectedValue(new Error('Database error'));

      const result = await quotationService.processExpiredQuotations();

      expect(result.processed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to process expired quotations');
    });
  });
});