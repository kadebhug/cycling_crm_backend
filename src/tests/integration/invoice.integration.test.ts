import request from 'supertest';
import { app } from '../../app';
import { sequelize } from '../../config/database';
import { User, Store, ServiceRequest, ServiceRecord, Invoice } from '../../database/models';
import { UserRole, ServiceRecordStatus, PaymentStatus, Priority, RequestStatus } from '../../types/database/database.types';
import { generateToken } from '../../utils/jwt';

describe('Invoice Integration Tests', () => {
  let storeOwner: any;
  let customer: any;
  let store: any;
  let serviceRequest: any;
  let serviceRecord: any;
  let authToken: string;
  let customerToken: string;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clean up database
    await Invoice.destroy({ where: {}, force: true });
    await ServiceRecord.destroy({ where: {}, force: true });
    await ServiceRequest.destroy({ where: {}, force: true });
    await Store.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test users
    storeOwner = await User.create({
      email: 'owner@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STORE_OWNER,
      firstName: 'Store',
      lastName: 'Owner',
      isActive: true,
    });

    customer = await User.create({
      email: 'customer@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.CUSTOMER,
      firstName: 'Test',
      lastName: 'Customer',
      isActive: true,
    });

    // Create test store
    store = await Store.create({
      ownerId: storeOwner.id,
      name: 'Test Bike Shop',
      description: 'A test bike shop',
      address: '123 Test St',
      isActive: true,
    });

    // Create test service request
    serviceRequest = await ServiceRequest.create({
      customerId: customer.id,
      bikeId: 'test-bike-id',
      storeId: store.id,
      requestedServices: ['brake-repair'],
      priority: Priority.MEDIUM,
      customerNotes: 'Brakes are squeaking',
      status: RequestStatus.APPROVED,
    });

    // Create test service record
    serviceRecord = await ServiceRecord.create({
      serviceRequestId: serviceRequest.id,
      assignedStaffId: storeOwner.id,
      status: ServiceRecordStatus.COMPLETED,
      startDate: new Date(),
      completedDate: new Date(),
      workPerformed: 'Replaced brake pads',
      partsUsed: 'Brake pads x2',
      laborHours: 2,
      notes: 'Service completed successfully',
    });

    // Generate auth tokens
    authToken = generateToken({
      userId: storeOwner.id,
      email: storeOwner.email,
      role: storeOwner.role,
    });

    customerToken = generateToken({
      userId: customer.id,
      email: customer.email,
      role: customer.role,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/stores/:storeId/invoices', () => {
    const createInvoiceData = {
      serviceRecordId: '',
      taxRate: 8.5,
      lineItems: [
        {
          description: 'Brake pad replacement',
          quantity: 2,
          unitPrice: 25.00,
        },
        {
          description: 'Labor',
          quantity: 2,
          unitPrice: 50.00,
        },
      ],
      dueDays: 30,
      notes: 'Payment due within 30 days',
    };

    it('should create invoice successfully', async () => {
      createInvoiceData.serviceRecordId = serviceRecord.id;

      const response = await request(app)
        .post(`/api/stores/${store.id}/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createInvoiceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('invoiceNumber');
      expect(response.body.data.serviceRecordId).toBe(serviceRecord.id);
      expect(response.body.data.taxRate).toBe(8.5);
      expect(response.body.data.lineItems).toHaveLength(2);
      expect(response.body.data.subtotal).toBe(150.00);
      expect(response.body.data.taxAmount).toBe(12.75);
      expect(response.body.data.total).toBe(162.75);
      expect(response.body.data.paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        ...createInvoiceData,
        serviceRecordId: serviceRecord.id,
        taxRate: 150, // Invalid tax rate
      };

      const response = await request(app)
        .post(`/api/stores/${store.id}/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Tax rate must be between 0 and 100');
    });

    it('should return 404 for non-existent service record', async () => {
      const invalidData = {
        ...createInvoiceData,
        serviceRecordId: 'non-existent-id',
      };

      const response = await request(app)
        .post(`/api/stores/${store.id}/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Service record not found');
    });

    it('should return 409 for service record that is not completed', async () => {
      // Update service record to in-progress
      await serviceRecord.update({ status: ServiceRecordStatus.IN_PROGRESS });

      createInvoiceData.serviceRecordId = serviceRecord.id;

      const response = await request(app)
        .post(`/api/stores/${store.id}/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createInvoiceData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Service record must be completed before invoicing');
    });

    it('should return 401 without authentication', async () => {
      createInvoiceData.serviceRecordId = serviceRecord.id;

      await request(app)
        .post(`/api/stores/${store.id}/invoices`)
        .send(createInvoiceData)
        .expect(401);
    });
  });

  describe('GET /api/stores/:storeId/invoices', () => {
    let invoice: any;

    beforeEach(async () => {
      // Create a test invoice
      invoice = await Invoice.create({
        serviceRecordId: serviceRecord.id,
        invoiceNumber: 'INV-20240115-123456',
        createdById: storeOwner.id,
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
      });
    });

    it('should get store invoices successfully', async () => {
      const response = await request(app)
        .get(`/api/stores/${store.id}/invoices`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(invoice.id);
      expect(response.body.data[0].invoiceNumber).toBe('INV-20240115-123456');
    });

    it('should filter invoices by payment status', async () => {
      const response = await request(app)
        .get(`/api/stores/${store.id}/invoices?paymentStatus=pending`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('should return paginated results', async () => {
      const response = await request(app)
        .get(`/api/stores/${store.id}/invoices?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total', 1);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/stores/${store.id}/invoices`)
        .expect(401);
    });
  });

  describe('GET /api/stores/:storeId/invoices/:invoiceId', () => {
    let invoice: any;

    beforeEach(async () => {
      invoice = await Invoice.create({
        serviceRecordId: serviceRecord.id,
        invoiceNumber: 'INV-20240115-123456',
        createdById: storeOwner.id,
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
      });
    });

    it('should get invoice by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/stores/${store.id}/invoices/${invoice.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(invoice.id);
      expect(response.body.data.invoiceNumber).toBe('INV-20240115-123456');
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await request(app)
        .get(`/api/stores/${store.id}/invoices/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invoice not found');
    });
  });

  describe('POST /api/stores/:storeId/invoices/:invoiceId/payment', () => {
    let invoice: any;

    beforeEach(async () => {
      invoice = await Invoice.create({
        serviceRecordId: serviceRecord.id,
        invoiceNumber: 'INV-20240115-123456',
        createdById: storeOwner.id,
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
      });
    });

    it('should record payment successfully', async () => {
      const paymentData = {
        amount: 25.00,
        paymentDate: '2024-01-20T10:00:00Z',
        notes: 'Cash payment',
      };

      const response = await request(app)
        .post(`/api/stores/${store.id}/invoices/${invoice.id}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paidAmount).toBe(25.00);
      expect(response.body.data.paymentStatus).toBe(PaymentStatus.PARTIAL);
    });

    it('should return 400 for invalid payment amount', async () => {
      const paymentData = {
        amount: 0, // Invalid amount
        notes: 'Invalid payment',
      };

      const response = await request(app)
        .post(`/api/stores/${store.id}/invoices/${invoice.id}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Payment amount must be a positive number');
    });

    it('should return 400 for payment exceeding remaining balance', async () => {
      const paymentData = {
        amount: 100.00, // More than total
        notes: 'Excessive payment',
      };

      const response = await request(app)
        .post(`/api/stores/${store.id}/invoices/${invoice.id}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Payment amount cannot exceed remaining balance');
    });
  });

  describe('GET /api/customer/invoices', () => {
    let invoice: any;

    beforeEach(async () => {
      invoice = await Invoice.create({
        serviceRecordId: serviceRecord.id,
        invoiceNumber: 'INV-20240115-123456',
        createdById: storeOwner.id,
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
      });
    });

    it('should get customer invoices successfully', async () => {
      const response = await request(app)
        .get('/api/customer/invoices')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(invoice.id);
    });

    it('should return 403 for non-customer user', async () => {
      const response = await request(app)
        .get('/api/customer/invoices')
        .set('Authorization', `Bearer ${authToken}`) // Store owner token
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/stores/:storeId/invoices/stats', () => {
    beforeEach(async () => {
      // Create multiple invoices with different statuses
      await Invoice.bulkCreate([
        {
          serviceRecordId: serviceRecord.id,
          invoiceNumber: 'INV-001',
          createdById: storeOwner.id,
          lineItems: [{ id: '1', description: 'Service 1', quantity: 1, unitPrice: 100, total: 100 }],
          subtotal: 100,
          taxRate: 10,
          taxAmount: 10,
          total: 110,
          paidAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          dueDate: new Date('2024-02-14'),
        },
        {
          serviceRecordId: serviceRecord.id,
          invoiceNumber: 'INV-002',
          createdById: storeOwner.id,
          lineItems: [{ id: '2', description: 'Service 2', quantity: 1, unitPrice: 200, total: 200 }],
          subtotal: 200,
          taxRate: 10,
          taxAmount: 20,
          total: 220,
          paidAmount: 220,
          paymentStatus: PaymentStatus.PAID,
          dueDate: new Date('2024-02-14'),
          paidDate: new Date('2024-01-20'),
        },
      ]);
    });

    it('should get invoice statistics successfully', async () => {
      const response = await request(app)
        .get(`/api/stores/${store.id}/invoices/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total', 2);
      expect(response.body.data).toHaveProperty('totalValue', 330);
      expect(response.body.data).toHaveProperty('totalPaid', 220);
      expect(response.body.data).toHaveProperty('totalOutstanding', 110);
      expect(response.body.data.byStatus).toHaveProperty(PaymentStatus.PENDING, 1);
      expect(response.body.data.byStatus).toHaveProperty(PaymentStatus.PAID, 1);
    });
  });
});