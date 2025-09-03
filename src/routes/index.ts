import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { adminRoutes } from './admin.routes';
import storeRoutes from '../api/routes/store.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/stores', storeRoutes);

export { router as apiRoutes };