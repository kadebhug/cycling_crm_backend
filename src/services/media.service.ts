import fs from 'fs';
import path from 'path';
import { MediaRepository, MediaCreateData, MediaFilters } from '../repositories/media.repository';
import { Media } from '../database/models/Media';
import { storageConfig } from '../config/storage';
import { AppError } from '../utils/errors';
import { MediaType } from '../types/database/database.types';
import { moveFileToFinalLocation } from '../middleware/upload.middleware';

export interface UploadFileData {
  entityType: string;
  entityId: string;
  file: Express.Multer.File;
  uploadedById: string;
}

export interface MediaResponse {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  mediaType: MediaType;
  downloadUrl: string;
  thumbnailUrl?: string;
  uploadedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class MediaService {
  private mediaRepository: MediaRepository;

  constructor() {
    this.mediaRepository = new MediaRepository();
  }

  /**
   * Upload and save a single file
   */
  async uploadFile(data: UploadFileData): Promise<MediaResponse> {
    const { entityType, entityId, file, uploadedById } = data;

    try {
      // Validate entity type
      if (!Media.getEntityTypes().includes(entityType)) {
        throw new AppError(`Entity type '${entityType}' is not supported`, 400, 'INVALID_ENTITY_TYPE');
      }

      // Generate final file path
      const finalFileName = storageConfig.generateFileName(file.originalname);
      const relativePath = storageConfig.getFilePath(finalFileName, entityType);
      const absolutePath = storageConfig.getAbsolutePath(relativePath);

      // Move file from temp location to final location
      await moveFileToFinalLocation(file.path, absolutePath);

      // Create media record
      const mediaData: MediaCreateData = {
        entityType,
        entityId,
        fileName: finalFileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: relativePath,
        uploadedById,
      };

      const media = await this.mediaRepository.createMedia(mediaData);
      
      return this.formatMediaResponse(media);
    } catch (error) {
      // Clean up file if database operation fails
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    entityType: string,
    entityId: string,
    files: Express.Multer.File[],
    uploadedById: string
  ): Promise<MediaResponse[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile({ entityType, entityId, file, uploadedById })
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      // If any upload fails, clean up all files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      throw error;
    }
  }

  /**
   * Get media files by entity
   */
  async getMediaByEntity(entityType: string, entityId: string): Promise<MediaResponse[]> {
    const mediaFiles = await this.mediaRepository.findByEntity(entityType, entityId);
    return mediaFiles.map(media => this.formatMediaResponse(media));
  }

  /**
   * Get media file by ID
   */
  async getMediaById(id: string): Promise<MediaResponse> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new AppError('Media file not found', 404, 'MEDIA_NOT_FOUND');
    }

    return this.formatMediaResponse(media);
  }

  /**
   * Get media files with filters
   */
  async getMediaWithFilters(filters: MediaFilters): Promise<MediaResponse[]> {
    const mediaFiles = await this.mediaRepository.findWithFilters(filters);
    return mediaFiles.map(media => this.formatMediaResponse(media));
  }

  /**
   * Delete media file
   */
  async deleteMedia(id: string, userId: string): Promise<void> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new AppError('Media file not found', 404, 'MEDIA_NOT_FOUND');
    }

    // Check if user has permission to delete (owner or admin)
    if (media.uploadedById !== userId) {
      // Additional permission checks could be added here based on user role
      throw new AppError('You do not have permission to delete this file', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    try {
      // Delete physical file
      const absolutePath = storageConfig.getAbsolutePath(media.filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }

      // Delete database record
      await this.mediaRepository.delete(id);
    } catch (error) {
      throw new AppError('Failed to delete media file', 500, 'DELETE_ERROR');
    }
  }

  /**
   * Get file stream for download
   */
  async getFileStream(id: string): Promise<{ stream: fs.ReadStream; media: Media }> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new AppError('Media file not found', 404, 'MEDIA_NOT_FOUND');
    }

    const absolutePath = storageConfig.getAbsolutePath(media.filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new AppError('Physical file not found on disk', 404, 'FILE_NOT_FOUND');
    }

    const stream = fs.createReadStream(absolutePath);
    return { stream, media };
  }

  /**
   * Get media statistics for entity
   */
  async getEntityMediaStats(entityType: string, entityId: string) {
    return this.mediaRepository.getEntityMediaStats(entityType, entityId);
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > storageConfig.maxFileSize) {
      throw new AppError(`File size exceeds maximum allowed size of ${storageConfig.maxFileSize} bytes`, 400, 'FILE_TOO_LARGE');
    }

    // Check MIME type
    if (!storageConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(`File type ${file.mimetype} is not allowed`, 400, 'INVALID_FILE_TYPE');
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
      '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
    ];

    if (!allowedExtensions.includes(extension)) {
      throw new AppError(`File extension ${extension} is not allowed`, 400, 'INVALID_FILE_EXTENSION');
    }
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles(): Promise<{ deletedFiles: number; errors: string[] }> {
    const errors: string[] = [];
    let deletedFiles = 0;

    try {
      // Get all media records
      const allMedia = await this.mediaRepository.findAll();

      for (const media of allMedia) {
        const absolutePath = storageConfig.getAbsolutePath(media.filePath);
        
        // Check if physical file exists
        if (!fs.existsSync(absolutePath)) {
          try {
            // Delete database record for missing file
            await this.mediaRepository.delete(media.id);
            deletedFiles++;
          } catch (error) {
            errors.push(`Failed to delete database record for ${media.fileName}: ${error}`);
          }
        }
      }

      return { deletedFiles, errors };
    } catch (error) {
      errors.push(`Failed to cleanup orphaned files: ${error}`);
      return { deletedFiles, errors };
    }
  }

  /**
   * Get media files by uploader
   */
  async getMediaByUploader(uploadedById: string, limit?: number): Promise<MediaResponse[]> {
    const mediaFiles = await this.mediaRepository.findByUploader(uploadedById, limit);
    return mediaFiles.map(media => this.formatMediaResponse(media));
  }

  /**
   * Update media metadata
   */
  async updateMediaMetadata(
    id: string,
    metadata: { originalName?: string },
    userId: string
  ): Promise<MediaResponse> {
    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new AppError('Media file not found', 404, 'MEDIA_NOT_FOUND');
    }

    // Check permissions
    if (media.uploadedById !== userId) {
      throw new AppError('You do not have permission to update this file', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const updatedMedia = await this.mediaRepository.updateMetadata(id, metadata);
    return this.formatMediaResponse(updatedMedia);
  }

  /**
   * Format media response
   */
  private formatMediaResponse(media: Media): MediaResponse {
    return {
      id: media.id,
      entityType: media.entityType,
      entityId: media.entityId,
      fileName: media.fileName,
      originalName: media.originalName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      mediaType: media.mediaType,
      downloadUrl: `/api/media/${media.id}/download`,
      thumbnailUrl: media.isImage() ? `/api/media/${media.id}/thumbnail` : undefined,
      uploadedBy: {
        id: media.uploadedBy?.id || media.uploadedById,
        firstName: media.uploadedBy?.firstName || null,
        lastName: media.uploadedBy?.lastName || null,
        email: media.uploadedBy?.email || '',
      },
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }

  /**
   * Check if user can access media
   */
  async canUserAccessMedia(mediaId: string, userId: string, userRole: string): Promise<boolean> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      return false;
    }

    // Admin can access all media
    if (userRole === 'admin') {
      return true;
    }

    // Owner can access their own uploads
    if (media.uploadedById === userId) {
      return true;
    }

    // Additional access control logic can be added here
    // For example, staff can access media from their store's service records
    
    return false;
  }
}