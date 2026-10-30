import { z } from 'zod';
import { PRODUCT_STATUSES } from '../utils/constants.js';
import { paginationShape } from './common.js';

const productFields = {
  name: z.string().trim().min(2).max(160),
  sku: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'SKU may contain letters, numbers, dashes, and underscores.')
    .transform((value) => value.toUpperCase()),
  category: z.string().trim().min(2).max(60),
  price: z.coerce.number().finite().min(0.01),
  stock: z.coerce.number().int().min(0).default(0),
  status: z.enum(PRODUCT_STATUSES),
};

export const createProductSchema = z
  .object({
    ...productFields,
    status: productFields.status.default('active'),
  })
  .strict();

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listProductsQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().max(60).optional(),
    status: z.enum(PRODUCT_STATUSES).optional(),
    minPrice: z.coerce.number().finite().min(0).optional(),
    maxPrice: z.coerce.number().finite().min(0).optional(),
    ...paginationShape,
  })
  .refine(
    (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
    {
      message: 'minPrice cannot be greater than maxPrice.',
      path: ['minPrice'],
    },
  );
