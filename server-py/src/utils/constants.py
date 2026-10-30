PRODUCT_STATUSES = ["active", "draft", "discontinued"]
CUSTOMER_STATUSES = ["active", "inactive"]
ORDER_STATUSES = ["pending", "paid", "shipped", "completed", "cancelled"]
REVENUE_STATUSES = ["paid", "shipped", "completed"]
LOW_STOCK_THRESHOLD = 10

PRODUCT_SORT_FIELDS = {"name", "sku", "category", "price", "stock", "status", "createdAt", "updatedAt"}
CUSTOMER_SORT_FIELDS = {"name", "email", "status", "createdAt", "updatedAt"}
ORDER_SORT_FIELDS = {"orderNumber", "customerName", "totalAmount", "status", "createdAt", "updatedAt"}
