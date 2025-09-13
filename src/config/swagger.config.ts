import swaggerJsdoc from 'swagger-jsdoc';
import { UserRole, Permission } from '../types/database/database.types';
import { additionalSchemas } from '../docs/swagger-schemas';

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
        
        // Store Owner schemas
        StoreOwner: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
              description: 'Store owner unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'owner@example.com',
              description: 'Store owner email address',
            },
            firstName: {
              type: 'string',
              example: 'John',
              description: 'Store owner first name',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              description: 'Store owner last name',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              description: 'Store owner phone number',
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Whether the store owner account is active',
            },
            emailVerified: {
              type: 'boolean',
              example: true,
              description: 'Whether the store owner email is verified',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Last update timestamp',
            },
          },
        },
        
        CreateStoreOwnerRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'owner@example.com',
              description: 'Store owner email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'SecurePassword123!',
              description: 'Store owner password (minimum 8 characters)',
            },
            firstName: {
              type: 'string',
              example: 'John',
              description: 'Store owner first name',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              description: 'Store owner last name',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              description: 'Store owner phone number',
            },
          },
        },
        
        UpdateStoreOwnerRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
              description: 'Store owner first name',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              description: 'Store owner last name',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              description: 'Store owner phone number',
            },
          },
        },
        
        StoreOwnerStats: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              example: 25,
              description: 'Total number of store owners',
            },
            active: {
              type: 'number',
              example: 23,
              description: 'Number of active store owners',
            },
            inactive: {
              type: 'number',
              example: 2,
              description: 'Number of inactive store owners',
            },
            verified: {
              type: 'number',
              example: 20,
              description: 'Number of email verified store owners',
            },
            unverified: {
              type: 'number',
              example: 5,
              description: 'Number of unverified store owners',
            },
          },
        },
        
        // Staff schemas
        Staff: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
              description: 'Staff member unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'staff@example.com',
              description: 'Staff member email address',
            },
            firstName: {
              type: 'string',
              example: 'Jane',
              description: 'Staff member first name',
            },
            lastName: {
              type: 'string',
              example: 'Smith',
              description: 'Staff member last name',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              description: 'Staff member phone number',
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Whether the staff member account is active',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(Permission),
              },
              example: [Permission.VIEW_SERVICES, Permission.CREATE_SERVICES],
              description: 'Staff member permissions',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Last update timestamp',
            },
          },
        },
        
        CreateStaffRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'staff@example.com',
              description: 'Staff member email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'SecurePassword123!',
              description: 'Staff member password (minimum 8 characters)',
            },
            firstName: {
              type: 'string',
              example: 'Jane',
              description: 'Staff member first name',
            },
            lastName: {
              type: 'string',
              example: 'Smith',
              description: 'Staff member last name',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              description: 'Staff member phone number',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(Permission),
              },
              example: [Permission.VIEW_SERVICES, Permission.CREATE_SERVICES],
              description: 'Initial permissions for the staff member',
            },
          },
        },
        
        UpdateStaffRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              example: 'Jane',
              description: 'Staff member first name',
            },
            lastName: {
              type: 'string',
              example: 'Smith',
              description: 'Staff member last name',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
              description: 'Staff member phone number',
            },
          },
        },
        
        UpdateStaffPermissionsRequest: {
          type: 'object',
          required: ['permissions'],
          properties: {
            permissions: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(Permission),
              },
              example: [Permission.VIEW_SERVICES, Permission.CREATE_SERVICES, Permission.CREATE_QUOTATIONS],
              description: 'Updated permissions for the staff member',
            },
          },
        },
        
        AvailablePermissions: {
          type: 'object',
          properties: {
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: {
                    type: 'string',
                    example: 'VIEW_SERVICES',
                    description: 'Permission key',
                  },
                  name: {
                    type: 'string',
                    example: 'View Services',
                    description: 'Human-readable permission name',
                  },
                  description: {
                    type: 'string',
                    example: 'Allows viewing service requests and records',
                    description: 'Permission description',
                  },
                },
              },
            },
          },
        },
        
        // Pagination schema
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              example: 1,
              description: 'Current page number',
            },
            limit: {
              type: 'number',
              example: 20,
              description: 'Items per page',
            },
            total: {
              type: 'number',
              example: 100,
              description: 'Total number of items',
            },
            totalPages: {
              type: 'number',
              example: 5,
              description: 'Total number of pages',
            },
            hasNext: {
              type: 'boolean',
              example: true,
              description: 'Whether there is a next page',
            },
            hasPrev: {
              type: 'boolean',
              example: false,
              description: 'Whether there is a previous page',
            },
          },
        },
        
        // Additional schemas from swagger-schemas.ts
        ...additionalSchemas,
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'MISSING_TOKEN',
                  message: 'Authentication token is required',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/media/upload',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Access denied - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'INSUFFICIENT_PERMISSIONS',
                  message: 'You do not have permission to perform this action',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/media/upload',
                },
              },
            },
          },
        },
        BadRequest: {
          description: 'Bad request - invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: ['entityType is required', 'entityId must be a valid UUID'],
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/media/upload',
                },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'An unexpected error occurred',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/media/upload',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error - invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid input data',
                  details: ['Field is required', 'Invalid format'],
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/customers/bikes',
                },
              },
            },
          },
        },
        Conflict: {
          description: 'Conflict - resource already exists or invalid state',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'CONFLICT',
                  message: 'Resource already exists or invalid state transition',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/customers/bikes',
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/customers/bikes/123',
                },
              },
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
      {
        name: 'Admin',
        description: 'Administrative operations for managing store owners',
      },
      {
        name: 'Stores',
        description: 'Store management and staff operations',
      },
      {
        name: 'Customers',
        description: 'Customer operations and bike management',
      },
      {
        name: 'Customer Bikes',
        description: 'Customer bike registration and management',
      },
      {
        name: 'Customer Service Requests',
        description: 'Customer service request creation and management',
      },
      {
        name: 'Store Service Requests',
        description: 'Store-side service request management and workflow',
      },
      {
        name: 'Media',
        description: 'File upload and media management operations',
      },
      {
        name: 'Services',
        description: 'Service management operations for stores',
      },
      {
        name: 'Quotations',
        description: 'Quotation management for stores',
      },
      {
        name: 'Customer Quotations',
        description: 'Customer-facing quotation operations',
      },
      {
        name: 'Staff Service Records',
        description: 'Staff service record management operations',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/api/routes/*.ts',
    './src/controllers/*.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);