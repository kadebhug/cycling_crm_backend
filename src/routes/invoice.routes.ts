import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requirePermission, requireRole } from '../middleware/permission.middleware';
import { UserRole, Permission } from '../types/database/database.types';

const router = Router();
const invoiceController = new InvoiceController();

/**
 * @swagger
 * components:
 *   schemas:
 *     InvoiceLineItem:
 *       type: object
 *       required:
 *         - description
 *         - quantity
 *         - unitPrice
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the line item
 *         description:
 *           type: string
 *           description: Description of the service or item
 *           maxLength: 500
 *         quantity:
 *           type: number
 *           minimum: 0.01
 *           description: Quantity of the item
 *         unitPrice:
 *           type: number
 *           minimum: 0
 *           description: Unit price of the item
 *         total:
 *           type: number
 *           description: Total price (quantity * unitPrice)
 *       example:
 *         id: "item_1234567890_0"
 *         description: "Brake pad replacement"
 *         quantity: 2
 *         unitPrice: 25.00
 *         total: 50.00
 * 
 *     CreateInvoiceRequest:
 *       type: object
 *       required:
 *         - serviceRecordId
 *         - taxRate
 *       properties:
 *         serviceRecordId:
 *           type: string
 *           format: uuid
 *           description: ID of the completed service record
 *         quotationId:
 *           type: string
 *           format: uuid
 *           description: Optional quotation to base invoice on
 *         lineItems:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - description
 *               - quantity
 *               - unitPrice
 *             properties:
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               quantity:
 *                 type: number
 *                 minimum: 0.01
 *               unitPrice:
 *                 type: number
 *                 minimum: 0
 *           description: Custom line items (if not using quotation)
 *         taxRate:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Tax rate percentage
 *         dueDays:
 *           type: number
 *           minimum: 1
 *           default: 30
 *           description: Number of days until invoice is due
 *         notes:
 *           type: string
 *           maxLength: 2000
 *           description: Additional notes for the invoice
 *       example:
 *         serviceRecordId: "123e4567-e89b-12d3-a456-426614174000"
 *         quotationId: "123e4567-e89b-12d3-a456-426614174001"
 *         taxRate: 8.5
 *         dueDays: 30
 *         notes: "Payment due within 30 days"
 * 
 *     UpdateInvoiceRequest:
 *       type: object
 *       properties:
 *         lineItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceLineItem'
 *           description: Updated line items
 *         taxRate:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Updated tax rate percentage
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Updated due date
 *         notes:
 *           type: string
 *           maxLength: 2000
 *           description: Updated notes
 *       example:
 *         taxRate: 10.0
 *         notes: "Updated payment terms"
 * 
 *     RecordPaymentRequest:
 *       type: object
 *       required:
 *         - amount
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 0.01
 *           description: Payment amount
 *         paymentDate:
 *           type: string
 *           format: date-time
 *           description: Date of payment (defaults to current date)
 *         notes:
 *           type: string
 *           maxLength: 1000
 *           description: Payment notes
 *       example:
 *         amount: 150.00
 *         paymentDate: "2024-01-15T10:30:00Z"
 *         notes: "Cash payment received"
 * 
 *     Invoice:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         serviceRecordId:
 *           type: string
 *           format: uuid
 *         quotationId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         invoiceNumber:
 *           type: string
 *           description: Unique invoice number
 *         createdById:
 *           type: string
 *           format: uuid
 *         lineItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceLineItem'
 *         subtotal:
 *           type: number
 *           description: Subtotal before tax
 *         taxRate:
 *           type: number
 *           description: Tax rate percentage
 *         taxAmount:
 *           type: number
 *           description: Tax amount
 *         total:
 *           type: number
 *           description: Total amount including tax
 *         paidAmount:
 *           type: number
 *           description: Amount paid so far
 *         paymentStatus:
 *           type: string
 *           enum: [pending, partial, paid, overdue, cancelled]
 *         dueDate:
 *           type: string
 *           format: date-time
 *         paidDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         serviceRecord:
 *           type: object
 *           description: Associated service record details
 *         quotation:
 *           type: object
 *           description: Associated quotation details
 *         createdBy:
 *           type: object
 *           description: User who created the invoice
 *       example:
 *         id: "123e4567-e89b-12d3-a456-426614174000"
 *         invoiceNumber: "INV-20240115-123456"
 *         total: 163.25
 *         paidAmount: 0
 *         paymentStatus: "pending"
 *         dueDate: "2024-02-14T23:59:59Z"
 */

