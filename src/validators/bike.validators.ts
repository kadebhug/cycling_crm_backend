import Joi from 'joi';
import { idParamSchema } from './common.validators';

// Bike creation validation schema
export const createBikeSchema = Joi.object({
  brand: Joi.string().min(1).max(100).allow(null, '').optional(),
  model: Joi.string().min(1).max(100).allow(null, '').optional(),
  year: Joi.number()
    .integer()
    .min(1800)
    .max(new Date().getFullYear() + 1)
    .allow(null)
    .optional(),
  serialNumber: Joi.string().min(1).max(100).allow(null, '').optional(),
  color: Joi.string().min(1).max(50).allow(null, '').optional(),
  bikeType: Joi.string().min(1).max(50).allow(null, '').optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
});

// Bike update validation schema
export const updateBikeSchema = Joi.object({
  brand: Joi.string().min(1).max(100).allow(null, '').optional(),
  model: Joi.string().min(1).max(100).allow(null, '').optional(),
  year: Joi.number()
    .integer()
    .min(1800)
    .max(new Date().getFullYear() + 1)
    .allow(null)
    .optional(),
  serialNumber: Joi.string().min(1).max(100).allow(null, '').optional(),
  color: Joi.string().min(1).max(50).allow(null, '').optional(),
  bikeType: Joi.string().min(1).max(50).allow(null, '').optional(),
  notes: Joi.string().max(1000).allow(null, '').optional(),
});

// Bike search validation schema
export const searchBikesSchema = Joi.object({
  brand: Joi.string().min(1).max(100).optional(),
  model: Joi.string().min(1).max(100).optional(),
  year: Joi.number()
    .integer()
    .min(1800)
    .max(new Date().getFullYear() + 1)
    .optional(),
  bikeType: Joi.string().min(1).max(50).optional(),
  serialNumber: Joi.string().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'brand', 'model', 'year').default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

// Get bike by ID validation schema
export const getBikeSchema = idParamSchema;

// Delete bike validation schema
export const deleteBikeSchema = idParamSchema;

// Bike ownership verification schema
export const verifyBikeOwnershipSchema = Joi.object({
  bikeId: Joi.string().uuid().required(),
  customerId: Joi.string().uuid().required(),
});