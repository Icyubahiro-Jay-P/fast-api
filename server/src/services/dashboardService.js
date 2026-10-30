import { Customer, Order, Product } from '../models/index.js';
import {
  LOW_STOCK_THRESHOLD,
  ORDER_STATUSES,
  REVENUE_STATUSES,
} from '../utils/constants.js';
import { roundMoney } from '../utils/numbers.js';

function monthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

export async function summary() {
  const [orderStats] = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        paidOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
        },
        shippedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] },
        },
        revenueOrders: {
          $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, 1, 0] },
        },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        totalRevenue: {
          $sum: {
            $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$totalAmount', 0],
          },
        },
      },
    },
  ]);

  const [customers, products, lowStockProducts] = await Promise.all([
    Customer.countDocuments(),
    Product.countDocuments(),
    Product.countDocuments({ status: 'active', stock: { $lte: LOW_STOCK_THRESHOLD } }),
  ]);

  const stats = orderStats ?? {};
  const totalRevenue = roundMoney(stats.totalRevenue ?? 0);
  const revenueOrders = stats.revenueOrders ?? 0;

  return {
    totalRevenue,
    totalOrders: stats.totalOrders ?? 0,
    completedOrders: stats.completedOrders ?? 0,
    paidOrders: stats.paidOrders ?? 0,
    shippedOrders: stats.shippedOrders ?? 0,
    pendingOrders: stats.pendingOrders ?? 0,
    cancelledOrders: stats.cancelledOrders ?? 0,
    revenueOrders,
    averageOrderValue: revenueOrders === 0 ? 0 : roundMoney(totalRevenue / revenueOrders),
    customers,
    products,
    lowStockProducts,
  };
}

export async function ordersByStatus() {
  const rows = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        orders: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$totalAmount', 0],
          },
        },
      },
    },
  ]);

  const byStatus = new Map(rows.map((row) => [row._id, row]));

  return ORDER_STATUSES.map((status) => ({
    status,
    orders: byStatus.get(status)?.orders ?? 0,
    revenue: roundMoney(byStatus.get(status)?.revenue ?? 0),
  }));
}

export async function productsByCategory() {
  const rows = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        products: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        averagePrice: { $avg: '$price' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    category: row._id,
    products: row.products,
    totalStock: row.totalStock,
    averagePrice: roundMoney(row.averagePrice ?? 0),
  }));
}

export async function monthlyRevenue(months) {
  const currentMonth = monthStart(new Date());
  const firstMonth = addMonths(currentMonth, -(months - 1));

  const rows = await Order.aggregate([
    {
      $match: {
        status: { $in: REVENUE_STATUSES },
        createdAt: { $gte: firstMonth },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m',
            date: '$createdAt',
            timezone: 'UTC',
          },
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byMonth = new Map(rows.map((row) => [row._id, row]));
  const result = [];

  for (let index = 0; index < months; index += 1) {
    const month = addMonths(firstMonth, index);
    const key = monthKey(month);
    const row = byMonth.get(key);

    result.push({
      month: key,
      revenue: roundMoney(row?.revenue ?? 0),
      orders: row?.orders ?? 0,
    });
  }

  return result;
}

export async function topProducts(limit) {
  const rows = await Order.aggregate([
    { $match: { status: { $in: REVENUE_STATUSES } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $last: '$items.productName' },
        sku: { $last: '$items.sku' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { unitsSold: -1, revenue: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({
    productId: row._id.toString(),
    productName: row.productName,
    sku: row.sku,
    unitsSold: row.unitsSold,
    revenue: roundMoney(row.revenue),
  }));
}

export async function recentOrders(limit) {
  return Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('orderNumber customerName totalAmount status createdAt');
}
