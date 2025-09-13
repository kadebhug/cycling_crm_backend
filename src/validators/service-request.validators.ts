import Joi from 'joi';
import { Priority, RequestStatus } from '../types/database/database.types';

// Create service request validation schema
export const createServiceRequestSchema = Joi.object({
  bikeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Bike ID must be a valid UUID',
      'any.required': 'Bike ID is required',
    }),

  storeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Store ID must be a valid UUID',
      'any.required': 'Store ID is required',
    }),

  requestedServices: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required()
    )
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one service must be requested',
      'array.max': 'Cannot request more than 20 services at once',
      'any.required': 'Requested services are required',
    }),

  priority: Joi.string()
    .valid(...Object.values(Priority))
    .optional()
    .messages({
      'any.only': `Priority must be one of: ${Object.values(Priority).join(', ')}`,
    }),

  preferredDate: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Preferred date must be in the future',
      'date.iso': 'Preferred date must be a valid ISO date',
    }),

  customerNotes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Customer notes cannot exceed 1000 characters',
    }),
});

// Update service request validation schema
export const updateServiceRequestSchema = Joi.object({
  requestedServices: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required()
    )
    .min(1)
    .max(20)
    .optional()
    .messages({
      'array.min': 'At least one service must be requested',
      'array.max': 'Cannot request more than 20 services at once',
    }),

  priority: Joi.string()
    .valid(...Object.values(Priority))
    .optional()
    .messages({
      'any.only': `Priority must be one of: ${Object.values(Priority).join(', ')}`,
    }),

  preferredDate: Joi.date()
    .iso()
    .min('now')
    .optional()
    .allow(null)
    .messages({
      'date.min': 'Preferred date must be in the future',
      'date.iso': 'Preferred date must be a valid ISO date',
    }),

  customerNotes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Customer notes cannot exceed 1000 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Update service request status validation schema
export const updateServiceRequestStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(RequestStatus))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(RequestStatus).join(', ')}`,
      'any.required': 'Status is required',
    }),
});

// Get service request by ID validation schema
export const getServiceRequestSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Service request ID must be a valid UUID',
      'any.required': 'Service request ID is required',
    }),
});

// Service request query parameters validation schema
export const serviceRequestQuerySchema = Joi.object({
  // Pagination
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be an integer',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.integer': 'Limit must be an integer',
    }),

  // Sorting
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'priority', 'status', 'preferredDate')
    .optional()
    .messages({
      'any.only': 'Sort by must be one of: createdAt, updatedAt, priority, status, preferredDate',
    }),

  sortOrder: Joi.string()
    .valid('ASC', 'DESC')
    .optional()
    .messages({
      'any.only': 'Sort order must be ASC or DESC',
    }),

  // Filters
  status: Joi.alternatives()
    .try(
      Joi.string().valid(...Object.values(RequestStatus)),
      Joi.array().items(Joi.string().valid(...Object.values(RequestStatus))).min(1)
    )
    .optional()
    .messages({
      'any.only': `Status must be one of: ${Object.values(RequestStatus).join(', ')}`,
    }),

  priority: Joi.alternatives()
    .try(
      Joi.string().valid(...Object.values(Priority)),
      Joi.array().items(Joi.string().valid(...Object.values(Priority))).min(1)
    )
    .optional()
    .messages({
      'any.only': `Priority must be one of: ${Object.values(Priority).join(', ')}`,
    }),

  bikeId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Bike ID must be a valid UUID',
    }),

  dateFrom: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.iso': 'Date from must be a valid ISO date',
    }),

  dateTo: Joi.date()
    .iso()
    .min(Joi.ref('dateFrom'))
    .optional()
    .messages({
      'date.iso': 'Date to must be a valid ISO date',
      'date.min': 'Date to must be after date from',
    }),

  preferredDateFrom: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.iso': 'Preferred date from must be a valid ISO date',
    }),

  preferredDateTo: Joi.date()
    .iso()
    .min(Joi.ref('preferredDateFrom'))
    .optional()
    .messages({
      'date.iso': 'Preferred date to must be a valid ISO date',
      'date.min': 'Preferred date to must be after preferred date from',
    }),

  isOverdue: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Is overdue must be a boolean value',
    }),
});

// Store service request query parameters (includes storeId validation)
export const storeServiceRequestQuerySchema = serviceRequestQuerySchema.keys({
  customerId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Customer ID must be a valid UUID',
    }),
});

// Customer service request query parameters (excludes customerId since it's from auth)
export const customerServiceRequestQuerySchema = serviceRequestQuerySchema.keys({
  storeId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Store ID must be a valid UUID',
    }),
});

// Cancel service request validation schema
export const cancelServiceRequestSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Service request ID must be a valid UUID',
      'any.required': 'Service request ID is required',
    }),
});

// Bulk operations validation schemas
export const bulkUpdateStatusSchema = Joi.object({
  requestIds: Joi.array()
    .items(
      Joi.string()
        .uuid()
        .required()
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one service request ID must be provided',
      'array.max': 'Cannot update more than 50 service requests at once',
      'any.required': 'Service request IDs are required',
    }),

  status: Joi.string()
    .valid(...Object.values(RequestStatus))
    .required()
    .messages({
      'any.only': `Status must be one of: ${Object.values(RequestStatus).join(', ')}`,
      'any.required': 'Status is required',
    }),
});

// Service request statistics query schema
export const serviceRequestStatsQuerySchema = Joi.object({
  dateFrom: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.iso': 'Date from must be a valid ISO date',
    }),

  dateTo: Joi.date()
    .iso()
    .min(Joi.ref('dateFrom'))
    .optional()
    .messages({
      'date.iso': 'Date to must be a valid ISO date',
      'date.min': 'Date to must be after date from',
    }),

  groupBy: Joi.string()
    .valid('day', 'week', 'month', 'year')
    .optional()
    .messages({
      'any.only': 'Group by must be one of: day, week, month, year',
    }),
});