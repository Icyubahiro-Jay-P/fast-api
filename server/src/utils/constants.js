export const CUSTOMER_STATUSES = ['active', 'inactive'];
export const PRODUCT_STATUSES = ['active', 'draft', 'archived'];
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
export const REVENUE_STATUSES = ['paid', 'shipped', 'completed'];
export const LOW_STOCK_THRESHOLD = 5;

export const CUSTOMER_SORT_FIELDS = ['name', 'email', 'status', 'createdAt', 'updatedAt'];
export const PRODUCT_SORT_FIELDS = [
  'name',
  'sku',
  'category',
  'price',
  'stock',
  'status',
  'createdAt',
  'updatedAt',
];
export const ORDER_SORT_FIELDS = [
  'orderNumber',
  'customerName',
  'totalAmount',
  'status',
  'createdAt',
  'updatedAt',
];
