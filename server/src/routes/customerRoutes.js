import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../controllers/customerController.js';
import { validate } from '../middleware/validate.js';
import { validateObjectIdParam } from '../middleware/validateObjectId.js';
import { createCustomerSchema, listCustomersQuerySchema, updateCustomerSchema } from '../schemas/customer.js';

const router = Router();

router
  .route('/')
  .get(validate({ query: listCustomersQuerySchema }), listCustomers)
  .post(validate({ body: createCustomerSchema }), createCustomer);

router
  .route('/:id')
  .all(validateObjectIdParam)
  .get(getCustomer)
  .patch(validate({ body: updateCustomerSchema }), updateCustomer)
  .delete(deleteCustomer);

export default router;
