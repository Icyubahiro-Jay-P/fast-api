import { Router } from 'express';
import customerRoutes from './customerRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import orderRoutes from './orderRoutes.js';
import productRoutes from './productRoutes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    name: 'CEDO API',
    version: 'v1',
    resources: ['customers', 'products', 'orders', 'dashboard'],
  });
});

router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
