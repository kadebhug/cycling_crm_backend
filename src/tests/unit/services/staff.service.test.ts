import { StaffService } from '../../../services/staff.service';
import { ServiceRecordRepository } from '../../../repositories/service-record.repository';
import { ServiceUpdateRepository } from '../../../repositories/service-update.repository';
import { ServiceRequestRepository } from '../../../repositories/service-request.repository';
import { UserRepository } from '../../../repositories/user.repository';
import { UserRole, ServiceRecordStatus, RequestStatus } from '../../../types/database/database.types';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../../utils/errors';

// Mock the repositories
jest.mock('../../../repositories/service-record.repository');
jest.mock('../../../repositories/service-update.repository');
jest.mock('../../../repositories/service-request.repository');
jest.mock('../../../repositories/user.repository');

describe('StaffService', () => {
  let staffService: StaffService;
  let mockServiceRecordRepository: jest.Mocked<ServiceRecordRepository>;
  let mockServiceUpdateRepository: jest.Mocked<ServiceUpdateRepository>;
  let mockServiceRequestRepository: jest.Mocked<ServiceRequestRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockStaffUser = {
    id: 'test-staff-id',
    email: 'staff@test.com',
    role: UserRole.STAFF,
    isActive: true,
  };

  const mockStoreOwnerUser = {
    id: 'test-owner-id',
    email: 'owner@test.com',
    role: UserRole.STORE_OWNER,
    isActive: true,
  };

  const mockServiceRequest = {
    id: 'test-request-id',
    customerId: 'test-customer-id',
    storeId: 'test-store-id',
    status: RequestStatus.APPROVED,
  };

  const mockServiceRecord = {
    id: 'test-record-id',
    serviceRequestId: 'test-request-id',
    assignedStaffId: 'test-staff-id',
    status: ServiceRecordStatus.PENDING,
    serviceRequest: mockServiceRequest,
  };

  beforeEach(() => {
    // Create mocked instances
    mockServiceRecordRepository = new ServiceRecordRepository() as jest.Mocked<ServiceRecordRepository>;
    mockServiceUpdateRepository = new ServiceUpdateRepository() as jest.Mocked<ServiceUpdateRepository>;
    mockServiceRequestRepository = new ServiceRequestRepository() as jest.Mocked<ServiceRequestRepository>;
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;

    // Create service instance
    staffService = new StaffService();

    // Replace the repositories with mocked versions
    (staffService as any).serviceRecordRepository = mockServiceRecordRepository;
    (staffService as any).serviceUpdateRepository = mockServiceUpdateRepository;
    (staffService as any).serviceRequestRepository = mockServiceRequestRepository;
    (staffService as any).userRepository = mockUserRepository;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createServiceRecord', () => {
    const createData = {
      serviceRequestId: 'test-request-id',
      assignedStaffId: 'test-staff-id',
      estimatedCompletionDate: new Date('2025-12-31'),
      notes: 'Test notes',
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockStaffUser as any);
      mockServiceRequestRepository.findById.mockResolvedValue(mockServiceRequest as any);
      mockServiceRecordRepository.findByServiceRequestId.mockResolvedValue(null);
      mockServiceRecordRepository.createServiceRecord.mockResolvedValue(mockServiceRecord as any);
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(mockServiceRecord as any);
      mockServiceRequestRepository.updateStatus.mockResolvedValue(mockServiceRequest as any);
      mockServiceUpdateRepository.createServiceUpdate.mockResolvedValue({} as any);
    });

    it('should create a service record successfully', async () => {
      const result = await staffService.createServiceRecord(
        'test-staff-id',
        'test-store-id',
        createData
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-staff-id');
      expect(mockServiceRequestRepository.findById).toHaveBeenCalledWith('test-request-id');
      expect(mockServiceRecordRepository.findByServiceRequestId).toHaveBeenCalledWith('test-request-id');
      expect(mockServiceRecordRepository.createServiceRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceRequestId: 'test-request-id',
          assignedStaffId: 'test-staff-id',
        }),
        undefined
      );
      expect(mockServiceRequestRepository.updateStatus).toHaveBeenCalledWith(
        'test-request-id',
        RequestStatus.IN_PROGRESS,
        undefined
      );
      expect(mockServiceUpdateRepository.createServiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceRecordId: 'test-record-id',
          createdById: 'test-staff-id',
          updateType: 'status_change',
          isVisibleToCustomer: true,
        }),
        undefined
      );
      expect(result).toEqual(mockServiceRecord);
    });

    it('should throw error if user is not staff or store owner', async () => {
      const customerUser = { ...mockStaffUser, role: UserRole.CUSTOMER };
      mockUserRepository.findById.mockResolvedValue(customerUser as any);

      await expect(
        staffService.createServiceRecord('test-customer-id', 'test-store-id', createData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if user is not active', async () => {
      const inactiveUser = { ...mockStaffUser, isActive: false };
      mockUserRepository.findById.mockResolvedValue(inactiveUser as any);

      await expect(
        staffService.createServiceRecord('test-staff-id', 'test-store-id', createData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if service request not found', async () => {
      mockServiceRequestRepository.findById.mockResolvedValue(null);

      await expect(
        staffService.createServiceRecord('test-staff-id', 'test-store-id', createData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if service request does not belong to store', async () => {
      const wrongStoreRequest = { ...mockServiceRequest, storeId: 'wrong-store-id' };
      mockServiceRequestRepository.findById.mockResolvedValue(wrongStoreRequest as any);

      await expect(
        staffService.createServiceRecord('test-staff-id', 'test-store-id', createData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if service request is not approved', async () => {
      const pendingRequest = { ...mockServiceRequest, status: RequestStatus.PENDING };
      mockServiceRequestRepository.findById.mockResolvedValue(pendingRequest as any);

      await expect(
        staffService.createServiceRecord('test-staff-id', 'test-store-id', createData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw error if service record already exists', async () => {
      mockServiceRecordRepository.findByServiceRequestId.mockResolvedValue(mockServiceRecord as any);

      await expect(
        staffService.createServiceRecord('test-staff-id', 'test-store-id', createData)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate estimated completion date', async () => {
      const pastDate = new Date('2020-01-01');
      const invalidData = { ...createData, estimatedCompletionDate: pastDate };

      await expect(
        staffService.createServiceRecord('test-staff-id', 'test-store-id', invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate assigned staff if provided', async () => {
      const invalidStaffData = { ...createData, assignedStaffId: 'invalid-staff-id' };
      mockUserRepository.findById
        .mockResolvedValueOnce(mockStaffUser as any) // For the requesting user
        .mockResolvedValueOnce(null); // For the assigned staff

      await expect(
        staffService.createServiceRecord('test-staff-id', 'test-store-id', invalidStaffData)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateServiceRecord', () => {
    const updateData = {
      status: ServiceRecordStatus.IN_PROGRESS,
      workPerformed: 'Cleaned and lubricated chain',
      laborHours: 2.5,
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockStaffUser as any);
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(mockServiceRecord as any);
      mockServiceRecordRepository.updateServiceRecord.mockResolvedValue(mockServiceRecord as any);
      mockServiceUpdateRepository.createServiceUpdate.mockResolvedValue({} as any);
    });

    it('should update service record successfully', async () => {
      const result = await staffService.updateServiceRecord(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        updateData
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-staff-id');
      expect(mockServiceRecordRepository.findByIdWithDetails).toHaveBeenCalledWith('test-record-id');
      expect(mockServiceRecordRepository.updateServiceRecord).toHaveBeenCalledWith(
        'test-record-id',
        updateData,
        undefined
      );
      expect(result).toEqual(mockServiceRecord);
    });

    it('should create service update for status changes', async () => {
      const inProgressRecord = { ...mockServiceRecord, status: ServiceRecordStatus.IN_PROGRESS };
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(inProgressRecord as any);
      
      const statusUpdateData = { status: ServiceRecordStatus.COMPLETED };

      await staffService.updateServiceRecord(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        statusUpdateData
      );

      expect(mockServiceUpdateRepository.createServiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceRecordId: 'test-record-id',
          createdById: 'test-staff-id',
          updateType: 'status_change',
          message: 'Work on your bike has been completed',
          isVisibleToCustomer: true,
        }),
        undefined
      );
    });

    it('should throw error if service record not found', async () => {
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        staffService.updateServiceRecord('test-staff-id', 'test-store-id', 'non-existent-id', updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if service record does not belong to store', async () => {
      const wrongStoreRecord = {
        ...mockServiceRecord,
        serviceRequest: { ...mockServiceRequest, storeId: 'wrong-store-id' },
      };
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(wrongStoreRecord as any);

      await expect(
        staffService.updateServiceRecord('test-staff-id', 'test-store-id', 'test-record-id', updateData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should validate status transitions', async () => {
      const completedRecord = { ...mockServiceRecord, status: ServiceRecordStatus.COMPLETED };
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(completedRecord as any);

      const invalidTransition = { status: ServiceRecordStatus.PENDING };

      await expect(
        staffService.updateServiceRecord('test-staff-id', 'test-store-id', 'test-record-id', invalidTransition)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate labor hours', async () => {
      const invalidData = { laborHours: -1 };

      await expect(
        staffService.updateServiceRecord('test-staff-id', 'test-store-id', 'test-record-id', invalidData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('addServiceUpdate', () => {
    const updateData = {
      updateType: 'progress_update',
      message: 'Started working on the bike',
      isVisibleToCustomer: true,
    };

    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockStaffUser as any);
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(mockServiceRecord as any);
      mockServiceUpdateRepository.createServiceUpdate.mockResolvedValue({} as any);
      mockServiceUpdateRepository.findByIdWithDetails.mockResolvedValue({} as any);
    });

    it('should add service update successfully', async () => {
      const result = await staffService.addServiceUpdate(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        updateData
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-staff-id');
      expect(mockServiceRecordRepository.findByIdWithDetails).toHaveBeenCalledWith('test-record-id');
      expect(mockServiceUpdateRepository.createServiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceRecordId: 'test-record-id',
          createdById: 'test-staff-id',
          updateType: 'progress_update',
          message: 'Started working on the bike',
          isVisibleToCustomer: true,
        }),
        undefined
      );
      expect(result).toBeDefined();
    });

    it('should throw error if service record not found', async () => {
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        staffService.addServiceUpdate('test-staff-id', 'test-store-id', 'non-existent-id', updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if service record does not belong to store', async () => {
      const wrongStoreRecord = {
        ...mockServiceRecord,
        serviceRequest: { ...mockServiceRequest, storeId: 'wrong-store-id' },
      };
      mockServiceRecordRepository.findByIdWithDetails.mockResolvedValue(wrongStoreRecord as any);

      await expect(
        staffService.addServiceUpdate('test-staff-id', 'test-store-id', 'test-record-id', updateData)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should validate update message length', async () => {
      const invalidData = { ...updateData, message: '' };

      await expect(
        staffService.addServiceUpdate('test-staff-id', 'test-store-id', 'test-record-id', invalidData)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate update type', async () => {
      const invalidData = { ...updateData, updateType: 'invalid_type' };

      // Mock ServiceUpdate.getUpdateTypes to return valid types
      const mockServiceUpdate = require('../../../database/models/ServiceUpdate').ServiceUpdate;
      mockServiceUpdate.getUpdateTypes = jest.fn().mockReturnValue(['progress_update', 'status_change']);

      await expect(
        staffService.addServiceUpdate('test-staff-id', 'test-store-id', 'test-record-id', invalidData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getStoreServiceRecords', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockStaffUser as any);
      mockServiceRecordRepository.findWithFilters.mockResolvedValue([mockServiceRecord] as any);
    });

    it('should get store service records successfully', async () => {
      const filters = { status: ServiceRecordStatus.IN_PROGRESS };
      const options = { page: 1, limit: 10 };

      // Mock the pagination result
      mockServiceRecordRepository.findWithPagination.mockResolvedValue({
        data: [mockServiceRecord],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      } as any);

      const result = await staffService.getStoreServiceRecords(
        'test-staff-id',
        'test-store-id',
        filters,
        options
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith('test-staff-id');
      expect(mockServiceRecordRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        }),
        expect.objectContaining({
          where: expect.objectContaining({
            status: ServiceRecordStatus.IN_PROGRESS,
          }),
        })
      );
      expect(result.records).toEqual([mockServiceRecord]);
      expect(result.pagination).toBeDefined();
    });

    it('should return records without pagination when page/limit not provided', async () => {
      const result = await staffService.getStoreServiceRecords(
        'test-staff-id',
        'test-store-id'
      );

      expect(mockServiceRecordRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'test-store-id',
        })
      );
      expect(result.records).toEqual([mockServiceRecord]);
      expect(result.pagination).toBeUndefined();
    });
  });

  describe('getServiceProgressStats', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockStaffUser as any);
      mockServiceRecordRepository.getStoreStats.mockResolvedValue({
        total: 10,
        byStatus: {
          [ServiceRecordStatus.PENDING]: 2,
          [ServiceRecordStatus.IN_PROGRESS]: 3,
          [ServiceRecordStatus.COMPLETED]: 4,
          [ServiceRecordStatus.ON_HOLD]: 1,
          [ServiceRecordStatus.CANCELLED]: 0,
        },
        overdue: 1,
        averageCompletionDays: 5,
      });
      mockServiceRecordRepository.getStaffStats.mockResolvedValue({
        total: 5,
        byStatus: {
          [ServiceRecordStatus.PENDING]: 1,
          [ServiceRecordStatus.IN_PROGRESS]: 2,
          [ServiceRecordStatus.COMPLETED]: 2,
          [ServiceRecordStatus.ON_HOLD]: 0,
          [ServiceRecordStatus.CANCELLED]: 0,
        },
        overdue: 0,
        averageCompletionDays: 3,
      });
    });

    it('should get store statistics when no staff ID provided', async () => {
      const result = await staffService.getServiceProgressStats(
        'test-staff-id',
        'test-store-id'
      );

      expect(mockServiceRecordRepository.getStoreStats).toHaveBeenCalledWith('test-store-id');
      expect(result.total).toBe(10);
      expect(result.overdue).toBe(1);
    });

    it('should get staff statistics when staff ID provided', async () => {
      const result = await staffService.getServiceProgressStats(
        'test-staff-id',
        'test-store-id',
        'specific-staff-id'
      );

      expect(mockServiceRecordRepository.getStaffStats).toHaveBeenCalledWith('specific-staff-id');
      expect(result.total).toBe(5);
      expect(result.overdue).toBe(0);
    });
  });
});