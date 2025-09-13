import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PermissionMiddleware } from '../middleware/permission.middleware';
import { UserRole, Permission } from '../types/database/database.types';

const router = Router();
const staffController = new StaffController();

// Store-specific staff routes (Staff/Store Owner)
// All store routes require authentication and store access
router.use('/:storeId/*', AuthMiddleware.authenticate);
router.use('/:storeId/*', PermissionMiddleware.requireRole([UserRole.STAFF, UserRole.STORE_OWNER]));

// Service Record Management Routes

/**
 * @swagger
 * /api/staff/{storeId}/service-records:
 *   post:
 *     summary: Create a service record from an approved service request
 *     description: Create a service record to track work on an approved service request
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceRequestId
 *             properties:
 *               serviceRequestId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               assignedStaffId:
 *                 type: string
 *                 format: uuid
 *                 example: "456e7890-e89b-12d3-a456-426614174000"
 *               estimatedCompletionDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T16:00:00.000Z"
 *               notes:
 *                 type: string
 *                 example: "Initial assessment completed"
 *     responses:
 *       201:
 *         description: Service record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceRecord'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   get:
 *     summary: Get all service records for a store
 *     description: Retrieve all service records for the store with filtering and pagination
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, on_hold, completed]
 *         description: Filter by status
 *       - in: query
 *         name: assignedStaffId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by assigned staff member
 *       - in: query
 *         name: isOverdue
 *         schema:
 *           type: boolean
 *         description: Filter overdue records
 *     responses:
 *       200:
 *         description: Service records retrieved successfully
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
 *                     $ref: '#/components/schemas/ServiceRecord'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/:storeId/service-records',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  staffController.createServiceRecord
);

router.get(
  '/:storeId/service-records',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_RECORDS),
  staffController.getStoreServiceRecords
);

/**
 * @swagger
 * /api/staff/{storeId}/service-records/my:
 *   get:
 *     summary: Get service records assigned to current user
 *     description: Retrieve service records assigned to the current staff member
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, on_hold, completed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: My service records retrieved successfully
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
 *                     $ref: '#/components/schemas/ServiceRecord'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/service-records/my',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_RECORDS),
  staffController.getMyServiceRecords
);

/**
 * @swagger
 * /api/staff/{storeId}/service-records/staff/{staffId}:
 *   get:
 *     summary: Get service records assigned to a specific staff member
 *     description: Retrieve service records assigned to a specific staff member (Store Owner only)
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Staff member ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, on_hold, completed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Staff service records retrieved successfully
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
 *                     $ref: '#/components/schemas/ServiceRecord'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/service-records/staff/:staffId',
  PermissionMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_RECORDS),
  staffController.getStaffServiceRecords
);

/**
 * @swagger
 * /api/staff/{storeId}/service-records/{recordId}:
 *   get:
 *     summary: Get a specific service record by ID
 *     description: Retrieve a specific service record by its ID
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *     responses:
 *       200:
 *         description: Service record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceRecord'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Update a service record
 *     description: Update an existing service record
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assignedStaffId:
 *                 type: string
 *                 format: uuid
 *               estimatedCompletionDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceRecord'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:storeId/service-records/:recordId',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_RECORDS),
  staffController.getServiceRecordById
);

router.put(
  '/:storeId/service-records/:recordId',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  staffController.updateServiceRecord
);

/**
 * @swagger
 * /api/staff/{storeId}/service-records/{recordId}/start:
 *   post:
 *     summary: Start work on a service record
 *     description: Mark a service record as started and begin work
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *     responses:
 *       200:
 *         description: Service work started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceRecord'
 *       400:
 *         description: Cannot start work in current status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:storeId/service-records/:recordId/start',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  staffController.startServiceWork
);

/**
 * @swagger
 * /api/staff/{storeId}/service-records/{recordId}/complete:
 *   post:
 *     summary: Complete work on a service record
 *     description: Mark a service record as completed
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completionNotes:
 *                 type: string
 *                 example: "All requested services completed successfully"
 *               actualHours:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Service work completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceRecord'
 *       400:
 *         description: Cannot complete work in current status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:storeId/service-records/:recordId/complete',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  staffController.completeServiceWork
);

/**
 * @swagger
 * /api/staff/{storeId}/service-records/{recordId}/hold:
 *   post:
 *     summary: Put a service record on hold
 *     description: Put a service record on hold with a reason
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               holdReason:
 *                 type: string
 *                 example: "Waiting for parts to arrive"
 *     responses:
 *       200:
 *         description: Service record put on hold successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceRecord'
 *       400:
 *         description: Cannot put on hold in current status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:storeId/service-records/:recordId/hold',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  staffController.putServiceOnHold
);

// Service Update Management Routes

/**
 * @swagger
 * /api/staff/{storeId}/service-records/{recordId}/updates:
 *   post:
 *     summary: Add a service update to a service record
 *     description: Add a progress update or note to a service record
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               updateType:
 *                 type: string
 *                 enum: [progress, issue, completion, hold]
 *                 example: "progress"
 *               title:
 *                 type: string
 *                 example: "Brake adjustment completed"
 *               description:
 *                 type: string
 *                 example: "Successfully adjusted front and rear brakes"
 *               isCustomerVisible:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Service update added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceUpdate'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   get:
 *     summary: Get service updates for a service record
 *     description: Retrieve all updates for a specific service record
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service record ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: customerVisibleOnly
 *         schema:
 *           type: boolean
 *         description: Filter to only customer-visible updates
 *     responses:
 *       200:
 *         description: Service updates retrieved successfully
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
 *                     $ref: '#/components/schemas/ServiceUpdate'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post(
  '/:storeId/service-records/:recordId/updates',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  staffController.addServiceUpdate
);

router.get(
  '/:storeId/service-records/:recordId/updates',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_RECORDS),
  staffController.getServiceUpdates
);

/**
 * @swagger
 * /api/staff/{storeId}/service-updates/{updateId}:
 *   put:
 *     summary: Update a service update
 *     description: Update an existing service update (own updates only, unless store owner)
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: path
 *         name: updateId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service update ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isCustomerVisible:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Service update updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceUpdate'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/:storeId/service-updates/:updateId',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_RECORDS),
  staffController.updateServiceUpdate
);

// Statistics and Reporting Routes

/**
 * @swagger
 * /api/staff/{storeId}/stats/service-progress:
 *   get:
 *     summary: Get service progress statistics for the store
 *     description: Get comprehensive service progress statistics for the store (Store Owner only)
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional - get stats for specific staff member
 *     responses:
 *       200:
 *         description: Service progress statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: number
 *                       example: 50
 *                     byStatus:
 *                       type: object
 *                       example: { "pending": 5, "in_progress": 15, "completed": 25, "on_hold": 5 }
 *                     averageCompletionTime:
 *                       type: number
 *                       example: 2.5
 *                     overdueRecords:
 *                       type: number
 *                       example: 3
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/stats/service-progress',
  PermissionMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_RECORDS),
  staffController.getServiceProgressStats
);

/**
 * @swagger
 * /api/staff/{storeId}/stats/my-progress:
 *   get:
 *     summary: Get service progress statistics for the current user
 *     description: Get service progress statistics for the current staff member
 *     tags: [Staff Service Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *     responses:
 *       200:
 *         description: My service progress statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignedRecords:
 *                       type: number
 *                       example: 12
 *                     completedRecords:
 *                       type: number
 *                       example: 8
 *                     inProgressRecords:
 *                       type: number
 *                       example: 3
 *                     averageCompletionTime:
 *                       type: number
 *                       example: 2.2
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/stats/my-progress',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_RECORDS),
  staffController.getMyServiceProgressStats
);

export { router as staffRoutes };