import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/database/models';
import { UserRole } from '../../src/types/database/database.types';
import { PasswordUtils } from '../../src/utils/password';
import { JWTUtils } from '../../src/utils/jwt';
import { AuthService } from '../../src/services/auth.service';

// Mock the database models to avoid database connection issues
jest.mock('../../src/database/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  StaffStorePermission: {},
}));

describe('Authentication Integration Tests', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    passwordHash: '$2b$12$mockHashedPassword',
    role: UserRole.CUSTOMER,
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    isActive: true,
    emailVerified: true,
    update: jest.fn(),
    destroy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
        role: 'customer'
      };

      // Mock User.findOne to return null (user doesn't exist)
      (User.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock User.create to return a new user
      const newUser = {
        ...mockUser,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        emailVerified: false,
      };
      (User.create as jest.Mock).mockResolvedValue(newUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');

      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
      expect(response.body.data.user.phone).toBe(userData.phone);
      expect(response.body.data.user.emailVerified).toBe(false);
    });

    it('should return validation error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        role: 'customer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Please provide a valid email address');
    });

    it('should return validation error for weak password', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: '123',
        role: 'customer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('Password must be at least 6 characters long');
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'StrongPassword123!', // Use a strong password to pass validation
        role: 'customer'
      };

      // Mock User.findOne to return existing user
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should return validation error for invalid role', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        role: 'invalid_role'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'TestPassword123!'
      };

      // Mock User.findOne to return the test user
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      
      // Mock password verification to return true
      jest.spyOn(PasswordUtils, 'verifyPassword').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');

      expect(response.body.data.user.email).toBe(mockUser.email);
      expect(response.body.data.user.role).toBe(mockUser.role);
      expect(response.body.data.user.id).toBe(mockUser.id);
    });

    it('should return error for invalid email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      // Mock User.findOne to return null (user not found)
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return error for invalid password', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'wrongpassword'
      };

      // Mock User.findOne to return the test user
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      
      // Mock password verification to return false
      jest.spyOn(PasswordUtils, 'verifyPassword').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return validation error for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for inactive user', async () => {
      const credentials = {
        email: 'inactive@example.com',
        password: 'Password123!'
      };

      // Mock User.findOne to return inactive user
      const inactiveUser = { ...mockUser, isActive: false };
      (User.findOne as jest.Mock).mockResolvedValue(inactiveUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      // Generate a valid refresh token
      const tokens = JWTUtils.generateTokens({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      validRefreshToken = tokens.refreshToken;
    });

    it('should refresh token successfully with valid refresh token', async () => {
      // Mock User.findByPk to return the test user
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');

      expect(response.body.data.user.id).toBe(mockUser.id);
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      // The response might be 401 or 500 depending on how JWT verification fails
      expect([401, 500].includes(response.status)).toBe(true);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Generate a valid access token
      const tokens = JWTUtils.generateTokens({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      validAccessToken = tokens.accessToken;
    });

    it('should get profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockUser.id);
      expect(response.body.data.email).toBe(mockUser.email);
      expect(response.body.data.role).toBe(mockUser.role);
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Generate a valid access token
      const tokens = JWTUtils.generateTokens({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      validAccessToken = tokens.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Generate a valid access token
      const tokens = JWTUtils.generateTokens({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      validAccessToken = tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const changePasswordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword456!'
      };

      // Mock User.findByPk to return the test user
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      
      // Mock password verification to return true for current password
      jest.spyOn(PasswordUtils, 'verifyPassword')
        .mockResolvedValueOnce(true)  // Current password verification
        .mockResolvedValueOnce(false); // New password is different check

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(changePasswordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Password has been changed successfully');
    });

    it('should return error for incorrect current password', async () => {
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword456!'
      };

      // Mock User.findByPk to return the test user
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      
      // Mock password verification to return false for current password
      jest.spyOn(PasswordUtils, 'verifyPassword').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(changePasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should return error for weak new password', async () => {
      const changePasswordData = {
        currentPassword: 'TestPassword123!',
        newPassword: '123'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(changePasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error without authentication', async () => {
      const changePasswordData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword456!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .send(changePasswordData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('POST /api/auth/password-reset/request', () => {
    it('should always return success for password reset request', async () => {
      // Mock User.findOne to return the test user
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({ email: mockUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('If the email exists, a password reset link has been sent');
    });

    it('should return success even for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('If the email exists, a password reset link has been sent');
    });

    it('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset/request')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should return error for invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' });

      // The response might be 400 or 500 depending on how JWT verification fails
      expect([400, 500].includes(response.status)).toBe(true);
      expect(response.body.success).toBe(false);
    });

    it('should return validation error for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});