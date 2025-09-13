import Joi from 'joi';
import { QuotationStatus } from '../types/database/database.types';

// Line item schema
const lineItemSchema = Joi.object({
  description: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Line item description is required',
      'string.min': 'Line item description must be at least 1 character',
      'string.max': 'Line item description cannot exceed 500 characters',
    }),
  quantity: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.positive': 'Quantity must be a positive number',
      'any.required': 'Quantity is required',
    }),
  unitPrice: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .messages({
      'number.min': 'Unit price must be non-negative',
      'any.required': 'Unit price is required',
    }),
});

// Create quotation schema
export const createQuotationSchema = Joi.object({
  serviceRequestId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Service request ID must be a valid UUID',
      'any.required': 'Service request ID is required',
    }),
  lineItems: Joi.array()
    .items(lineItemSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one line item is required',
      'any.required': 'Line items are required',
    }),
  taxRate: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .required()
    .messages({
      'number.min': 'Tax rate must be non-negative',
      'number.max': 'Tax rate cannot exceed 100%',
      'any.required': 'Tax rate is required',
    }),
  validityDays: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .default(30)
    .messages({
      'number.integer': 'Validity days must be an integer',
      'number.min': 'Validity days must be at least 1',
      'number.max': 'Validity days cannot exceed 365',
    }),
  notes: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 2000 characters',
    }),
});

// Update quotation schema
export const updateQuotationSchema = Joi.object({
  lineItems: Joi.array()
    .items(lineItemSchema.keys({
      id: Joi.string().required(),
      total: Joi.number().min(0).precision(2).required(),
    }))
    .min(1)
    .optional()
    .messages({
      'array.min': 'At least one line item is required',
    }),
  taxRate: Joi.number()
    .min(0)
    .max(100)
    .precision(2)
    .optional()
    .messages({
      'number.min': 'Tax rate must be non-negative',
      'number.max': 'Tax rate cannot exceed 100%',
    }),
  validUntil: Joi.date()
    .greater('now')
    .optional()
    .messages({
      'date.greater': 'Valid until date must be in the future',
    }),
  notes: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 2000 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Get quotation schema
export const getQuotationSchema = Joi.object({
  quotationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Quotation ID must be a valid UUID',
      'any.required': 'Quotation ID is required',
    }),
});

// Quotation query parameters schema
export const quotationQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'validUntil', 'total', 'status')
    .optional()
    .messages({
      'any.only': 'Sort by must be one of: createdAt, updatedAt, validUntil, total, status',
    }),
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .optional()
    .messages({
      'any.only': 'Sort order must be ASC or DESC',
    }),
  status: Joi.alternatives()
    .try(
      Joi.string().valid(...Object.values(QuotationStatus)),
      Joi.array().items(Joi.string().valid(...Object.values(QuotationStatus)))
    )
    .optional()
    .messages({
      'any.only': `Status must be one of: ${Object.values(QuotationStatus).join(', ')}`,
    }),
  serviceRequestId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Service request ID must be a valid UUID',
    }),
  dateFrom: Joi.date()
    .optional()
    .messages({
      'date.base': 'Date from must be a valid date',
    }),
  dateTo: Joi.date()
    .optional()
    .when('dateFrom', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('dateFrom')),
      otherwise: Joi.date(),
    })
    .messages({
      'date.base': 'Date to must be a valid date',
      'date.greater': 'Date to must be after date from',
    }),
  validUntilFrom: Joi.date()
    .optional()
    .messages({
      'date.base': 'Valid until from must be a valid date',
    }),
  validUntilTo: Joi.date()
    .optional()
    .when('validUntilFrom', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('validUntilFrom')),
      otherwise: Joi.date(),
    })
    .messages({
      'date.base': 'Valid until to must be a valid date',
      'date.greater': 'Valid until to must be after valid until from',
    }),
  isExpired: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Is expired must be a boolean',
    }),
  isExpiringSoon: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Is expiring soon must be a boolean',
    }),
});

// Send quotation schema
export const sendQuotationSchema = Joi.object({
  quotationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Quotation ID must be a valid UUID',
      'any.required': 'Quotation ID is required',
    }),
});

// Approve/Reject quotation schema
export const quotationActionSchema = Joi.object({
  quotationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Quotation ID must be a valid UUID',
      'any.required': 'Quotation ID is required',
    }),
});

// Store quotation query schema (includes store-specific filters)
export const storeQuotationQuerySchema = quotationQuerySchema.keys({
  createdById: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Created by ID must be a valid UUID',
    }),
});

// Customer quotation query schema (limited filters for customers)
export const customerQuotationQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'validUntil', 'total', 'status')
    .optional()
    .messages({
      'any.only': 'Sort by must be one of: createdAt, updatedAt, validUntil, total, status',
    }),
  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .optional()
    .messages({
      'any.only': 'Sort order must be ASC or DESC',
    }),
  status: Joi.alternatives()
    .try(
      Joi.string().valid(...Object.values(QuotationStatus)),
      Joi.array().items(Joi.string().valid(...Object.values(QuotationStatus)))
    )
    .optional()
    .messages({
      'any.only': `Status must be one of: ${Object.values(QuotationStatus).join(', ')}`,
    }),
  serviceRequestId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Service request ID must be a valid UUID',
    }),
});

// Expiring quotations query schema
export const expiringQuotationsQuerySchema = Joi.object({
  days: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .default(3)
    .messages({
      'number.integer': 'Days must be an integer',
      'number.min': 'Days must be at least 1',
      'number.max': 'Days cannot exceed 30',
    }),
});