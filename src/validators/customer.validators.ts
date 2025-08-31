// Customer validation schemas

import Joi from 'joi';
import { idParamSchema } from './common.validators';

export const createCustomerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  address: Joi.string().min(10).max(200).required(),
  userId: Joi.number().integer().positive().optional(),
});

export const updateCustomerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/),
  address: Joi.string().min(10).max(200),
});

export const getCustomerSchema = idParamSchema;

export const deleteCustomerSchema = idParamSchema;
