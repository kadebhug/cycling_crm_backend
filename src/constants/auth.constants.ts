// Authentication-related constants

export const AUTH_CONFIG = {
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-secret-key',
    EXPIRES_IN: '24h',
    REFRESH_EXPIRES_IN: '7d',
  },
  BCRYPT: {
    SALT_ROUNDS: 12,
  },
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  CUSTOMER: 'customer',
} as const;

export const PERMISSIONS = {
  USER_MANAGEMENT: 'user:manage',
  CUSTOMER_MANAGEMENT: 'customer:manage',
  STORE_MANAGEMENT: 'store:manage',
  ADMIN_ACCESS: 'admin:access',
} as const;
