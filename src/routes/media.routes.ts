import { Router } from 'express';
import { MediaController } from '../controllers/media.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import {
  uploadSingle,
  uploadMultiple,
  setUploadContext,
  validateUploadedFiles,
  cleanupFailedUploads,
  handleUploadError,
} from '../middleware/upload.middleware';
import { Permission } from '../types/database/database.types';

const router = Router();
const mediaController = new MediaController();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload a single media file
 *     description: Upload a single file and associate it with an entity (service record, bike, etc.)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/MediaUploadRequest'
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Media'
 *                 message:
 *                   type: string
 *                   example: 'File uploaded successfully'
 *       400:
 *         description: Bad request - invalid file or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_file:
 *                 summary: No file provided
 *                 value:
 *                   success: false
 *                   error:
 *                     code: 'NO_FILE_PROVIDED'
 *                     message: 'No file was uploaded'
 *               file_too_large:
 *                 summary: File too large
 *                 value:
 *                   success: false
 *                   error:
 *                     code: 'FILE_TOO_LARGE'
 *                     message: 'File size exceeds maximum allowed size of 10485760 bytes'
 *               invalid_file_type:
 *                 summary: Invalid file type
 *                 value:
 *                   success: false
 *                   error:
 *                     code: 'INVALID_FILE_TYPE'
 *                     message: 'File type application/x-executable is not allowed'
 *               invalid_entity_type:
 *                 summary: Invalid entity type
 *                 value:
 *                   success: false
 *                   error:
 *                     code: 'INVALID_ENTITY_TYPE'
 *                     message: 'Entity type "invalid_type" is not supported'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       413:
 *         description: Payload too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/upload',
  requirePermission(Permission.UPLOAD_MEDIA),
  setUploadContext('general', 1),
  cleanupFailedUploads,
  uploadSingle('file'),
  handleUploadError,
  validateUploadedFiles,
  mediaController.uploadFile
);

/**
 * @swagger
 * /api/media/upload/multiple:
 *   post:
 *     summary: Upload multiple media files
 *     description: Upload multiple files at once and associate them with an entity
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/MediaMultipleUploadRequest'
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 message:
 *                   type: string
 *                   example: '3 files uploaded successfully'
 *       400:
 *         description: Bad request - invalid files or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       413:
 *         description: Too many files or payload too large
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/upload/multiple',
  requirePermission(Permission.UPLOAD_MEDIA),
  setUploadContext('general', 5),
  cleanupFailedUploads,
  uploadMultiple('files', 5),
  handleUploadError,
  validateUploadedFiles,
  mediaController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/media/upload/service-record/{serviceRecordId}:
 *   post:
 *     summary: Upload files to a service record
 *     description: Upload multiple files and associate them with a specific service record
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceRecordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: 'Files to upload (max 10 files)'
 *     responses:
 *       201:
 *         description: Files uploaded successfully to service record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 message:
 *                   type: string
 *                   example: '5 files uploaded successfully'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Service record not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/upload/service-record/:serviceRecordId',
  requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  setUploadContext('service_record', 10),
  cleanupFailedUploads,
  uploadMultiple('files', 10),
  handleUploadError,
  validateUploadedFiles,
  (req, res, next) => {
    // Set entityType and entityId from route params
    req.body.entityType = 'service_record';
    req.body.entityId = req.params.serviceRecordId;
    next();
  },
  mediaController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/media/upload/service-update/{serviceUpdateId}:
 *   post:
 *     summary: Upload files to a service update
 *     description: Upload files and associate them with a specific service update
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceUpdateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service update ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Files uploaded successfully to service update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Service update not found
 */
