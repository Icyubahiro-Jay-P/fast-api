import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/productController.js';
import { validate } from '../middleware/validate.js';
import { validateObjectIdParam } from '../middleware/validateObjectId.js';
import { createProductSchema, listProductsQuerySchema, updateProductSchema } from '../schemas/product.js';

const router = Router();

router
  .route('/')
  .get(validate({ query: listProductsQuerySchema }), listProducts)
  .post(validate({ body: createProductSchema }), createProduct);

router
  .route('/:id')
  .all(validateObjectIdParam)
  .get(getProduct)
  .patch(validate({ body: updateProductSchema }), updateProduct)
  .delete(deleteProduct);

export default router;
