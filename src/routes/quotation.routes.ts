import { Router } from 'express';
import { QuotationController } from '../controllers/quotation.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PermissionMiddleware } from '../middleware/permission.middleware';
import { UserRole, Permission } from '../types/database/database.types';

const router = Router();
const quotationController = new QuotationController();

// Store-specific quotation routes (Staff/Store Owner)
// All store routes require authentication and store access
router.use('/:storeId/*', AuthMiddleware.authenticate);
router.use('/:storeId/*', PermissionMiddleware.requireStoreAccess);

/**
 * @swagger
 * /api/quotations/{storeId}/quotations:
 *   post:
 *     summary: Create a quotation
 *     description: Create a new quotation for a service request
 *     tags: [Quotations]
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
 *               - lineItems
 *             properties:
 *               serviceRequestId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               lineItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                       example: "Basic Tune-Up"
 *                     quantity:
 *                       type: number
 *                       example: 1
 *                     unitPrice:
 *                       type: number
 *                       example: 75.00
 *               taxRate:
 *                 type: number
 *                 example: 0.08
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-31T23:59:59.000Z"
 *               notes:
 *                 type: string
 *                 example: "Additional parts may be needed upon inspection"
 *     responses:
 *       201:
 *         description: Quotation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   get:
 *     summary: Get store quotations
 *     description: Retrieve all quotations for a store with filtering and pagination
 *     tags: [Quotations]
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
 *           enum: [draft, sent, approved, rejected, expired]
 *         description: Filter by status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer
 *     responses:
 *       200:
 *         description: Quotations retrieved successfully
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
 *                     $ref: '#/components/schemas/Quotation'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// Create quotation (requires CREATE_QUOTATIONS permission)
router.post(
  '/:storeId/quotations',
  PermissionMiddleware.requirePermission(Permission.CREATE_QUOTATIONS),
  quotationController.createQuotation
);

// Get store quotations (requires VIEW_QUOTATIONS permission)
router.get(
  '/:storeId/quotations',
  PermissionMiddleware.requirePermission(Permission.VIEW_QUOTATIONS),
  quotationController.getStoreQuotations
);

/**
 * @swagger
 * /api/quotations/{storeId}/quotations/stats:
 *   get:
 *     summary: Get quotation statistics
 *     description: Get statistics about quotations for the store
 *     tags: [Quotations]
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
 *         description: Quotation statistics retrieved successfully
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
 *                     total:
 *                       type: number
 *                       example: 50
 *                     byStatus:
 *                       type: object
 *                       example: { "draft": 5, "sent": 15, "approved": 20, "rejected": 8, "expired": 2 }
 *                     totalValue:
 *                       type: number
 *                       example: 12500.00
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// Get quotation statistics (requires VIEW_QUOTATIONS permission)
router.get(
  '/:storeId/quotations/stats',
  PermissionMiddleware.requirePermission(Permission.VIEW_QUOTATIONS),
  quotationController.getQuotationStats
);

/**
 * @swagger
 * /api/quotations/{storeId}/quotations/expiring:
 *   get:
 *     summary: Get expiring quotations
 *     description: Get quotations that are expiring soon
 *     tags: [Quotations]
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
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 7
 *         description: Number of days to look ahead for expiring quotations
 *     responses:
 *       200:
 *         description: Expiring quotations retrieved successfully
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
 *                     $ref: '#/components/schemas/Quotation'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// Get expiring quotations (requires VIEW_QUOTATIONS permission)
router.get(
  '/:storeId/quotations/expiring',
  PermissionMiddleware.requirePermission(Permission.VIEW_QUOTATIONS),
  quotationController.getExpiringQuotations
);

/**
 * @swagger
 * /api/quotations/{storeId}/quotations/{quotationId}:
 *   get:
 *     summary: Get quotation by ID
 *     description: Retrieve a specific quotation by its ID
 *     tags: [Quotations]
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
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quotation not found
 *   put:
 *     summary: Update quotation
 *     description: Update an existing quotation
 *     tags: [Quotations]
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
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quotation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lineItems:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/QuotationLineItem'
 *               taxRate:
 *                 type: number
 *                 example: 0.08
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quotation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quotation not found
 */
// Get specific quotation (requires VIEW_QUOTATIONS permission)
router.get(
  '/:storeId/quotations/:quotationId',
  PermissionMiddleware.requirePermission(Permission.VIEW_QUOTATIONS),
  quotationController.getQuotationById
);

