import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { makeCustomer, makeOrder, makeProduct } from './helpers.js';

const app = createApp();

async function seedDashboardData() {
  const customer = await makeCustomer({ name: 'Amara Okafor' });
  const headphones = await makeProduct({
    name: 'Headphones',
    sku: 'AUD-001',
    category: 'Audio',
    price: 25,
    stock: 10,
  });
  const earbuds = await makeProduct({
    name: 'Earbuds',
    sku: 'AUD-002',
    category: 'Audio',
    price: 30,
    stock: 2,
  });
  const monitor = await makeProduct({
    name: 'Monitor',
    sku: 'DIS-001',
    category: 'Displays',
    price: 40,
    stock: 0,
    status: 'archived',
  });

  await makeOrder({
    customer,
    items: [{ product: headphones, quantity: 2 }],
    status: 'completed',
  });
  await makeOrder({
    customer,
    items: [{ product: earbuds, quantity: 1 }],
    status: 'paid',
  });
  await makeOrder({
    customer,
    items: [{ product: headphones, quantity: 1 }],
    status: 'shipped',
  });
  await makeOrder({
    customer,
    items: [{ product: earbuds, quantity: 2 }],
    status: 'pending',
  });
  await makeOrder({
    customer,
    items: [{ product: monitor, quantity: 1 }],
    status: 'cancelled',
  });

  return { customer, headphones, earbuds, monitor };
}

describe('dashboard API', () => {
  it('returns summary metrics using corrected revenue semantics', async () => {
    await seedDashboardData();

    const response = await request(app).get('/api/v1/dashboard/summary');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalRevenue: 105,
      totalOrders: 5,
      completedOrders: 1,
      paidOrders: 1,
      shippedOrders: 1,
      pendingOrders: 1,
      cancelledOrders: 1,
      revenueOrders: 3,
      averageOrderValue: 35,
      customers: 1,
      products: 3,
      lowStockProducts: 1,
    });
  });

  it('groups orders by status and excludes non-revenue statuses from revenue', async () => {
    await seedDashboardData();

    const response = await request(app).get('/api/v1/dashboard/orders-by-status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { status: 'pending', orders: 1, revenue: 0 },
      { status: 'paid', orders: 1, revenue: 30 },
      { status: 'shipped', orders: 1, revenue: 25 },
      { status: 'completed', orders: 1, revenue: 50 },
      { status: 'cancelled', orders: 1, revenue: 0 },
    ]);
  });

  it('groups products by category', async () => {
    await seedDashboardData();

    const response = await request(app).get('/api/v1/dashboard/products-by-category');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { category: 'Audio', products: 2, totalStock: 12, averagePrice: 27.5 },
      { category: 'Displays', products: 1, totalStock: 0, averagePrice: 40 },
    ]);
  });

  it('returns a zero-filled monthly revenue series', async () => {
    await seedDashboardData();

    const response = await request(app)
      .get('/api/v1/dashboard/monthly-revenue')
      .query({ months: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body.at(-1)).toMatchObject({ revenue: 105, orders: 3 });

    const currentMonth = new Date().toISOString().slice(0, 7);
    expect(response.body.at(-1).month).toBe(currentMonth);
  });

  it('returns top products and recent orders', async () => {
    await seedDashboardData();

    const topProducts = await request(app)
      .get('/api/v1/dashboard/top-products')
      .query({ limit: 2 });

    expect(topProducts.status).toBe(200);
    expect(topProducts.body).toHaveLength(2);
    expect(topProducts.body[0]).toMatchObject({
      productName: 'Headphones',
      unitsSold: 3,
      revenue: 75,
    });

    const recentOrders = await request(app)
      .get('/api/v1/dashboard/recent-orders')
      .query({ limit: 2 });

    expect(recentOrders.status).toBe(200);
    expect(recentOrders.body).toHaveLength(2);
    expect(recentOrders.body[0]).toHaveProperty('orderNumber');
    expect(recentOrders.body[0]).not.toHaveProperty('items');
  });

  it('validates dashboard query limits', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard/monthly-revenue')
      .query({ months: 100 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('validation_error');
  });
});