router.post(
  '/upload/service-update/:serviceUpdateId',
  requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  setUploadContext('service_update', 5),
  cleanupFailedUploads,
  uploadMultiple('files', 5),
  handleUploadError,
  validateUploadedFiles,
  (req, res, next) => {
    // Set entityType and entityId from route params
    req.body.entityType = 'service_update';
    req.body.entityId = req.params.serviceUpdateId;
    next();
  },
  mediaController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/media/upload/quotation/{quotationId}:
 *   post:
 *     summary: Upload files to a quotation
 *     description: Upload files and associate them with a specific quotation
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quotation ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 3
 *     responses:
 *       201:
 *         description: Files uploaded successfully to quotation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/upload/quotation/:quotationId',
  requirePermission(Permission.UPDATE_QUOTATIONS),
  setUploadContext('quotation', 3),
  cleanupFailedUploads,
  uploadMultiple('files', 3),
  handleUploadError,
  validateUploadedFiles,
  (req, res, next) => {
    // Set entityType and entityId from route params
    req.body.entityType = 'quotation';
    req.body.entityId = req.params.quotationId;
    next();
  },
  mediaController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/media/upload/bike/{bikeId}:
 *   post:
 *     summary: Upload files to a bike
 *     description: Upload photos and documents for a specific bike
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bike ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: 'Bike photos and documents (max 5 files)'
 *     responses:
 *       201:
 *         description: Files uploaded successfully to bike
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/upload/bike/:bikeId',
  setUploadContext('bike', 5),
  cleanupFailedUploads,
  uploadMultiple('files', 5),
  handleUploadError,
  validateUploadedFiles,
  (req, res, next) => {
    // Set entityType and entityId from route params
    req.body.entityType = 'bike';
    req.body.entityId = req.params.bikeId;
    next();
  },
  mediaController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/media/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get media files by entity
 *     description: Retrieve all media files associated with a specific entity
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [service_record, service_update, quotation, invoice, bike, user, store]
 *         description: Type of entity
 *         example: service_record
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Entity ID
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       200:
 *         description: Media files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       example: 5
 *                       description: Number of files found
 *       400:
 *         description: Invalid entity type or ID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Entity not found
 */
router.get(
  '/entity/:entityType/:entityId',
  requirePermission(Permission.VIEW_MEDIA),
  mediaController.getMediaByEntity
);

/**
 * @swagger
 * /api/media/search:
 *   get:
 *     summary: Search media files with filters
 *     description: Search and filter media files by various criteria
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [service_record, service_update, quotation, invoice, bike, user, store]
 *         description: Filter by entity type
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by entity ID
 *       - in: query
 *         name: mediaType
 *         schema:
 *           type: string
 *           enum: [image, document, video]
 *         description: Filter by media type
 *       - in: query
 *         name: uploadedById
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by uploader user ID
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *         description: Filter by MIME type
 *         example: 'image/jpeg'
 *       - in: query
 *         name: createdAfter
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter files created after this date
 *       - in: query
 *         name: createdBefore
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter files created before this date
 *     responses:
 *       200:
 *         description: Media files found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       example: 12
 *                     filters:
 *                       $ref: '#/components/schemas/MediaSearchFilters'
 *       400:
 *         description: Invalid filter parameters
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/search',
  requirePermission(Permission.VIEW_MEDIA),
  mediaController.getMediaWithFilters
);

/**
 * @swagger
 * /api/media/my-uploads:
 *   get:
 *     summary: Get current user's uploaded files
 *     description: Retrieve all media files uploaded by the current user
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of files to return
 *     responses:
 *       200:
 *         description: User's uploaded files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                       example: 8
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/my-uploads',
  mediaController.getMyMedia
);

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Get media file by ID
 *     description: Retrieve metadata for a specific media file
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media file ID
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       200:
 *         description: Media file metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Media'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Media file not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:id',
  requirePermission(Permission.VIEW_MEDIA),
  mediaController.getMediaById
);

/**
 * @swagger
 * /api/media/{id}/download:
 *   get:
 *     summary: Download media file
 *     description: Download the actual media file content
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media file ID
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Type:
 *             description: MIME type of the file
 *             schema:
 *               type: string
 *               example: 'image/jpeg'
 *           Content-Length:
 *             description: Size of the file in bytes
 *             schema:
 *               type: integer
 *               example: 2048576
 *           Content-Disposition:
 *             description: Attachment header with filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="bike_photo.jpg"'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Access denied - insufficient permissions to access this file
 *       404:
 *         description: Media file not found or physical file missing
 *       500:
 *         description: Error reading file from storage
 */
router.get(
  '/:id/download',
  mediaController.downloadFile
);

/**
 * @swagger
 * /api/media/{id}/view:
 *   get:
 *     summary: View media file inline
 *     description: View the media file content inline in the browser (for images, PDFs, etc.)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media file ID
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       200:
 *         description: File content for inline viewing
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Type:
 *             description: MIME type of the file
 *             schema:
 *               type: string
 *           Content-Disposition:
 *             description: Inline header with filename
 *             schema:
 *               type: string
 *               example: 'inline; filename="bike_photo.jpg"'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Media file not found
 */
router.get(
  '/:id/view',
  mediaController.viewFile
);

/**
 * @swagger
 * /api/media/stats/{entityType}/{entityId}:
 *   get:
 *     summary: Get media statistics for an entity
 *     description: Get statistics about media files associated with a specific entity
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [service_record, service_update, quotation, invoice, bike, user, store]
 *         description: Type of entity
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Entity ID
 *     responses:
 *       200:
 *         description: Media statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MediaStats'
 *       400:
 *         description: Invalid entity type or ID
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Entity not found
 */
router.get(
  '/stats/:entityType/:entityId',
  requirePermission(Permission.VIEW_MEDIA),
  mediaController.getEntityMediaStats
);

/**
 * @swagger
 * /api/media/{id}/metadata:
 *   patch:
 *     summary: Update media file metadata
 *     description: Update metadata for a media file (only the file owner can update)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media file ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MediaUpdateMetadataRequest'
 *     responses:
 *       200:
 *         description: Media metadata updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Media'
 *                 message:
 *                   type: string
 *                   example: 'Media metadata updated successfully'
 *       400:
 *         description: Invalid request data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Access denied - only file owner can update metadata
 *       404:
 *         description: Media file not found
 */
router.patch(
  '/:id/metadata',
  mediaController.updateMediaMetadata
);

/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Delete media file
 *     description: Delete a media file and its associated metadata (only the file owner can delete)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media file ID
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       200:
 *         description: Media file deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Media file deleted successfully'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Access denied - only file owner can delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: 'INSUFFICIENT_PERMISSIONS'
 *                 message: 'You do not have permission to delete this file'
 *       404:
 *         description: Media file not found
 *       500:
 *         description: Error deleting file from storage
 */
router.delete(
  '/:id',
  mediaController.deleteMedia
);

/**
 * @swagger
 * /api/media/admin/cleanup-orphaned:
 *   post:
 *     summary: Clean up orphaned media files (Admin only)
 *     description: Remove orphaned media files that no longer have valid entity references
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MediaCleanupResult'
 *                 message:
 *                   type: string
 *                   example: 'Cleanup completed. 5 orphaned files removed.'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: 'ADMIN_REQUIRED'
 *                 message: 'Admin access required'
 *       500:
 *         description: Error during cleanup process
 */
router.post(
  '/admin/cleanup-orphaned',
  mediaController.cleanupOrphanedFiles
);

export default router;