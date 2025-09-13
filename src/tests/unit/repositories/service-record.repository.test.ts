import { ServiceRecordRepository } from '../../../repositories/service-record.repository';
import { ServiceRecord } from '../../../database/models/ServiceRecord';
import { ServiceRecordStatus } from '../../../types/database/database.types';

// Mock the ServiceRecord model
jest.mock('../../../database/models/ServiceRecord');

describe('ServiceRecordRepository', () => {
  let repository: ServiceRecordRepository;
  let mockServiceRecord: any;

  beforeEach(() => {
    repository = new ServiceRecordRepository();
    mockServiceRecord = {
      id: 'test-record-id',
      serviceRequestId: 'test-request-id',
      assignedStaffId: 'test-staff-id',
      status: ServiceRecordStatus.PENDING,
      startDate: null,
      completedDate: null,
      estimatedCompletionDate: new Date('2024-12-31'),
      workPerformed: null,
      partsUsed: null,
      laborHours: null,
      notes: 'Test notes',
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: jest.fn().mockReturnValue(false),
      getDurationInDays: jest.fn().mockReturnValue(null),
      isCompleted: jest.fn().mockReturnValue(false),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createServiceRecord', () => {
    it('should create a new service record', async () => {
      const createData = {
        serviceRequestId: 'test-request-id',
        assignedStaffId: 'test-staff-id',
        estimatedCompletionDate: new Date('2024-12-31'),
        notes: 'Test notes',
      };

      (ServiceRecord.create as jest.Mock).mockResolvedValue(mockServiceRecord);

      const result = await repository.createServiceRecord(createData);

      expect(ServiceRecord.create).toHaveBeenCalledWith(createData, {});
      expect(result).toEqual(mockServiceRecord);
    });

    it('should create service record with transaction', async () => {
      const createData = {
        serviceRequestId: 'test-request-id',
      };
      const mockTransaction = {} as any;

      (ServiceRecord.create as jest.Mock).mockResolvedValue(mockServiceRecord);

      await repository.createServiceRecord(createData, mockTransaction);

      expect(ServiceRecord.create).toHaveBeenCalledWith(createData, { transaction: mockTransaction });
    });
  });

  describe('findByServiceRequestId', () => {
    it('should find service record by service request ID', async () => {
      (ServiceRecord.findOne as jest.Mock).mockResolvedValue(mockServiceRecord);

      const result = await repository.findByServiceRequestId('test-request-id');

      expect(ServiceRecord.findOne).toHaveBeenCalledWith({
        where: { serviceRequestId: 'test-request-id' },
        include: expect.any(Array),
      });
      expect(result).toEqual(mockServiceRecord);
    });

    it('should return null if service record not found', async () => {
      (ServiceRecord.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByServiceRequestId('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update service record status to in_progress and set start date', async () => {
      const updatedRecord = { ...mockServiceRecord, status: ServiceRecordStatus.IN_PROGRESS };
      (ServiceRecord.update as jest.Mock).mockResolvedValue([1]);
      (ServiceRecord.findByPk as jest.Mock).mockResolvedValue(updatedRecord);

      const result = await repository.updateStatus('test-record-id', ServiceRecordStatus.IN_PROGRESS);

      expect(ServiceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ServiceRecordStatus.IN_PROGRESS,
          startDate: expect.any(Date),
        }),
        expect.objectContaining({
          where: { id: 'test-record-id' },
        })
      );
      expect(result).toEqual(updatedRecord);
    });

    it('should update service record status to completed and set completed date', async () => {
      const updatedRecord = { ...mockServiceRecord, status: ServiceRecordStatus.COMPLETED };
      (ServiceRecord.update as jest.Mock).mockResolvedValue([1]);
      (ServiceRecord.findByPk as jest.Mock).mockResolvedValue(updatedRecord);

      const result = await repository.updateStatus('test-record-id', ServiceRecordStatus.COMPLETED);

      expect(ServiceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ServiceRecordStatus.COMPLETED,
          completedDate: expect.any(Date),
        }),
        expect.objectContaining({
          where: { id: 'test-record-id' },
        })
      );
      expect(result).toEqual(updatedRecord);
    });

    it('should return null if no records were updated', async () => {
      (ServiceRecord.update as jest.Mock).mockResolvedValue([0]);

      const result = await repository.updateStatus('non-existent-id', ServiceRecordStatus.IN_PROGRESS);

      expect(result).toBeNull();
    });
  });

  describe('findWithFilters', () => {
    it('should find service records with status filter', async () => {
      const mockRecords = [mockServiceRecord];
      (ServiceRecord.findAll as jest.Mock).mockResolvedValue(mockRecords);

      const filters = { status: ServiceRecordStatus.IN_PROGRESS };
      const result = await repository.findWithFilters(filters);

      expect(ServiceRecord.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ServiceRecordStatus.IN_PROGRESS,
          }),
        })
      );
      expect(result).toEqual(mockRecords);
    });

    it('should find service records with multiple status filter', async () => {
      const mockRecords = [mockServiceRecord];
      (ServiceRecord.findAll as jest.Mock).mockResolvedValue(mockRecords);

      const filters = { status: [ServiceRecordStatus.PENDING, ServiceRecordStatus.IN_PROGRESS] };
      const result = await repository.findWithFilters(filters);

      expect(ServiceRecord.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: expect.objectContaining({
              [Symbol.for('in')]: [ServiceRecordStatus.PENDING, ServiceRecordStatus.IN_PROGRESS],
            }),
          }),
        })
      );
      expect(result).toEqual(mockRecords);
    });

    it('should find overdue service records', async () => {
      const mockRecords = [mockServiceRecord];
      (ServiceRecord.findAll as jest.Mock).mockResolvedValue(mockRecords);

      const filters = { isOverdue: true };
      const result = await repository.findWithFilters(filters);

      expect(ServiceRecord.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estimatedCompletionDate: expect.any(Object),
            status: expect.any(Object),
          }),
        })
      );
      expect(result).toEqual(mockRecords);
    });
  });

  describe('getStoreStats', () => {
    it('should calculate store statistics correctly', async () => {
      const mockRecords = [
        { ...mockServiceRecord, status: ServiceRecordStatus.PENDING, isOverdue: () => false, isCompleted: () => false },
        { ...mockServiceRecord, status: ServiceRecordStatus.IN_PROGRESS, isOverdue: () => true, isCompleted: () => false },
        { 
          ...mockServiceRecord, 
          status: ServiceRecordStatus.COMPLETED, 
          isOverdue: () => false, 
          isCompleted: () => true,
          startDate: new Date('2024-01-01'),
          completedDate: new Date('2024-01-05'),
          getDurationInDays: () => 4,
        },
      ];

      jest.spyOn(repository, 'findByStoreId').mockResolvedValue(mockRecords as any);

      const stats = await repository.getStoreStats('test-store-id');

      expect(stats.total).toBe(3);
      expect(stats.byStatus[ServiceRecordStatus.PENDING]).toBe(1);
      expect(stats.byStatus[ServiceRecordStatus.IN_PROGRESS]).toBe(1);
      expect(stats.byStatus[ServiceRecordStatus.COMPLETED]).toBe(1);
      expect(stats.overdue).toBe(1);
      expect(stats.averageCompletionDays).toBe(4);
    });

    it('should handle empty records', async () => {
      jest.spyOn(repository, 'findByStoreId').mockResolvedValue([]);

      const stats = await repository.getStoreStats('test-store-id');

      expect(stats.total).toBe(0);
      expect(stats.overdue).toBe(0);
      expect(stats.averageCompletionDays).toBeNull();
    });
  });

  describe('verifyStaffAccess', () => {
    it('should return true if staff is assigned to the record', async () => {
      const mockRecord = {
        ...mockServiceRecord,
        assignedStaffId: 'test-staff-id',
        serviceRequest: { storeId: 'test-store-id' },
      };

      (ServiceRecord.findOne as jest.Mock).mockResolvedValue(mockRecord);

      const result = await repository.verifyStaffAccess('test-record-id', 'test-staff-id', 'test-store-id');

      expect(result).toBe(true);
    });

    it('should return true if staff has store access even if not assigned', async () => {
      const mockRecord = {
        ...mockServiceRecord,
        assignedStaffId: 'other-staff-id',
        serviceRequest: { storeId: 'test-store-id' },
      };

      (ServiceRecord.findOne as jest.Mock).mockResolvedValue(mockRecord);

      const result = await repository.verifyStaffAccess('test-record-id', 'test-staff-id', 'test-store-id');

      expect(result).toBe(true);
    });

    it('should return false if record not found', async () => {
      (ServiceRecord.findOne as jest.Mock).mockResolvedValue(null);

      const result = await repository.verifyStaffAccess('non-existent-id', 'test-staff-id', 'test-store-id');

      expect(result).toBe(false);
    });
  });
});