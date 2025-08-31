// Authentication and authorization middleware
export { AuthMiddleware, AuthenticatedRequest } from './auth.middleware';
export { PermissionMiddleware } from './permission.middleware';
export { ValidationMiddleware, ValidationSchema } from './validation.middleware';

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