import request from 'supertest';
import { app } from '../../app';
import { sequelize } from '../../config/database';
import { User, Store, ServiceRequest, Quotation } from '../../database/models';
import { UserRole, RequestStatus, QuotationStatus, Permission, Priority } from '../../types/database/database.types';
import { JWTUtils } from '../../utils/jwt';

describe('Quotation Integration Tests', () => {
  let adminToken: string;
  let storeOwnerToken: string;
  let staffToken: string;
  let customerToken: string;
  let storeId: string;
  let serviceRequestId: string;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Create test users
    const adminUser = await User.create({
      email: 'admin@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
    });

    const storeOwnerUser = await User.create({
      email: 'owner@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STORE_OWNER,
      firstName: 'Store',
      lastName: 'Owner',
      isActive: true,
      emailVerified: true,
    });

    const staffUser = await User.create({
      email: 'staff@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STAFF,
      firstName: 'Staff',
      lastName: 'Member',
      isActive: true,
      emailVerified: true,
    });

    const customerUser = await User.create({
      email: 'customer@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.CUSTOMER,
      firstName: 'Customer',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
    });

    // Create store
    const store = await Store.create({
      ownerId: storeOwnerUser.id,
      name: 'Test Bike Shop',
      description: 'A test bike shop',
      address: '123 Test Street',
      isActive: true,
    });
    storeId = store.id;

    // Create bike for customer
    const { Bike } = await import('../../database/models');
    const bike = await Bike.create({
      customerId: customerUser.id,
      brand: 'Trek',
      model: 'FX 3',
      year: 2023,
      serialNumber: 'TEST123',
      color: 'Blue',
      bikeType: 'Hybrid',
    });

    // Create service request
    const serviceRequest = await ServiceRequest.create({
      customerId: customerUser.id,
      bikeId: bike.id,
      storeId: store.id,
      requestedServices: ['Brake adjustment', 'Chain lubrication'],
      priority: Priority.MEDIUM,
      status: RequestStatus.PENDING,
      customerNotes: 'Please check brakes carefully',
    });
    serviceRequestId = serviceRequest.id;

    // Generate JWT tokens
    adminToken = JWTUtils.generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    storeOwnerToken = JWTUtils.generateAccessToken({
      userId: storeOwnerUser.id,
      email: storeOwnerUser.email,
      role: storeOwnerUser.role,
    });

    staffToken = JWTUtils.generateAccessToken({
      userId: staffUser.id,
      email: staffUser.email,
      role: staffUser.role,
    });

    customerToken = JWTUtils.generateAccessToken({
      userId: customerUser.id,
      email: customerUser.email,
      role: customerUser.role,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /quotations/stores/:storeId/quotations', () => {
    const quotationData = {
      serviceRequestId: '',
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

    beforeEach(() => {
      quotationData.serviceRequestId = serviceRequestId;
    });

    it('should create quotation as store owner', async () => {
      const response = await request(app)
        .post(`/api/stores/${storeId}/quotations`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send(quotationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quotation).toBeDefined();
      expect(response.body.data.quotation.subtotal).toBe(40);
      expect(response.body.data.quotation.taxAmount).toBe(4);
      expect(response.body.data.quotation.total).toBe(44);
      expect(response.body.data.quotation.status).toBe(QuotationStatus.DRAFT);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post(`/api/stores/${storeId}/quotations`)
        .send(quotationData)
        .expect(401);
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        ...quotationData,
        lineItems: [], // Empty line items
      };

      await request(app)
        .post(`/api/stores/${storeId}/quotations`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should fail as customer', async () => {
      await request(app)
        .post(`/api/stores/${storeId}/quotations`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(quotationData)
        .expect(403);
    });
  });

  describe('GET /quotations/stores/:storeId/quotations', () => {
    let quotationId: string;

    beforeAll(async () => {
      // Create a quotation for testing
      const quotation = await Quotation.create({
        serviceRequestId: serviceRequestId,
        quotationNumber: 'QUO-TEST-001',
        createdById: (await User.findOne({ where: { role: UserRole.STORE_OWNER } }))!.id,
        lineItems: [
          {
            id: 'item_1',
            description: 'Test service',
            quantity: 1,
            unitPrice: 50.00,
            total: 50.00,
          },
        ],
        subtotal: 50.00,
        taxRate: 10,
        taxAmount: 5.00,
        total: 55.00,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: QuotationStatus.DRAFT,
      });
      quotationId = quotation.id;
    });

    it('should get store quotations as store owner', async () => {
      const response = await request(app)
        .get(`/api/stores/${storeId}/quotations`)
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quotations).toBeDefined();
      expect(Array.isArray(response.body.data.quotations)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get(`/api/stores/${storeId}/quotations`)
        .expect(401);
    });

    it('should fail as customer', async () => {
      await request(app)
        .get(`/api/stores/${storeId}/quotations`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe('GET /quotations/customer/quotations', () => {
    it('should get customer quotations', async () => {
      const response = await request(app)
        .get('/api/quotations/customer/quotations')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quotations).toBeDefined();
      expect(Array.isArray(response.body.data.quotations)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get('/api/quotations/customer/quotations')
        .expect(401);
    });

    it('should fail as store owner', async () => {
      await request(app)
        .get('/api/quotations/customer/quotations')
        .set('Authorization', `Bearer ${storeOwnerToken}`)
        .expect(403);
    });
  });

  describe('Quotation approval workflow', () => {
    let quotationId: string;

    beforeAll(async () => {
      // Create a quotation for approval testing
      const quotation = await Quotation.create({
        serviceRequestId: serviceRequestId,
        quotationNumber: 'QUO-APPROVAL-001',
        createdById: (await User.findOne({ where: { role: UserRole.STORE_OWNER } }))!.id,
        lineItems: [
          {
            id: 'item_1',
            description: 'Approval test service',
            quantity: 1,
            unitPrice: 100.00,
            total: 100.00,
          },
        ],
        subtotal: 100.00,
        taxRate: 10,
        taxAmount: 10.00,
        total: 110.00,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: QuotationStatus.SENT,
      });
      quotationId = quotation.id;
    });

    it('should approve quotation as customer', async () => {
      const response = await request(app)
        .post(`/api/quotations/customer/quotations/${quotationId}/approve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quotation.status).toBe(QuotationStatus.APPROVED);
    });

    it('should fail to approve already approved quotation', async () => {
      await request(app)
        .post(`/api/quotations/customer/quotations/${quotationId}/approve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(409); // Conflict
    });
  });
});