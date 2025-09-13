import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticateToken, requireCustomer } from '../middleware/auth.middleware';
import { UserRole } from '../types/database/database.types';

const router = Router();
const customerController = new CustomerController();

// Apply authentication middleware to all customer routes
router.use(authenticateToken);

// Apply customer role requirement to all routes
router.use(requireCustomer);

/**
 * @swagger
 * /api/customers/profile:
 *   get:
 *     summary: Get customer profile
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile retrieved successfully
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
 *                     customer:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/profile', customerController.getProfile);

/**
 * @swagger
 * /api/customers/bikes:
 *   post:
 *     summary: Register a new bike
 *     tags: [Customer Bikes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Trek"
 *               model:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Domane SL 7"
 *               year:
 *                 type: integer
 *                 minimum: 1800
 *                 example: 2023
 *               serialNumber:
 *                 type: string
 *                 maxLength: 100
 *                 example: "WTU123456789"
 *               color:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Matte Black"
 *               bikeType:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Road Bike"
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Carbon frame with Ultegra groupset"
 *     responses:
 *       201:
 *         description: Bike registered successfully
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
 *                     bike:
 *                       $ref: '#/components/schemas/Bike'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/bikes', customerController.registerBike);

/**
 * @swagger
 * /api/customers/bikes:
 *   get:
 *     summary: Get all bikes for the customer
 *     tags: [Customer Bikes]
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, brand, model, year]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Bikes retrieved successfully
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
 *                     $ref: '#/components/schemas/Bike'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/bikes', customerController.getBikes);

/**
 * @swagger
 * /api/customers/bikes/search:
 *   get:
 *     summary: Search bikes for the customer
 *     tags: [Customer Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *         description: Filter by model
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: bikeType
 *         schema:
 *           type: string
 *         description: Filter by bike type
 *       - in: query
 *         name: serialNumber
 *         schema:
 *           type: string
 *         description: Filter by serial number
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
 *     responses:
 *       200:
 *         description: Bikes search results
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
 *                     $ref: '#/components/schemas/Bike'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/bikes/search', customerController.searchBikes);

/**
 * @swagger
 * /api/customers/bikes/stats:
 *   get:
 *     summary: Get bike statistics for the customer
 *     tags: [Customer Bikes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bike statistics retrieved successfully
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalBikes:
 *                           type: integer
 *                           example: 3
 *                         bikesByType:
 *                           type: object
 *                           example: { "Road Bike": 2, "Mountain Bike": 1 }
 *                         bikesByBrand:
 *                           type: object
 *                           example: { "Trek": 2, "Specialized": 1 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/bikes/stats', customerController.getBikeStats);

/**
 * @swagger
 * /api/customers/bikes/{id}:
 *   get:
 *     summary: Get a specific bike by ID
 *     tags: [Customer Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bike ID
 *     responses:
 *       200:
 *         description: Bike retrieved successfully
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
 *                     bike:
 *                       $ref: '#/components/schemas/Bike'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/bikes/:id', customerController.getBikeById);

/**
 * @swagger
 * /api/customers/bikes/{id}:
 *   put:
 *     summary: Update a bike
 *     tags: [Customer Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bike ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *                 maxLength: 100
 *               model:
 *                 type: string
 *                 maxLength: 100
 *               year:
 *                 type: integer
 *                 minimum: 1800
 *               serialNumber:
 *                 type: string
 *                 maxLength: 100
 *               color:
 *                 type: string
 *                 maxLength: 50
 *               bikeType:
 *                 type: string
 *                 maxLength: 50
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Bike updated successfully
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
 *                     bike:
 *                       $ref: '#/components/schemas/Bike'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.put('/bikes/:id', customerController.updateBike);

/**
 * @swagger
 * /api/customers/bikes/{id}:
 *   delete:
 *     summary: Delete a bike
 *     tags: [Customer Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bike ID
 *     responses:
 *       200:
 *         description: Bike deleted successfully
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
 *                       example: "Bike deleted successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/bikes/:id', customerController.deleteBike);

/**
 * @swagger
 * /api/customers/bikes/{id}/verify-ownership:
 *   get:
 *     summary: Verify bike ownership
 *     tags: [Customer Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Bike ID
 *     responses:
 *       200:
 *         description: Ownership verification result
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
 *                     isOwner:
 *                       type: boolean
 *                       example: true
 *                     bikeId:
 *                       type: string
 *                       format: uuid
 *                     customerId:
 *                       type: string
 *                       format: uuid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/bikes/:id/verify-ownership', customerController.verifyBikeOwnership);

// Service Request Routes

/**
 * @swagger
 * /api/customers/service-requests:
 *   post:
 *     summary: Create a new service request
 *     tags: [Customer Service Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bikeId
 *               - storeId
 *               - requestedServices
 *             properties:
 *               bikeId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               storeId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               requestedServices:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 20
 *                 example: ["Brake adjustment", "Chain lubrication", "Tire pressure check"]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 example: "medium"
 *               preferredDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-25T10:00:00Z"
 *               customerNotes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Brakes are squeaking when I apply them"
 *     responses:
 *       201:
 *         description: Service request created successfully
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
 *                     serviceRequest:
 *                       $ref: '#/components/schemas/ServiceRequest'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/service-requests', customerController.createServiceRequest);

/**
 * @swagger
 * /api/customers/service-requests:
 *   get:
 *     summary: Get all service requests for the customer
 *     tags: [Customer Service Requests]
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, priority, status, preferredDate]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
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
 *         name: storeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by store
 *       - in: query
 *         name: bikeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by bike
 *     responses:
 *       200:
 *         description: Service requests retrieved successfully
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
 *                     $ref: '#/components/schemas/ServiceRequest'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/service-requests', customerController.getServiceRequests);

/**
 * @swagger
 * /api/customers/service-requests/stats:
 *   get:
 *     summary: Get service request statistics for the customer
 *     tags: [Customer Service Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service request statistics retrieved successfully
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 15
 *                         byStatus:
 *                           type: object
 *                           example: { "pending": 2, "in_progress": 1, "completed": 12 }
 *                         recent:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ServiceRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/service-requests/stats', customerController.getServiceRequestStats);

/**
 * @swagger
 * /api/customers/service-requests/{id}:
 *   get:
 *     summary: Get a specific service request by ID
 *     tags: [Customer Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     serviceRequest:
 *                       $ref: '#/components/schemas/ServiceRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/service-requests/:id', customerController.getServiceRequestById);

/**
 * @swagger
 * /api/customers/service-requests/{id}:
 *   put:
 *     summary: Update a service request
 *     tags: [Customer Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               requestedServices:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 20
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               preferredDate:
 *                 type: string
 *                 format: date-time
 *               customerNotes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Service request updated successfully
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
 *                     serviceRequest:
 *                       $ref: '#/components/schemas/ServiceRequest'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.put('/service-requests/:id', customerController.updateServiceRequest);

/**
 * @swagger
 * /api/customers/service-requests/{id}/cancel:
 *   post:
 *     summary: Cancel a service request
 *     tags: [Customer Service Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     serviceRequest:
 *                       $ref: '#/components/schemas/ServiceRequest'
 *                     message:
 *                       type: string
 *                       example: "Service request cancelled successfully"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/service-requests/:id/cancel', customerController.cancelServiceRequest);

/**
 * @swagger
 * /customers/service-requests/{requestId}/progress:
 *   get:
 *     summary: Get service progress for a service request
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service request ID
 *     responses:
 *       200:
 *         description: Service progress retrieved successfully
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
 *                     serviceRequest:
 *                       $ref: '#/components/schemas/ServiceRequest'
 *                     serviceRecord:
 *                       $ref: '#/components/schemas/ServiceRecord'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/service-requests/:requestId/progress', customerController.getServiceProgress);

/**
 * @swagger
 * /customers/service-requests/{requestId}/updates:
 *   get:
 *     summary: Get customer-visible service updates for a service request
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service request ID
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
 *                   type: object
 *                   properties:
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/service-requests/:requestId/updates', customerController.getServiceUpdates);

export { router as customerRoutes };