import { MediaService } from '../../services/media.service';
import { MediaRepository } from '../../repositories/media.repository';
import { Media } from '../../database/models/Media';
import { MediaType } from '../../types/database/database.types';
import { AppError } from '../../utils/errors';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('../../repositories/media.repository');
jest.mock('fs');
jest.mock('../../middleware/upload.middleware');

const mockMediaRepository = MediaRepository as jest.MockedClass<typeof MediaRepository>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockRepository: jest.Mocked<MediaRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new mockMediaRepository() as jest.Mocked<MediaRepository>;
    mediaService = new MediaService();
    (mediaService as any).mediaRepository = mockRepository;
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      destination: '/tmp',
      filename: 'temp-file.jpg',
      path: '/tmp/temp-file.jpg',
      buffer: Buffer.from(''),
      stream: {} as any,
    };

    const uploadData = {
      entityType: 'service_record',
      entityId: 'test-entity-id',
      file: mockFile,
      uploadedById: 'test-user-id',
    };

    it('should upload file successfully', async () => {
      const mockMedia = {
        id: 'test-media-id',
        entityType: 'service_record',
        entityId: 'test-entity-id',
        fileName: 'generated-filename.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        filePath: 'service_record/2024/01/generated-filename.jpg',
        mediaType: MediaType.IMAGE,
        uploadedById: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedBy: {
          id: 'test-user-id',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        isImage: () => true,
      } as any;

      mockRepository.createMedia.mockResolvedValue(mockMedia);
      mockFs.existsSync.mockReturnValue(true);

      const result = await mediaService.uploadFile(uploadData);

      expect(result).toMatchObject({
        id: 'test-media-id',
        entityType: 'service_record',
        entityId: 'test-entity-id',
        fileName: 'generated-filename.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        mediaType: MediaType.IMAGE,
      });

      expect(mockRepository.createMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'service_record',
          entityId: 'test-entity-id',
          fileName: expect.any(String),
          originalName: 'test-image.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          filePath: expect.any(String),
          uploadedById: 'test-user-id',
        })
      );
    });

    it('should throw error for invalid entity type', async () => {
      const invalidUploadData = {
        ...uploadData,
        entityType: 'invalid_type',
      };

      await expect(mediaService.uploadFile(invalidUploadData)).rejects.toThrow(AppError);
      await expect(mediaService.uploadFile(invalidUploadData)).rejects.toThrow('Entity type \'invalid_type\' is not supported');
    });

    it('should clean up file on database error', async () => {
      mockRepository.createMedia.mockRejectedValue(new Error('Database error'));
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await expect(mediaService.uploadFile(uploadData)).rejects.toThrow('Database error');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/temp-file.jpg');
    });
  });

  describe('uploadMultipleFiles', () => {
    const mockFiles: Express.Multer.File[] = [
      {
        fieldname: 'files',
        originalname: 'image1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'temp-file1.jpg',
        path: '/tmp/temp-file1.jpg',
        buffer: Buffer.from(''),
        stream: {} as any,
      },
      {
        fieldname: 'files',
        originalname: 'image2.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        destination: '/tmp',
        filename: 'temp-file2.png',
        path: '/tmp/temp-file2.png',
        buffer: Buffer.from(''),
        stream: {} as any,
      },
    ];

    it('should upload multiple files successfully', async () => {
      const mockMedia1 = {
        id: 'media-1',
        fileName: 'file1.jpg',
        originalName: 'image1.jpg',
        mediaType: MediaType.IMAGE,
        uploadedBy: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        uploadedById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isImage: () => true,
      } as any;

      const mockMedia2 = {
        id: 'media-2',
        fileName: 'file2.png',
        originalName: 'image2.png',
        mediaType: MediaType.IMAGE,
        uploadedBy: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        uploadedById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isImage: () => true,
      } as any;

      mockRepository.createMedia
        .mockResolvedValueOnce(mockMedia1)
        .mockResolvedValueOnce(mockMedia2);

      const results = await mediaService.uploadMultipleFiles(
        'service_record',
        'entity-id',
        mockFiles,
        'user-id'
      );

      expect(results).toHaveLength(2);
      expect(mockRepository.createMedia).toHaveBeenCalledTimes(2);
    });

    it('should clean up all files on error', async () => {
      const mockMedia1 = {
        id: 'media-1',
        fileName: 'file1.jpg',
        originalName: 'image1.jpg',
        mediaType: MediaType.IMAGE,
        uploadedBy: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        uploadedById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isImage: () => true,
      } as any;

      mockRepository.createMedia
        .mockResolvedValueOnce(mockMedia1)
        .mockRejectedValueOnce(new Error('Database error'));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await expect(
        mediaService.uploadMultipleFiles('service_record', 'entity-id', mockFiles, 'user-id')
      ).rejects.toThrow('Database error');

      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/temp-file1.jpg');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/temp-file2.png');
    });
  });

  describe('getMediaByEntity', () => {
    it('should return media files for entity', async () => {
      const mockMediaFiles = [
        {
          id: 'media-1',
          entityType: 'service_record',
          entityId: 'entity-id',
          fileName: 'file1.jpg',
          originalName: 'image1.jpg',
          uploadedBy: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          isImage: () => true,
        },
      ] as any[];

      mockRepository.findByEntity.mockResolvedValue(mockMediaFiles);

      const result = await mediaService.getMediaByEntity('service_record', 'entity-id');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'media-1',
        entityType: 'service_record',
        entityId: 'entity-id',
        fileName: 'file1.jpg',
        originalName: 'image1.jpg',
      });

      expect(mockRepository.findByEntity).toHaveBeenCalledWith('service_record', 'entity-id');
    });
  });

  describe('getMediaById', () => {
    it('should return media file by ID', async () => {
      const mockMedia = {
        id: 'media-id',
        fileName: 'file.jpg',
        originalName: 'image.jpg',
        uploadedBy: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        isImage: () => true,
      } as any;

      mockRepository.findById.mockResolvedValue(mockMedia);

      const result = await mediaService.getMediaById('media-id');

      expect(result).toMatchObject({
        id: 'media-id',
        fileName: 'file.jpg',
        originalName: 'image.jpg',
      });

      expect(mockRepository.findById).toHaveBeenCalledWith('media-id');
    });

    it('should throw error if media not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(mediaService.getMediaById('non-existent-id')).rejects.toThrow(AppError);
      await expect(mediaService.getMediaById('non-existent-id')).rejects.toThrow('Media file not found');
    });
  });

  describe('deleteMedia', () => {
    it('should delete media file successfully', async () => {
      const mockMedia = {
        id: 'media-id',
        filePath: 'service_record/2024/01/file.jpg',
        uploadedById: 'user-id',
      } as any;

      mockRepository.findById.mockResolvedValue(mockMedia);
      mockRepository.delete.mockResolvedValue(true);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await mediaService.deleteMedia('media-id', 'user-id');

      expect(mockRepository.findById).toHaveBeenCalledWith('media-id');
      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalledWith('media-id');
    });

    it('should throw error if user does not own the file', async () => {
      const mockMedia = {
        id: 'media-id',
        uploadedById: 'other-user-id',
      } as any;

      mockRepository.findById.mockResolvedValue(mockMedia);

      await expect(mediaService.deleteMedia('media-id', 'user-id')).rejects.toThrow(AppError);
      await expect(mediaService.deleteMedia('media-id', 'user-id')).rejects.toThrow('You do not have permission to delete this file');
    });

    it('should throw error if media not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(mediaService.deleteMedia('non-existent-id', 'user-id')).rejects.toThrow(AppError);
      await expect(mediaService.deleteMedia('non-existent-id', 'user-id')).rejects.toThrow('Media file not found');
    });
  });

  describe('validateFile', () => {
    it('should validate file successfully', () => {
      const validFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'temp.jpg',
        path: '/tmp/temp.jpg',
        buffer: Buffer.from(''),
        stream: {} as any,
      };

      expect(() => mediaService.validateFile(validFile)).not.toThrow();
    });

    it('should throw error for file too large', () => {
      const largeFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'large.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
        destination: '/tmp',
        filename: 'temp.jpg',
        path: '/tmp/temp.jpg',
        buffer: Buffer.from(''),
        stream: {} as any,
      };

      expect(() => mediaService.validateFile(largeFile)).toThrow(AppError);
      expect(() => mediaService.validateFile(largeFile)).toThrow('File size exceeds maximum allowed size');
    });

    it('should throw error for invalid MIME type', () => {
      const invalidFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'script.exe',
        encoding: '7bit',
        mimetype: 'application/x-executable',
        size: 1024,
        destination: '/tmp',
        filename: 'temp.exe',
        path: '/tmp/temp.exe',
        buffer: Buffer.from(''),
        stream: {} as any,
      };

      expect(() => mediaService.validateFile(invalidFile)).toThrow(AppError);
      expect(() => mediaService.validateFile(invalidFile)).toThrow('File type application/x-executable is not allowed');
    });

    it('should throw error for invalid file extension', () => {
      const invalidFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'script.exe',
        encoding: '7bit',
        mimetype: 'image/jpeg', // MIME type is valid but extension is not
        size: 1024,
        destination: '/tmp',
        filename: 'temp.exe',
        path: '/tmp/temp.exe',
        buffer: Buffer.from(''),
        stream: {} as any,
      };

      expect(() => mediaService.validateFile(invalidFile)).toThrow(AppError);
      expect(() => mediaService.validateFile(invalidFile)).toThrow('File extension .exe is not allowed');
    });
  });

  describe('canUserAccessMedia', () => {
    it('should allow admin to access any media', async () => {
      const mockMedia = {
        id: 'media-id',
        uploadedById: 'other-user-id',
      } as any;

      mockRepository.findById.mockResolvedValue(mockMedia);

      const canAccess = await mediaService.canUserAccessMedia('media-id', 'admin-user-id', 'admin');

      expect(canAccess).toBe(true);
    });

    it('should allow owner to access their media', async () => {
      const mockMedia = {
        id: 'media-id',
        uploadedById: 'user-id',
      } as any;

      mockRepository.findById.mockResolvedValue(mockMedia);

      const canAccess = await mediaService.canUserAccessMedia('media-id', 'user-id', 'customer');

      expect(canAccess).toBe(true);
    });

    it('should deny access to non-owner non-admin', async () => {
      const mockMedia = {
        id: 'media-id',
        uploadedById: 'other-user-id',
      } as any;

      mockRepository.findById.mockResolvedValue(mockMedia);

      const canAccess = await mediaService.canUserAccessMedia('media-id', 'user-id', 'customer');

      expect(canAccess).toBe(false);
    });

    it('should return false for non-existent media', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const canAccess = await mediaService.canUserAccessMedia('non-existent-id', 'user-id', 'customer');

      expect(canAccess).toBe(false);
    });
  });
});
