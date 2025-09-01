import swaggerJsdoc from 'swagger-jsdoc';
import { UserRole, Permission } from '../types/database/database.types';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cycling CRM API',
      version: '1.0.0',
      description: 'Backend system for managing bicycle maintenance services',
      contact: {
        name: 'API Support',
        email: 'support@cyclingcrm.com',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.cyclingcrm.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
      },
      schemas: {
        // Common response schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-01T00:00:00.000Z',
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-01T00:00:00.000Z',
                },
                path: {
                  type: 'string',
                  example: '/api/auth/login',
                },
              },
            },
          },
        },
        
        // Auth schemas
        LoginCredentials: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'SecurePassword123!',
              description: 'User password (minimum 8 characters)',
            },
          },
        },
        
        RegisterData: {
          type: 'object',
          required: ['email', 'password', 'role'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'newuser@example.com',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'SecurePassword123!',
              description: 'User password (minimum 8 characters)',
            },
            firstName: {
              type: 'string',
              example: 'John',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              description: 'User last name',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              description: 'User phone number',
            },
            role: {
              type: 'string',
              enum: Object.values(UserRole),
              example: UserRole.CUSTOMER,
              description: 'User role in the system',
            },
          },
        },
        
        AuthResult: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'JWT refresh token',
            },
            expiresIn: {
              type: 'number',
              example: 3600,
              description: 'Token expiration time in seconds',
            },
          },
        },
        
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'User email address',
            },
            role: {
              type: 'string',
              enum: Object.values(UserRole),
              example: UserRole.CUSTOMER,
              description: 'User role in the system',
            },
            firstName: {
              type: 'string',
              nullable: true,
              example: 'John',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              nullable: true,
              example: 'Doe',
              description: 'User last name',
            },
            phone: {
              type: 'string',
              nullable: true,
              example: '+1234567890',
              description: 'User phone number',
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Whether the user account is active',
            },
            emailVerified: {
              type: 'boolean',
              example: true,
              description: 'Whether the user email is verified',
            },
          },
        },
        
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'JWT refresh token',
            },
          },
        },
        
        PasswordResetRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'Email address for password reset',
            },
          },
        },
        
        PasswordResetConfirm: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: {
              type: 'string',
              example: 'reset-token-123',
              description: 'Password reset token',
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              example: 'NewSecurePassword123!',
              description: 'New password (minimum 8 characters)',
            },
          },
        },
        
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              example: 'CurrentPassword123!',
              description: 'Current password',
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              example: 'NewSecurePassword123!',
              description: 'New password (minimum 8 characters)',
            },
          },
        },
        
        EmailVerificationRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              example: 'verification-token-123',
              description: 'Email verification token',
            },
          },
        },
        
        // Health check schema
        HealthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Cycling CRM API is running',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            environment: {
              type: 'string',
              example: 'development',
            },
          },
        },
        
        // API info schema
        ApiInfoResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Cycling CRM API v1.0.0',
            },
            documentation: {
              type: 'string',
              example: '/api/docs',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);