import { paginationMeta } from './pagination.js';

export function sendPage(res, { items, total }, page, pageSize) {
  res.json({
    items,
    ...paginationMeta(total, page, pageSize),
  });
}
