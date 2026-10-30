import { z } from 'zod';
import { CUSTOMER_STATUSES } from '../utils/constants.js';
import { paginationShape } from './common.js';

const phoneField = z
  .string()
  .trim()
  .max(30)
  .nullish()
  .transform((value) => (value ? value : null));

const customerFields = {
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: phoneField,
  status: z.enum(CUSTOMER_STATUSES),
};

export const createCustomerSchema = z
  .object({
    ...customerFields,
    status: customerFields.status.default('active'),
  })
  .strict();

export const updateCustomerSchema = z
  .object(customerFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  ...paginationShape,
});
