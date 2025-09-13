import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/media.service';
import { AppError } from '../utils/errors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class MediaController {
  private mediaService: MediaService;

  constructor() {
    this.mediaService = new MediaService();
  }

  /**
   * Upload single file
   */
  uploadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.body;
      const file = req.file;

      if (!file) {
        throw new AppError('No file was uploaded', 400, 'NO_FILE_PROVIDED');
      }

      if (!entityType || !entityId) {
        throw new AppError('entityType and entityId are required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      const result = await this.mediaService.uploadFile({
        entityType,
        entityId,
        file,
        uploadedById: req.user!.id,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload multiple files
   */
  uploadMultipleFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('No files were uploaded', 400, 'NO_FILES_PROVIDED');
      }

      if (!entityType || !entityId) {
        throw new AppError('entityType and entityId are required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      const results = await this.mediaService.uploadMultipleFiles(
        entityType,
        entityId,
        files,
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: results,
        message: `${results.length} files uploaded successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get media files by entity
   */
  getMediaByEntity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;

      const mediaFiles = await this.mediaService.getMediaByEntity(entityType, entityId);

      res.json({
        success: true,
        data: mediaFiles,
        meta: {
          count: mediaFiles.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get media file by ID
   */
  getMediaById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const media = await this.mediaService.getMediaById(id);

      res.json({
        success: true,
        data: media,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Download media file
   */
  downloadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if user can access this media
      const canAccess = await this.mediaService.canUserAccessMedia(
        id,
        req.user!.id,
        req.user!.role
      );

      if (!canAccess) {
        throw new AppError('You do not have permission to access this file', 403, 'ACCESS_DENIED');
      }

      const { stream, media } = await this.mediaService.getFileStream(id);

      // Set appropriate headers
      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Content-Length', media.fileSize);
      res.setHeader('Content-Disposition', `attachment; filename="${media.originalName}"`);

      // Pipe the file stream to response
      stream.pipe(res);

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: {
              code: 'STREAM_ERROR',
              message: 'Error reading file',
            },
          });
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * View media file (inline display)
   */
  viewFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if user can access this media
      const canAccess = await this.mediaService.canUserAccessMedia(
        id,
        req.user!.id,
        req.user!.role
      );

      if (!canAccess) {
        throw new AppError('You do not have permission to access this file', 403, 'ACCESS_DENIED');
      }

      const { stream, media } = await this.mediaService.getFileStream(id);

      // Set appropriate headers for inline display
      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Content-Length', media.fileSize);
      res.setHeader('Content-Disposition', `inline; filename="${media.originalName}"`);

      // Pipe the file stream to response
      stream.pipe(res);

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: {
              code: 'STREAM_ERROR',
              message: 'Error reading file',
            },
          });
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete media file
   */
  deleteMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      await this.mediaService.deleteMedia(id, req.user!.id);

      res.json({
        success: true,
        message: 'Media file deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get media statistics for entity
   */
  getEntityMediaStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;

      const stats = await this.mediaService.getEntityMediaStats(entityType, entityId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get media files with filters
   */
  getMediaWithFilters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        entityType,
        entityId,
        mediaType,
        uploadedById,
        mimeType,
        createdAfter,
        createdBefore,
      } = req.query;

      const filters: any = {};

      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
      if (mediaType) filters.mediaType = mediaType as string;
      if (uploadedById) filters.uploadedById = uploadedById as string;
      if (mimeType) filters.mimeType = mimeType as string;
      if (createdAfter) filters.createdAfter = new Date(createdAfter as string);
      if (createdBefore) filters.createdBefore = new Date(createdBefore as string);

      const mediaFiles = await this.mediaService.getMediaWithFilters(filters);

      res.json({
        success: true,
        data: mediaFiles,
        meta: {
          count: mediaFiles.length,
          filters,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get media files uploaded by current user
   */
  getMyMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string, 10) : undefined;

      const mediaFiles = await this.mediaService.getMediaByUploader(req.user!.id, limitNum);

      res.json({
        success: true,
        data: mediaFiles,
        meta: {
          count: mediaFiles.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update media metadata
   */
  updateMediaMetadata = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { originalName } = req.body;

      const updatedMedia = await this.mediaService.updateMediaMetadata(
        id,
        { originalName },
        req.user!.id
      );

      res.json({
        success: true,
        data: updatedMedia,
        message: 'Media metadata updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clean up orphaned files (admin only)
   */
  cleanupOrphanedFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
      }

      const result = await this.mediaService.cleanupOrphanedFiles();

      res.json({
        success: true,
        data: result,
        message: `Cleanup completed. ${result.deletedFiles} orphaned files removed.`,
      });
    } catch (error) {
      next(error);
    }
  };
}
