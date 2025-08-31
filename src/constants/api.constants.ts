// API-related constants

export const API_CONFIG = {
  PREFIX: '/api/v1',
  TIMEOUT: 30000,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
} as const;

export const ROUTES = {
  AUTH: '/auth',
  USERS: '/users',
  CUSTOMERS: '/customers',
  STORES: '/stores',
  ADMIN: '/admin',
} as const;

export const HEADERS = {
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  USER_AGENT: 'User-Agent',
} as const;
