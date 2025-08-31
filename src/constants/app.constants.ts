// Application-wide constants

export const APP_CONFIG = {
  NAME: 'Cycling CRM API',
  VERSION: '1.0.0',
  DESCRIPTION: 'Cycling Maintenance CRM API - Backend system for managing bicycle maintenance services',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
