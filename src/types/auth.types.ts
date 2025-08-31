import { UserRole, Permission } from './database/database.types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    isActive: boolean;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface UserPermissions {
  storeId: string;
  permissions: Permission[];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  storePermissions?: UserPermissions[];
}

export interface TokenValidationResult {
  isValid: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number;
}

// Error types for authentication
export class AuthenticationError extends Error {
  constructor(message: string, public code: string = 'AUTHENTICATION_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'AUTHORIZATION_ERROR') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class PasswordValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}