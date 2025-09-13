import request from 'supertest';
import { app } from '../../app';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';
import { User } from '../../database/models/User';
import { Store } from '../../database/models/Store';
import { ServiceRecord } from '../../database/models/ServiceRecord';
import { ServiceRequest } from '../../database/models/ServiceRequest';
import { Bike } from '../../database/models/Bike';
import { Media } from '../../database/models/Media';
import { generateToken } from '../../utils/jwt';
import { UserRole, Priority, RequestStatus, ServiceRecordStatus } from '../../types/database/database.types';
import path from 'path';
import fs from 'fs';

describe('Media Integration Tests', () => {
  let adminUser: User;
  let storeOwner: User;
  let staff: User;
  let customer: User;
  let store: Store;
  let bike: Bike;
  let serviceRequest: ServiceRequest;
  let serviceRecord: ServiceRecord;
  let adminToken: string;
  let storeOwnerToken: string;
  let staffToken: string;
  let customerToken: string;

  // Test file paths
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  const testDocumentPath = path.join(__dirname, '../fixtures/test-document.pdf');
  const testLargeFilePath = path.join(__dirname, '../fixtures/large-file.jpg');

  beforeAll(async () => {
    await setupTestDatabase();

    // Create test files if they don't exist
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a small test image (1KB)
    if (!fs.existsSync(testImagePath)) {
      const imageBuffer = Buffer.alloc(1024, 0xFF); // 1KB of 0xFF bytes
      fs.writeFileSync(testImagePath, imageBuffer);
    }

    // Create a test PDF document (2KB)
    if (!fs.existsSync(testDocumentPath)) {
      const pdfBuffer = Buffer.alloc(2048, 0x25); // 2KB of PDF-like data
      fs.writeFileSync(testDocumentPath, pdfBuffer);
    }

    // Create a large file (15MB) for testing size limits
    if (!fs.existsSync(testLargeFilePath)) {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024, 0xFF); // 15MB
      fs.writeFileSync(testLargeFilePath, largeBuffer);
    }
  });

  afterAll(async () => {
    // Clean up test files
    [testImagePath, testDocumentPath, testLargeFilePath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
    });

    storeOwner = await User.create({
      email: 'owner@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STORE_OWNER,
      firstName: 'Store',
      lastName: 'Owner',
      isActive: true,
      emailVerified: true,
    });

    staff = await User.create({
      email: 'staff@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STAFF,
      firstName: 'Staff',
      lastName: 'Member',
      isActive: true,
      emailVerified: true,
    });

    customer = await User.create({
      email: 'customer@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.CUSTOMER,
      firstName: 'Customer',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
    });

    // Create store
    store = await Store.create({
      ownerId: storeOwner.id,
      name: 'Test Bike Shop',
      description: 'A test bike shop',
      isActive: true,
    });

    // Create bike
    bike = await Bike.create({
      customerId: customer.id,
      brand: 'Test Brand',
      model: 'Test Model',
      year: 2023,
    });

    // Create service request
    serviceRequest = await ServiceRequest.create({
      customerId: customer.id,
      bikeId: bike.id,
      storeId: store.id,
      requestedServices: ['Basic Tune-up'],
      priority: Priority.MEDIUM,
      status: RequestStatus.APPROVED,
    });

    // Create service record
    serviceRecord = await ServiceRecord.create({
      serviceRequestId: serviceRequest.id,
      assignedStaffId: staff.id,
      status: ServiceRecordStatus.IN_PROGRESS,
    });

    // Generate tokens
    adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role });
    storeOwnerToken = generateToken({ userId: storeOwner.id, email: storeOwner.email, role: storeOwner.role });
    staffToken = generateToken({ userId: staff.id, email: staff.email, role: staff.role });
    customerToken = generateToken({ userId: customer.id, email: customer.email, role: customer.role });
  });

  afterEach(async () => {
    // Clean up created records
    await Media.destroy({ where: {} });
    await ServiceRecord.destroy({ where: {} });
    await ServiceRequest.destroy({ where: {} });
    await Bike.destroy({ where: {} });
    await Store.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('POST /api/media/upload', () => {
    it('should upload a single file successfully', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        entityType: 'service_record',
        entityId: serviceRecord.id,
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        mediaType: 'image',
      });
      expect(response.body.data.downloadUrl).toContain('/api/media/');
    });

    it('should reject file that is too large', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testLargeFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('should reject unauthorized user', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      expect(response.status).toBe(401);
    });

    it('should reject user without upload permission', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      expect(response.status).toBe(403);
    });

    it('should reject invalid entity type', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'invalid_type')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Entity type \'invalid_type\' is not supported');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .attach('file', testImagePath);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('entityType and entityId are required');
    });
  });

  describe('POST /api/media/upload/multiple', () => {
    it('should upload multiple files successfully', async () => {
      const response = await request(app)
        .post('/api/media/upload/multiple')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('files', testImagePath)
        .attach('files', testDocumentPath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        entityType: 'service_record',
        entityId: serviceRecord.id,
        originalName: 'test-image.jpg',
      });
      expect(response.body.data[1]).toMatchObject({
        entityType: 'service_record',
        entityId: serviceRecord.id,
        originalName: 'test-document.pdf',
      });
    });

    it('should reject when no files provided', async () => {
      const response = await request(app)
        .post('/api/media/upload/multiple')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('No files were uploaded');
    });
  });

  describe('POST /api/media/upload/service-record/:serviceRecordId', () => {
    it('should upload files to service record', async () => {
      const response = await request(app)
        .post(`/api/media/upload/service-record/${serviceRecord.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .attach('files', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data[0]).toMatchObject({
        entityType: 'service_record',
        entityId: serviceRecord.id,
      });
    });
  });

  describe('GET /api/media/entity/:entityType/:entityId', () => {
    let uploadedMedia: any;

    beforeEach(async () => {
      // Upload a test file first
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      uploadedMedia = uploadResponse.body.data;
    });

    it('should get media files by entity', async () => {
      const response = await request(app)
        .get(`/api/media/entity/service_record/${serviceRecord.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: uploadedMedia.id,
        entityType: 'service_record',
        entityId: serviceRecord.id,
      });
    });

    it('should reject unauthorized user', async () => {
      const response = await request(app)
        .get(`/api/media/entity/service_record/${serviceRecord.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/media/:id', () => {
    let uploadedMedia: any;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      uploadedMedia = uploadResponse.body.data;
    });

    it('should get media file by ID', async () => {
      const response = await request(app)
        .get(`/api/media/${uploadedMedia.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: uploadedMedia.id,
        entityType: 'service_record',
        entityId: serviceRecord.id,
      });
    });

    it('should return 404 for non-existent media', async () => {
      const response = await request(app)
        .get('/api/media/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Media file not found');
    });
  });

  describe('GET /api/media/:id/download', () => {
    let uploadedMedia: any;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      uploadedMedia = uploadResponse.body.data;
    });

    it('should download media file', async () => {
      const response = await request(app)
        .get(`/api/media/${uploadedMedia.id}/download`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('test-image.jpg');
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/media/${uploadedMedia.id}/download`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('You do not have permission to access this file');
    });
  });

  describe('GET /api/media/:id/view', () => {
    let uploadedMedia: any;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      uploadedMedia = uploadResponse.body.data;
    });

    it('should view media file inline', async () => {
      const response = await request(app)
        .get(`/api/media/${uploadedMedia.id}/view`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['content-disposition']).toContain('inline');
    });
  });

  describe('DELETE /api/media/:id', () => {
    let uploadedMedia: any;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      uploadedMedia = uploadResponse.body.data;
    });

    it('should delete media file successfully', async () => {
      const response = await request(app)
        .delete(`/api/media/${uploadedMedia.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Media file deleted successfully');

      // Verify file is deleted
      const getResponse = await request(app)
        .get(`/api/media/${uploadedMedia.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject deletion by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/media/${uploadedMedia.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('You do not have permission to delete this file');
    });
  });

  describe('GET /api/media/search', () => {
    beforeEach(async () => {
      // Upload test files
      await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testDocumentPath);
    });

    it('should search media files with filters', async () => {
      const response = await request(app)
        .get('/api/media/search')
        .query({
          entityType: 'service_record',
          entityId: serviceRecord.id,
          mediaType: 'image',
        })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].mediaType).toBe('image');
    });
  });

  describe('GET /api/media/my-uploads', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);
    });

    it('should get current user\'s uploaded files', async () => {
      const response = await request(app)
        .get('/api/media/my-uploads')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].uploadedBy.id).toBe(staff.id);
    });
  });

  describe('PATCH /api/media/:id/metadata', () => {
    let uploadedMedia: any;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('entityType', 'service_record')
        .field('entityId', serviceRecord.id)
        .attach('file', testImagePath);

      uploadedMedia = uploadResponse.body.data;
    });

    it('should update media metadata', async () => {
      const response = await request(app)
        .patch(`/api/media/${uploadedMedia.id}/metadata`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          originalName: 'updated-name.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.originalName).toBe('updated-name.jpg');
    });

    it('should reject update by non-owner', async () => {
      const response = await request(app)
        .patch(`/api/media/${uploadedMedia.id}/metadata`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          originalName: 'updated-name.jpg',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/media/admin/cleanup-orphaned', () => {
    it('should allow admin to cleanup orphaned files', async () => {
      const response = await request(app)
        .post('/api/media/admin/cleanup-orphaned')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deletedFiles');
      expect(response.body.data).toHaveProperty('errors');
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/media/admin/cleanup-orphaned')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Admin access required');
    });
  });
});