// Store owner and staff routes (with store context)
/**
 * @swagger
 * /api/stores/{storeId}/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
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
 *             $ref: '#/components/schemas/CreateInvoiceRequest'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Invoice created successfully"
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Service record not found
 *       409:
 *         description: Service record already has an invoice or cannot be invoiced
 */
router.post(
  '/stores/:storeId/invoices',
  authenticateToken,
  requirePermission(Permission.CREATE_INVOICES),
  invoiceController.createInvoice
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices:
 *   get:
 *     summary: Get invoices for a store
 *     tags: [Invoices]
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
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, dueDate, total, paymentStatus, invoiceNumber]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, overdue, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter invoices created from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter invoices created until this date
 *       - in: query
 *         name: dueDateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter invoices due from this date
 *       - in: query
 *         name: dueDateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter invoices due until this date
 *       - in: query
 *         name: isOverdue
 *         schema:
 *           type: boolean
 *         description: Filter overdue invoices
 *       - in: query
 *         name: isDueSoon
 *         schema:
 *           type: boolean
 *         description: Filter invoices due soon
 *       - in: query
 *         name: invoiceNumber
 *         schema:
 *           type: string
 *         description: Search by invoice number
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
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
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *                 message:
 *                   type: string
 *                   example: "Invoices retrieved successfully"
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/stores/:storeId/invoices',
  authenticateToken,
  requirePermission(Permission.VIEW_INVOICES),
  invoiceController.getStoreInvoices
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/{invoiceId}:
 *   get:
 *     summary: Get a specific invoice by ID
 *     tags: [Invoices]
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
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Invoice retrieved successfully"
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Invoice not found
 */
