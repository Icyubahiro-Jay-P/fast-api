import { Customer, Order, Product } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ORDER_SORT_FIELDS } from '../utils/constants.js';
import { roundMoney } from '../utils/numbers.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { skipFor } from '../utils/pagination.js';
import { searchRegex } from '../utils/search.js';
import { parseSort } from '../utils/sort.js';

async function buildOrderItems(items) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((product) => [product.id, product]));

  const missingProductIds = productIds.filter((id) => !productMap.has(id));

  if (missingProductIds.length > 0) {
    throw new ApiError(
      404,
      'product_not_found',
      'One or more products in the order were not found.',
      { missingProductIds },
    );
  }

  return items.map((item) => {
    const product = productMap.get(item.productId);
    const unitPrice = roundMoney(product.price);
    const lineTotal = roundMoney(unitPrice * item.quantity);

    return {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
    };
  });
}

function orderTotal(items) {
  return roundMoney(items.reduce((total, item) => total + item.lineTotal, 0));
}

function buildFilter({ search, status, customerId, dateFrom, dateTo, minTotal, maxTotal }) {
  const filter = {};

  if (search) {
    const regex = searchRegex(search);
    filter.$or = [{ orderNumber: regex }, { customerName: regex }];
  }

  if (status) {
    filter.status = status;
  }

  if (customerId) {
    filter.customerId = customerId;
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};

    if (dateFrom) {
      filter.createdAt.$gte = dateFrom;
    }

    if (dateTo) {
      filter.createdAt.$lte = dateTo;
    }
  }

  if (minTotal !== undefined || maxTotal !== undefined) {
    filter.totalAmount = {};

    if (minTotal !== undefined) {
      filter.totalAmount.$gte = minTotal;
    }

    if (maxTotal !== undefined) {
      filter.totalAmount.$lte = maxTotal;
    }
  }

  return filter;
}

export async function listOrders(query) {
  const { sort, page, pageSize } = query;
  const filter = buildFilter(query);
  const sortSpec = parseSort(sort, ORDER_SORT_FIELDS);

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort(sortSpec)
      .skip(skipFor(page, pageSize))
      .limit(pageSize),
    Order.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getOrder(id) {
  const order = await Order.findById(id);

  if (!order) {
    throw new ApiError(404, 'order_not_found', 'Order not found.');
  }

  return order;
}

export async function createOrder(data) {
  const customer = await Customer.findById(data.customerId);

  if (!customer) {
    throw new ApiError(404, 'customer_not_found', 'Customer not found.');
  }

  const items = await buildOrderItems(data.items);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Order.create({
        orderNumber: generateOrderNumber(),
        customerId: customer._id,
        customerName: customer.name,
        items,
        totalAmount: orderTotal(items),
        status: data.status,
      });
    } catch (error) {
      const orderNumberCollision =
        error.code === 11000 && Object.hasOwn(error.keyValue ?? {}, 'orderNumber');

      if (!orderNumberCollision || attempt === 2) {
        throw error;
      }
    }
  }

  throw new ApiError(500, 'order_number_error', 'Could not allocate an order number.');
}

export async function updateOrder(id, data) {
  const update = {};

  if (data.status) {
    update.status = data.status;
  }

  if (data.items) {
    update.items = await buildOrderItems(data.items);
    update.totalAmount = orderTotal(update.items);
  }

  const order = await Order.findByIdAndUpdate(id, update, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!order) {
    throw new ApiError(404, 'order_not_found', 'Order not found.');
  }

  return order;
}

export async function deleteOrder(id) {
  const order = await Order.findByIdAndDelete(id);

  if (!order) {
    throw new ApiError(404, 'order_not_found', 'Order not found.');
  }
}
