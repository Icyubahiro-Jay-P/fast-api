import { z } from 'zod';
import { ORDER_STATUSES } from '../utils/constants.js';
import { objectIdSchema, paginationShape } from './common.js';

const orderItemSchema = z
  .object({
    productId: objectIdSchema,
    quantity: z.coerce.number().int().min(1).max(10000),
  })
  .strict();

const orderItemsSchema = z
  .array(orderItemSchema)
  .min(1)
  .max(50)
  .superRefine((items, context) => {
    const seen = new Set();

    items.forEach((item, index) => {
      if (seen.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          message: 'Each product may only appear once. Change the quantity instead.',
          path: [index, 'productId'],
        });
      }

      seen.add(item.productId);
    });
  });

export const createOrderSchema = z
  .object({
    customerId: objectIdSchema,
    status: z.enum(ORDER_STATUSES).default('pending'),
    items: orderItemsSchema,
  })
  .strict();

export const updateOrderSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    items: orderItemsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide a status or a replacement items list.',
  });

export const listOrdersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  customerId: objectIdSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minTotal: z.coerce.number().finite().min(0).optional(),
  maxTotal: z.coerce.number().finite().min(0).optional(),
  ...paginationShape,
});

export const monthlyRevenueQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(36).default(12),
});

export const limitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
