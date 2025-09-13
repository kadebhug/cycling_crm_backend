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

  // Media schemas
  Media: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Media file unique identifier',
      },
      entityType: {
        type: 'string',
        enum: ['service_record', 'service_update', 'quotation', 'invoice', 'bike', 'user', 'store'],
        example: 'service_record',
        description: 'Type of entity the media is associated with',
      },
      entityId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'ID of the entity the media is associated with',
      },
      fileName: {
        type: 'string',
        example: '1704067200000_abc123_bike_photo.jpg',
        description: 'Generated file name on server',
      },
      originalName: {
        type: 'string',
        example: 'bike_photo.jpg',
        description: 'Original file name uploaded by user',
      },
      mimeType: {
        type: 'string',
        example: 'image/jpeg',
        description: 'MIME type of the file',
      },
      fileSize: {
        type: 'number',
        example: 2048576,
        description: 'File size in bytes',
      },
      mediaType: {
        type: 'string',
        enum: ['image', 'document', 'video'],
        example: 'image',
        description: 'Category of media file',
      },
      downloadUrl: {
        type: 'string',
        example: '/api/media/123e4567-e89b-12d3-a456-426614174000/download',
        description: 'URL to download the file',
      },
      thumbnailUrl: {
        type: 'string',
        nullable: true,
        example: '/api/media/123e4567-e89b-12d3-a456-426614174000/thumbnail',
        description: 'URL to view thumbnail (for images only)',
      },
      uploadedBy: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          firstName: {
            type: 'string',
            nullable: true,
            example: 'John',
          },
          lastName: {
            type: 'string',
            nullable: true,
            example: 'Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john@example.com',
          },
        },
        description: 'User who uploaded the file',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
        description: 'Upload timestamp',
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
        description: 'Last update timestamp',
      },
    },
  },

  MediaUploadRequest: {
    type: 'object',
    required: ['entityType', 'entityId', 'file'],
    properties: {
      entityType: {
        type: 'string',
        enum: ['service_record', 'service_update', 'quotation', 'invoice', 'bike', 'user', 'store'],
        example: 'service_record',
        description: 'Type of entity to associate the media with',
      },
      entityId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'ID of the entity to associate the media with',
      },
      file: {
        type: 'string',
        format: 'binary',
        description: 'File to upload (max 10MB)',
      },
    },
  },

  MediaMultipleUploadRequest: {
    type: 'object',
    required: ['entityType', 'entityId', 'files'],
    properties: {
      entityType: {
        type: 'string',
        enum: ['service_record', 'service_update', 'quotation', 'invoice', 'bike', 'user', 'store'],
        example: 'service_record',
        description: 'Type of entity to associate the media with',
      },
      entityId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'ID of the entity to associate the media with',
      },
      files: {
        type: 'array',
        items: {
          type: 'string',
          format: 'binary',
        },
        maxItems: 10,
        description: 'Files to upload (max 10 files, 10MB each)',
      },
    },
  },

  MediaUpdateMetadataRequest: {
    type: 'object',
    properties: {
      originalName: {
        type: 'string',
        example: 'updated_filename.jpg',
        description: 'Updated original file name',
      },
    },
  },

  MediaStats: {
    type: 'object',
    properties: {
      totalFiles: {
        type: 'number',
        example: 15,
        description: 'Total number of files',
      },
      totalSize: {
        type: 'number',
        example: 25165824,
        description: 'Total size of all files in bytes',
      },
      imageCount: {
        type: 'number',
        example: 10,
        description: 'Number of image files',
      },
      documentCount: {
        type: 'number',
        example: 3,
        description: 'Number of document files',
      },
      videoCount: {
        type: 'number',
        example: 2,
        description: 'Number of video files',
      },
    },
  },

  MediaSearchFilters: {
    type: 'object',
    properties: {
      entityType: {
        type: 'string',
        enum: ['service_record', 'service_update', 'quotation', 'invoice', 'bike', 'user', 'store'],
        description: 'Filter by entity type',
      },
      entityId: {
        type: 'string',
        format: 'uuid',
        description: 'Filter by entity ID',
      },
      mediaType: {
        type: 'string',
        enum: ['image', 'document', 'video'],
        description: 'Filter by media type',
      },
      uploadedById: {
        type: 'string',
        format: 'uuid',
        description: 'Filter by uploader user ID',
      },
      mimeType: {
        type: 'string',
        description: 'Filter by MIME type',
      },
      createdAfter: {
        type: 'string',
        format: 'date-time',
        description: 'Filter files created after this date',
      },
      createdBefore: {
        type: 'string',
        format: 'date-time',
        description: 'Filter files created before this date',
      },
    },
  },

  MediaCleanupResult: {
    type: 'object',
    properties: {
      deletedFiles: {
        type: 'number',
        example: 5,
        description: 'Number of orphaned files deleted',
      },
      errors: {
        type: 'array',
        items: {
          type: 'string',
        },
        example: ['Failed to delete file xyz.jpg: Permission denied'],
        description: 'List of errors encountered during cleanup',
      },
    },
  },

  // Service Record schemas
  ServiceRecord: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Service record unique identifier',
      },
      serviceRequestId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Associated service request ID',
      },
      assignedStaffId: {
        type: 'string',
        format: 'uuid',
        nullable: true,
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Assigned staff member ID',
      },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'on_hold', 'completed'],
        example: 'in_progress',
        description: 'Current status of the service work',
      },
      startedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        example: '2024-01-10T09:00:00.000Z',
        description: 'When work was started',
      },
      completedAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        example: '2024-01-10T15:30:00.000Z',
        description: 'When work was completed',
      },
      estimatedCompletionDate: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        example: '2024-01-15T16:00:00.000Z',
        description: 'Estimated completion date',
      },
      actualHours: {
        type: 'number',
        nullable: true,
        example: 2.5,
        description: 'Actual hours spent on the work',
      },
      notes: {
        type: 'string',
        nullable: true,
        example: 'Replaced brake pads and adjusted cables',
        description: 'Work notes and comments',
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

  // Service Update schemas
  ServiceUpdate: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Service update unique identifier',
      },
      serviceRecordId: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Associated service record ID',
      },
      createdById: {
        type: 'string',
        format: 'uuid',
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'Staff member who created the update',
      },
      updateType: {
        type: 'string',
        enum: ['progress', 'issue', 'completion', 'hold'],
        example: 'progress',
        description: 'Type of update',
      },
      title: {
        type: 'string',
        example: 'Brake adjustment completed',
        description: 'Update title',
      },
      description: {
        type: 'string',
        example: 'Successfully adjusted front and rear brakes. Test ride completed.',
        description: 'Detailed update description',
      },
      isCustomerVisible: {
        type: 'boolean',
        example: true,
        description: 'Whether this update is visible to the customer',
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
};