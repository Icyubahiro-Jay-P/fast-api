import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId.');

export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().max(120).optional(),
};

export function commaSeparatedIds(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
