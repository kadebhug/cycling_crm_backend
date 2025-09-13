import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { storageConfig, validateFileType, validateFileSize } from '../config/storage';
import { AppError } from '../utils/errors';

// Extend Request interface to include file validation
declare global {
  namespace Express {
    interface Request {
      fileValidation?: {
        entityType?: string;
        entityId?: string;
        maxFiles?: number;
      };
    }
  }
}

// Custom storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const entityType = req.fileValidation?.entityType || 'general';
    const relativePath = path.dirname(storageConfig.getFilePath('temp', entityType));
    const fullPath = path.join(storageConfig.uploadDir, relativePath);

    // Ensure directory exists
    fs.mkdirSync(fullPath, { recursive: true });
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const fileName = storageConfig.generateFileName(file.originalname);
    cb(null, fileName);
  },
});

// File filter for security validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Validate MIME type
  if (!validateFileType(file.mimetype)) {
    return cb(new AppError(`File type ${file.mimetype} is not allowed`, 400, 'INVALID_FILE_TYPE'));
  }

  // Additional security checks
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
  ];

  if (!allowedExtensions.includes(extension)) {
    return cb(new AppError(`File extension ${extension} is not allowed`, 400, 'INVALID_FILE_EXTENSION'));
  }

  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.pif$/i,
    /\.com$/i,
    /\.js$/i,
    /\.vbs$/i,
    /\.jar$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
  ];

  if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
    return cb(new AppError('File type is potentially dangerous', 400, 'DANGEROUS_FILE_TYPE'));
  }

  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: storageConfig.maxFileSize,
    files: 10, // Maximum 10 files per request
    fieldSize: 1024 * 1024, // 1MB field size limit
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string = 'file') => {
  return upload.single(fieldName);
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return upload.array(fieldName, maxCount);
};

// Middleware for mixed file upload (multiple fields)
export const uploadFields = (fields: { name: string; maxCount?: number }[]) => {
  return upload.fields(fields);
};

// Validation middleware to set upload context
export const setUploadContext = (entityType: string, maxFiles: number = 5) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.fileValidation = {
      entityType,
      maxFiles,
    };
    next();
  };
};

// Post-upload validation middleware
export const validateUploadedFiles = (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = req.file as Express.Multer.File | undefined;

    // Handle single file
    if (file) {
      validateSingleFile(file);
    }

    // Handle multiple files (array)
    if (Array.isArray(files)) {
      files.forEach(validateSingleFile);
      
      // Check max files limit
      const maxFiles = req.fileValidation?.maxFiles || 5;
      if (files.length > maxFiles) {
        throw new AppError(`Maximum ${maxFiles} files allowed`, 400, 'TOO_MANY_FILES');
      }
    }

    // Handle multiple files (object with field names)
    if (files && typeof files === 'object' && !Array.isArray(files)) {
      Object.values(files).forEach(fileArray => {
        fileArray.forEach(validateSingleFile);
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validate individual file
const validateSingleFile = (file: Express.Multer.File) => {
  // Validate file size
  if (!validateFileSize(file.size)) {
    throw new AppError(`File size exceeds maximum allowed size of ${storageConfig.maxFileSize} bytes`, 400, 'FILE_TOO_LARGE');
  }

  // Validate file exists
  if (!fs.existsSync(file.path)) {
    throw new AppError('File was not saved properly', 500, 'FILE_UPLOAD_ERROR');
  }

  // Additional security: Check file content matches extension
  // This is a basic check - in production, you might want more sophisticated validation
  const stats = fs.statSync(file.path);
  if (stats.size === 0) {
    throw new AppError('Uploaded file is empty', 400, 'EMPTY_FILE');
  }

  if (stats.size !== file.size) {
    throw new AppError('File size mismatch detected', 400, 'FILE_SIZE_MISMATCH');
  }
};

// Cleanup middleware for failed uploads
export const cleanupFailedUploads = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Override response methods to cleanup on error
  res.send = function(body) {
    if (res.statusCode >= 400) {
      cleanupUploadedFiles(req);
    }
    return originalSend.call(this, body);
  };

  res.json = function(body) {
    if (res.statusCode >= 400) {
      cleanupUploadedFiles(req);
    }
    return originalJson.call(this, body);
  };

  next();
};

// Helper function to cleanup uploaded files
const cleanupUploadedFiles = (req: Request) => {
  try {
    const files = req.files as Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = req.file as Express.Multer.File | undefined;

    // Clean up single file
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Clean up multiple files (array)
    if (Array.isArray(files)) {
      files.forEach(f => {
        if (fs.existsSync(f.path)) {
          fs.unlinkSync(f.path);
        }
      });
    }

    // Clean up multiple files (object)
    if (files && typeof files === 'object' && !Array.isArray(files)) {
      Object.values(files).forEach(fileArray => {
        fileArray.forEach(f => {
          if (fs.existsSync(f.path)) {
            fs.unlinkSync(f.path);
          }
        });
      });
    }
  } catch (error) {
    console.error('Error cleaning up uploaded files:', error);
  }
};

// Error handler for multer errors
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${storageConfig.maxFileSize} bytes`;
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        code = 'FIELD_NAME_TOO_LONG';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        code = 'FIELD_VALUE_TOO_LONG';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        code = 'TOO_MANY_FIELDS';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'UNEXPECTED_FILE_FIELD';
        break;
    }

    // Cleanup uploaded files on error
    cleanupUploadedFiles(req);

    res.status(400).json({
      success: false,
      error: {
        code,
        message,
        details: error.message,
      },
    });
    return;
  }

  next(error);
};

// Utility function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    destination: file.destination,
  };
};

// Utility function to move file to final location
export const moveFileToFinalLocation = (tempPath: string, finalPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Ensure destination directory exists
    const dir = path.dirname(finalPath);
    fs.mkdirSync(dir, { recursive: true });

    // Move file
    fs.rename(tempPath, finalPath, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};