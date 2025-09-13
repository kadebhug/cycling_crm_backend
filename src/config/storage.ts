import path from 'path';
import { config } from './environment';

export interface StorageConfig {
  uploadDir: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedImageTypes: string[];
  allowedDocumentTypes: string[];
  allowedVideoTypes: string[];
  generateFileName: (originalName: string) => string;
  getFilePath: (fileName: string, entityType: string) => string;
  getAbsolutePath: (relativePath: string) => string;
}

export const storageConfig: StorageConfig = {
  // Base upload directory
  uploadDir: config.upload?.uploadPath || 'uploads',

  // Maximum file size (10MB default)
  maxFileSize: config.upload?.maxFileSize || 10 * 1024 * 1024,

  // Allowed MIME types
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    // Videos
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm',
    'video/x-matroska',
  ],

  // Image-specific types
  allowedImageTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
  ],

  // Document-specific types
  allowedDocumentTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
  ],

  // Video-specific types
  allowedVideoTypes: [
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/webm',
    'video/x-matroska',
  ],

  // Generate unique file name
  generateFileName: (originalName: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${randomString}_${baseName}${extension}`;
  },

  // Get file path relative to upload directory
  getFilePath: (fileName: string, entityType: string): string => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    return path.join(entityType, String(year), month, fileName);
  },

  // Get absolute file path
  getAbsolutePath: (relativePath: string): string => {
    return path.resolve(storageConfig.uploadDir, relativePath);
  },
};

// Validation functions
export const validateFileType = (mimeType: string): boolean => {
  return storageConfig.allowedMimeTypes.includes(mimeType);
};

export const validateFileSize = (size: number): boolean => {
  return size <= storageConfig.maxFileSize;
};

export const isImageFile = (mimeType: string): boolean => {
  return storageConfig.allowedImageTypes.includes(mimeType);
};

export const isDocumentFile = (mimeType: string): boolean => {
  return storageConfig.allowedDocumentTypes.includes(mimeType);
};

export const isVideoFile = (mimeType: string): boolean => {
  return storageConfig.allowedVideoTypes.includes(mimeType);
};

// File size formatting
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);
  
  return `${size} ${sizes[i]}`;
};

// Get file extension
export const getFileExtension = (fileName: string): string => {
  return path.extname(fileName).toLowerCase().substring(1);
};

// Sanitize file name
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};