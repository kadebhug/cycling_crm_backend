// Common validation schemas

import Joi from 'joi';

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('id', 'createdAt', 'updatedAt', 'name', 'email'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  search: Joi.string().min(1).max(100),
});

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const emailSchema = Joi.string().email().required();

export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
