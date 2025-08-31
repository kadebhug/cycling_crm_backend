import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export class ValidationMiddleware {
  /**
   * Middleware to validate request data against Joi schemas
   */
  static validate = (schema: ValidationSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors: string[] = [];

      // Validate request body
      if (schema.body) {
        const { error } = schema.body.validate(req.body, { abortEarly: false });
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        }
      }

      // Validate request params
      if (schema.params) {
        const { error } = schema.params.validate(req.params, { abortEarly: false });
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        }
      }

      // Validate request query
      if (schema.query) {
        const { error } = schema.query.validate(req.query, { abortEarly: false });
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        }
      }

      // Validate request headers
      if (schema.headers) {
        const { error } = schema.headers.validate(req.headers, { abortEarly: false });
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        }
      }

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      next();
    };
  };

  /**
   * Common validation schemas for authentication
   */
  static schemas = {
    // Login validation
    login: {
      body: Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required',
        }),
        password: Joi.string().min(6).required().messages({
          'string.min': 'Password must be at least 6 characters long',
          'any.required': 'Password is required',
        }),
      }),
    },

    // Registration validation
    register: {
      body: Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required',
        }),
        password: Joi.string().min(6).required().messages({
          'string.min': 'Password must be at least 6 characters long',
          'any.required': 'Password is required',
        }),
        firstName: Joi.string().max(100).optional().allow('').messages({
          'string.max': 'First name cannot exceed 100 characters',
        }),
        lastName: Joi.string().max(100).optional().allow('').messages({
          'string.max': 'Last name cannot exceed 100 characters',
        }),
        phone: Joi.string().max(20).optional().allow('').messages({
          'string.max': 'Phone number cannot exceed 20 characters',
        }),
        role: Joi.string().valid('admin', 'store_owner', 'staff', 'customer').required().messages({
          'any.only': 'Role must be one of: admin, store_owner, staff, customer',
          'any.required': 'Role is required',
        }),
      }),
    },

    // Password reset request validation
    passwordResetRequest: {
      body: Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required',
        }),
      }),
    },

    // Password reset confirmation validation
    passwordResetConfirm: {
      body: Joi.object({
        token: Joi.string().required().messages({
          'any.required': 'Reset token is required',
        }),
        newPassword: Joi.string().min(6).required().messages({
          'string.min': 'Password must be at least 6 characters long',
          'any.required': 'New password is required',
        }),
      }),
    },

    // Change password validation
    changePassword: {
      body: Joi.object({
        currentPassword: Joi.string().required().messages({
          'any.required': 'Current password is required',
        }),
        newPassword: Joi.string().min(6).required().messages({
          'string.min': 'New password must be at least 6 characters long',
          'any.required': 'New password is required',
        }),
      }),
    },

    // Refresh token validation
    refreshToken: {
      body: Joi.object({
        refreshToken: Joi.string().required().messages({
          'any.required': 'Refresh token is required',
        }),
      }),
    },

    // Email verification validation
    emailVerification: {
      body: Joi.object({
        token: Joi.string().required().messages({
          'any.required': 'Verification token is required',
        }),
      }),
    },

    // UUID parameter validation
    uuidParam: {
      params: Joi.object({
        id: Joi.string().uuid().required().messages({
          'string.guid': 'Invalid ID format',
          'any.required': 'ID is required',
        }),
      }),
    },

    // Store ID parameter validation
    storeIdParam: {
      params: Joi.object({
        storeId: Joi.string().uuid().required().messages({
          'string.guid': 'Invalid store ID format',
          'any.required': 'Store ID is required',
        }),
      }),
    },

    // Pagination query validation
    pagination: {
      query: Joi.object({
        page: Joi.number().integer().min(1).default(1).messages({
          'number.base': 'Page must be a number',
          'number.integer': 'Page must be an integer',
          'number.min': 'Page must be at least 1',
        }),
        limit: Joi.number().integer().min(1).max(100).default(10).messages({
          'number.base': 'Limit must be a number',
          'number.integer': 'Limit must be an integer',
          'number.min': 'Limit must be at least 1',
          'number.max': 'Limit cannot exceed 100',
        }),
        sortBy: Joi.string().optional().messages({
          'string.base': 'Sort by must be a string',
        }),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc').messages({
          'any.only': 'Sort order must be either "asc" or "desc"',
        }),
      }),
    },
  };

  /**
   * Sanitize input data by trimming strings and removing empty values
   */
  static sanitize = (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = ValidationMiddleware.sanitizeObject(req.body);
    }

    // Sanitize query
    if (req.query && typeof req.query === 'object') {
      req.query = ValidationMiddleware.sanitizeObject(req.query);
    }

    next();
  };

  /**
   * Helper method to sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => ValidationMiddleware.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed !== '') {
            sanitized[key] = trimmed;
          }
        } else if (value !== null && value !== undefined) {
          sanitized[key] = ValidationMiddleware.sanitizeObject(value);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate phone number format (basic validation)
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}