// Authentication utilities
export { JWTUtils, TokenPayload, AuthTokens } from './jwt';
export { PasswordUtils } from './password';

// Re-export commonly used types
export type { 
  LoginCredentials,
  RegisterData,
  AuthResult,
  AuthenticatedUser,
  PasswordValidationResult,
  AuthenticationError,
  AuthorizationError,
  TokenExpiredError,
  InvalidTokenError,
  PasswordValidationError
} from '../types/auth.types';