import request from 'supertest';
import { Express } from 'express';
import { StaffService } from '../../services/staff.service';
import { UserRole, ServiceRecordStatus } from '../../types/database/database.types';

// Mock the StaffService
jest.mock('../../services/staff.service');

describe('StaffController Integration Tests', () => {
  let app: Express;
  let mockStaffService: jest.Mocked<StaffService>;

  const mockAuthToken = 'valid-jwt-token';
  const mockStaffUser = {
    userId: 'test-staff-id',
    email: 'staff@test.com',
    role: UserRole.STAFF,
  };

  const mockServiceRecord = {
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
  };

  const mockServiceUpdate = {
    id: 'test-update-id',
    serviceRecordId: 'test-record-id',
    createdById: 'test-staff-id',
    updateType: 'progress_update',
    message: 'Test update message',
    isVisibleToCustomer: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Create mocked service instance
    mockStaffService = new StaffService() as jest.Mocked<StaffService>;

    // Mock the Express app (this would typically be imported from your app setup)
    // For this example, we'll assume the app is properly configured with routes
    app = {} as Express; // This should be your actual Express app

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockStaffService.createServiceRecord.mockResolvedValue(mockServiceRecord as any);
    mockStaffService.getStoreServiceRecords.mockResolvedValue({
      records: [mockServiceRecord],
      pagination: undefined,
    } as any);
    mockStaffService.getServiceRecordById.mockResolvedValue(mockServiceRecord as any);
    mockStaffService.updateServiceRecord.mockResolvedValue(mockServiceRecord as any);
    mockStaffService.addServiceUpdate.mockResolvedValue(mockServiceUpdate as any);
    mockStaffService.getServiceUpdates.mockResolvedValue({
      updates: [mockServiceUpdate],
      pagination: undefined,
    } as any);
  });

  describe('POST /staff/:storeId/service-records', () => {
    const createData = {
      serviceRequestId: 'test-request-id',
      assignedStaffId: 'test-staff-id',
      estimatedCompletionDate: '2024-12-31T00:00:00.000Z',
      notes: 'Test notes',
    };

    it('should create a service record successfully', async () => {
      const response = await request(app)
        .post('/staff/test-store-id/service-records')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(createData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceRecord).toEqual(mockServiceRecord);
      expect(mockStaffService.createServiceRecord).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        expect.objectContaining(createData)
      );
    });

    it('should return 400 if serviceRequestId is missing', async () => {
      const invalidData = { ...createData };
      delete invalidData.serviceRequestId;

      const response = await request(app)
        .post('/staff/test-store-id/service-records')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Service request ID is required');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .post('/staff/test-store-id/service-records')
        .send(createData)
        .expect(401);
    });
  });

  describe('GET /staff/:storeId/service-records', () => {
    it('should get store service records successfully', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/service-records')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockServiceRecord]);
      expect(mockStaffService.getStoreServiceRecords).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        {},
        {}
      );
    });

    it('should handle query parameters correctly', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/service-records')
        .query({
          page: '1',
          limit: '10',
          status: ServiceRecordStatus.IN_PROGRESS,
          assignedStaffId: 'specific-staff-id',
          isOverdue: 'true',
        })
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(mockStaffService.getStoreServiceRecords).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        {
          status: ServiceRecordStatus.IN_PROGRESS,
          assignedStaffId: 'specific-staff-id',
          isOverdue: true,
        },
        {
          page: 1,
          limit: 10,
          sortBy: undefined,
          sortOrder: undefined,
        }
      );
    });
  });

  describe('GET /staff/:storeId/service-records/my', () => {
    it('should get current user service records successfully', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/service-records/my')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockServiceRecord]);
      expect(mockStaffService.getStaffServiceRecords).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-staff-id', // Should use current user's ID
        {},
        {}
      );
    });
  });

  describe('GET /staff/:storeId/service-records/:recordId', () => {
    it('should get service record by ID successfully', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/service-records/test-record-id')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceRecord).toEqual(mockServiceRecord);
      expect(mockStaffService.getServiceRecordById).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id'
      );
    });
  });

  describe('PUT /staff/:storeId/service-records/:recordId', () => {
    const updateData = {
      status: ServiceRecordStatus.IN_PROGRESS,
      workPerformed: 'Cleaned and lubricated chain',
      laborHours: 2.5,
    };

    it('should update service record successfully', async () => {
      const response = await request(app)
        .put('/staff/test-store-id/service-records/test-record-id')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceRecord).toEqual(mockServiceRecord);
      expect(mockStaffService.updateServiceRecord).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        updateData
      );
    });
  });

  describe('POST /staff/:storeId/service-records/:recordId/start', () => {
    it('should start service work successfully', async () => {
      const response = await request(app)
        .post('/staff/test-store-id/service-records/test-record-id/start')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceRecord).toEqual(mockServiceRecord);
      expect(response.body.data.message).toBe('Service work started successfully');
      expect(mockStaffService.updateServiceRecord).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        {
          status: ServiceRecordStatus.IN_PROGRESS,
          assignedStaffId: 'test-staff-id',
        }
      );
    });
  });

  describe('POST /staff/:storeId/service-records/:recordId/complete', () => {
    it('should complete service work successfully', async () => {
      const completionData = {
        workPerformed: 'Cleaned and lubricated chain, adjusted brakes',
        partsUsed: 'Chain lubricant, brake pads',
        laborHours: 3.0,
        notes: 'Service completed successfully',
      };

      const response = await request(app)
        .post('/staff/test-store-id/service-records/test-record-id/complete')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(completionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceRecord).toEqual(mockServiceRecord);
      expect(response.body.data.message).toBe('Service work completed successfully');
      expect(mockStaffService.updateServiceRecord).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        {
          status: ServiceRecordStatus.COMPLETED,
          ...completionData,
        }
      );
    });

    it('should complete service work without additional data', async () => {
      const response = await request(app)
        .post('/staff/test-store-id/service-records/test-record-id/complete')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(mockStaffService.updateServiceRecord).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        {
          status: ServiceRecordStatus.COMPLETED,
        }
      );
    });
  });

  describe('POST /staff/:storeId/service-records/:recordId/hold', () => {
    it('should put service on hold successfully', async () => {
      const holdData = {
        notes: 'Waiting for parts to arrive',
      };

      const response = await request(app)
        .post('/staff/test-store-id/service-records/test-record-id/hold')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(holdData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceRecord).toEqual(mockServiceRecord);
      expect(response.body.data.message).toBe('Service put on hold successfully');
      expect(mockStaffService.updateServiceRecord).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        {
          status: ServiceRecordStatus.ON_HOLD,
          notes: 'Waiting for parts to arrive',
        }
      );
    });
  });

  describe('POST /staff/:storeId/service-records/:recordId/updates', () => {
    const updateData = {
      updateType: 'progress_update',
      message: 'Started working on the bike',
      isVisibleToCustomer: true,
    };

    it('should add service update successfully', async () => {
      const response = await request(app)
        .post('/staff/test-store-id/service-records/test-record-id/updates')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(updateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceUpdate).toEqual(mockServiceUpdate);
      expect(mockStaffService.addServiceUpdate).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        updateData
      );
    });

    it('should return 400 if updateType is missing', async () => {
      const invalidData = { ...updateData };
      delete invalidData.updateType;

      const response = await request(app)
        .post('/staff/test-store-id/service-records/test-record-id/updates')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Update type and message are required');
    });

    it('should return 400 if message is missing', async () => {
      const invalidData = { ...updateData };
      delete invalidData.message;

      const response = await request(app)
        .post('/staff/test-store-id/service-records/test-record-id/updates')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Update type and message are required');
    });
  });

  describe('GET /staff/:storeId/service-records/:recordId/updates', () => {
    it('should get service updates successfully', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/service-records/test-record-id/updates')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockServiceUpdate]);
      expect(mockStaffService.getServiceUpdates).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        false,
        {}
      );
    });

    it('should handle query parameters correctly', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/service-records/test-record-id/updates')
        .query({
          page: '1',
          limit: '10',
          customerVisibleOnly: 'true',
        })
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(mockStaffService.getServiceUpdates).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-record-id',
        true,
        {
          page: 1,
          limit: 10,
          sortBy: undefined,
          sortOrder: undefined,
        }
      );
    });
  });

  describe('GET /staff/:storeId/stats/service-progress', () => {
    const mockStats = {
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
    };

    beforeEach(() => {
      mockStaffService.getServiceProgressStats.mockResolvedValue(mockStats);
    });

    it('should get service progress stats successfully', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/stats/service-progress')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(mockStaffService.getServiceProgressStats).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        undefined
      );
    });

    it('should get stats for specific staff when staffId provided', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/stats/service-progress')
        .query({ staffId: 'specific-staff-id' })
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(mockStaffService.getServiceProgressStats).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'specific-staff-id'
      );
    });
  });

  describe('GET /staff/:storeId/stats/my-progress', () => {
    const mockStats = {
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
    };

    beforeEach(() => {
      mockStaffService.getServiceProgressStats.mockResolvedValue(mockStats);
    });

    it('should get my service progress stats successfully', async () => {
      const response = await request(app)
        .get('/staff/test-store-id/stats/my-progress')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(mockStaffService.getServiceProgressStats).toHaveBeenCalledWith(
        'test-staff-id',
        'test-store-id',
        'test-staff-id' // Should use current user's ID
      );
    });
  });
});