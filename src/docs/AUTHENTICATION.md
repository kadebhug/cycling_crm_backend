# Authentication and Authorization System

This document describes the authentication and authorization system implemented for the Cycling CRM API.

## Overview

The system provides:
- JWT-based authentication
- Role-based access control (RBAC)
- Store-level permission management
- Password security with bcrypt hashing
- Email verification
- Password reset functionality
- Comprehensive input validation

## Architecture

### Components

1. **JWT Utilities** (`src/utils/jwt.ts`)
   - Token generation and validation
   - Support for access tokens, refresh tokens, and special-purpose tokens

2. **Password Utilities** (`src/utils/password.ts`)
   - Secure password hashing with bcrypt
   - Password strength validation
   - Secure password generation

3. **Authentication Middleware** (`src/middleware/auth.middleware.ts`)
   - JWT token verification
   - Role-based access control
   - Optional authentication support

4. **Permission Middleware** (`src/middleware/permission.middleware.ts`)
   - Store-level access control
   - Permission-based authorization
   - Resource ownership validation

5. **Validation Middleware** (`src/middleware/validation.middleware.ts`)
   - Input validation using Joi schemas
   - Data sanitization
   - Common validation patterns

6. **Authentication Service** (`src/services/auth.service.ts`)
   - Business logic for authentication operations
   - User registration and login
   - Password management
   - Token management

## User Roles

The system supports four user roles:

- **Admin**: Full system access
- **Store Owner**: Manages their own stores and staff
- **Staff**: Limited access based on store permissions
- **Customer**: Access to their own resources only

## Permissions

Store-level permissions include:
- `VIEW_SERVICES`, `CREATE_SERVICES`, `UPDATE_SERVICES`, `DELETE_SERVICES`
- `VIEW_SERVICE_REQUESTS`, `UPDATE_SERVICE_REQUESTS`
- `VIEW_QUOTATIONS`, `CREATE_QUOTATIONS`, `UPDATE_QUOTATIONS`
- `VIEW_SERVICE_RECORDS`, `UPDATE_SERVICE_RECORDS`
- `VIEW_INVOICES`, `CREATE_INVOICES`, `UPDATE_INVOICES`
- `MANAGE_STAFF`
- `UPLOAD_MEDIA`, `VIEW_MEDIA`

## Usage Examples

### Basic Authentication

```typescript
import { AuthMiddleware } from '../middleware/auth.middleware';

// Require authentication
router.get('/protected', AuthMiddleware.authenticate, handler);

// Require specific role
router.get('/admin-only', AuthMiddleware.requireAdmin, handler);

// Require any of multiple roles
router.get('/staff-area', AuthMiddleware.requireAnyRole([UserRole.STAFF, UserRole.STORE_OWNER]), handler);
```

### Store-Level Permissions

```typescript
import { PermissionMiddleware } from '../middleware/permission.middleware';
import { Permission } from '../types/database/database.types';

// Require specific permission for a store
router.post('/stores/:storeId/services', 
  AuthMiddleware.authenticate,
  PermissionMiddleware.requirePermission(Permission.CREATE_SERVICES),
  handler
);

// Require store access
router.get('/stores/:storeId/data',
  AuthMiddleware.authenticate,
  PermissionMiddleware.requireStoreAccess,
  handler
);
```

### Input Validation

```typescript
import { ValidationMiddleware } from '../middleware/validation.middleware';

// Use predefined schemas
router.post('/auth/login',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.login),
  AuthController.login
);

// Custom validation schema
const customSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
  }),
};

router.post('/custom',
  ValidationMiddleware.validate(customSchema),
  handler
);
```

### Password Operations

```typescript
import { PasswordUtils } from '../utils/password';

// Hash password
const hashedPassword = await PasswordUtils.hashPassword('plainPassword');

// Verify password
const isValid = await PasswordUtils.verifyPassword('plainPassword', hashedPassword);

// Validate password strength
const validation = PasswordUtils.validatePasswordStrength('password123');
if (!validation.isValid) {
  console.log('Password errors:', validation.errors);
}

// Generate secure password
const securePassword = PasswordUtils.generateSecurePassword(12);
```

### JWT Operations

```typescript
import { JWTUtils } from '../utils/jwt';

// Generate tokens
const payload = {
  userId: 'user-id',
  email: 'user@example.com',
  role: UserRole.CUSTOMER,
};

const tokens = JWTUtils.generateTokens(payload);

// Verify token
try {
  const decoded = JWTUtils.verifyAccessToken(token);
  console.log('User ID:', decoded.userId);
} catch (error) {
  console.log('Invalid token:', error.message);
}
```

## API Endpoints

### Authentication Routes

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get current user profile

### Password Management

- `POST /auth/password-reset/request` - Request password reset
- `POST /auth/password-reset/confirm` - Confirm password reset
- `POST /auth/change-password` - Change password (authenticated)

### Email Verification

- `POST /auth/verify-email` - Verify email address

## Security Features

### Password Security
- Minimum 6 characters required
- bcrypt hashing with 12 salt rounds
- Password strength validation
- Protection against common passwords

### Token Security
- JWT with configurable expiration
- Separate refresh tokens
- Token validation with issuer/audience checks
- Secure token extraction from headers

### Input Validation
- Comprehensive Joi schemas
- Data sanitization
- SQL injection prevention
- XSS protection through validation

### Access Control
- Role-based permissions
- Store-level data isolation
- Resource ownership validation
- Permission inheritance (Admin > Store Owner > Staff)

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cycling_crm
DB_USER=postgres
DB_PASSWORD=your-password
```

### Auth Configuration

```typescript
// src/config/auth.ts
export const authConfig = {
  jwt: {
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn,
    refreshExpiresIn: config.jwt.refreshExpiresIn,
    issuer: 'cycling-crm-api',
    audience: 'cycling-crm-users',
  },
  bcrypt: {
    saltRounds: 12,
  },
  // ... other settings
};
```

## Error Handling

The system provides structured error responses:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid credentials",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/auth/login"
  }
}
```

Common error codes:
- `MISSING_TOKEN` - No authentication token provided
- `INVALID_TOKEN` - Token is malformed or invalid
- `TOKEN_EXPIRED` - Token has expired
- `INSUFFICIENT_ROLE` - User role doesn't have access
- `INSUFFICIENT_PERMISSIONS` - Missing required permissions
- `STORE_ACCESS_DENIED` - No access to the specified store

## Testing

The authentication system includes comprehensive tests:

```bash
# Run authentication tests
npm test -- --testPathPattern="jwt.test.ts|password.test.ts|auth.middleware.test.ts"

# Run all tests
npm test
```

Test coverage includes:
- JWT token generation and validation
- Password hashing and verification
- Middleware authentication and authorization
- Input validation
- Error handling scenarios

## Best Practices

1. **Always use HTTPS** in production
2. **Validate all inputs** using the validation middleware
3. **Use appropriate permissions** for each endpoint
4. **Implement rate limiting** for authentication endpoints
5. **Log security events** for monitoring
6. **Rotate JWT secrets** regularly
7. **Use strong passwords** and enforce password policies
8. **Implement account lockout** after failed attempts
9. **Monitor for suspicious activity**
10. **Keep dependencies updated**

## Future Enhancements

Potential improvements:
- Token blacklisting for logout
- Multi-factor authentication (MFA)
- OAuth2/OpenID Connect integration
- Account lockout after failed attempts
- Audit logging for security events
- Rate limiting per user/IP
- Session management
- Device tracking
- Passwordless authentication options