router.get(
  '/stores/:storeId/invoices/:invoiceId',
  authenticateToken,
  requirePermission(Permission.VIEW_INVOICES),
  invoiceController.getInvoiceById
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/number/{invoiceNumber}:
 *   get:
 *     summary: Get invoice by invoice number
 *     tags: [Invoices]
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
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice number
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Invoice retrieved successfully"
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Invoice not found
 */
router.get(
  '/stores/:storeId/invoices/number/:invoiceNumber',
  authenticateToken,
  requirePermission(Permission.VIEW_INVOICES),
  invoiceController.getInvoiceByNumber
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/{invoiceId}:
 *   put:
 *     summary: Update an invoice
 *     tags: [Invoices]
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
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInvoiceRequest'
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Invoice updated successfully"
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Invoice not found
 *       409:
 *         description: Invoice cannot be updated (paid or cancelled)
 */
router.put(
  '/stores/:storeId/invoices/:invoiceId',
  authenticateToken,
  requirePermission(Permission.UPDATE_INVOICES),
  invoiceController.updateInvoice
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/{invoiceId}/payment:
 *   post:
 *     summary: Record payment for an invoice
 *     tags: [Invoices]
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
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecordPaymentRequest'
 *     responses:
 *       200:
 *         description: Payment recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Payment recorded successfully"
 *       400:
 *         description: Invalid payment data
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Invoice not found
 *       409:
 *         description: Invoice cannot receive payment (cancelled or fully paid)
 */
router.post(
  '/stores/:storeId/invoices/:invoiceId/payment',
  authenticateToken,
  requirePermission(Permission.UPDATE_INVOICES),
  invoiceController.recordPayment
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/{invoiceId}/cancel:
 *   post:
 *     summary: Cancel an invoice
 *     tags: [Invoices]
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
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Invoice cancelled successfully"
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Invoice not found
 *       409:
 *         description: Invoice cannot be cancelled (already paid or cancelled)
 */
router.post(
  '/stores/:storeId/invoices/:invoiceId/cancel',
  authenticateToken,
  requirePermission(Permission.UPDATE_INVOICES),
  invoiceController.cancelInvoice
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/stats:
 *   get:
 *     summary: Get invoice statistics for a store
 *     tags: [Invoices]
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
 *         description: Invoice statistics retrieved successfully
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
 *                       type: integer
 *                       description: Total number of invoices
 *                     byStatus:
 *                       type: object
 *                       description: Count by payment status
 *                     totalValue:
 *                       type: number
 *                       description: Total value of all invoices
 *                     totalPaid:
 *                       type: number
 *                       description: Total amount paid
 *                     totalOutstanding:
 *                       type: number
 *                       description: Total outstanding amount
 *                     averageValue:
 *                       type: number
 *                       description: Average invoice value
 *                     overdue:
 *                       type: integer
 *                       description: Number of overdue invoices
 *                     dueSoon:
 *                       type: integer
 *                       description: Number of invoices due soon
 *                 message:
 *                   type: string
 *                   example: "Invoice statistics retrieved successfully"
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/stores/:storeId/invoices/stats',
  authenticateToken,
  requirePermission(Permission.VIEW_INVOICES),
  invoiceController.getInvoiceStats
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/overdue:
 *   get:
 *     summary: Get overdue invoices for a store
 *     tags: [Invoices]
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
 *         description: Overdue invoices retrieved successfully
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
 *                     $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Overdue invoices retrieved successfully"
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/stores/:storeId/invoices/overdue',
  authenticateToken,
  requirePermission(Permission.VIEW_INVOICES),
  invoiceController.getOverdueInvoices
);

/**
 * @swagger
 * /api/stores/{storeId}/invoices/due-soon:
 *   get:
 *     summary: Get invoices due soon for a store
 *     tags: [Invoices]
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
 *         description: Number of days to look ahead
 *     responses:
 *       200:
 *         description: Due soon invoices retrieved successfully
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
 *                     $ref: '#/components/schemas/Invoice'
 *                 message:
 *                   type: string
 *                   example: "Due soon invoices retrieved successfully"
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/stores/:storeId/invoices/due-soon',
  authenticateToken,
  requirePermission(Permission.VIEW_INVOICES),
  invoiceController.getDueSoonInvoices
);

// Customer routes (no store context needed)
/**
 * @swagger
 * /api/customer/invoices:
 *   get:
 *     summary: Get invoices for the authenticated customer
 *     tags: [Invoices]
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
 *           enum: [createdAt, dueDate, total, paymentStatus]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, paid, overdue, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by store ID
 *     responses:
 *       200:
 *         description: Customer invoices retrieved successfully
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
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *                 message:
 *                   type: string
 *                   example: "Invoices retrieved successfully"
 *       403:
 *         description: User is not a customer
 */
router.get(
  '/customer/invoices',
  authenticateToken,
  requireRole(UserRole.CUSTOMER),
  invoiceController.getCustomerInvoices
);

/**
 * @swagger
 * /api/customer/invoices/stats:
 *   get:
 *     summary: Get invoice statistics for the authenticated customer
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer invoice statistics retrieved successfully
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
 *                       type: integer
 *                       description: Total number of invoices
 *                     byStatus:
 *                       type: object
 *                       description: Count by payment status
 *                     totalValue:
 *                       type: number
 *                       description: Total value of all invoices
 *                     totalPaid:
 *                       type: number
 *                       description: Total amount paid
 *                     totalOutstanding:
 *                       type: number
 *                       description: Total outstanding amount
 *                     recent:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Invoice'
 *                       description: Recent invoices
 *                 message:
 *                   type: string
 *                   example: "Customer invoice statistics retrieved successfully"
 *       403:
 *         description: User is not a customer
 */
router.get(
  '/customer/invoices/stats',
  authenticateToken,
  requireRole(UserRole.CUSTOMER),
  invoiceController.getCustomerInvoiceStats
);

export default router;