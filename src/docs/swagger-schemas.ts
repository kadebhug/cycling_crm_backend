/**
 * Additional Swagger schemas for future API endpoints
 * This file contains schema definitions for entities that will be implemented
 */

export const additionalSchemas = {
  // Store schemas
  Store: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Store unique identifier',
      },
      ownerId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Store owner user ID',
      },
      name: {
        type: 'string',
        example: 'Downtown Bike Shop',
        description: 'Store name',
      },
      description: {
        type: 'string',
        nullable: true,
        example: 'Full-service bicycle repair and maintenance',
        description: 'Store description',
      },
      address: {
        type: 'string',
        nullable: true,
        example: '123 Main St, City, State 12345',
        description: 'Store address',
      },
      phone: {
        type: 'string',
        nullable: true,
        example: '+1234567890',
        description: 'Store phone number',
      },
      email: {
        type: 'string',
        format: 'email',
        nullable: true,
        example: 'info@downtownbikeshop.com',
        description: 'Store email address',
      },
      businessHours: {
        type: 'object',
        nullable: true,
        description: 'Store business hours',
        properties: {
          monday: { $ref: '#/components/schemas/DayHours' },
          tuesday: { $ref: '#/components/schemas/DayHours' },
          wednesday: { $ref: '#/components/schemas/DayHours' },
          thursday: { $ref: '#/components/schemas/DayHours' },
          friday: { $ref: '#/components/schemas/DayHours' },
          saturday: { $ref: '#/components/schemas/DayHours' },
          sunday: { $ref: '#/components/schemas/DayHours' },
        },
      },
      isActive: {
        type: 'boolean',
        example: true,
        description: 'Whether the store is active',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
    },
  },

  DayHours: {
    type: 'object',
    properties: {
      open: {
        type: 'string',
        example: '09:00',
        description: 'Opening time (HH:MM format)',
      },
      close: {
        type: 'string',
        example: '18:00',
        description: 'Closing time (HH:MM format)',
      },
      closed: {
        type: 'boolean',
        example: false,
        description: 'Whether the store is closed on this day',
      },
    },
  },

  // Bike schemas
  Bike: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Bike unique identifier',
      },
      customerId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Customer user ID',
      },
      brand: {
        type: 'string',
        nullable: true,
        example: 'Trek',
        description: 'Bike brand',
      },
      model: {
        type: 'string',
        nullable: true,
        example: 'Domane SL 7',
        description: 'Bike model',
      },
      year: {
        type: 'number',
        nullable: true,
        example: 2023,
        description: 'Bike year',
      },
      serialNumber: {
        type: 'string',
        nullable: true,
        example: 'WTU123456789',
        description: 'Bike serial number',
      },
      color: {
        type: 'string',
        nullable: true,
        example: 'Matte Black',
        description: 'Bike color',
      },
      bikeType: {
        type: 'string',
        nullable: true,
        example: 'Road',
        description: 'Type of bike (Road, Mountain, Hybrid, etc.)',
      },
      notes: {
        type: 'string',
        nullable: true,
        example: 'Customer prefers specific brake pads',
        description: 'Additional notes about the bike',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
    },
  },

  // Service schemas
  Service: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Service unique identifier',
      },
      storeId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Store ID',
      },
      name: {
        type: 'string',
        example: 'Basic Tune-Up',
        description: 'Service name',
      },
      description: {
        type: 'string',
        nullable: true,
        example: 'Adjust brakes, gears, and lubricate chain',
        description: 'Service description',
      },
      basePrice: {
        type: 'number',
        example: 75.00,
        description: 'Base price for the service',
      },
      estimatedDuration: {
        type: 'number',
        nullable: true,
        example: 60,
        description: 'Estimated duration in minutes',
      },
      category: {
        type: 'string',
        nullable: true,
        example: 'Maintenance',
        description: 'Service category',
      },
      isActive: {
        type: 'boolean',
        example: true,
        description: 'Whether the service is active',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
    },
  },

  // Service Request schemas
  ServiceRequest: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Service request unique identifier',
      },
      customerId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Customer user ID',
      },
      bikeId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Bike ID',
      },
      storeId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Store ID',
      },
      requestedServices: {
        type: 'array',
        items: {
          type: 'string',
        },
        example: ['Basic Tune-Up', 'Brake Adjustment'],
        description: 'Array of requested service names or IDs',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'urgent'],
        example: 'medium',
        description: 'Request priority level',
      },
      preferredDate: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        example: '2024-01-15T10:00:00.000Z',
        description: 'Customer preferred service date',
      },
      customerNotes: {
        type: 'string',
        nullable: true,
        example: 'Brakes are squeaking when wet',
        description: 'Customer notes about the issue',
      },
      status: {
        type: 'string',
        enum: ['pending', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled', 'expired'],
        example: 'pending',
        description: 'Request status',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
    },
  },

  // Quotation schemas
  Quotation: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Quotation unique identifier',
      },
      serviceRequestId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Service request ID',
      },
      quotationNumber: {
        type: 'string',
        example: 'Q-2024-001',
        description: 'Quotation number',
      },
      createdById: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'User ID who created the quotation',
      },
      lineItems: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/QuotationLineItem',
        },
        description: 'Quotation line items',
      },
      subtotal: {
        type: 'number',
        example: 100.00,
        description: 'Subtotal amount',
      },
      taxRate: {
        type: 'number',
        example: 0.08,
        description: 'Tax rate (as decimal)',
      },
      taxAmount: {
        type: 'number',
        example: 8.00,
        description: 'Tax amount',
      },
      total: {
        type: 'number',
        example: 108.00,
        description: 'Total amount',
      },
      validUntil: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-31T23:59:59.000Z',
        description: 'Quotation expiration date',
      },
      status: {
        type: 'string',
        enum: ['draft', 'sent', 'approved', 'rejected', 'expired'],
        example: 'sent',
        description: 'Quotation status',
      },
      notes: {
        type: 'string',
        nullable: true,
        example: 'Additional parts may be needed upon inspection',
        description: 'Additional notes',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      },
    },
  },

  QuotationLineItem: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Line item unique identifier',
      },
      description: {
        type: 'string',
        example: 'Basic Tune-Up',
        description: 'Item description',
      },
      quantity: {
        type: 'number',
        example: 1,
        description: 'Item quantity',
      },
      unitPrice: {
        type: 'number',
        example: 75.00,
        description: 'Unit price',
      },
      total: {
        type: 'number',
        example: 75.00,
        description: 'Line total (quantity × unitPrice)',
      },
    },
  },

  // Pagination schemas
  PaginationMeta: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        example: 1,
        description: 'Current page number',
      },
      limit: {
        type: 'number',
        example: 20,
        description: 'Items per page',
      },
      total: {
        type: 'number',
        example: 100,
        description: 'Total number of items',
      },
      totalPages: {
        type: 'number',
        example: 5,
        description: 'Total number of pages',
      },
      hasNext: {
        type: 'boolean',
        example: true,
        description: 'Whether there is a next page',
      },
      hasPrev: {
        type: 'boolean',
        example: false,
        description: 'Whether there is a previous page',
      },
    },
  },

  PaginatedResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true,
      },
      data: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
      meta: {
        allOf: [
          {
            type: 'object',
            properties: {
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-01T00:00:00.000Z',
              },
            },
          },
          {
            $ref: '#/components/schemas/PaginationMeta',
          },
        ],
      },
    },
  },
};