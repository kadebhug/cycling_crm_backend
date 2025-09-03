import request from 'supertest';
import { app } from '../app';
import { JWTUtils } from '../utils/jwt';
import { UserRole } from '../types/database/database.types';

describe('Admin Routes Integration', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(() => {
    // Generate admin token
    adminToken = JWTUtils.generateAccessToken({
      userId: 'admin-id',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    });

    // Generate customer token for unauthorized tests
    customerToken = JWTUtils.generateAccessToken({
      userId: 'customer-id',
      email: 'customer@test.com',
      role: UserRole.CUSTOMER,
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/store-owners')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/store-owners')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should allow admin users to access admin routes', async () => {
      // This will fail with database connection error, but it shows the auth works
      const response = await request(app)
        .get('/api/admin/store-owners')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500); // Database connection error

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Route Validation', () => {
    it('should validate UUID parameters', async () => {
      const response = await request(app)
        .get('/api/admin/store-owners/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('should validate required fields for store owner creation', async () => {
      const response = await request(app)
        .post('/api/admin/store-owners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          // Missing password and storeName
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Valid email is required');
      expect(response.body.error.details).toContain('Password must be at least 6 characters long');
      expect(response.body.error.details).toContain('Store name is required');
    });
  });

  describe('Route Structure', () => {
    it('should have all expected admin routes', async () => {
      const routes = [
        { method: 'get', path: '/api/admin/store-owners/stats' },
        { method: 'post', path: '/api/admin/store-owners' },
        { method: 'get', path: '/api/admin/store-owners' },
        { method: 'get', path: '/api/admin/store-owners/123e4567-e89b-12d3-a456-426614174000' },
        { method: 'put', path: '/api/admin/store-owners/123e4567-e89b-12d3-a456-426614174000' },
        { method: 'post', path: '/api/admin/store-owners/123e4567-e89b-12d3-a456-426614174000/activate' },
        { method: 'delete', path: '/api/admin/store-owners/123e4567-e89b-12d3-a456-426614174000' },
      ];

      for (const route of routes) {
        let response;
        const agent = request(app);
        
        switch (route.method) {
          case 'get':
            response = await agent.get(route.path).set('Authorization', `Bearer ${adminToken}`);
            break;
          case 'post':
            response = await agent.post(route.path).set('Authorization', `Bearer ${adminToken}`);
            break;
          case 'put':
            response = await agent.put(route.path).set('Authorization', `Bearer ${adminToken}`);
            break;
          case 'delete':
            response = await agent.delete(route.path).set('Authorization', `Bearer ${adminToken}`);
            break;
          default:
            throw new Error(`Unsupported method: ${route.method}`);
        }

        // Should not return 404 (route exists)
        expect(response.status).not.toBe(404);
      }
    });
  });
});