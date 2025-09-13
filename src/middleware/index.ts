// Authentication and authorization middleware
export { AuthMiddleware, AuthenticatedRequest } from './auth.middleware';
export { PermissionMiddleware } from './permission.middleware';
export { ValidationMiddleware, ValidationSchema } from './validation.middleware';

// File upload middleware
export * from './upload.middleware';

// Re-export commonly used types
export type {
  LoginCredentials,
  RegisterData,
  AuthResult,
  AuthenticatedUser,
} from '../types/auth.types';

export type {
  UserRole,
  Permission,
} from '../types/database/database.types';