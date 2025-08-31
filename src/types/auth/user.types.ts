// Authentication user types

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'manager' | 'staff' | 'customer';

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export interface UserSession {
  userId: number;
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
}
