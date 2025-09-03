import Joi from 'joi';
import { Permission } from '../types/database/database.types';

// Create staff validation schema
export const createStaffSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required',
    }),
  firstName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.min': 'First name must be at least 1 character long',
      'string.max': 'First name must not exceed 100 characters',
    }),
  lastName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Last name must be at least 1 character long',
      'string.max': 'Last name must not exceed 100 characters',
    }),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Phone number must be a valid format',
    }),
  permissions: Joi.array()
    .items(Joi.string().valid(...Object.values(Permission)))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission is required',
      'any.required': 'Permissions are required',
      'any.only': 'Invalid permission provided',
    }),
});

// Update staff validation schema
export const updateStaffSchema = Joi.object({
  firstName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .allow('', null)
    .messages({
      'string.min': 'First name must be at least 1 character long',
      'string.max': 'First name must not exceed 100 characters',
    }),
  lastName: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .allow('', null)
    .messages({
      'string.min': 'Last name must be at least 1 character long',
      'string.max': 'Last name must not exceed 100 characters',
    }),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Phone number must be a valid format',
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
    }),
});

// Update staff permissions validation schema
export const updateStaffPermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(Joi.string().valid(...Object.values(Permission)))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission is required',
      'any.required': 'Permissions are required',
      'any.only': 'Invalid permission provided',
    }),
});

// Add staff to store validation schema
export const addStaffToStoreSchema = Joi.object({
  permissions: Joi.array()
    .items(Joi.string().valid(...Object.values(Permission)))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission is required',
      'any.required': 'Permissions are required',
      'any.only': 'Invalid permission provided',
    }),
});

// Store ID parameter validation
export const storeIdParamSchema = Joi.object({
  storeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Store ID must be a valid UUID',
      'any.required': 'Store ID is required',
    }),
});

// Staff ID parameter validation
export const staffIdParamSchema = Joi.object({
  staffId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Staff ID must be a valid UUID',
      'any.required': 'Staff ID is required',
    }),
});

// Combined store and staff ID parameter validation
export const storeStaffParamsSchema = Joi.object({
  storeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Store ID must be a valid UUID',
      'any.required': 'Store ID is required',
    }),
  staffId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Staff ID must be a valid UUID',
      'any.required': 'Staff ID is required',
    }),
});