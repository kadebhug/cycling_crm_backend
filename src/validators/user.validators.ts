// User validation schemas

import Joi from 'joi';
import { emailSchema, idParamSchema } from './common.validators';

export const createUserSchema = Joi.object({
  email: emailSchema,
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('customer', 'staff', 'manager', 'admin').required(),
  isActive: Joi.boolean().default(true),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  role: Joi.string().valid('customer', 'staff', 'manager', 'admin'),
  isActive: Joi.boolean(),
});

export const getUserSchema = idParamSchema;

export const deleteUserSchema = idParamSchema;
