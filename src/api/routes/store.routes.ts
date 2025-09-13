import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { PermissionMiddleware } from '../../middleware/permission.middleware';
import { UserRole, Permission } from '../../types/database/database.types';

const router = Router();
const storeController = new StoreController();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.authenticate);

/**
 * @swagger
 * /api/stores/{storeId}/staff:
 *   post:
 *     tags: [Stores]
 *     summary: Create staff member
 *     description: Create a new staff member for a specific store
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
 *             $ref: '#/components/schemas/CreateStaffRequest'
 *     responses:
 *       201:
 *         description: Staff member created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - store owner access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - no access to this store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags: [Stores]
 *     summary: Get store staff
 *     description: Retrieve all staff members for a specific store
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
 *         description: Staff members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Staff'
 *       401:
 *         description: Unauthorized - store owner or staff access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - no access to this store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:storeId/staff',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.createStaff
);

router.get(
  '/:storeId/staff',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  storeController.getStoreStaff
);

/**
 * @swagger
 * /api/stores/{storeId}/staff/{staffId}:
 *   get:
 *     tags: [Stores]
 *     summary: Get staff member by ID
 *     description: Retrieve a specific staff member by their ID
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
 *     responses:
 *       200:
 *         description: Staff member retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - store owner or staff access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - no access to this store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Stores]
 *     summary: Update staff member
 *     description: Update staff member information
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStaffRequest'
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - store owner access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - no access to this store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Stores]
 *     summary: Remove staff member
 *     description: Remove a staff member from the store
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
 *     responses:
 *       200:
 *         description: Staff member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "Staff member removed successfully"
 *       404:
 *         description: Staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - store owner access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - no access to this store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  storeController.getStaffById
);

router.put(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.updateStaff
);

/**
 * @swagger
 * /api/stores/{storeId}/staff/{staffId}/permissions:
 *   put:
 *     tags: [Stores]
 *     summary: Update staff permissions
 *     description: Update permissions for a specific staff member
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStaffPermissionsRequest'
 *     responses:
 *       200:
 *         description: Staff permissions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Staff'
 *       404:
 *         description: Staff member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - store owner access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - no access to this store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  '/:storeId/staff/:staffId/permissions',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.updateStaffPermissions
);

router.delete(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.removeStaff
);

/**
 * @swagger
 * /api/stores/{storeId}/staff/{staffId}/add:
 *   post:
 *     summary: Add existing staff to store
 *     description: Add an existing staff member to the store
 *     tags: [Stores]
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
 *     responses:
 *       200:
 *         description: Staff member added to store successfully
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
 *                     message:
 *                       type: string
 *                       example: "Staff member added to store successfully"
 *       400:
 *         description: Staff member already belongs to this store
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Staff member not found
 */
router.post(
  '/:storeId/staff/:staffId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER]),
  PermissionMiddleware.requireStoreAccess,
  storeController.addStaffToStore
);

/**
 * @swagger
 * /api/stores/permissions:
 *   get:
 *     tags: [Stores]
 *     summary: Get available permissions
 *     description: Get list of all available permissions for staff members
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AvailablePermissions'
 *       401:
 *         description: Unauthorized - store owner or staff access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/permissions',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  storeController.getAvailablePermissions
);

// Service Request Routes

/**
 * @swagger
 * /api/stores/{storeId}/service-requests:
 *   get:
 *     tags: [Store Service Requests]
 *     summary: Get all service requests for the store
 *     description: Retrieve all service requests for a specific store with filtering and pagination
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
 *           enum: [pending, quoted, approved, in_progress, completed, cancelled, expired]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer
 *     responses:
 *       200:
 *         description: Service requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceRequest'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - no access to this store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:storeId/service-requests',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_REQUESTS),
  storeController.getStoreServiceRequests
);

/**
 * @swagger
 * /api/stores/{storeId}/service-requests/stats:
 *   get:
 *     tags: [Store Service Requests]
 *     summary: Get service request statistics for the store
 *     description: Get statistics about service requests for the store
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
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         stats:
 *                           type: object
 */
router.get(
  '/:storeId/service-requests/stats',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_REQUESTS),
  storeController.getServiceRequestStats
);

/**
 * @swagger
 * /api/stores/{storeId}/service-requests/overdue:
 *   get:
 *     tags: [Store Service Requests]
 *     summary: Get overdue service requests for the store
 *     description: Get all overdue service requests for the store
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
 *         description: Overdue service requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceRequest'
 */
router.get(
  '/:storeId/service-requests/overdue',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_REQUESTS),
  storeController.getOverdueServiceRequests
);

/**
 * @swagger
 * /api/stores/{storeId}/service-requests/high-priority:
 *   get:
 *     tags: [Store Service Requests]
 *     summary: Get high priority service requests for the store
 *     description: Get all high priority service requests for the store
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
 *         description: High priority service requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceRequest'
 */
router.get(
  '/:storeId/service-requests/high-priority',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_REQUESTS),
  storeController.getHighPriorityServiceRequests
);

/**
 * @swagger
 * /api/stores/{storeId}/service-requests/{requestId}:
 *   get:
 *     tags: [Store Service Requests]
 *     summary: Get a specific service request by ID
 *     description: Retrieve a specific service request by its ID
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
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service request ID
 *     responses:
 *       200:
 *         description: Service request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceRequest:
 *                           $ref: '#/components/schemas/ServiceRequest'
 *       404:
 *         description: Service request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/:storeId/service-requests/:requestId',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICE_REQUESTS),
  storeController.getServiceRequestById
);

/**
 * @swagger
 * /api/stores/{storeId}/service-requests/{requestId}/status:
 *   put:
 *     tags: [Store Service Requests]
 *     summary: Update service request status
 *     description: Update the status of a service request
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
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, quoted, approved, in_progress, completed, cancelled, expired]
 *                 example: "quoted"
 *     responses:
 *       200:
 *         description: Service request status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceRequest:
 *                           $ref: '#/components/schemas/ServiceRequest'
 *       400:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Service request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  '/:storeId/service-requests/:requestId/status',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_REQUESTS),
  storeController.updateServiceRequestStatus
);

/**
 * @swagger
 * /api/stores/{storeId}/service-requests/{requestId}/cancel:
 *   post:
 *     tags: [Store Service Requests]
 *     summary: Cancel a service request
 *     description: Cancel a service request from the store side
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
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service request ID
 *     responses:
 *       200:
 *         description: Service request cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceRequest:
 *                           $ref: '#/components/schemas/ServiceRequest'
 *                         message:
 *                           type: string
 *                           example: "Service request cancelled successfully"
 *       404:
 *         description: Service request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Cannot cancel service request in current status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:storeId/service-requests/:requestId/cancel',
  AuthMiddleware.requireRole([UserRole.STORE_OWNER, UserRole.STAFF]),
  PermissionMiddleware.requireStoreAccess,
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICE_REQUESTS),
  storeController.cancelServiceRequest
);

export default router;