import request from 'supertest';
import app from '../app';

describe('App', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Cycling CRM API is running',
        timestamp: expect.any(String),
        environment: expect.any(String),
      });
    });
  });

  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Cycling CRM API v1.0.0',
        documentation: '/api/docs',
      });
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          path: '/nonexistent',
          timestamp: expect.any(String),
        },
      });
    });
  });
});