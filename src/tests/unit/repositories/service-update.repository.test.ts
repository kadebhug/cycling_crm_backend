import { ServiceUpdateRepository } from '../../../repositories/service-update.repository';
import { ServiceUpdate } from '../../../database/models/ServiceUpdate';

// Mock the ServiceUpdate model
jest.mock('../../../database/models/ServiceUpdate');

describe('ServiceUpdateRepository', () => {
  let repository: ServiceUpdateRepository;
  let mockServiceUpdate: any;

  beforeEach(() => {
    repository = new ServiceUpdateRepository();
    mockServiceUpdate = {
      id: 'test-update-id',
      serviceRecordId: 'test-record-id',
      createdById: 'test-staff-id',
      updateType: 'progress_update',
      message: 'Test update message',
      isVisibleToCustomer: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isVisibleToCustomers: jest.fn().mockReturnValue(true),
      isInternalOnly: jest.fn().mockReturnValue(false),
      getFormattedTimestamp: jest.fn().mockReturnValue('2024-01-01 10:00:00'),
      hasMedia: jest.fn().mockReturnValue(false),
      getUpdateTypeColor: jest.fn().mockReturnValue('#10b981'),
      getUpdateTypeIcon: jest.fn().mockReturnValue('📈'),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createServiceUpdate', () => {
    it('should create a new service update', async () => {
      const createData = {
        serviceRecordId: 'test-record-id',
        createdById: 'test-staff-id',
        updateType: 'progress_update',
        message: 'Test update message',
        isVisibleToCustomer: true,
      };

      (ServiceUpdate.create as jest.Mock).mockResolvedValue(mockServiceUpdate);

      const result = await repository.createServiceUpdate(createData);

      expect(ServiceUpdate.create).toHaveBeenCalledWith(createData, {});
      expect(result).toEqual(mockServiceUpdate);
    });

    it('should create service update with transaction', async () => {
      const createData = {
        serviceRecordId: 'test-record-id',
        createdById: 'test-staff-id',
        updateType: 'progress_update',
        message: 'Test update message',
      };
      const mockTransaction = {} as any;

      (ServiceUpdate.create as jest.Mock).mockResolvedValue(mockServiceUpdate);

      await repository.createServiceUpdate(createData, mockTransaction);

      expect(ServiceUpdate.create).toHaveBeenCalledWith(createData, { transaction: mockTransaction });
    });
  });

  describe('findByServiceRecordId', () => {
    it('should find service updates by service record ID', async () => {
      const mockUpdates = [mockServiceUpdate];
      (ServiceUpdate.findAll as jest.Mock).mockResolvedValue(mockUpdates);

      const result = await repository.findByServiceRecordId('test-record-id');

      expect(ServiceUpdate.findAll).toHaveBeenCalledWith({
        where: { serviceRecordId: 'test-record-id' },
        include: expect.any(Array),
        order: [['createdAt', 'DESC']],
      });
      expect(result).toEqual(mockUpdates);
    });

    it('should return empty array if no updates found', async () => {
      (ServiceUpdate.findAll as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByServiceRecordId('non-existent-id');

      expect(result).toEqual([]);
    });
  });

  describe('findCustomerVisibleByServiceRecordId', () => {
    it('should find only customer-visible service updates', async () => {
      const mockUpdates = [mockServiceUpdate];
      (ServiceUpdate.findAll as jest.Mock).mockResolvedValue(mockUpdates);

      const result = await repository.findCustomerVisibleByServiceRecordId('test-record-id');

      expect(ServiceUpdate.findAll).toHaveBeenCalledWith({
        where: { 
          serviceRecordId: 'test-record-id',
          isVisibleToCustomer: true,
        },
        include: expect.any(Array),
        order: [['createdAt', 'DESC']],
      });
      expect(result).toEqual(mockUpdates);
    });
  });

  describe('findWithFilters', () => {
    it('should find service updates with update type filter', async () => {
      const mockUpdates = [mockServiceUpdate];
      (ServiceUpdate.findAll as jest.Mock).mockResolvedValue(mockUpdates);

      const filters = { updateType: 'progress_update' };
      const result = await repository.findWithFilters(filters);

      expect(ServiceUpdate.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updateType: 'progress_update',
          }),
        })
      );
      expect(result).toEqual(mockUpdates);
    });

    it('should find service updates with multiple update types', async () => {
      const mockUpdates = [mockServiceUpdate];
      (ServiceUpdate.findAll as jest.Mock).mockResolvedValue(mockUpdates);

      const filters = { updateType: ['progress_update', 'status_change'] };
      const result = await repository.findWithFilters(filters);

      expect(ServiceUpdate.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            updateType: expect.objectContaining({
              [Symbol.for('in')]: ['progress_update', 'status_change'],
            }),
          }),
        })
      );
      expect(result).toEqual(mockUpdates);
    });

    it('should find service updates with visibility filter', async () => {
      const mockUpdates = [mockServiceUpdate];
      (ServiceUpdate.findAll as jest.Mock).mockResolvedValue(mockUpdates);

      const filters = { isVisibleToCustomer: true };
      const result = await repository.findWithFilters(filters);

      expect(ServiceUpdate.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isVisibleToCustomer: true,
          }),
        })
      );
      expect(result).toEqual(mockUpdates);
    });

    it('should find service updates with date range filter', async () => {
      const mockUpdates = [mockServiceUpdate];
      (ServiceUpdate.findAll as jest.Mock).mockResolvedValue(mockUpdates);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      const filters = { dateFrom, dateTo };
      const result = await repository.findWithFilters(filters);

      expect(ServiceUpdate.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        })
      );
      expect(result).toEqual(mockUpdates);
    });
  });

  describe('getServiceRecordUpdateStats', () => {
    it('should calculate service record update statistics correctly', async () => {
      const mockUpdates = [
        { ...mockServiceUpdate, isVisibleToCustomer: true, updateType: 'progress_update' },
        { ...mockServiceUpdate, isVisibleToCustomer: false, updateType: 'internal_note' },
        { ...mockServiceUpdate, isVisibleToCustomer: true, updateType: 'status_change' },
        { ...mockServiceUpdate, isVisibleToCustomer: false, updateType: 'internal_note' },
      ];

      jest.spyOn(repository, 'findByServiceRecordId').mockResolvedValue(mockUpdates as any);

      const stats = await repository.getServiceRecordUpdateStats('test-record-id');

      expect(stats.total).toBe(4);
      expect(stats.customerVisible).toBe(2);
      expect(stats.internalOnly).toBe(2);
      expect(stats.byType['progress_update']).toBe(1);
      expect(stats.byType['internal_note']).toBe(2);
      expect(stats.byType['status_change']).toBe(1);
      expect(stats.recent).toHaveLength(4);
    });

    it('should handle empty updates', async () => {
      jest.spyOn(repository, 'findByServiceRecordId').mockResolvedValue([]);

      const stats = await repository.getServiceRecordUpdateStats('test-record-id');

      expect(stats.total).toBe(0);
      expect(stats.customerVisible).toBe(0);
      expect(stats.internalOnly).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.recent).toEqual([]);
    });
  });

  describe('getStaffUpdateStats', () => {
    it('should calculate staff update statistics correctly', async () => {
      const mockUpdates = [
        { ...mockServiceUpdate, isVisibleToCustomer: true, updateType: 'progress_update' },
        { ...mockServiceUpdate, isVisibleToCustomer: false, updateType: 'internal_note' },
        { ...mockServiceUpdate, isVisibleToCustomer: true, updateType: 'customer_communication' },
      ];

      jest.spyOn(repository, 'findWithFilters').mockResolvedValue(mockUpdates as any);

      const stats = await repository.getStaffUpdateStats('test-staff-id');

      expect(stats.total).toBe(3);
      expect(stats.customerVisible).toBe(2);
      expect(stats.internalOnly).toBe(1);
      expect(stats.byType['progress_update']).toBe(1);
      expect(stats.byType['internal_note']).toBe(1);
      expect(stats.byType['customer_communication']).toBe(1);
      expect(stats.recent).toHaveLength(3);
    });

    it('should include date filters when provided', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      jest.spyOn(repository, 'findWithFilters').mockResolvedValue([]);

      await repository.getStaffUpdateStats('test-staff-id', dateFrom, dateTo);

      expect(repository.findWithFilters).toHaveBeenCalledWith({
        createdById: 'test-staff-id',
        dateFrom,
        dateTo,
      });
    });
  });

  describe('verifyUserAccess', () => {
    it('should return true for customer if update is visible to customer', async () => {
      const mockUpdate = {
        ...mockServiceUpdate,
        isVisibleToCustomer: true,
        createdById: 'other-staff-id',
      };

      jest.spyOn(repository, 'findByIdWithDetails').mockResolvedValue(mockUpdate as any);

      const result = await repository.verifyUserAccess('test-update-id', 'test-customer-id', true);

      expect(result).toBe(true);
    });

    it('should return false for customer if update is not visible to customer', async () => {
      const mockUpdate = {
        ...mockServiceUpdate,
        isVisibleToCustomer: false,
        createdById: 'other-staff-id',
      };

      jest.spyOn(repository, 'findByIdWithDetails').mockResolvedValue(mockUpdate as any);

      const result = await repository.verifyUserAccess('test-update-id', 'test-customer-id', true);

      expect(result).toBe(false);
    });

    it('should return true for staff if they created the update', async () => {
      const mockUpdate = {
        ...mockServiceUpdate,
        isVisibleToCustomer: false,
        createdById: 'test-staff-id',
      };

      jest.spyOn(repository, 'findByIdWithDetails').mockResolvedValue(mockUpdate as any);

      const result = await repository.verifyUserAccess('test-update-id', 'test-staff-id', false);

      expect(result).toBe(true);
    });

    it('should return false if update not found', async () => {
      jest.spyOn(repository, 'findByIdWithDetails').mockResolvedValue(null);

      const result = await repository.verifyUserAccess('non-existent-id', 'test-user-id', false);

      expect(result).toBe(false);
    });
  });

  describe('countWithFilters', () => {
    it('should count service updates with filters', async () => {
      (ServiceUpdate.count as jest.Mock).mockResolvedValue(5);

      const filters = { 
        serviceRecordId: 'test-record-id',
        isVisibleToCustomer: true,
      };
      const result = await repository.countWithFilters(filters);

      expect(ServiceUpdate.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          serviceRecordId: 'test-record-id',
          isVisibleToCustomer: true,
        })
      });
      expect(result).toBe(5);
    });
  });
});