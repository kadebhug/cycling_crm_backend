import { Media } from '../database/models/Media';
import { BaseRepository } from './base.repository';
import { MediaAttributes, MediaType } from '../types/database/database.types';
import { Op, WhereOptions } from 'sequelize';

export interface MediaFilters {
  entityType?: string;
  entityId?: string;
  mediaType?: MediaType;
  uploadedById?: string;
  mimeType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface MediaCreateData {
  entityType: string;
  entityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadedById: string;
}

export class MediaRepository extends BaseRepository<Media> {
  constructor() {
    super(Media);
  }

  /**
   * Find media files by entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<Media[]> {
    return this.model.findAll({
      where: {
        entityType,
        entityId,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'uploadedBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  /**
   * Find media files with filters
   */
  async findWithFilters(filters: MediaFilters): Promise<Media[]> {
    const whereClause: WhereOptions = {};

    if (filters.entityType) {
      whereClause.entityType = filters.entityType;
    }

    if (filters.entityId) {
      whereClause.entityId = filters.entityId;
    }

    if (filters.mediaType) {
      whereClause.mediaType = filters.mediaType;
    }

    if (filters.uploadedById) {
      whereClause.uploadedById = filters.uploadedById;
    }

    if (filters.mimeType) {
      whereClause.mimeType = filters.mimeType;
    }

    if (filters.createdAfter || filters.createdBefore) {
      const dateFilter: any = {};
      if (filters.createdAfter) {
        dateFilter[Op.gte] = filters.createdAfter;
      }
      if (filters.createdBefore) {
        dateFilter[Op.lte] = filters.createdBefore;
      }
      whereClause.createdAt = dateFilter;
    }

    return this.model.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'uploadedBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  /**
   * Create media record with file metadata
   */
  async createMedia(data: MediaCreateData): Promise<Media> {
    // Determine media type based on MIME type
    const mediaType = Media.determineMediaType(data.mimeType);

    return this.create({
      ...data,
      mediaType,
    });
  }

  /**
   * Find media by file name
   */
  async findByFileName(fileName: string): Promise<Media | null> {
    return this.model.findOne({
      where: { fileName },
      include: [
        {
          association: 'uploadedBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  /**
   * Find media files by type
   */
  async findByMediaType(mediaType: MediaType): Promise<Media[]> {
    return this.model.findAll({
      where: { mediaType },
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'uploadedBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  /**
   * Get media statistics for an entity
   */
  async getEntityMediaStats(entityType: string, entityId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    imageCount: number;
    documentCount: number;
    videoCount: number;
  }> {
    const media = await this.findByEntity(entityType, entityId);

    const stats = {
      totalFiles: media.length,
      totalSize: media.reduce((sum, file) => sum + file.fileSize, 0),
      imageCount: media.filter(file => file.mediaType === MediaType.IMAGE).length,
      documentCount: media.filter(file => file.mediaType === MediaType.DOCUMENT).length,
      videoCount: media.filter(file => file.mediaType === MediaType.VIDEO).length,
    };

    return stats;
  }

  /**
   * Delete media files by entity (for cleanup)
   */
  async deleteByEntity(entityType: string, entityId: string): Promise<number> {
    const result = await this.model.destroy({
      where: {
        entityType,
        entityId,
      },
    });

    return result;
  }

  /**
   * Find orphaned media files (files without valid entity references)
   */
  async findOrphanedFiles(): Promise<Media[]> {
    // This would require complex joins to check if referenced entities exist
    // For now, return empty array - can be implemented based on specific needs
    return [];
  }

  /**
   * Get media files uploaded by user
   */
  async findByUploader(uploadedById: string, limit?: number): Promise<Media[]> {
    return this.model.findAll({
      where: { uploadedById },
      order: [['createdAt', 'DESC']],
      limit: limit || undefined,
      include: [
        {
          association: 'uploadedBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  /**
   * Check if file exists by path
   */
  async existsByPath(filePath: string): Promise<boolean> {
    const media = await this.model.findOne({
      where: { filePath },
      attributes: ['id'],
    });

    return !!media;
  }

  /**
   * Update file metadata
   */
  async updateMetadata(id: string, metadata: Partial<Pick<MediaAttributes, 'fileName' | 'originalName' | 'filePath'>>): Promise<Media> {
    const media = await this.findById(id);
    if (!media) {
      throw new Error('Media file not found');
    }

    return media.update(metadata);
  }
}