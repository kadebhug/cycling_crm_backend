import request from 'supertest';
import express from 'express';
import { MediaController } from '../../controllers/media.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
  uploadSingle,
  uploadMultiple,
  setUploadContext,
  validateUploadedFiles,
  cleanupFailedUploads,
  handleUploadError,
} from '../../middleware/upload.middleware';
import { generateToken } from '../../utils/jwt';
import { UserRole } from '../../types/database/database.types';
import path from 'path';
import fs from 'fs';

describe('Media Simple Integration Tests', () => {
  let app: express.Application;
  let mediaController: MediaController;
  let testToken: string;

  // Test file paths
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    mediaController = new MediaController();

    // Create test file if it doesn't exist
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a small test image (1KB)
    if (!fs.existsSync(testImagePath)) {
      const imageBuffer = Buffer.alloc(1024, 0xFF); // 1KB of 0xFF bytes
      fs.writeFileSync(testImagePath, imageBuffer);
    }

    // Generate test token
    testToken = generateToken({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: UserRole.STAFF,
    });

    // Set up routes
    app.post(
      '/api/media/upload',
      authenticateToken,
      setUploadContext('general', 1),
      cleanupFailedUploads,
      uploadSingle('file'),
      handleUploadError,
      validateUploadedFiles,
      mediaController.uploadFile
    );

    app.get(
      '/api/media/:id',
      authenticateToken,
      mediaController.getMediaById
    );

    app.get(
      '/api/media/:id/download',
      authenticateToken,
      mediaController.downloadFile
    );

    app.delete(
      '/api/media/:id',
      authenticateToken,
      mediaController.deleteMedia
    );
  });

  afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  describe('Media Upload and Management', () => {
    it('should have all required components available', () => {
      expect(mediaController).toBeDefined();
      expect(mediaController.uploadFile).toBeDefined();
      expect(mediaController.getMediaById).toBeDefined();
      expect(mediaController.downloadFile).toBeDefined();
      expect(mediaController.deleteMedia).toBeDefined();
    });

    it('should have middleware functions available', () => {
      expect(authenticateToken).toBeDefined();
      expect(uploadSingle).toBeDefined();
      expect(uploadMultiple).toBeDefined();
      expect(setUploadContext).toBeDefined();
      expect(validateUploadedFiles).toBeDefined();
      expect(cleanupFailedUploads).toBeDefined();
      expect(handleUploadError).toBeDefined();
    });

    it('should have test token generated', () => {
      expect(testToken).toBeDefined();
      expect(typeof testToken).toBe('string');
      expect(testToken.length).toBeGreaterThan(0);
    });

    it('should have test file created', () => {
      expect(fs.existsSync(testImagePath)).toBe(true);
      const stats = fs.statSync(testImagePath);
      expect(stats.size).toBe(1024);
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .field('entityType', 'service_record')
        .field('entityId', 'test-entity-id')
        .attach('file', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject upload with invalid token', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', 'Bearer invalid-token')
        .field('entityType', 'service_record')
        .field('entityId', 'test-entity-id')
        .attach('file', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    // Note: We can't test the full upload flow without a database connection
    // But we can verify that the middleware and controller are properly set up
    // and that authentication works correctly
  });
});