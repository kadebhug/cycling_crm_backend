import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';
import { serviceRoutes } from './service.routes';
import { customerRoutes } from './customer.routes';
import { quotationRoutes } from './quotation.routes';
import invoiceRoutes from './invoice.routes';
import { staffRoutes } from './staff.routes';
import storeRoutes from '../api/routes/store.routes';
import mediaRoutes from './media.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/services', serviceRoutes);
router.use('/customers', customerRoutes);
router.use('/stores', quotationRoutes); // Mount quotation routes under /stores for store-specific routes
router.use('/quotations', quotationRoutes); // Also mount under /quotations for customer routes
router.use('/', invoiceRoutes); // Mount invoice routes (includes both store and customer routes)
router.use('/staff', staffRoutes);
router.use('/stores', storeRoutes);
router.use('/media', mediaRoutes);

export { router as apiRoutes };