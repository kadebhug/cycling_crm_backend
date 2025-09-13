import { ServiceRequestService } from '../../services/service-request.service';
import { ServiceRequestRepository } from '../../repositories/service-request.repository';
import { BikeRepository } from '../../repositories/bike.repository';
import { StoreRepository } from '../../repositories/store.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserRole, RequestStatus, Priority } from '../../types/database/database.types';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';

// Mock the repositories
jest.mock('../../repositories/service-request.repository');
jest.mock('../../repositories/bike.repository');
jest.mock('../../repositories/store.repository');
jest.mock('../../repositories/user.repository');

describe('ServiceRequestService', () => {
  let serviceRequestService: ServiceRequestService;
  let mockServiceRequestRepository: jest.Mocked<ServiceRequestRepository>;
  let mockBikeRepository: jest.Mocked<BikeRepository>;
  let mockStoreRepository: jest.Mocked<StoreRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockCustomer = {
    id: 'customer-id',
    email: 'customer@test.com',
    role: UserRole.CUSTOMER,
    isActive: true,
  };

  const mockBike = {
    id: 'bike-id',
    customerId: 'customer-id',
    brand: 'Trek',
    model: 'Domane',
  };

  const mockStore = {
    id: 'store-id',
    name: 'Test Store',
    isActive: true,
  };

  const mockServiceRequest = {
    id: 'request-id',
    customerId: 'customer-id',
    bikeId: 'bike-id',
    storeId: 'store-id',
    requestedServices: ['Brake adjustment'],
    priority: Priority.MEDIUM,
    status: RequestStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    canBeCancelled: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    serviceRequestService = new ServiceRequestService();

    // Get mocked repositories
    mockServiceRequestRepository = ServiceRequestRepository.prototype as jest.Mocked<ServiceRequestRepository>;
    mockBikeRepository = BikeRepository.prototype as jest.Mocked<BikeRepository>;
    mockStoreRepository = StoreRepository.prototype as jest.Mocked<StoreRepository>;
    mockUserRepository = UserRepository.prototype as jest.Mocked<UserRepository>;
  });

  describe('createServiceRequest', () => {
    const validRequestData = {
      bikeId: 'bike-id',
      storeId: 'store-id',
      requestedServices: ['Brake adjustment', 'Chain lubrication'],
      priority: Priority.HIGH,
      preferredDate: new Date(Date.now() + 86400000), // Tomorrow
      customerNotes: 'Brakes are squeaking',
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as any);
      mockBikeRepository.findById.mockResolvedValue(mockBike as any);
      mockStoreRepository.findById.mockResolvedValue(mockStore as any);
      mockServiceRequestRepository.findWithFilters.mockResolvedValue([]);
      mockServiceRequestRepository.createServiceRequest.mockResolvedValue(mockServiceRequest as any);
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(mockServiceRequest as any);
    });

    it('should create a service request successfully', async () => {
      const result = await serviceRequestService.createServiceRequest('customer-id', validRequestData);

      expect(result).toEqual(mockServiceRequest);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id');
      expect(mockBikeRepository.findById).toHaveBeenCalledWith('bike-id');
      expect(mockStoreRepository.findById).toHaveBeenCalledWith('store-id');
      expect(mockServiceRequestRepository.createServiceRequest).toHaveBeenCalled();
    });

    it('should throw ValidationError for empty requested services', async () => {
      const invalidData = { ...validRequestData, requestedServices: [] };

      await expect(
        serviceRequestService.createServiceRequest('customer-id', invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for past preferred date', async () => {
      const invalidData = { 
        ...validRequestData, 
        preferredDate: new Date(Date.now() - 86400000) // Yesterday
      };

      await expect(
        serviceRequestService.createServiceRequest('customer-id', invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        serviceRequestService.createServiceRequest('invalid-customer', validRequestData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for inactive customer', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...mockCustomer, isActive: false } as any);

      await expect(
        serviceRequestService.createServiceRequest('customer-id', validRequestData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for non-customer user', async () => {
      mockUserRepository.findById.mockResolvedValue({ ...mockCustomer, role: UserRole.STAFF } as any);

      await expect(
        serviceRequestService.createServiceRequest('customer-id', validRequestData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError for non-existent bike', async () => {
      mockBikeRepository.findById.mockResolvedValue(null);

      await expect(
        serviceRequestService.createServiceRequest('customer-id', validRequestData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for bike not owned by customer', async () => {
      mockBikeRepository.findById.mockResolvedValue({ ...mockBike, customerId: 'other-customer' } as any);

      await expect(
        serviceRequestService.createServiceRequest('customer-id', validRequestData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError for non-existent store', async () => {
      mockStoreRepository.findById.mockResolvedValue(null);

      await expect(
        serviceRequestService.createServiceRequest('customer-id', validRequestData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for inactive store', async () => {
      mockStoreRepository.findById.mockResolvedValue({ ...mockStore, isActive: false } as any);

      await expect(
        serviceRequestService.createServiceRequest('customer-id', validRequestData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ConflictError for existing active request', async () => {
      mockServiceRequestRepository.findWithFilters.mockResolvedValue([mockServiceRequest as any]);

      await expect(
        serviceRequestService.createServiceRequest('customer-id', validRequestData)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getCustomerServiceRequests', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as any);
      mockServiceRequestRepository.findWithFilters.mockResolvedValue([mockServiceRequest as any]);
    });

    it('should get customer service requests successfully', async () => {
      const result = await serviceRequestService.getCustomerServiceRequests('customer-id');

      expect(result.requests).toEqual([mockServiceRequest]);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id');
      expect(mockServiceRequestRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'customer-id' })
      );
    });

    it('should apply filters correctly', async () => {
      const filters = { status: RequestStatus.PENDING, priority: Priority.HIGH };
      
      await serviceRequestService.getCustomerServiceRequests('customer-id', filters);

      expect(mockServiceRequestRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ 
          customerId: 'customer-id',
          status: RequestStatus.PENDING,
          priority: Priority.HIGH
        })
      );
    });

    it('should handle pagination', async () => {
      mockServiceRequestRepository.findWithPagination.mockResolvedValue({
        data: [mockServiceRequest as any],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const result = await serviceRequestService.getCustomerServiceRequests(
        'customer-id',
        {},
        { page: 1, limit: 10 }
      );

      expect(result.pagination).toBeDefined();
      expect(mockServiceRequestRepository.findWithPagination).toHaveBeenCalled();
    });
  });

  describe('updateServiceRequest', () => {
    const updateData = {
      requestedServices: ['New service'],
      priority: Priority.HIGH,
      customerNotes: 'Updated notes',
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as any);
      mockServiceRequestRepository.findById.mockResolvedValue(mockServiceRequest as any);
      mockServiceRequestRepository.updateServiceRequest.mockResolvedValue(mockServiceRequest as any);
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(mockServiceRequest as any);
    });

    it('should update service request successfully', async () => {
      const result = await serviceRequestService.updateServiceRequest(
        'request-id',
        'customer-id',
        updateData
      );

      expect(result).toEqual(mockServiceRequest);
      expect(mockServiceRequestRepository.updateServiceRequest).toHaveBeenCalledWith(
        'request-id',
        updateData,
        undefined
      );
    });

    it('should throw NotFoundError for non-existent request', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue(null);

      await expect(
        serviceRequestService.updateServiceRequest('invalid-request', 'customer-id', updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for request not owned by customer', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue({
        ...mockServiceRequest,
        customerId: 'other-customer'
      } as any);

      await expect(
        serviceRequestService.updateServiceRequest('request-id', 'customer-id', updateData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ConflictError for non-pending request', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue({
        ...mockServiceRequest,
        status: RequestStatus.QUOTED
      } as any);

      await expect(
        serviceRequestService.updateServiceRequest('request-id', 'customer-id', updateData)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateServiceRequestStatus', () => {
    beforeEach(() => {
      mockServiceRequestRepository.findById.mockResolvedValue(mockServiceRequest as any);
      mockServiceRequestRepository.updateStatus.mockResolvedValue(mockServiceRequest as any);
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(mockServiceRequest as any);
    });

    it('should update status successfully', async () => {
      const result = await serviceRequestService.updateServiceRequestStatus(
        'request-id',
        RequestStatus.QUOTED,
        'store-id'
      );

      expect(result).toEqual(mockServiceRequest);
      expect(mockServiceRequestRepository.updateStatus).toHaveBeenCalledWith(
        'request-id',
        RequestStatus.QUOTED,
        undefined
      );
    });

    it('should throw NotFoundError for non-existent request', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue(null);

      await expect(
        serviceRequestService.updateServiceRequestStatus('invalid-request', RequestStatus.QUOTED, 'store-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for request not belonging to store', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue({
        ...mockServiceRequest,
        storeId: 'other-store'
      } as any);

      await expect(
        serviceRequestService.updateServiceRequestStatus('request-id', RequestStatus.QUOTED, 'store-id')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError for invalid status transition', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue({
        ...mockServiceRequest,
        status: RequestStatus.COMPLETED
      } as any);

      await expect(
        serviceRequestService.updateServiceRequestStatus('request-id', RequestStatus.PENDING, 'store-id')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('cancelServiceRequest', () => {
    beforeEach(() => {
      mockServiceRequestRepository.findById.mockResolvedValue(mockServiceRequest as any);
      mockServiceRequestRepository.updateStatus.mockResolvedValue({
        ...mockServiceRequest,
        status: RequestStatus.CANCELLED
      } as any);
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue({
        ...mockServiceRequest,
        status: RequestStatus.CANCELLED
      } as any);
    });

    it('should cancel service request as customer', async () => {
      const result = await serviceRequestService.cancelServiceRequest(
        'request-id',
        'customer-id',
        UserRole.CUSTOMER
      );

      expect(result.status).toBe(RequestStatus.CANCELLED);
      expect(mockServiceRequestRepository.updateStatus).toHaveBeenCalledWith(
        'request-id',
        RequestStatus.CANCELLED,
        undefined
      );
    });

    it('should cancel service request as store staff', async () => {
      const result = await serviceRequestService.cancelServiceRequest(
        'request-id',
        'staff-id',
        UserRole.STAFF,
        'store-id'
      );

      expect(result.status).toBe(RequestStatus.CANCELLED);
    });

    it('should throw ForbiddenError for customer not owning request', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue({
        ...mockServiceRequest,
        customerId: 'other-customer'
      } as any);

      await expect(
        serviceRequestService.cancelServiceRequest('request-id', 'customer-id', UserRole.CUSTOMER)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for staff from different store', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue({
        ...mockServiceRequest,
        storeId: 'other-store'
      } as any);

      await expect(
        serviceRequestService.cancelServiceRequest('request-id', 'staff-id', UserRole.STAFF, 'store-id')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getServiceRequestById', () => {
    beforeEach(() => {
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(mockServiceRequest as any);
    });

    it('should get service request for customer', async () => {
      const result = await serviceRequestService.getServiceRequestById(
        'request-id',
        'customer-id',
        UserRole.CUSTOMER
      );

      expect(result).toEqual(mockServiceRequest);
    });

    it('should get service request for store staff', async () => {
      const result = await serviceRequestService.getServiceRequestById(
        'request-id',
        'staff-id',
        UserRole.STAFF,
        'store-id'
      );

      expect(result).toEqual(mockServiceRequest);
    });

    it('should throw NotFoundError for non-existent request', async () => {
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        serviceRequestService.getServiceRequestById('invalid-request', 'customer-id', UserRole.CUSTOMER)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for customer accessing other customer request', async () => {
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue({
        ...mockServiceRequest,
        customerId: 'other-customer'
      } as any);

      await expect(
        serviceRequestService.getServiceRequestById('request-id', 'customer-id', UserRole.CUSTOMER)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for staff accessing other store request', async () => {
      mockServiceRequestRepository.findByIdWithDetails.mockResolvedValue({
        ...mockServiceRequest,
        storeId: 'other-store'
      } as any);

      await expect(
        serviceRequestService.getServiceRequestById('request-id', 'staff-id', UserRole.STAFF, 'store-id')
      ).rejects.toThrow(ForbiddenError);
    });
  });
});