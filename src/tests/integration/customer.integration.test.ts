import request from 'supertest';
import { JWTUtils } from '../../utils/jwt';
import { UserRole } from '../../types/database/database.types';
import { CustomerService } from '../../services/customer.service';
import { createTestApp } from '../setup';
import { Express } from 'express';

// Mock the CustomerService
jest.mock('../../services/customer.service');

// Mock the database models
jest.mock('../../database/models', () => ({
  initializeModels: jest.fn(),
  User: {},
  Store: {},
  Bike: {},
  Service: {},
  ServiceRequest: {},
  ServiceRecord: {},
  Quotation: {},
  Invoice: {},
  ServiceUpdate: {},
  Media: {},
  StaffStorePermission: {},
}));

describe('Customer Routes Integration', () => {
  let customerToken: string;
  let mockCustomerService: jest.Mocked<CustomerService>;
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
    // Generate customer token for authenticated tests
    customerToken = JWTUtils.generateAccessToken({
      userId: 'customer-id-1',
      email: 'customer@test.com',
      role: UserRole.CUSTOMER,
    });

    // Mock the CustomerService
    mockCustomerService = new CustomerService() as jest.Mocked<CustomerService>;
    (CustomerService as jest.Mock).mockImplementation(() => mockCustomerService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/customers/bikes', () => {
    const validBikeData = {
      brand: 'Trek',
      model: 'Domane SL 7',
      year: 2023,
      serialNumber: 'WTU123456789',
      color: 'Matte Black',
      bikeType: 'Road Bike',
      notes: 'Carbon frame with Ultegra groupset',
    };

    const mockBike = {
      id: 'bike-id-1',
      customerId: 'customer-id-1',
      ...validBikeData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should register a new bike successfully', async () => {
      mockCustomerService.registerBike.mockResolvedValue(mockBike as any);

      const response = await request(app)
        .post('/api/customers/bikes')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validBikeData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          bike: expect.objectContaining({
            id: 'bike-id-1',
            brand: 'Trek',
            model: 'Domane SL 7',
          }),
        },
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.registerBike).toHaveBeenCalledWith('customer-id-1', validBikeData);
    });

    it('should return 400 for invalid bike data', async () => {
      const invalidBikeData = {
        year: 'invalid-year', // Should be a number
      };

      const response = await request(app)
        .post('/api/customers/bikes')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(invalidBikeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/customers/bikes')
        .send(validBikeData)
        .expect(401);
    });
  });

  describe('GET /api/customers/bikes', () => {
    const mockBikes = [
      {
        id: 'bike-id-1',
        customerId: 'customer-id-1',
        brand: 'Trek',
        model: 'Domane SL 7',
        year: 2023,
      },
      {
        id: 'bike-id-2',
        customerId: 'customer-id-1',
        brand: 'Specialized',
        model: 'Tarmac SL7',
        year: 2022,
      },
    ];

    it('should get all bikes for customer', async () => {
      mockCustomerService.getCustomerBikes.mockResolvedValue({
        bikes: mockBikes as any,
      });

      const response = await request(app)
        .get('/api/customers/bikes')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockBikes,
        meta: {
          pagination: undefined,
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.getCustomerBikes).toHaveBeenCalledWith('customer-id-1', {});
    });

    it('should get bikes with pagination', async () => {
      const mockPaginatedResult = {
        bikes: [mockBikes[0]],
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      };

      mockCustomerService.getCustomerBikes.mockResolvedValue(mockPaginatedResult as any);

      const response = await request(app)
        .get('/api/customers/bikes?page=1&limit=1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data).toEqual([mockBikes[0]]);
      expect(response.body.meta.pagination).toEqual(mockPaginatedResult.pagination);

      expect(mockCustomerService.getCustomerBikes).toHaveBeenCalledWith('customer-id-1', {
        page: 1,
        limit: 1,
        sortBy: undefined,
        sortOrder: undefined,
      });
    });
  });

  describe('GET /api/customers/bikes/:id', () => {
    const mockBike = {
      id: 'bike-id-1',
      customerId: 'customer-id-1',
      brand: 'Trek',
      model: 'Domane SL 7',
      year: 2023,
    };

    it('should get bike by ID successfully', async () => {
      mockCustomerService.getBikeById.mockResolvedValue(mockBike as any);

      const response = await request(app)
        .get('/api/customers/bikes/bike-id-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          bike: mockBike,
        },
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.getBikeById).toHaveBeenCalledWith('customer-id-1', 'bike-id-1');
    });

    it('should return 400 for invalid bike ID format', async () => {
      const response = await request(app)
        .get('/api/customers/bikes/invalid-uuid')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/customers/bikes/:id', () => {
    const updateData = {
      brand: 'Specialized',
      color: 'Red',
    };

    const updatedBike = {
      id: 'bike-id-1',
      customerId: 'customer-id-1',
      brand: 'Specialized',
      model: 'Domane SL 7',
      year: 2023,
      color: 'Red',
    };

    it('should update bike successfully', async () => {
      mockCustomerService.updateBike.mockResolvedValue(updatedBike as any);

      const response = await request(app)
        .put('/api/customers/bikes/bike-id-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          bike: updatedBike,
        },
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.updateBike).toHaveBeenCalledWith(
        'customer-id-1',
        'bike-id-1',
        updateData
      );
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdateData = {
        year: 'invalid-year',
      };

      const response = await request(app)
        .put('/api/customers/bikes/bike-id-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/customers/bikes/:id', () => {
    it('should delete bike successfully', async () => {
      mockCustomerService.deleteBike.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/customers/bikes/bike-id-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          message: 'Bike deleted successfully',
        },
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.deleteBike).toHaveBeenCalledWith('customer-id-1', 'bike-id-1');
    });
  });

  describe('GET /api/customers/bikes/search', () => {
    const mockSearchResults = [
      {
        id: 'bike-id-1',
        customerId: 'customer-id-1',
        brand: 'Trek',
        model: 'Domane SL 7',
        year: 2023,
      },
    ];

    it('should search bikes successfully', async () => {
      mockCustomerService.searchBikes.mockResolvedValue({
        bikes: mockSearchResults as any,
      });

      const response = await request(app)
        .get('/api/customers/bikes/search?brand=Trek&year=2023')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSearchResults,
        meta: {
          pagination: undefined,
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.searchBikes).toHaveBeenCalledWith(
        'customer-id-1',
        { brand: 'Trek', year: 2023 },
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'DESC' }
      );
    });
  });

  describe('GET /api/customers/bikes/stats', () => {
    const mockStats = {
      totalBikes: 3,
      bikesByType: { 'Road Bike': 2, 'Mountain Bike': 1 },
      bikesByBrand: { 'Trek': 2, 'Specialized': 1 },
    };

    it('should get bike statistics successfully', async () => {
      mockCustomerService.getCustomerBikeStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/customers/bikes/stats')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          stats: mockStats,
        },
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.getCustomerBikeStats).toHaveBeenCalledWith('customer-id-1');
    });
  });

  describe('GET /api/customers/bikes/:id/verify-ownership', () => {
    it('should verify bike ownership successfully', async () => {
      mockCustomerService.verifyBikeOwnership.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/customers/bikes/bike-id-1/verify-ownership')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          isOwner: true,
          bikeId: 'bike-id-1',
          customerId: 'customer-id-1',
        },
        meta: {
          timestamp: expect.any(String),
        },
      });

      expect(mockCustomerService.verifyBikeOwnership).toHaveBeenCalledWith(
        'customer-id-1',
        'bike-id-1'
      );
    });
  });

  describe('GET /api/customers/profile', () => {
    const mockCustomer = {
      id: 'customer-id-1',
      email: 'customer@test.com',
      role: UserRole.CUSTOMER,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      toJSON: () => ({
        id: 'customer-id-1',
        email: 'customer@test.com',
        role: UserRole.CUSTOMER,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        passwordHash: 'hidden',
        passwordResetToken: null,
        emailVerificationToken: null,
      }),
    };

    it('should get customer profile successfully', async () => {
      mockCustomerService.getCustomerProfile.mockResolvedValue(mockCustomer as any);

      const response = await request(app)
        .get('/api/customers/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customer).toEqual({
        id: 'customer-id-1',
        email: 'customer@test.com',
        role: UserRole.CUSTOMER,
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      });

      // Ensure sensitive data is not included
      expect(response.body.data.customer.passwordHash).toBeUndefined();
      expect(response.body.data.customer.passwordResetToken).toBeUndefined();
      expect(response.body.data.customer.emailVerificationToken).toBeUndefined();

      expect(mockCustomerService.getCustomerProfile).toHaveBeenCalledWith('customer-id-1');
    });
  });
});