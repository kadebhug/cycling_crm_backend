import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PermissionMiddleware } from '../middleware/permission.middleware';
import { Permission } from '../types/database/database.types';

const router = Router();
const serviceController = new ServiceController();

// Common service routes (no store-specific permissions needed)
/**
 * @swagger
 * /api/services/categories/common:
 *   get:
 *     summary: Get common service categories
 *     description: Retrieve commonly used service categories across all stores
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Common service categories retrieved successfully
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
 *                     type: string
 *                   example: ["Maintenance", "Repair", "Tune-up", "Parts Replacement"]
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/categories/common',
  serviceController.getCommonCategories
);

// Store-specific service routes (require authentication and store access)
router.use('/:storeId/*', AuthMiddleware.authenticate);
router.use('/:storeId/*', PermissionMiddleware.requireStoreAccess);

// Service CRUD operations (require appropriate permissions)
/**
 * @swagger
 * /api/services/{storeId}/services:
 *   get:
 *     summary: Get all services for a store
 *     description: Retrieve all services offered by a specific store
 *     tags: [Services]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by service category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Services retrieved successfully
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
 *                     $ref: '#/components/schemas/Service'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Store not found
 *   post:
 *     summary: Create a new service
 *     description: Create a new service for the store
 *     tags: [Services]
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
 *               - name
 *               - basePrice
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Basic Tune-Up"
 *               description:
 *                 type: string
 *                 example: "Adjust brakes, gears, and lubricate chain"
 *               basePrice:
 *                 type: number
 *                 example: 75.00
 *               estimatedDuration:
 *                 type: number
 *                 example: 60
 *               category:
 *                 type: string
 *                 example: "Maintenance"
 *     responses:
 *       201:
 *         description: Service created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/services',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.getStoreServices
);

router.post(
  '/:storeId/services',
  PermissionMiddleware.requirePermission(Permission.CREATE_SERVICES),
  serviceController.createService
);

/**
 * @swagger
 * /api/services/{storeId}/services/active:
 *   get:
 *     summary: Get active services for a store
 *     description: Retrieve only active services offered by a specific store
 *     tags: [Services]
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
 *         description: Active services retrieved successfully
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
 *                     $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/services/active',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.getActiveStoreServices
);

/**
 * @swagger
 * /api/services/{storeId}/services/search:
 *   get:
 *     summary: Search services
 *     description: Search services by name, description, or category
 *     tags: [Services]
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
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                     $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/services/search',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.searchServices
);

/**
 * @swagger
 * /api/services/{storeId}/services/categories:
 *   get:
 *     summary: Get service categories for a store
 *     description: Retrieve all service categories used by a specific store
 *     tags: [Services]
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
 *         description: Service categories retrieved successfully
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
 *                     type: string
 *                   example: ["Maintenance", "Repair", "Tune-up"]
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/services/categories',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.getStoreCategories
);

/**
 * @swagger
 * /api/services/{storeId}/services/stats:
 *   get:
 *     summary: Get service statistics for a store
 *     description: Retrieve statistics about services offered by a store
 *     tags: [Services]
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
 *         description: Service statistics retrieved successfully
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
 *                     totalServices:
 *                       type: number
 *                       example: 25
 *                     activeServices:
 *                       type: number
 *                       example: 20
 *                     categoryCounts:
 *                       type: object
 *                       example: { "Maintenance": 10, "Repair": 8, "Tune-up": 7 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/services/stats',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.getStoreServiceStats
);

/**
 * @swagger
 * /api/services/{storeId}/services/price-range:
 *   get:
 *     summary: Get price range for store services
 *     description: Get the minimum and maximum prices for services at a store
 *     tags: [Services]
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
 *         description: Price range retrieved successfully
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
 *                     minPrice:
 *                       type: number
 *                       example: 25.00
 *                     maxPrice:
 *                       type: number
 *                       example: 200.00
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/services/price-range',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.getStorePriceRange
);

/**
 * @swagger
 * /api/services/{storeId}/services/category/{category}:
 *   get:
 *     summary: Get services by category
 *     description: Retrieve all services in a specific category for a store
 *     tags: [Services]
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
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Service category
 *         example: "Maintenance"
 *     responses:
 *       200:
 *         description: Services in category retrieved successfully
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
 *                     $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/:storeId/services/category/:category',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.getServicesByCategory
);

/**
 * @swagger
 * /api/services/{storeId}/services/{serviceId}:
 *   get:
 *     summary: Get service by ID
 *     description: Retrieve a specific service by its ID
 *     tags: [Services]
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
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Service not found
 *   put:
 *     summary: Update service
 *     description: Update an existing service
 *     tags: [Services]
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
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Advanced Tune-Up"
 *               description:
 *                 type: string
 *                 example: "Complete bike overhaul with detailed inspection"
 *               basePrice:
 *                 type: number
 *                 example: 125.00
 *               estimatedDuration:
 *                 type: number
 *                 example: 120
 *               category:
 *                 type: string
 *                 example: "Maintenance"
 *     responses:
 *       200:
 *         description: Service updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Service not found
 *   delete:
 *     summary: Delete service
 *     description: Delete a service (soft delete)
 *     tags: [Services]
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
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service deleted successfully
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
 *                   example: "Service deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Service not found
 */
router.get(
  '/:storeId/services/:serviceId',
  PermissionMiddleware.requirePermission(Permission.VIEW_SERVICES),
  serviceController.getServiceById
);

router.put(
  '/:storeId/services/:serviceId',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICES),
  serviceController.updateService
);

/**
 * @swagger
 * /api/services/{storeId}/services/{serviceId}/activate:
 *   post:
 *     summary: Activate service
 *     description: Activate a deactivated service
 *     tags: [Services]
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
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Service not found
 */
router.post(
  '/:storeId/services/:serviceId/activate',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICES),
  serviceController.activateService
);

/**
 * @swagger
 * /api/services/{storeId}/services/{serviceId}/deactivate:
 *   post:
 *     summary: Deactivate service
 *     description: Deactivate an active service
 *     tags: [Services]
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
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Service not found
 */
router.post(
  '/:storeId/services/:serviceId/deactivate',
  PermissionMiddleware.requirePermission(Permission.UPDATE_SERVICES),
  serviceController.deactivateService
);

router.delete(
  '/:storeId/services/:serviceId',
  PermissionMiddleware.requirePermission(Permission.DELETE_SERVICES),
  serviceController.deleteService
);

export { router as serviceRoutes };