// Update quotation (requires UPDATE_QUOTATIONS permission)
router.put(
  '/:storeId/quotations/:quotationId',
  PermissionMiddleware.requirePermission(Permission.UPDATE_QUOTATIONS),
  quotationController.updateQuotation
);

/**
 * @swagger
 * /api/quotations/{storeId}/quotations/{quotationId}/send:
 *   post:
 *     summary: Send quotation to customer
 *     description: Send a quotation to the customer via email
 *     tags: [Quotations]
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
 *         name: quotationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quotation ID
 *     responses:
 *       200:
 *         description: Quotation sent successfully
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
 *                     quotation:
 *                       $ref: '#/components/schemas/Quotation'
 *                     message:
 *                       type: string
 *                       example: "Quotation sent to customer successfully"
 *       400:
 *         description: Quotation cannot be sent in current status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quotation not found
 */
// Send quotation to customer (requires UPDATE_QUOTATIONS permission)
router.post(
  '/:storeId/quotations/:quotationId/send',
  PermissionMiddleware.requirePermission(Permission.UPDATE_QUOTATIONS),
  quotationController.sendQuotation
);

// Customer quotation routes
// All customer routes require authentication and customer role
router.use('/customer/*', AuthMiddleware.authenticate);
router.use('/customer/*', PermissionMiddleware.requireRole(UserRole.CUSTOMER));

/**
 * @swagger
 * /api/quotations/customer/quotations:
 *   get:
 *     summary: Get customer quotations
 *     description: Retrieve all quotations for the current customer
 *     tags: [Customer Quotations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           enum: [draft, sent, approved, rejected, expired]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Customer quotations retrieved successfully
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
 *                     $ref: '#/components/schemas/Quotation'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// Get customer quotations
router.get(
  '/customer/quotations',
  quotationController.getCustomerQuotations
);

/**
 * @swagger
 * /api/quotations/customer/quotations/stats:
 *   get:
 *     summary: Get customer quotation statistics
 *     description: Get statistics about quotations for the current customer
 *     tags: [Customer Quotations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer quotation statistics retrieved successfully
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
 *                     total:
 *                       type: number
 *                       example: 8
 *                     byStatus:
 *                       type: object
 *                       example: { "sent": 2, "approved": 4, "rejected": 1, "expired": 1 }
 *                     totalValue:
 *                       type: number
 *                       example: 850.00
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// Get customer quotation statistics
router.get(
  '/customer/quotations/stats',
  quotationController.getQuotationStats
);

/**
 * @swagger
 * /api/quotations/customer/quotations/{quotationId}:
 *   get:
 *     summary: Get customer quotation by ID
 *     description: Retrieve a specific quotation for the current customer
 *     tags: [Customer Quotations]
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
 *     responses:
 *       200:
 *         description: Customer quotation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Quotation'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quotation not found
 */
// Get specific quotation for customer
router.get(
  '/customer/quotations/:quotationId',
  quotationController.getQuotationById
);

/**
 * @swagger
 * /api/quotations/customer/quotations/{quotationId}/approve:
 *   post:
 *     summary: Approve quotation
 *     description: Approve a quotation as a customer
 *     tags: [Customer Quotations]
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
 *     responses:
 *       200:
 *         description: Quotation approved successfully
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
 *                     quotation:
 *                       $ref: '#/components/schemas/Quotation'
 *                     message:
 *                       type: string
 *                       example: "Quotation approved successfully"
 *       400:
 *         description: Quotation cannot be approved in current status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quotation not found
 */
// Approve quotation
router.post(
  '/customer/quotations/:quotationId/approve',
  quotationController.approveQuotation
);

/**
 * @swagger
 * /api/quotations/customer/quotations/{quotationId}/reject:
 *   post:
 *     summary: Reject quotation
 *     description: Reject a quotation as a customer
 *     tags: [Customer Quotations]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Price is too high"
 *                 description: Optional reason for rejection
 *     responses:
 *       200:
 *         description: Quotation rejected successfully
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
 *                     quotation:
 *                       $ref: '#/components/schemas/Quotation'
 *                     message:
 *                       type: string
 *                       example: "Quotation rejected successfully"
 *       400:
 *         description: Quotation cannot be rejected in current status
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quotation not found
 */
// Reject quotation
router.post(
  '/customer/quotations/:quotationId/reject',
  quotationController.rejectQuotation
);

export { router as quotationRoutes };