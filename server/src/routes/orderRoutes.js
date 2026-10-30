import { Router } from 'express';
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
} from '../controllers/orderController.js';
import { validate } from '../middleware/validate.js';
import { validateObjectIdParam } from '../middleware/validateObjectId.js';
import { createOrderSchema, listOrdersQuerySchema, updateOrderSchema } from '../schemas/order.js';

const router = Router();

router
  .route('/')
  .get(validate({ query: listOrdersQuerySchema }), listOrders)
  .post(validate({ body: createOrderSchema }), createOrder);

router
  .route('/:id')
  .all(validateObjectIdParam)
  .get(getOrder)
  .patch(validate({ body: updateOrderSchema }), updateOrder)
  .delete(deleteOrder);

export default router;
