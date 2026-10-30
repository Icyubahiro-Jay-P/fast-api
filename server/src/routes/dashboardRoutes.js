import { Router } from 'express';
import {
  getMonthlyRevenue,
  getOrdersByStatus,
  getProductsByCategory,
  getRecentOrders,
  getSummary,
  getTopProducts,
} from '../controllers/dashboardController.js';
import { validate } from '../middleware/validate.js';
import { limitQuerySchema, monthlyRevenueQuerySchema } from '../schemas/order.js';

const router = Router();

router.get('/summary', getSummary);
router.get('/orders-by-status', getOrdersByStatus);
router.get('/products-by-category', getProductsByCategory);
router.get(
  '/monthly-revenue',
  validate({ query: monthlyRevenueQuerySchema }),
  getMonthlyRevenue,
);
router.get('/top-products', validate({ query: limitQuerySchema }), getTopProducts);
router.get('/recent-orders', validate({ query: limitQuerySchema }), getRecentOrders);

export default router;
