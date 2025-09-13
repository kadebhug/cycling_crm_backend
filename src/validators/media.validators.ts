import Joi from 'joi';
import { Media } from '../database/models/Media';

// Upload validation schema
export const uploadFileSchema = Joi.object({
  entityType: Joi.string()
    .valid(...Media.getEntityTypes())
    .required()
    .messages({
      'any.required': 'Entity type is required',
      'any.only': 'Invalid entity type',
    }),
  entityId: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Entity ID is required',
      'string.guid': 'Entity ID must be a valid UUID',
    }),
});

// Multiple file upload validation
export const uploadMultipleFilesSchema = Joi.object({
  entityType: Joi.string()
    .valid(...Media.getEntityTypes())
    .required()
    .messages({
      'any.required': 'Entity type is required',
      'any.only': 'Invalid entity type',
    }),
  entityId: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Entity ID is required',
      'string.guid': 'Entity ID must be a valid UUID',
    }),
});

// Media filter validation schema
export const mediaFiltersSchema = Joi.object({
  entityType: Joi.string()
    .valid(...Media.getEntityTypes())
    .optional(),
  entityId: Joi.string()
    .uuid()
    .optional(),
  mediaType: Joi.string()
    .valid('image', 'document', 'video')
    .optional(),
  uploadedById: Joi.string()
    .uuid()
    .optional(),
  mimeType: Joi.string()
    .optional(),
  createdAfter: Joi.date()
    .iso()
    .optional(),
  createdBefore: Joi.date()
    .iso()
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional(),
});

// Update metadata validation schema
export const updateMetadataSchema = Joi.object({
  originalName: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Original name must not be empty',
      'string.max': 'Original name must not exceed 255 characters',
    }),
});

// Entity params validation
export const entityParamsSchema = Joi.object({
  entityType: Joi.string()
    .valid(...Media.getEntityTypes())
    .required()
    .messages({
      'any.required': 'Entity type is required',
      'any.only': 'Invalid entity type',
    }),
  entityId: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Entity ID is required',
      'string.guid': 'Entity ID must be a valid UUID',
    }),
});

// Media ID params validation
export const mediaIdParamsSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Media ID is required',
      'string.guid': 'Media ID must be a valid UUID',
    }),
});

// Service record upload params validation
export const serviceRecordUploadParamsSchema = Joi.object({
  serviceRecordId: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Service record ID is required',
      'string.guid': 'Service record ID must be a valid UUID',
    }),
});

// Service update upload params validation
export const serviceUpdateUploadParamsSchema = Joi.object({
  serviceUpdateId: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Service update ID is required',
      'string.guid': 'Service update ID must be a valid UUID',
    }),
});

// Quotation upload params validation
export const quotationUploadParamsSchema = Joi.object({
  quotationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Quotation ID is required',
      'string.guid': 'Quotation ID must be a valid UUID',
    }),
});

// Bike upload params validation
export const bikeUploadParamsSchema = Joi.object({
  bikeId: Joi.string()
    .uuid()
    .required()
    .messages({
      'any.required': 'Bike ID is required',
      'string.guid': 'Bike ID must be a valid UUID',
    }),
});

// File validation constants
export const FILE_VALIDATION = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_REQUEST: 10,
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
  ],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
  ],
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm',
    'video/x-matroska',
  ],
};

// Get all allowed MIME types
export const getAllowedMimeTypes = (): string[] => {
  return [
    ...FILE_VALIDATION.ALLOWED_IMAGE_TYPES,
    ...FILE_VALIDATION.ALLOWED_DOCUMENT_TYPES,
    ...FILE_VALIDATION.ALLOWED_VIDEO_TYPES,
  ];
};

// Validate file type
export const validateFileType = (mimeType: string): boolean => {
  return getAllowedMimeTypes().includes(mimeType);
};

// Validate file size
export const validateFileSize = (size: number): boolean => {
  return size <= FILE_VALIDATION.MAX_FILE_SIZE;
};

// Get file type category
export const getFileTypeCategory = (mimeType: string): 'image' | 'document' | 'video' | 'unknown' => {
  if (FILE_VALIDATION.ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return 'image';
  }
  if (FILE_VALIDATION.ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
    return 'document';
  }
  if (FILE_VALIDATION.ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    return 'video';
  }
  return 'unknown';
};

// Validate file extension matches MIME type
export const validateFileExtensionMimeType = (filename: string, mimeType: string): boolean => {
  const extension = filename.toLowerCase().split('.').pop();
  
  const mimeTypeExtensionMap: { [key: string]: string[] } = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
    'image/bmp': ['bmp'],
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'text/plain': ['txt'],
    'application/rtf': ['rtf'],
    'application/vnd.oasis.opendocument.text': ['odt'],
    'video/mp4': ['mp4'],
    'video/avi': ['avi'],
    'video/quicktime': ['mov'],
    'video/x-ms-wmv': ['wmv'],
    'video/x-flv': ['flv'],
    'video/webm': ['webm'],
    'video/x-matroska': ['mkv'],
  };

  const allowedExtensions = mimeTypeExtensionMap[mimeType];
  return allowedExtensions ? allowedExtensions.includes(extension || '') : false;
};

// Security validation for file names
export const validateFileName = (filename: string): { valid: boolean; reason?: string } => {
  // Check for null bytes
  if (filename.includes('\0')) {
    return { valid: false, reason: 'Filename contains null bytes' };
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, reason: 'Filename contains path traversal characters' };
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExtension = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExtension)) {
    return { valid: false, reason: 'Filename uses reserved system name' };
  }

  // Check for dangerous extensions
  const dangerousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'js', 'vbs', 'jar', 'php', 'asp', 'jsp'];
  const extension = filename.toLowerCase().split('.').pop();
  if (extension && dangerousExtensions.includes(extension)) {
    return { valid: false, reason: 'Filename has potentially dangerous extension' };
  }

  // Check length
  if (filename.length > 255) {
    return { valid: false, reason: 'Filename too long' };
  }

  return { valid: true };
};