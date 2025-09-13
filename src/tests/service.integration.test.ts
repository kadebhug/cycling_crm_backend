import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from './setup';
import { UserRole, Permission } from '../types/database/database.types';

describe('Service Integration Tests', () => {
  let app: Express;
  let adminUser: any;
  let storeOwner: any;
  let testStore: any;
  let adminToken: string;
  let storeOwnerToken: string;
  let sequelize: any;
  let Service: any;
  let Store: any;
  let User: any;
  let JWTUtils: any;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Import after environment is set up
    const { DatabaseConnection } = await import('../config/database');
    const { JWTUtils: jwt } = await import('../utils/jwt');
    
    const dbConnection = DatabaseConnection.getInstance();
    await dbConnection.initialize();
    sequelize = dbConnection.getSequelize();
    
    // Import models after database is initialized
    const { Service: ServiceModel, Store: StoreModel, User: UserModel } = await import('../database/models');
    Service = ServiceModel;
    Store = StoreModel;
    User = UserModel;
    JWTUtils = jwt;
    
    await sequelize.sync({ force: true });

    // Create test users
    adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: 'hashedpassword',
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
    });

    storeOwner = await User.create({
      email: 'owner@example.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STORE_OWNER,
      firstName: 'Store',
      lastName: 'Owner',
      isActive: true,
      emailVerified: true,
    });

    // Create test store
    testStore = await Store.create({
      ownerId: storeOwner.id,
      name: 'Test Bike Shop',
      description: 'A test bike shop',
      isActive: true,
    });

    // Generate tokens
    adminToken = JWTUtils.generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    storeOwnerToken = JWTUtils.generateAccessToken({
      userId: storeOwner.id,
      email: storeOwner.email,
      role: storeOwner.role,
    });
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    await Service.destroy({ where: {}, force: true });
  });

  describe('GET /api/services/categories/common', () => {
    it('should return common service categories without authentication', async () => {
      const response = await request(app)
        .get('/api/services/categories/common')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data).toContain('Basic Maintenance');
    });
  });

  describe('POST /api/services/:storeId/services', () => {
    const validServiceData = {
      name: 'Basic Tune-up',
      description: 'Basic bike maintenance service',
      basePrice: 50.00,
      estimatedDuration: 60,
      category: 'Basic Maintenance',
    };

    it('should create a service as store owner', async () => {
      const response = await request(app)
        .post(`/api/services/${testStore.id}/services`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send(validServiceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validServiceData.name);
      expect(response.body.data.storeId).toBe(testStore.id);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should create a service as admin', async () => {
      const response = await request(app)
        .post(`/api/services/${testStore.id}/services`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validServiceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(validServiceData.name);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post(`/api/services/${testStore.id}/services`)
        .send(validServiceData)
        .expect(401);
    });

    it('should fail with invalid data', async () => {
      const invalidData = { ...validServiceData, name: '', basePrice: -10 };

      const response = await request(app)
        .post(`/api/services/${testStore.id}/services`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should fail with duplicate service name', async () => {
      // Create first service
      await request(app)
        .post(`/api/services/${testStore.id}/services`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send(validServiceData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post(`/api/services/${testStore.id}/services`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send(validServiceData)
        .expect(400);

      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('GET /api/services/:storeId/services', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Basic Tune-up',
          basePrice: 50.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Brake Service',
          basePrice: 75.00,
          category: 'Brake Service',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Inactive Service',
          basePrice: 100.00,
          category: 'Custom Work',
          isActive: false,
        },
      ]);
    });

    it('should get active services by default', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.data.every((s: any) => s.isActive === true)).toBe(true);
    });

    it('should include inactive services when requested', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services?includeInactive=true`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(3);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services?category=Basic Maintenance`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].category).toBe('Basic Maintenance');
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services?minPrice=60&maxPrice=80`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Brake Service');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services?page=1&limit=1`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.total).toBe(2);
    });
  });

  describe('GET /api/services/:storeId/services/:serviceId', () => {
    let testService: InstanceType<typeof Service>;

    beforeEach(async () => {
      testService = await Service.create({
        storeId: testStore.id,
        name: 'Test Service',
        basePrice: 50.00,
        isActive: true,
      });
    });

    it('should get service by ID', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services/${testService.id}`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testService.id);
      expect(response.body.data.name).toBe('Test Service');
    });

    it('should return 404 for non-existent service', async () => {
      await request(app)
        .get(`/api/services/${testStore.id}/services/non-existent-id`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/services/:storeId/services/:serviceId', () => {
    let testService: InstanceType<typeof Service>;

    beforeEach(async () => {
      testService = await Service.create({
        storeId: testStore.id,
        name: 'Test Service',
        basePrice: 50.00,
        isActive: true,
      });
    });

    it('should update service', async () => {
      const updateData = {
        name: 'Updated Service',
        basePrice: 75.00,
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/services/${testStore.id}/services/${testService.id}`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Service');
      expect(response.body.data.basePrice).toBe(75.00);
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should return 404 for non-existent service', async () => {
      await request(app)
        .put(`/api/services/${testStore.id}/services/non-existent-id`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('POST /api/services/:storeId/services/:serviceId/activate', () => {
    let testService: InstanceType<typeof Service>;

    beforeEach(async () => {
      testService = await Service.create({
        storeId: testStore.id,
        name: 'Test Service',
        basePrice: 50.00,
        isActive: false,
      });
    });

    it('should activate service', async () => {
      const response = await request(app)
        .post(`/api/services/${testStore.id}/services/${testService.id}/activate`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('POST /api/services/:storeId/services/:serviceId/deactivate', () => {
    let testService: InstanceType<typeof Service>;

    beforeEach(async () => {
      testService = await Service.create({
        storeId: testStore.id,
        name: 'Test Service',
        basePrice: 50.00,
        isActive: true,
      });
    });

    it('should deactivate service', async () => {
      const response = await request(app)
        .post(`/api/services/${testStore.id}/services/${testService.id}/deactivate`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('DELETE /api/services/:storeId/services/:serviceId', () => {
    let testService: InstanceType<typeof Service>;

    beforeEach(async () => {
      testService = await Service.create({
        storeId: testStore.id,
        name: 'Test Service',
        basePrice: 50.00,
        isActive: true,
      });
    });

    it('should delete (deactivate) service', async () => {
      await request(app)
        .delete(`/api/services/${testStore.id}/services/${testService.id}`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(204);

      // Verify service is deactivated
      const updatedService = await Service.findByPk(testService.id);
      expect(updatedService?.isActive).toBe(false);
    });
  });

  describe('GET /api/services/:storeId/services/search', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Basic Tune-up',
          description: 'Basic bike maintenance',
          basePrice: 50.00,
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Advanced Tune-up',
          description: 'Comprehensive service',
          basePrice: 100.00,
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Brake Service',
          description: 'Brake repair and adjustment',
          basePrice: 75.00,
          isActive: true,
        },
      ]);
    });

    it('should search services by name', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services/search?q=tune-up`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((s: any) => s.name.toLowerCase().includes('tune-up'))).toBe(true);
    });

    it('should search services by description', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services/search?q=brake`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Brake Service');
    });

    it('should return 400 for missing search term', async () => {
      await request(app)
        .get(`/api/services/${testStore.id}/services/search`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(400);
    });
  });

  describe('GET /api/services/:storeId/services/categories', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Service 1',
          basePrice: 50.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 2',
          basePrice: 75.00,
          category: 'Brake Service',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 3',
          basePrice: 100.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
      ]);
    });

    it('should get store categories', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services/categories`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data).toContain('Basic Maintenance');
      expect(response.body.data).toContain('Brake Service');
    });
  });

  describe('GET /api/services/:storeId/services/stats', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Service 1',
          basePrice: 50.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 2',
          basePrice: 100.00,
          category: 'Brake Service',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 3',
          basePrice: 150.00,
          category: 'Custom Work',
          isActive: false,
        },
      ]);
    });

    it('should get service statistics', async () => {
      const response = await request(app)
        .get(`/api/services/${testStore.id}/services/stats`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.active).toBe(2);
      expect(response.body.data.inactive).toBe(1);
      expect(response.body.data.categories).toBe(2);
      expect(response.body.data.averagePrice).toBe(75.00);
    });
  });
});