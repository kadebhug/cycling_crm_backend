import {
  Model,
  DataTypes,
  Sequelize,
  Association,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
  ForeignKey
} from 'sequelize';
import { MediaAttributes, MediaType } from '../../types/database/database.types';
import { User } from './User';

export class Media extends Model<
  InferAttributes<Media>,
  InferCreationAttributes<Media>
> implements MediaAttributes {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare uploadedById: ForeignKey<User['id']>;

  // Required fields
  declare entityType: string;
  declare entityId: string;
  declare fileName: string;
  declare originalName: string;
  declare mimeType: string;
  declare fileSize: number;
  declare filePath: string;
  declare mediaType: MediaType;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare uploadedBy?: NonAttribute<User>;

  // Association declarations
  declare static associations: {
    uploadedBy: Association<Media, User>;
  };

  // Instance methods
  public isImage(): boolean {
    return this.mediaType === MediaType.IMAGE;
  }

  public isDocument(): boolean {
    return this.mediaType === MediaType.DOCUMENT;
  }

  public isVideo(): boolean {
    return this.mediaType === MediaType.VIDEO;
  }

  public getFormattedFileSize(): string {
    const bytes = this.fileSize;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    
    return `${size} ${sizes[i]}`;
  }

  public getFileExtension(): string {
    return this.fileName.split('.').pop()?.toLowerCase() || '';
  }

  public isImageFile(): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    return imageExtensions.includes(this.getFileExtension());
  }

  public isDocumentFile(): boolean {
    const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
    return documentExtensions.includes(this.getFileExtension());
  }

  public isVideoFile(): boolean {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    return videoExtensions.includes(this.getFileExtension());
  }

  public getMediaTypeIcon(): string {
    switch (this.mediaType) {
      case MediaType.IMAGE:
        return '🖼️';
      case MediaType.DOCUMENT:
        return '📄';
      case MediaType.VIDEO:
        return '🎥';
      default:
        return '📎';
    }
  }

  public canBePreviewedInBrowser(): boolean {
    const previewableTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
    ];
    return previewableTypes.includes(this.mimeType);
  }

  public getDownloadUrl(): string {
    // This would typically be constructed based on your file storage setup
    return `/api/media/${this.id}/download`;
  }

  public getThumbnailUrl(): string {
    // This would typically be constructed based on your thumbnail generation setup
    if (this.isImage()) {
      return `/api/media/${this.id}/thumbnail`;
    }
    return '';
  }

  // Static methods
  public static getSupportedImageTypes(): string[] {
    return [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
    ];
  }

  public static getSupportedDocumentTypes(): string[] {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
    ];
  }

  public static getSupportedVideoTypes(): string[] {
    return [
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
      'video/x-matroska',
    ];
  }

  public static getAllSupportedTypes(): string[] {
    return [
      ...Media.getSupportedImageTypes(),
      ...Media.getSupportedDocumentTypes(),
      ...Media.getSupportedVideoTypes(),
    ];
  }

  public static determineMediaType(mimeType: string): MediaType {
    if (Media.getSupportedImageTypes().includes(mimeType)) {
      return MediaType.IMAGE;
    } else if (Media.getSupportedDocumentTypes().includes(mimeType)) {
      return MediaType.DOCUMENT;
    } else if (Media.getSupportedVideoTypes().includes(mimeType)) {
      return MediaType.VIDEO;
    }
    return MediaType.DOCUMENT; // Default fallback
  }

  public static getEntityTypes(): string[] {
    return [
      'service_record',
      'service_update',
      'quotation',
      'invoice',
      'bike',
      'user',
      'store',
    ];
  }

  // Model initialization
  public static initModel(sequelize: Sequelize): typeof Media {
    Media.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        entityType: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 50],
            isIn: [Media.getEntityTypes()],
          },
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        fileName: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 255],
          },
        },
        originalName: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 255],
          },
        },
        mimeType: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 100],
            isIn: [Media.getAllSupportedTypes()],
          },
        },
        fileSize: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 104857600, // 100MB max file size
          },
        },
        filePath: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 500],
          },
        },
        mediaType: {
          type: DataTypes.ENUM(...Object.values(MediaType)),
          allowNull: false,
          validate: {
            isIn: [Object.values(MediaType)],
          },
        },
        uploadedById: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'Media',
        tableName: 'media',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            fields: ['entity_type', 'entity_id'],
          },
          {
            fields: ['uploaded_by_id'],
          },
          {
            fields: ['media_type'],
          },
          {
            fields: ['mime_type'],
          },
          {
            fields: ['created_at'],
          },
          {
            fields: ['file_name'],
          },
        ],
      }
    );

    return Media;
  }
}