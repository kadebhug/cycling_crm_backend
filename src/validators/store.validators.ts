// Store validation schemas

import Joi from 'joi';
import { idParamSchema } from './common.validators';

export const createStoreSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  address: Joi.string().min(10).max(200).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).required(),
  email: Joi.string().email().required(),
  managerId: Joi.number().integer().positive().required(),
  isActive: Joi.boolean().default(true),
});

export const updateStoreSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  address: Joi.string().min(10).max(200),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/),
  email: Joi.string().email(),
  managerId: Joi.number().integer().positive(),
  isActive: Joi.boolean(),
});

export const getStoreSchema = idParamSchema;

export const deleteStoreSchema = idParamSchema;
