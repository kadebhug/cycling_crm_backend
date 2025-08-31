import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { JWTUtils } from '../../../utils/jwt';
import { UserRole } from '../../../types/database/database.types';

// Mock the JWT utils
jest.mock('../../../utils/jwt');
const mockJWTUtils = JWTUtils as jest.Mocked<typeof JWTUtils>;

describe('AuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      path: '/test',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const mockPayload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
        iat: 123456789,
        exp: 123456789 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockJWTUtils.verifyAccessToken.mockReturnValue(mockPayload);

      await AuthMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockJWTUtils.extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid-token');
      expect(mockJWTUtils.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect((mockRequest as AuthenticatedRequest).user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      mockJWTUtils.extractTokenFromHeader.mockReturnValue(null);

      await AuthMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
          timestamp: expect.any(String),
          path: '/test',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJWTUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await AuthMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          timestamp: expect.any(String),
          path: '/test',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('expired-token');
      mockJWTUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await AuthMiddleware.authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
          timestamp: expect.any(String),
          path: '/test',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    const mockUser = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: UserRole.CUSTOMER,
      iat: 123456789,
      exp: 123456789 + 3600,
    };

    it('should allow access for correct role', () => {
      (mockRequest as AuthenticatedRequest).user = mockUser;

      const middleware = AuthMiddleware.requireRole(UserRole.CUSTOMER);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple allowed roles', () => {
      (mockRequest as AuthenticatedRequest).user = mockUser;

      const middleware = AuthMiddleware.requireRole([UserRole.CUSTOMER, UserRole.STAFF]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for incorrect role', () => {
      (mockRequest as AuthenticatedRequest).user = mockUser;

      const middleware = AuthMiddleware.requireRole(UserRole.ADMIN);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Access denied. Required role(s): admin',
          timestamp: expect.any(String),
          path: '/test',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      const middleware = AuthMiddleware.requireRole(UserRole.CUSTOMER);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: expect.any(String),
          path: '/test',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'admin-user-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        iat: 123456789,
        exp: 123456789 + 3600,
      };

      AuthMiddleware.requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin user', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'customer-user-id',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
        iat: 123456789,
        exp: 123456789 + 3600,
      };

      AuthMiddleware.requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user when valid token is provided', async () => {
      const mockPayload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
        iat: 123456789,
        exp: 123456789 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      mockJWTUtils.verifyAccessToken.mockReturnValue(mockPayload);

      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as AuthenticatedRequest).user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without user when no token is provided', async () => {
      mockJWTUtils.extractTokenFromHeader.mockReturnValue(null);

      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without user when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJWTUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJWTUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await AuthMiddleware.optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});